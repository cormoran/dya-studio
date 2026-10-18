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
  selectSharingTarget,
  ALL_SHARING_PARTS,
  isCompleteSharingSelection,
  type SharingSelection,
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
import { abyssKeymapUrl } from "../lib/abyss/abyssConfig";
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

import {
  splitWritableKeymapDiff,
  withoutSkippedChanges,
  type KeymapApplyResult,
} from "../lib/abyss/keymapApplyResult";
import { abyssPointerScaleCorrections } from "../lib/abyss/abyssPointerScales";
import {
  Request as ProcessorRequest,
  Response as ProcessorResponse,
} from "../proto/zmk/runtime_input_processor/runtime_input_processor";

const processorCodec = {
  encode: (request: ProcessorRequest) =>
    ProcessorRequest.encode(request).finish(),
  decode: (payload: Uint8Array) => ProcessorResponse.decode(payload),
};
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
  selection: SharingSelection;
  identityMismatch?: boolean;
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
  selection: SharingSelection = ALL_SHARING_PARTS,
  identityMismatch = false,
): ShareReview {
  const device = documentOf(loaded);
  const before = kind === "save" ? remote : device;
  const target =
    kind === "save"
      ? {
          ...buildExportData(device, remote, ALL_SECTIONS),
          layers: device.layers,
        }
      : buildApplyTarget(device, remote);
  const after = selectSharingTarget(before, target, selection);
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
    selection,
    identityMismatch,
  };
}

