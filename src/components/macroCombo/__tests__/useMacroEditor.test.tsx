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

  it("does not start a duplicate detail read when selection triggers auto-selection", async () => {
    jest.useFakeTimers();
    try {
      let finishRead!: (value: {
        slot: number;
        name: string;
        steps: [];
        encodedSize: number;
      }) => void;
      const getMacro = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            finishRead = resolve;
          }),
      );
      const runtimeMacro = {
        ...makeRuntimeMacro(getMacro),
        macros: [{ slot: 3, name: "Draft" }],
      };
      const { result } = renderHook(() =>
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
      );

      act(() => result.current.selectMacro(runtimeMacro.macros[0]));
      await act(async () => {
        jest.runOnlyPendingTimers();
      });
      expect(getMacro).toHaveBeenCalledTimes(1);
      await act(async () => {
        finishRead({ slot: 3, name: "Draft", steps: [], encodedSize: 0 });
      });
      expect(result.current.loadedMacro?.name).toBe("Draft");
    } finally {
      jest.useRealTimers();
    }
  });

  it("can delete a selected list entry when its detail read fails", async () => {
    const deleteMacro = jest.fn().mockResolvedValue(true);
    const runtimeMacro = {
      ...makeRuntimeMacro(jest.fn().mockResolvedValue(null)),
      macros: [{ slot: 3, name: "Draft" }],
      deleteMacro,
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

    act(() => result.current.selectMacro(runtimeMacro.macros[0]));
    await act(async () => {
      await result.current.handleDeleteMacro();
    });
    expect(deleteMacro).toHaveBeenCalledWith("Draft");
    expect(result.current.selectedName).toBeNull();
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

  it("flushes a pending step edit before appending or removing steps", async () => {
    const initial = {
      slot: 3,
      name: "Draft",
      steps: [{ delay: { delayMs: 10 } }, { delay: { delayMs: 30 } }],
      encodedSize: 4,
    };
    const getMacro = jest.fn().mockResolvedValue(initial);
    const setMacroStepCount = jest.fn().mockResolvedValue(true);
    const setMacroStep = jest.fn().mockResolvedValue(true);
    const appendMacroStep = jest.fn().mockResolvedValue(true);
    const runtimeMacro = {
      ...makeRuntimeMacro(getMacro),
      macros: [{ slot: 3, name: "Draft" }],
      setMacroStepCount,
      setMacroStep,
      appendMacroStep,
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

    act(() => {
      result.current.handleDelayChange(0, 20);
      result.current.delayDebounce.queue(0);
    });
    await act(async () => result.current.handleAddStep());
    expect(setMacroStep).toHaveBeenCalledWith(3, 0, {
      delay: { delayMs: 20 },
    });
    expect(setMacroStep.mock.invocationCallOrder[0]).toBeLessThan(
      appendMacroStep.mock.invocationCallOrder[0],
    );
    expect(result.current.loadedMacro?.steps).toHaveLength(3);

    act(() => {
      result.current.handleDelayChange(0, 25);
      result.current.delayDebounce.queue(0);
    });
    await act(async () => result.current.handleRemoveStep(2, 1));
    expect(setMacroStep.mock.calls).toContainEqual([
      3,
      0,
      { delay: { delayMs: 25 } },
    ]);
    expect(result.current.loadedMacro?.steps).toEqual([
      { delay: { delayMs: 25 } },
      { delay: { delayMs: 30 } },
    ]);
    expect(setMacroStepCount).toHaveBeenLastCalledWith(3, 2);
  });

  it("waits for an in-flight step write before appending", async () => {
    let finishCount!: (value: boolean) => void;
    const setMacroStepCount = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finishCount = resolve;
        }),
    );
    const appendMacroStep = jest.fn().mockResolvedValue(true);
    const runtimeMacro = {
      ...makeRuntimeMacro(
        jest.fn().mockResolvedValue({
          slot: 3,
          name: "Draft",
          steps: [{ delay: { delayMs: 10 } }],
          encodedSize: 2,
        }),
      ),
      macros: [{ slot: 3, name: "Draft" }],
      setMacroStepCount,
      setMacroStep: jest.fn().mockResolvedValue(true),
      appendMacroStep,
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
    act(() => {
      result.current.handleDelayChange(0, 20);
      result.current.delayDebounce.queue(0);
    });
    let pendingWrite!: Promise<void>;
    act(() => {
      pendingWrite = result.current.delayDebounce.flush();
    });
    await waitFor(() => expect(setMacroStepCount).toHaveBeenCalledTimes(1));
    let append!: Promise<void>;
    act(() => {
      append = result.current.handleAddStep();
    });
    expect(appendMacroStep).not.toHaveBeenCalled();
    await act(async () => {
      finishCount(true);
      await Promise.all([pendingWrite, append]);
    });
    expect(appendMacroStep).toHaveBeenCalledTimes(1);
    expect(result.current.loadedMacro?.steps).toEqual([
      { delay: { delayMs: 20 } },
      { delay: { delayMs: 0 } },
    ]);
  });
});
