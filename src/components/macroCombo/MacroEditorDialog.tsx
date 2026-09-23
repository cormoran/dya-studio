import * as Dialog from "@radix-ui/react-dialog";
import { IconLoader2, IconPlus, IconX } from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";
import type { UseRuntimeMacroReturn } from "../../hooks/useRuntimeMacro";
import type { UseKeymapReturn } from "../../hooks/useKeymap";
import type { KeyboardLayoutType } from "../../lib/keyboardLayouts";
import { MacroEditorCard } from "./MacroEditorCard";
import type { MacroEditorController } from "./useMacroEditor";

interface MacroEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  macro: MacroEditorController;
  runtimeMacro: UseRuntimeMacroReturn;
  keymap: UseKeymapReturn;
  layers: Array<{ id: number; name: string }>;
  keyboardLayout: KeyboardLayoutType;
}

/** Runtime macro editing from the key-binding selector. */
export function MacroEditorDialog({
  open,
  onOpenChange,
  macro,
  runtimeMacro,
  keymap,
  layers,
  keyboardLayout,
}: MacroEditorDialogProps) {
  const { t } = useLanguage();

  const handleCreateMacro = () => {
    void macro.handleCreateMacro();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[60] flex h-[min(90dvh,760px)] w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] p-4">
            <Dialog.Title className="min-w-0 flex-1 text-lg font-medium text-[var(--color-text)]">
              {t("Edit macros")}
            </Dialog.Title>
            {macro.isMemoryWritePending && (
              <span
                className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]"
                role="status"
              >
                <IconLoader2 size={16} className="animate-spin" />
                {t("Memory...")}
              </span>
            )}
            <button
              type="button"
              className="btn-electric flex items-center gap-1.5 text-sm"
              disabled={macro.isCreating || runtimeMacro.isLoading}
              onClick={() => void handleCreateMacro()}
            >
              {macro.isCreating ? (
                <IconLoader2 size={16} className="animate-spin" />
              ) : (
                <IconPlus size={16} />
              )}
              {t("Create macro")}
            </button>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
                aria-label={t("Close")}
              >
                <IconX size={20} />
              </button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <MacroEditorCard
              macro={macro}
              runtimeMacro={runtimeMacro}
              keymap={keymap}
              layers={layers}
              keyboardLayout={keyboardLayout}
              nestedSelectorLayer="z-[70]"
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
