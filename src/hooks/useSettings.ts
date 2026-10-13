import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
  useContext,
} from "react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { useCustomSubsystem } from "./useCustomSubsystem";
import { Request, Response, Notification } from "../proto/zmk/settings/core";

import { studioLockErrorText } from "../lib/studioUnlock";

// Subsystem identifier for ZMK settings RPC
export const SETTINGS_SUBSYSTEM_IDENTIFIER = "zmk__settings";
const SUBSYSTEM_IDENTIFIER = SETTINGS_SUBSYSTEM_IDENTIFIER;

const CODEC = {
  encode: (request: Request) => Request.encode(request).finish(),
  decode: (payload: Uint8Array) => Response.decode(payload),
};

// Time to wait for all notifications to arrive after requesting settings
const NOTIFICATION_COLLECTION_TIMEOUT_MS = 500;

export interface DeviceActivitySettings {
  sourceId: number;
  deviceName: string;
  idleMs: number;
  sleepMs: number;
}

export interface UseSettingsReturn {
  /** Changes when the connection, readiness or subsystem index changes. */
  sessionKey: object;
  isAvailable: boolean;
  devices: DeviceActivitySettings[];
  isLoading: boolean;
  error: string | null;
  loadAllSettings: () => Promise<DeviceActivitySettings[]>;
  setActivitySettings: (idleMs: number, sleepMs: number) => Promise<boolean>;
  resetToDefaults: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const zmkApp = useContext(ZMKAppContext);
  const {
    subsystem,
    ready,
    call: gatedCall,
  } = useCustomSubsystem(SUBSYSTEM_IDENTIFIER, CODEC);
  const connection = zmkApp?.state.connection;
  const subsystemIndex = subsystem?.index;
  const onNotification = zmkApp?.onNotification;
  const sessionKey = useMemo(
    () => ({ connection, ready, subsystemIndex }),
    [connection, ready, subsystemIndex],
  );
  const activeSession = useRef<object | null>(null);
  const readRef = useRef<{ cancel: () => void } | null>(null);
  const [state, setState] = useState<{
    sessionKey: object;
    devices: DeviceActivitySettings[];
    isLoading: boolean;
    error: string | null;
  }>({ sessionKey, devices: [], isLoading: false, error: null });

  // Invalidate before passive effects or any old async completion can run.
  useLayoutEffect(() => {
    activeSession.current = sessionKey;
    return () => {
      activeSession.current = null;
      readRef.current?.cancel();
      readRef.current = null;
    };
  }, [sessionKey]);

  const isCurrent = useCallback(
    () => activeSession.current === sessionKey,
    [sessionKey],
  );
  const update = useCallback(
    (patch: Partial<Omit<typeof state, "sessionKey">>) => {
      if (!isCurrent()) return;
      setState((previous) => ({
        ...(previous.sessionKey === sessionKey
          ? previous
          : { devices: [], isLoading: false, error: null }),
        sessionKey,
        ...patch,
      }));
    },
    [sessionKey, isCurrent],
  );

