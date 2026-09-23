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
