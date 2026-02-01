/**
 * useDemoKeymap Hook
 *
 * Provides demo keymap functionality with mock data and simulated operations.
 * This allows users to try the keymap editor without a physical keyboard.
 */
import { useState, useCallback, useMemo } from "react";
import type {
  Keymap,
  Layer,
  BehaviorBinding,
  PhysicalLayouts,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { BehaviorDefinition, UseKeymapReturn } from "./useKeymap";
import {
  mockPhysicalLayouts,
  mockKeymap,
  mockBehaviors,
} from "../lib/mockKeymapData";

// Helper to create key for binding lookup
function bindingKey(layerId: number, keyPosition: number): string {
  return `${layerId}:${keyPosition}`;
}

// Helper to check if two bindings are equal
function bindingsEqual(a: BehaviorBinding, b: BehaviorBinding): boolean {
  return (
    a.behaviorId === b.behaviorId &&
    a.param1 === b.param1 &&
    a.param2 === b.param2
  );
}

// Helper to deep clone keymap
function cloneKeymap(keymap: Keymap): Keymap {
  return {
    ...keymap,
    layers: keymap.layers.map((layer) => ({
      ...layer,
      bindings: layer.bindings.map((binding) => ({ ...binding })),
    })),
  };
}

/**
 * Hook for demo mode keymap functionality
 */
export function useDemoKeymap(): UseKeymapReturn {
  // Initialize state with mock data
  const [physicalLayouts] = useState<PhysicalLayouts>(mockPhysicalLayouts);
  const [keymap, setKeymap] = useState<Keymap>(cloneKeymap(mockKeymap));
  const [behaviors] = useState<Map<number, BehaviorDefinition>>(mockBehaviors);
  const [originalBindings] = useState<Map<string, BehaviorBinding>>(() => {
    const bindings = new Map<string, BehaviorBinding>();
    mockKeymap.layers.forEach((layer) => {
      layer.bindings.forEach((binding, position) => {
        bindings.set(bindingKey(layer.id, position), { ...binding });
      });
    });
    return bindings;
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [removedLayerIds, setRemovedLayerIds] = useState<number[]>([]);

  // Load keymap data (no-op for demo mode, data is already loaded)
  const loadKeymapData = useCallback(async () => {
    // Already loaded, nothing to do
  }, []);

  // Set a key binding
  const setBinding = useCallback(
    async (
      layerId: number,
      keyPosition: number,
      binding: BehaviorBinding,
    ): Promise<boolean> => {
      setKeymap((prev) => {
        const newKeymap = cloneKeymap(prev);
        const layer = newKeymap.layers.find((l) => l.id === layerId);
        if (!layer || keyPosition < 0 || keyPosition >= layer.bindings.length) {
          return prev;
        }
        layer.bindings[keyPosition] = binding;
        return newKeymap;
      });
      setHasUnsavedChanges(true);
      return true;
    },
    [],
  );

  // Reset a binding to its original value
  const resetBinding = useCallback(
    async (layerId: number, keyPosition: number): Promise<boolean> => {
      const original = originalBindings.get(bindingKey(layerId, keyPosition));
      if (!original) {
        return false;
      }
      return setBinding(layerId, keyPosition, original);
    },
    [originalBindings, setBinding],
  );

  // Move a layer
  const moveLayer = useCallback(
    async (startIndex: number, destIndex: number): Promise<boolean> => {
      setKeymap((prev) => {
        const newKeymap = cloneKeymap(prev);
        const [layer] = newKeymap.layers.splice(startIndex, 1);
        newKeymap.layers.splice(destIndex, 0, layer);
        return newKeymap;
      });
      setHasUnsavedChanges(true);
      return true;
    },
    [],
  );

  // Add a new layer
  const addLayer = useCallback(async (): Promise<{
    index: number;
    layer: Layer;
  } | null> => {
    const newLayerId = Math.max(...keymap.layers.map((l) => l.id)) + 1;
    const newLayerIndex = keymap.layers.length;

    // Create default bindings (all transparent)
    const defaultBindings: BehaviorBinding[] = Array(
      mockPhysicalLayouts.layouts[0].keys.length,
    ).fill({ behaviorId: 2, param1: 0, param2: 0 }); // trans

    const newLayer: Layer = {
      id: newLayerId,
      name: `Layer ${newLayerId}`,
      bindings: defaultBindings,
    };

    setKeymap((prev) => {
      const newKeymap = cloneKeymap(prev);
      newKeymap.layers.push(newLayer);
      return newKeymap;
    });

    setHasUnsavedChanges(true);
    return { index: newLayerIndex, layer: newLayer };
  }, [keymap.layers]);

  // Remove a layer
  const removeLayer = useCallback(
    async (layerIndex: number): Promise<boolean> => {
      if (layerIndex < 0 || layerIndex >= keymap.layers.length) {
        return false;
      }

      const layerId = keymap.layers[layerIndex].id;

      setKeymap((prev) => {
        const newKeymap = cloneKeymap(prev);
        newKeymap.layers.splice(layerIndex, 1);
        return newKeymap;
      });

      setRemovedLayerIds((prev) => [...prev, layerId]);
      setHasUnsavedChanges(true);
      return true;
    },
    [keymap.layers],
  );

  // Restore a deleted layer
  const restoreLayer = useCallback(
    async (layerId: number, atIndex: number): Promise<Layer | null> => {
      // In demo mode, we can't truly restore without storing the original data
      // So we'll create a new layer as a placeholder
      const newLayer: Layer = {
        id: layerId,
        name: `Restored ${layerId}`,
        bindings: Array(mockPhysicalLayouts.layouts[0].keys.length).fill({
          behaviorId: 2,
          param1: 0,
          param2: 0,
        }),
      };

      setKeymap((prev) => {
        const newKeymap = cloneKeymap(prev);
        newKeymap.layers.splice(atIndex, 0, newLayer);
        return newKeymap;
      });

      setRemovedLayerIds((prev) => prev.filter((id) => id !== layerId));
      setHasUnsavedChanges(true);
      return newLayer;
    },
    [],
  );

  // Save changes (simulated)
  const saveChanges = useCallback(async (): Promise<boolean> => {
    // Simulate save delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    setHasUnsavedChanges(false);
    return true;
  }, []);

  // Discard changes
  const discardChanges = useCallback(async (): Promise<boolean> => {
    // Reload from mock data
    setKeymap(cloneKeymap(mockKeymap));
    setHasUnsavedChanges(false);
    setRemovedLayerIds([]);
    return true;
  }, []);

  // Set active physical layout
  const setActiveLayout = useCallback(
    async (layoutIndex: number): Promise<boolean> => {
      // In demo mode with only one layout, this is a no-op
      return layoutIndex === 0;
    },
    [],
  );

  // Get original binding
  const getOriginalBinding = useCallback(
    (layerId: number, keyPosition: number): BehaviorBinding | null => {
      return originalBindings.get(bindingKey(layerId, keyPosition)) ?? null;
    },
    [originalBindings],
  );

  // Check if binding is modified
  const isBindingModified = useCallback(
    (layerId: number, keyPosition: number): boolean => {
      const original = originalBindings.get(bindingKey(layerId, keyPosition));
      if (!original) return false;

      const layer = keymap.layers.find((l) => l.id === layerId);
      if (!layer) return false;

      const current = layer.bindings[keyPosition];
      if (!current) return false;

      return !bindingsEqual(original, current);
    },
    [originalBindings, keymap.layers],
  );

  // Get behavior by ID
  const getBehavior = useCallback(
    (behaviorId: number): BehaviorDefinition | undefined => {
      return behaviors.get(behaviorId);
    },
    [behaviors],
  );

  // Get display name for a binding
  const getBindingDisplayName = useCallback(
    (binding: BehaviorBinding): string => {
      const behavior = behaviors.get(binding.behaviorId);
      if (!behavior) {
        return `Behavior ${binding.behaviorId}`;
      }
      return behavior.displayName;
    },
    [behaviors],
  );

  // Clear unlock required (no-op for demo mode)
  const clearUnlockRequired = useCallback(() => {
    // No-op
  }, []);

  return useMemo(
    () => ({
      physicalLayouts,
      keymap,
      behaviors,
      originalBindings,
      hasUnsavedChanges,
      isLoading: false,
      error: null,
      unlockRequired: false,
      loadKeymapData,
      setBinding,
      resetBinding,
      moveLayer,
      addLayer,
      removeLayer,
      restoreLayer,
      availableLayers: 8,
      removedLayerIds,
      saveChanges,
      discardChanges,
      setActiveLayout,
      getOriginalBinding,
      isBindingModified,
      getBehavior,
      getBindingDisplayName,
      clearUnlockRequired,
    }),
    [
      physicalLayouts,
      keymap,
      behaviors,
      originalBindings,
      hasUnsavedChanges,
      removedLayerIds,
      loadKeymapData,
      setBinding,
      resetBinding,
      moveLayer,
      addLayer,
      removeLayer,
      restoreLayer,
      saveChanges,
      discardChanges,
      setActiveLayout,
      getOriginalBinding,
      isBindingModified,
      getBehavior,
      getBindingDisplayName,
      clearUnlockRequired,
    ],
  );
}
