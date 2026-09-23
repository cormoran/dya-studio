import { act, renderHook, waitFor } from "@testing-library/react";
import { MEMORY_WRITE_DEBOUNCE_MS } from "../../../hooks/useDebouncedMemoryWrite";
import { useMacroEditor } from "../useMacroEditor";
import type { UseRuntimeMacroReturn } from "../../../hooks/useRuntimeMacro";
import type { UseKeymapReturn } from "../../../hooks/useKeymap";

// Minimal keymap stub: only `behaviors` (a Map) is read while nothing is loaded.
const keymap = { behaviors: new Map() } as unknown as UseKeymapReturn;

/**
 * A fresh runtime-macro object every render (mirroring the real hook, whose
 * return object has a new identity each render) that nonetheless shares one
 * stable `getMacro` callback (its RPC chain is memoized in the real hook).
 */
function makeRuntimeMacro(
  getMacro: UseRuntimeMacroReturn["getMacro"],
): UseRuntimeMacroReturn {
  return {
    macros: [],
    globalSettings: null,
    maxMacroBytes: 64,
    maxNameLength: 64,
    isAvailable: true,
    isLoading: false,
    getMacro,
    isSlotUnsaved: () => false,
    clearError: () => {},
    loadMacros: jest.fn(),
  } as unknown as UseRuntimeMacroReturn;
}

function renderEditor(getMacro: UseRuntimeMacroReturn["getMacro"]) {
  return renderHook(
    ({ runtimeMacro }: { runtimeMacro: UseRuntimeMacroReturn }) =>
      useMacroEditor({
        runtimeMacro,
        keymap,
        layers: [],
        keyboardLayout: "ansi" as never,
        requireUnlocked: () => true,
        t: (key: string) => key,
        canMaintainSelection: true,
        onAutoSelected: () => {},
      }),
    { initialProps: { runtimeMacro: makeRuntimeMacro(getMacro) } },
  );
}

