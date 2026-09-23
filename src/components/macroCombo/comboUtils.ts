/**
 * Pure helpers for the runtime-combo editor: draft construction, validation
 * and formatting. Extracted from the former ComboPage so the merged
 * Macro&Combo page can share them.
 */
import type { EditStatus } from "../EditStatusIndicator";
import type {
  BehaviorBinding,
  BehaviorDefinition,
} from "../../hooks/useKeymap";
import type { Combo } from "../../hooks/useRuntimeCombo";
import {
  formatBehaviorBinding,
  findBehaviorByPredicate,
} from "../../lib/behaviorMetadata";
import { createHidUsage, HID_USAGE_PAGE_KEYBOARD } from "../../lib/keycodes";
import type { KeyboardLayoutType } from "../../lib/keyboardLayouts";
import {
  ComboSource,
  SlowReleaseOverride,
} from "../../proto/cormoran/runtime_combo/runtime_combo";

export const MAX_POSITIONS_PER_COMBO = 16;
export const MAX_NAME_LENGTH = 64;
export const DEFAULT_TIMEOUT_MS = 50;

// Defaults applied when creating a new combo from the Add button.
export const DEFAULT_COMBO_POSITIONS = [0, 1];
// `&kp a` — HID keyboard usage for the "A" key (matches what the keycode
// selector produces when the user picks "A").
export const DEFAULT_COMBO_KEYCODE = createHidUsage(
  HID_USAGE_PAGE_KEYBOARD,
  0x04,
);

export interface ComboDraft {
  index: number;
  name: string;
  keyPositions: number[];
  behavior: BehaviorBinding;
  layerMask: number;
  enabled: boolean;
  timeoutMs: number;
  requirePriorIdleMs: number;
  slowReleaseOverride: SlowReleaseOverride;
  source: ComboSource;
}

export function comboSourceLabel(
  source: ComboSource,
  t: (key: string) => string,
): string {
  switch (source) {
    case ComboSource.COMBO_SOURCE_EMPTY:
      return t("Empty");
    case ComboSource.COMBO_SOURCE_DEFAULT:
      return t("Default");
    case ComboSource.COMBO_SOURCE_OVERRIDDEN:
      return t("Overridden");
    case ComboSource.COMBO_SOURCE_RUNTIME:
      return t("Runtime");
    default:
      return t("Unknown");
  }
}

// Unified edit status for a combo slot: green when it has an in-memory change
// not yet persisted, blue when it is persisted but differs from (or is not
// part of) the compile-time default, otherwise no dot.
export function comboEditStatus(
  source: ComboSource,
  index: number,
  modifiedIndices: Set<number>,
): EditStatus {
  if (modifiedIndices.has(index)) {
    return "unsaved";
  }
  if (
    source === ComboSource.COMBO_SOURCE_OVERRIDDEN ||
    source === ComboSource.COMBO_SOURCE_RUNTIME
  ) {
    return "modified";
  }
  return "default";
}

export function defaultBehaviorBinding(
  behaviors: Map<number, BehaviorDefinition>,
): BehaviorBinding {
  // Match the "Key Press" (kp) behavior specifically — several behaviors share
  // the "keypress" category, so key off its short code instead.
  const keyPressBehavior =
    findBehaviorByPredicate(
      behaviors,
      (metadata) => metadata?.shortCode === "KP",
    ) ?? Array.from(behaviors.values()).at(0);

  return {
    behaviorId: keyPressBehavior?.id ?? 0,
    param1: 0,
    param2: 0,
  };
}

export function normalizePositions(positions: number[]): number[] {
  return [...new Set(positions)]
    .filter((position) => Number.isInteger(position) && position >= 0)
    .sort((a, b) => a - b);
}

export function positionsToText(positions: number[]): string {
  return positions.join(", ");
}

export function comboToDraft(
  combo: Combo,
  behaviors: Map<number, BehaviorDefinition>,
): ComboDraft {
  return {
    index: combo.index,
    name: combo.name,
    keyPositions: normalizePositions(combo.keyPositions),
    behavior: combo.behavior
      ? { ...combo.behavior }
      : defaultBehaviorBinding(behaviors),
    layerMask: combo.layerMask,
    enabled: combo.enabled,
    timeoutMs: combo.timeoutMs,
    requirePriorIdleMs: combo.requirePriorIdleMs,
    slowReleaseOverride: combo.slowReleaseOverride,
    source: combo.source,
  };
}

