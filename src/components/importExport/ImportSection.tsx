/**
 * Writes a Keyboard Abyss keymap onto the connected keyboard.
 *
 * The only destructive action in this tab, so the order is deliberate: pick a
 * keymap, see exactly what changes, clear the pre-flight checks, then confirm.
 */
import { useState } from "react";
import {
  IconAlertTriangle,
  IconCheck,
  IconDownload,
  IconLoader2,
} from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";
import { SectionError } from "../troubleshooting/SectionCard";
import { DataSectionSelector } from "./DataSectionSelector";
import { KeymapDiffView } from "./KeymapDiffView";
import { countDiff } from "../../lib/abyss/abyssDiff";
import type { UseAbyssDeviceReturn } from "../../hooks/useAbyssDevice";
import type { UseAbyssImportReturn } from "../../hooks/useAbyssImport";

export function ImportSection({
  device,
  importer,
}: {
  device: UseAbyssDeviceReturn;
  importer: UseAbyssImportReturn;
}) {
  const { t } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const {
    keymaps,
    isLoadingKeymaps,
    selectedKeymapId,
    selectKeymap,
    isLoadingSelection,
    selection,
    setSelection,
    diff,
    isInSync,
    preflight,
    canWrite,
    isWriting,
    didWrite,
    error,
    write,
  } = importer;

  if (!device.loaded) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">
          {t("Import")}
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("Read the keyboard first to enable importing.")}
        </p>
      </div>
    );
  }

  const counts = countDiff(diff);

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-medium text-[var(--color-text)] mb-1">
        {t("Import")}
      </h3>
      <p className="text-xs text-[var(--color-text-muted)] mb-4">
        {t(
          "Writing changes the keyboard. Review the changes before confirming.",
        )}
      </p>

      <label className="block mb-4">
        <span className="block text-xs text-[var(--color-text-muted)] mb-1">
          {t("Keymap to write")}
        </span>
        <select
          className="input-field w-full tablet:w-80"
          value={selectedKeymapId ?? ""}
          disabled={isLoadingKeymaps || keymaps.length === 0 || isWriting}
          onChange={(event) => void selectKeymap(event.target.value || null)}
        >
          <option value="">
            {isLoadingKeymaps
              ? t("Loading your keymaps...")
              : keymaps.length === 0
                ? t("No compatible keymaps found for this keyboard")
                : t("Select a keymap")}
          </option>
          {keymaps.map((keymap) => (
            <option key={keymap.id} value={keymap.id}>
              {keymap.name}
              {keymap.version ? ` (v${keymap.version})` : ""}
            </option>
          ))}
        </select>
      </label>

      {selectedKeymapId && (
        <DataSectionSelector selection={selection} onChange={setSelection} />
      )}

      {isLoadingSelection && (
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          {t("Loading the keymap...")}
        </p>
      )}

      {error && <SectionError message={error} />}

      {preflight.map((check) => (
        <div
          key={check.id}
          className={`mb-3 p-3 rounded-lg flex items-start gap-2 ${
            check.level === "blocked"
              ? "bg-red-500/10 border border-red-500/20"
              : "bg-amber-500/10 border border-amber-500/20"
          }`}
        >
          <IconAlertTriangle
            size={16}
            className={
              check.level === "blocked"
                ? "text-red-400 flex-shrink-0 mt-0.5"
                : "text-amber-400 flex-shrink-0 mt-0.5"
            }
          />
          <p
            className={`text-sm ${
              check.level === "blocked" ? "text-red-400" : "text-amber-400"
            }`}
          >
            {t(check.message, check.params)}
          </p>
        </div>
      ))}

      {didWrite && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--color-neon)]/10 border border-[var(--color-neon)]/20">
          <p className="text-sm text-[var(--color-neon)] flex items-center gap-2">
            <IconCheck size={16} />
            {t("Written to the keyboard and re-read to confirm.")}
          </p>
        </div>
      )}

      {isInSync && !didWrite && (
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          {t("The keyboard already matches this keymap.")}
        </p>
      )}

      {!isInSync && counts.total > 0 && (
        <div className="mb-4">
          <KeymapDiffView diff={diff} />
        </div>
      )}

      {confirming ? (
        <div className="p-4 rounded-lg border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text)] mb-3">
            {t(
              "Write {{count}} changes to the keyboard? This replaces the current settings and cannot be undone.",
              { count: counts.total },
            )}
          </p>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
              onClick={() => {
                setConfirming(false);
                void write();
              }}
            >
              {t("Write to keyboard")}
            </button>
            <button
              className="btn-ghost text-sm"
              onClick={() => setConfirming(false)}
            >
              {t("Cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn-electric flex items-center gap-2 text-sm"
          onClick={() => setConfirming(true)}
          disabled={!canWrite}
        >
          {isWriting ? (
            <IconLoader2 size={16} className="animate-spin" />
          ) : (
            <IconDownload size={16} />
          )}
          {t("Write to keyboard")}
        </button>
      )}
    </div>
  );
}
