import { useState, useContext, useCallback, useMemo } from "react";
import {
  IconKeyboard,
  IconDeviceFloppy,
  IconRefresh,
  IconChevronUp,
  IconChevronDown,
  IconAlertCircle,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconRestore,
} from "@tabler/icons-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ConnectionContext } from "../components/DeviceConnection";
import { useDemoMode } from "../contexts/DemoModeContext";
import { KeyboardLayout } from "../components/KeyboardLayout";
import { KeycodeSelector } from "../components/KeycodeSelector";
import { UnlockPrompt } from "../components/UnlockPrompt";
import { useKeymap } from "../hooks/useKeymap";
import { useDemoKeymap } from "../hooks/useDemoKeymap";
import type { BehaviorBinding } from "../hooks/useKeymap";

export function KeymapPage() {
  const connection = useContext(ConnectionContext);
  const demoMode = useDemoMode();
  const realKeymap = useKeymap();
  const demoKeymap = useDemoKeymap();

  // Use demo keymap if in demo mode, otherwise use real keymap
  const keymap = demoMode.isDemoMode ? demoKeymap : realKeymap;

  // Local UI state
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
  const [selectedKeyPosition, setSelectedKeyPosition] = useState<number | null>(
    null,
  );
  const [showKeycodeSelector, setShowKeycodeSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Get current layer
  const currentLayer = useMemo(() => {
    if (!keymap.keymap?.layers) return null;
    return keymap.keymap.layers[selectedLayerIndex] ?? null;
  }, [keymap.keymap?.layers, selectedLayerIndex]);

  // Get current physical layout
  const currentLayout = useMemo(() => {
    if (!keymap.physicalLayouts?.layouts) return null;
    const index = keymap.physicalLayouts.activeLayoutIndex;
    return keymap.physicalLayouts.layouts[index] ?? null;
  }, [keymap.physicalLayouts]);

  // Layers for the selector
  const layersForSelector = useMemo(() => {
    if (!keymap.keymap?.layers) return [];
    return keymap.keymap.layers.map((l) => ({ id: l.id, name: l.name }));
  }, [keymap.keymap?.layers]);

  // Get current binding for selected key
  const currentBinding = useMemo(() => {
    if (selectedKeyPosition === null || !currentLayer) return null;
    return currentLayer.bindings[selectedKeyPosition] ?? null;
  }, [selectedKeyPosition, currentLayer]);

  // Handle key click
  const handleKeyClick = useCallback((keyPosition: number) => {
    setSelectedKeyPosition(keyPosition);
    setShowKeycodeSelector(true);
  }, []);

  // Handle key reset
  const handleKeyReset = useCallback(
    async (keyPosition: number) => {
      if (!currentLayer) return;
      await keymap.resetBinding(currentLayer.id, keyPosition);
    },
    [currentLayer, keymap],
  );

  // Handle binding selection
  const handleBindingSelect = useCallback(
    async (binding: BehaviorBinding) => {
      if (!currentLayer || selectedKeyPosition === null) return;
      await keymap.setBinding(currentLayer.id, selectedKeyPosition, binding);
      setShowKeycodeSelector(false);
      setSelectedKeyPosition(null);
    },
    [currentLayer, selectedKeyPosition, keymap],
  );

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await keymap.saveChanges();
    } finally {
      setIsSaving(false);
    }
  }, [keymap]);

  // Handle discard
  const handleDiscard = useCallback(async () => {
    if (!confirm("Are you sure you want to discard all changes?")) return;
    setIsDiscarding(true);
    try {
      await keymap.discardChanges();
    } finally {
      setIsDiscarding(false);
    }
  }, [keymap]);

  // Handle layer move up
  const handleMoveLayerUp = useCallback(async () => {
    if (selectedLayerIndex <= 0) return;
    const success = await keymap.moveLayer(
      selectedLayerIndex,
      selectedLayerIndex - 1,
    );
    if (success) {
      setSelectedLayerIndex(selectedLayerIndex - 1);
    }
  }, [selectedLayerIndex, keymap]);

  // Handle layer move down
  const handleMoveLayerDown = useCallback(async () => {
    if (!keymap.keymap?.layers) return;
    if (selectedLayerIndex >= keymap.keymap.layers.length - 1) return;
    const success = await keymap.moveLayer(
      selectedLayerIndex,
      selectedLayerIndex + 1,
    );
    if (success) {
      setSelectedLayerIndex(selectedLayerIndex + 1);
    }
  }, [selectedLayerIndex, keymap]);

  // Handle add layer
  const handleAddLayer = useCallback(async () => {
    const result = await keymap.addLayer();
    if (result) {
      // Select the new layer
      setSelectedLayerIndex(result.index);
    }
  }, [keymap]);

  // Handle delete layer
  const handleDeleteLayer = useCallback(async () => {
    if (!keymap.keymap?.layers || keymap.keymap.layers.length <= 1) return;
    if (!confirm("Are you sure you want to delete this layer?")) return;

    const success = await keymap.removeLayer(selectedLayerIndex);
    if (success) {
      // Adjust selected index if we deleted the last layer
      if (selectedLayerIndex >= keymap.keymap.layers.length - 1) {
        setSelectedLayerIndex(Math.max(0, selectedLayerIndex - 1));
      }
    }
  }, [selectedLayerIndex, keymap]);

  // Handle restore layer
  const handleRestoreLayer = useCallback(async () => {
    if (keymap.removedLayerIds.length === 0) return;

    // Restore the most recently removed layer at the end
    const layerId = keymap.removedLayerIds[keymap.removedLayerIds.length - 1];
    const atIndex = keymap.keymap?.layers.length ?? 0;

    const layer = await keymap.restoreLayer(layerId, atIndex);
    if (layer) {
      // Select the restored layer
      setSelectedLayerIndex(atIndex);
    }
  }, [keymap]);

  // Handle unlock retry
  const handleUnlockRetry = useCallback(() => {
    keymap.clearUnlockRequired();
    keymap.loadKeymapData();
  }, [keymap]);

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20">
              <IconKeyboard
                size={24}
                className="text-[var(--color-electric)]"
              />
            </div>
            <div>
              <h1 className="text-xl font-medium text-[var(--color-text)]">
                Keymap
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                Configure key bindings and layers
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {(connection.isConnected || demoMode.isDemoMode) && keymap.keymap && (
            <div className="flex items-center gap-2">
              {keymap.hasUnsavedChanges && (
                <span className="text-xs text-[var(--color-neon)] mr-2">
                  ● Unsaved changes
                </span>
              )}
              <button
                className="btn-ghost text-sm flex items-center gap-1.5"
                onClick={handleDiscard}
                disabled={
                  isDiscarding || !keymap.hasUnsavedChanges || keymap.isLoading
                }
              >
                {isDiscarding ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : (
                  <IconRefresh size={16} />
                )}
                Reset All
              </button>
              <button
                className="btn-electric text-sm flex items-center gap-1.5"
                onClick={handleSave}
                disabled={
                  isSaving || !keymap.hasUnsavedChanges || keymap.isLoading
                }
              >
                {isSaving ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : (
                  <IconDeviceFloppy size={16} />
                )}
                Save
              </button>
            </div>
          )}
        </div>

        {/* Not Connected State */}
        {!connection.isConnected && !demoMode.isDemoMode && (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Connect your keyboard to edit keymaps
            </p>
          </div>
        )}

        {/* Error State */}
        {keymap.error && !keymap.unlockRequired && (
          <div className="glass-card p-4 mb-4 border-red-500/20 bg-red-500/10 flex items-center gap-3">
            <IconAlertCircle size={20} className="text-red-400" />
            <p className="text-sm text-red-400">{keymap.error}</p>
          </div>
        )}
        {/* Loading State */}
        {(connection.isConnected || demoMode.isDemoMode) &&
          keymap.isLoading && (
            <div className="glass-card p-6 text-center mb-6">
              <IconLoader2
                size={24}
                className="animate-spin mx-auto mb-2 text-[var(--color-electric)]"
              />
              <p className="text-sm text-[var(--color-text-muted)]">
                Loading keymap data...
              </p>
            </div>
          )}

        {/* Main Content */}
        {(connection.isConnected || demoMode.isDemoMode) &&
          keymap.keymap &&
          currentLayout && (
          <>
            {/* Layer Tabs */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex gap-2 flex-1 overflow-x-auto pb-2">
                {keymap.keymap.layers.map((layer, index) => (
                  <button
                    key={layer.id}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      index === selectedLayerIndex
                        ? "bg-[var(--color-electric)]/20 text-[var(--color-electric)] border border-[var(--color-electric)]/30"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                    }`}
                    onClick={() => setSelectedLayerIndex(index)}
                  >
                    {layer.name || `Layer ${index}`}
                  </button>
                ))}
              </div>

              {/* Layer Management Buttons */}
              <Tooltip.Provider delayDuration={200}>
                <div className="flex items-center gap-1 border-l border-[var(--color-border)] pl-2">
                  {/* Layer Sorting Label */}
                  <span className="text-xs text-[var(--color-text-muted)] mr-1">
                    Sort:
                  </span>

                  {/* Move Up Button */}
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={handleMoveLayerUp}
                        disabled={selectedLayerIndex <= 0}
                        aria-label="Move layer up (higher priority)"
                      >
                        <IconChevronUp
                          size={16}
                          className="text-[var(--color-text-muted)]"
                        />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="px-2 py-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] shadow-lg z-50"
                        sideOffset={5}
                      >
                        Move layer up (higher priority)
                        <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>

                  {/* Move Down Button */}
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={handleMoveLayerDown}
                        disabled={
                          selectedLayerIndex >= keymap.keymap.layers.length - 1
                        }
                        aria-label="Move layer down (lower priority)"
                      >
                        <IconChevronDown
                          size={16}
                          className="text-[var(--color-text-muted)]"
                        />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="px-2 py-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] shadow-lg z-50"
                        sideOffset={5}
                      >
                        Move layer down (lower priority)
                        <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </div>

                {/* Layer Add/Delete/Restore Buttons */}
                <div className="flex items-center gap-1 border-l border-[var(--color-border)] pl-2">
                  {/* Add Layer Button */}
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={handleAddLayer}
                        disabled={
                          keymap.availableLayers <= keymap.keymap.layers.length
                        }
                        aria-label="Add new layer"
                      >
                        <IconPlus
                          size={16}
                          className="text-[var(--color-neon)]"
                        />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="px-2 py-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] shadow-lg z-50"
                        sideOffset={5}
                      >
                        Add new layer
                        <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>

                  {/* Delete Layer Button */}
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={handleDeleteLayer}
                        disabled={keymap.keymap.layers.length <= 1}
                        aria-label="Delete current layer"
                      >
                        <IconTrash size={16} className="text-red-400" />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="px-2 py-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] shadow-lg z-50"
                        sideOffset={5}
                      >
                        Delete current layer
                        <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>

                  {/* Restore Layer Button */}
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={handleRestoreLayer}
                        disabled={keymap.removedLayerIds.length === 0}
                        aria-label="Restore deleted layer"
                      >
                        <IconRestore
                          size={16}
                          className="text-[var(--color-electric)]"
                        />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="px-2 py-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] shadow-lg z-50"
                        sideOffset={5}
                      >
                        {keymap.removedLayerIds.length > 0
                          ? `Restore deleted layer (${keymap.removedLayerIds.length} available)`
                          : "No deleted layers to restore"}
                        <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </div>
              </Tooltip.Provider>
            </div>

            {/* Physical Layout Selector (if multiple layouts) */}
            {keymap.physicalLayouts &&
              keymap.physicalLayouts.layouts.length > 1 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Layout:
                  </span>
                  <select
                    value={keymap.physicalLayouts.activeLayoutIndex}
                    onChange={(e) =>
                      keymap.setActiveLayout(Number(e.target.value))
                    }
                    className="px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)]"
                  >
                    {keymap.physicalLayouts.layouts.map((layout, index) => (
                      <option key={index} value={index}>
                        {layout.name || `Layout ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {/* Keyboard Layout */}
            {currentLayer && (
              <div className="glass-card p-8">
                <KeyboardLayout
                  layout={currentLayout}
                  layer={currentLayer}
                  behaviors={keymap.behaviors}
                  selectedKey={selectedKeyPosition}
                  onKeyClick={handleKeyClick}
                  onKeyReset={handleKeyReset}
                  isBindingModified={keymap.isBindingModified}
                  getOriginalBinding={keymap.getOriginalBinding}
                />
              </div>
            )}
          </>
        )}

        {/* Info */}
        <div className="mt-8 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)]">
          <p className="text-xs text-[var(--color-text-muted)]">
            {demoMode.isDemoMode
              ? "Demo Mode: Try the keymap editor with sample data. Changes are simulated and won't affect a real keyboard."
              : connection.isConnected
                ? "Click on a key to modify its binding. Modified keys are highlighted in green and show the original binding on hover. Use the Reset All button to discard all changes."
                : "Connect your keyboard to edit keymaps. Click on a key to modify its binding."}
          </p>
        </div>
      </div>

      {/* Keycode Selector Dialog */}
      <KeycodeSelector
        open={showKeycodeSelector}
        onClose={() => {
          setShowKeycodeSelector(false);
          setSelectedKeyPosition(null);
        }}
        onSelect={handleBindingSelect}
        currentBinding={currentBinding}
        behaviors={keymap.behaviors}
        layers={layersForSelector}
      />

      {/* Unlock Prompt */}
      <UnlockPrompt
        open={keymap.unlockRequired}
        onClose={() => keymap.clearUnlockRequired()}
        onRetry={handleUnlockRetry}
      />
    </div>
  );
}