export function createDraft(
  combos: Combo[],
  maxCombo: number | undefined,
  behaviors: Map<number, BehaviorDefinition>,
): ComboDraft {
  const usedSlots = new Set(combos.map((combo) => combo.index));
  const slotLimit = maxCombo && maxCombo > 0 ? maxCombo : 16;
  let index = 0;
  while (index < slotLimit && usedSlots.has(index)) {
    index++;
  }
  if (index >= slotLimit) {
    index = Math.max(0, slotLimit - 1);
  }

  return {
    index,
    name: "",
    keyPositions: [],
    behavior: defaultBehaviorBinding(behaviors),
    layerMask: 0,
    enabled: true,
    timeoutMs: 0,
    requirePriorIdleMs: 0,
    slowReleaseOverride: SlowReleaseOverride.SLOW_RELEASE_OVERRIDE_INHERIT,
    source: ComboSource.COMBO_SOURCE_EMPTY,
  };
}

export function hasLayer(mask: number, layerId: number): boolean {
  if (layerId < 0 || layerId >= 32) return false;
  return Math.floor(mask / 2 ** layerId) % 2 === 1;
}

export function toggleLayer(mask: number, layerId: number): number {
  if (layerId < 0 || layerId >= 32) return mask;
  const bit = 2 ** layerId;
  return hasLayer(mask, layerId) ? mask - bit : mask + bit;
}

export function formatLayerScope(
  mask: number,
  t: (key: string, params?: Record<string, number | string>) => string,
  layers: Array<{ id: number; name: string }> = [],
): string {
  if (mask === 0) return t("All layers");

  return Array.from({ length: 32 }, (_, id) => id)
    .filter((id) => hasLayer(mask, id))
    .map(
      (id) =>
        layers.find((layer) => layer.id === id)?.name ||
        t("Layer {{id}}", { id }),
    )
    .join(", ");
}

// Pure validation shared by the error banner and the auto-write guard: an
// invalid draft is shown to the user but never written to the device.
export function validateCombo(
  draft: ComboDraft,
  maxCombo: number | undefined,
  t: (key: string, params?: Record<string, number | string>) => string,
): string | null {
  if (draft.index < 0 || !Number.isInteger(draft.index)) {
    return t("Choose a valid slot.");
  }
  if (maxCombo && maxCombo > 0 && draft.index >= maxCombo) {
    return t("Slot must be below {{maxCombo}}.", { maxCombo });
  }
  if (draft.name.length > MAX_NAME_LENGTH) {
    return t("Name must be {{maxLength}} characters or fewer.", {
      maxLength: MAX_NAME_LENGTH,
    });
  }
  if (draft.keyPositions.length < 2) {
    return t("Select at least two key positions.");
  }
  if (draft.keyPositions.length > MAX_POSITIONS_PER_COMBO) {
    return t("Select {{maxPositions}} positions or fewer.", {
      maxPositions: MAX_POSITIONS_PER_COMBO,
    });
  }
  if (draft.keyPositions.some((position) => position > 65535)) {
    return t("Key positions must be below 65536.");
  }
  if (!draft.behavior || draft.behavior.behaviorId === 0) {
    return t("Choose a behavior.");
  }
  if (draft.layerMask < 0 || draft.layerMask > 0xffffffff) {
    return t("Layer mask is out of range.");
  }
  return null;
}

export function formatComboBehavior(
  binding: BehaviorBinding,
  behaviors: Map<number, BehaviorDefinition>,
  layers: Array<{ id: number; name: string }>,
  keyboardLayout: KeyboardLayoutType,
  runtimeMacros: Array<{ slot: number; name?: string }>,
  t: (key: string, params?: Record<string, number | string>) => string,
): string {
  const behavior = behaviors.get(binding.behaviorId);
  if (!behavior) {
    return t("Behavior {{id}}", { id: binding.behaviorId });
  }
  return formatBehaviorBinding(binding, behavior, {
    layers,
    keyboardLayout,
    runtimeMacros,
  });
}
