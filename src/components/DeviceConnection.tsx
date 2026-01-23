import type { ReactNode } from "react";
import { createContext, useCallback } from "react";
import { useZMKApp, ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { connect as connectSerial } from "@zmkfirmware/zmk-studio-ts-client/transport/serial";

// Simple connection context for UI components
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
    await zmkApp.connect(connectSerial);
  }, [zmkApp]);

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