  const loadAllSettings = useCallback(async (): Promise<
    DeviceActivitySettings[]
  > => {
    if (!isCurrent()) return [];
    if (
      !ready ||
      !connection ||
      !onNotification ||
      subsystemIndex === undefined
    ) {
      return [];
    }

    readRef.current?.cancel();
    const deviceMap = new Map<number, DeviceActivitySettings>();
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let finishCollection: (() => void) | undefined;
    const read = {
      cancel: () => {
        cancelled = true;
        unsubscribe?.();
        unsubscribe = undefined;
        if (timer !== undefined) clearTimeout(timer);
        finishCollection?.();
      },
    };
    readRef.current = read;
    const currentRead = () =>
      !cancelled && isCurrent() && readRef.current === read;
    update({ isLoading: true, error: null });

    try {
      unsubscribe = onNotification({
        type: "custom",
        subsystemIndex,
        callback: (customNotification) => {
          if (!currentRead()) return;
          try {
            const settings = Notification.decode(customNotification.payload)
              .activitySettings?.settings;
            if (!settings) return;
            const sourceId = settings.source;
            deviceMap.set(sourceId, {
              sourceId,
              deviceName: sourceId === 0 ? "Central" : `Peripheral ${sourceId}`,
              idleMs: settings.idleMs,
              sleepMs: settings.sleepMs,
            });
            update({ devices: Array.from(deviceMap.values()) });
          } catch (err) {
            console.error("Failed to decode settings notification:", err);
          }
        },
      });
      const response = await gatedCall(
        Request.create({ getAllActivitySettings: {} }),
      );
      if (!currentRead()) return [];
      if (response?.error) update({ error: response.error.message });
      await new Promise<void>((resolve) => {
        finishCollection = resolve;
        timer = setTimeout(resolve, NOTIFICATION_COLLECTION_TIMEOUT_MS);
      });
      return currentRead() ? Array.from(deviceMap.values()) : [];
    } catch (err) {
      if (currentRead()) {
        update({
          error:
            studioLockErrorText(err) ??
            `Failed to load settings: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      }
      return [];
    } finally {
      if (currentRead()) update({ isLoading: false });
      read.cancel();
      if (readRef.current === read) readRef.current = null;
    }
  }, [
    connection,
    ready,
    subsystemIndex,
    onNotification,
    gatedCall,
    isCurrent,
    update,
  ]);

  const setActivitySettings = useCallback(
    async (idleMs: number, sleepMs: number): Promise<boolean> => {
      if (!isCurrent() || !ready || !connection || subsystemIndex === undefined)
        return false;
      if (
        !Number.isSafeInteger(idleMs) ||
        !Number.isSafeInteger(sleepMs) ||
        idleMs < 0 ||
        sleepMs < 0 ||
        idleMs > 0xffffffff ||
        sleepMs > 0xffffffff
      ) {
        update({
          error:
            "Activity timeouts must be whole milliseconds from 0 to 4294967295",
        });
        return false;
      }
      update({ isLoading: true, error: null });
      try {
        const response = await gatedCall(
          Request.create({
            setActivitySettings: { settings: { idleMs, sleepMs, source: 0 } },
          }),
        );
        if (!isCurrent()) return false;
        if (response?.error) {
          update({ error: response.error.message });
          return false;
        }
        if (response?.setActivitySettings?.success) {
          await loadAllSettings();
          return isCurrent();
        }
        update({ error: "Failed to update activity settings" });
        return false;
      } catch (err) {
        if (isCurrent())
          update({
            error:
              studioLockErrorText(err) ??
              `Failed to set activity settings: ${err instanceof Error ? err.message : "Unknown error"}`,
          });
        return false;
      } finally {
        if (isCurrent()) update({ isLoading: false });
      }
    },
    [
      connection,
      ready,
      subsystemIndex,
      gatedCall,
      loadAllSettings,
      isCurrent,
      update,
    ],
  );

  const resetToDefaults = useCallback(async () => {
    // Reset to ZMK default values:
    // Idle timeout: 30 seconds (30000 ms)
    // Sleep timeout: 15 minutes (900000 ms)
    await setActivitySettings(30000, 900000);
  }, [setActivitySettings]);

  // Load settings when connection or subsystem changes
  useEffect(() => {
    if (ready) {
      loadAllSettings();
    }
  }, [ready, loadAllSettings]);

  return {
    sessionKey,
    isAvailable: ready && !!connection && subsystemIndex !== undefined,
    devices: state.sessionKey === sessionKey && ready ? state.devices : [],
    isLoading:
      state.sessionKey === sessionKey && ready ? state.isLoading : false,
    error: state.sessionKey === sessionKey && ready ? state.error : null,
    loadAllSettings,
    setActivitySettings,
    resetToDefaults,
  };
}
