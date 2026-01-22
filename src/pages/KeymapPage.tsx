import { useState, useCallback } from "react";
import { IconKeyboard, IconDeviceFloppy, IconRestore, IconArrowsExchange } from "@tabler/icons-react";
import { useKeymap } from "../hooks/useKeymap";
import { KeycodeSelector } from "../components/KeycodeSelector";
import { KeyboardKey } from "../components/KeyboardKey";
import type { KeycodeDefinition } from "../types/keymap";

export function KeymapPage() {
  const {
    keymapState,
    setActiveLayer,
    setKeyBinding,
    getOriginalBinding,
    isKeyModified,
    swapLayers,
    resetChanges,
    saveChanges,
  } = useKeymap();

  const [selectedKey, setSelectedKey] = useState<{
    layerIndex: number;
    keyIndex: number;
  } | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSwapMode, setIsSwapMode] = useState(false);
  const [swapSourceLayer, setSwapSourceLayer] = useState<number | null>(null);

  // Handle key click
  const handleKeyClick = useCallback((keyIndex: number) => {
    setSelectedKey({
      layerIndex: keymapState.activeLayer,
      keyIndex,
    });
    setIsSelectorOpen(true);
  }, [keymapState.activeLayer]);

  // Handle keycode selection
  const handleKeycodeSelect = useCallback((keycode: KeycodeDefinition) => {
    if (!selectedKey) return;

    setKeyBinding(selectedKey.layerIndex, selectedKey.keyIndex, {
      behaviorId: keycode.behaviorId,
      param1: keycode.param1 ?? 0,
      param2: keycode.param2 ?? 0,
    });
  }, [selectedKey, setKeyBinding]);

  // Handle layer swap
  const handleLayerSwap = useCallback((targetLayer: number) => {
    if (!isSwapMode) {
      setIsSwapMode(true);
      setSwapSourceLayer(targetLayer);
    } else if (swapSourceLayer !== null && swapSourceLayer !== targetLayer) {
      swapLayers(swapSourceLayer, targetLayer);
      setIsSwapMode(false);
      setSwapSourceLayer(null);
    }
  }, [isSwapMode, swapSourceLayer, swapLayers]);

  // Keyboard layout - mapping key indices to positions
  const leftHalfRows = [
    [0, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17],
    [18, 19, 20, 21, 22, 23],
  ];
  const leftThumbCluster = [24, 25, 26];

  const rightHalfRows = [
    [27, 28, 29, 30, 31, 32],
    [33, 34, 35, 36, 37, 38],
    [39, 40, 41, 42, 43, 44],
    [45, 46, 47, 48, 49, 50],
  ];
  const rightThumbCluster = [51, 52, 53];

  const currentLayer = keymapState.layers[keymapState.activeLayer];

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
          <div className="flex items-center gap-2">
            {keymapState.unsavedChanges && (
              <button
                onClick={resetChanges}
                className="btn-ghost text-sm flex items-center gap-2"
                title="Reset all changes"
              >
                <IconRestore size={16} />
                Reset
              </button>
            )}
            <button
              onClick={saveChanges}
              disabled={!keymapState.unsavedChanges}
              className="btn-electric text-sm flex items-center gap-2"
              title="Save changes to device"
            >
              <IconDeviceFloppy size={16} />
              Save
            </button>
          </div>
        </div>

        {/* Layer Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex gap-2 flex-1">
            {keymapState.layers.map((layer, index) => (
              <button
                key={layer.id}
                onClick={() => !isSwapMode && setActiveLayer(index)}
                onDoubleClick={() => handleLayerSwap(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  keymapState.activeLayer === index
                    ? "bg-[var(--color-electric)]/20 text-[var(--color-electric)] border border-[var(--color-electric)]/30"
                    : isSwapMode && swapSourceLayer === index
                    ? "bg-[var(--color-neon)]/20 text-[var(--color-neon)] border border-[var(--color-neon)]/30"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                }`}
                title={isSwapMode ? "Click to swap with selected layer" : "Double-click to swap layers"}
              >
                {layer.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              if (isSwapMode) {
                setIsSwapMode(false);
                setSwapSourceLayer(null);
              } else {
                setIsSwapMode(true);
              }
            }}
            className={`p-2 rounded-lg transition-colors ${
              isSwapMode
                ? "bg-[var(--color-neon)]/20 text-[var(--color-neon)] border border-[var(--color-neon)]/30"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            }`}
            title="Swap layers"
          >
            <IconArrowsExchange size={20} />
          </button>
        </div>

        {/* Keyboard Layout */}
        <div className="glass-card p-8">
          <div className="flex gap-8 justify-center">
            {/* Left Half */}
            <div className="flex flex-col gap-2">
              {leftHalfRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1.5">
                  {row.map((keyIndex) => (
                    <KeyboardKey
                      key={keyIndex}
                      binding={currentLayer.bindings[keyIndex]}
                      originalBinding={getOriginalBinding(keymapState.activeLayer, keyIndex)}
                      isModified={isKeyModified(keymapState.activeLayer, keyIndex)}
                      onClick={() => handleKeyClick(keyIndex)}
                    />
                  ))}
                </div>
              ))}
              {/* Thumb Cluster */}
              <div className="flex gap-1.5 justify-end mt-2">
                {leftThumbCluster.map((keyIndex) => (
                  <KeyboardKey
                    key={keyIndex}
                    binding={currentLayer.bindings[keyIndex]}
                    originalBinding={getOriginalBinding(keymapState.activeLayer, keyIndex)}
                    isModified={isKeyModified(keymapState.activeLayer, keyIndex)}
                    onClick={() => handleKeyClick(keyIndex)}
                    className="!w-14 !h-10"
                  />
                ))}
              </div>
            </div>

            {/* Right Half */}
            <div className="flex flex-col gap-2">
              {rightHalfRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1.5">
                  {row.map((keyIndex) => (
                    <KeyboardKey
                      key={keyIndex}
                      binding={currentLayer.bindings[keyIndex]}
                      originalBinding={getOriginalBinding(keymapState.activeLayer, keyIndex)}
                      isModified={isKeyModified(keymapState.activeLayer, keyIndex)}
                      onClick={() => handleKeyClick(keyIndex)}
                    />
                  ))}
                </div>
              ))}
              {/* Thumb Cluster */}
              <div className="flex gap-1.5 mt-2">
                {rightThumbCluster.map((keyIndex) => (
                  <KeyboardKey
                    key={keyIndex}
                    binding={currentLayer.bindings[keyIndex]}
                    originalBinding={getOriginalBinding(keymapState.activeLayer, keyIndex)}
                    isModified={isKeyModified(keymapState.activeLayer, keyIndex)}
                    onClick={() => handleKeyClick(keyIndex)}
                    className="!w-14 !h-10"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)]">
          <p className="text-xs text-[var(--color-text-muted)]">
            Click on a key to modify its binding. Modified keys are highlighted in blue.
            Hover over modified keys to see the original binding. Double-click layer tabs to swap layers.
          </p>
        </div>

        {/* Keycode Selector Dialog */}
        <KeycodeSelector
          isOpen={isSelectorOpen}
          onClose={() => setIsSelectorOpen(false)}
          onSelect={handleKeycodeSelect}
        />
      </div>
    </div>
  );
}
