/**
 * useRuntimeCombo Hook
 *
 * Provides access to cormoran/zmk-feature-runtime-combo through the custom ZMK
 * Studio RPC subsystem.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useCustomSubsystem } from "./useCustomSubsystem";
import { studioLockErrorText } from "../lib/studioUnlock";
import {
  Request,
  Response,
  type Combo,
  type GlobalSettings,
  type BehaviorBinding,
  type StatusResponse,
  type SlowReleaseOverride,
} from "../proto/cormoran/runtime_combo/runtime_combo";

export type {
  Combo,
  GlobalSettings,
  BehaviorBinding,
  StatusResponse,
  SlowReleaseOverride,
};

export const RUNTIME_COMBO_IDENTIFIER = "cormoran__runtime_combo";

const CODEC = {
  encode: (request: Request) => Request.encode(request).finish(),
  decode: (payload: Uint8Array) => Response.decode(payload),
};

export interface ComboInput {
  index: number;
  keyPositions: number[];
  behavior: BehaviorBinding;
  layerMask: number;
  enabled: boolean;
  timeoutMs: number;
  requirePriorIdleMs: number;
  slowReleaseOverride: SlowReleaseOverride;
}

export interface UseRuntimeComboReturn {
  isAvailable: boolean;
  combos: Combo[];
  globalSettings: GlobalSettings | null;
  isLoading: boolean;
  error: string | null;
  hasPendingChanges: boolean;
  loadCombos: () => Promise<void>;
  loadGlobalSettings: () => Promise<void>;
  reload: () => Promise<void>;
  setCombo: (combo: ComboInput, persist?: boolean) => Promise<boolean>;
  setComboName: (
    index: number,
    name: string,
    persist?: boolean,
  ) => Promise<boolean>;
  deleteCombo: (index: number, persist?: boolean) => Promise<boolean>;
  resetCombo: (index: number) => Promise<boolean>;
  setTimeoutMs: (timeoutMs: number, persist?: boolean) => Promise<boolean>;
  setSlowRelease: (slowRelease: boolean, persist?: boolean) => Promise<boolean>;
  setRequirePriorIdleMs: (
    requirePriorIdleMs: number,
    persist?: boolean,
  ) => Promise<boolean>;
  saveChanges: () => Promise<StatusResponse | null>;
  discardChanges: () => Promise<StatusResponse | null>;
  clearError: () => void;
}

export function useRuntimeCombo({
  autoLoad = true,
}: { autoLoad?: boolean } = {}): UseRuntimeComboReturn {
  // `call` is unlock-gated by the shared useCustomSubsystem wrapper.
  const { subsystem, ready, call } = useCustomSubsystem(
    RUNTIME_COMBO_IDENTIFIER,
    CODEC,
  );
  const [combos, setCombos] = useState<Combo[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const callRuntimeComboRPC = useCallback(
    async (request: Request): Promise<Response | null> => {
      if (!ready) {
        setError("Not connected to device or subsystem not found");
        return null;
      }

      // The shared gate handles the locked case (unlock modal + retry). If the
      // user dismisses it (or a request lands during the cooldown), `call`
      // rejects: surface the clear "device is locked" message.
      let response;
      try {
        response = await call(request);
      } catch (err) {
        const locked = studioLockErrorText(err);
        if (locked !== null) {
          setError(locked);
          return null;
        }
        throw err;
      }
      if (!response) {
        return null;
      }

      if (response.error) {
        setError(response.error.message);
        return response;
      }

      setError(null);
      return response;
    },
    [ready, call],
  );

  // Guard against starting a load while one is still in flight. When locked,
  // these RPCs are parked by the unlock gate (pending until unlock/cancel);
  // without the guard a re-triggered auto-load would keep firing requests.
  const combosInFlightRef = useRef(false);
  const globalSettingsInFlightRef = useRef(false);

  const loadCombos = useCallback(async () => {
    if (!ready) {
      setCombos([]);
      return;
    }
    if (combosInFlightRef.current) return;
    combosInFlightRef.current = true;

    setIsLoading(true);
    setError(null);
    try {
      const response = await callRuntimeComboRPC(
        Request.create({ listCombos: {} }),
      );
      if (response?.listCombos) {
        setCombos(
          [...response.listCombos.combos].sort((a, b) => a.index - b.index),
        );
      }
    } catch (err) {
      console.error("Failed to load runtime combos:", err);
      setError(
        `Failed to load runtime combos: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    } finally {
      setIsLoading(false);
      combosInFlightRef.current = false;
    }
  }, [callRuntimeComboRPC, ready]);

  const loadGlobalSettings = useCallback(async () => {
    if (!ready) {
      setGlobalSettings(null);
      return;
    }
    if (globalSettingsInFlightRef.current) return;
    globalSettingsInFlightRef.current = true;

    setIsLoading(true);
    setError(null);
    try {
      const response = await callRuntimeComboRPC(
        Request.create({ getGlobalSettings: {} }),
      );
      if (response?.getGlobalSettings?.settings) {
        setGlobalSettings(response.getGlobalSettings.settings);
      }
    } catch (err) {
      console.error("Failed to load runtime combo settings:", err);
      setError(
        `Failed to load runtime combo settings: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    } finally {
      setIsLoading(false);
      globalSettingsInFlightRef.current = false;
    }
  }, [callRuntimeComboRPC, ready]);

  const reload = useCallback(async () => {
    await Promise.all([loadCombos(), loadGlobalSettings()]);
  }, [loadCombos, loadGlobalSettings]);

  const setCombo = useCallback(
    async (combo: ComboInput, persist = false): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await callRuntimeComboRPC(
          Request.create({
            setCombo: {
              ...combo,
              persist,
            },
          }),
        );
        if (response?.error) {
          return false;
        }
        if (response?.status) {
          // The device derives `source` server-side, so refresh from the
          // device instead of guessing the resulting Combo locally.
          await loadCombos();
          if (!persist) {
            setHasPendingChanges(true);
          }
          return true;
        }
      } catch (err) {
        console.error("Failed to set runtime combo:", err);
        setError(
          `Failed to set runtime combo: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setIsLoading(false);
      }
      return false;
    },
    [callRuntimeComboRPC, loadCombos],
  );

  const setComboName = useCallback(
    async (index: number, name: string, persist = false): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await callRuntimeComboRPC(
          Request.create({
            setComboName: {
              index,
              name,
              persist,
            },
          }),
        );
        if (response?.error) {
          return false;
        }
        if (response?.status) {
          setCombos((prev) =>
            prev.map((combo) =>
              combo.index === index ? { ...combo, name } : combo,
            ),
          );
          if (!persist) {
            setHasPendingChanges(true);
          }
          return true;
        }
      } catch (err) {
        console.error("Failed to set runtime combo name:", err);
        setError(
          `Failed to set runtime combo name: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setIsLoading(false);
      }
      return false;
    },
    [callRuntimeComboRPC],
  );

  const deleteCombo = useCallback(
    async (index: number, persist = false): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await callRuntimeComboRPC(
          Request.create({ deleteCombo: { index, persist } }),
        );
        if (response?.error) {
          return false;
        }
        if (response?.status) {
          setCombos((prev) => prev.filter((combo) => combo.index !== index));
          if (!persist) {
            setHasPendingChanges(true);
          }
          return true;
        }
      } catch (err) {
        console.error("Failed to delete runtime combo:", err);
        setError(
          `Failed to delete runtime combo: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setIsLoading(false);
      }
      return false;
    },
    [callRuntimeComboRPC],
  );

  const resetCombo = useCallback(
    async (index: number): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await callRuntimeComboRPC(
          Request.create({ resetCombo: { index } }),
        );
        if (response?.error) {
          return false;
        }
        if (response?.status) {
          // `source` is derived server-side, so refresh from the device
          // rather than guessing the reset combo's fields locally.
          await loadCombos();
          setHasPendingChanges(true);
          return true;
        }
      } catch (err) {
        console.error("Failed to reset runtime combo:", err);
        setError(
          `Failed to reset runtime combo: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setIsLoading(false);
      }
      return false;
    },
    [callRuntimeComboRPC, loadCombos],
  );

  const setTimeoutMs = useCallback(
    async (timeoutMs: number, persist = false): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await callRuntimeComboRPC(
          Request.create({ setTimeoutMs: { timeoutMs, persist } }),
        );
        if (response?.error) {
          return false;
        }
        if (response?.status) {
          setGlobalSettings((prev) =>
            prev
              ? { ...prev, timeoutMs }
              : {
                  timeoutMs,
                  slowRelease: false,
                  maxCombo: 0,
                  requirePriorIdleMs: 0,
                },
          );
          if (!persist) {
            setHasPendingChanges(true);
          }
          return true;
        }
      } catch (err) {
        console.error("Failed to set runtime combo timeout:", err);
        setError(
          `Failed to set runtime combo timeout: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setIsLoading(false);
      }
      return false;
    },
    [callRuntimeComboRPC],
  );

  const setSlowRelease = useCallback(
    async (slowRelease: boolean, persist = false): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await callRuntimeComboRPC(
          Request.create({ setSlowRelease: { slowRelease, persist } }),
        );
        if (response?.error) {
          return false;
        }
        if (response?.status) {
          setGlobalSettings((prev) =>
            prev
              ? { ...prev, slowRelease }
              : {
                  timeoutMs: 50,
                  slowRelease,
                  maxCombo: 0,
                  requirePriorIdleMs: 0,
                },
          );
          if (!persist) {
            setHasPendingChanges(true);
          }
          return true;
        }
      } catch (err) {
        console.error("Failed to set runtime combo slow release:", err);
        setError(
          `Failed to set runtime combo slow release: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setIsLoading(false);
      }
      return false;
    },
    [callRuntimeComboRPC],
  );

  const setRequirePriorIdleMs = useCallback(
    async (requirePriorIdleMs: number, persist = false): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await callRuntimeComboRPC(
          Request.create({
            setRequirePriorIdleMs: { requirePriorIdleMs, persist },
          }),
        );
        if (response?.error) {
          return false;
        }
        if (response?.status) {
          setGlobalSettings((prev) =>
            prev
              ? { ...prev, requirePriorIdleMs }
              : {
                  timeoutMs: 50,
                  slowRelease: false,
                  maxCombo: 0,
                  requirePriorIdleMs,
                },
          );
          if (!persist) {
            setHasPendingChanges(true);
          }
          return true;
        }
      } catch (err) {
        console.error("Failed to set runtime combo require-prior-idle:", err);
        setError(
          `Failed to set runtime combo require-prior-idle: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setIsLoading(false);
      }
      return false;
    },
    [callRuntimeComboRPC],
  );

  const saveChanges = useCallback(async (): Promise<StatusResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await callRuntimeComboRPC(Request.create({ save: {} }));
      if (response?.status) {
        setHasPendingChanges(false);
        await reload();
        return response.status;
      }
      return null;
    } catch (err) {
      console.error("Failed to save runtime combo changes:", err);
      setError(
        `Failed to save runtime combo changes: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [callRuntimeComboRPC, reload]);

  const discardChanges =
    useCallback(async (): Promise<StatusResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await callRuntimeComboRPC(
          Request.create({ discard: {} }),
        );
        if (response?.status) {
          setHasPendingChanges(false);
          await reload();
          return response.status;
        }
        return null;
      } catch (err) {
        console.error("Failed to discard runtime combo changes:", err);
        setError(
          `Failed to discard runtime combo changes: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [callRuntimeComboRPC, reload]);

  // Auto-load once per ready-transition. `reload` is in the dependency array
  // (its identity changes as the connection/gate updates), but `autoLoadedRef`
  // ensures we only *trigger* a reload the first time `ready` becomes true.
  // Without this guard, a load that fails fast while the keyboard is locked
  // (the gate rejects instead of parking) would let this effect re-run on every
  // `reload` identity change, hammering the device with repeated load attempts
  // while the unlock modal is open.
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (ready) {
      if (!autoLoad) return;
      if (autoLoadedRef.current) return;
      autoLoadedRef.current = true;
      void reload();
    } else {
      autoLoadedRef.current = false;
      setCombos([]);
      setGlobalSettings(null);
      setHasPendingChanges(false);
      setError(null);
    }
  }, [autoLoad, reload, ready]);

  return {
    isAvailable: subsystem !== null,
    combos,
    globalSettings,
    isLoading,
    error,
    hasPendingChanges,
    loadCombos,
    loadGlobalSettings,
    reload,
    setCombo,
    setComboName,
    deleteCombo,
    resetCombo,
    setTimeoutMs,
    setSlowRelease,
    setRequirePriorIdleMs,
    saveChanges,
    discardChanges,
    clearError: () => setError(null),
  };
}
