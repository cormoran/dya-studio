import { useState, useEffect, useCallback, useRef } from "react";
import { useCustomSubsystem } from "./useCustomSubsystem";
import { studioLockErrorText } from "../lib/studioUnlock";
import {
  Request,
  Response,
  type MacroDetail,
  type MacroGlobalSettings,
  type MacroStep,
  type MacroSummary,
  type StatusResponse,
} from "../proto/cormoran/runtime_macro/runtime_macro";

export type { MacroDetail, MacroGlobalSettings, MacroStep, MacroSummary };

export const RUNTIME_MACRO_SUBSYSTEM_IDENTIFIER = "cormoran__runtime_macro";

const CODEC = {
  encode: (request: Request) => Request.encode(request).finish(),
  decode: (payload: Uint8Array) => Response.decode(payload),
};

export interface UseRuntimeMacroReturn {
  isAvailable: boolean;
  macros: MacroSummary[];
  globalSettings: MacroGlobalSettings | null;
  maxMacroBytes: number;
  maxNameLength: number;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  loadMacros: () => Promise<void>;
  getMacro: (slot: number) => Promise<MacroDetail | null>;
  createMacro: (name: string, steps?: MacroStep[]) => Promise<boolean>;
  deleteMacro: (name: string) => Promise<boolean>;
  renameMacro: (oldName: string, newName: string) => Promise<boolean>;
  resetMacro: (slot: number, persist?: boolean) => Promise<boolean>;
  /** Device truth: whether the slot has in-memory-only (unsaved) changes. */
  isSlotUnsaved: (slot: number) => boolean;
  setMacroStepCount: (
    slot: number,
    stepCount: number,
    persist?: boolean,
  ) => Promise<boolean>;
  setMacroStep: (
    slot: number,
    stepIndex: number,
    step: MacroStep,
    persist?: boolean,
  ) => Promise<boolean>;
  appendMacroStep: (
    slot: number,
    step: MacroStep,
    persist?: boolean,
  ) => Promise<boolean>;
  setTapMs: (tapMs: number, persist?: boolean) => Promise<boolean>;
  saveMacros: () => Promise<boolean>;
  discardMacros: () => Promise<boolean>;
}

export interface UseRuntimeMacroOptions {
  /** Whether to load the macro list automatically on mount / when the
   * subsystem becomes available. Defaults to `true`. Pass `false` when the
   * caller wants to control load timing itself -- e.g. the Keymap tab defers
   * `loadMacros()` until the keymap preview has finished loading so the macro
   * RPCs don't compete with (and slow down) the preview. State is still
   * cleared when the subsystem is absent regardless of this flag. */
  autoLoad?: boolean;
}

