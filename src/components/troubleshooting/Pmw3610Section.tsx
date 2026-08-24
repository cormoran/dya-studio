import { useState } from "react";
import { IconMouse, IconRefresh } from "@tabler/icons-react";
import type { UsePmw3610Return } from "../../hooks/usePmw3610";
import { useLanguage } from "../../hooks/useLanguage";
import { formatHex } from "../../lib/troubleshootingFormat";
import {
  NotAvailableNotice,
  SectionCard,
  SectionError,
  SectionSummaryBadge,
} from "./SectionCard";
import { LoadingIndicator } from "../LoadingIndicator";
import { Pmw3610FrameViewer } from "./Pmw3610FrameViewer";

const DEFAULT_FRAME_SIDE = 22;

const MODULE_NAME = "cormoran/zmk-driver-pmw3610-with-custom-studio-rpc";
const MODULE_URL =
  "https://github.com/cormoran/zmk-driver-pmw3610-with-custom-studio-rpc";

// SQUAL thresholds for the one-line surface interpretation.
const SQUAL_POOR_SURFACE = 16;

function squalInterpretation(
  squal: number,
  t: (key: string) => string,
): { message: string; className: string } {
  if (squal === 0) {
    return {
      message: t("Sensor sees no surface — check the ball and lens."),
      className: "text-red-400",
    };
  }
  if (squal < SQUAL_POOR_SURFACE) {
    return {
      message: t("Poor tracking surface."),
      className: "text-amber-400",
    };
  }
  return {
    message: t("Surface tracking OK."),
    className: "text-green-400",
  };
}

export function Pmw3610Section({ pmw3610 }: { pmw3610: UsePmw3610Return }) {
  const { t } = useLanguage();
  const {
    isAvailable,
    devices,
    diagnostics,
    isLoading,
    error,
    refresh,
    readDiagnostics,
  } = pmw3610;
  const [frameSide, setFrameSide] = useState(DEFAULT_FRAME_SIDE);

  const hasInitError =
    devices.length > 0 && devices.some((d) => d.initError !== 0 || !d.ready);

  return (
    <SectionCard
      icon={<IconMouse size={20} className="text-[var(--color-electric)]" />}
      title={t("Trackball Sensor (PMW3610)")}
      subtitle={t("Optical sensor health and surface diagnostics")}
      summary={
        devices.length > 0 &&
        (hasInitError ? (
          <SectionSummaryBadge tone="red">
            {t("init error")}
          </SectionSummaryBadge>
        ) : (
          <SectionSummaryBadge tone="ok">{t("OK")}</SectionSummaryBadge>
        ))
      }
      actions={
        isAvailable && (
          <button
            onClick={() => void refresh()}
            disabled={isLoading}
            className="btn-ghost flex items-center gap-2 text-sm"
            aria-label={t("Refresh sensor info")}
          >
            <IconRefresh
              size={14}
              className={isLoading ? "animate-spin" : ""}
            />
            {t("Refresh")}
          </button>
        )
      }
    >
      {!isAvailable ? (
        <NotAvailableNotice module={MODULE_NAME} moduleUrl={MODULE_URL} />
      ) : (
        <>
          {error && <SectionError message={error} />}

          {devices.length === 0 && isLoading && !error && (
            <LoadingIndicator variant="inline" label={t("Loading")} />
          )}

          {devices.length === 0 && !isLoading && !error && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("No sensors reported.")}
            </p>
          )}

          {devices.map((device) => (
            <div
              key={`${device.source}:${device.deviceIndex}`}
              className="mb-3"
            >
              <div className="flex flex-wrap gap-4 text-xs text-[var(--color-text-secondary)]">
                <span>
                  {t("Source")}: <strong>{device.source}</strong>
                </span>
                <span>
                  {t("Ready")}:{" "}
                  <strong
                    className={device.ready ? "text-green-400" : "text-red-400"}
                  >
                    {device.ready ? "✓" : "✗"}
                  </strong>
                </span>
                <span>
                  {t("Product ID")}:{" "}
                  <strong className="font-mono">
                    {formatHex(device.productId)}
                  </strong>
                </span>
                <span>
                  {t("Revision")}:{" "}
                  <strong className="font-mono">
                    {formatHex(device.revisionId)}
                  </strong>
                </span>
                <span className={device.initError !== 0 ? "text-red-400" : ""}>
                  {t("Init error")}: <strong>{device.initError}</strong>
                </span>
                {device.runtimeConfig && (
                  <>
                    <span>
                      CPI: <strong>{device.runtimeConfig.cpi}</strong>
                    </span>
                    <span>
                      {t("Force awake")}:{" "}
                      <strong>
                        {device.runtimeConfig.forceAwake ? t("yes") : t("no")}
                      </strong>
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() =>
                  void readDiagnostics(device.source, device.deviceIndex)
                }
                disabled={isLoading}
                className="btn-ghost text-sm mt-2"
              >
                {t("Read surface diagnostics")}
              </button>
            </div>
          ))}

          {diagnostics && (
            <div className="mt-2 p-3 rounded-lg bg-[var(--color-border)]/50 border border-[var(--color-border)]">
              <div className="flex flex-wrap gap-4 text-xs text-[var(--color-text-secondary)] font-mono">
                <span>SQUAL: {diagnostics.squal}</span>
                <span>Shutter: {diagnostics.shutter}</span>
                <span>
                  Pixel min/avg/max: {diagnostics.pixMin}/{diagnostics.pixAvg}/
                  {diagnostics.pixMax}
                </span>
              </div>
              {(() => {
                const { message, className } = squalInterpretation(
                  diagnostics.squal,
                  t,
                );
                return <p className={`text-xs mt-2 ${className}`}>{message}</p>;
              })()}
            </div>
          )}

          {devices.length > 0 && (
            <Pmw3610FrameViewer
              pmw3610={pmw3610}
              source={devices[0].source}
              deviceIndex={devices[0].deviceIndex}
              side={frameSide}
              onSideChange={setFrameSide}
            />
          )}
        </>
      )}
    </SectionCard>
  );
}
