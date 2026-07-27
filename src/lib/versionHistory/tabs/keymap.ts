/**
 * Keymap tab snapshot: the layer list (order, ids, names) and every binding.
 *
 * A binding is stored as one `behaviorId:param1:param2` string rather than a
 * nested object so a changed key shows up as a single diff row ("Layer BASE ›
 * Key 12") instead of three. The physical layout index rides along as an
 * identity check: bindings are indexed by key position, so a snapshot taken
 * under a different layout must not be written back.
 */
import type { BehaviorBinding, Layer } from "../../../hooks/useKeymap";
import type { JsonValue } from "../types";

/** Bump when the payload shape below changes. */
export const KEYMAP_SNAPSHOT_SCHEMA_VERSION = 1;

export const KEYMAP_TAB_ID = "keymap";

export type KeymapSnapshotLayer = {
  id: number;
  name: string;
  /** One encoded binding per key position. */
  bindings: string[];
};

export type KeymapSnapshot = {
  /** Active physical layout when the snapshot was taken. */
  layoutIndex: number;
  layers: KeymapSnapshotLayer[];
};

export function encodeBinding(binding: BehaviorBinding): string {
  return `${binding.behaviorId}:${binding.param1}:${binding.param2}`;
}

export function decodeBinding(encoded: string): BehaviorBinding | null {
  const parts = encoded.split(":").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  return { behaviorId: parts[0], param1: parts[1], param2: parts[2] };
}

export function buildKeymapSnapshot(
  layers: Layer[],
  layoutIndex: number,
): KeymapSnapshot {
  return {
    layoutIndex,
    layers: layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      bindings: layer.bindings.map(encodeBinding),
    })),
  };
}

/** Narrow a stored payload back to a snapshot (schema version is checked by
 * the store, so this only guards against a hand-edited database). */
export function isKeymapSnapshot(value: JsonValue): value is KeymapSnapshot {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return typeof value.layoutIndex === "number" && Array.isArray(value.layers);
}
