import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { createPortal } from "react-dom";
import {
  IconSettings,
  IconChevronDown,
  IconAlertTriangleFilled,
  IconAlertTriangle,
  IconTrash,
  IconLoader2,
} from "@tabler/icons-react";
import * as Dialog from "@radix-ui/react-dialog";
import { AdvancedSettingsSection } from "../components/AdvancedSettingsSection";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { ConnectionContext } from "../components/DeviceConnection";
import { useSettings } from "../hooks/useSettings";
import { useResetSettings } from "../hooks/useResetSettings";
import { useDebouncedMemoryWrite } from "../hooks/useDebouncedMemoryWrite";
import { useLanguage } from "../hooks/useLanguage";
import { ResetVersionMenu } from "../components/versionHistory/ResetVersionMenu";
import { VersionDiffModal } from "../components/versionHistory/VersionDiffModal";
import { useSettingsVersionHistory } from "../hooks/versionHistory/useSettingsVersionHistory";

// Helper to format milliseconds to human readable
function formatMs(
  ms: number,
  t: (key: string, params?: Record<string, number | string>) => string,
): string {
  if (ms === 0) return t("Never");
  if (ms < 60000) return t("{{count}}s", { count: ms / 1000 });
  if (ms < 3600000) return t("{{count}}m", { count: ms / 60000 });
  return t("{{count}}h", { count: ms / 3600000 });
}

// Convert milliseconds to minutes
function msToMinutes(ms: number): number {
  return ms / 60000;
}

// Convert minutes to milliseconds
function minutesToMs(minutes: number): number {
  return minutes * 60000;
}

// Preset time options in minutes
const IDLE_PRESETS = [
  { value: 0, label: "Never" },
  { value: 0.5, label: "30 seconds" },
  { value: 1, label: "1 minute" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 30, label: "30 minutes" },
];

