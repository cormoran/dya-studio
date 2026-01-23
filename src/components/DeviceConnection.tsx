import type { ReactNode } from "react";
import { createContext, useCallback } from "react";
import { useZMKApp } from "@cormoran/zmk-studio-react-hook";
import { connect as connectSerial } from "@zmkfirmware/zmk-studio-ts-client/transport/serial";
import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";

// Connection context for UI components
interface ConnectionContextValue {
  isConnected: boolean;
  deviceName: string | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading: boolean;
  error: string | null;
  rpcConnection: RpcConnection | null;
}

const ConnectionContext = createContext<ConnectionContextValue>({
  isConnected: false,
  deviceName: undefined,
  onConnect: () => {},
  onDisconnect: () => {},
  isLoading: false,
  error: null,
  rpcConnection: null,
});

interface DeviceConnectionProviderProps {
  children: ReactNode;
}

export function DeviceConnectionProvider({
  children,
}: DeviceConnectionProviderProps) {
  const zmkApp = useZMKApp();

  const handleConnect = useCallback(async () => {
    try {
      await zmkApp.connect(connectSerial);
    } catch (err) {
      // Error is handled by zmkApp
      console.error("Connection error:", err);
    }
  }, [zmkApp]);

  const handleDisconnect = useCallback(() => {
    zmkApp.disconnect();
  }, [zmkApp]);

  return (
    <ConnectionContext.Provider
      value={{
        isConnected: zmkApp.isConnected,
        deviceName: zmkApp.state.deviceInfo?.name,
        onConnect: handleConnect,
        onDisconnect: handleDisconnect,
        isLoading: zmkApp.state.isLoading,
        error: zmkApp.state.error,
        rpcConnection: zmkApp.state.connection,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export { ConnectionContext };
