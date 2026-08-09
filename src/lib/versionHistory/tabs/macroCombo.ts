/**
 * Macro & Combo tab snapshot: every runtime macro (name + steps), every
 * runtime combo slot, and both domains' global settings.
 *
 * Macros are keyed by **name**, not by slot: slots shift as macros are created
 * and deleted, while the create/rename/delete RPCs all address a macro by its
 * name, so a name-keyed payload restores predictably. Combos keep their slot
 * index, which is their stable identity on the device.
 *
 * Compound values (a behavior binding, a step, a key-position set) are encoded
 * as single strings so one changed step or combo field is one diff row.
 */
import type {
  MacroStep,
  MacroSummary,
} from "../../../proto/cormoran/runtime_macro/runtime_macro";
import type {
  BehaviorBinding,
  Combo,
} from "../../../proto/cormoran/runtime_combo/runtime_combo";
import type { JsonValue } from "../types";

/** Bump when the payload shape below changes. */
export const MACRO_COMBO_SNAPSHOT_SCHEMA_VERSION = 1;

export const MACRO_COMBO_TAB_ID = "macro-combo";

export type MacroSnapshot = {
  name: string;
  /** Encoded steps, in order — see {@link encodeMacroStep}. */
  steps: string[];
};

export type ComboSnapshot = {
  /** Combo slot; stable identity on the device. */
  index: number;
  name: string;
  /** Comma-separated key positions, e.g. `"12,13"`. */
  keyPositions: string;
  /** `behaviorId:param1:param2`. */
  behavior: string;
  layerMask: number;
  enabled: boolean;
  timeoutMs: number;
  requirePriorIdleMs: number;
  slowReleaseOverride: number;
};

export type MacroComboSnapshot = {
  /** Null when the runtime-macro subsystem isn't present on this keyboard. */
  macros: MacroSnapshot[] | null;
  /** Macro global settings; only the writable field is kept. */
  macroTapMs: number | null;
  /** Null when the runtime-combo subsystem isn't present. */
  combos: ComboSnapshot[] | null;
  /** Combo global settings; only the writable fields are kept. */
  comboSettings: {
    timeoutMs: number;
    slowRelease: boolean;
    requirePriorIdleMs: number;
  } | null;
};

export function encodeBehavior(binding: BehaviorBinding | undefined): string {
  if (!binding) return "none";
  return `${binding.behaviorId}:${binding.param1}:${binding.param2}`;
}

export function decodeBehavior(encoded: string): BehaviorBinding | undefined {
  if (encoded === "none") return undefined;
  const parts = encoded.split(":").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }
  return { behaviorId: parts[0], param1: parts[1], param2: parts[2] };
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** `tap:1:22:0`, `delay:120`, `keys:0a1b`, ... — one string per macro step. */
export function encodeMacroStep(step: MacroStep): string {
  if (step.down) return `down:${encodeBehavior(step.down)}`;
  if (step.up) return `up:${encodeBehavior(step.up)}`;
  if (step.tap) return `tap:${encodeBehavior(step.tap)}`;
  if (step.delay) return `delay:${step.delay.delayMs}`;
  if (step.keyTapSequence)
    return `keys:${toHex(step.keyTapSequence.packedKeys)}`;
  return "empty";
}

export function decodeMacroStep(encoded: string): MacroStep | null {
  const separator = encoded.indexOf(":");
  const kind = separator < 0 ? encoded : encoded.slice(0, separator);
  const rest = separator < 0 ? "" : encoded.slice(separator + 1);

  switch (kind) {
    case "down":
    case "up":
    case "tap": {
      const binding = decodeBehavior(rest);
      return binding ? { [kind]: binding } : null;
    }
    case "delay": {
      const delayMs = Number(rest);
      return Number.isFinite(delayMs) ? { delay: { delayMs } } : null;
    }
    case "keys":
      return { keyTapSequence: { packedKeys: fromHex(rest) } };
    default:
      return null;
  }
}

export function buildMacroSnapshot(
  macro: MacroSummary,
  steps: MacroStep[],
): MacroSnapshot {
  return { name: macro.name, steps: steps.map(encodeMacroStep) };
}

export function buildComboSnapshot(combo: Combo): ComboSnapshot {
  return {
    index: combo.index,
    name: combo.name,
    keyPositions: combo.keyPositions.join(","),
    behavior: encodeBehavior(combo.behavior),
    layerMask: combo.layerMask,
    enabled: combo.enabled,
    timeoutMs: combo.timeoutMs,
    requirePriorIdleMs: combo.requirePriorIdleMs,
    slowReleaseOverride: combo.slowReleaseOverride,
  };
}

export function decodeKeyPositions(encoded: string): number[] {
  if (encoded.length === 0) return [];
  return encoded
    .split(",")
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

/** Whether two combo snapshots describe the same combo configuration. */
export function comboSnapshotsEqual(a: ComboSnapshot, b: ComboSnapshot) {
  return (
    a.keyPositions === b.keyPositions &&
    a.behavior === b.behavior &&
    a.layerMask === b.layerMask &&
    a.enabled === b.enabled &&
    a.timeoutMs === b.timeoutMs &&
    a.requirePriorIdleMs === b.requirePriorIdleMs &&
    a.slowReleaseOverride === b.slowReleaseOverride
  );
}

export function isMacroComboSnapshot(
  value: JsonValue,
): value is MacroComboSnapshot {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
