/**
 * Uploads the connected keyboard's keymap to Keyboard Abyss.
 *
 * Nothing here writes to the keyboard, and Abyss keeps version history, so this
 * side of the tab is safe to retry.
 */
import {
  IconCloudUpload,
  IconExternalLink,
  IconLoader2,
} from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";
import { SectionError } from "../troubleshooting/SectionCard";
import { DataSectionSelector } from "./DataSectionSelector";
import type { UseAbyssDeviceReturn } from "../../hooks/useAbyssDevice";
import type { UseAbyssExportReturn } from "../../hooks/useAbyssExport";
import { ABYSS_BASE_URL } from "../../lib/abyss/abyssConfig";

const DEFAULT_ABYSS_URL = "https://abyss.keyboard-hub.com";

export function ExportSection({
  device,
  exporter,
}: {
  device: UseAbyssDeviceReturn;
  exporter: UseAbyssExportReturn;
}) {
  const { t } = useLanguage();
  const { loaded } = device;
  const {
    mode,
    setMode,
    keymaps,
    isLoadingKeymaps,
    selectedKeymapId,
    setSelectedKeymapId,
    name,
    setName,
    selection,
    setSelection,
    isExporting,
    error,
    result,
    canExport,
    exportNow,
  } = exporter;

  if (!loaded) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">
          {t("Export")}
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("Read the keyboard first to enable exporting.")}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-medium text-[var(--color-text)] mb-1">
        {t("Export")}
      </h3>
      <p className="text-xs text-[var(--color-text-muted)] mb-4">
        {t(
          "Exporting uploads this keymap to abyss.keyboard-hub.com under your account.",
        )}
      </p>

      <label className="block mb-4">
        <span className="block text-xs text-[var(--color-text-muted)] mb-1">
          {t("Destination")}
        </span>
        <select
          className="input-field w-full tablet:w-80"
          value={mode}
          onChange={(event) => setMode(event.target.value as typeof mode)}
        >
          <option value="new">{t("Export as a new keymap")}</option>
          <option value="update">{t("Update an existing keymap")}</option>
        </select>
      </label>

      {mode === "new" ? (
        <label className="block mb-4">
          <span className="block text-xs text-[var(--color-text-muted)] mb-1">
            {t("Keymap name")}
          </span>
          <input
            className="input-field w-full tablet:w-80"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("Keymap name")}
          />
        </label>
      ) : (
        <label className="block mb-4">
          <span className="block text-xs text-[var(--color-text-muted)] mb-1">
            {t("Keymap to update")}
          </span>
          <select
            className="input-field w-full tablet:w-80"
            value={selectedKeymapId ?? ""}
            disabled={isLoadingKeymaps || keymaps.length === 0}
            onChange={(event) =>
              setSelectedKeymapId(event.target.value || null)
            }
          >
            <option value="">
              {isLoadingKeymaps
                ? t("Loading your keymaps...")
                : keymaps.length === 0
                  ? t("No keymaps found for this keyboard")
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
      )}

      <DataSectionSelector
        selection={selection}
        onChange={setSelection}
        // A keymap with no layers is meaningless, so a new one always carries
        // its key bindings.
        forced={mode === "new" ? ["keymap"] : []}
      />

      {error && <SectionError message={error} />}

      {result && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--color-neon)]/10 border border-[var(--color-neon)]/20">
          <p className="text-sm text-[var(--color-neon)] flex items-center gap-2 flex-wrap">
            {t("Saved to Abyss as version {{version}}.", {
              version: result.version,
            })}
            <a
              className="inline-flex items-center gap-1 underline"
              href={`${ABYSS_BASE_URL || DEFAULT_ABYSS_URL}/keymaps/${result.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("Open on Abyss")}
              <IconExternalLink size={14} />
            </a>
          </p>
        </div>
      )}

      <button
        className="btn-electric flex items-center gap-2 text-sm"
        onClick={() => void exportNow()}
        disabled={!canExport}
      >
        {isExporting ? (
          <IconLoader2 size={16} className="animate-spin" />
        ) : (
          <IconCloudUpload size={16} />
        )}
        {mode === "new" ? t("Export as new keymap") : t("Update keymap")}
      </button>
    </div>
  );
}
