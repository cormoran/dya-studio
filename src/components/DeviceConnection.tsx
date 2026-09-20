import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import {
  useZMKApp,
  ZMKAppContext,
  getPairedSerialPorts,
  connectToPairedSerial,
} from "@cormoran/zmk-studio-react-hook";
import type { UseZMKAppOptions } from "@cormoran/zmk-studio-react-hook";
import { connect as connectBLE } from "@zmkfirmware/zmk-studio-ts-client/transport/gatt";
import { connect as connectUSB } from "../lib/transport/usb";
import { connect as connectDemo } from "../lib/transport/demo";
import {
  resolveCustomSubsystemIdentifier,
  withLoggedNotifications,
} from "../lib/rpcLogging";
import {
  trackKeyboardConnected,
  trackConnectFailed,
  classifyConnectError,
} from "../lib/analytics";
import {
  clearSavedConnectionMethod,
  saveConnectionMethod,
  savedConnectionMethod,
} from "../lib/connectionSession";
import {
  ConnectionContext,
  type ConnectionContextValue,
  type ConnectionMethod,
} from "../contexts/DeviceConnectionContext";

export type { ConnectionMethod } from "../contexts/DeviceConnectionContext";

/**
 * Minimum time (ms) the "reconnecting" indicator stays visible once shown,
 * even if the underlying auto-reconnect attempt resolves near-instantly.
 * Without this, a fast reconnect would flash the indicator so briefly the
 * user couldn't tell what happened.
 */
export const AUTO_RECONNECT_MIN_DISPLAY_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface DeviceConnectionProviderProps {
  children: ReactNode;
  /**
   * Minimum time (ms) to keep the reconnecting indicator visible once it's
   * shown. Defaults to {@link AUTO_RECONNECT_MIN_DISPLAY_MS}. Overridable
   * mainly so tests don't have to wait out the real-world default.
   */
  reconnectMinDisplayMs?: number;
  /**
   * How long (ms) to wait for the device to answer the initial RPC handshake
   * before giving up. Forwarded to `useZMKApp`; defaults to the library's
   * own default (5000ms) when omitted. Without this, a paired-but-unresponsive
   * device (e.g. sitting in the bootloader) would hang the page-load
   * auto-reconnect attempt forever instead of falling back to the connect
   * screen.
   */
  connectTimeoutMs?: UseZMKAppOptions["connectTimeoutMs"];
}

