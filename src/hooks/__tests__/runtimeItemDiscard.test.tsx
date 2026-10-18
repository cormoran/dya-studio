import { act, renderHook, waitFor } from "@testing-library/react";
import { useRuntimeMacro } from "../useRuntimeMacro";
import { useRuntimeCombo } from "../useRuntimeCombo";
import { useRuntimeTapDance } from "../useRuntimeTapDance";
import { RuntimeMacroHandler } from "../../lib/transport/demo-runtime-macro";
import { RuntimeComboHandler } from "../../lib/transport/demo-runtime-combo";
import { RuntimeTapDanceHandler } from "../../lib/transport/demo-runtime-tapdance";
import {
  Request as MacroRequest,
  Response as MacroResponse,
} from "../../proto/cormoran/runtime_macro/runtime_macro";
import {
  Request as ComboRequest,
  Response as ComboResponse,
} from "../../proto/cormoran/runtime_combo/runtime_combo";
import {
  Config,
  Request as DanceRequest,
  Response as DanceResponse,
} from "../../proto/cormoran/runtime_tapdance/runtime_tapdance";

const mockCall = jest.fn();
jest.mock("../useCustomSubsystem", () => ({
  useCustomSubsystem: (identifier: string) => ({
    subsystem: { index: 1 },
    ready: true,
    call: (request: unknown) => mockCall(identifier, request),
  }),
}));
beforeEach(() => {
  const macro = new RuntimeMacroHandler(),
    combo = new RuntimeComboHandler(),
    dance = new RuntimeTapDanceHandler();
  mockCall
    .mockReset()
    .mockImplementation(async (identifier: string, request: never) => {
      if (identifier.endsWith("runtime_macro"))
        return MacroResponse.decode(
          MacroResponse.encode(
            macro.process(
              MacroRequest.decode(MacroRequest.encode(request).finish()),
            ),
          ).finish(),
        );
      if (identifier.endsWith("runtime_combo"))
        return ComboResponse.decode(
          ComboResponse.encode(
            combo.process(
              ComboRequest.decode(ComboRequest.encode(request).finish()),
            ),
          ).finish(),
        );
      return DanceResponse.decode(
        DanceResponse.encode(
          dance.process(
            DanceRequest.decode(DanceRequest.encode(request).finish()),
          ),
        ).finish(),
      );
    });
});

it("discards one saved macro including its rename while preserving another dirty macro and a new entry", async () => {
  const { result } = renderHook(() => useRuntimeMacro());
  await waitFor(() => expect(result.current.macros).toHaveLength(2));
  const target = result.current.macros[0],
    other = result.current.macros[1];
  const original = await result.current.getMacro(target.slot);
  await act(async () => {
    await result.current.renameMacro(target.name, "Changed");
  });
  await act(async () => {
    await result.current.setMacroStepCount(target.slot, 1);
    await result.current.setMacroStep(target.slot, 0, {
      delay: { delayMs: 37 },
    });
  });
  await act(async () => {
    await result.current.setMacroStepCount(other.slot, 1);
    await result.current.setMacroStep(other.slot, 0, {
      delay: { delayMs: 89 },
    });
  });
  await act(async () => {
    await result.current.createMacro("Unsaved sibling", [
      { delay: { delayMs: 77 } },
    ]);
  });
  await act(async () => {
    expect(await result.current.discardMacro("Changed")).toBe(true);
  });
  expect(await result.current.getMacro(target.slot)).toEqual(original);
  expect(
    (await result.current.getMacro(other.slot))?.steps[0].delay?.delayMs,
  ).toBe(89);
  expect(
    result.current.macros.some((entry) => entry.name === "Unsaved sibling"),
  ).toBe(true);
  expect(
    mockCall.mock.calls.some(([, r]) => r.discardMacros || r.saveMacros),
  ).toBe(false);
});