const SLEEP_PRESETS = [
  { value: 0, label: "Never" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
];

interface TimeDropdownProps {
  value: number; // in milliseconds
  onChange: (ms: number) => void;
  presets: { value: number; label: string }[];
}

function TimeDropdown({ value, onChange, presets }: TimeDropdownProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const valueInMinutes = msToMinutes(value);
  const matchingPreset = presets.find((p) => p.value === valueInMinutes);
  const displayText =
    (matchingPreset && t(matchingPreset.label)) ||
    t("{{value}} min", { value: valueInMinutes });

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Align dropdown to the right edge of the button
      // Dropdown width is 192px (w-48)
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.right - 192, // 192px = w-48
      });
    }
  }, [isOpen]);

  // Handle clicks outside dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      // Check if click is outside both button and dropdown
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        if (showCustomInput) {
          setShowCustomInput(false);
          setCustomInput("");
        } else {
          setIsOpen(false);
        }
      }
    };

    // Use capture phase to ensure we catch the event before other handlers
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isOpen, showCustomInput]);

  const handlePresetSelect = (minutes: number) => {
    onChange(minutesToMs(minutes));
    setIsOpen(false);
    setShowCustomInput(false);
  };

  const handleCustomSubmit = () => {
    const minutes = parseFloat(customInput);
    if (!isNaN(minutes) && minutes >= 0) {
      onChange(minutesToMs(minutes));
      setShowCustomInput(false);
      setIsOpen(false);
      setCustomInput("");
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="input-field w-40 text-sm flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{displayText}</span>
        <IconChevronDown size={16} className="text-[var(--color-text-muted)]" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-[9999] py-1"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            {presets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-border)] transition-colors ${
                  preset.value === valueInMinutes
                    ? "text-[var(--color-electric)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
                onClick={() => handlePresetSelect(preset.value)}
              >
                {t(preset.label)}
              </button>
            ))}
            <div className="border-t border-[var(--color-border)] mt-1 pt-1">
              {!showCustomInput ? (
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
                  onClick={() => setShowCustomInput(true)}
                >
                  {t("Custom value...")}
                </button>
              ) : (
                <div className="px-4 py-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="input-field w-20 text-sm text-center"
                      placeholder="0"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCustomSubmit();
                        }
                      }}
                      autoFocus
                    />
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {t("min")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 px-2 py-1 text-xs rounded bg-[var(--color-electric)] text-[var(--color-bg)] hover:bg-[var(--color-electric)]/80"
                      onClick={handleCustomSubmit}
                    >
                      {t("Set")}
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-2 py-1 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomInput("");
                      }}
                    >
                      {t("Cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function SettingsPage() {
  const { t } = useLanguage();
  const connection = useContext(ConnectionContext);
  const settings = useSettings();
  const { isAvailable, devices, isLoading, error, setActivitySettings } =
    settings;
  const {
    resetAllSettings,
    isResetting,
    error: resetError,
    clearError: clearResetError,
  } = useResetSettings();

  // Confirmation modal for the full "reset all settings" action.
  const [showResetAllDialog, setShowResetAllDialog] = useState(false);

  // Version history over the power-management timeouts (what this tab reads
  // eagerly — Advanced Settings loads lazily and keeps its own controls).
  const versionHistory = useSettingsVersionHistory({
    settings,
    isLoaded: !isLoading && devices.length > 0,
    t,
  });

  const handleResetAll = useCallback(async () => {
    const ok = await resetAllSettings();
    if (ok) {
      setShowResetAllDialog(false);
    }
  }, [resetAllSettings]);

  // Get central device settings (source 0)
  const centralSettings = useMemo(
    () => devices.find((d) => d.sourceId === 0),
    [devices],
  );

  // Optimistic pending value shown while a debounced write is in flight. This
  // is a direct/persistent write-through (no memory tier), so there is no
  // discard/reset — the edit is auto-written after MEMORY_WRITE_DEBOUNCE_MS.
  const [pending, setPending] = useState<{
    idleMs: number;
    sleepMs: number;
  } | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    [],
  );

  const write = useCallback(
    async (value: { idleMs: number; sleepMs: number }) => {
      await setActivitySettings(value.idleMs, value.sleepMs);
      setPending(null);
      setShowSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
    },
    [setActivitySettings],
  );

  const { state: saveState, queue } = useDebouncedMemoryWrite(write);

  // Display values: prefer the in-flight pending edit, otherwise device state.
  const idleTimeout = pending?.idleMs ?? centralSettings?.idleMs ?? 0;
  const sleepTimeout = pending?.sleepMs ?? centralSettings?.sleepMs ?? 0;

  const handleIdleChange = (ms: number) => {
    const next = { idleMs: ms, sleepMs: sleepTimeout };
    setPending(next);
    setShowSaved(false);
    queue(next);
  };

  const handleSleepChange = (ms: number) => {
    const next = { idleMs: idleTimeout, sleepMs: ms };
    setPending(next);
    setShowSaved(false);
    queue(next);
  };

  const isSaving = saveState === "queued" || saveState === "saving";

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20">
            <IconSettings size={24} className="text-[var(--color-electric)]" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-[var(--color-text)]">
              {t("Settings")}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("Device configuration and power management")}
            </p>
          </div>
          {isAvailable && (
            <div className="ml-auto">
              <ResetVersionMenu
                versions={versionHistory.versions}
                onSelectVersion={versionHistory.selectVersion}
                isBusy={isResetting || versionHistory.isBusy}
                resetToDefault={{
                  description: t(
                    "Wipes every persisted setting on the keyboard — keymap included — back to the firmware defaults.",
                  ),
                  onSelect: () => {
                    clearResetError();
                    setShowResetAllDialog(true);
                  },
                  disabled: isResetting,
                }}
              />
            </div>
          )}
        </div>

        {!isAvailable && !isLoading && !error && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)] flex items-start gap-3">
            <div className="p-2">
              <IconAlertTriangleFilled size={24} className="text-red-500" />
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("Settings RPC subsystem is not available for your keyboard.")}
              <br />
              {t("Make sure your firmware has the {{module}} enabled.", {
                module: "cormoran/zmk-module-settings-rpc",
              })}
              <a
                href="https://github.com/cormoran/zmk-module-settings-rpc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-electric)] underline mx-1"
              >
                cormoran/zmk-module-settings-rpc
              </a>
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-400">{t(error)}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !centralSettings && (
          <LoadingIndicator label={t("Loading settings...")} />
        )}

        {/* Settings Groups */}
        {centralSettings ? (
          <div className="space-y-6">
            {/* Power Management */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-4">
                {t("Power Management")}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {t("Idle Timeout")}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {t("Time before keyboard enters idle mode")}
                    </p>
                  </div>
                  <TimeDropdown
                    value={idleTimeout}
                    onChange={handleIdleChange}
                    presets={IDLE_PRESETS}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {t("Sleep Timeout")}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {t("Time before entering deep sleep")}
                    </p>
                  </div>
                  <TimeDropdown
                    value={sleepTimeout}
                    onChange={handleSleepChange}
                    presets={SLEEP_PRESETS}
                  />
                </div>

                <div className="flex justify-end pt-2 h-4">
                  {isSaving ? (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {t("Saving...")}
                    </span>
                  ) : showSaved ? (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {t("Saved")}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Show all devices status - moved after inputs */}
              {devices.length > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-[var(--color-border)]">
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">
                    {t("Current Settings by Device")}:
                  </p>
                  <div className="space-y-1">
                    {devices.map((device) => (
                      <div
                        key={device.sourceId}
                        className="text-xs text-[var(--color-text-secondary)]"
                      >
                        <span className="font-mono">{device.deviceName}:</span>{" "}
                        {t("Idle: {{idle}}, Sleep: {{sleep}}", {
                          idle: formatMs(device.idleMs, t),
                          sleep: formatMs(device.sleepMs, t),
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <AdvancedSettingsSection />
          </div>
        ) : (
          !isLoading && (
            <div className="glass-card p-6">
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("Waiting for device connection...")}
              </p>
            </div>
          )
        )}

        {/* Danger Zone: a full factory reset that wipes every persisted
            setting — keymap and all custom settings included. Available
            whenever a device is connected, independent of the settings RPC
            subsystem, since it is a core-protocol call. */}
        {connection.isConnected && (
          <div className="glass-card p-6 border border-red-500/20 mt-6">
            <h3 className="text-sm font-medium text-red-400 mb-4">
              {t("Danger Zone")}
            </h3>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {t("Reset all settings")}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t(
                    "Erase every saved setting on the keyboard — including the keymap and all custom settings — and restore firmware defaults.",
                  )}
                </p>
              </div>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors flex items-center gap-2 flex-shrink-0"
                onClick={() => {
                  clearResetError();
                  setShowResetAllDialog(true);
                }}
                disabled={isResetting}
              >
                <IconTrash size={16} />
                {t("Reset all settings")}
              </button>
            </div>
            {resetError && (
              <p className="mt-3 text-xs text-red-400">{t(resetError)}</p>
            )}
          </div>
        )}
      </div>

      {/* Reset-all Confirmation Dialog */}
      <Dialog.Root
        open={showResetAllDialog}
        onOpenChange={(open) => {
          if (!open && !isResetting) setShowResetAllDialog(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-2xl z-50 p-6">
            <Dialog.Title className="text-base font-medium text-[var(--color-text)] mb-2 flex items-center gap-2">
              <IconAlertTriangle size={18} className="text-red-400" />
              {t("Reset all settings?")}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-[var(--color-text-muted)] mb-5">
              {t(
                "This erases every saved setting on your keyboard — the keymap and all custom settings — and restores firmware defaults. This cannot be undone.",
              )}
            </Dialog.Description>
            <div className="flex gap-3">
              <button
                className="flex-1 btn-ghost border border-[var(--color-border)]"
                onClick={() => setShowResetAllDialog(false)}
                disabled={isResetting}
              >
                {t("Cancel")}
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={() => void handleResetAll()}
                disabled={isResetting}
              >
                {isResetting && (
                  <IconLoader2 size={16} className="animate-spin" />
                )}
                {t("Reset all settings")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Restore-a-version diff modal (opened from the reset dropdown) */}
      <VersionDiffModal
        {...versionHistory.diffModalProps}
        labeler={versionHistory.labeler}
      />
    </div>
  );
}
