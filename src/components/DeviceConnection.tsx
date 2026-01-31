import type { ReactNode } from "react";
import { createContext, useCallback } from "react";
import { useZMKApp, ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { connect as connectSerial } from "@zmkfirmware/zmk-studio-ts-client/transport/serial";
import { connect as connectBLE } from "@zmkfirmware/zmk-studio-ts-client/transport/gatt";
import { useHealthCheck, type HealthStatus } from "../hooks/useHealthCheck";

export type ConnectionMethod = "serial" | "ble";

// Simple connection context for UI components
interface ConnectionContextValue {
  isConnected: boolean;
  deviceName: string | undefined;
  onConnect: (method: ConnectionMethod) => void;
  onDisconnect: () => void;
  isLoading: boolean;
  error: string | null;
  healthStatus: HealthStatus;
}

const ConnectionContext = createContext<ConnectionContextValue>({
  isConnected: false,
  deviceName: undefined,
  onConnect: () => {},
  onDisconnect: () => {},
  isLoading: false,
  error: null,
  healthStatus: "healthy",
});

interface DeviceConnectionProviderProps {
  children: ReactNode;
}

export function DeviceConnectionProvider({
  children,
}: DeviceConnectionProviderProps) {
  const zmkApp = useZMKApp();
  const { healthStatus } = useHealthCheck();

  const handleConnect = useCallback(
    async (method: ConnectionMethod) => {
      const connectFn = method === "ble" ? connectBLE : connectSerial;
      await zmkApp.connect(connectFn);
    },
    [zmkApp],
  );

  const handleDisconnect = useCallback(() => {
    zmkApp.disconnect();
  }, [zmkApp]);

  const connectionValue: ConnectionContextValue = {
    isConnected: zmkApp.isConnected,
    deviceName: zmkApp.state.deviceInfo?.name,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    isLoading: zmkApp.state.isLoading,
    error: zmkApp.state.error,
    healthStatus,
  };

  return (
    <ZMKAppContext.Provider value={zmkApp}>
      <ConnectionContext.Provider value={connectionValue}>
        {children}
      </ConnectionContext.Provider>
    </ZMKAppContext.Provider>
  );
}

export { ConnectionContext };
