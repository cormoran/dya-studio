import { ResponsiveButton } from "../components/ResponsiveButton";
import { useContext, useState } from "react";
import {
  IconPuzzle,
  IconExternalLink,
  IconAlertTriangleFilled,
  IconX,
  IconFlask,
  IconRefresh,
} from "@tabler/icons-react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import type { ListCustomSubsystemResponse } from "@zmkfirmware/zmk-studio-ts-client/custom";
import { navigateTo } from "../lib/navigate";
import { useLanguage } from "../hooks/useLanguage";
import { useConnection } from "../hooks/useConnection";
import {
  DEMO_SUBSYSTEMS,
  isDemoSubsystemEnabled,
  setDemoSubsystemEnabled,
} from "../lib/transport/demo-subsystems";
import { SectionCard } from "../components/troubleshooting/SectionCard";
import { DEVICE_INFO_SUBSYSTEM_IDENTIFIER } from "../hooks/useDeviceInfo";
import { WATCHDOG_SUBSYSTEM_IDENTIFIER } from "../hooks/useWatchdog";
import { PMW3610_SUBSYSTEM_IDENTIFIER } from "../hooks/usePmw3610";
import { CUSTOM_SETTINGS_IDENTIFIER } from "../hooks/useCustomSettings";
import { INPUT_STREAM_IDENTIFIER } from "../hooks/useInputStream";
import { PHYSICAL_LAYOUTS_IDENTIFIERS } from "../hooks/usePhysicalLayoutModules";
import { KSCAN_DIAGNOSTICS_SUBSYSTEM_IDENTIFIER } from "../hooks/useKscanDiagnostics";
import { RUNTIME_COMBO_IDENTIFIER } from "../hooks/useRuntimeCombo";
import { RUNTIME_MACRO_SUBSYSTEM_IDENTIFIER } from "../hooks/useRuntimeMacro";
import { RUNTIME_INPUT_PROCESSOR_SUBSYSTEM_IDENTIFIER } from "../hooks/useRuntimeInputProcessor";
import { RUNTIME_SENSOR_ROTATE_SUBSYSTEM_IDENTIFIER } from "../hooks/useRuntimeSensorRotate";
import { DEFAULT_LAYER_SUBSYSTEM_IDENTIFIER } from "../hooks/useDefaultLayer";
import { SETTINGS_SUBSYSTEM_IDENTIFIER } from "../hooks/useSettings";
import { BLE_MANAGEMENT_SUBSYSTEM_IDENTIFIER } from "../hooks/useBLEProfiles";
import { OS_DETECTION_SUBSYSTEM_IDENTIFIER } from "../hooks/useOsDetection";
import { DEVTOOL_SUBSYSTEM_IDENTIFIER } from "../hooks/useDevtool";
import { FAST_KEYMAP_SUBSYSTEM_IDENTIFIER } from "../hooks/useKeymapSource";

// Identifiers of subsystems DYA Studio already has a dedicated UI for
// (mirrors the `*_IDENTIFIER` constants exported by src/hooks/*.ts).
const SUPPORTED_SUBSYSTEM_IDENTIFIERS = new Set<string>([
  DEVICE_INFO_SUBSYSTEM_IDENTIFIER,
  WATCHDOG_SUBSYSTEM_IDENTIFIER,
  PMW3610_SUBSYSTEM_IDENTIFIER,
  CUSTOM_SETTINGS_IDENTIFIER,
  INPUT_STREAM_IDENTIFIER,
  ...PHYSICAL_LAYOUTS_IDENTIFIERS,
  KSCAN_DIAGNOSTICS_SUBSYSTEM_IDENTIFIER,
  RUNTIME_COMBO_IDENTIFIER,
  RUNTIME_MACRO_SUBSYSTEM_IDENTIFIER,
  RUNTIME_INPUT_PROCESSOR_SUBSYSTEM_IDENTIFIER,
  RUNTIME_SENSOR_ROTATE_SUBSYSTEM_IDENTIFIER,
  DEFAULT_LAYER_SUBSYSTEM_IDENTIFIER,
  SETTINGS_SUBSYSTEM_IDENTIFIER,
  BLE_MANAGEMENT_SUBSYSTEM_IDENTIFIER,
  OS_DETECTION_SUBSYSTEM_IDENTIFIER,
  DEVTOOL_SUBSYSTEM_IDENTIFIER,
  // Fast keymap has no dedicated tab of its own — it transparently powers the
  // Keymap tab's fast-loading path (see useKeymapSource), so DYA Studio still
  // fully handles it and it belongs with the already-supported subsystems.
  FAST_KEYMAP_SUBSYSTEM_IDENTIFIER,
]);

type Subsystem = ListCustomSubsystemResponse["subsystems"][number];

