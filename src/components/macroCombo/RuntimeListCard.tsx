import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  IconPlus,
  IconSettings,
  IconX,
  IconDeviceFloppy,
  IconTrash,
  IconRestore,
} from "@tabler/icons-react";
import { StatusDot } from "../EditStatusIndicator";
import { useLanguage } from "../../hooks/useLanguage";

export function UnsupportedFeatureCard({ title }: { title: string }) {
  const { t } = useLanguage();
  return (
    <section className="glass-card p-4 mt-6" aria-label={title}>
      <h2 className="text-sm font-medium text-[var(--color-text)]">
        {title}:{" "}
        <span className="text-[var(--color-text-muted)]">
          {t("Not supported")}
        </span>
      </h2>
    </section>
  );
}

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
}: {
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
  actions,
  busy = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  busy?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[60] flex max-h-[90dvh] w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--color-border)] p-4 sm:flex sm:flex-wrap sm:justify-between">
            <Dialog.Title className="min-w-0 flex-1 text-lg font-medium text-[var(--color-text)]">
              {title}
            </Dialog.Title>
            {actions && (
              <div className="col-span-2 row-start-2 flex flex-wrap items-center gap-3 sm:contents">
                {actions}
              </div>
            )}
            <Dialog.Close
              disabled={busy}
              className="btn-ghost col-start-2 row-start-1 p-1"
              aria-label={t("Close")}
            >
              <IconX size={20} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto p-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function RuntimeModalActions({
  busy,
  mutationBusy = false,
  dirty,
  saveDisabled,
  onSave,
  onDiscard,
  onDelete,
}: {
  busy: boolean;
  dirty: boolean;
  mutationBusy?: boolean;
  saveDisabled?: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onDelete && (
        <button
          type="button"
          className="btn-ghost text-sm text-red-400"
          aria-label={t("Delete")}
          disabled={busy || mutationBusy}
          onClick={onDelete}
        >
          <IconTrash size={18} />
        </button>
      )}
      {dirty && onDiscard && (
        <button
          type="button"
          className="btn-ghost text-sm flex items-center gap-1"
          disabled={busy || mutationBusy}
          onClick={onDiscard}
        >
          <IconRestore size={16} />
          {t("Discard")}
        </button>
      )}
      <button
        type="button"
        className="btn-electric text-sm flex items-center gap-1"
        disabled={busy || saveDisabled}
        onClick={onSave}
      >
        <IconDeviceFloppy size={16} />
        {t("Save and close")}
      </button>
    </div>
  );
}
