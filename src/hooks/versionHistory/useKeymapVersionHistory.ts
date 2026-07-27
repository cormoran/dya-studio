/**
 * Keymap tab version history.
 *
 * Capture happens once the keymap tab is *fully* loaded (preview plus the
 * background layer/behavior fetches), so a snapshot always covers every layer.
 * Restoring replays the difference through the ordinary keymap edit RPCs —
 * remove/restore/move layers, rename, then write only the bindings that
 * actually differ — which keeps everything in keyboard RAM until the user
 * presses Save, exactly like hand-editing the keymap does.
 */
import { useCallback, useMemo, useRef } from "react";
import { useTabVersionHistory } from "../useTabVersionHistory";
import type { UseTabVersionHistoryReturn } from "../useTabVersionHistory";
import type { UseKeymapReturn } from "../useKeymap";
import {
  KEYMAP_SNAPSHOT_SCHEMA_VERSION,
  KEYMAP_TAB_ID,
  buildKeymapSnapshot,
  decodeBinding,
  encodeBinding,
  type KeymapSnapshot,
} from "../../lib/versionHistory/tabs/keymap";
import { formatDiffValue } from "../../lib/versionHistory";
import type { DiffLabeler, JsonValue } from "../../lib/versionHistory";

export interface UseKeymapVersionHistoryReturn extends UseTabVersionHistoryReturn<KeymapSnapshot> {
  /** Names/values for the diff modal. */
  labeler: DiffLabeler;
}

export function useKeymapVersionHistory(
  keymap: UseKeymapReturn,
  t: (key: string, params?: Record<string, string | number>) => string,
): UseKeymapVersionHistoryReturn {
  // The keymap hook rebuilds its callbacks constantly; read it through a ref so
  // collect/apply stay stable and never capture a stale layer list.
  const keymapRef = useRef(keymap);
  keymapRef.current = keymap;

  const collect = useCallback(async (): Promise<KeymapSnapshot | null> => {
    const state = keymapRef.current;
    if (!state.keymap) return null;
    return buildKeymapSnapshot(
      state.keymap.layers,
      state.physicalLayouts?.activeLayoutIndex ?? 0,
    );
  }, []);

  const apply = useCallback(async (snapshot: KeymapSnapshot) => {
    const state = keymapRef.current;
    const current = state.keymap;
    if (!current) {
      throw new Error("The keymap is not loaded yet");
    }
    if (
      snapshot.layoutIndex !== (state.physicalLayouts?.activeLayoutIndex ?? 0)
    ) {
      throw new Error(
        "This version was captured with a different physical layout, so it cannot be restored.",
      );
    }

    // Mirror of the device's layer list, kept in step with each RPC: the hook's
    // React state only catches up after this function returns.
    const working = current.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      bindings: layer.bindings.map(encodeBinding),
    }));
    const desired = snapshot.layers;
    const desiredIds = new Set(desired.map((layer) => layer.id));

    // 1. Drop layers the version doesn't have (back to front: indexes shift).
    for (let index = working.length - 1; index >= 0; index--) {
      if (desiredIds.has(working[index].id)) continue;
      if (!(await state.removeLayer(index))) {
        throw new Error("Failed to remove a layer while restoring the version");
      }
      working.splice(index, 1);
    }

    // 2. Bring back layers the version has but the device no longer shows.
    for (let index = 0; index < desired.length; index++) {
      const want = desired[index];
      if (working.some((layer) => layer.id === want.id)) continue;
      const at = Math.min(index, working.length);
      const restored = await state.restoreLayer(want.id, at);
      if (!restored) {
        throw new Error(
          "Failed to restore a deleted layer that this version needs",
        );
      }
      working.splice(at, 0, {
        id: restored.id,
        name: restored.name,
        bindings: restored.bindings.map(encodeBinding),
      });
    }

    // 3. Put them in the version's order.
    for (let index = 0; index < desired.length; index++) {
      const from = working.findIndex((layer) => layer.id === desired[index].id);
      if (from < 0 || from === index) continue;
      if (!(await state.moveLayer(from, index))) {
        throw new Error("Failed to reorder layers while restoring the version");
      }
      const [moved] = working.splice(from, 1);
      working.splice(index, 0, moved);
    }

    // 4. Names, then 5. only the bindings that actually differ.
    for (const want of desired) {
      const have = working.find((layer) => layer.id === want.id);
      if (!have) continue;
      if (have.name !== want.name) {
        await state.setLayerName(want.id, want.name);
      }
      for (let position = 0; position < want.bindings.length; position++) {
        if (have.bindings[position] === want.bindings[position]) continue;
        const binding = decodeBinding(want.bindings[position]);
        if (!binding) continue;
        await state.setBinding(want.id, position, binding);
      }
    }
  }, []);

  const history = useTabVersionHistory<KeymapSnapshot>({
    tabId: KEYMAP_TAB_ID,
    schemaVersion: KEYMAP_SNAPSHOT_SCHEMA_VERSION,
    collect,
    apply,
    isLoaded: keymap.isFullyLoaded,
    enabled: keymap.keymap !== null,
  });

  const layerNames = useMemo(
    () => keymap.keymap?.layers.map((layer) => layer.name) ?? [],
    [keymap.keymap],
  );
  const getBindingDisplayName = keymap.getBindingDisplayName;

  const labeler = useMemo<DiffLabeler>(
    () => ({
      label(path) {
        if (path[0] === "layoutIndex") return t("Physical layout");
        if (path[0] !== "layers") return null;
        const layerIndex = Number(path[1]);
        const layer =
          layerNames[layerIndex] ??
          t("Layer {{index}}", { index: layerIndex + 1 });
        if (path[2] === "name") return t("{{layer}} › Name", { layer });
        if (path[2] === "id") return t("{{layer}} › Layer ID", { layer });
        if (path[2] === "bindings") {
          return t("{{layer}} › Key {{position}}", {
            layer,
            position: Number(path[3]),
          });
        }
        return t("{{layer}}", { layer });
      },
      formatValue(path, value) {
        if (path[0] !== "layers" || path[2] !== "bindings") return null;
        if (typeof value !== "string") return null;
        const binding = decodeBinding(value);
        return binding
          ? getBindingDisplayName(binding)
          : formatDiffValue(value as JsonValue);
      },
    }),
    [getBindingDisplayName, layerNames, t],
  );

  return { ...history, labeler };
}
