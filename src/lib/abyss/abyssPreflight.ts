/**
 * Compatibility checks run before writing an Abyss keymap to the keyboard.
 *
 * Writing is the one destructive thing this tab does, and the adapter applies
 * changes one RPC at a time — a diff that fails halfway leaves the keyboard in
 * a mixed state. So mismatches that are knowable up front are caught here
 * rather than discovered mid-write.
 */
import { maxLayerIndex, type KeymapDiff } from "./abyssDiff";

/**
 * `blocked` prevents the write outright; `warning` is shown but lets the user
 * proceed, for cases that are merely suspicious rather than wrong.
 */
export type PreflightLevel = "ok" | "warning" | "blocked";

export interface PreflightCheck {
  id: string;
  level: PreflightLevel;
  /** English message key, rendered through `t()` with `params`. */
  message: string;
  params?: Record<string, string | number>;
}

export interface PreflightInput {
  /** The filtered diff about to be written. */
  diff: KeymapDiff;
  /** Key count of the widest layer on the device. */
  deviceKeyCount: number;
  /** Key count of the widest layer in the Abyss keymap. */
  targetKeyCount: number;
  /** Layers currently on the device. */
  deviceLayerCount: number;
  /** Physical layout name the device reported, if any. */
  deviceLayoutName?: string;
  /** Layout name recorded on the Abyss keymap, if any. */
  targetLayoutName?: string;
}

/**
 * Runs every check. The caller blocks the write if any result is `blocked`.
 *
 * Order matters only for display; each check is independent.
 */
export function runPreflight(input: PreflightInput): PreflightCheck[] {
  const checks: PreflightCheck[] = [];

  // A keymap built for a different key count cannot be written meaningfully:
  // positions are indices into the layout, so a mismatch silently maps bindings
  // onto the wrong physical keys.
  if (input.targetKeyCount > input.deviceKeyCount) {
    checks.push({
      id: "key-count",
      level: "blocked",
      message:
        "This keymap has {{target}} keys per layer but the keyboard has {{device}}.",
      params: { target: input.targetKeyCount, device: input.deviceKeyCount },
    });
  } else if (
    input.targetKeyCount > 0 &&
    input.targetKeyCount < input.deviceKeyCount
  ) {
    checks.push({
      id: "key-count-partial",
      level: "warning",
      message:
        "This keymap covers {{target}} of the keyboard's {{device}} keys. The rest are left unchanged.",
      params: { target: input.targetKeyCount, device: input.deviceKeyCount },
    });
  }

  // The adapter adds layers as needed, but firmware can refuse — and that
  // failure would land mid-write, so warn rather than discover it there.
  const layersNeeded = maxLayerIndex(input.diff) + 1;
  if (layersNeeded > input.deviceLayerCount) {
    checks.push({
      id: "layer-count",
      level: "warning",
      message:
        "Writing needs {{needed}} layers; the keyboard has {{device}}. The missing ones will be added.",
      params: { needed: layersNeeded, device: input.deviceLayerCount },
    });
  }

  // A different physical layout usually means the bindings are ordered for
  // different key positions. Not provably wrong, so it warns.
  if (
    input.deviceLayoutName &&
    input.targetLayoutName &&
    !layoutNamesMatch(input.deviceLayoutName, input.targetLayoutName)
  ) {
    checks.push({
      id: "layout-name",
      level: "warning",
      message:
        "This keymap was made for the {{target}} layout; the keyboard reports {{device}}.",
      params: {
        target: input.targetLayoutName,
        device: input.deviceLayoutName,
      },
    });
  }

  return checks;
}

/** Whether any check blocks the write. */
export function isBlocked(checks: PreflightCheck[]): boolean {
  return checks.some((check) => check.level === "blocked");
}

/**
 * Compares layout names loosely.
 *
 * The same layout is spelled inconsistently across firmware and catalog —
 * "DYA2 ANSI", "dya2_ansi", "dya2-ansi" — and a false mismatch warning trains
 * users to ignore the warnings that matter.
 */
export function layoutNamesMatch(left: string, right: string): boolean {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalize(left) === normalize(right);
}
