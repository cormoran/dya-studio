import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { IconCheck, IconLoader2, IconPlus, IconX } from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";
import type { UseRuntimeMacroReturn } from "../../hooks/useRuntimeMacro";
import type { UseKeymapReturn } from "../../hooks/useKeymap";
import type { KeyboardLayoutType } from "../../lib/keyboardLayouts";
import { MacroEditorCard } from "./MacroEditorCard";
import type { MacroEditorController } from "./useMacroEditor";

interface MacroEditorDialogProps {
  open: boolean;
  /** Creation keeps the editor empty until Create macro is pressed. */
  mode: "create" | "edit";
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
  mode,
  onOpenChange,
  macro,
  runtimeMacro,
  keymap,
  layers,
  keyboardLayout,
}: MacroEditorDialogProps) {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const duplicateName =
    mode === "create" &&
    runtimeMacro.macros.some(
      (candidate) => candidate.name === macro.renameDraft.trim(),
    );
  const memoryState = [
    macro.renameDebounce.state,
    macro.delayDebounce.state,
    macro.stringDebounce.state,
    macro.tapMsDebounce.state,
  ].includes("saving")
    ? "saving"
    : macro.isMemoryWritePending
      ? "queued"
      : "idle";

  useEffect(() => {
    if (!open || mode === "create") setHasApplied(false);
    else if (memoryState === "idle" && macro.loadedMacroHasUnsavedChanges) {
      setHasApplied(true);
    }
  }, [macro.loadedMacroHasUnsavedChanges, memoryState, mode, open]);

  const handleCreateMacro = async () => {
    if (await macro.handleCreateMacro()) onOpenChange(false);
  };

  const handleSaveAndClose = async () => {
    setIsSaving(true);
    try {
      await macro.flushPendingWrites();
      if (await runtimeMacro.saveMacros()) onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
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
              {t(mode === "create" ? "New macro" : "Edit macros")}
            </Dialog.Title>
            {mode === "edit" && (memoryState !== "idle" || hasApplied) && (
              <span
                className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]"
                role="status"
              >
                {memoryState === "idle" ? (
                  <IconCheck size={16} />
                ) : (
                  <IconLoader2
                    size={16}
                    className={memoryState === "saving" ? "animate-spin" : ""}
                  />
                )}
                {t(
                  memoryState === "queued"
                    ? "Waiting to apply..."
                    : memoryState === "saving"
                      ? "Applying to memory..."
                      : "Applied to memory",
                )}
              </span>
            )}
            {mode === "create" && (
              <button
                type="button"
                className="btn-electric flex items-center gap-1.5 text-sm"
                disabled={
                  macro.isCreating ||
                  runtimeMacro.isLoading ||
                  !macro.renameDraft.trim() ||
                  duplicateName ||
                  !!macro.encodedSizeError
                }
                onClick={() => void handleCreateMacro()}
              >
                {macro.isCreating ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : (
                  <IconPlus size={16} />
                )}
                {t("Create macro")}
              </button>
            )}
            {mode === "edit" && (
              <button
                type="button"
                className="btn-electric text-sm"
                disabled={
                  isSaving || runtimeMacro.isLoading || !!macro.encodedSizeError
                }
                onClick={() => void handleSaveAndClose()}
              >
                {isSaving ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : null}
                {t("Save and close")}
              </button>
            )}
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
            {duplicateName && (
              <p role="alert" className="mb-3 text-sm text-red-400">
                {t("Macro name already exists")}
              </p>
            )}
            {runtimeMacro.error && (
              <p role="alert" className="mb-3 text-sm text-red-400">
                {runtimeMacro.error}
              </p>
            )}
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
