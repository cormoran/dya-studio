import { useState, useContext, useMemo } from "react";
import {
  IconPlugConnected,
  IconBluetooth,
  IconLink,
  IconLinkOff,
  IconEdit,
  IconCheck,
  IconX,
  IconUsb,
  IconRefresh,
  IconAlertTriangle,
  IconAlertTriangleFilled,
} from "@tabler/icons-react";
import { useBLEProfiles } from "../hooks/useBLEProfiles";
import { ResetVersionMenu } from "../components/versionHistory/ResetVersionMenu";
import { VersionDiffModal } from "../components/versionHistory/VersionDiffModal";
import { useConnectionVersionHistory } from "../hooks/versionHistory/useConnectionVersionHistory";
import { useOsDetection } from "../hooks/useOsDetection";
import { useDefaultLayer } from "../hooks/useDefaultLayer";
import { useLayerNames, layerLabel } from "../hooks/useLayerNames";
import { ConnectionContext } from "../components/DeviceConnection";
import { OutputPriority } from "../proto/zmk/ble_management/ble_management";
import { Os } from "../proto/cormoran/os_detection/os_detection";
import { useLanguage } from "../hooks/useLanguage";
import { OsBadge } from "../components/OsBadge";
import { LayerSelect } from "../components/LayerSelect";
import { InfoTip } from "../components/InfoTip";
import { DocTip } from "../components/DocTip";
import { defaultLayerDoc } from "../i18n/featureDocs";
import { LoadingIndicator } from "../components/LoadingIndicator";
import {
  mergeConnectionCards,
  ZMK_OS_VALUES,
  zmkOsToProtoOs,
  osLabel,
} from "../lib/osDetection";

const OVERRIDE_OPTIONS: Os[] = [
  Os.OS_UNSPECIFIED,
  Os.OS_WINDOWS,
  Os.OS_MACOS,
  Os.OS_LINUX,
  Os.OS_IOS,
  Os.OS_ANDROID,
];

