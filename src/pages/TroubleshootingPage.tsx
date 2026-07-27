import { useContext, useEffect, useRef, useState } from "react";
import {
  IconCheck,
  IconClipboardCopy,
  IconInfoCircle,
  IconRefresh,
  IconStethoscope,
} from "@tabler/icons-react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { useLanguage } from "../hooks/useLanguage";
import { useDeviceInfo } from "../hooks/useDeviceInfo";
import { useWatchdog } from "../hooks/useWatchdog";
import { useKscanDiagnostics } from "../hooks/useKscanDiagnostics";
import { usePmw3610 } from "../hooks/usePmw3610";
import { useElfAnalysis } from "../hooks/useElfAnalysis";
import { useDevtoolStackUsage } from "../hooks/useDevtoolStackUsage";
import { DeviceInfoSection } from "../components/troubleshooting/DeviceInfoSection";
import { WatchdogSection } from "../components/troubleshooting/WatchdogSection";
import { KscanDiagnosticsSection } from "../components/troubleshooting/KscanDiagnosticsSection";
import { Pmw3610Section } from "../components/troubleshooting/Pmw3610Section";
import { DevtoolStackUsageSection } from "../components/troubleshooting/DevtoolStackUsageSection";
import { buildSupportReport } from "../lib/troubleshootingReport";
import { useIsTabActive } from "../hooks/useIsTabActive";

const COPIED_FEEDBACK_MS = 2000;

export function TroubleshootingPage() {
  const { t } = useLanguage();
  const zmkApp = useContext(ZMKAppContext);
  const deviceInfo = useDeviceInfo();
  const watchdog = useWatchdog();
  const kscan = useKscanDiagnostics();
  const pmw3610 = usePmw3610();
  const elfAnalysis = useElfAnalysis();
  const stackUsage = useDevtoolStackUsage();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTabActive = useIsTabActive();

  // The page stays mounted while another tab is showing, so stop the stack-usage
  // polling on the way out — nobody is watching those numbers, and every tick is
  // a device round-trip.
  const { isPolling: isStackPolling, setPolling: setStackPolling } = stackUsage;
  useEffect(() => {
    if (!isTabActive && isStackPolling) {
      setStackPolling(false);
    }
  }, [isTabActive, isStackPolling, setStackPolling]);

  const refreshAll = () => {
    if (deviceInfo.isAvailable) void deviceInfo.refresh();
    if (watchdog.isAvailable) void watchdog.refresh();
    if (kscan.isAvailable) void kscan.refresh();
    if (pmw3610.isAvailable) void pmw3610.refresh();
    if (stackUsage.isAvailable) void stackUsage.refresh();
  };

  const copySupportReport = async () => {
    // Resolve PC/LR for all fatal incidents when an ELF is loaded
    const elfResolved = elfAnalysis.hasElf
      ? watchdog.incidents
          .filter((i) => i.fatal)
          .map((i) => {
            const pcR = elfAnalysis.resolve(i.fatal!.pc);
            const lrR = elfAnalysis.resolve(i.fatal!.lr);
            return {
              id: i.id,
              pc: { address: i.fatal!.pc, ...pcR },
              lr: { address: i.fatal!.lr, ...lrR },
            };
          })
      : undefined;

    const report = buildSupportReport({
      generatedAt: new Date().toISOString(),
      deviceName: zmkApp?.state.deviceInfo?.name ?? null,
      userAgent: navigator.userAgent,
      appUrl: window.location.href,
      deviceInfo: {
        available: deviceInfo.isAvailable,
        data: deviceInfo.info,
        error: deviceInfo.error,
      },
      watchdog: {
        available: watchdog.isAvailable,
        data: watchdog.status
          ? {
              status: watchdog.status,
              incidents: watchdog.incidents,
              elfFileName: elfAnalysis.fileName,
              elfResolved,
            }
          : null,
        error: watchdog.error,
      },
      kscan: {
        available: kscan.isAvailable,
        data: kscan.info
          ? { info: kscan.info, devices: kscan.devices, stats: kscan.stats }
          : null,
        error: kscan.error,
      },
      pmw3610: {
        available: pmw3610.isAvailable,
        data:
          pmw3610.devices.length > 0 || pmw3610.diagnostics
            ? { devices: pmw3610.devices, diagnostics: pmw3610.diagnostics }
            : null,
        error: pmw3610.error,
      },
    });
    await navigator.clipboard.writeText(report);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(
      () => setCopied(false),
      COPIED_FEEDBACK_MS,
    );
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col tablet:flex-row tablet:items-center gap-3 mb-8">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20">
              <IconStethoscope
                size={24}
                className="text-[var(--color-electric)]"
              />
            </div>
            <div>
              <h1 className="text-xl font-medium text-[var(--color-text)]">
                {t("Troubleshooting")}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("Diagnose keyboard problems and create a support report")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={refreshAll}
              className="btn-ghost flex items-center gap-2"
              aria-label={t("Refresh all sections")}
            >
              <IconRefresh size={16} />
              {t("Refresh All")}
            </button>
            <button
              onClick={() => void copySupportReport()}
              className="btn-electric flex items-center gap-2"
              aria-label={t("Copy Support Report")}
            >
              {copied ? (
                <IconCheck size={16} />
              ) : (
                <IconClipboardCopy size={16} />
              )}
              {copied ? t("Copied!") : t("Copy Support Report")}
            </button>
          </div>
        </div>

        {/* Guidance */}
        <div className="mb-6 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)] flex items-start gap-3">
          <div className="p-1">
            <IconInfoCircle
              size={20}
              className="text-[var(--color-electric)]"
            />
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t(
              "If your keyboard misbehaves, review the sections below. Use 'Copy Support Report' and paste the result when contacting your keyboard's seller.",
            )}
            <br />
            {t(
              "If a section is not available, it shows which firmware module enables it.",
            )}
          </p>
        </div>

        {/* Section cards */}
        <div className="space-y-6">
          <DeviceInfoSection deviceInfo={deviceInfo} />
          <WatchdogSection watchdog={watchdog} elfAnalysis={elfAnalysis} />
          <KscanDiagnosticsSection kscan={kscan} />
          <Pmw3610Section pmw3610={pmw3610} />
          <DevtoolStackUsageSection stackUsage={stackUsage} />
        </div>
      </div>
    </div>
  );
}
