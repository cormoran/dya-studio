/**
 * Macro Editor Component
 * Allows users to create and edit keyboard macros
 */
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IconX, IconPlus, IconTrash } from "@tabler/icons-react";

export interface Macro {
  id: number;
  name: string;
  sequence: string;
}

interface MacroEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (macro: Macro) => void;
  existingMacro?: Macro;
}

export function MacroEditor({
  isOpen,
  onClose,
  onSave,
  existingMacro,
}: MacroEditorProps) {
  const [name, setName] = useState(existingMacro?.name || "");
  const [sequence, setSequence] = useState(existingMacro?.sequence || "");

  const handleSave = () => {
    if (!name.trim() || !sequence.trim()) return;

    onSave({
      id: existingMacro?.id ?? Date.now(),
      name: name.trim(),
      sequence: sequence.trim(),
    });

    // Reset form
    setName("");
    setSequence("");
    onClose();
  };

  const handleClose = () => {
    setName("");
    setSequence("");
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass-card p-0 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
            <div>
              <Dialog.Title className="text-lg font-medium text-[var(--color-text)]">
                {existingMacro ? "Edit Macro" : "Create Macro"}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-[var(--color-text-muted)] mt-1">
                Define a sequence of keystrokes
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="p-2 rounded-lg hover:bg-[var(--color-border)] transition-colors"
                aria-label="Close"
              >
                <IconX size={20} className="text-[var(--color-text-muted)]" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Macro Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Email Signature"
                className="input-field"
                maxLength={32}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Key Sequence
              </label>
              <textarea
                value={sequence}
                onChange={(e) => setSequence(e.target.value)}
                placeholder="e.g., hello@example.com"
                className="input-field min-h-[100px] resize-none font-mono text-sm"
                maxLength={256}
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                Enter the text you want to type when this macro is triggered
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 p-6 border-t border-[var(--color-border)]">
            <button onClick={handleClose} className="btn-ghost">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || !sequence.trim()}
              className="btn-electric"
            >
              {existingMacro ? "Update" : "Create"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Macro List Component
 * Shows all saved macros and allows selection
 */
interface MacroListProps {
  macros: Macro[];
  onSelect: (macro: Macro) => void;
  onEdit: (macro: Macro) => void;
  onDelete: (macroId: number) => void;
  onCreateNew: () => void;
}

export function MacroList({
  macros,
  onSelect,
  onEdit,
  onDelete,
  onCreateNew,
}: MacroListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
          Macros
        </h3>
        <button
          onClick={onCreateNew}
          className="text-sm text-[var(--color-electric)] hover:text-[var(--color-electric)]/80 flex items-center gap-1"
        >
          <IconPlus size={16} />
          New Macro
        </button>
      </div>

      {macros.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--color-text-muted)]">
            No macros created yet
          </p>
          <button onClick={onCreateNew} className="btn-ghost mt-2 text-sm">
            Create your first macro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {macros.map((macro) => (
            <div
              key={macro.id}
              className="group p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-electric)]/50 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => onSelect(macro)}
                  className="flex-1 text-left"
                >
                  <div className="text-sm font-medium text-[var(--color-text)]">
                    {macro.name}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1 font-mono truncate">
                    {macro.sequence}
                  </div>
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(macro)}
                    className="p-1 rounded hover:bg-[var(--color-border)] text-[var(--color-text-muted)]"
                    title="Edit macro"
                  >
                    <IconPlus size={14} className="rotate-45" />
                  </button>
                  <button
                    onClick={() => onDelete(macro.id)}
                    className="p-1 rounded hover:bg-red-500/10 text-red-500"
                    title="Delete macro"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
