import { snapshotsEqual, type JsonValue } from "../lib/versionHistory";
import { useContext, useEffect, useRef, useState } from "react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import {
  loadZmkConnection,
  writeZmkKeymapDiff,
  type ZmkLoadedConnection,
} from "@keyboard-hub/adapter-zmk";
import { compareKeyboardHubKeymaps } from "@keyboard-hub/adapter-common";
import {
  KEYMAP_SCHEMA,
  parseSharedKeymap,
  buildApplyTarget,
} from "../lib/abyss/keymapSharing";
import type {
  AbyssKeymapSummary,
  AbyssLayoutDefinition,
  AbyssLayoutResolveResult,
  AbyssKeymapData,
} from "@keyboard-hub/abyss-client";
import { useCustomSubsystem } from "./useCustomSubsystem";
import { useStudioUnlock } from "./useStudioUnlock";
import {
  Request,
  Response,
  ErrorCode,
} from "../proto/cormoran/fast_keymap/fast_keymap";
import { createAbyssZmkConnection } from "../lib/abyss/zmkConnectionAdapter";
import { createAbyssNotificationSource } from "../lib/abyss/abyssNotifications";
import { getAbyssClient } from "../lib/abyss/abyssClient";
import {
  abyssErrorMessageKey,
  isAbyssUnauthorized,
} from "../lib/abyss/abyssErrors";
import {
  KeymapUnlockRequiredError,
  studioLockErrorText,
} from "../lib/studioUnlock";
import { listMatchingKeymaps } from "../lib/abyss/abyssKeymapList";
import {
  ALL_SECTIONS,
  buildExportData,
  buildNewExportData,
  type KeymapDocument,
} from "../lib/abyss/abyssExportPayload";
import { isEmptyDiff, type KeymapDiff } from "../lib/abyss/abyssDiff";
import { runPreflight, isBlocked } from "../lib/abyss/abyssPreflight";
import {
  keymapIdentifier,
  rememberKeymap,
  rememberedKeymap,
} from "../lib/abyss/keymapIdentity";

const codec = {
  encode: (r: Request) => Request.encode(r).finish(),
  decode: (p: Uint8Array) => Response.decode(p),
};
export type ShareReview = {
  kind: "apply" | "save";
  remote: KeymapDocument;
  record?: AbyssKeymapSummary;
  loaded: ZmkLoadedConnection;
  resolved: AbyssLayoutResolveResult | null;
  before: KeymapDocument;
  after: KeymapDocument;
  diff: KeymapDiff;
  checks: ReturnType<typeof runPreflight>;
};
const documentOf = (loaded: ZmkLoadedConnection) =>
  loaded.state.currentKeymap as unknown as KeymapDocument;
const compare = (target: KeymapDocument, current: KeymapDocument) =>
  compareKeyboardHubKeymaps(
    target as never,
    current as never,
  ) as unknown as KeymapDiff;

function buildReview(
  kind: ShareReview["kind"],
  loaded: ZmkLoadedConnection,
  remote: KeymapDocument,
  record?: AbyssKeymapSummary,
  resolved: AbyssLayoutResolveResult | null = null,
): ShareReview {
  const device = documentOf(loaded);
  const before = kind === "save" ? remote : device;
  const after =
    kind === "save"
      ? {
          ...buildExportData(device, remote, ALL_SECTIONS),
          layers: device.layers,
        }
      : buildApplyTarget(device, remote);
  const diff = compare(after, before);
  const checks =
    kind === "apply"
      ? runPreflight({
          diff,
          deviceKeyCount: Math.max(
            0,
            ...device.layers.map((l) => l.bindings.length),
          ),
          targetKeyCount: Math.max(
            0,
            ...after.layers.map((l) => l.bindings.length),
          ),
          deviceLayerCount: device.layers.length,
          deviceLayoutName: loaded.state.detectedLayout?.name,
          targetLayoutName: record?.layout?.name,
        })
      : [];
  return {
    kind,
    remote,
    record,
    loaded,
    resolved,
    before,
    after,
    diff,
    checks,
  };
}

