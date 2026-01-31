import type { ReactNode } from "react";
import { IconSun, IconMoon } from "@tabler/icons-react";
import DyaLogo from "../assets/dya.svg?react";
import { useTheme } from "../hooks/useTheme";
import type { ConnectionMethod } from "../components/DeviceConnection";
import type { HealthStatus } from "../hooks/useHealthCheck";

interface AppLayoutProps {
  children: ReactNode;
  isConnected: boolean;
  deviceName?: string;
  onConnect: (method: ConnectionMethod) => void;
  onDisconnect: () => void;
  isConnecting?: boolean;
  healthStatus?: HealthStatus;
}

export function AppLayout({
  children,
  isConnected,
  deviceName,
  onConnect,
  onDisconnect,
  isConnecting,
  healthStatus = "healthy",
}: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme();

  // Determine status indicator class based on health
  const getStatusClass = () => {
    if (!isConnected) return "disconnected";
    return healthStatus === "healthy" ? "connected" : healthStatus;
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-dark">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm transition-colors duration-300">
        {/* Logo & Brand */}
        <div className="flex items-center gap-4">
          <DyaLogo className="w-8 h-8 [&_polygon]:fill-[var(--color-text)]" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-light tracking-widest text-[var(--color-text)]">
              DYA
            </span>
            <span className="text-xs font-light tracking-wider text-[var(--color-text-muted)] uppercase">
              Studio
            </span>
          </div>
        </div>

        {/* Connection Status & Theme Toggle */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>

          {isConnected ? (
            <>
              <div className="flex items-center gap-3">
                <div className={`status-indicator ${getStatusClass()}`} />
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {deviceName || "Connected"}
                </span>
              </div>
              <button onClick={onDisconnect} className="btn-ghost text-sm">
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => onConnect("serial")}
              disabled={isConnecting}
              className="btn-electric text-sm"
            >
              {isConnecting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[var(--color-text-muted)] border-t-[var(--color-text)] rounded-full animate-spin" />
                  Connecting...
                </span>
              ) : (
                "Connect Keyboard"
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
