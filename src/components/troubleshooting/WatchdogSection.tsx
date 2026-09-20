import { ResponsiveButton } from "../ResponsiveButton";
import { useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconHeartRateMonitor,
  IconRefresh,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import type { Incident } from "../../proto/cormoran/watchdog/watchdog";
import { IncidentType } from "../../proto/cormoran/watchdog/watchdog";
import type { UseWatchdogReturn } from "../../hooks/useWatchdog";
import type { UseElfAnalysisReturn } from "../../hooks/useElfAnalysis";
import { useLanguage } from "../../hooks/useLanguage";
import {
  formatFatalReason,
  formatHex,
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

const MODULE_NAME = "cormoran/zmk-feature-watchdog";
const MODULE_URL = "https://github.com/cormoran/zmk-feature-watchdog";

function incidentTypeLabel(
  type: IncidentType,
  t: (key: string) => string,
): string {
  switch (type) {
    case IncidentType.FREEZE:
      return t("Freeze");
    case IncidentType.FATAL:
      return t("Crash");
    case IncidentType.RESET_CAUSE:
      return t("Reset");
    default:
      return t("Unknown");
  }
}

function incidentTypeBadgeClass(type: IncidentType): string {
  switch (type) {
    case IncidentType.FREEZE:
      return "bg-amber-500/10 border-amber-500/20 text-amber-400";
    case IncidentType.FATAL:
      return "bg-red-500/10 border-red-500/20 text-red-400";
    default:
      return "bg-[var(--color-electric)]/10 border-[var(--color-electric)]/20 text-[var(--color-electric)]";
  }
}

function incidentDetail(
  incident: Incident,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (incident.freeze) {
    const queue = incident.freeze.queueName || `#${incident.freeze.channelId}`;
    return `${t("queue")}: ${queue}`;
  }
  if (incident.fatal) {
    const parts = [
      formatFatalReason(incident.fatal.reason, t),
      `PC ${formatHex(incident.fatal.pc, 8)}`,
      `LR ${formatHex(incident.fatal.lr, 8)}`,
    ];
    if (incident.fatal.threadName) {
      parts.push(`${t("thread")}: ${incident.fatal.threadName}`);
    }
    return parts.join(", ");
  }
  if (incident.reset) {
    return formatResetCause(incident.reset.causeBits, t);
  }
  return "";
}

/** Format a resolved address as "funcName+0x4 (path/to/file.c:42)". */
function formatResolved(
  resolve: UseElfAnalysisReturn["resolve"],
  rawAddr: number,
  label: string,
): string | null {
  const r = resolve(rawAddr);
  if (!r?.functionName) return null;
  let s = `${label} → ${r.functionName}`;
  if (r.offset !== undefined && r.offset > 0)
    s += `+0x${r.offset.toString(16)}`;
  if (r.file) {
    const parts = r.file.replace(/\\/g, "/").split("/");
    const shortFile = parts.slice(-3).join("/");
    s += ` (${shortFile}${r.line !== undefined ? `:${r.line}` : ""})`;
  }
  return s;
}

function ElfUploadBar({
  elfAnalysis,
  t,
}: {
  elfAnalysis: UseElfAnalysisReturn;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void elfAnalysis.loadFile(file);
    e.target.value = "";
  };

  return (
    <div className="mb-4 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center gap-2 flex-wrap">
        <IconUpload
          size={14}
          className="text-[var(--color-text-muted)] flex-shrink-0"
        />
        {elfAnalysis.hasElf ? (
          <>
            <span className="text-xs text-[var(--color-text-secondary)] flex-1 min-w-0 truncate">
              {t("ELF: {{name}}", { name: elfAnalysis.fileName! })}
              {elfAnalysis.hasLineInfo
                ? ` (${t("{{n}} symbols, line info", { n: elfAnalysis.symbolCount })})`
                : ` (${t("{{n}} symbols", { n: elfAnalysis.symbolCount })})`}
            </span>
            <button
              onClick={() => elfAnalysis.clear()}
              className="btn-ghost p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label={t("Remove ELF")}
            >
              <IconX size={14} />
            </button>
          </>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)] flex-1">
            {t("Upload ELF to resolve PC/LR symbols")}
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".elf,application/octet-stream"
          className="hidden"
          onChange={handleChange}
          disabled={elfAnalysis.isLoading}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={elfAnalysis.isLoading}
          className="btn-ghost text-xs px-2 py-1 text-[var(--color-electric)] border border-[var(--color-electric)]/30 rounded"
        >
          {elfAnalysis.isLoading
            ? t("Loading…")
            : elfAnalysis.hasElf
              ? t("Change ELF")
              : t("Upload ELF")}
        </button>
      </div>
      {elfAnalysis.error && (
        <p className="mt-2 text-xs text-red-400">{elfAnalysis.error}</p>
      )}
    </div>
  );
}

export function WatchdogSection({
  watchdog,
  elfAnalysis,
}: {
  watchdog: UseWatchdogReturn;
  elfAnalysis?: UseElfAnalysisReturn;
}) {
  const { t } = useLanguage();
  const {
    isAvailable,
    source,
    setSource,
    status,
    incidents,
    isLoading,
    error,
    refresh,
    deleteOne,
    deleteAll,
  } = watchdog;
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const handleDeleteAll = async () => {
    setShowDeleteAllConfirm(false);
    await deleteAll();
  };

  const hasFatalIncidents = incidents.some((i) => i.fatal);

  return (
    <SectionCard
      icon={
        <IconHeartRateMonitor
          size={20}
          className="text-[var(--color-electric)]"
        />
      }
      title={t("Stability (Watchdog)")}
      subtitle={t("Freeze, crash and unexpected reset incidents")}
      summary={
        status && (
          <>
            {incidents.length > 0 ? (
              <SectionSummaryBadge
                tone={incidents.length > 3 ? "red" : "amber"}
              >
                {t("{{count}} incidents", { count: incidents.length })}
              </SectionSummaryBadge>
            ) : (
              <SectionSummaryBadge tone="ok">
                {t("No incidents")}
              </SectionSummaryBadge>
            )}
            {status.recordingStopped && (
              <SectionSummaryBadge tone="red">
                {t("recording paused")}
              </SectionSummaryBadge>
            )}
          </>
        )
      }
      actions={
        isAvailable && (
          <ResponsiveButton
            label={t("Refresh")}
            onClick={() => void refresh()}
            disabled={isLoading}
            className="btn-ghost flex items-center gap-2 text-sm"
            aria-label={t("Refresh incidents")}
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
          {/* Source selector */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-[var(--color-text-muted)]">
              {t("Source")}
            </span>
            {[0, 1].map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                disabled={isLoading}
                className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                  source === s
                    ? "bg-[var(--color-electric)]/10 border-[var(--color-electric)]/40 text-[var(--color-electric)]"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                }`}
              >
                {s === 0 ? t("Central") : t("Peripheral {{n}}", { n: s })}
              </button>
            ))}
          </div>

          {error && <SectionError message={error} />}

          {/* Status */}
          {status && (
            <div className="flex flex-wrap gap-4 mb-4 text-xs text-[var(--color-text-secondary)]">
              <span>
                {t("Capacity")}: <strong>{status.capacity}</strong>
              </span>
              <span>
                {t("Stored")}: <strong>{status.stored}</strong>
              </span>
              <span>
                {t("Dropped since boot")}:{" "}
                <strong>{status.droppedSinceBoot}</strong>
              </span>
            </div>
          )}
          {status?.recordingStopped && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <IconAlertTriangle
                size={16}
                className="text-amber-400 flex-shrink-0 mt-0.5"
              />
              <p className="text-xs text-amber-400">
                {t(
                  "Incident storage is full — recording is paused. Delete incidents to resume.",
                )}
              </p>
            </div>
          )}

          {/* ELF upload — shown when there are crash incidents */}
          {hasFatalIncidents && elfAnalysis && (
            <ElfUploadBar elfAnalysis={elfAnalysis} t={t} />
          )}

          {/* Incident table / loading / empty state */}
          {isLoading && !status ? (
            <LoadingIndicator variant="inline" label={t("Loading")} />
          ) : incidents.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-[var(--color-border)] flex items-center gap-2">
              <IconCircleCheck size={18} className="text-green-400" />
              <span className="text-sm text-[var(--color-text-muted)]">
                {t("No incidents recorded — your keyboard looks stable.")}
              </span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                      <th className="py-2 pr-3 font-medium">ID</th>
                      <th className="py-2 pr-3 font-medium">{t("Type")}</th>
                      <th className="py-2 pr-3 font-medium">
                        {t("Boot / Uptime")}
                      </th>
                      <th className="py-2 pr-3 font-medium">{t("Detail")}</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((incident) => {
                      const hasElfData = elfAnalysis?.hasElf && incident.fatal;
                      const resolvedPc = hasElfData
                        ? formatResolved(
                            elfAnalysis!.resolve,
                            incident.fatal!.pc,
                            "PC",
                          )
                        : null;
                      const resolvedLr = hasElfData
                        ? formatResolved(
                            elfAnalysis!.resolve,
                            incident.fatal!.lr,
                            "LR",
                          )
                        : null;

                      return (
                        <tr
                          key={incident.id}
                          className="border-b border-[var(--color-border)] last:border-b-0"
                        >
                          <td className="py-2 pr-3 font-mono">{incident.id}</td>
                          <td className="py-2 pr-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border ${incidentTypeBadgeClass(incident.type)}`}
                            >
                              {incidentTypeLabel(incident.type, t)}
                            </span>
                          </td>
                          <td className="py-2 pr-3 font-mono">
                            #{incident.bootOrdinal} @{" "}
                            {formatUptime(incident.uptimeS * 1000)}
                          </td>
                          <td className="py-2 pr-3 text-[var(--color-text-secondary)] break-all">
                            <div>{incidentDetail(incident, t)}</div>
                            {(resolvedPc || resolvedLr) && (
                              <div className="mt-1 font-mono text-[10px] text-[var(--color-electric)] space-y-0.5">
                                {resolvedPc && <div>{resolvedPc}</div>}
                                {resolvedLr && <div>{resolvedLr}</div>}
                              </div>
                            )}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => void deleteOne(incident.id)}
                              disabled={isLoading}
                              className="btn-ghost p-1 text-red-400 hover:text-red-300"
                              aria-label={t("Delete incident {{id}}", {
                                id: incident.id,
                              })}
                            >
                              <IconTrash size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  disabled={isLoading}
                  className="btn-ghost flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
                >
                  <IconTrash size={14} />
                  {t("Delete all")}
                </button>
              </div>
            </>
          )}

          {/* Delete-all confirm dialog */}
          {showDeleteAllConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="glass-card p-6 max-w-md mx-4 border-red-500/20 bg-[var(--color-surface)]">
                <div className="flex items-start gap-3 mb-4">
                  <IconAlertTriangle
                    size={24}
                    className="text-red-500 flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
                      {t("Delete all incidents?")}
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                      {t(
                        "This will permanently delete all recorded incidents from your keyboard.",
                      )}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {t("This action cannot be undone.")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    className="btn-ghost text-sm px-4 py-2"
                    onClick={() => setShowDeleteAllConfirm(false)}
                    disabled={isLoading}
                  >
                    {t("Cancel")}
                  </button>
                  <button
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm px-4 py-2 rounded-lg border border-red-500/40 transition-colors disabled:opacity-50"
                    onClick={() => void handleDeleteAll()}
                    disabled={isLoading}
                  >
                    {t("Delete all")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}