export function useKeymapSharing(
  authenticated: boolean,
  onApplied: () => Promise<unknown>,
  onUnauthorized?: () => Promise<void>,
  beforeRead?: () => Promise<void>,
  accountId?: string,
) {
  const app = useContext(ZMKAppContext);
  const { runWithUnlock } = useStudioUnlock();
  const rpc = useCustomSubsystem("cormoran__fast_keymap", codec);
  const processorRpc = useCustomSubsystem("cormoran_rip", processorCodec);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [savedKeymapUrl, setSavedKeymapUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [keymaps, setKeymaps] = useState<AbyssKeymapSummary[]>([]);
  const [current, setCurrent] = useState<AbyssKeymapSummary | null>(null);
  const [changed, setChanged] = useState(false);
  const [identity, setIdentity] = useState<
    "unknown" | "unsupported" | "unset" | "known"
  >("unknown");
  const cache = useRef({
    layouts: new Map<string, AbyssLayoutResolveResult | null>(),
    lists: new Map<string, AbyssKeymapSummary[]>(),
    records: new Map<string, AbyssKeymapSummary>(),
  });
  const [review, setReview] = useState<ShareReview | null>(null);
  const [applyResult, setApplyResult] = useState<KeymapApplyResult | null>(
    null,
  );
  // A connection change invalidates every captured diff, including async completions.
  const connection = app?.state.connection;
  const session = useRef(connection);
  const generation = useRef(0);
  useEffect(() => {
    session.current = connection;
    generation.current += 1;
    cache.current.layouts.clear();
    cache.current.lists.clear();
    cache.current.records.clear();
    setReview(null);
    setApplyResult(null);
    setSavedKeymapUrl(null);
    setKeymaps([]);
    setCurrent(null);
    setIdentity("unknown");
    setError(null);
    setMessage(null);
    return () => {
      generation.current += 1;
    };
  }, [connection, authenticated, accountId]);

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
    const notificationSource = app?.onNotification
      ? createAbyssNotificationSource({
          subsystemIndexes: (app.state.customSubsystems?.subsystems ?? []).map(
            (s) => s.index,
          ),
          onNotification: app.onNotification,
        })
      : undefined;
    let loaded: ZmkLoadedConnection;
    try {
      loaded = await runWithUnlock(() =>
        loadZmkConnection(
          createAbyssZmkConnection({
            rpcConnection: connection,
            deviceName: app?.state.deviceInfo?.name,
            method: "serial",
            notificationSource,
          }),
        ),
      );
    } finally {
      notificationSource?.dispose();
    }
    valid();
    const layout = loaded.state.detectedLayout;
    let resolved: AbyssLayoutResolveResult | null = null;
    if (resolve && layout) {
      const key = JSON.stringify([loaded.state.currentKeymap.keyboard, layout]);
      if (cache.current.layouts.has(key)) {
        resolved = cache.current.layouts.get(key) ?? null;
      } else {
        resolved =
          (await getAbyssClient()?.resolveLayout({
            keyboard: loaded.state.currentKeymap.keyboard,
            layout: layout as unknown as AbyssLayoutDefinition,
          })) ?? null;
        valid();
        cache.current.layouts.set(key, resolved);
      }
    }
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

  async function readRecord(id: string, valid: () => void, force = false) {
    const cached = cache.current.records.get(id);
    if (cached && !force) return cached;
    const client = getAbyssClient();
    if (!client) throw new Error("Keymap data unavailable");
    const record = await client.getKeymap(id);
    valid();
    cache.current.records.set(id, record);
    return record;
  }

  async function refreshList(valid: () => void) {
    const client = getAbyssClient();
    if (!client || !authenticated) return;
    const { loaded, resolved } = await capture(valid, true);
    // Do not widen to unrelated keyboards in the compact menu.
    const layoutId = resolved?.layout?.id ?? resolved?.compatibleLayout?.id;
    let owned = layoutId ? cache.current.lists.get(layoutId) : [];
    if (!owned) {
      owned = await listMatchingKeymaps(client, layoutId!);
      valid();
      cache.current.lists.set(layoutId!, owned);
    }
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
      record = await readRecord(remembered, valid);
      valid();
    }
    if (!record) return;
    const full = await readRecord(record.id, valid);
    valid();
    if (!full.data) throw new Error("Keymap data unavailable");
    setCurrent(full);
    setChanged(
      !isEmptyDiff(compare(full.data as KeymapDocument, documentOf(loaded))) ||
        !isEmptyDiff(compare(documentOf(loaded), full.data as KeymapDocument)),
    );
    setIdentity("known");
  }

  const refresh = (force = true) =>
    operation(async (valid) => {
      if (force) {
        cache.current.layouts.clear();
        cache.current.lists.clear();
        cache.current.records.clear();
      }
      await refreshList(valid);
    });
  const prepare = (
    kind: "apply" | "save",
    record?: AbyssKeymapSummary,
    file?: unknown,
  ) =>
    operation(async (valid) => {
      setReview(null);
      setApplyResult(null);
      const { loaded, resolved } = await capture(valid);
      const client = getAbyssClient();
      const target =
        file ??
        (record && client ? (await readRecord(record.id, valid)).data : null);
      valid();
      if (!target) throw new Error("Keymap data unavailable");
      const remote = parseSharedKeymap(target);
      const identifier = record ? await readIdentity(valid) : null;
      const expectedIdentifier = record
        ? await keymapIdentifier(record.id)
        : null;
      valid();
      setReview(
        buildReview(
          kind,
          loaded,
          remote,
          record,
          resolved,
          ALL_SHARING_PARTS,
          identifier !== null && identifier !== expectedIdentifier,
        ),
      );
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
        review.selection,
        review.identityMismatch,
      ),
    );
  };

  const selectParts = (selection: SharingSelection) => {
    if (busyRef.current || !review) return;
    setReview(
      buildReview(
        review.kind,
        review.loaded,
        review.remote,
        review.record,
        review.resolved,
        selection,
        review.identityMismatch,
      ),
    );
  };

  // Reserve a tab during the click so async API work does not lose popup permission.
  // If blocked, the menu keeps a direct link to the successfully saved record.
  function reserveKeymapTab() {
    let tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    return {
      show(id: string) {
        const url = abyssKeymapUrl(id);
        setSavedKeymapUrl(url);
        if (tab && !tab.closed) tab.location.replace(url);
        tab = null;
      },
      close() {
        if (tab && !tab.closed) tab.close();
      },
    };
  }

  const confirm = () => {
    if (
      busyRef.current ||
      !review ||
      isBlocked(review.checks) ||
      (isEmptyDiff(review.diff) &&
        !(
          review.kind === "apply" &&
          review.identityMismatch &&
          isCompleteSharingSelection(review.selection)
        ))
    )
      return Promise.resolve(false);
    const tab = review.kind === "save" ? reserveKeymapTab() : null;
    return operation(async (valid) => {
      const pending = review;
      if (!pending || isBlocked(pending.checks)) return;
      const { writable, skipped } = splitWritableKeymapDiff(pending.diff);
      const outcome: KeymapApplyResult = {
        name: pending.record?.name ?? pending.remote.name ?? "Keymap",
        skipped,
        remaining: null,
        verified: false,
        attempted: false,
        error: null,
      };
      try {
        // Freeze the reviewed payload; never silently replace it with a new snapshot.
        const fresh = await capture(valid);
        const expectedDevice =
          pending.kind === "apply"
            ? pending.before
            : documentOf(pending.loaded);
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
          const latest = (await readRecord(pending.record.id, valid, true))
            .data;
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
          cache.current.records.delete(pending.record.id);
          cache.current.lists.clear();
          tab?.show(pending.record.id);
          await associate(pending.record.id, valid);
        } else {
          const failures: string[] = [];
          const failureText = (caught: unknown) =>
            studioLockErrorText(caught) ??
            (caught instanceof Error
              ? caught.message
              : abyssErrorMessageKey(caught));
          try {
            if (!isEmptyDiff(writable)) {
              outcome.attempted = true;
              await runWithUnlock(() =>
                writeZmkKeymapDiff(fresh.loaded, writable as never),
              );
            }
            valid();
            // adapter-zmk rounds scales to /1000. Restore exactly representable
            // firmware fractions (e.g. 1/60) before verifying the actual device.
            for (const correction of abyssPointerScaleCorrections(writable)) {
              for (const request of [
                {
                  setScaleMultiplier: {
                    id: correction.id,
                    value: correction.multiplier,
                  },
                },
                {
                  setScaleDivisor: {
                    id: correction.id,
                    value: correction.divisor,
                  },
                },
              ]) {
                valid();
                const response = await processorRpc.call(
                  ProcessorRequest.create(request),
                );
                valid();
                if (
                  !response ||
                  response.error ||
                  !(response.setScaleMultiplier || response.setScaleDivisor)
                )
                  throw new Error(
                    "The pointer scale could not be stored. Reopen this preview and try again.",
                  );
              }
            }
            const readback = await capture(valid);
            outcome.remaining = withoutSkippedChanges(
              compare(pending.after, documentOf(readback.loaded)),
              skipped,
            );
            if (!isEmptyDiff(outcome.remaining))
              throw new Error(
                "The keyboard does not yet match this keymap. Review and try again.",
              );
            outcome.verified = true;
          } catch (caught) {
            failures.push(failureText(caught));
          }
          // A failed settings write must not prevent storing the selected source.
          // Revalidate the session before starting any independent metadata write.
          valid();
          const complete = isCompleteSharingSelection(pending.selection);
          try {
            if (!failures.length || (complete && pending.record))
              await associate(
                complete ? (pending.record?.id ?? null) : null,
                valid,
              );
          } catch (caught) {
            failures.push(failureText(caught));
          }
          valid();
          try {
            await onApplied();
            valid();
            if (authenticated) await refreshList(valid);
          } catch (caught) {
            failures.push(failureText(caught));
          }
          if (failures.length) throw new Error(failures.join("\n"));
        }
        if (pending.kind === "save") setReview(null);
        setMessage(
          pending.kind === "save"
            ? "Saved to Abyss."
            : isEmptyDiff(skipped)
              ? "Applied to keyboard."
              : "Finished with skipped changes.",
        );
        if (pending.kind === "save" && authenticated) await refreshList(valid);
      } catch (caught) {
        if (pending.kind === "apply") setMessage(null);
        outcome.error =
          studioLockErrorText(caught) ??
          (caught instanceof Error
            ? caught.message
            : abyssErrorMessageKey(caught));
        throw caught;
      } finally {
        if (pending.kind === "apply") {
          // Do not let an old device/account operation replace a new session's UI.
          let active = true;
          try {
            valid();
          } catch {
            active = false;
          }
          if (active) {
            setReview(null);
            setApplyResult(outcome);
          }
        }
      }
    }).finally(() => tab?.close());
  };

  const create = (name: string, visibility: "private" | "public") => {
    if (busyRef.current || !name.trim() || !authenticated || !getAbyssClient())
      return Promise.resolve(false);
    const tab = reserveKeymapTab();
    return operation(async (valid) => {
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
      cache.current.lists.clear();
      cache.current.records.delete(written.id);
      tab.show(written.id);
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
    }).finally(() => tab.close());
  };

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
    savedKeymapUrl,
    keymaps,
    current,
    changed,
    identity,
    review,
    setReview,
    applyResult,
    setApplyResult,
    selectDirection,
    selectParts,
    refresh,
    prepare,
    confirm,
    create,
    saveFile,
    fileError: (text: string) => setError(text),
  };
}
