/**
 * Keycode Selector Dialog
 * A searchable, categorized UI for selecting keycodes
 */
import { useState, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IconX, IconSearch } from "@tabler/icons-react";
import { KEYCODE_CATEGORIES, type KeycodeDefinition } from "../types/keymap";
import { MacroEditor, MacroList, type Macro } from "./MacroEditor";

interface KeycodeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (keycode: KeycodeDefinition) => void;
  macros?: Macro[];
  onMacroSave?: (macro: Macro) => void;
  onMacroDelete?: (macroId: number) => void;
}

export function KeycodeSelector({
  isOpen,
  onClose,
  onSelect,
  macros = [],
  onMacroSave,
  onMacroDelete,
}: KeycodeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isMacroEditorOpen, setIsMacroEditorOpen] = useState(false);
  const [editingMacro, setEditingMacro] = useState<Macro | undefined>(undefined);

  // Filter keycodes based on search and category
  const filteredCategories = useMemo(() => {
    if (!searchQuery && !selectedCategory) {
      return KEYCODE_CATEGORIES;
    }

    return KEYCODE_CATEGORIES.map((category) => {
      // Filter by selected category
      if (selectedCategory && category.name !== selectedCategory) {
        return null;
      }

      // Filter by search query
      const filteredKeycodes = category.keycodes.filter((keycode) => {
        const query = searchQuery.toLowerCase();
        return (
          keycode.label.toLowerCase().includes(query) ||
          (keycode.description?.toLowerCase().includes(query) ?? false)
        );
      });

      if (filteredKeycodes.length === 0) {
        return null;
      }

      return {
        ...category,
        keycodes: filteredKeycodes,
      };
    }).filter((cat): cat is NonNullable<typeof cat> => cat !== null);
  }, [searchQuery, selectedCategory]);

  const handleSelect = (keycode: KeycodeDefinition) => {
    onSelect(keycode);
    onClose();
    setSearchQuery("");
    setSelectedCategory(null);
  };

  const handleMacroSelect = (macro: Macro) => {
    // Convert macro to a keycode definition
    // In a real implementation, this would use a specific macro behavior ID
    onSelect({
      code: macro.id,
      label: macro.name,
      description: `Macro: ${macro.sequence}`,
      behaviorId: 99, // Special behavior ID for macros
      param1: macro.id,
      param2: 0,
    });
    onClose();
    setSearchQuery("");
    setSelectedCategory(null);
  };

  const handleMacroSave = (macro: Macro) => {
    onMacroSave?.(macro);
    setEditingMacro(undefined);
  };

  const handleMacroEdit = (macro: Macro) => {
    setEditingMacro(macro);
    setIsMacroEditorOpen(true);
  };

  const handleMacroDelete = (macroId: number) => {
    onMacroDelete?.(macroId);
  };

  const handleCreateMacro = () => {
    setEditingMacro(undefined);
    setIsMacroEditorOpen(true);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[80vh] glass-card p-0 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
            <div>
              <Dialog.Title className="text-lg font-medium text-[var(--color-text)]">
                Select Keycode
              </Dialog.Title>
              <Dialog.Description className="text-sm text-[var(--color-text-muted)] mt-1">
                Choose a key binding or search for a specific keycode
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

          {/* Search */}
          <div className="p-6 border-b border-[var(--color-border)]">
            <div className="relative">
              <IconSearch
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                type="text"
                placeholder="Search keycodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 px-6 py-4 border-b border-[var(--color-border)] overflow-x-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === null
                  ? "bg-[var(--color-electric)]/20 text-[var(--color-electric)] border border-[var(--color-electric)]/30"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
              }`}
            >
              All
            </button>
            {KEYCODE_CATEGORIES.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.name
                    ? "bg-[var(--color-electric)]/20 text-[var(--color-electric)] border border-[var(--color-electric)]/30"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                }`}
              >
                {category.name}
              </button>
            ))}
            <button
              onClick={() => setSelectedCategory("Macros")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === "Macros"
                  ? "bg-[var(--color-electric)]/20 text-[var(--color-electric)] border border-[var(--color-electric)]/30"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
              }`}
            >
              Macros
            </button>
          </div>

          {/* Keycode Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedCategory === "Macros" ? (
              <MacroList
                macros={macros}
                onSelect={handleMacroSelect}
                onEdit={handleMacroEdit}
                onDelete={handleMacroDelete}
                onCreateNew={handleCreateMacro}
              />
            ) : (
              <div className="space-y-6">
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-[var(--color-text-muted)]">
                      No keycodes found matching your search
                    </p>
                  </div>
                ) : (
                  filteredCategories.map((category) => (
                    <div key={category.name}>
                      <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                        {category.name}
                      </h3>
                      <div className="grid grid-cols-4 tablet:grid-cols-6 gap-2">
                        {category.keycodes.map((keycode, index) => (
                          <button
                            key={`${category.name}-${index}`}
                            onClick={() => handleSelect(keycode)}
                            className="group relative p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-electric)]/50 hover:bg-[var(--color-electric)]/5 transition-all text-center"
                            title={keycode.description || keycode.label}
                          >
                            <div className="text-sm font-medium text-[var(--color-text)]">
                              {keycode.label}
                            </div>
                            {keycode.description && (
                              <div className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                                {keycode.description}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Macro Editor Dialog */}
      <MacroEditor
        isOpen={isMacroEditorOpen}
        onClose={() => {
          setIsMacroEditorOpen(false);
          setEditingMacro(undefined);
        }}
        onSave={handleMacroSave}
        existingMacro={editingMacro}
      />
    </Dialog.Root>
  );
}