export function useRuntimeMacro(
  options: UseRuntimeMacroOptions = {},
): UseRuntimeMacroReturn {
  const autoLoad = options.autoLoad ?? true;
  const { subsystem, ready, call } = useCustomSubsystem(
    RUNTIME_MACRO_SUBSYSTEM_IDENTIFIER,
    CODEC,
  );
  const [macros, setMacros] = useState<MacroSummary[]>([]);
  const [globalSettings, setGlobalSettings] =
    useState<MacroGlobalSettings | null>(null);
  const [maxMacroBytes, setMaxMacroBytes] = useState(64);
  const [maxNameLength, setMaxNameLength] = useState(64);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subsystemIndex = subsystem?.index;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const callRpc = useCallback(
    async (request: Request): Promise<Response | null> => {
      if (!ready) {
        setError("Not connected to device or subsystem not found");
        return null;
      }

      let response;
      try {
        response = await call(request);
      } catch (err) {
        // Blocked by the unlock gate (modal dismissed / cooldown): show the
        // shared "device is locked" message instead of a macro-specific error.
        const locked = studioLockErrorText(err);
        if (locked !== null) {
          setError(locked);
          return null;
        }
        throw err;
      }

      if (!response) {
        setError("Runtime macro RPC returned an empty response");
        return null;
      }

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      setError(null);
      return response;
    },
    [ready, call],
  );

  const runMutation = useCallback(
    async (
      request: Request,
      persist: boolean,
    ): Promise<StatusResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await callRpc(request);
        if (!response?.status) {
          return null;
        }
        if (!persist) {
          setHasUnsavedChanges(true);
        }
        return response.status;
      } catch (err) {
        console.error("Runtime macro mutation failed:", err);
        setError(
          `Runtime macro mutation failed: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [callRpc],
  );

  const loadInFlightRef = useRef(false);
  const loadMacros = useCallback(async () => {
    if (!ready) {
      setMacros([]);
      setGlobalSettings(null);
      return;
    }
    // Don't start another load while one is still in flight. When locked, the
    // list RPCs are parked by the unlock gate (pending until unlock/cancel);
    // without this guard a re-triggered auto-load would keep firing requests.
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const listResponse = await callRpc(Request.create({ listMacros: {} }));
      if (listResponse?.listMacros) {
        setMacros(listResponse.listMacros.macros);
        setMaxMacroBytes(listResponse.listMacros.maxMacroBytes || 64);
        setMaxNameLength(listResponse.listMacros.maxNameLength || 64);
      }

      const settingsResponse = await callRpc(
        Request.create({ getMacroGlobalSettings: {} }),
      );
      if (settingsResponse?.getMacroGlobalSettings?.settings) {
        setGlobalSettings(settingsResponse.getMacroGlobalSettings.settings);
      }
    } catch (err) {
      console.error("Failed to load runtime macros:", err);
      setError(
        `Failed to load runtime macros: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    } finally {
      setIsLoading(false);
      loadInFlightRef.current = false;
    }
  }, [callRpc, ready]);

  const getMacroInFlightRef = useRef(false);
  const getMacro = useCallback(
    async (slot: number): Promise<MacroDetail | null> => {
      // As with loadMacros: don't stack another request while one is still in
      // flight. When locked this RPC is parked by the unlock gate, so an
      // auto-select re-fire must not keep issuing getMacro requests.
      if (getMacroInFlightRef.current) return null;
      getMacroInFlightRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const response = await callRpc(Request.create({ getMacro: { slot } }));
        return response?.getMacro?.macro ?? null;
      } catch (err) {
        console.error("Failed to get runtime macro:", err);
        setError(
          `Failed to get runtime macro: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
        return null;
      } finally {
        setIsLoading(false);
        getMacroInFlightRef.current = false;
      }
    },
    [callRpc],
  );

  const setMacroStepCount = useCallback(
    async (
      slot: number,
      stepCount: number,
      persist = false,
    ): Promise<boolean> => {
      const status = await runMutation(
        Request.create({ setMacroStepCount: { slot, stepCount, persist } }),
        persist,
      );
      return status !== null;
    },
    [runMutation],
  );

  const setMacroStep = useCallback(
    async (
      slot: number,
      stepIndex: number,
      step: MacroStep,
      persist = false,
    ): Promise<boolean> => {
      const status = await runMutation(
        Request.create({
          setMacroStep: { slot, stepIndex, step, persist },
        }),
        persist,
      );
      return status !== null;
    },
    [runMutation],
  );

  const appendMacroStep = useCallback(
    async (
      slot: number,
      step: MacroStep,
      persist = false,
    ): Promise<boolean> => {
      const status = await runMutation(
        Request.create({ appendMacroStep: { slot, step, persist } }),
        persist,
      );
      return status !== null;
    },
    [runMutation],
  );

  const setTapMs = useCallback(
    async (tapMs: number, persist = false): Promise<boolean> => {
      const status = await runMutation(
        Request.create({ setTapMs: { tapMs, persist } }),
        persist,
      );
      if (status) {
        setGlobalSettings((prev) => ({
          tapMs,
          maxEntries: prev?.maxEntries ?? 0,
          keyPressBehaviorId: prev?.keyPressBehaviorId ?? 0,
          poolBytesTotal: prev?.poolBytesTotal ?? 0,
          poolBytesUsed: prev?.poolBytesUsed ?? 0,
        }));
      }
      return status !== null;
    },
    [runMutation],
  );

  const createMacro = useCallback(
    async (name: string, steps: MacroStep[] = []): Promise<boolean> => {
      const status = await runMutation(
        Request.create({ createMacro: { name, persist: false } }),
        false,
      );
      if (status !== null) {
        if (steps.length > 0) {
          const failAfterCreate = async () => {
            await loadMacros();
            setError(
              "Macro created in memory, but its steps could not be applied. Open the created macro to finish editing.",
            );
            return false;
          };
          const list = await callRpc(Request.create({ listMacros: {} }));
          const slot = list?.listMacros?.macros.find(
            (macro) => macro.name === name,
          )?.slot;
          if (slot === undefined) {
            return failAfterCreate();
          }
          const countUpdated = await setMacroStepCount(slot, steps.length);
          if (!countUpdated) {
            return failAfterCreate();
          }
          for (const [index, step] of steps.entries()) {
            if (!(await setMacroStep(slot, index, step))) {
              return failAfterCreate();
            }
          }
        }
        await loadMacros();
        return true;
      }
      return false;
    },
    [callRpc, loadMacros, runMutation, setMacroStep, setMacroStepCount],
  );

  const deleteMacro = useCallback(
    async (name: string): Promise<boolean> => {
      const status = await runMutation(
        Request.create({ deleteMacro: { name } }),
        false,
      );
      if (status !== null) {
        await loadMacros();
        return true;
      }
      return false;
    },
    [runMutation, loadMacros],
  );

  const renameMacro = useCallback(
    async (oldName: string, newName: string): Promise<boolean> => {
      const status = await runMutation(
        Request.create({ renameMacro: { oldName, newName, persist: false } }),
        false,
      );
      if (status !== null) {
        await loadMacros();
        return true;
      }
      return false;
    },
    [runMutation, loadMacros],
  );

  const resetMacro = useCallback(
    async (slot: number, persist = false): Promise<boolean> => {
      const status = await runMutation(
        Request.create({ resetMacro: { slot, persist } }),
        persist,
      );
      if (status !== null) {
        await loadMacros();
        return true;
      }
      return false;
    },
    [runMutation, loadMacros],
  );

  const isSlotUnsaved = useCallback(
    (slot: number): boolean =>
      macros.find((macro) => macro.slot === slot)?.hasUnsavedChanges ?? false,
    [macros],
  );

  const saveMacros = useCallback(async (): Promise<boolean> => {
    const status = await runMutation(Request.create({ saveMacros: {} }), true);
    if (status) {
      setHasUnsavedChanges(false);
      await loadMacros();
    }
    return status !== null;
  }, [loadMacros, runMutation]);

  const discardMacros = useCallback(async (): Promise<boolean> => {
    const status = await runMutation(
      Request.create({ discardMacros: {} }),
      true,
    );
    if (status) {
      setHasUnsavedChanges(false);
      await loadMacros();
    }
    return status !== null;
  }, [loadMacros, runMutation]);

  // Auto-load exactly once per connected subsystem. `loadMacros` is in the
  // dependency array (its identity can change as the connection/gate updates),
  // but `autoLoadedForRef` ensures we only *trigger* a load the first time we
  // see a given subsystem. Without this guard, when a load fails fast while the
  // keyboard is locked (the gate rejects instead of parking), the effect would
  // re-run on every `loadMacros` identity change and hammer the device with
  // repeated load attempts while the unlock modal is open.
  const autoLoadedForRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (subsystemIndex === undefined) {
      autoLoadedForRef.current = undefined;
      setMacros([]);
      setGlobalSettings(null);
      setHasUnsavedChanges(false);
      return;
    }
    // Skip the automatic load when the caller drives load timing itself
    // (autoLoad: false) -- the clear-on-absent above still runs.
    if (!autoLoad) return;
    if (autoLoadedForRef.current === subsystemIndex) return;
    autoLoadedForRef.current = subsystemIndex;
    void loadMacros();
  }, [autoLoad, loadMacros, subsystemIndex]);

  return {
    isAvailable: subsystem !== null,
    macros,
    globalSettings,
    maxMacroBytes,
    maxNameLength,
    hasUnsavedChanges,
    isLoading,
    error,
    clearError,
    loadMacros,
    getMacro,
    createMacro,
    deleteMacro,
    renameMacro,
    resetMacro,
    isSlotUnsaved,
    setMacroStepCount,
    setMacroStep,
    appendMacroStep,
    setTapMs,
    saveMacros,
    discardMacros,
  };
}
