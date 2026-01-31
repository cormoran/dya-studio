import { useState, useEffect, useCallback, useContext, useRef } from "react";
import {
  ZMKCustomSubsystem,
  ZMKAppContext,
} from "@cormoran/zmk-studio-react-hook";
import { Request, Response } from "../proto/zmk/ble_management/ble_management";

// Subsystem identifier for ZMK BLE management custom protocol
const SUBSYSTEM_IDENTIFIER = "zmk__ble_management";

// Health check configuration
const HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds
const MAX_CONSECUTIVE_FAILURES = 3; // 3 failures = 90 seconds until disconnect

export type HealthStatus = "healthy" | "warning" | "unhealthy";

export interface UseHealthCheckReturn {
  healthStatus: HealthStatus;
  consecutiveFailures: number;
  lastCheckTime: Date | null;
  isChecking: boolean;
}

export function useHealthCheck(): UseHealthCheckReturn {
  const zmkApp = useContext(ZMKAppContext);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("healthy");
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const disconnectHandledRef = useRef(false);

  const performHealthCheck = useCallback(async () => {
    if (!zmkApp?.state.connection || isChecking) {
      return;
    }

    const subsystem = zmkApp.findSubsystem(SUBSYSTEM_IDENTIFIER);
    if (!subsystem) {
      return;
    }

    setIsChecking(true);

    try {
      const service = new ZMKCustomSubsystem(
        zmkApp.state.connection,
        subsystem.index,
      );

      const request = Request.create({
        getSplitInfo: {},
      });

      const payload = Request.encode(request).finish();
      const responsePayload = await service.callRPC(payload);

      if (responsePayload) {
        const resp = Response.decode(responsePayload);
        // Only treat as successful if we got a valid response (not an error)
        if (resp.getSplitInfo) {
          // Successful response - reset failure count
          setConsecutiveFailures(0);
          setHealthStatus("healthy");
          setLastCheckTime(new Date());
          disconnectHandledRef.current = false;
        } else if (resp.error) {
          // Error response from device
          throw new Error(resp.error.message || "Device returned error");
        }
      } else {
        throw new Error("No response received");
      }
    } catch (error) {
      console.error("Health check failed:", error);
      // Health check failed
      setConsecutiveFailures((prev) => {
        const newCount = prev + 1;

        if (newCount === 1) {
          // First failure - set to warning
          setHealthStatus("warning");
        } else if (newCount >= MAX_CONSECUTIVE_FAILURES) {
          // Multiple failures - unhealthy
          setHealthStatus("unhealthy");

          // Auto-disconnect after max failures
          if (!disconnectHandledRef.current && zmkApp?.disconnect) {
            disconnectHandledRef.current = true;
            console.warn(
              "Device health check failed multiple times, disconnecting",
            );
            zmkApp.disconnect();
          }
        }

        return newCount;
      });
      setLastCheckTime(new Date());
    } finally {
      setIsChecking(false);
    }
  }, [zmkApp, isChecking]);

  // Start/stop health check interval based on connection status
  useEffect(() => {
    if (zmkApp?.isConnected) {
      // Reset state when connected
      setHealthStatus("healthy");
      setConsecutiveFailures(0);
      disconnectHandledRef.current = false;

      // Perform initial health check immediately
      performHealthCheck();

      // Set up periodic health checks
      intervalRef.current = setInterval(() => {
        performHealthCheck();
      }, HEALTH_CHECK_INTERVAL_MS);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Clear interval when disconnected
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Reset state
      setHealthStatus("healthy");
      setConsecutiveFailures(0);
      setLastCheckTime(null);
      disconnectHandledRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zmkApp?.isConnected]);

  return {
    healthStatus,
    consecutiveFailures,
    lastCheckTime,
    isChecking,
  };
}
