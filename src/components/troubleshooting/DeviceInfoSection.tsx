import { ResponsiveButton } from "../ResponsiveButton";
import { IconInfoCircle, IconRefresh } from "@tabler/icons-react";
import type { UseDeviceInfoReturn } from "../../hooks/useDeviceInfo";
import { useLanguage } from "../../hooks/useLanguage";
import {
  formatResetCause,
  formatUptime,
} from "../../lib/troubleshootingFormat";
import {
  NotAvailableNotice,
  SectionCard,
  SectionError,
  SectionSummaryBadge,
} from "./SectionCard";
import { LoadingIndicator } from "../LoadingIndicator";

const MODULE_NAME = "cormoran/zmk-feature-device-info";
const MODULE_URL = "https://github.com/cormoran/zmk-feature-device-info";

function InfoRow({
  label,
  value,
  dirty,
}: {
  label: string;
  value?: string;
  dirty?: boolean;
}) {
  const { t } = useLanguage();
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[var(--color-border)] last:border-b-0">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="text-xs text-[var(--color-text)] font-mono text-right break-all">
        {value}
        {dirty && <span className="text-amber-400 ml-1">({t("dirty")})</span>}
      </span>
    </div>
  );
}

export function DeviceInfoSection({
  deviceInfo,
}: {
  deviceInfo: UseDeviceInfoReturn;
}) {
  const { t } = useLanguage();
  const { isAvailable, info, isLoading, error, refresh } = deviceInfo;

  // Devices with an empty name are internal/hidden Zephyr devices that are
  // normally left uninitialized — exclude them from the list entirely.
  const namedDevices =
    info?.zephyrDevices.filter((d) => d.name.trim() !== "") ?? [];
  // Devices literally named "empty" always report as not ready, so keep them
  // visible in the list but exclude them from the "not ready" count and badge
  // so they don't inflate it with noise.
  const notReadyCount = namedDevices.filter(
    (d) => !d.ready && d.name.trim().toLowerCase() !== "empty",
  ).length;

  return (
    <SectionCard
      icon={
        <IconInfoCircle size={20} className="text-[var(--color-electric)]" />
      }
      title={t("Device Info")}
      subtitle={t("Build, hardware and runtime details reported by firmware")}
      summary={
        info &&
        (notReadyCount > 0 ? (
          <SectionSummaryBadge tone="red">
            {t("{{count}} devices not ready", { count: notReadyCount })}
          </SectionSummaryBadge>
        ) : (
          <SectionSummaryBadge tone="ok">{t("OK")}</SectionSummaryBadge>
        ))
      }
      actions={
        isAvailable && (
          <ResponsiveButton
            label={t("Refresh")}
            onClick={() => void refresh()}
            disabled={isLoading}
            className="btn-ghost flex items-center gap-2 text-sm"
            aria-label={t("Refresh device info")}
          >
            <IconRefresh
              size={14}
              className={isLoading ? "animate-spin" : ""}
            />
          </ResponsiveButton>
        )
      }
    >
      {!isAvailable ? (
        <NotAvailableNotice module={MODULE_NAME} moduleUrl={MODULE_URL} />
      ) : (
        <>
          {error && <SectionError message={error} />}

          {!info &&
            !error &&
            (isLoading ? (
              <LoadingIndicator variant="inline" label={t("Loading")} />
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("No data loaded yet.")}
              </p>
            ))}

          {info?.build && (
            <div className="mb-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                {t("Build")}
              </h3>
              <InfoRow
                label={t("ZMK Version")}
                value={info.build.zmkVersion}
                dirty={info.build.zmkDirty}
              />
              <InfoRow
                label={t("ZMK Config Version")}
                value={info.build.zmkConfigVersion}
                dirty={info.build.zmkConfigDirty}
              />
              <InfoRow
                label={t("Module Version")}
                value={info.build.moduleVersion}
                dirty={info.build.moduleDirty}
              />
              <InfoRow
                label={t("Zephyr Version")}
                value={info.build.zephyrVersion}
              />
              <InfoRow
                label={t("Build Timestamp")}
                value={info.build.buildTimestamp}
              />
              <InfoRow label={t("Board")} value={info.build.board} />
            </div>
          )}

          {info?.hardware && (
            <div className="mb-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                {t("Hardware")}
              </h3>
              <InfoRow label={t("Device ID")} value={info.hardware.deviceId} />
              <InfoRow
                label={t("Reset Cause")}
                value={formatResetCause(info.hardware.resetCause, t)}
              />
              <InfoRow
                label={t("Flash")}
                value={
                  info.hardware.flashSizeKb
                    ? `${info.hardware.flashSizeKb} KB`
                    : undefined
                }
              />
              <InfoRow
                label={t("SRAM")}
                value={
                  info.hardware.sramSizeKb
                    ? `${info.hardware.sramSizeKb} KB`
                    : undefined
                }
              />
            </div>
          )}

          {info?.zmkConfig && (
            <div className="mb-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                {t("ZMK Configuration")}
              </h3>
              <InfoRow
                label={t("KScan")}
                value={info.zmkConfig.kscanCompatible}
              />
              <InfoRow
                label={t("Split")}
                value={
                  info.zmkConfig.splitEnabled
                    ? info.zmkConfig.splitRole
                    : t("disabled")
                }
              />
              <InfoRow
                label={t("BLE")}
                value={
                  info.zmkConfig.bleEnabled
                    ? t("enabled ({{count}} profiles)", {
                        count: info.zmkConfig.bleProfileCount,
                      })
                    : t("disabled")
                }
              />
              <InfoRow
                label={t("USB")}
                value={info.zmkConfig.usbEnabled ? t("enabled") : t("disabled")}
              />
              <InfoRow
                label={t("Display")}
                value={
                  info.zmkConfig.displayEnabled ? t("enabled") : t("disabled")
                }
              />
              <InfoRow
                label={t("RGB Underglow")}
                value={
                  info.zmkConfig.rgbUnderglowEnabled
                    ? t("enabled")
                    : t("disabled")
                }
              />
              <InfoRow
                label={t("Backlight")}
                value={
                  info.zmkConfig.backlightEnabled ? t("enabled") : t("disabled")
                }
              />
              <InfoRow
                label={t("Battery Level")}
                value={
                  info.zmkConfig.batteryLevelEnabled
                    ? t("enabled")
                    : t("disabled")
                }
              />
            </div>
          )}

          {info?.runtime && (
            <div className="mb-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                {t("Runtime")}
              </h3>
              <InfoRow
                label={t("Uptime")}
                value={formatUptime(info.runtime.uptimeMs)}
              />
            </div>
          )}

          {namedDevices.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] flex items-center gap-2">
                {t("Zephyr Devices")}
                {notReadyCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] normal-case">
                    {t("{{count}} not ready", { count: notReadyCount })}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--color-neon)]/20 text-[var(--color-neon)] text-[10px] normal-case">
                    {t("all ready")}
                  </span>
                )}
              </summary>
              <div className="mt-2 space-y-1">
                {[...namedDevices]
                  .sort((a, b) => (a.ready === b.ready ? 0 : a.ready ? 1 : -1))
                  .map((dev, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 text-xs ${
                        dev.ready
                          ? "text-[var(--color-text-muted)]"
                          : "text-red-400"
                      }`}
                    >
                      <span>{dev.ready ? "✓" : "✗"}</span>
                      <span className="font-mono">{dev.name}</span>
                    </div>
                  ))}
              </div>
            </details>
          )}
        </>
      )}
    </SectionCard>
  );
}
