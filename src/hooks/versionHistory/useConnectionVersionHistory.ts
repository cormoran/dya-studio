/**
 * Connection tab version history: BLE profile names, the USB-vs-BLE output
 * priority, and the per-endpoint / per-OS default layers.
 *
 * Unlike the keymap and macro tabs there is no memory tier here — the BLE and
 * default-layer RPCs write straight to persistent storage — so restoring a
 * version takes effect immediately and needs no follow-up Save. The diff modal
 * is therefore the only confirmation step, which is why it lists every field
 * that would change.
 *
 * Profile *pairings* are deliberately out of scope: a snapshot can name a
 * profile, but it cannot re-pair a host that was unpaired since.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTabVersionHistory } from "../useTabVersionHistory";
import type { UseTabVersionHistoryReturn } from "../useTabVersionHistory";
import type { UseBLEProfilesReturn } from "../useBLEProfiles";
import type { UseDefaultLayerReturn } from "../useDefaultLayer";
import type { OutputPriority } from "../../proto/zmk/ble_management/ble_management";
import type { DiffLabeler } from "../../lib/versionHistory";

/** Bump when the payload shape below changes. */
export const CONNECTION_SNAPSHOT_SCHEMA_VERSION = 1;
export const CONNECTION_TAB_ID = "connection";

export type ConnectionSnapshot = {
  /** BLE profile names, keyed by profile index. */
  profileNames: Record<string, string>;
  /** USB-vs-BLE output priority, or null when unavailable. */
  outputPriority: number | null;
  /** Default layer per endpoint, keyed by endpoint index. */
  endpointLayers: Record<string, number> | null;
  /** Default layer per detected OS, keyed by OS id. */
  osLayers: Record<string, number> | null;
};

export interface UseConnectionVersionHistoryOptions {
  bleProfiles: UseBLEProfilesReturn;
  defaultLayer: UseDefaultLayerReturn;
  /** True once the tab's profile + default-layer reads have completed. */
  isLoaded: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export interface UseConnectionVersionHistoryReturn extends UseTabVersionHistoryReturn<ConnectionSnapshot> {
  labeler: DiffLabeler;
}

export function useConnectionVersionHistory({
  bleProfiles,
  defaultLayer,
  isLoaded,
  t,
}: UseConnectionVersionHistoryOptions): UseConnectionVersionHistoryReturn {
  // Declared before useTabVersionHistory so the refs are current by the time
  // its capture effect runs.
  const bleRef = useRef(bleProfiles);
  const layerRef = useRef(defaultLayer);
  useEffect(() => {
    bleRef.current = bleProfiles;
    layerRef.current = defaultLayer;
  });

  const collect = useCallback(async (): Promise<ConnectionSnapshot | null> => {
    const ble = bleRef.current;
    const layers = layerRef.current;
    if (!ble.isAvailable && !layers.isAvailable) return null;

    const profileNames: Record<string, string> = {};
    for (const profile of ble.profiles) {
      profileNames[String(profile.index)] = profile.name;
    }

    const state = layers.isAvailable ? layers.state : null;
    return {
      profileNames,
      outputPriority: ble.outputPriority ?? null,
      endpointLayers: state
        ? Object.fromEntries(
            state.endpoints.map((endpoint) => [
              String(endpoint.index),
              endpoint.value,
            ]),
          )
        : null,
      osLayers: state
        ? Object.fromEntries(
            state.osLayers.map((entry) => [String(entry.os), entry.value]),
          )
        : null,
    };
  }, []);

  const apply = useCallback(async (snapshot: ConnectionSnapshot) => {
    const ble = () => bleRef.current;
    const layers = () => layerRef.current;

    for (const [index, name] of Object.entries(snapshot.profileNames)) {
      const profile = ble().profiles.find(
        (candidate) => candidate.index === Number(index),
      );
      // Only rename profiles that still exist; a snapshot can't re-pair a host.
      if (!profile || profile.name === name) continue;
      await ble().setProfileName(Number(index), name);
    }

    if (
      snapshot.outputPriority !== null &&
      snapshot.outputPriority !== ble().outputPriority
    ) {
      await ble().setOutputPriority(snapshot.outputPriority as OutputPriority);
    }

    for (const [index, value] of Object.entries(
      snapshot.endpointLayers ?? {},
    )) {
      const endpoint = layers().state?.endpoints.find(
        (candidate) => candidate.index === Number(index),
      );
      if (!endpoint || endpoint.value === value) continue;
      await layers().setEndpointLayer(Number(index), value);
    }

    for (const [os, value] of Object.entries(snapshot.osLayers ?? {})) {
      const entry = layers().state?.osLayers.find(
        (candidate) => candidate.os === Number(os),
      );
      if (!entry || entry.value === value) continue;
      await layers().setOsLayer(Number(os), value);
    }
  }, []);

  const history = useTabVersionHistory<ConnectionSnapshot>({
    tabId: CONNECTION_TAB_ID,
    schemaVersion: CONNECTION_SNAPSHOT_SCHEMA_VERSION,
    collect,
    apply,
    isLoaded,
    enabled: bleProfiles.isAvailable || defaultLayer.isAvailable,
  });

  const labeler = useMemo<DiffLabeler>(
    () => ({
      label(path) {
        if (path[0] === "profileNames") {
          return t("Profile {{index}} › Name", { index: Number(path[1]) + 1 });
        }
        if (path[0] === "outputPriority") return t("Output priority");
        if (path[0] === "endpointLayers") {
          return t("Default layer › Connection {{index}}", {
            index: Number(path[1]) + 1,
          });
        }
        if (path[0] === "osLayers") {
          return t("Default layer › OS {{os}}", { os: path[1] });
        }
        return null;
      },
    }),
    [t],
  );

  return { ...history, labeler };
}
