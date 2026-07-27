/**
 * Settings tab version history: the power-management timeouts.
 *
 * Only what the tab loads eagerly is versioned. The Advanced Settings section
 * deliberately defers its custom-settings RPC until the user expands it, and
 * snapshotting it here would undo that; those rows keep their own per-section
 * Save / Discard / Reset instead.
 *
 * The activity RPC writes through to persistent storage, so a restore takes
 * effect immediately — the diff modal is the confirmation step.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTabVersionHistory } from "../useTabVersionHistory";
import type { UseTabVersionHistoryReturn } from "../useTabVersionHistory";
import type { UseSettingsReturn } from "../useSettings";
import type { DiffLabeler } from "../../lib/versionHistory";

/** Bump when the payload shape below changes. */
export const SETTINGS_SNAPSHOT_SCHEMA_VERSION = 1;
export const SETTINGS_TAB_ID = "settings";

export type SettingsSnapshot = {
  /** Idle timeout in ms, or null when the subsystem reported nothing. */
  idleMs: number | null;
  /** Deep-sleep timeout in ms, or null when the subsystem reported nothing. */
  sleepMs: number | null;
};

export interface UseSettingsVersionHistoryOptions {
  settings: UseSettingsReturn;
  /** True once the activity settings have been read. */
  isLoaded: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export interface UseSettingsVersionHistoryReturn extends UseTabVersionHistoryReturn<SettingsSnapshot> {
  labeler: DiffLabeler;
}

export function useSettingsVersionHistory({
  settings,
  isLoaded,
  t,
}: UseSettingsVersionHistoryOptions): UseSettingsVersionHistoryReturn {
  // Declared before useTabVersionHistory so the ref is current by the time its
  // capture effect runs.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  });

  // Source 0 is the central half; `setActivitySettings` applies to every
  // device, so the central values describe the whole keyboard.
  const readCentral = () =>
    settingsRef.current.devices.find((device) => device.sourceId === 0) ??
    settingsRef.current.devices[0];

  const collect = useCallback(async (): Promise<SettingsSnapshot | null> => {
    if (!settingsRef.current.isAvailable) return null;
    const central = readCentral();
    if (!central) return null;
    return { idleMs: central.idleMs, sleepMs: central.sleepMs };
  }, []);

  const apply = useCallback(async (snapshot: SettingsSnapshot) => {
    const central = readCentral();
    const idleMs = snapshot.idleMs ?? central?.idleMs ?? 0;
    const sleepMs = snapshot.sleepMs ?? central?.sleepMs ?? 0;
    if (central && central.idleMs === idleMs && central.sleepMs === sleepMs) {
      return;
    }
    await settingsRef.current.setActivitySettings(idleMs, sleepMs);
  }, []);

  const history = useTabVersionHistory<SettingsSnapshot>({
    tabId: SETTINGS_TAB_ID,
    schemaVersion: SETTINGS_SNAPSHOT_SCHEMA_VERSION,
    collect,
    apply,
    isLoaded,
    enabled: settings.isAvailable,
  });

  const labeler = useMemo<DiffLabeler>(
    () => ({
      label(path) {
        if (path[0] === "idleMs") return t("Idle timeout");
        if (path[0] === "sleepMs") return t("Deep sleep timeout");
        return null;
      },
      formatValue(_path, value) {
        if (typeof value !== "number") return null;
        if (value === 0) return t("Never");
        if (value < 60000) return t("{{count}}s", { count: value / 1000 });
        return t("{{count}}m", { count: value / 60000 });
      },
    }),
    [t],
  );

  return { ...history, labeler };
}