it("discards a newly created macro without removing another unsaved entry", async () => {
  const { result } = renderHook(() => useRuntimeMacro());
  await waitFor(() => expect(result.current.macros).toHaveLength(2));
  await act(async () => {
    await result.current.createMacro("New one");
  });
  await act(async () => {
    await result.current.createMacro("New two");
  });
  await act(async () => {
    expect(await result.current.discardMacro("New one")).toBe(true);
  });
  expect(result.current.macros.map((entry) => entry.name)).toContain("New two");
  expect(result.current.macros.map((entry) => entry.name)).not.toContain(
    "New one",
  );
});

it("restores only the selected combo and preserves unsaved siblings", async () => {
  const { result } = renderHook(() => useRuntimeCombo());
  await waitFor(() => expect(result.current.combos).toHaveLength(3));
  const [target, other] = result.current.combos;
  await act(async () => {
    await result.current.setComboName(target.index, "Changed");
  });
  await act(async () => {
    await result.current.setComboName(other.index, "Other dirty");
  });
  await act(async () => {
    await result.current.setCombo({
      ...target,
      index: 6,
      behavior: target.behavior!,
    });
    await result.current.setComboName(6, "New sibling");
  });
  await act(async () => {
    expect(await result.current.discardCombo(target.index)).toBe(true);
  });
  expect(
    result.current.combos.find((entry) => entry.index === target.index)?.name,
  ).toBe(target.name);
  expect(
    result.current.combos.find((entry) => entry.index === other.index)?.name,
  ).toBe("Other dirty");
  expect(result.current.combos.some((entry) => entry.index === 6)).toBe(true);
  expect(result.current.isComboUnsaved(target.index)).toBe(false);
  await act(async () => {
    expect(await result.current.discardCombo(6)).toBe(true);
  });
  expect(result.current.combos.some((entry) => entry.index === 6)).toBe(false);
  expect(mockCall.mock.calls.some(([, r]) => r.discard || r.save)).toBe(false);
});

it("restores one tapdance without reallocating another unsaved ID or losing its binding", async () => {
  const { result } = renderHook(() => useRuntimeTapDance());
  await waitFor(() => expect(result.current.entries).toHaveLength(1));
  const original = result.current.entries[0];
  await act(async () => {
    await result.current.save(
      7,
      Config.create({ singleBinding: { behaviorId: 10, param1: 0x70007 } }),
      false,
    );
  });
  let sibling: number | null = null;
  await act(async () => {
    sibling = await result.current.create("Unsaved sibling");
  });
  await act(async () => {
    await result.current.save(
      sibling!,
      Config.create({ singleBinding: { behaviorId: 10, param1: 0x70008 } }),
      false,
    );
  });
  await act(async () => {
    expect(await result.current.discardEntry(7)).toBe(true);
  });
  expect(
    result.current.entries.find((entry) => entry.index === 7)?.config,
  ).toEqual(original.config);
  expect(
    result.current.entries.find((entry) => entry.index === sibling)?.config
      ?.singleBinding?.param1,
  ).toBe(0x70008);
  expect(mockCall.mock.calls.some(([, r]) => r.discard || r.save)).toBe(false);
  await act(async () => {
    expect(await result.current.discardEntry(sibling!)).toBe(true);
  });
  expect(result.current.entries.map((entry) => entry.index)).toEqual([7]);
});

it("preserves unsaved global settings when the only dirty macro is discarded", async () => {
  const { result } = renderHook(() => useRuntimeMacro());
  await waitFor(() => expect(result.current.globalSettings).not.toBeNull());
  const target = result.current.macros[0];
  await act(async () => {
    await result.current.setTapMs(73);
  });
  await act(async () => {
    await result.current.setMacroStepCount(target.slot, 1);
    await result.current.setMacroStep(target.slot, 0, {
      delay: { delayMs: 37 },
    });
  });
  await act(async () => {
    expect(await result.current.discardMacro(target.name)).toBe(true);
  });
  expect(result.current.globalSettings?.tapMs).toBe(73);
  expect(result.current.hasUnsavedChanges).toBe(true);
  expect(
    mockCall.mock.calls.some(([, r]) => r.discardMacros || r.saveMacros),
  ).toBe(false);
});