// LocalStorage key for trusted subsystem UI URLs
const TRUSTED_URLS_KEY = "dya-studio-trusted-subsystem-urls";

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function getTrustedUrls(): Set<string> {
  try {
    const stored = localStorage.getItem(TRUSTED_URLS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed)) {
        return new Set(
          (parsed as unknown[]).filter(
            (v): v is string => typeof v === "string" && isValidUrl(v),
          ),
        );
      }
    }
  } catch {
    // Ignore storage errors
  }
  return new Set();
}

function saveTrustedUrl(url: string): void {
  try {
    const trusted = getTrustedUrls();
    trusted.add(url);
    // Trusted URLs are not sensitive data — they are UI links the user
    // explicitly approved. Stored as plain text intentionally.
    localStorage.setItem(TRUSTED_URLS_KEY, JSON.stringify(Array.from(trusted)));
  } catch {
    // Ignore storage errors
  }
}

interface ExternalLinkWarningDialogProps {
  url: string;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

function ExternalLinkWarningDialog({
  url,
  onConfirm,
  onCancel,
}: ExternalLinkWarningDialogProps) {
  const { t } = useLanguage();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="external-link-dialog-title"
    >
      <div
        className="glass-card p-6 max-w-md w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="absolute top-4 right-4 btn-ghost p-1"
          onClick={onCancel}
          aria-label={t("Close dialog")}
        >
          <IconX size={16} className="text-[var(--color-text-muted)]" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <IconAlertTriangleFilled size={24} className="text-red-500" />
          </div>
          <h2
            id="external-link-dialog-title"
            className="text-base font-medium text-[var(--color-text)]"
          >
            {t("External Link Warning")}
          </h2>
        </div>

        {/* Warning message */}
        <p className="text-sm text-[var(--color-text-secondary)] mb-3">
          {t(
            "You are about to open an external website provided by the keyboard firmware author:",
          )}
        </p>
        <div className="mb-4 px-3 py-2 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)] break-all">
          <span className="text-xs font-mono text-[var(--color-electric)]">
            {url}
          </span>
        </div>
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 leading-relaxed">
            <strong>{t("Security Notice")}:</strong>{" "}
            {t(
              "Please do not connect to an unreliable author's web page. Only proceed if you trust the keyboard firmware author. External pages may request sensitive permissions or send data to third-party servers.",
            )}
          </p>
        </div>

        {/* Don't show again */}
        <label className="flex items-center gap-2 mb-6 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--color-electric)]"
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            {t("Trust this URL and don't warn me again")}
          </span>
        </label>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost text-sm" onClick={onCancel}>
            {t("Cancel")}
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center gap-2"
            onClick={() => onConfirm(dontShowAgain)}
          >
            <IconExternalLink size={16} />
            {t("Open")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Demo-only panel: toggle each custom subsystem on/off. Changes are persisted
 * to localStorage and take effect on reconnect (the app fetches the subsystem
 * list once per connection). Primary use: turn the read-only fast-keymap
 * subsystem on to exercise the fast keymap-loading path.
 */
function DemoSubsystemToggles() {
  const { t } = useLanguage();
  const { onConnect } = useConnection();
  // Local state mirrors localStorage so toggles re-render immediately.
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      DEMO_SUBSYSTEMS.map((s) => [
        s.identifier,
        isDemoSubsystemEnabled(s.identifier),
      ]),
    ),
  );
  const [reconnecting, setReconnecting] = useState(false);

  const toggle = (identifier: string) => {
    const next = !enabled[identifier];
    setDemoSubsystemEnabled(identifier, next);
    setEnabled((prev) => ({ ...prev, [identifier]: next }));
  };

  const reconnect = async () => {
    setReconnecting(true);
    try {
      await onConnect("demo");
    } finally {
      setReconnecting(false);
    }
  };

  return (
    <div className="glass-card p-5 mb-6 border border-[var(--color-electric)]/30">
      <div className="flex items-center gap-3 mb-1">
        <IconFlask size={18} className="text-[var(--color-electric)]" />
        <h2 className="text-sm font-medium text-[var(--color-text)]">
          {t("Demo: Subsystem Toggles")}
        </h2>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-4">
        {t(
          "Enable or disable each subsystem the demo keyboard advertises, then reconnect to apply. Turn on Fast Keymap to test the fast keymap-loading path.",
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {DEMO_SUBSYSTEMS.map((s) => (
          <label
            key={s.identifier}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)] cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={enabled[s.identifier] ?? false}
              onChange={() => toggle(s.identifier)}
              className="w-4 h-4 rounded accent-[var(--color-electric)] flex-shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-xs font-medium text-[var(--color-text)] truncate">
                {s.label}
              </span>
              <span className="block text-[10px] font-mono text-[var(--color-text-muted)] truncate">
                {s.identifier}
              </span>
            </span>
          </label>
        ))}
      </div>

      <ResponsiveButton
        label={reconnecting ? t("Reconnecting...") : t("Reconnect to apply")}
        className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
        onClick={reconnect}
        disabled={reconnecting}
      >
        <IconRefresh size={16} className={reconnecting ? "animate-spin" : ""} />
      </ResponsiveButton>
    </div>
  );
}

interface SubsystemCardProps {
  subsystem: Subsystem;
  onLinkClick: (url: string) => void;
}

function SubsystemCard({ subsystem, onLinkClick }: SubsystemCardProps) {
  const { t } = useLanguage();
  return (
    <div className="glass-card p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--color-cyber)]/10 border border-[var(--color-cyber)]/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-mono text-[var(--color-cyber)]">
            {subsystem.index}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)] font-mono break-all">
            {subsystem.identifier}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {t("Subsystem index: {{index}}", {
              index: subsystem.index,
            })}
          </p>
        </div>
      </div>

