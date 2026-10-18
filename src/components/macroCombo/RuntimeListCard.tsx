import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IconPlus, IconSettings, IconX } from "@tabler/icons-react";
import { StatusDot } from "../EditStatusIndicator";
import { useLanguage } from "../../hooks/useLanguage";

export function RuntimeListCard({
  title,
  addLabel,
  settingsLabel,
  busy,
  addDisabled,
  error,
  items,
  onAdd,
  onSettings,
  actions,
}: {
  actions?: ReactNode;
  title: string;
  addLabel: string;
  settingsLabel: string;
  busy: boolean;
  addDisabled?: boolean;
  error: string | null;
  items: Array<{
    id: number;
    name: string;
    dirty: boolean;
    onClick: () => void;
  }>;
  onAdd: () => void;
  onSettings: () => void;
}) {
  const { t } = useLanguage();
  return (
    <section className="glass-card p-4 mt-6" aria-label={title}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-medium text-[var(--color-text)]">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            className="btn-ghost p-1"
            aria-label={settingsLabel}
            title={settingsLabel}
            disabled={busy}
            onClick={onSettings}
          >
            <IconSettings size={18} />
          </button>
          <button
            type="button"
            className="p-1 rounded text-[var(--color-electric)] hover:bg-[var(--color-border)] disabled:opacity-40"
            aria-label={addLabel}
            title={addLabel}
            disabled={busy || addDisabled}
            onClick={onAdd}
          >
            <IconPlus size={18} />
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-400 mb-2">
          {t(error)}
        </p>
      )}
      {busy && (
        <p role="status" className="text-sm text-[var(--color-text-muted)]">
          {t("Loading...")}
        </p>
      )}
      {!busy && !items.length && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("No items")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={busy}
            onClick={item.onClick}
            className={`min-w-0 max-w-full flex-[1_1_14rem] p-3 rounded-lg border text-left transition-colors disabled:opacity-40 ${item.dirty ? "bg-[var(--color-neon)]/10 border-[var(--color-neon)]/50 text-[var(--color-neon)]" : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-electric)]/60"}`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="truncate">{item.name}</span>
              <StatusDot status={item.dirty ? "unsaved" : "default"} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function RuntimeEditorModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[60] flex max-h-[90dvh] w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] p-4">
            <Dialog.Title className="text-lg font-medium text-[var(--color-text)]">
              {title}
            </Dialog.Title>
            <Dialog.Close className="btn-ghost p-1" aria-label={t("Close")}>
              <IconX size={20} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto p-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
