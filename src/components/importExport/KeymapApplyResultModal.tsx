import * as Dialog from "@radix-ui/react-dialog";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";
import { isEmptyDiff } from "../../lib/abyss/abyssDiff";
import type { KeymapApplyResult } from "../../lib/abyss/keymapApplyResult";
import { KeymapDiffView } from "./KeymapDiffView";
import "./KeymapApplyResultModal.css";

export function KeymapApplyResultModal({
  result,
  onClose,
}: {
  result: KeymapApplyResult;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const skipped = !isEmptyDiff(result.skipped);
  const remaining = result.remaining && !isEmptyDiff(result.remaining);
  const unverified = result.unverified && !isEmptyDiff(result.unverified);
  const outstanding = remaining
    ? result.remaining
    : unverified
      ? result.unverified
      : null;
  const outstandingTitle = remaining
    ? "Changes not applied"
    : "Changes not verified";
  const errorNotice = result.error && (
    <div
      role="alert"
      className="keymap-write-error-notice flex items-start gap-2 rounded-lg p-3 text-sm"
    >
      <IconAlertTriangle
        size={18}
        aria-hidden="true"
        className="shrink-0 mt-0.5"
      />
      <p className="whitespace-pre-wrap break-words min-w-0">
        {t(result.error)}
      </p>
    </div>
  );
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="keymap-apply-result fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-card w-[min(56rem,calc(100vw-2rem))] max-h-[90dvh] flex flex-col overflow-hidden">
          <div className="shrink-0 flex items-start gap-3 p-4 border-b border-[var(--color-border)]">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-medium">
                {t("Keyboard write result")}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-[var(--color-text-muted)] break-words">
                {result.name}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="btn-ghost p-1.5 shrink-0"
              aria-label={t("Close")}
            >
              <IconX size={16} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto p-4 space-y-4">
            <p
              role="status"
              className={`text-sm ${result.error ? "text-[var(--keymap-write-error)]" : skipped ? "text-[var(--color-warning)]" : "text-[var(--color-neon)]"}`}
            >
              {t(
                result.error
                  ? "Finished with errors."
                  : skipped
                    ? "Finished with skipped changes."
                    : "Applied to keyboard.",
              )}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t(
                result.verified && result.attempted
                  ? "Supported changes match the keyboard readback."
                  : result.attempted
                    ? "Some settings may have been written. Reopen the preview to check the keyboard before retrying."
                    : "No keymap settings were written.",
              )}
            </p>
            {!outstanding && errorNotice}
            {outstanding && (
              <section aria-label={t(outstandingTitle)} className="space-y-3">
                <h3 className="text-sm font-medium text-[var(--keymap-write-error)]">
                  {t(outstandingTitle)}
                </h3>
                {errorNotice}
                <p className="text-sm text-[var(--color-text-muted)]">
                  {t(
                    remaining
                      ? "These changes still differ from the requested settings after reading the keyboard again. The error above describes the write operation, not the cause of each individual change."
                      : "The keyboard could not be read back. These requested changes may or may not have been applied. Reopen the preview to check before retrying.",
                  )}
                </p>
                <KeymapDiffView diff={outstanding} defaultExpanded />
              </section>
            )}
            {skipped && (
              <section aria-label={t("Skipped changes")} className="space-y-3">
                <h3 className="text-sm font-medium">{t("Skipped changes")}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {t(
                    "Unsupported raw and macro bindings were skipped. Their existing settings were kept.",
                  )}
                </p>
                <KeymapDiffView diff={result.skipped} defaultExpanded />
              </section>
            )}
          </div>
          <div className="shrink-0 flex justify-end p-3 border-t border-[var(--color-border)]">
            <Dialog.Close className="btn-electric text-sm">
              {t("Close")}
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
