/**
 * Reads the connected keyboard into KeyboardHub JSON and shows what was found.
 *
 * Both the export and import sections work from this snapshot, so it is the
 * first thing the user does after signing in. The read is an explicit button
 * rather than automatic because it goes through the official ZMK protocol —
 * one `getBehaviorDetails` round trip per behavior — which is slow over BLE.
 */
import { IconDeviceUsb, IconLoader2, IconRefresh } from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";
import { SectionError } from "../troubleshooting/SectionCard";
import type { UseAbyssDeviceReturn } from "../../hooks/useAbyssDevice";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="text-sm font-medium text-[var(--color-text)] tabular-nums">
        {value}
      </p>
    </div>
  );
}

/** How the connected layout matched the Abyss catalog, and what that implies. */
function LayoutVerdict({ device }: { device: UseAbyssDeviceReturn }) {
  const { t } = useLanguage();
  const { resolved } = device;
  if (!resolved) return null;

  if (resolved.layout) {
    return (
      <p className="text-sm text-[var(--color-neon)]">
        {t("Matched the Abyss layout {{layout}}.", {
          layout: resolved.layout.name,
        })}
      </p>
    );
  }
  if (resolved.compatibleLayout) {
    return (
      <p className="text-sm text-amber-400">
        {t(
          "No exact layout match. Exporting will add a new variation of {{layout}}.",
          { layout: resolved.compatibleLayout.name },
        )}
      </p>
    );
  }
  return (
    <p className="text-sm text-amber-400">
      {resolved.keyboardExists
        ? t(
            "This layout is not registered on Abyss yet. Exporting will add it.",
          )
        : t(
            "This keyboard is not registered on Abyss yet. Exporting will create it under your account.",
          )}
    </p>
  );
}

export function DeviceSnapshotCard({
  device,
}: {
  device: UseAbyssDeviceReturn;
}) {
  const { t } = useLanguage();
  const { loaded, phase, isReading, error, read } = device;
  const keymap = loaded?.state.currentKeymap;

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col tablet:flex-row tablet:items-center gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20 flex-shrink-0">
            <IconDeviceUsb size={20} className="text-[var(--color-electric)]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-[var(--color-text)]">
              {t("Keyboard snapshot")}
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] truncate">
              {loaded
                ? (loaded.deviceName ?? t("Connected keyboard"))
                : t("Read the keyboard before exporting or importing.")}
            </p>
          </div>
        </div>
        <div className="tablet:ml-auto flex-shrink-0">
          <button
            className="btn-electric flex items-center gap-2 text-sm"
            onClick={() => void read()}
            disabled={isReading}
          >
            {isReading ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconRefresh size={16} />
            )}
            {loaded ? t("Read again") : t("Read keyboard")}
          </button>
        </div>
      </div>

      {isReading && (
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          {phase === "resolving"
            ? t("Matching the layout on Abyss...")
            : t(
                "Reading the keyboard. This is slower over Bluetooth than USB.",
              )}
        </p>
      )}

      {error && <SectionError message={error} />}

      {keymap && !isReading && (
        <>
          <div className="grid grid-cols-2 tablet:grid-cols-5 gap-3 mb-4">
            <Stat label={t("Layers")} value={keymap.layers.length} />
            <Stat
              label={t("Keys")}
              value={Math.max(
                0,
                ...keymap.layers.map((layer) => layer.bindings.length),
              )}
            />
            <Stat label={t("Combos")} value={keymap.combos?.length ?? 0} />
            <Stat label={t("Macros")} value={keymap.macros?.length ?? 0} />
            <Stat
              label={t("Modules")}
              value={loaded.state.detectedModules.length}
            />
          </div>
          <LayoutVerdict device={device} />
        </>
      )}
    </div>
  );
}
