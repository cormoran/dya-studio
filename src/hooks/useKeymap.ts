/**
 * Hook for managing keymap state
 */
import { useState, useCallback, useEffect, useContext } from "react";
import type { KeymapState, KeyBinding, KeymapLayer } from "../types/keymap";
import { ConnectionContext } from "../components/DeviceConnection";
import type { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client";
import { call_rpc } from "@zmkfirmware/zmk-studio-ts-client";
import type { Request } from "@zmkfirmware/zmk-studio-ts-client";

// Device response types
interface DeviceKeymap {
  layers: Array<{
    id: number;
    name: string;
    bindings: Array<{
      behaviorId: number;
      param1: number;
      param2: number;
    }>;
  }>;
  availableLayers: number;
  maxLayerNameLength: number;
}

export interface PhysicalLayout {
  name: string;
  keys: Array<{
    width: number;
    height: number;
    x: number;
    y: number;
    r: number;
    rx: number;
    ry: number;
  }>;
}

export interface PhysicalLayouts {
  activeLayoutIndex: number;
  layouts: PhysicalLayout[];
}

export interface BehaviorDetails {
  id: number;
  displayName: string;
  metadata: Array<{
    param1: Array<{
      name: string;
      nil?: {};
      constant?: number;
      range?: { min: number; max: number };
      hidUsage?: { keyboardMax: number; consumerMax: number };
      layerId?: {};
    }>;
    param2: Array<{
      name: string;
      nil?: {};
      constant?: number;
      range?: { min: number; max: number };
      hidUsage?: { keyboardMax: number; consumerMax: number };
      layerId?: {};
    }>;
  }>;
}

/**
 * Load keymap from device via RPC
 */
async function loadKeymapFromDevice(connection: RpcConnection): Promise<DeviceKeymap> {
  const response = await call_rpc(connection, {
    keymap: { getKeymap: true },
  } as Request);
  
  if (!response.keymap?.getKeymap) {
    throw new Error("Failed to load keymap from device");
  }
  
  return response.keymap.getKeymap as DeviceKeymap;
}

/**
 * Load physical layouts from device via RPC
 */
async function loadPhysicalLayoutsFromDevice(connection: RpcConnection): Promise<PhysicalLayouts> {
  const response = await call_rpc(connection, {
    keymap: { getPhysicalLayouts: true },
  } as Request);
  
  if (!response.keymap?.getPhysicalLayouts) {
    throw new Error("Failed to load physical layouts from device");
  }
  
  return response.keymap.getPhysicalLayouts as PhysicalLayouts;
}

/**
 * Load all behaviors from device via RPC
 */
async function loadBehaviorsFromDevice(connection: RpcConnection): Promise<number[]> {
  const response = await call_rpc(connection, {
    behaviors: { listAllBehaviors: true },
  } as Request);
  
  if (!response.behaviors?.listAllBehaviors) {
    throw new Error("Failed to load behaviors from device");
  }
  
  return response.behaviors.listAllBehaviors.behaviors || [];
}

/**
 * Load behavior details from device via RPC
 */
async function loadBehaviorDetailsFromDevice(
  connection: RpcConnection,
  behaviorId: number
): Promise<BehaviorDetails> {
  const response = await call_rpc(connection, {
    behaviors: { getBehaviorDetails: { behaviorId } },
  } as Request);
  
  if (!response.behaviors?.getBehaviorDetails) {
    throw new Error(`Failed to load behavior details for ID ${behaviorId}`);
  }
  
  return response.behaviors.getBehaviorDetails as BehaviorDetails;
}

/**
 * Save key binding to device via RPC
 */
async function saveKeyBindingToDevice(
  connection: RpcConnection,
  layerId: number,
  keyPosition: number,
  binding: KeyBinding
): Promise<void> {
  const response = await call_rpc(connection, {
    keymap: {
      setLayerBinding: {
        layerId,
        keyPosition,
        binding: {
          behaviorId: binding.behaviorId,
          param1: binding.param1,
          param2: binding.param2,
        },
      },
    },
  } as Request);
  
  if (response.keymap?.setLayerBinding !== 0) {
    throw new Error(`Failed to set layer binding: ${response.keymap?.setLayerBinding}`);
  }
}

/**
 * Save all changes to device
 */
async function saveChangesToDevice(connection: RpcConnection): Promise<void> {
  const response = await call_rpc(connection, {
    keymap: { saveChanges: true },
  } as Request);
  
  if (response.keymap?.saveChanges?.err) {
    throw new Error(`Failed to save changes: ${response.keymap.saveChanges.err}`);
  }
}

/**
 * Discard changes on device
 */
async function discardChangesOnDevice(connection: RpcConnection): Promise<void> {
  await call_rpc(connection, {
    keymap: { discardChanges: true },
  } as Request);
}

// Mock initial data for development (when not connected)
const createMockLayers = (): KeymapLayer[] => [
  {
    id: 0,
    name: "Base",
    bindings: Array.from({ length: 54 }, () => ({ behaviorId: 0, param1: 0x00, param2: 0 })),
  },
  {
    id: 1,
    name: "Lower",
    bindings: Array.from({ length: 54 }, () => ({ behaviorId: 0, param1: 0x00, param2: 0 })),
  },
  {
    id: 2,
    name: "Raise",
    bindings: Array.from({ length: 54 }, () => ({ behaviorId: 0, param1: 0x00, param2: 0 })),
  },
  {
    id: 3,
    name: "Adjust",
    bindings: Array.from({ length: 54 }, () => ({ behaviorId: 0, param1: 0x00, param2: 0 })),
  },
];

export function useKeymap() {
  const { isConnected, rpcConnection } = useContext(ConnectionContext);
  const [keymapState, setKeymapState] = useState<KeymapState>({
    layers: createMockLayers(),
    activeLayer: 0,
    availableLayers: 4,
    maxLayerNameLength: 32,
    unsavedChanges: false,
  });

  // Track original bindings for reset functionality
  const [originalBindings, setOriginalBindings] = useState<Map<string, KeyBinding>>(new Map());
  
  // Track modified keys for visual indication
  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());

  // Physical layouts from device
  const [physicalLayouts, setPhysicalLayouts] = useState<PhysicalLayouts | null>(null);
  
  // Available behaviors from device
  const [behaviors, setBehaviors] = useState<number[]>([]);
  const [behaviorDetails, setBehaviorDetails] = useState<Map<number, BehaviorDetails>>(new Map());

  /**
   * Get binding key for tracking modifications
   */
  const getBindingKey = useCallback((layerIndex: number, keyIndex: number) => {
    return `${layerIndex}-${keyIndex}`;
  }, []);

  /**
   * Load keymap from device or use mock data
   */
  const loadKeymap = useCallback(async () => {
    if (isConnected && rpcConnection) {
      try {
        // Load keymap
        const deviceKeymap = await loadKeymapFromDevice(rpcConnection);
        
        // Load physical layouts
        try {
          const layouts = await loadPhysicalLayoutsFromDevice(rpcConnection);
          setPhysicalLayouts(layouts);
        } catch (error) {
          console.error("Failed to load physical layouts:", error);
        }
        
        // Load behaviors
        try {
          const behaviorIds = await loadBehaviorsFromDevice(rpcConnection);
          setBehaviors(behaviorIds);
          
          // Load details for each behavior
          const detailsMap = new Map<number, BehaviorDetails>();
          for (const behaviorId of behaviorIds) {
            try {
              const details = await loadBehaviorDetailsFromDevice(rpcConnection, behaviorId);
              detailsMap.set(behaviorId, details);
            } catch (error) {
              console.error(`Failed to load behavior details for ID ${behaviorId}:`, error);
            }
          }
          setBehaviorDetails(detailsMap);
        } catch (error) {
          console.error("Failed to load behaviors:", error);
        }
        
        // Convert from device format to our format
        const layers: KeymapLayer[] = deviceKeymap.layers.map((layer) => ({
          id: layer.id,
          name: layer.name,
          bindings: layer.bindings.map((b) => ({
            behaviorId: b.behaviorId,
            param1: b.param1,
            param2: b.param2,
          })),
        }));
        
        setKeymapState({
          layers,
          activeLayer: 0,
          availableLayers: deviceKeymap.availableLayers,
          maxLayerNameLength: deviceKeymap.maxLayerNameLength,
          unsavedChanges: false,
        });
        
        // Store original bindings
        const originals = new Map<string, KeyBinding>();
        layers.forEach((layer, layerIndex) => {
          layer.bindings.forEach((binding, keyIndex) => {
            originals.set(getBindingKey(layerIndex, keyIndex), { ...binding });
          });
        });
        setOriginalBindings(originals);
        setModifiedKeys(new Set());
      } catch (error) {
        console.error("Failed to load keymap from device:", error);
        // Fall back to mock data
        const mockLayers = createMockLayers();
        setKeymapState({
          layers: mockLayers,
          activeLayer: 0,
          availableLayers: 4,
          maxLayerNameLength: 32,
          unsavedChanges: false,
        });
      }
    } else {
      // Use mock data when not connected
      const mockLayers = createMockLayers();
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
    }
  }, [isConnected, rpcConnection, getBindingKey]);

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
  const setKeyBinding = useCallback(async (
    layerIndex: number,
    keyIndex: number,
    binding: KeyBinding
  ) => {
    // Update local state immediately
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

    // Send to device if connected - use current state from callback
    if (isConnected && rpcConnection) {
      try {
        setKeymapState((currentState) => {
          // Validate layer exists
          if (layerIndex >= 0 && layerIndex < currentState.layers.length) {
            const layerId = currentState.layers[layerIndex].id;
            saveKeyBindingToDevice(rpcConnection, layerId, keyIndex, binding).catch((error) => {
              console.error("Failed to save key binding to device:", error);
            });
          }
          return currentState;
        });
      } catch (error) {
        console.error("Failed to save key binding to device:", error);
      }
    }
  }, [getBindingKey, originalBindings, isConnected, rpcConnection]);

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
  const resetChanges = useCallback(async () => {
    if (isConnected && rpcConnection) {
      try {
        await discardChangesOnDevice(rpcConnection);
        // Reload keymap from device
        await loadKeymap();
      } catch (error) {
        console.error("Failed to discard changes on device:", error);
      }
    } else {
      // Reset to original bindings locally
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
    }
  }, [isConnected, rpcConnection, keymapState.layers, originalBindings, getBindingKey, loadKeymap]);

  /**
   * Save changes to device
   */
  const saveChanges = useCallback(async () => {
    if (isConnected && rpcConnection) {
      try {
        await saveChangesToDevice(rpcConnection);
        
        // Update original bindings to current state
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
      } catch (error) {
        console.error("Failed to save changes to device:", error);
        throw error;
      }
    } else {
      // For mock mode, just update the originals
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
    }
  }, [isConnected, rpcConnection, keymapState.layers, getBindingKey]);

  // Load keymap on mount and when connection changes
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
    physicalLayouts,
    behaviors,
    behaviorDetails,
  };
}
