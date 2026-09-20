import { useState, useEffect, useCallback, useContext } from "react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { useCustomSubsystem, useLockAwareCall } from "./useCustomSubsystem";
import {
  Request,
  Response,
  Notification,
  ActivitySettings,
} from "../proto/zmk/settings/core";

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
  const [devices, setDevices] = useState<DeviceActivitySettings[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Map a lock/cancel rejection from the gate to the shared "device is locked"
  // message (rendered via t()); other outcomes pass through unchanged.
  const call = useLockAwareCall(gatedCall, setError);

  // Extract subsystem index as a stable primitive value for dependencies
  const subsystemIndex = subsystem?.index;

  const loadAllSettings = useCallback(async (): Promise<
    DeviceActivitySettings[]
  > => {
    if (!ready || !zmkApp || subsystemIndex === undefined) {
      setError("Not connected to device or subsystem not found");
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      // Map to store settings by source ID
      const deviceMap = new Map<number, DeviceActivitySettings>();

      // Set up notification listener for activity settings
      const notificationHandler = (settings: ActivitySettings) => {
        try {
          const sourceId = settings.source;
          const deviceName =
            sourceId === 0 ? "Central" : `Peripheral ${sourceId}`;

          deviceMap.set(sourceId, {
            sourceId,
            deviceName,
            idleMs: settings.idleMs,
            sleepMs: settings.sleepMs,
          });

          // Update state with all collected devices
          setDevices(Array.from(deviceMap.values()));
        } catch (err) {
          console.error(
            "Failed to process activity settings notification:",
            err,
          );
        }
      };

      // Subscribe to notifications using zmkApp's onNotification
      const unsubscribe = zmkApp.onNotification({
        type: "custom",
        subsystemIndex,
        callback: (customNotification) => {
          // Decode the payload
          try {
            const notification = Notification.decode(
              customNotification.payload,
            );
            if (notification.activitySettings?.settings) {
              notificationHandler(notification.activitySettings.settings);
            }
          } catch (err) {
            console.error("Failed to decode settings notification:", err);
          }
        },
      });

      try {
        // Send request to get all activity settings
        const resp = await call(Request.create({ getAllActivitySettings: {} }));
        if (resp?.error) {
          setError(resp.error.message);
        }
        // Note: The actual data comes via notifications, not the response
      } finally {
        // Wait for all notifications to arrive from devices
        await new Promise((resolve) =>
          setTimeout(resolve, NOTIFICATION_COLLECTION_TIMEOUT_MS),
        );
        unsubscribe();
      }
      return Array.from(deviceMap.values());
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError(
        `Failed to load settings: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [zmkApp, ready, subsystemIndex, call]);

  const setActivitySettings = useCallback(
    async (idleMs: number, sleepMs: number): Promise<boolean> => {
      if (!ready) {
        setError("Not connected to device or subsystem not found");
        return false;
      }

      if (
        !Number.isSafeInteger(idleMs) ||
        !Number.isSafeInteger(sleepMs) ||
        idleMs < 0 ||
        sleepMs < 0 ||
        idleMs > 0xffffffff ||
        sleepMs > 0xffffffff
      ) {
        setError(
          "Activity timeouts must be whole milliseconds from 0 to 4294967295",
        );
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const resp = await call(
          Request.create({
            setActivitySettings: {
              settings: {
                idleMs,
                sleepMs,
                source: 0, // Not used for set operation
              },
            },
          }),
        );

        if (resp) {
          if (resp.error) {
            setError(resp.error.message);
            return false;
          } else if (resp.setActivitySettings?.success) {
            // Successfully set, reload settings
            await loadAllSettings();
            return true;
          }
        }
        setError("Failed to update activity settings");
        return false;
      } catch (err) {
        console.error("Failed to set activity settings:", err);
        setError(
          `Failed to set activity settings: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [ready, call, loadAllSettings],
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
    isAvailable: subsystem !== null,
    devices,
    isLoading,
    error,
    loadAllSettings,
    setActivitySettings,
    resetToDefaults,
  };
}
