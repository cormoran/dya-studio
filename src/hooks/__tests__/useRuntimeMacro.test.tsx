import { act, renderHook, waitFor } from "@testing-library/react";
import { useRuntimeMacro } from "../useRuntimeMacro";

// Mock the custom-subsystem transport so we can observe the RPCs the hook
// issues (and whether it issues any on mount).
const mockCall = jest.fn();
const mockUseCustomSubsystem = jest.fn();
jest.mock("../useCustomSubsystem", () => ({
  useCustomSubsystem: (...args: unknown[]) => mockUseCustomSubsystem(...args),
}));

function primeSubsystem() {
  mockCall.mockImplementation(async (req: Record<string, unknown>) => {
    if (req.listMacros) {
      return {
        listMacros: { macros: [], maxMacroBytes: 64, maxNameLength: 64 },
      };
    }
    if (req.getMacroGlobalSettings) {
      return { getMacroGlobalSettings: { settings: { tapMs: 0 } } };
    }
    return {};
  });
  mockUseCustomSubsystem.mockReturnValue({
    subsystem: { index: 0, identifier: "cormoran__runtime_macro" },
    ready: true,
    call: mockCall,
  });
}

function listMacrosCalls() {
  return mockCall.mock.calls.filter(([req]) => req?.listMacros);
}

beforeEach(() => {
  jest.clearAllMocks();
  primeSubsystem();
});

describe("useRuntimeMacro autoLoad", () => {
  it("exposes the reassigned slot before rename finishes and React rerenders", async () => {
    let summary = { slot: 3, name: "Draft", hasUnsavedChanges: true };
    mockCall.mockImplementation(async (req: Record<string, unknown>) => {
      if (req.renameMacro) {
        summary = { ...summary, slot: 9, name: "Renamed" };
        return { status: { affectedCount: 1 } };
      }
      if (req.listMacros) return { listMacros: { macros: [summary] } };
      if (req.getMacroGlobalSettings)
        return { getMacroGlobalSettings: { settings: { tapMs: 30 } } };
      return {};
    });
    const { result } = renderHook(() => useRuntimeMacro({ autoLoad: false }));
    await act(async () => {
      await result.current.loadMacros();
    });
    const getSlot = result.current.getMacroSlot;
    expect(getSlot("Draft")).toBe(3);
    await act(async () => {
      expect(await result.current.renameMacro("Draft", "Renamed")).toBe(true);
      expect(getSlot("Renamed")).toBe(9);
      expect(getSlot("Draft")).toBeNull();
    });
  });

  it("loads the macro list on mount by default", async () => {
    const { result } = renderHook(() => useRuntimeMacro());
    await waitFor(() =>
      expect(result.current.globalSettings).toEqual({ tapMs: 0 }),
    );
    expect(listMacrosCalls()).toHaveLength(1);
  });

  it("does NOT load on mount when autoLoad is false", async () => {
    const { result } = renderHook(() => useRuntimeMacro({ autoLoad: false }));

    expect(listMacrosCalls().length).toBe(0);

    // The caller can still drive the load explicitly.
    await act(async () => {
      await result.current.loadMacros();
    });
    expect(listMacrosCalls().length).toBe(1);
  });
});

it("creates a macro with steps in RAM without issuing SaveMacros", async () => {
  mockCall.mockImplementation(async (req: Record<string, unknown>) => {
    if (req.listMacros)
      return {
        listMacros: {
          macros: [{ slot: 4, name: "Draft" }],
          maxMacroBytes: 64,
          maxNameLength: 64,
        },
      };
    if (req.getMacroGlobalSettings)
      return { getMacroGlobalSettings: { settings: { tapMs: 0 } } };
    return { status: { affectedCount: 1 } };
  });
  const { result } = renderHook(() => useRuntimeMacro({ autoLoad: false }));
  await act(async () => {
    expect(
      await result.current.createMacro("Draft", [{ delay: { delayMs: 25 } }]),
    ).toBe(true);
  });
  const requests = mockCall.mock.calls.map(([request]) => request);
  expect(requests.find((request) => request.createMacro)?.createMacro).toEqual({
    name: "Draft",
    persist: false,
  });
  expect(
    requests.find((request) => request.setMacroStepCount)?.setMacroStepCount,
  ).toEqual({ slot: 4, stepCount: 1, persist: false });
  expect(
    requests.find((request) => request.setMacroStep)?.setMacroStep,
  ).toEqual({
    slot: 4,
    stepIndex: 0,
    step: { delay: { delayMs: 25 } },
    persist: false,
  });
  expect(requests.some((request) => request.saveMacros)).toBe(false);
});

it("refreshes RAM previews without treating dirty details as a saved discard baseline", async () => {
  let steps = [{ delay: { delayMs: 42 } }];
  let exists = true;
  mockCall.mockImplementation(async (request) => {
    if (request.listMacros)
      return {
        listMacros: {
          macros: exists
            ? [{ slot: 2, name: "Draft", hasUnsavedChanges: true }]
            : [],
        },
      };
    if (request.getMacro)
      return {
        getMacro: { macro: { slot: 2, name: "Draft", steps, encodedSize: 3 } },
      };
    if (request.getMacroGlobalSettings)
      return { getMacroGlobalSettings: { settings: { tapMs: 30 } } };
    return {};
  });
  const { result } = renderHook(() => useRuntimeMacro({ autoLoad: false }));
  await act(async () => {
    await result.current.loadMacros();
  });
  expect(result.current.macroDetails.get(2)?.steps).toEqual(steps);
  await act(async () => {
    expect(await result.current.discardMacro("Draft")).toBe(false);
  });
  expect(
    mockCall.mock.calls.some(
      ([request]) =>
        request.deleteMacro || request.saveMacros || request.discardMacros,
    ),
  ).toBe(false);
  steps = [{ delay: { delayMs: 99 } }];
  await act(async () => {
    await result.current.loadMacros();
  });
  expect(result.current.macroDetails.get(2)?.steps).toEqual(steps);
  exists = false;
  await act(async () => {
    await result.current.loadMacros();
  });
  expect(result.current.macroDetails.size).toBe(0);
});