      {subsystem.uiUrl.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            {t("Web UI")}
          </p>
          {subsystem.uiUrl.map((url, urlIndex) => (
            <button
              key={urlIndex}
              className="flex items-center gap-2 text-sm text-[var(--color-electric)] hover:text-[var(--color-neon)] transition-colors group w-full text-left"
              onClick={() => onLinkClick(url)}
            >
              <IconExternalLink
                size={14}
                className="flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              />
              <span className="underline break-all">{url}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          {t("No web UI available for this subsystem.")}
        </p>
      )}
    </div>
  );
}

export function CustomSubsystemsPage() {
  const { t } = useLanguage();
  const zmkApp = useContext(ZMKAppContext);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const isDemo = zmkApp?.state.connection?.label === "Demo";
  const subsystems = zmkApp?.state.customSubsystems?.subsystems ?? [];
  const unsupportedSubsystems = subsystems.filter(
    (subsystem) => !SUPPORTED_SUBSYSTEM_IDENTIFIERS.has(subsystem.identifier),
  );
  const supportedSubsystems = subsystems.filter((subsystem) =>
    SUPPORTED_SUBSYSTEM_IDENTIFIERS.has(subsystem.identifier),
  );

  const navigate = (url: string) => {
    zmkApp?.disconnect();
    navigateTo(url);
  };

  const handleLinkClick = (url: string) => {
    const trusted = getTrustedUrls();
    if (trusted.has(url)) {
      navigate(url);
    } else {
      setPendingUrl(url);
    }
  };

  const handleConfirm = (dontShowAgain: boolean) => {
    if (pendingUrl) {
      if (dontShowAgain) {
        saveTrustedUrl(pendingUrl);
      }
      navigate(pendingUrl);
    }
    setPendingUrl(null);
  };

  const handleCancel = () => {
    setPendingUrl(null);
  };

  return (
    <div className="app-page p-4 sm:p-6 h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="shrink-0 p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20">
            <IconPuzzle size={24} className="text-[var(--color-electric)]" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-[var(--color-text)]">
              {t("Custom Subsystems")}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t(
                "Available custom firmware subsystems and their web interfaces",
              )}
            </p>
          </div>
        </div>

        {/* Demo-only: per-subsystem enable/disable toggles */}
        {isDemo && <DemoSubsystemToggles />}

        {/* Subsystem list */}
        {subsystems.length > 0 ? (
          <>
            {unsupportedSubsystems.length > 0 ? (
              <div className="space-y-4">
                {unsupportedSubsystems.map((subsystem) => (
                  <SubsystemCard
                    key={subsystem.index}
                    subsystem={subsystem}
                    onLinkClick={handleLinkClick}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card p-6">
                <p className="text-sm text-[var(--color-text-muted)]">
                  {t(
                    "All custom subsystems reported by this device are already supported by DYA Studio.",
                  )}
                </p>
              </div>
            )}

            {supportedSubsystems.length > 0 && (
              <div className="mt-4">
                <SectionCard
                  icon={
                    <IconPuzzle
                      size={20}
                      className="text-[var(--color-electric)]"
                    />
                  }
                  title={t("Already supported by DYA Studio")}
                  subtitle={t(
                    "These subsystems have a dedicated UI elsewhere in DYA Studio",
                  )}
                >
                  <div className="space-y-4">
                    {supportedSubsystems.map((subsystem) => (
                      <SubsystemCard
                        key={subsystem.index}
                        subsystem={subsystem}
                        onLinkClick={handleLinkClick}
                      />
                    ))}
                  </div>
                </SectionCard>
              </div>
            )}
          </>
        ) : (
          <div className="glass-card p-6">
            <p className="text-sm text-[var(--color-text-muted)]">
              {t(
                "No custom subsystems available. Custom subsystems are provided by the keyboard firmware.",
              )}
            </p>
          </div>
        )}

        {/* Info box */}
        <div className="mt-8 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)]">
          <p className="text-xs text-[var(--color-text-muted)]">
            {t(
              "Custom subsystems are additional features provided by your keyboard firmware author. Web UI links open external pages supplied by the firmware metadata.",
            )}
          </p>
        </div>
      </div>

      {/* External link warning dialog */}
      {pendingUrl && (
        <ExternalLinkWarningDialog
          url={pendingUrl}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
