import type { ReactNode } from "react";
import { IconSun, IconMoon, IconPlugConnectedX } from "@tabler/icons-react";
import DyaLogo from "../assets/dya.svg?react";
import { useTheme } from "../hooks/useTheme";
import { useLanguage } from "../hooks/useLanguage";
import type { ConnectionMethod } from "../components/DeviceConnection";
import { LanguageToggle } from "../components/LanguageToggle";
import { BUILD_LABEL } from "../lib/viteEnv";

interface AppLayoutProps {
  children: ReactNode;
  isConnected: boolean;
  deviceName?: string;
  onConnect: (method: ConnectionMethod) => void;
  onDisconnect: () => void;
  isConnecting?: boolean;
}

export function AppLayout({
  children,
  isConnected,
  deviceName,
  onConnect,
  onDisconnect,
  isConnecting,
}: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-screen bg-gradient-dark">
      {/* Header */}
      <header className="relative flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm transition-colors duration-300">
        {BUILD_LABEL && (
          <span
            className="absolute left-2 top-0 z-10 rounded-b-md border border-t-0 border-[var(--color-warning)] bg-[var(--color-warning)] px-2 py-1 text-[10px] font-semibold leading-none tracking-widest text-[var(--color-surface)] uppercase shadow-sm"
            title={`${BUILD_LABEL} build — not the production release`}
          >
            {BUILD_LABEL}
          </span>
        )}
        {/* Logo & Brand */}
        <div className="flex items-center gap-4 flex-shrink-0 mr-4">
          <DyaLogo className="w-8 h-8 [&_polygon]:fill-[var(--color-text)]" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-lg font-light tracking-widest text-[var(--color-text)]">
              DYA
            </span>
            <span className="text-xs font-light tracking-wider text-[var(--color-text-muted)] uppercase pt-1">
              Studio
            </span>
          </div>
        </div>

        {/* Connection Status & Theme Toggle */}
        <div className="flex items-center gap-4">
          {isConnected ? (
            <>
              <div className="flex items-center gap-3">
                <div className="status-indicator connected flex-shrink-0" />
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {deviceName || t("Connected")}
                </span>
              </div>
              <button
                onClick={onDisconnect}
                className="btn-ghost text-sm flex items-center gap-1.5"
              >
                <IconPlugConnectedX size={18} />
                <span className="hidden tablet:inline">{t("Disconnect")}</span>
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
                  {t("Connecting...")}
                </span>
              ) : (
                t("Connect Keyboard")
              )}
            </button>
          )}
          <LanguageToggle />
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={
              theme === "dark"
                ? t("Switch to light mode")
                : t("Switch to dark mode")
            }
          >
            {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
