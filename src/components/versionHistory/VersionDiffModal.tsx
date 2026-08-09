/**
 * VersionDiffModal
 *
 * Confirmation step between picking a saved version and writing it. It shows
 * exactly which fields would change — current value on the left, the value
 * from the selected version on the right — so restoring is never a blind
 * action. Writing follows the app-wide memory-write model: the values go to
 * keyboard RAM, and the tab's Save button is what makes them permanent.
 */
import { useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconHistory,
  IconLoader2,
} from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";
import {
  diffSnapshots,
  formatDiffValue,
  formatVersionTimestamp,
} from "../../lib/versionHistory";
import type {
  DiffLabeler,
  JsonValue,
  StoredSnapshot,
} from "../../lib/versionHistory";

/** Diff rows shown before the list is collapsed behind a "+N more" line. */
const MAX_VISIBLE_ROWS = 200;

export interface VersionDiffModalProps<T extends JsonValue = JsonValue> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The version the user picked, or null while nothing is selected. */
  version: StoredSnapshot<T> | null;
  /** The tab's current state; null while it is still being collected. */
  current: T | null;
  /** Optional per-tab naming/formatting for snapshot paths and values. */
  labeler?: DiffLabeler;
  /** Write the selected version to keyboard memory. */
  onApply: () => void;
  isApplying?: boolean;
  error?: string | null;
}

export function VersionDiffModal<T extends JsonValue = JsonValue>({
  open,
  onOpenChange,
  version,
  current,
  labeler,
  onApply,
  isApplying = false,
  error,
}: VersionDiffModalProps<T>) {
  const { t, language } = useLanguage();

  const entries = useMemo(() => {
    if (!version || current === null) return null;
    return diffSnapshots(current, version.data);
  }, [current, version]);

  const renderValue = (path: string[], value: JsonValue | undefined) =>
    labeler?.formatValue?.(path, value) ?? formatDiffValue(value);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && isApplying) return;
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl max-h-[85vh] flex flex-col bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-2xl z-50 p-6">
          <Dialog.Title className="text-base font-medium text-[var(--color-text)] mb-1 flex items-center gap-2">
            <IconHistory size={18} className="text-[var(--color-electric)]" />
            {t("Restore this version?")}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-[var(--color-text-muted)] mb-4">
            {version
              ? t(
                  "Saved {{timestamp}}. The values below are written to keyboard memory — press Save afterwards to store them permanently.",
                  {
                    timestamp: formatVersionTimestamp(
                      version.timestamp,
                      language,
                    ),
                  },
                )
              : ""}
          </Dialog.Description>

          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-[var(--color-border)]">
            {entries === null ? (
              <p className="p-4 text-sm text-[var(--color-text-muted)] flex items-center gap-2">
                <IconLoader2 size={16} className="animate-spin" />
                {t("Reading the current state from the keyboard...")}
              </p>
            ) : entries.length === 0 ? (
              <p className="p-4 text-sm text-[var(--color-text-muted)]">
                {t(
                  "This version matches the current state — nothing to write.",
                )}
              </p>
            ) : (
              <>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">
                        {t("Field")}
                      </th>
                      <th className="text-left font-medium px-3 py-2">
                        {t("Current")}
                      </th>
                      <th className="text-left font-medium px-3 py-2">
                        {t("Selected version")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, MAX_VISIBLE_ROWS).map((entry) => (
                      <tr
                        key={entry.path.join("/")}
                        className="border-t border-[var(--color-border)]"
                      >
                        <td className="px-3 py-1.5 text-[var(--color-text-secondary)] align-top">
                          {labeler?.label(entry.path) ?? entry.path.join(" › ")}
                        </td>
                        <td className="px-3 py-1.5 text-[var(--color-text-muted)] align-top break-all">
                          {renderValue(entry.path, entry.before)}
                        </td>
                        <td className="px-3 py-1.5 text-[var(--color-neon)] align-top break-all">
                          <span className="inline-flex items-center gap-1">
                            <IconArrowRight
                              size={12}
                              className="text-[var(--color-text-muted)] flex-shrink-0"
                            />
                            {renderValue(entry.path, entry.after)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {entries.length > MAX_VISIBLE_ROWS && (
                  <p className="px-3 py-2 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                    {t("and {{count}} more changes", {
                      count: entries.length - MAX_VISIBLE_ROWS,
                    })}
                  </p>
                )}
              </>
            )}
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-400 flex items-center gap-1.5">
              <IconAlertTriangle size={14} />
              {t(error)}
            </p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              className="flex-1 btn-ghost border border-[var(--color-border)]"
              onClick={() => onOpenChange(false)}
              disabled={isApplying}
            >
              {t("Cancel")}
            </button>
            <button
              type="button"
              className="flex-1 btn-electric flex items-center justify-center gap-2"
              onClick={onApply}
              disabled={isApplying || entries === null || entries.length === 0}
            >
              {isApplying && <IconLoader2 size={16} className="animate-spin" />}
              {t("Write to keyboard")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
