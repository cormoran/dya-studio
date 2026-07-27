/**
 * useVersionHistory
 *
 * Per-tab snapshot history backed by IndexedDB. A tab describes what it reads
 * from the keyboard as one JSON payload; every time it finishes a full read,
 * this hook compares that payload against the newest snapshot stored for the
 * connected keyboard and appends a new timestamped version when they differ.
 * The tab then offers those versions in its reset dropdown so a user can roll
 * back to any earlier state.
 *
 * The capture fires on the rising edge of `isLoaded` — i.e. once per completed
 * load (initial load, Refresh, or a reload after unlock). Editing in the tab
 * does not create versions: only what was actually read back from the keyboard
 * is ever recorded.
 *
 * Storage failures are never fatal here. If IndexedDB is unavailable the store
 * falls back to memory, and any error leaves the tab working without history.
 */
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { ConnectionContext } from "../components/DeviceConnection";
import { loadVersions, recordVersion } from "../lib/versionHistory";
import type { JsonValue, StoredSnapshot } from "../lib/versionHistory";

/** Device key used before the keyboard reports a name. */
export const UNKNOWN_DEVICE_KEY = "unknown-device";

export interface UseVersionHistoryOptions<T extends JsonValue> {
  /** Tab that owns this history (`"keymap"`, `"macro-combo"`, ...). */
  tabId: string;
  /** Schema version of the payload; bump it when the payload shape changes. */
  schemaVersion: number;
  /**
   * Read the tab's complete current state. Returning null means "not fully
   * readable right now" and skips the capture rather than storing a partial
   * snapshot.
   */
  collect: () => Promise<T | null>;
  /** True once every read this tab owns has completed. */
  isLoaded: boolean;
  /** Set false to disable history entirely (subsystem absent, disconnected). */
  enabled?: boolean;
}

export interface UseVersionHistoryReturn<T extends JsonValue> {
  /** Stored versions, newest first. */
  versions: StoredSnapshot<T>[];
  /** True while a capture or a storage read is in flight. */
  isBusy: boolean;
  /** Capture the current state now, if it differs from the newest version. */
  capture: () => Promise<void>;
  /** Re-read the version list from storage. */
  reload: () => Promise<void>;
}

export function useVersionHistory<T extends JsonValue>({
  tabId,
  schemaVersion,
  collect,
  isLoaded,
  enabled = true,
}: UseVersionHistoryOptions<T>): UseVersionHistoryReturn<T> {
  const connection = useContext(ConnectionContext);
  const deviceKey = connection.deviceName ?? UNKNOWN_DEVICE_KEY;
  const [versions, setVersions] = useState<StoredSnapshot<T>[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  // Keep the latest collector without re-running effects when a page rebuilds
  // the callback on every render.
  const collectRef = useRef(collect);
  collectRef.current = collect;
  // Serializes captures: a second load finishing while the first capture is
  // still reading the keyboard would otherwise store two identical versions.
  const inFlightRef = useRef(false);

  const scopeRef = useRef({ deviceKey, tabId, schemaVersion });
  scopeRef.current = { deviceKey, tabId, schemaVersion };

  const reload = useCallback(async () => {
    const scope = scopeRef.current;
    try {
      const rows = await loadVersions<T>(scope);
      // Ignore a result that arrived after the scope moved on (device swap).
      if (
        scopeRef.current.deviceKey === scope.deviceKey &&
        scopeRef.current.tabId === scope.tabId
      ) {
        setVersions(rows);
      }
    } catch (error) {
      console.warn("Failed to read version history:", error);
    }
  }, []);

  const capture = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsBusy(true);
    try {
      const snapshot = await collectRef.current();
      if (snapshot === null) return;
      const { versions: next } = await recordVersion<T>(
        scopeRef.current,
        snapshot,
      );
      setVersions(next);
    } catch (error) {
      console.warn("Failed to record a version snapshot:", error);
    } finally {
      inFlightRef.current = false;
      setIsBusy(false);
    }
  }, []);

  // Show whatever is already stored as soon as the tab mounts (or the
  // connected keyboard changes), before any capture happens.
  useEffect(() => {
    if (!enabled) {
      setVersions([]);
      return;
    }
    void reload();
  }, [enabled, reload, deviceKey, tabId, schemaVersion]);

  // Capture once per completed load.
  const wasLoadedRef = useRef(false);
  useEffect(() => {
    const readyNow = enabled && isLoaded;
    const wasReady = wasLoadedRef.current;
    wasLoadedRef.current = readyNow;
    if (readyNow && !wasReady) {
      void capture();
    }
  }, [capture, enabled, isLoaded]);

  return { versions, isBusy, capture, reload };
}
