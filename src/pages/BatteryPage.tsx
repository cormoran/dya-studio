import { useContext, useEffect } from "react";
import {
  IconBattery2,
  IconBatteryCharging,
  IconRefresh,
} from "@tabler/icons-react";
import { useBatteryHistory } from "../hooks/useBatteryHistory";
import { ConnectionContext } from "../components/DeviceConnection";

function formatTimestamp(timestampMs: number): string {
  const date = new Date(timestampMs);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestampMs: number): string {
  const date = new Date(timestampMs);
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BatteryHistoryChart({
  history,
}: {
  history: Array<{ timestampMs: number; level: number; isCharging: boolean }>;
}) {
  if (history.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-[var(--color-border)] rounded-lg">
        <span className="text-[var(--color-text-muted)] text-sm">
          No battery history available
        </span>
      </div>
    );
  }

  const maxLevel = 100;

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="relative h-64 border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-surface)]">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-4 bottom-4 flex flex-col justify-between text-xs text-[var(--color-text-muted)]">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* Chart area */}
        <div className="ml-10 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-px bg-[var(--color-border)] opacity-30"
              />
            ))}
          </div>

          {/* Data line */}
          <svg className="absolute inset-0 w-full h-full overflow-visible">
            <defs>
              <linearGradient
                id="batteryGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="var(--color-neon)"
                  stopOpacity="0.3"
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-neon)"
                  stopOpacity="0.05"
                />
              </linearGradient>
            </defs>

            {/* Area under the line */}
            <path
              d={`M 0,${((maxLevel - history[0].level) / maxLevel) * 100}% ${history
                .map((point, i) => {
                  const x = (i / (history.length - 1)) * 100;
                  const y = ((maxLevel - point.level) / maxLevel) * 100;
                  return `L ${x}%,${y}%`;
                })
                .join(" ")} L 100%,100% L 0,100% Z`}
              fill="url(#batteryGradient)"
            />

            {/* Line */}
            <polyline
              points={history
                .map((point, i) => {
                  const x = (i / (history.length - 1)) * 100;
                  const y = ((maxLevel - point.level) / maxLevel) * 100;
                  return `${x}%,${y}%`;
                })
                .join(" ")}
              fill="none"
              stroke="var(--color-neon)"
              strokeWidth="2"
              className="drop-shadow-[0_0_4px_var(--color-neon)]"
            />

            {/* Data points */}
            {history.map((point, i) => {
              const x = (i / (history.length - 1)) * 100;
              const y = ((maxLevel - point.level) / maxLevel) * 100;
              return (
                <circle
                  key={i}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="3"
                  fill="var(--color-neon)"
                  className="drop-shadow-[0_0_4px_var(--color-neon)]"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Time labels */}
      {history.length > 0 && (
        <div className="flex justify-between text-xs text-[var(--color-text-muted)] px-10">
          <span>{formatDate(history[0].timestampMs)}</span>
          {history.length > 1 && (
            <span>{formatDate(history[history.length - 1].timestampMs)}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function BatteryPage() {
  const connection = useContext(ConnectionContext);
  const { batteries, isLoading, error, loadBatteryStatus, loadBatteryHistory } =
    useBatteryHistory();

  // Periodically refresh battery status every 5 minutes
  useEffect(() => {
    if (!connection.isConnected) return;

    const interval = setInterval(() => {
      loadBatteryStatus();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [connection.isConnected, loadBatteryStatus]);

  const handleRefresh = () => {
    loadBatteryHistory();
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20">
            <IconBattery2 size={24} className="text-[var(--color-electric)]" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-[var(--color-text)]">
              Battery Status
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Monitor battery levels and history
            </p>
          </div>
        </div>

        {/* Show message when not connected */}
        {!connection.isConnected && (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Connect your keyboard to view battery status
            </p>
          </div>
        )}

        {/* Show error if any */}
        {error && (
          <div className="glass-card p-4 mb-4 border-red-500/20 bg-red-500/10">
            <p className="text-sm text-red-400">⚠️ {error}</p>
          </div>
        )}

        {/* Battery Status */}
        {connection.isConnected && (
          <>
            {isLoading && batteries.length === 0 && (
              <div className="glass-card p-6 text-center mb-8">
                <p className="text-sm text-[var(--color-text-muted)]">
                  ⏳ Loading battery status...
                </p>
              </div>
            )}

            {/* Stats Grid */}
            {batteries.length > 0 && (
              <div className="grid grid-cols-1 tablet:grid-cols-3 gap-4 mb-8">
                {batteries.map((battery, index) => (
                  <div key={index} className="glass-card data-card">
                    <div className="flex items-center gap-2">
                      <span className="data-card-label">
                        {battery.deviceName}
                      </span>
                      {battery.isCharging && (
                        <IconBatteryCharging
                          size={16}
                          className="text-[var(--color-neon)]"
                        />
                      )}
                    </div>
                    <span className="data-card-value text-[var(--color-neon)]">
                      {battery.currentLevel}%
                    </span>
                  </div>
                ))}
                {batteries.length > 0 && batteries[0].lastUpdatedMs > 0 && (
                  <div className="glass-card data-card">
                    <span className="data-card-label">Last Updated</span>
                    <span className="data-card-value text-lg">
                      {formatTimestamp(batteries[0].lastUpdatedMs)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Battery History */}
            {batteries.length > 0 && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">
                    Battery History
                  </h2>
                  <button
                    className="btn-ghost text-sm flex items-center gap-1.5"
                    onClick={handleRefresh}
                    disabled={isLoading}
                  >
                    <IconRefresh size={16} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Show chart for each battery */}
                {batteries.map((battery, index) => (
                  <div key={index} className="mb-6 last:mb-0">
                    {batteries.length > 1 && (
                      <h3 className="text-xs font-medium text-[var(--color-text-muted)] mb-3 uppercase tracking-wide">
                        {battery.deviceName}
                      </h3>
                    )}
                    <BatteryHistoryChart history={battery.history} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Info */}
        <div className="mt-8 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)]">
          <p className="text-xs text-[var(--color-text-muted)]">
            Battery status is automatically refreshed every 5 minutes when
            connected. Click the Refresh button to manually update the history.
          </p>
        </div>
      </div>
    </div>
  );
}