export function useKeymapSharing(
  authenticated: boolean,
  onApplied: () => Promise<unknown>,
  onUnauthorized?: () => Promise<void>,
  beforeRead?: () => Promise<void>,
) {
  const app = useContext(ZMKAppContext);
  const { runWithUnlock } = useStudioUnlock();
  const rpc = useCustomSubsystem("cormoran__fast_keymap", codec);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [keymaps, setKeymaps] = useState<AbyssKeymapSummary[]>([]);
  const [current, setCurrent] = useState<AbyssKeymapSummary | null>(null);
  const [changed, setChanged] = useState(false);
  const [identity, setIdentity] = useState<
    "unknown" | "unsupported" | "unset" | "known"
  >("unknown");
  const [review, setReview] = useState<ShareReview | null>(null);
  // A connection change invalidates every captured diff, including async completions.
  const connection = app?.state.connection;
  const session = useRef(connection);
  const generation = useRef(0);
  useEffect(() => {
    session.current = connection;
    generation.current += 1;
    setReview(null);
    setKeymaps([]);
    setCurrent(null);
    setIdentity("unknown");
    setError(null);
    setMessage(null);
    return () => {
      generation.current += 1;
    };
  }, [connection, authenticated]);

  async function operation(action: (valid: () => void) => Promise<void>) {
    if (busyRef.current) return false;
    const version = generation.current;
    const valid = () => {
      if (session.current !== connection || version !== generation.current)
        throw new Error(
          "The keyboard or account changed. Reopen Keymap sharing.",
        );
    };
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action(valid);
      return true;
    } catch (caught) {
      if (version === generation.current) {
        if (isAbyssUnauthorized(caught)) {
          getAbyssClient()?.clearTokenSet();
          await onUnauthorized?.();
        }
        setError(
          studioLockErrorText(caught) ??
            (caught instanceof Error
              ? caught.message
              : abyssErrorMessageKey(caught)),
        );
      }
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function capture(valid: () => void, resolve = false) {
    if (!connection) throw new Error("No keyboard connected.");
    await beforeRead?.();
    valid();
    const loaded = await runWithUnlock(() =>
      loadZmkConnection(
        createAbyssZmkConnection({
          rpcConnection: connection,
          deviceName: app?.state.deviceInfo?.name,
          method: "serial",
          notificationSource: app?.onNotification
            ? createAbyssNotificationSource({
                subsystemIndexes: (
                  app.state.customSubsystems?.subsystems ?? []
                ).map((s) => s.index),
                onNotification: app.onNotification,
              })
            : undefined,
        }),
      ),
    );
    valid();
    const layout = loaded.state.detectedLayout;
    const resolved =
      resolve && layout
        ? ((await getAbyssClient()?.resolveLayout({
            keyboard: loaded.state.currentKeymap.keyboard,
            layout: layout as unknown as AbyssLayoutDefinition,
          })) ?? null)
        : null;
    valid();
    return { loaded, resolved };
  }

  async function readIdentity(valid: () => void): Promise<string | null> {
    if (!rpc.ready) {
      setIdentity("unsupported");
      return null;
    }
    const response = await rpc.call({ getKeymapIdentifier: true });
    valid();
    if (!response?.keymapIdentifier) {
      setIdentity("unsupported");
      return null;
    }
    const id = response.keymapIdentifier.identifier;
    setIdentity(id ? "unknown" : "unset");
    return id;
  }

  async function associate(id: string | null, valid: () => void) {
    // Older firmware still supports import/export. Never claim it stored metadata.
    if (!rpc.ready) return;
    const supported = await rpc.call({ getKeymapIdentifier: true });
    valid();
    if (!supported?.keymapIdentifier) return;
    const identifier = id ? await keymapIdentifier(id) : "";
    valid();
    const response = await runWithUnlock(async () => {
      const response = await rpc.call({ setKeymapIdentifier: { identifier } });
      if (response?.error?.code === ErrorCode.ERR_UNLOCK_REQUIRED)
        throw new KeymapUnlockRequiredError();
      return response;
    });
    valid();
    if (!response?.setKeymapIdentifier || response.error)
      throw new Error(
        "The keymap was saved, but its identity could not be stored. Refresh to check the keyboard.",
      );
    if (id) rememberKeymap(identifier, id);
    const check = await rpc.call({ getKeymapIdentifier: true });
    valid();
    if (check?.keymapIdentifier?.identifier !== identifier)
      throw new Error(
        "The keymap identity could not be verified. Refresh to check the keyboard.",
      );
  }

  async function refreshList(valid: () => void) {
    const client = getAbyssClient();
    if (!client || !authenticated) return;
    const { loaded, resolved } = await capture(valid, true);
    // Do not widen to unrelated keyboards in the compact menu.
    const owned = resolved?.layout
      ? await listMatchingKeymaps(client, resolved.layout.id)
      : [];
    valid();
    setKeymaps(owned);
    setCurrent(null);
    setChanged(false);
    const identifier = await readIdentity(valid);
    if (!identifier) return;
    const ids = await Promise.all(
      owned.map(async (record) => ({
        record,
        hash: await keymapIdentifier(record.id),
      })),
    );
    valid();
    const matches = ids.filter((entry) => entry.hash === identifier);
    if (matches.length > 1) return;
    let record = matches.length === 1 ? matches[0].record : undefined;
    const remembered = rememberedKeymap(identifier);
    if (
      !record &&
      remembered &&
      (await keymapIdentifier(remembered)) === identifier
    ) {
      record = await client.getKeymap(remembered);
      valid();
    }
    if (!record) return;
    const full = await client.getKeymap(record.id);
    valid();
    if (!full.data) throw new Error("Keymap data unavailable");
    setCurrent(full);
    setChanged(
      !isEmptyDiff(compare(full.data as KeymapDocument, documentOf(loaded))) ||
        !isEmptyDiff(compare(documentOf(loaded), full.data as KeymapDocument)),
    );
    setIdentity("known");
  }

  const refresh = () => operation(refreshList);
  const prepare = (
    kind: "apply" | "save",
    record?: AbyssKeymapSummary,
    file?: unknown,
  ) =>
    operation(async (valid) => {
      setReview(null);
      const { loaded, resolved } = await capture(valid);
      const client = getAbyssClient();
      const target =
        file ??
        (record && client ? (await client.getKeymap(record.id)).data : null);
      valid();
      if (!target) throw new Error("Keymap data unavailable");
      const remote = parseSharedKeymap(target);
      setReview(buildReview(kind, loaded, remote, record, resolved));
    });

  const selectDirection = (kind: ShareReview["kind"]) => {
    if (busyRef.current || !review || (kind === "save" && !review.record))
      return;
    setReview(
      buildReview(
        kind,
        review.loaded,
        review.remote,
        review.record,
        review.resolved,
      ),
    );
  };

  const confirm = () =>
    operation(async (valid) => {
      const pending = review;
      if (!pending || isBlocked(pending.checks)) return;
      // Freeze the reviewed payload; never silently replace it with a new snapshot.
      const fresh = await capture(valid);
      const expectedDevice =
        pending.kind === "apply" ? pending.before : documentOf(pending.loaded);
      if (
        !isEmptyDiff(compare(documentOf(fresh.loaded), expectedDevice)) ||
        !isEmptyDiff(compare(expectedDevice, documentOf(fresh.loaded)))
      )
        throw new Error(
          "The keyboard changed. Close this preview and open it again.",
        );
      if (pending.kind === "save") {
        const client = getAbyssClient();
        if (!client || !pending.record) return;
        const latest = (await client.getKeymap(pending.record.id)).data;
        valid();
        if (
          !snapshotsEqual(
            JSON.parse(JSON.stringify(latest)) as JsonValue,
            JSON.parse(JSON.stringify(pending.before)) as JsonValue,
          )
        )
          throw new Error(
            "The Abyss keymap changed. Close this preview and open it again.",
          );
        await client.updateKeymap(pending.record.id, {
          data: pending.after as AbyssKeymapData,
          message: "Saved from DYA Studio",
        });
        valid();
        await associate(pending.record.id, valid);
      } else {
        await runWithUnlock(() =>
          writeZmkKeymapDiff(fresh.loaded, pending.diff as never),
        );
        valid();
        const readback = await capture(valid);
        if (!isEmptyDiff(compare(pending.after, documentOf(readback.loaded))))
          throw new Error(
            "The keyboard does not yet match this keymap. Review and try again.",
          );
        await associate(pending.record?.id ?? null, valid);
        await onApplied();
        valid();
      }
      setReview(null);
      setMessage(
        pending.kind === "save" ? "Saved to Abyss." : "Applied to keyboard.",
      );
      if (authenticated) await refreshList(valid);
    });

  const create = (name: string, visibility: "private" | "public") =>
    operation(async (valid) => {
      if (!name.trim()) return;
      const client = getAbyssClient();
      if (!client || !authenticated) return;
      const { loaded, resolved } = await capture(valid, true);
      const input = {
        name: name.trim(),
        visibility,
        data: buildNewExportData(
          documentOf(loaded),
          ALL_SECTIONS,
          name.trim(),
        ) as AbyssKeymapData,
        layout: loaded.state.detectedLayout as unknown as AbyssLayoutDefinition,
        message: "Created from DYA Studio",
      };
      const written = resolved?.layout
        ? await client.createKeymap(resolved.layout.variation.id, input)
        : await client.importKeymap(input);
      valid();
      // Once the record exists, a metadata/list failure must not invite a duplicate create.
      setMessage("Saved to Abyss.");
      try {
        await associate(written.id, valid);
        await refreshList(valid);
      } catch (caught) {
        valid();
        setError(
          caught instanceof Error
            ? caught.message
            : abyssErrorMessageKey(caught),
        );
      }
    });

  const saveFile = () =>
    operation(async (valid) => {
      const { loaded } = await capture(valid);
      const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              { $schema: KEYMAP_SCHEMA, ...loaded.state.currentKeymap },
              null,
              2,
            ),
          ],
          {
            type: "application/json",
          },
        ),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "keymap.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  return {
    busy,
    error,
    message,
    keymaps,
    current,
    changed,
    identity,
    review,
    setReview,
    selectDirection,
    refresh,
    prepare,
    confirm,
    create,
    saveFile,
    fileError: (text: string) => setError(text),
  };
}
