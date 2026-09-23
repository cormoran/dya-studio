import type { UseRuntimeMacroReturn } from "../../../hooks/useRuntimeMacro";
import type { MacroDetail } from "../../../proto/cormoran/runtime_macro/runtime_macro";
import { restoreMacroMemory } from "../restoreMacroMemory";

it("restores only the edited slot to its opening RAM state", async () => {
  const baseline: MacroDetail = {
    slot: 3,
    name: "Already unsaved",
    steps: [{ delay: { delayMs: 10 } }],
    encodedSize: 2,
  };
  const current: MacroDetail = {
    slot: 3,
    name: "Edited here",
    steps: [{ delay: { delayMs: 20 } }, { delay: { delayMs: 30 } }],
    encodedSize: 4,
  };
  const otherMacro = {
    slot: 8,
    name: "Other unsaved",
    steps: [{ delay: { delayMs: 99 } }],
  };
  const discardMacros = jest.fn();
  const saveMacros = jest.fn();
  const runtimeMacro = {
    getMacro: jest.fn().mockImplementation(async () => ({
      ...current,
      steps: current.steps.map((step) => ({ ...step })),
    })),
    renameMacro: jest
      .fn()
      .mockImplementation(async (_oldName: string, name: string) => {
        current.name = name;
        return true;
      }),
    setMacroStepCount: jest
      .fn()
      .mockImplementation(async (_slot: number, count: number) => {
        current.steps.length = count;
        return true;
      }),
    setMacroStep: jest
      .fn()
      .mockImplementation(
        async (
          _slot: number,
          index: number,
          step: MacroDetail["steps"][number],
        ) => {
          current.steps[index] = step;
          return true;
        },
      ),
    loadMacros: jest.fn().mockResolvedValue(undefined),
    discardMacros,
    saveMacros,
  } as unknown as UseRuntimeMacroReturn;

  expect(await restoreMacroMemory(runtimeMacro, baseline)).toBe(true);
  expect(current.name).toBe(baseline.name);
  expect(current.steps).toEqual(baseline.steps);
  expect(otherMacro).toEqual({
    slot: 8,
    name: "Other unsaved",
    steps: [{ delay: { delayMs: 99 } }],
  });
  expect(runtimeMacro.setMacroStepCount).toHaveBeenCalledWith(3, 1);
  expect(discardMacros).not.toHaveBeenCalled();
  expect(saveMacros).not.toHaveBeenCalled();
});

it("does not close the restore transaction when a memory write fails", async () => {
  const baseline: MacroDetail = {
    slot: 3,
    name: "Original",
    steps: [],
    encodedSize: 0,
  };
  const runtimeMacro = {
    getMacro: jest.fn().mockResolvedValue({ ...baseline, name: "Edited" }),
    renameMacro: jest.fn().mockResolvedValue(false),
    loadMacros: jest.fn(),
  } as unknown as UseRuntimeMacroReturn;
  expect(await restoreMacroMemory(runtimeMacro, baseline)).toBe(false);
  expect(runtimeMacro.loadMacros).not.toHaveBeenCalled();
});
