import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { IconCheck, IconLoader2, IconPlus, IconX } from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";
import type { UseRuntimeMacroReturn } from "../../hooks/useRuntimeMacro";
import type { UseKeymapReturn } from "../../hooks/useKeymap";
import type { KeyboardLayoutType } from "../../lib/keyboardLayouts";
import { MacroDetail } from "../../proto/cormoran/runtime_macro/runtime_macro";
import { MacroEditorCard } from "./MacroEditorCard";
import { restoreMacroMemory } from "./restoreMacroMemory";
import type { MacroEditorController } from "./useMacroEditor";

interface MacroEditorDialogProps {
  open: boolean;
  /** Creation edits stay local until Create macro is pressed. */
  mode: "create" | "edit";
  editSlot?: number;
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
  editSlot,
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
  const [baseline, setBaseline] = useState<MacroDetail | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const readyToEdit = mode === "create" || baseline?.slot === editSlot;
  const hasModalChanges =
    mode === "edit" &&
    baseline !== null &&
    readyToEdit &&
    (macro.renameDraft !== baseline.name ||
      JSON.stringify(macro.loadedMacro?.steps) !==
        JSON.stringify(baseline.steps) ||
      macro.isMemoryWritePending);
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

  useEffect(() => {
    const loaded = macro.loadedMacro;
    if (!open || mode !== "edit") {
      setBaseline(null);
    } else if (
      loaded &&
      loaded.slot === editSlot &&
      baseline?.slot !== editSlot
    ) {
      setBaseline(MacroDetail.fromPartial(loaded));
    }
  }, [baseline?.slot, editSlot, macro.loadedMacro, mode, open]);

  const handleRequestOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
    } else if (isSaving || isRestoring || runtimeMacro.isLoading) {
      return;
    } else if (hasModalChanges) {
      setRestoreError(null);
      setConfirmClose(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleDiscardAndClose = async () => {
    if (!baseline) return;
    setIsRestoring(true);
    setRestoreError(null);
    try {
      macro.cancelPendingWrites();
      await macro.flushPendingWrites();
      if (!(await restoreMacroMemory(runtimeMacro, baseline))) {
        setRestoreError(t("Could not restore the macro in memory. Try again."));
        return;
      }
      setConfirmClose(false);
      onOpenChange(false);
    } catch {
      setRestoreError(t("Could not restore the macro in memory. Try again."));
    } finally {
      setIsRestoring(false);
    }
  };

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
    <Dialog.Root open={open} onOpenChange={handleRequestOpenChange}>
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
                  !readyToEdit ||
                  isSaving ||
                  runtimeMacro.isLoading ||
                  !!macro.encodedSizeError
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
                disabled={isSaving || isRestoring || runtimeMacro.isLoading}
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
            {readyToEdit ? (
              <MacroEditorCard
                macro={macro}
                runtimeMacro={runtimeMacro}
                keymap={keymap}
                layers={layers}
                keyboardLayout={keyboardLayout}
                nestedSelectorLayer="z-[70]"
                allowDestructiveActions={false}
              />
            ) : (
              <p role="status">{t("Loading...")}</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      <Dialog.Root
        open={confirmClose}
        onOpenChange={(nextOpen) => {
          if (!isRestoring) setConfirmClose(nextOpen);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/60" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-[80] w-[min(90vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl"
          >
            <Dialog.Title className="text-lg font-medium text-[var(--color-text)]">
              {t("Discard macro edits?")}
            </Dialog.Title>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              {t(
                "Changes made in this editor will be removed from device memory. Changes already in memory when you opened it will remain.",
              )}
            </p>
            {restoreError && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {restoreError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost text-sm"
                disabled={isRestoring}
                onClick={() => setConfirmClose(false)}
              >
                {t("Keep editing")}
              </button>
              <button
                type="button"
                className="btn-electric text-sm"
                disabled={isRestoring}
                onClick={() => void handleDiscardAndClose()}
              >
                {isRestoring ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : null}
                {t("Discard edits and close")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Dialog.Root>
  );
}