export function ConnectionPage() {
  const { t } = useLanguage();
  const connection = useContext(ConnectionContext);
  const bleProfiles = useBLEProfiles();
  const {
    isAvailable,
    profiles,
    isLoading,
    error,
    outputPriority,
    switchProfile,
    unpairProfile,
    setProfileName,
    loadProfiles,
    getOutputPriority,
    setOutputPriority,
  } = bleProfiles;

  const osDetection = useOsDetection();
  const defaultLayer = useDefaultLayer();
  const { layerNames, load: loadLayerNames } = useLayerNames();

  // Version history. Both domains write straight through to persistent
  // storage, so there is nothing to discard and no firmware-default RPC —
  // the menu offers the captured versions only.
  const profilesRead = !isAvailable || (!isLoading && outputPriority !== null);
  const layersRead = !defaultLayer.isAvailable || defaultLayer.state !== null;
  const versionHistory = useConnectionVersionHistory({
    bleProfiles,
    defaultLayer,
    isLoaded: profilesRead && layersRead,
    t,
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [showOutputPriorityWarning, setShowOutputPriorityWarning] =
    useState(false);
  const [pendingOutputPriority, setPendingOutputPriority] =
    useState<OutputPriority | null>(null);

  const startEditing = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditName(currentName);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditName("");
  };

  const saveProfileName = async (index: number) => {
    await setProfileName(index, editName);
    setEditingIndex(null);
    setEditName("");
  };

  const handleUnpair = async (index: number) => {
    if (confirm(t("Are you sure you want to unpair this device?"))) {
      await unpairProfile(index);
    }
  };

  const handleSwitch = async (index: number) => {
    await switchProfile(index);
  };

  const handleOutputPriorityChange = (priority: OutputPriority) => {
    setPendingOutputPriority(priority);
    setShowOutputPriorityWarning(true);
  };

  const confirmOutputPriorityChange = async () => {
    if (pendingOutputPriority !== null) {
      await setOutputPriority(pendingOutputPriority);
      setShowOutputPriorityWarning(false);
      setPendingOutputPriority(null);
    }
  };

  const cancelOutputPriorityChange = () => {
    setShowOutputPriorityWarning(false);
    setPendingOutputPriority(null);
  };

  const reload = async () => {
    await Promise.all([
      loadProfiles(),
      getOutputPriority(),
      osDetection.load(),
      defaultLayer.load(),
      loadLayerNames(),
    ]);
    // A completed read is when a new version may be worth keeping.
    await versionHistory.capture();
  };

  const cards = useMemo(
    () =>
      mergeConnectionCards({
        bleProfiles: profiles,
        defaultLayerEndpoints: defaultLayer.state?.endpoints,
        osDetectionBleProfiles: osDetection.state?.bleProfiles,
      }),
    [profiles, defaultLayer.state?.endpoints, osDetection.state?.bleProfiles],
  );

  const showStatusStrip = osDetection.isAvailable || defaultLayer.isAvailable;

  const currentOs =
    osDetection.state?.currentEffective ??
    (defaultLayer.state ? zmkOsToProtoOs(defaultLayer.state.currentOs) : null);

  const activeConnectionLabel = (() => {
    const activeBleProfile = profiles.find((p) => p.isActive);
    if (activeBleProfile) {
      return (
        activeBleProfile.name ||
        t("Profile {{index}}", { index: activeBleProfile.index })
      );
    }
    if (osDetection.state?.usb?.connected) {
      return "USB";
    }
    const activeOsProfile = osDetection.state?.bleProfiles.find(
      (p) => p.index === osDetection.state?.activeProfileIndex,
    );
    if (activeOsProfile) {
      return t("BLE profile {{index}}", { index: activeOsProfile.index });
    }
    return t("Unknown");
  })();

  const resolvedLayerLabel =
    defaultLayer.state && defaultLayer.state.resolvedLayer >= 0
      ? layerLabel(layerNames, defaultLayer.state.resolvedLayer)
      : t("Not set");

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col tablet:flex-row tablet:items-center gap-3 mb-8">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-[var(--color-cyber)]/10 border border-[var(--color-cyber)]/20">
              <IconPlugConnected
                size={24}
                className="text-[var(--color-cyber)]"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-medium text-[var(--color-text)]">
                {t("Connection")}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("Manage connections, default layers and OS detection")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {/* Refresh Button */}
            {connection.isConnected && (
              <>
                <button
                  className="btn-ghost flex items-center gap-2"
                  onClick={() => void reload()}
                  disabled={isLoading}
                  aria-label={t("Refresh profiles")}
                >
                  <IconRefresh
                    size={16}
                    className={isLoading ? "animate-spin" : ""}
                  />
                  {t("Refresh")}
                </button>
                <ResetVersionMenu
                  label={t("Versions")}
                  versions={versionHistory.versions}
                  onSelectVersion={versionHistory.selectVersion}
                  disabled={isLoading}
                  isBusy={versionHistory.isBusy}
                />
              </>
            )}
          </div>
        </div>

        {!isAvailable && !isLoading && !error && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)] flex items-start gap-3">
            <div className="p-2">
              <IconAlertTriangleFilled size={24} className="text-red-500" />
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t(
                "BLE management subsystem is not available for your keyboard.",
              )}
              <br />
              {t("Make sure your firmware has the {{module}} enabled.", {
                module: "cormoran/zmk-module-ble-management",
              })}
              <a
                href="https://github.com/cormoran/zmk-module-ble-management"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-electric)] underline mx-1"
              >
                cormoran/zmk-module-ble-management
              </a>
            </p>
          </div>
        )}

        {/* Show error if any */}
        {error && (
          <div className="glass-card p-4 mb-4 border-red-500/20 bg-red-500/10">
            <p className="text-sm text-red-400">⚠️ {t(error)}</p>
          </div>
        )}

        {/* Status Strip */}
        {connection.isConnected && showStatusStrip && currentOs !== null && (
          <div className="glass-card p-4 mb-6 grid grid-cols-1 tablet:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">
                {t("Current OS")}
              </p>
              <OsBadge os={currentOs} />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">
                {t("Active Connection")}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {activeConnectionLabel}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">
                {t("Resolved Default Layer")}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {resolvedLayerLabel}
              </p>
            </div>
          </div>
        )}

        {/* Output Priority Section */}
        {isAvailable && connection.isConnected && (
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium text-[var(--color-text)]">
                    {t("Output Priority")}
                  </h3>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t(
                    "Choose whether USB or Bluetooth is used for keystrokes when both are connected.",
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    outputPriority === OutputPriority.OUTPUT_PRIORITY_USB
                      ? "bg-[var(--color-electric)]/20 border border-[var(--color-electric)]/40"
                      : "bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                  }`}
                  onClick={() =>
                    handleOutputPriorityChange(
                      OutputPriority.OUTPUT_PRIORITY_USB,
                    )
                  }
                  disabled={isLoading}
                >
                  <IconUsb
                    size={16}
                    className={
                      outputPriority === OutputPriority.OUTPUT_PRIORITY_USB
                        ? "text-[var(--color-electric)]"
                        : "text-[var(--color-text-muted)]"
                    }
                  />
                  <span
                    className={`text-sm ${
                      outputPriority === OutputPriority.OUTPUT_PRIORITY_USB
                        ? "text-[var(--color-electric)] font-medium"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    USB
                  </span>
                  {outputPriority === OutputPriority.OUTPUT_PRIORITY_USB && (
                    <IconCheck size={14} className="text-[var(--color-neon)]" />
                  )}
                </button>
                <button
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    outputPriority === OutputPriority.OUTPUT_PRIORITY_BLE
                      ? "bg-[var(--color-cyber)]/20 border border-[var(--color-cyber)]/40"
                      : "bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                  }`}
                  onClick={() =>
                    handleOutputPriorityChange(
                      OutputPriority.OUTPUT_PRIORITY_BLE,
                    )
                  }
                  disabled={isLoading}
                >
                  <IconBluetooth
                    size={16}
                    className={
                      outputPriority === OutputPriority.OUTPUT_PRIORITY_BLE
                        ? "text-[var(--color-cyber)]"
                        : "text-[var(--color-text-muted)]"
                    }
                  />
                  <span
                    className={`text-sm ${
                      outputPriority === OutputPriority.OUTPUT_PRIORITY_BLE
                        ? "text-[var(--color-cyber)] font-medium"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    BLE
                  </span>
                  {outputPriority === OutputPriority.OUTPUT_PRIORITY_BLE && (
                    <IconCheck size={14} className="text-[var(--color-neon)]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Connections Section */}
        {connection.isConnected && (
          <>
            {isAvailable && isLoading && profiles.length === 0 && (
              <LoadingIndicator
                className="mb-4"
                label={t("Loading profiles...")}
              />
            )}

            {cards.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="text-sm font-medium text-[var(--color-text)]">
                    {t("Connections")}
                  </h3>
                  {defaultLayer.isAvailable && (
                    <DocTip content={defaultLayerDoc(t)} />
                  )}
                </div>
                {defaultLayer.isAvailable && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t(
                      "Set a default layer for each connection target. The layer switches automatically when that connection becomes active.",
                    )}{" "}
                    {t(
                      "Choosing 'Follow OS detection' applies the Per-OS Default Layers settings below.",
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4 mb-6">
              {cards.map((card) => {
                if (card.isUsb) {
                  const usbState = osDetection.state?.usb;
                  const usbEndpoint = defaultLayer.state?.endpoints.find(
                    (e) => e.isUsb,
                  );
                  return (
                    <div key="usb" className="glass-card p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-border)] border border-[var(--color-border-hover)]">
                            <IconUsb
                              size={18}
                              className="text-[var(--color-text-muted)]"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                              USB
                            </p>
                            {usbState && (
                              <p className="text-xs text-[var(--color-text-muted)]">
                                {usbState.connected
                                  ? t("Connected")
                                  : t("Not connected")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      {((osDetection.isAvailable && usbState) ||
                        (defaultLayer.isAvailable && usbEndpoint)) && (
                        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex flex-col tablet:flex-row gap-4">
                          {defaultLayer.isAvailable && usbEndpoint && (
                            <div className="flex-1">
                              <p className="text-xs text-[var(--color-text-muted)] mb-1">
                                {t("Default Layer")}
                              </p>
                              <LayerSelect
                                value={usbEndpoint.value}
                                layerCount={defaultLayer.state?.layerCount ?? 0}
                                layerNames={layerNames}
                                allowOsDetection
                                disabled={defaultLayer.isLoading}
                                aria-label={t("{{connection}} default layer", {
                                  connection: "USB",
                                })}
                                onChange={(value) =>
                                  defaultLayer.setEndpointLayer(
                                    usbEndpoint.index,
                                    value,
                                  )
                                }
                              />
                            </div>
                          )}
                          {osDetection.isAvailable && usbState && (
                            <div className="flex-1">
                              <p className="text-xs text-[var(--color-text-muted)] mb-1 flex items-center gap-1">
                                {t("OS")}
                                <InfoTip
                                  text={t(
                                    "The OS is detected automatically from how the host communicates (heuristic).",
                                  )}
                                />
                              </p>
                              <OsBadge os={usbState.detected} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                const profile = profiles.find(
                  (p) => p.index === card.bleProfileIndex,
                );
                const osProfile = osDetection.state?.bleProfiles.find(
                  (p) => p.index === card.bleProfileIndex,
                );
                const endpoint = defaultLayer.state?.endpoints.find(
                  (e) => !e.isUsb && e.bleProfileIndex === card.bleProfileIndex,
                );
                const isPaired = profile
                  ? !profile.isOpen
                  : !!osProfile?.bonded;

                if (profile) {
                  // Full ble-management card, extended with OS/layer controls.
                  return (
                    <div
                      key={`ble-${card.bleProfileIndex}`}
                      className={`glass-card p-4 ${
                        profile.isActive
                          ? "border-[var(--color-cyber)]/40 bg-[var(--color-cyber)]/5"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              profile.isActive
                                ? "bg-[var(--color-cyber)]/20 border border-[var(--color-cyber)]/40"
                                : "bg-[var(--color-border)] border border-[var(--color-border-hover)]"
                            }`}
                          >
                            <span
                              className={`text-sm font-mono ${
                                profile.isActive
                                  ? "text-[var(--color-cyber)]"
                                  : "text-[var(--color-text-muted)]"
                              }`}
                            >
                              {profile.index}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            {editingIndex === profile.index ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder={t("Device name")}
                                  maxLength={31} // ZMK firmware constraint for BLE name storage
                                  className="input-field flex-1 tablet:text-sm text-base"
                                  disabled={isLoading}
                                />
                                <button
                                  className="btn-ghost p-2"
                                  onClick={() => saveProfileName(profile.index)}
                                  disabled={isLoading}
                                  aria-label={t("Save name")}
                                >
                                  <IconCheck size={16} />
                                </button>
                                <button
                                  className="btn-ghost p-2"
                                  onClick={cancelEditing}
                                  disabled={isLoading}
                                  aria-label={t("Cancel editing")}
                                >
                                  <IconX size={16} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <p
                                    className="text-sm font-medium text-[var(--color-text-secondary)] truncate max-w-[12rem]"
                                    title={
                                      profile.name ||
                                      t("Profile {{index}}", {
                                        index: profile.index,
                                      })
                                    }
                                  >
                                    {profile.name ||
                                      t("Profile {{index}}", {
                                        index: profile.index,
                                      })}
                                  </p>
                                  {!profile.isOpen && (
                                    <button
                                      className="btn-ghost p-1 opacity-50 hover:opacity-100"
                                      onClick={() =>
                                        startEditing(
                                          profile.index,
                                          profile.name,
                                        )
                                      }
                                      disabled={isLoading}
                                      aria-label={t("Edit name")}
                                    >
                                      <IconEdit size={14} />
                                    </button>
                                  )}
                                </div>
                                <div className="flex flex-wrap">
                                  {profile.isOpen ? (
                                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                                      {t("Not paired")}
                                    </p>
                                  ) : profile.isConnected ? (
                                    <>
                                      <span className="text-xs text-[var(--color-text-muted)] pr-1">
                                        {t("Connected")}
                                      </span>
                                      {profile.address && (
                                        <span className="text-xs text-[var(--color-text-muted)] block tablet:inline truncate">
                                          {profile.address}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                                      {profile.address || t("No address")}
                                    </p>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {editingIndex != profile.index && (
                          <div className="flex items-center gap-2">
                            {!profile.isOpen && (
                              <button
                                className="btn-ghost text-sm flex items-center gap-1.5 text-red-400 hover:text-red-300"
                                onClick={() => handleUnpair(profile.index)}
                                disabled={isLoading}
                              >
                                <IconLinkOff size={16} />
                                <span className="hidden tablet:inline">
                                  {t("Unpair")}
                                </span>
                              </button>
                            )}
                            {!profile.isActive ? (
                              <button
                                className="btn-ghost text-sm flex items-center gap-1.5"
                                onClick={() => handleSwitch(profile.index)}
                                disabled={isLoading}
                              >
                                <IconLink size={16} />
                                <span className="hidden tablet:inline">
                                  {t("Switch")}
                                </span>
                              </button>
                            ) : (
                              <button
                                className="btn-ghost text-sm flex items-center gap-1.5"
                                disabled
                                aria-disabled="true"
                                tabIndex={-1}
                              >
                                <IconLink
                                  size={16}
                                  className="text-[var(--color-cyber)]"
                                />
                                <span className="hidden tablet:inline text-[var(--color-cyber)] font-semibold">
                                  {t("Active")}
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {(osDetection.isAvailable && !profile.isOpen) ||
                      (defaultLayer.isAvailable && endpoint) ? (
                        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex flex-col tablet:flex-row gap-4">
                          {defaultLayer.isAvailable && endpoint && (
                            <div className="flex-1">
                              <p className="text-xs text-[var(--color-text-muted)] mb-1">
                                {t("Default Layer")}
                              </p>
                              <LayerSelect
                                value={endpoint.value}
                                layerCount={defaultLayer.state?.layerCount ?? 0}
                                layerNames={layerNames}
                                allowOsDetection
                                disabled={defaultLayer.isLoading}
                                aria-label={t("{{connection}} default layer", {
                                  connection: card.label,
                                })}
                                onChange={(value) =>
                                  defaultLayer.setEndpointLayer(
                                    endpoint.index,
                                    value,
                                  )
                                }
                              />
                            </div>
                          )}
                          {osDetection.isAvailable &&
                            !profile.isOpen &&
                            osProfile && (
                              <div className="flex-1">
                                <p className="text-xs text-[var(--color-text-muted)] mb-1 flex items-center gap-1">
                                  {t("OS")}
                                  <InfoTip
                                    text={t(
                                      "The OS is detected automatically from how the host communicates (heuristic). If detection is wrong, select the correct OS here to override it for this connection.",
                                    )}
                                  />
                                </p>
                                <select
                                  className="select-field text-sm w-full tablet:w-56"
                                  value={osProfile.override}
                                  disabled={osDetection.isLoading}
                                  aria-label={t("{{connection}} OS override", {
                                    connection: card.label,
                                  })}
                                  onChange={(e) =>
                                    osDetection.setBleOverride(
                                      profile.index,
                                      Number.parseInt(e.target.value, 10) as Os,
                                    )
                                  }
                                >
                                  {OVERRIDE_OPTIONS.map((os) => (
                                    <option key={os} value={os}>
                                      {os === Os.OS_UNSPECIFIED
                                        ? t("Auto: {{os}}", {
                                            os: t(osLabel(osProfile.detected)),
                                          })
                                        : t(osLabel(os))}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                // ble-management unavailable/missing this profile: simple row
                // derived from default-layer / os-detection so config still works.
                return (
                  <div
                    key={`ble-${card.bleProfileIndex}`}
                    className="glass-card p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-border)] border border-[var(--color-border-hover)]">
                          <IconBluetooth
                            size={18}
                            className="text-[var(--color-text-muted)]"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                            {card.label}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {isPaired ? t("Connected") : t("Not paired")}
                          </p>
                        </div>
                      </div>
                      {osDetection.isAvailable && osProfile && (
                        <OsBadge os={osProfile.effective} />
                      )}
                    </div>
                    {defaultLayer.isAvailable && endpoint && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                        <p className="text-xs text-[var(--color-text-muted)] mb-1">
                          {t("Default Layer")}
                        </p>
                        <LayerSelect
                          value={endpoint.value}
                          layerCount={defaultLayer.state?.layerCount ?? 0}
                          layerNames={layerNames}
                          allowOsDetection
                          disabled={defaultLayer.isLoading}
                          aria-label={t("{{connection}} default layer", {
                            connection: card.label,
                          })}
                          onChange={(value) =>
                            defaultLayer.setEndpointLayer(endpoint.index, value)
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Per-OS Default Layers Section */}
        {connection.isConnected && defaultLayer.isAvailable && (
          <div className="glass-card p-6 mb-6">
            <h3 className="text-sm font-medium text-[var(--color-text)] mb-1">
              {t("Per-OS Default Layers")}
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              {t(
                "Applied when a connection's default layer is set to 'Follow OS detection'. The layer configured for the detected OS is used.",
              )}
            </p>
            {defaultLayer.state?.osDetectionAvailable === false && (
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                {t("OS detection is not enabled in this firmware build.")}{" "}
                <a
                  href="https://github.com/cormoran/zmk-feature-os-detection"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-electric)] underline"
                >
                  cormoran/zmk-feature-os-detection
                </a>
              </p>
            )}
            <div className="space-y-3">
              {ZMK_OS_VALUES.map((zmkOs) => {
                const entry = defaultLayer.state?.osLayers.find(
                  (o) => o.os === zmkOs,
                );
                const protoOs = zmkOsToProtoOs(zmkOs);
                const isCurrent = defaultLayer.state?.currentOs === zmkOs;
                return (
                  <div
                    key={zmkOs}
                    className={`flex items-center justify-between gap-4 p-2 rounded-lg border ${
                      isCurrent
                        ? "bg-[var(--color-electric)]/10 border-[var(--color-electric)]/20"
                        : "border-transparent"
                    }`}
                  >
                    <OsBadge os={protoOs} />
                    <LayerSelect
                      value={entry?.value ?? -1}
                      layerCount={defaultLayer.state?.layerCount ?? 0}
                      layerNames={layerNames}
                      disabled={
                        defaultLayer.isLoading ||
                        defaultLayer.state?.osDetectionAvailable === false
                      }
                      aria-label={t("{{os}} default layer", {
                        os: t(osLabel(protoOs)),
                      })}
                      onChange={(value) =>
                        defaultLayer.setOsLayer(zmkOs, value)
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {connection.isConnected && !defaultLayer.isAvailable && (
          <div className="glass-card p-6 mb-6">
            <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">
              {t("Per-OS Default Layers")}
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("Default layer subsystem is not available for your keyboard.")}{" "}
              <a
                href="https://github.com/cormoran/zmk-feature-default-layer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-electric)] underline"
              >
                cormoran/zmk-feature-default-layer
              </a>
            </p>
          </div>
        )}

        {/* Help Box */}
        <div className="mt-8 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)]">
          <p className="text-xs text-[var(--color-text-muted)]">
            {t(
              "BLE OS detection is heuristic and may flap right after connecting. If detection is wrong, set a per-profile override above.",
            )}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            {t("Related modules:")}{" "}
            <a
              href="https://github.com/cormoran/zmk-module-ble-management"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-electric)] underline"
            >
              zmk-module-ble-management
            </a>
            {", "}
            <a
              href="https://github.com/cormoran/zmk-feature-os-detection"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-electric)] underline"
            >
              zmk-feature-os-detection
            </a>
            {", "}
            <a
              href="https://github.com/cormoran/zmk-feature-default-layer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-electric)] underline"
            >
              zmk-feature-default-layer
            </a>
          </p>
        </div>

        {/* Output Priority Warning Dialog */}
        {showOutputPriorityWarning && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass-card p-6 max-w-md mx-4 border-yellow-500/20 bg-[var(--color-surface)]">
              <div className="flex items-start gap-3 mb-4">
                <IconAlertTriangle
                  size={24}
                  className="text-yellow-500 flex-shrink-0 mt-0.5"
                />
                <div>
                  <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
                    {t("Change Output Priority?")}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                    {t(
                      "Changing the output priority may disconnect DYA Studio from your keyboard.",
                    )}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {t("You will need to reconnect manually after the change.")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  className="btn-ghost text-sm px-4 py-2"
                  onClick={cancelOutputPriorityChange}
                  disabled={isLoading}
                >
                  {t("Cancel")}
                </button>
                <button
                  className="btn-electric text-sm px-4 py-2"
                  onClick={confirmOutputPriorityChange}
                  disabled={isLoading}
                >
                  {t("Continue")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Restore-a-version diff modal (opened from the versions dropdown) */}
      <VersionDiffModal
        {...versionHistory.diffModalProps}
        labeler={versionHistory.labeler}
      />
    </div>
  );
}
