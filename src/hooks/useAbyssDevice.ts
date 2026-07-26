/**
 * Reads the connected keyboard into KeyboardHub JSON via the Abyss ZMK adapter,
 * and resolves its layout against the Abyss catalog.
 *
 * Deliberately *not* automatic. The adapter loads through the official ZMK
 * protocol — `getKeymap`, `listAllBehaviors`, then one `getBehaviorDetails` per
 * behavior — which is precisely the slow path `useKeymapSource`'s fast-keymap
 * route exists to avoid. Over BLE that is tens of seconds. So the read is an
 * explicit user action with visible progress, never a fetch on mount.
 *
 * Mount this once at the page and share it: the export and import sections work
 * from the same snapshot, and reading twice would double the cost for nothing.
 */
import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import {
  loadZmkConnection,
  type ZmkLoadedConnection,
} from "@keyboard-hub/adapter-zmk";
import type {
  AbyssLayoutDefinition,
  AbyssLayoutResolveResult,
} from "@keyboard-hub/abyss-client";
import { useStudioUnlock } from "./useStudioUnlock";
import { getAbyssClient } from "../lib/abyss/abyssClient";
import { createAbyssZmkConnection } from "../lib/abyss/zmkConnectionAdapter";
import { createAbyssNotificationSource } from "../lib/abyss/abyssNotifications";
import { abyssErrorMessageKey } from "../lib/abyss/abyssErrors";
import { studioLockErrorText } from "../lib/studioUnlock";

/** What the read is currently doing, for the progress label. */
export type AbyssDevicePhase = "idle" | "reading" | "resolving" | "done";

export interface UseAbyssDeviceReturn {
  /** The device snapshot, or `null` before the first successful read. */
  loaded: ZmkLoadedConnection | null;
  /** How the connected keyboard's layout matched the Abyss catalog. */
  resolved: AbyssLayoutResolveResult | null;
  phase: AbyssDevicePhase;
  isReading: boolean;
  /** English message key for the last failure, or `null`. */
  error: string | null;
  /** Reads the keyboard and resolves its layout. Safe to call repeatedly. */
  read: () => Promise<void>;
}

export function useAbyssDevice(): UseAbyssDeviceReturn {
  const zmkApp = useContext(ZMKAppContext);
  const { runWithUnlock } = useStudioUnlock();
  const [loaded, setLoaded] = useState<ZmkLoadedConnection | null>(null);
  const [resolved, setResolved] = useState<AbyssLayoutResolveResult | null>(
    null,
  );
  const [phase, setPhase] = useState<AbyssDevicePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  // Guards against a second read being started from the other section while one
  // is already in flight; both share this hook.
  const inFlight = useRef<Promise<void> | null>(null);

  const subsystemIndexes = useMemo(
    () =>
      (zmkApp?.state.customSubsystems?.subsystems ?? []).map(
        (subsystem) => subsystem.index,
      ),
    [zmkApp?.state.customSubsystems],
  );

  const read = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const rpcConnection = zmkApp?.state.connection;
    const client = getAbyssClient();
    if (!rpcConnection || !client) return;

    const run = (async () => {
      setError(null);
      setPhase("reading");
      try {
        const wrapped = createAbyssZmkConnection({
          rpcConnection,
          deviceName: zmkApp?.state.deviceInfo?.name,
          // The connection context does not expose how the user connected, and
          // the adapter only uses this for a display label it never surfaces to
          // us, so the distinction does not matter here.
          method: "serial",
          notificationSource: zmkApp?.onNotification
            ? createAbyssNotificationSource({
                subsystemIndexes,
                onNotification: zmkApp.onNotification,
              })
            : undefined,
        });
        // A locked device throws before any read, so the unlock gate can park
        // the whole operation and retry it cleanly once the user unlocks.
        const next = await runWithUnlock(() => loadZmkConnection(wrapped));
        setLoaded(next);

        setPhase("resolving");
        const layout = next.state.detectedLayout;
        setResolved(
          layout
            ? await client.resolveLayout({
                keyboard: next.state.currentKeymap.keyboard,
                // The adapter's layout type and the client's disagree on one
                // field: `modules[].firmwareDialect` is `[key: string]: unknown`
                // in @keyboard-hub/schema but `[key: string]: object` in
                // abyss-api-schema, for the same JSON. The value is serialized
                // and posted as-is, so this is a typing gap upstream rather than
                // a real shape difference.
                layout: layout as unknown as AbyssLayoutDefinition,
              })
            : null,
        );
        setPhase("done");
      } catch (caught) {
        setPhase("idle");
        setError(studioLockErrorText(caught) ?? abyssErrorMessageKey(caught));
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, [zmkApp, runWithUnlock, subsystemIndexes]);

  return {
    loaded,
    resolved,
    phase,
    isReading: phase === "reading" || phase === "resolving",
    error,
    read,
  };
}
