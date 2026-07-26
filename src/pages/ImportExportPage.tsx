/**
 * Import/Export tab — moves keymaps between the connected keyboard and
 * Keyboard Abyss (https://abyss.keyboard-hub.com).
 *
 * Sign-in lives here; the export and import sections below it are gated on it.
 *
 * Reading the keyboard, diffing an Abyss keymap against it, and writing the
 * diff back are all handled by `@keyboard-hub/adapter-zmk` and
 * `@keyboard-hub/adapter-common`; this page is the wiring and the UI around
 * them.
 */
import { IconCloudUpload } from "@tabler/icons-react";
import { useLanguage } from "../hooks/useLanguage";
import { useAbyssAuth } from "../hooks/useAbyssAuth";
import { useAbyssDevice } from "../hooks/useAbyssDevice";
import { AbyssAccountCard } from "../components/importExport/AbyssAccountCard";
import { DeviceSnapshotCard } from "../components/importExport/DeviceSnapshotCard";
import { ExportSection } from "../components/importExport/ExportSection";
import { ImportSection } from "../components/importExport/ImportSection";
import { useAbyssExport } from "../hooks/useAbyssExport";
import { useAbyssImport } from "../hooks/useAbyssImport";

/** Route path for the Import/Export tab. Must equal the tab id in `App.tsx`. */
export const IMPORT_EXPORT_TAB_ID = "import-export";

export function ImportExportPage() {
  const { t } = useLanguage();
  const auth = useAbyssAuth();
  // One snapshot shared by both sections — reading the device is expensive.
  const device = useAbyssDevice();
  const exporter = useAbyssExport(device.loaded, device.resolved);
  const importer = useAbyssImport(device);
  // The catalog slug is not in the resolveLayout response, so take it from the
  // keymaps listed for this keyboard — the device snapshot's own slug is
  // derived from the ZMK device name and does not identify the catalog entry.
  const keyboardSlug =
    importer.keymaps.find((keymap) => keymap.keyboardSlug ?? keymap.keyboard)
      ?.keyboardSlug ??
    importer.keymaps.find((keymap) => keymap.keyboard?.slug)?.keyboard?.slug;

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20">
            <IconCloudUpload
              size={24}
              className="text-[var(--color-electric)]"
            />
          </div>
          <div>
            <h1 className="text-xl font-medium text-[var(--color-text)]">
              {t("Import/Export")}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("Sync keymaps with Keyboard Abyss")}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <AbyssAccountCard auth={auth} />

          {auth.isAuthenticated && (
            <>
              <DeviceSnapshotCard device={device} keyboardSlug={keyboardSlug} />
              <ExportSection device={device} exporter={exporter} />
              <ImportSection device={device} importer={importer} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
