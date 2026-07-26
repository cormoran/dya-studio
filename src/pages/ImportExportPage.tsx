/**
 * Import/Export tab — moves keymaps between the connected keyboard and
 * Keyboard Abyss (https://abyss.keyboard-hub.com).
 *
 * Sign-in lives here; the export and import sections below it are gated on it.
 *
 * The device-side halves (reading the keyboard into KeyboardHub JSON, diffing
 * an Abyss keymap against it, and writing the diff back) are provided by the
 * `@keyboard-hub/adapter-zmk` / `@keyboard-hub/adapter-common` packages, which
 * are not published to npm yet. Until they are, those sections render an
 * explicit notice rather than a half-working flow.
 */
import { IconCloudUpload } from "@tabler/icons-react";
import { useLanguage } from "../hooks/useLanguage";
import { useAbyssAuth } from "../hooks/useAbyssAuth";
import { useAbyssDevice } from "../hooks/useAbyssDevice";
import { AbyssAccountCard } from "../components/importExport/AbyssAccountCard";
import { DeviceSnapshotCard } from "../components/importExport/DeviceSnapshotCard";

/** Route path for the Import/Export tab. Must equal the tab id in `App.tsx`. */
export const IMPORT_EXPORT_TAB_ID = "import-export";

function PendingSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        {description}
      </p>
      <div className="p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)]">
        <p className="text-sm text-[var(--color-text-muted)]">
          {t(
            "Not available in this build yet — the Abyss keyboard adapter has not been released.",
          )}
        </p>
      </div>
    </div>
  );
}

export function ImportExportPage() {
  const { t } = useLanguage();
  const auth = useAbyssAuth();
  // One snapshot shared by both sections — reading the device is expensive.
  const device = useAbyssDevice();

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
              <DeviceSnapshotCard device={device} />
              <PendingSection
                title={t("Export")}
                description={t(
                  "Upload the connected keyboard's keymap to Abyss, either as a new keymap or as a new version of an existing one.",
                )}
              />
              <PendingSection
                title={t("Import")}
                description={t(
                  "Pick a compatible keymap from Abyss, review what would change, and write it to the connected keyboard.",
                )}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
