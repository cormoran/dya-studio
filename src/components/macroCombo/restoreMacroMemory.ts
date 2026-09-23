import type { UseRuntimeMacroReturn } from "../../hooks/useRuntimeMacro";
import type { MacroDetail } from "../../proto/cormoran/runtime_macro/runtime_macro";

/** Restore one macro to the RAM values captured when its editor opened. */
export async function restoreMacroMemory(
  runtimeMacro: UseRuntimeMacroReturn,
  baseline: MacroDetail,
): Promise<boolean> {
  const current = await runtimeMacro.getMacro(baseline.slot);
  if (!current) return false;

  if (current.name !== baseline.name) {
    if (!(await runtimeMacro.renameMacro(current.name, baseline.name))) {
      return false;
    }
  }

  if (JSON.stringify(current.steps) !== JSON.stringify(baseline.steps)) {
    if (
      !(await runtimeMacro.setMacroStepCount(
        baseline.slot,
        baseline.steps.length,
      ))
    ) {
      return false;
    }
    for (const [index, step] of baseline.steps.entries()) {
      if (!(await runtimeMacro.setMacroStep(baseline.slot, index, step))) {
        return false;
      }
    }
  }

  await runtimeMacro.loadMacros();
  return true;
}