export function DeviceConnectionProvider({
  children,
  reconnectMinDisplayMs = AUTO_RECONNECT_MIN_DISPLAY_MS,
  connectTimeoutMs,
}: DeviceConnectionProviderProps) {
  const zmkApp = useZMKApp({ connectTimeoutMs });
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Dev-only: log every notification pushed from the device, mirroring the RPC
  // logging that wraps outbound calls. Wrap the shared `zmkApp` once here so all
  // consumers (which read it from `ZMKAppContext`) are covered without touching
  // each `onNotification` call site. A no-op passthrough in the production build.
  const loggedZmkApp = useMemo(
    () => ({
      ...zmkApp,
      onNotification: withLoggedNotifications(zmkApp.onNotification, (index) =>
        resolveCustomSubsystemIdentifier(
          index,
          zmkApp.state.customSubsystems?.subsystems,
        ),
      ),
    }),
    [zmkApp],
  );

  // Bridges the cancel button (outside the effect) to the in-flight attempt.
  const cancelReconnectRef = useRef<() => void>(() => {});

  // Method of the connection attempt currently in flight, used to attribute the
  // success/failure analytics event. Cleared once its outcome is reported so a
  // single attempt is never counted twice (whether the failure surfaces as a
  // thrown error or via `zmkApp.state.error`).
  const attemptedMethodRef = useRef<ConnectionMethod | null>(null);
  // Whether the current connected session's `keyboard_connected` event already
  // fired, so a later device-info refresh doesn't re-report it.
  const connectedTrackedRef = useRef(false);

  const reportConnectFailed = useCallback((error: unknown) => {
    const method = attemptedMethodRef.current;
    if (!method) return;
    attemptedMethodRef.current = null;
    trackConnectFailed(method, classifyConnectError(error));
  }, []);

  // Report connection outcomes exactly once per attempt. Reading them from
  // committed state (rather than only from the connect() promise) covers the
  // case where the library surfaces errors via `state.error` instead of
  // throwing.
  useEffect(() => {
    const name = zmkApp.state.deviceInfo?.name;
    if (zmkApp.isConnected && name && !connectedTrackedRef.current) {
      connectedTrackedRef.current = true;
      // Auto-reconnect is always over paired serial and leaves the ref unset.
      trackKeyboardConnected(attemptedMethodRef.current ?? "serial", name);
      attemptedMethodRef.current = null;
    }
    if (!zmkApp.isConnected) {
      connectedTrackedRef.current = false;
    }
  }, [zmkApp.isConnected, zmkApp.state.deviceInfo?.name]);

  useEffect(() => {
    if (zmkApp.state.error) {
      reportConnectFailed(zmkApp.state.error);
    }
  }, [zmkApp.state.error, reportConnectFailed]);

  useEffect(() => {
    // Plain mutable flag (not a ref hook) local to this one-shot attempt,
    // mirroring the library's own ZMKConnection auto-reconnect pattern.
    // Set on unmount (cleanup below) or when the user clicks "Cancel".
    const cancelledState = { current: false };
    cancelReconnectRef.current = () => {
      cancelledState.current = true;
      setIsReconnecting(false);
    };

    const reconnect = async () => {
      const method = savedConnectionMethod();
      if (method === "demo") return connectDemo();

      const ports = await getPairedSerialPorts();
      if (ports.length === 0) return null;
      return connectToPairedSerial();
    };

    // React StrictMode intentionally runs an effect's setup, cleanup, then
    // setup again in development. Deferring the attempt lets the first
    // cleanup cancel its scheduled work and leaves the second setup to start
    // the one real attempt. Starting immediately would make the cleanup abort
    // the only attempt while a ref guard suppresses the second one.
    const startTimer = window.setTimeout(() => {
      void (async () => {
        if (cancelledState.current) return;

        setIsReconnecting(true);
        let transport: RpcTransport | null = null;
        try {
          // Run the reconnect attempt and the minimum-display timer in
          // parallel so the indicator never flashes shorter than intended,
          // but also never waits longer than necessary once both settle.
          [transport] = await Promise.all([
            reconnect(),
            sleep(reconnectMinDisplayMs),
          ]);

          if (cancelledState.current) {
            // User cancelled or component unmounted while we were
            // reconnecting: release the transport instead of using it.
            transport?.abortController.abort();
            return;
          }

          if (!transport) {
            // No paired port after all (race with getPairedSerialPorts
            // above) -- fall back to the normal connect screen.
            return;
          }

          await zmkApp.connect(() =>
            Promise.resolve(transport as RpcTransport),
          );
        } catch (error) {
          if (!cancelledState.current) {
            console.warn("Auto-reconnect to paired serial port failed:", error);
          }
        } finally {
          if (!cancelledState.current) {
            setIsReconnecting(false);
          }
        }
      })();
    }, 0);

    return () => {
      cancelledState.current = true;
      window.clearTimeout(startTimer);
    };
    // One-shot on mount by design; reconnectMinDisplayMs/zmkApp are read
    // from the closure captured at mount time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = useCallback(
    async (method: ConnectionMethod) => {
      let connectFn: () => Promise<RpcTransport>;
      if (method === "ble") {
        connectFn = connectBLE;
      } else if (method === "demo") {
        connectFn = connectDemo;
      } else {
        connectFn = connectUSB;
      }
      attemptedMethodRef.current = method;
      try {
        await zmkApp.connect(connectFn);
        saveConnectionMethod(method);
      } catch (error) {
        // Covers errors thrown before the library commits them to `state.error`
        // (e.g. the user dismissing the browser device picker). `reportConnectFailed`
        // dedupes against the `state.error` effect so the attempt counts once.
        reportConnectFailed(error);
        throw error;
      }
    },
    [zmkApp, reportConnectFailed],
  );

  const handleDisconnect = useCallback(() => {
    clearSavedConnectionMethod();
    zmkApp.disconnect();
  }, [zmkApp]);

  const handleCancelReconnect = useCallback(() => {
    cancelReconnectRef.current();
    // If the cancel lands while the auto-reconnect is already awaiting the
    // RPC handshake, `zmkApp.connect()` has set `isLoading` and won't clear it
    // until the connect-timeout watchdog fires. Abort that in-flight attempt so
    // the connect screen doesn't stay stuck in the loading state; `disconnect`
    // also resets `isLoading`/`error` back to the idle disconnected state.
    zmkApp.disconnect();
  }, [zmkApp]);

  const connectionValue: ConnectionContextValue = {
    isConnected: zmkApp.isConnected,
    deviceName: zmkApp.state.deviceInfo?.name,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    isLoading: zmkApp.state.isLoading,
    error: zmkApp.state.error,
    isReconnecting,
    onCancelReconnect: handleCancelReconnect,
  };

  return (
    <ZMKAppContext.Provider value={loggedZmkApp}>
      <ConnectionContext.Provider value={connectionValue}>
        {children}
      </ConnectionContext.Provider>
    </ZMKAppContext.Provider>
  );
}
