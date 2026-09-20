import { ResponsiveButton } from "../ResponsiveButton";
import { IconActivity, IconRefresh } from "@tabler/icons-react";
import type { StackInfo } from "../../proto/cormoran/devtool/devtool";
import type { UseDevtoolStackUsageReturn } from "../../hooks/useDevtoolStackUsage";
import {
  usageFraction,
  formatUsagePercent,
} from "../../hooks/useDevtoolStackUsage";
import { useLanguage } from "../../hooks/useLanguage";
import {
  NotAvailableNotice,
  SectionCard,
  SectionError,
  SectionSummaryBadge,
} from "./SectionCard";
import { LoadingIndicator } from "../LoadingIndicator";

const MODULE_NAME = "zmk-module-devtool";
const MODULE_URL = "https://github.com/cormoran/zmk-module-devtool";
const KCONFIG_NAME = "CONFIG_ZMK_DEVTOOL_STACK_USAGE";

const POLL_INTERVAL_OPTIONS = [
  { label: "1s", ms: 1000 },
  { label: "3s", ms: 3000 },
  { label: "5s", ms: 5000 },
  { label: "10s", ms: 10000 },
];

function usageBarColor(fraction: number): string {
  if (fraction >= 0.9) return "bg-red-500";
  if (fraction >= 0.8) return "bg-amber-500";
  if (fraction >= 0.6) return "bg-yellow-400";
  return "bg-green-500";
}

function usageTextColor(fraction: number): string {
  if (fraction >= 0.9) return "text-red-400";
  if (fraction >= 0.8) return "text-amber-400";
  return "text-[var(--color-text-secondary)]";
}

function StackRow({ stack }: { stack: StackInfo }) {
  const fraction = usageFraction(stack);
  const pct = formatUsagePercent(stack);
  const free = Math.max(0, stack.size - stack.used);

  return (
    <div className="py-2 border-b border-[var(--color-border)] last:border-b-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-mono text-xs text-[var(--color-text)] truncate min-w-0">
          {stack.name}
        </span>
        <div className="flex items-center gap-3 shrink-0 text-xs">
          <span className="text-[var(--color-text-muted)]">
            {stack.used}
            <span className="text-[var(--color-text-muted)] opacity-60">
              /{stack.size}B
            </span>
          </span>
          <span className="text-[var(--color-text-muted)]">
            free&nbsp;
            <span className="font-mono">{free}B</span>
          </span>
          <span
            className={`font-mono font-medium w-12 text-right ${usageTextColor(fraction)}`}
          >
            {pct}
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${usageBarColor(fraction)}`}
          style={{ width: `${Math.min(100, fraction * 100).toFixed(1)}%` }}
        />
      </div>
    </div>
  );
}

function maxUsageFraction(stacks: StackInfo[]): number {
  return stacks.reduce((m, s) => Math.max(m, usageFraction(s)), 0);
}

function summaryBadge(stacks: StackInfo[]) {
  if (stacks.length === 0) return null;
  const max = maxUsageFraction(stacks);
  if (max >= 0.9)
    return <SectionSummaryBadge tone="red">{`≥90% used`}</SectionSummaryBadge>;
  if (max >= 0.8)
    return (
      <SectionSummaryBadge tone="amber">{`≥80% used`}</SectionSummaryBadge>
    );
  return (
    <SectionSummaryBadge tone="ok">{`${stacks.length} threads`}</SectionSummaryBadge>
  );
}

export function DevtoolStackUsageSection({
  stackUsage,
}: {
  stackUsage: UseDevtoolStackUsageReturn;
}) {
  const { t } = useLanguage();
  const {
    isAvailable,
    stacks,
    isLoading,
    error,
    isPolling,
    pollIntervalMs,
    refresh,
    setPolling,
    setPollIntervalMs,
  } = stackUsage;

  return (
    <SectionCard
      icon={<IconActivity size={20} className="text-[var(--color-electric)]" />}
      title={t("Stack Usage")}
      subtitle={t("Per-thread stack high-water usage (zmk-module-devtool)")}
      summary={isAvailable ? summaryBadge(stacks) : undefined}
      actions={
        isAvailable && (
          <ResponsiveButton
            label={t("Refresh")}
            onClick={() => void refresh()}
            disabled={isLoading}
            className="btn-ghost flex items-center gap-2 text-sm"
            aria-label={t("Refresh stack usage")}
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
          {/* Polling controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPolling}
                onChange={(e) => setPolling(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--color-electric)]"
              />
              <span className="text-xs text-[var(--color-text-muted)]">
                {t("Auto-refresh")}
              </span>
            </label>
            {isPolling && (
              <div className="flex items-center gap-1">
                {POLL_INTERVAL_OPTIONS.map(({ label, ms }) => (
                  <button
                    key={ms}
                    onClick={() => setPollIntervalMs(ms)}
                    className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                      pollIntervalMs === ms
                        ? "bg-[var(--color-electric)]/10 border-[var(--color-electric)]/40 text-[var(--color-electric)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kconfig hint */}
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            {t("Requires")}{" "}
            <code className="font-mono bg-[var(--color-border)] px-1 py-0.5 rounded text-[10px]">
              {KCONFIG_NAME}
            </code>{" "}
            {t("in your firmware. Without it the RPC returns an error below.")}
          </p>

          {error && <SectionError message={error} />}

          {/* Stack table */}
          {stacks.length > 0 ? (
            <div>
              {stacks.map((s, i) => (
                <StackRow key={`${s.name}-${i}`} stack={s} />
              ))}
              <p className="text-[10px] text-[var(--color-text-muted)] mt-3">
                {t("{{count}} thread(s) · sorted by usage", {
                  count: stacks.length,
                })}
              </p>
            </div>
          ) : isLoading ? (
            <LoadingIndicator variant="inline" label={t("Loading")} />
          ) : (
            !error && (
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("No stack data yet — press Refresh or enable Auto-refresh.")}
              </p>
            )
          )}
        </>
      )}
    </SectionCard>
  );
}
