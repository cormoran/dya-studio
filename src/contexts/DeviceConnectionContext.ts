import { createContext } from "react";

export type ConnectionMethod = "serial" | "ble" | "demo";

export interface ConnectionContextValue {
  isConnected: boolean;
  deviceName: string | undefined;
  onConnect: (method: ConnectionMethod) => void;
  onDisconnect: () => void;
  isLoading: boolean;
  error: string | null;
  /** True while the page-load auto-reconnect attempt is in flight. */
  isReconnecting: boolean;
  /** Cancels an in-flight page-load auto-reconnect attempt. */
  onCancelReconnect: () => void;
}

/**
 * Kept separate from DeviceConnectionProvider so edits to the provider remain
 * a React Fast Refresh boundary. Exporting this context from the component
 * module makes Vite fall back to a full page reload, which tears down an
 * active keyboard transport during development.
 */
export const ConnectionContext = createContext<ConnectionContextValue>({
  isConnected: false,
  deviceName: undefined,
  onConnect: () => {},
  onDisconnect: () => {},
  isLoading: false,
  error: null,
  isReconnecting: false,
  onCancelReconnect: () => {},
});
