/**
 * Hook for managing keymap state
 */
import { useState, useCallback, useEffect } from "react";
import type { KeymapState, KeyBinding, KeymapLayer } from "../types/keymap";

// Mock initial data for development
const mockLayers: KeymapLayer[] = [
  {
    id: 0,
    name: "Base",
    bindings: Array(54).fill({ behaviorId: 0, param1: 0x00, param2: 0 }),
  },
  {
    id: 1,
    name: "Lower",
    bindings: Array(54).fill({ behaviorId: 0, param1: 0x00, param2: 0 }),
  },
  {
    id: 2,
    name: "Raise",
    bindings: Array(54).fill({ behaviorId: 0, param1: 0x00, param2: 0 }),
  },
  {
    id: 3,
    name: "Adjust",
    bindings: Array(54).fill({ behaviorId: 0, param1: 0x00, param2: 0 }),
  },
];

export function useKeymap() {
  const [keymapState, setKeymapState] = useState<KeymapState>({
    layers: mockLayers,
    activeLayer: 0,
    availableLayers: 4,
    maxLayerNameLength: 32,
    unsavedChanges: false,
  });

  // Track original bindings for reset functionality
  const [originalBindings, setOriginalBindings] = useState<Map<string, KeyBinding>>(new Map());
  
  // Track modified keys for visual indication
  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());

  /**
   * Get binding key for tracking modifications
   */
  const getBindingKey = useCallback((layerIndex: number, keyIndex: number) => {
    return `${layerIndex}-${keyIndex}`;
  }, []);

  /**
   * Load keymap from device
   * TODO: Replace with actual ZMK API call
   */
  const loadKeymap = useCallback(async () => {
    // For now, use mock data
    // In production, this would call the ZMK API
    setKeymapState({
      layers: mockLayers,
      activeLayer: 0,
      availableLayers: 4,
      maxLayerNameLength: 32,
      unsavedChanges: false,
    });
    
    // Store original bindings
    const originals = new Map<string, KeyBinding>();
    mockLayers.forEach((layer, layerIndex) => {
      layer.bindings.forEach((binding, keyIndex) => {
        originals.set(getBindingKey(layerIndex, keyIndex), { ...binding });
      });
    });
    setOriginalBindings(originals);
    setModifiedKeys(new Set());
  }, [getBindingKey]);

  /**
   * Set active layer
   */
  const setActiveLayer = useCallback((layerIndex: number) => {
    setKeymapState((prev) => ({
      ...prev,
      activeLayer: layerIndex,
    }));
  }, []);

  /**
   * Update key binding
   */
  const setKeyBinding = useCallback((
    layerIndex: number,
    keyIndex: number,
    binding: KeyBinding
  ) => {
    setKeymapState((prev) => {
      const newLayers = [...prev.layers];
      const newBindings = [...newLayers[layerIndex].bindings];
      newBindings[keyIndex] = binding;
      newLayers[layerIndex] = {
        ...newLayers[layerIndex],
        bindings: newBindings,
      };

      return {
        ...prev,
        layers: newLayers,
        unsavedChanges: true,
      };
    });

    // Track modification
    const key = getBindingKey(layerIndex, keyIndex);
    const original = originalBindings.get(key);
    if (original) {
      const isModified = !(
        original.behaviorId === binding.behaviorId &&
        original.param1 === binding.param1 &&
        original.param2 === binding.param2
      );
      
      setModifiedKeys((prev) => {
        const newSet = new Set(prev);
        if (isModified) {
          newSet.add(key);
        } else {
          newSet.delete(key);
        }
        return newSet;
      });
    }
  }, [getBindingKey, originalBindings]);

  /**
   * Get original binding for a key
   */
  const getOriginalBinding = useCallback((layerIndex: number, keyIndex: number): KeyBinding | null => {
    return originalBindings.get(getBindingKey(layerIndex, keyIndex)) || null;
  }, [getBindingKey, originalBindings]);

  /**
   * Check if a key is modified
   */
  const isKeyModified = useCallback((layerIndex: number, keyIndex: number): boolean => {
    return modifiedKeys.has(getBindingKey(layerIndex, keyIndex));
  }, [getBindingKey, modifiedKeys]);

  /**
   * Swap two layers
   */
  const swapLayers = useCallback((layerIndex1: number, layerIndex2: number) => {
    setKeymapState((prev) => {
      const newLayers = [...prev.layers];
      const temp = newLayers[layerIndex1];
      newLayers[layerIndex1] = newLayers[layerIndex2];
      newLayers[layerIndex2] = temp;
      
      return {
        ...prev,
        layers: newLayers,
        unsavedChanges: true,
      };
    });
  }, []);

  /**
   * Reset all changes
   */
  const resetChanges = useCallback(() => {
    const resetLayers = keymapState.layers.map((layer, layerIndex) => ({
      ...layer,
      bindings: layer.bindings.map((_, keyIndex) => {
        const original = originalBindings.get(getBindingKey(layerIndex, keyIndex));
        return original ? { ...original } : { behaviorId: 0, param1: 0, param2: 0 };
      }),
    }));

    setKeymapState((prev) => ({
      ...prev,
      layers: resetLayers,
      unsavedChanges: false,
    }));
    setModifiedKeys(new Set());
  }, [keymapState.layers, originalBindings, getBindingKey]);

  /**
   * Save changes to device
   * TODO: Implement actual ZMK API call
   */
  const saveChanges = useCallback(async () => {
    // In production, this would call the ZMK API to save changes
    // For now, just update the original bindings and clear modified state
    const newOriginals = new Map<string, KeyBinding>();
    keymapState.layers.forEach((layer, layerIndex) => {
      layer.bindings.forEach((binding, keyIndex) => {
        newOriginals.set(getBindingKey(layerIndex, keyIndex), { ...binding });
      });
    });
    setOriginalBindings(newOriginals);
    setModifiedKeys(new Set());
    
    setKeymapState((prev) => ({
      ...prev,
      unsavedChanges: false,
    }));
  }, [keymapState.layers, getBindingKey]);

  // Load keymap on mount
  useEffect(() => {
    loadKeymap();
  }, [loadKeymap]);

  return {
    keymapState,
    setActiveLayer,
    setKeyBinding,
    getOriginalBinding,
    isKeyModified,
    swapLayers,
    resetChanges,
    saveChanges,
    loadKeymap,
  };
}
