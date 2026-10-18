import { EMPTY_DIFF, type KeymapDiff, type ModuleChange } from "./abyssDiff";

export interface KeymapApplyResult {
  name: string;
  skipped: KeymapDiff;
  /** Actual requested settings still missing in a fresh device readback. */
  remaining: KeymapDiff | null;
  /** Requested writable changes whose outcome could not be read back. */
  unverified: KeymapDiff | null;
  verified: boolean;
  attempted: boolean;
  error: string | null;
}

/** These binding types cannot be encoded by adapter-zmk's writeback encoder. */
function hasUnsupportedBinding(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if ("type" in value && (value.type === "raw" || value.type === "macro"))
    return true;
  return Object.values(value).some(hasUnsupportedBinding);
}

/** Known adapter module routes; metadata/value validation still happens at writeback. */
function hasUnsupportedModuleRoute(change: ModuleChange): boolean {
  const value = change.to ?? change.from;
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  return change.scope === "global"
    ? !["trackball", "touch_pad", "custom"].includes(String(value.type))
    : value.type !== "rotary_encoder";
}

/** Skip the whole containing change so collection entries/modules stay intact. */
export function splitWritableKeymapDiff(diff: KeymapDiff) {
  const writable = { ...EMPTY_DIFF };
  const skipped = { ...EMPTY_DIFF };
  for (const key of Object.keys(diff) as (keyof KeymapDiff)[]) {
    const changes = diff[key];
    // Each array keeps its own element type; only the shared `to` payload is inspected.
    const blocked = changes.filter((change) =>
      hasUnsupportedBinding(change.to),
    );
    const supported = changes.filter(
      (change) => !hasUnsupportedBinding(change.to),
    );
    Object.assign(skipped, { [key]: blocked });
    Object.assign(writable, { [key]: supported });
  }
  const unsupportedModules = writable.moduleChanges.filter(
    hasUnsupportedModuleRoute,
  );
  skipped.moduleChanges = [...skipped.moduleChanges, ...unsupportedModules];
  writable.moduleChanges = writable.moduleChanges.filter(
    (change) => !hasUnsupportedModuleRoute(change),
  );
  return { writable, skipped };
}

/** Readback must still match every field outside the explicitly skipped changes. */
export function withoutSkippedChanges(
  diff: KeymapDiff,
  skipped: KeymapDiff,
): KeymapDiff {
  return {
    bindingChanges: diff.bindingChanges.filter(
      (change) =>
        !skipped.bindingChanges.some(
          (skip) =>
            skip.layerIndex === change.layerIndex &&
            skip.keyIndex === change.keyIndex,
        ),
    ),
    layerNameChanges: diff.layerNameChanges.filter(
      (change) =>
        !skipped.layerNameChanges.some(
          (skip) => skip.layerIndex === change.layerIndex,
        ),
    ),
    comboChanges: diff.comboChanges.filter(
      (change) =>
        !skipped.comboChanges.some((skip) => skip.index === change.index),
    ),
    macroChanges: diff.macroChanges.filter(
      (change) =>
        !skipped.macroChanges.some((skip) => skip.index === change.index),
    ),
    moduleChanges: diff.moduleChanges.filter(
      (change) =>
        !skipped.moduleChanges.some(
          (skip) =>
            skip.scope === change.scope &&
            skip.layerIndex === change.layerIndex &&
            skip.moduleName === change.moduleName,
        ),
    ),
  };
}