describe("useMacroEditor", () => {
  it("keeps the Macro & Combo page's immediate-create action", async () => {
    const createMacro = jest.fn().mockResolvedValue(true);
    const runtimeMacro = { ...makeRuntimeMacro(jest.fn()), createMacro };
    const { result } = renderHook(() =>
      useMacroEditor({
        runtimeMacro,
        keymap,
        layers: [],
        keyboardLayout: "ansi" as never,
        requireUnlocked: () => true,
        t: (key: string) => key,
        canMaintainSelection: false,
        onAutoSelected: () => {},
      }),
    );
    await act(async () => {
      expect(await result.current.handleCreateMacro()).toBe(true);
    });
    expect(createMacro).toHaveBeenCalledWith("Macro 1");
  });

  it("keeps creation edits local until Create and sends the draft to RAM", async () => {
    const getMacro = jest.fn().mockResolvedValue(null);
    const createMacro = jest.fn().mockResolvedValue(true);
    const setMacroStepCount = jest.fn();
    const runtimeMacro = {
      ...makeRuntimeMacro(getMacro),
      macros: [{ slot: 2, name: "Existing" }],
      createMacro,
      setMacroStepCount,
    };
    const { result } = renderHook(() =>
      useMacroEditor({
        runtimeMacro,
        keymap,
        layers: [],
        keyboardLayout: "ansi" as never,
        requireUnlocked: () => true,
        t: (key: string) => key,
        canMaintainSelection: false,
        onAutoSelected: () => {},
      }),
    );

    act(() => result.current.beginCreate());
    expect(result.current.loadedMacro?.name).toBe("Macro 2");
    act(() => result.current.handleRenameChange("New draft"));
    await act(async () => {
      await result.current.handleAddStep();
    });
    expect(result.current.loadedMacro?.steps).toHaveLength(1);
    expect(getMacro).not.toHaveBeenCalled();
    expect(createMacro).not.toHaveBeenCalled();
    expect(setMacroStepCount).not.toHaveBeenCalled();

    await act(async () => {
      expect(await result.current.handleCreateMacro()).toBe(true);
    });
    expect(createMacro).toHaveBeenCalledWith("New draft", [
      { delay: { delayMs: 0 } },
    ]);

    act(() => result.current.beginCreate());
    act(() => result.current.cancelCreate());
    expect(result.current.loadedMacro).toBeNull();
    expect(createMacro).toHaveBeenCalledTimes(1);
  });

  it("retains the new-macro form when the device has no macros", async () => {
    const runtimeMacro = makeRuntimeMacro(jest.fn().mockResolvedValue(null));
    const { result } = renderHook(() =>
      useMacroEditor({
        runtimeMacro,
        keymap,
        layers: [],
        keyboardLayout: "ansi" as never,
        requireUnlocked: () => true,
        t: (key: string) => key,
        canMaintainSelection: false,
        onAutoSelected: () => {},
      }),
    );
    act(() => result.current.beginCreate());
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    expect(result.current.loadedMacro?.name).toBe("Macro 1");
  });

  it("keeps selectMacro stable when runtimeMacro's identity churns but getMacro does not", () => {
    // Regression: loadMacro used to depend on the whole `runtimeMacro` object,
    // which is a new reference every render. That gave the auto-select effect a
    // new `loadMacro` each render, so while locked it re-issued `getMacro` on
    // every re-render -- an infinite macro-load loop with the unlock modal open.
    // loadMacro (and thus selectMacro) must stay stable as long as getMacro is.
    const getMacro = jest
      .fn<ReturnType<UseRuntimeMacroReturn["getMacro"]>, [number]>()
      .mockResolvedValue(null);

    const { result, rerender } = renderEditor(getMacro);
    const firstSelectMacro = result.current.selectMacro;
    const firstReload = result.current.reloadLoadedMacro;

    // Re-render with a brand-new runtimeMacro object (same getMacro), as the
    // real page does on every render.
    rerender({ runtimeMacro: makeRuntimeMacro(getMacro) });
    rerender({ runtimeMacro: makeRuntimeMacro(getMacro) });

    expect(result.current.selectMacro).toBe(firstSelectMacro);
    expect(result.current.reloadLoadedMacro).toBe(firstReload);
  });

  it("does not load or modify an existing macro in creation mode", async () => {
    jest.useFakeTimers();
    try {
      const getMacro = jest
        .fn<ReturnType<UseRuntimeMacroReturn["getMacro"]>, [number]>()
        .mockResolvedValue(null);
      const runtimeMacro = {
        ...makeRuntimeMacro(getMacro),
        macros: [{ slot: 3, name: "Existing" }],
      };
      renderHook(() =>
        useMacroEditor({
          runtimeMacro,
          keymap,
          layers: [],
          keyboardLayout: "ansi" as never,
          requireUnlocked: () => true,
          t: (key: string) => key,
          canMaintainSelection: false,
          onAutoSelected: () => {},
        }),
      );

      await act(async () => {
        jest.runOnlyPendingTimers();
        await Promise.resolve();
      });

      expect(getMacro).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("writes a renamed macro to memory after the debounce interval", async () => {
    jest.useFakeTimers();
    try {
      const getMacro = jest
        .fn<ReturnType<UseRuntimeMacroReturn["getMacro"]>, [number]>()
        .mockResolvedValue({
          slot: 3,
          name: "Draft",
          steps: [],
          encodedSize: 0,
        });
      const renameMacro = jest.fn().mockResolvedValue(true);
      const runtimeMacro = {
        ...makeRuntimeMacro(getMacro),
        macros: [{ slot: 3, name: "Draft" }],
        renameMacro,
      };
      const { result } = renderHook(() =>
        useMacroEditor({
          runtimeMacro,
          keymap,
          layers: [],
          keyboardLayout: "ansi" as never,
          requireUnlocked: () => true,
          t: (key: string) => key,
          canMaintainSelection: false,
          onAutoSelected: () => {},
        }),
      );

      act(() => result.current.selectMacro({ slot: 3, name: "Draft" }));
      await waitFor(() => expect(result.current.loadedMacro).not.toBeNull());

      act(() => result.current.handleRenameChange("Renamed"));
      expect(result.current.isMemoryWritePending).toBe(true);
      expect(renameMacro).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(MEMORY_WRITE_DEBOUNCE_MS);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(renameMacro).toHaveBeenCalledWith("Draft", "Renamed");
      });
      expect(result.current.isMemoryWritePending).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});
