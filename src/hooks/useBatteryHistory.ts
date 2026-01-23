import { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { ZMKCustomSubsystem, ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import {
  Request,
  Response,
  BatteryInfo,
} from "../proto/zmk/battery_history/battery_history";

// Subsystem identifier for ZMK battery history custom protocol
// This should match the identifier registered in the ZMK firmware module
const SUBSYSTEM_IDENTIFIER = "zmk__battery_history";

export interface BatteryData {
  deviceName: string;
  currentLevel: number;
  isCharging: boolean;
  lastUpdatedMs: number;
  history: Array<{
    timestampMs: number;
    level: number;
    isCharging: boolean;
  }>;
}

export interface UseBatteryHistoryReturn {
  batteries: BatteryData[];
  isLoading: boolean;
  error: string | null;
  loadBatteryStatus: () => Promise<void>;
  loadBatteryHistory: (startTimeMs?: number, endTimeMs?: number, maxEntries?: number) => Promise<void>;
}

function convertBatteryInfo(info: BatteryInfo): BatteryData {
  return {
    deviceName: info.deviceName,
    currentLevel: info.currentLevel,
    isCharging: info.isCharging,
    lastUpdatedMs: Number(info.lastUpdatedMs),
    history: info.history.map((reading) => ({
      timestampMs: Number(reading.timestampMs),
      level: reading.level,
      isCharging: reading.isCharging,
    })),
  };
}

export function useBatteryHistory(): UseBatteryHistoryReturn {
  const zmkApp = useContext(ZMKAppContext);
  const [batteries, setBatteries] = useState<BatteryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize subsystem to avoid unnecessary re-renders
  const subsystem = useMemo(
    () => zmkApp?.findSubsystem(SUBSYSTEM_IDENTIFIER),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zmkApp?.state.customSubsystems]
  );
  
  // Extract subsystem index as a stable primitive value for dependencies
  const subsystemIndex = subsystem?.index;

  const loadBatteryStatus = useCallback(async () => {
    if (!zmkApp?.state.connection || subsystemIndex === undefined) {
      setError("Not connected to device or subsystem not found");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const service = new ZMKCustomSubsystem(
        zmkApp.state.connection,
        subsystemIndex
      );

      const request = Request.create({
        getBatteryStatus: {},
      });

      const payload = Request.encode(request).finish();
      const responsePayload = await service.callRPC(payload);

      if (responsePayload) {
        const resp = Response.decode(responsePayload);
        if (resp.getBatteryStatus) {
          const batteryData = resp.getBatteryStatus.batteries.map(convertBatteryInfo);
          setBatteries(batteryData);
        } else if (resp.error) {
          setError(resp.error.message);
        }
      }
    } catch (err) {
      console.error("Failed to load battery status:", err);
      setError(
        `Failed to load battery status: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [zmkApp?.state.connection, subsystemIndex]);

  const loadBatteryHistory = useCallback(
    async (startTimeMs?: number, endTimeMs?: number, maxEntries?: number) => {
      if (!zmkApp?.state.connection || subsystemIndex === undefined) {
        setError("Not connected to device or subsystem not found");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const service = new ZMKCustomSubsystem(
          zmkApp.state.connection,
          subsystemIndex
        );

        const request = Request.create({
          getBatteryHistory: {
            startTimeMs: startTimeMs || 0,
            endTimeMs: endTimeMs || 0,
            maxEntries: maxEntries || 0,
          },
        });

        const payload = Request.encode(request).finish();
        const responsePayload = await service.callRPC(payload);

        if (responsePayload) {
          const resp = Response.decode(responsePayload);
          if (resp.getBatteryHistory) {
            const batteryData = resp.getBatteryHistory.batteries.map(convertBatteryInfo);
            setBatteries(batteryData);
          } else if (resp.error) {
            setError(resp.error.message);
          }
        }
      } catch (err) {
        console.error("Failed to load battery history:", err);
        setError(
          `Failed to load battery history: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [zmkApp?.state.connection, subsystemIndex]
  );

  // Load battery status when connection or subsystem changes
  useEffect(() => {
    if (subsystemIndex !== undefined && zmkApp?.state.connection) {
      loadBatteryStatus();
    }
  }, [subsystemIndex, zmkApp?.state.connection, loadBatteryStatus]);

  return {
    batteries,
    isLoading,
    error,
    loadBatteryStatus,
    loadBatteryHistory,
  };
}
