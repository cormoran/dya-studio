import type { ReactNode } from "react";
import { createContext, useContext, useState, useCallback } from "react";

/**
 * Demo Mode Context
 *
 * Manages the global demo mode state for the application.
 * When demo mode is active, the app uses mock data instead of
 * connecting to a real keyboard.
 */

interface DemoModeContextValue {
  /** Whether demo mode is currently active */
  isDemoMode: boolean;
  /** Enable demo mode */
  enableDemoMode: () => void;
  /** Disable demo mode */
  disableDemoMode: () => void;
  /** Toggle demo mode on/off */
  toggleDemoMode: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoMode: false,
  enableDemoMode: () => {},
  disableDemoMode: () => {},
  toggleDemoMode: () => {},
});

interface DemoModeProviderProps {
  children: ReactNode;
}

export function DemoModeProvider({ children }: DemoModeProviderProps) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const enableDemoMode = useCallback(() => {
    setIsDemoMode(true);
  }, []);

  const disableDemoMode = useCallback(() => {
    setIsDemoMode(false);
  }, []);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode((prev) => !prev);
  }, []);

  return (
    <DemoModeContext.Provider
      value={{ isDemoMode, enableDemoMode, disableDemoMode, toggleDemoMode }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

// Export the hook in a separate file or with comment to avoid fast-refresh issue
// eslint-disable-next-line react-refresh/only-export-components
export function useDemoMode() {
  return useContext(DemoModeContext);
}
