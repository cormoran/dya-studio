/**
 * useKeymap Hook
 *
 * This hook provides access to keymap functionality via the ZMK Studio protocol.
 * It handles loading physical layouts, keymaps, behaviors, and modifying bindings.
 */
import {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import type { call_rpc } from "@zmkfirmware/zmk-studio-ts-client";
import { loggedCallRpc } from "../lib/rpcLogging";
import { useStudioUnlock } from "./useStudioUnlock";
import { studioLockErrorText } from "../lib/studioUnlock";
import type {
  Keymap,
  Layer,
  BehaviorBinding,
  PhysicalLayouts,
  PhysicalLayout,
  KeyPhysicalAttrs,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import {
  useKeymapSource,
  getKeymapLoadingLabel,
  type BehaviorDefinition,
  type KeymapLoadPhase,
  type KeymapLoadProgress,
  type KeymapSource,
} from "./useKeymapSource";
import { assertOfficialKeymapRpcAllowed } from "../lib/officialKeymapRpcGuard";

// Error response constants for better readability
const SetLayerBindingResp = {
  OK: 0,
  INVALID_LAYER_ID: 1,
  INVALID_KEY_POSITION: 2,
  INVALID_BEHAVIOR_ID: 3,
} as const;

// Re-export types for convenience
export type {
  Keymap,
  Layer,
  BehaviorBinding,
  PhysicalLayouts,
  PhysicalLayout,
  KeyPhysicalAttrs,
};

// Loading (fast-vs-official) and its progress model now live in
// useKeymapSource; re-export the parts existing importers of "./useKeymap"
// still reference so their imports keep working.
export {
  getKeymapLoadingLabel,
  type BehaviorDefinition,
  type KeymapLoadPhase,
  type KeymapLoadProgress,
};

/**
 * Original binding stored for comparison and reset
 */
export interface OriginalBinding {
  layerId: number;
  keyPosition: number;
  binding: BehaviorBinding;
}

/**
 * State of the keymap
 */
export interface KeymapState {
  /** Physical layouts available on the keyboard */
  physicalLayouts: PhysicalLayouts | null;
  /** Current keymap data */
  keymap: Keymap | null;
  /** Map of behavior IDs to their definitions */
  behaviors: Map<number, BehaviorDefinition>;
  /** Original bindings (before any modifications) */
  originalBindings: Map<string, BehaviorBinding>;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Whether loading data */
  isLoading: boolean;
  /** True once the keymap tab has fully finished loading -- the foreground
   * preview AND any background incremental load (deferred behaviors + remaining
   * layers) have all settled. `isLoading` goes false as soon as the preview is
   * painted; this stays false until nothing keymap-related is still fetching,
   * so callers can defer non-preview work (e.g. runtime-macro loading) to the
   * very end. */
  isFullyLoaded: boolean;
  /** Progress of the in-flight load (what/how-far), or null when idle */
  loadingProgress: KeymapLoadProgress | null;
  /** Error message if any */
  error: string | null;
}

/**
 * Return type for useKeymap hook
 */
export interface UseKeymapReturn extends KeymapState {
  /** Load all keymap data from the keyboard */
  loadKeymapData: () => Promise<void>;
  /** Set a binding for a specific key */
  setBinding: (
    layerId: number,
    keyPosition: number,
    binding: BehaviorBinding,
  ) => Promise<boolean>;
  /** Reset a binding to its original value */
  resetBinding: (layerId: number, keyPosition: number) => Promise<boolean>;
  /** Reset a single binding to its hard-coded default value (an in-memory edit,
   * so the key becomes an unsaved change until saved). Only meaningful when
   * {@link isFastKeymapAvailable} is true. Returns false when the default for
   * this key isn't available. */
  resetBindingToDefault: (
    layerId: number,
    keyPosition: number,
  ) => Promise<boolean>;
  /** Move a layer from one position to another */
  moveLayer: (startIndex: number, destIndex: number) => Promise<boolean>;
  /** Add a new layer */
  addLayer: () => Promise<{ index: number; layer: Layer } | null>;
  /** Remove a layer at the specified index */
  removeLayer: (layerIndex: number) => Promise<boolean>;
  /** Restore a deleted layer */
  restoreLayer: (layerId: number, atIndex: number) => Promise<Layer | null>;
  /** Set layer name */
  setLayerName: (layerId: number, name: string) => Promise<boolean>;
  /** Get available layer count (can restore up to this many) */
  availableLayers: number;
  /** Maximum layer name length */
  maxLayerNameLength: number;
  /** Save all changes to the keyboard */
  saveChanges: () => Promise<boolean>;
  /** Discard all unsaved changes */
  discardChanges: () => Promise<boolean>;
  /** Reset the persistent keymap back to the hard-coded (devicetree-stock)
   * default: applies every default binding that differs from the current one,
   * then saves. Only meaningful when {@link isFastKeymapAvailable} is true (the
   * default keymap is read via the fast-keymap subsystem). Returns false when
   * unavailable or the save fails. */
  resetToDefault: () => Promise<boolean>;
  /** Set the active physical layout */
  setActiveLayout: (layoutIndex: number) => Promise<boolean>;
  /** Get the original binding for a key (before modification) */
  getOriginalBinding: (
    layerId: number,
    keyPosition: number,
  ) => BehaviorBinding | null;
  /** Get the hard-coded default binding for a key, or null when the default
   * keymap isn't loaded/available. */
  getDefaultBinding: (
    layerId: number,
    keyPosition: number,
  ) => BehaviorBinding | null;
  /** Check if a binding has been modified */
  isBindingModified: (layerId: number, keyPosition: number) => boolean;
  /** Whether the ORIGINAL (last-saved) binding for a position is still known.
   * False for positions that were already unsaved on the device when the tab
   * loaded (their saved value can't be recovered — see the pending-positions
   * flow): for those the UI shows "original: unknown" and reverts to the
   * hard-coded default instead of the original. Always true for in-session
   * edits. */
  isBindingOriginalKnown: (layerId: number, keyPosition: number) => boolean;
  /** True when the connected keyboard exposes the fast-keymap subsystem, which
   * is what serves the hard-coded default keymap. Gates the "reset to default"
   * action and the "changed from default" highlight. */
  isFastKeymapAvailable: boolean;
  /** Check whether a binding's PERSISTED value differs from the hard-coded
   * default keymap (i.e. it was saved to flash and is no longer stock). Returns
   * false while the default keymap is still loading, when it isn't available
   * (no fast-keymap subsystem), or when the key is currently modified in memory
   * (that state is surfaced by {@link isBindingModified} instead). */
  isBindingChangedFromDefault: (
    layerId: number,
    keyPosition: number,
  ) => boolean;
  /** True when the PERSISTED keymap differs from the hard-coded default in at
   * least one position (i.e. the saved keymap has been customized). False while
   * the default keymap is still loading or when it isn't available (no
   * fast-keymap subsystem). */
  isKeymapChangedFromDefault: boolean;
  /** Get behavior definition by ID */
  getBehavior: (behaviorId: number) => BehaviorDefinition | undefined;
  /** Get display name for a binding */
  getBindingDisplayName: (binding: BehaviorBinding) => string;
  /** Get removed layer IDs that can be restored */
  removedLayerIds: number[];
}

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

/**
 * Hook for managing keymap state and operations
 */
export function useKeymap(): UseKeymapReturn {
  const zmkApp = useContext(ZMKAppContext);
  const { runWithUnlock } = useStudioUnlock();

  // State
  const [physicalLayouts, setPhysicalLayouts] =
    useState<PhysicalLayouts | null>(null);
  const [keymap, setKeymap] = useState<Keymap | null>(null);
  const [behaviors, setBehaviors] = useState<Map<number, BehaviorDefinition>>(
    new Map(),
  );
  const [originalBindings, setOriginalBindings] = useState<
    Map<string, BehaviorBinding>
  >(new Map());
  // Hard-coded (devicetree-stock) default bindings, keyed like originalBindings
  // (`layerId:position`). Loaded lazily as the final step of a keymap load (see
  // the effect below) and only when the fast-keymap subsystem is present.
  const [defaultBindings, setDefaultBindings] = useState<
    Map<string, BehaviorBinding>
  >(new Map());
  // Positions (keyed `layerId:position`) the DEVICE reports as unsaved
  // (`get_pending`, fast-keymap only). Seeded as the final step of every load so
  // the "unsaved" highlight survives a keymap-tab remount: the device keeps the
  // edits in memory, but the freshly-loaded original bindings show no in-memory
  // diff, so this is what tells us which keys are still pending to save. Cleared
  // on save/disconnect; re-seeded on reload. Unioned into isBindingModified.
  const [pendingPositions, setPendingPositions] = useState<Set<string>>(
    new Set(),
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // True only once the foreground preview AND the background incremental load
  // (deferred behaviors + remaining layers) have all settled. See the
  // UseKeymapReturn.isFullyLoaded doc.
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] =
    useState<KeymapLoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Total number of layer slots this keyboard has (active + removed). ZMK has no
  // spare layer capacity beyond the devicetree-defined layers, so this is a
  // per-keyboard constant captured at load: `active layers + availableLayers`
  // (availableLayers is the count of free — i.e. removed — slots). Any layer id
  // in [0, totalLayerCount) that isn't currently active is a REMOVED layer the
  // device still holds and can restore; `removedLayerIds` derives from this.
  // null until the first load completes.
  const [totalLayerCount, setTotalLayerCount] = useState<number | null>(null);

  // Ref to track if data has been loaded
  const dataLoadedRef = useRef(false);
  // Guards the final-step default-keymap load so it runs once per keymap load;
  // reset when a new load starts (see loadKeymapData) and on disconnect.
  const defaultKeymapRequestedRef = useRef(false);
  // Monotonic id per loadKeymapData call, so a background (incremental) layer
  // update from a superseded load is ignored.
  const loadIdRef = useRef(0);
  // Timer for auto-clearing errors
  const errorTimerRef = useRef<number | null>(null);

  // Get connection from ZMK app context
  const connection = useMemo(
    () => zmkApp?.state.connection,
    [zmkApp?.state.connection],
  );

  // Loading is delegated to useKeymapSource, which picks the fast-keymap
  // subsystem when the device exposes it and the official protocol otherwise.
  // (Editing below always uses the official protocol.)
  const {
    loadKeymapData: loadFromSource,
    loadLayoutGeometry,
    loadDefaultKeymap,
    loadPendingPositions: loadPendingFromSource,
    isFastAvailable: isFastKeymapAvailable,
  } = useKeymapSource();

  // Helper to set error with auto-clear timer (5 seconds)
  const setErrorWithAutoClear = useCallback((message: string) => {
    setError(message);
    // Clear any existing timer
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }
    // Set new timer to clear error after 5 seconds
    errorTimerRef.current = setTimeout(() => {
      setError(null);
      errorTimerRef.current = null;
    }, 5000);
  }, []);

  // Helper to clear error and timer
  const clearError = useCallback(() => {
    setError(null);
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  // Helper to call RPC with error handling
  const callRpc = useCallback(
    async <T>(
      request: Parameters<typeof call_rpc>[1],
      extractor: (
        response: Awaited<ReturnType<typeof call_rpc>>,
      ) => T | undefined,
    ): Promise<T | null> => {
      if (!connection) {
        setErrorWithAutoClear("Not connected to keyboard");
        return null;
      }

      try {
        // Route through the shared unlock gate: a request that fails because
        // Studio is locked opens the unlock modal and is retried after unlock,
        // so `response` here is always a non-unlock result. `runWithUnlock`
        // rejects with StudioUnlockCancelledError if the user dismisses it.
        const response = await runWithUnlock(() => {
          // Guard: when fast-keymap is available, an official keymap/behaviors
          // *read* here is a bug (must go through useKeymapSource) — throw
          // rather than silently pay for a slow official round-trip. Edits and
          // checkUnsavedChanges are not forbidden reads, so they pass through.
          assertOfficialKeymapRpcAllowed(request);
          return loggedCallRpc(connection, request);
        });

        // Check for (non-unlock) meta errors
        if (response.meta?.simpleError !== undefined) {
          setErrorWithAutoClear(`RPC error: ${response.meta.simpleError}`);
          return null;
        }

        const result = extractor(response);
        if (result === undefined) {
          return null;
        }
        // Clear error on successful RPC call
        clearError();
        return result;
      } catch (err) {
        const locked = studioLockErrorText(err);
        if (locked !== null) {
          // Blocked by the unlock gate (modal dismissed / cooldown): surface
          // the shared "device is locked" message.
          setErrorWithAutoClear(locked);
          return null;
        }
        console.error("RPC call failed:", err);
        setErrorWithAutoClear(
          err instanceof Error ? err.message : "Unknown error",
        );
        return null;
      }
    },
    [connection, clearError, setErrorWithAutoClear, runWithUnlock],
  );

  // Store original bindings from keymap
  const storeOriginalBindings = useCallback((keymap: Keymap) => {
    const bindings = new Map<string, BehaviorBinding>();
    keymap.layers.forEach((layer) => {
      layer.bindings.forEach((binding, position) => {
        bindings.set(bindingKey(layer.id, position), { ...binding });
      });
    });
    setOriginalBindings(bindings);
  }, []);

  // Load all keymap data (layouts + keymap + behaviors) via useKeymapSource,
  // then check unsaved-changes state through the official keymap subsystem
  // (an edit-state concern the fast path doesn't own).
  const loadKeymapData = useCallback(async () => {
    if (!connection) {
      setErrorWithAutoClear("Not connected to keyboard");
      return;
    }

    setIsLoading(true);
    setIsFullyLoaded(false);
    setLoadingProgress({ phase: "layouts" });
    setError(null);

    // Guard for the background (incremental) layer load: a load that has been
    // superseded (reconnect/reload) must not apply its late layer update.
    const loadId = ++loadIdRef.current;
    // A fresh load re-arms the final-step default-keymap fetch.
    defaultKeymapRequestedRef.current = false;
    // Drop any device-pending set from a prior load: an in-place reload (unlock
    // retry, discard) may reflect a different device state, and the fresh set is
    // re-seeded once this load settles (the inline get_pending fetch below).
    setPendingPositions(new Set());
    const isFirstLoad = !dataLoadedRef.current;
    // Populated after the initial (phase-1) load returns; read by the
    // background callback, which fires later.
    let pendingLayerIds: number[] = [];

    // Called when the fast path finishes loading the layers it deferred (see
    // useKeymapSource's incremental load): fill their bindings into the keymap
    // and record their original bindings (first load only).
    const applyBackgroundLayers = (fullLayers: Layer[]) => {
      if (loadIdRef.current !== loadId) return;
      // This is the final callback of the background load (it runs after the
      // deferred behaviors are delivered), so the keymap tab is now fully
      // loaded -- even when there were no pending layers to fill in.
      setIsFullyLoaded(true);
      const pending = new Set(pendingLayerIds);
      if (pending.size === 0) return;
      const bindingsById = new Map(fullLayers.map((l) => [l.id, l.bindings]));

      setKeymap((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          layers: prev.layers.map((layer) =>
            pending.has(layer.id) && bindingsById.has(layer.id)
              ? { ...layer, bindings: bindingsById.get(layer.id)! }
              : layer,
          ),
        };
      });

      if (isFirstLoad) {
        setOriginalBindings((prev) => {
          const next = new Map(prev);
          for (const layer of fullLayers) {
            if (!pending.has(layer.id)) continue;
            layer.bindings.forEach((binding, position) => {
              const key = bindingKey(layer.id, position);
              if (!next.has(key)) next.set(key, { ...binding });
            });
          }
          return next;
        });
      }
    };

    // Called when the fast path finishes loading the behaviors it deferred (see
    // useKeymapSource's incremental load): swap in the resolved map so bindings
    // that were rendering with a placeholder label now show their real names.
    const applyBackgroundBehaviors = (
      behaviors: Map<number, BehaviorDefinition>,
    ) => {
      if (loadIdRef.current !== loadId) return;
      setBehaviors(behaviors);
    };

    try {
      // Load the keymap data. Only a failure HERE means unlock is actually
      // required: the fast-keymap subsystem is unsecured and loads while the
      // keyboard is locked, whereas the official protocol needs unlock even to
      // read — either way, this is the call whose unlock error should surface.
      let loaded = false;
      // Which protocol actually served this load. Drives whether the
      // unsaved-changes state comes from the official checkUnsavedChanges call
      // below or from get_pending (fast path). Read from the load result rather
      // than the isFastKeymapAvailable state so loadKeymapData needn't depend on
      // it — that dependency would recreate this callback when the subsystem is
      // detected mid-load and fire a second, racing load.
      let loadedSource: KeymapSource = "official";
      try {
        // A locked keyboard surfaces the shared unlock modal via the gate and
        // the load is retried after unlock, so `data` here is always a real
        // result (or the gate rejects with StudioUnlockCancelledError).
        const data = await runWithUnlock(() =>
          loadFromSource(
            (progress) => setLoadingProgress(progress),
            applyBackgroundLayers,
            applyBackgroundBehaviors,
          ),
        );
        loadedSource = data.source;
        pendingLayerIds = data.pendingLayerIds;

        setPhysicalLayouts(data.physicalLayouts);
        setKeymap(data.keymap);
        // Capture the keyboard's fixed layer-slot count. availableLayers is the
        // number of free (removed) slots, so active + available = the pool size.
        // Removed layer ids are derived from this (see removedLayerIds), which is
        // what lets a layer removed & saved in an earlier session still be
        // restored after a reconnect.
        setTotalLayerCount(
          data.keymap.layers.length + data.keymap.availableLayers,
        );
        // Only store original bindings on first load
        if (isFirstLoad) {
          storeOriginalBindings(data.keymap);
          dataLoadedRef.current = true;
        }
        setBehaviors(data.behaviors);
        // If nothing was deferred to the background, the load is already
        // complete here; otherwise applyBackgroundLayers flips this when the
        // background (deferred behaviors + remaining layers) settles.
        if (data.pendingLayerIds.length === 0 && !data.behaviorsDeferred) {
          setIsFullyLoaded(true);
        }
        loaded = true;
      } catch (err) {
        const locked = studioLockErrorText(err);
        if (locked !== null) {
          // Blocked by the unlock gate (modal dismissed / cooldown): surface
          // the shared "device is locked" message.
          setErrorWithAutoClear(locked);
        } else {
          console.error("Failed to load keymap data:", err);
          setErrorWithAutoClear(
            err instanceof Error ? err.message : "Failed to load keymap data",
          );
        }
      }

      if (loaded && loadedSource === "fast") {
        // Fast path: read the device's UNSAVED (pending) positions via
        // get_pending. This is done inline (not in a separate effect) so it's
        // tied to THIS load's id — a remount can fire a second, racing load
        // (the subsystem-detection flip changes loadFromSource's identity), and
        // a standalone effect's result would be discarded by the load-id guard.
        // It serves double duty: seed the per-key "pending to save" highlight
        // (survives a keymap-tab remount, since the freshly-loaded originals
        // show no diff) AND derive hasUnsavedChanges — one unsecured round-trip
        // that works while locked, replacing the official checkUnsavedChanges.
        setLoadingProgress({ phase: "finalizing" });
        try {
          const layers = await loadPendingFromSource();
          if (loadIdRef.current === loadId) {
            const next = new Set<string>();
            for (const layer of layers) {
              for (const position of layer.positions) {
                next.add(bindingKey(layer.id, position));
              }
            }
            setPendingPositions(next);
            setHasUnsavedChanges(next.size > 0);
          }
        } catch (err) {
          // Best-effort: this only restores an optional highlight + badge, so a
          // failure just leaves both unset until the next edit.
          console.error("Failed to load pending positions:", err);
        }
      } else if (loaded) {
        // Official path. checkUnsavedChanges uses the official (secured) keymap
        // subsystem, so it fails with unlock-required when the keymap was loaded
        // read-only via the unsecured fast path while locked. The keymap is
        // already viewable, so don't promote that to an unlock prompt —
        // best-effort: assume no unsaved changes when we can't read it. Editing
        // a binding still prompts for unlock at that point.
        setLoadingProgress({ phase: "finalizing" });
        try {
          if (connection) {
            const response = await loggedCallRpc(connection, {
              keymap: { checkUnsavedChanges: true },
            });
            setHasUnsavedChanges(response.keymap?.checkUnsavedChanges ?? false);
          }
        } catch {
          setHasUnsavedChanges(false);
        }
      }
    } finally {
      setIsLoading(false);
      setLoadingProgress(null);
    }
  }, [
    connection,
    loadFromSource,
    loadPendingFromSource,
    storeOriginalBindings,
    setErrorWithAutoClear,
    runWithUnlock,
  ]);

  // Set a key binding
  const setBinding = useCallback(
    async (
      layerId: number,
      keyPosition: number,
      binding: BehaviorBinding,
    ): Promise<boolean> => {
      const result = await callRpc(
        {
          keymap: {
            setLayerBinding: {
              layerId,
              keyPosition,
              binding,
            },
          },
        },
        (response) => response.keymap?.setLayerBinding,
      );

      if (result === SetLayerBindingResp.OK) {
        // Update local keymap state
        setKeymap((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            layers: prev.layers.map((layer) => {
              if (layer.id !== layerId) return layer;
              const newBindings = [...layer.bindings];
              newBindings[keyPosition] = binding;
              return { ...layer, bindings: newBindings };
            }),
          };
        });
        setHasUnsavedChanges(true);
        clearError();
        return true;
      } else if (result === SetLayerBindingResp.INVALID_LAYER_ID) {
        setErrorWithAutoClear(`Invalid layer ID: ${layerId}`);
      } else if (result === SetLayerBindingResp.INVALID_KEY_POSITION) {
        setErrorWithAutoClear(`Invalid key position: ${keyPosition}`);
      } else if (result === SetLayerBindingResp.INVALID_BEHAVIOR_ID) {
        setErrorWithAutoClear(`Invalid behavior ID: ${binding.behaviorId}`);
      } else {
        setErrorWithAutoClear(`Failed to set binding: unknown error`);
      }

      return false;
    },
    [callRpc, clearError, setErrorWithAutoClear],
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

  // Reset a single binding to its hard-coded default value. Unlike
  // resetToDefault (whole keymap + save), this is an in-memory edit: the key
  // becomes an unsaved change the user can then save or discard.
  const resetBindingToDefault = useCallback(
    async (layerId: number, keyPosition: number): Promise<boolean> => {
      const def = defaultBindings.get(bindingKey(layerId, keyPosition));
      if (!def) {
        return false;
      }
      return setBinding(layerId, keyPosition, def);
    },
    [defaultBindings, setBinding],
  );

  // Move a layer
  const moveLayer = useCallback(
    async (startIndex: number, destIndex: number): Promise<boolean> => {
      const result = await callRpc(
        {
          keymap: {
            moveLayer: {
              startIndex,
              destIndex,
            },
          },
        },
        (response) => response.keymap?.moveLayer,
      );

      if (result?.ok) {
        setKeymap(result.ok);
        setHasUnsavedChanges(true);
        clearError();
        return true;
      }
      if (result?.err !== undefined) {
        setErrorWithAutoClear(`Failed to move layer: operation not allowed`);
      }

      return false;
    },
    [callRpc, clearError, setErrorWithAutoClear],
  );

  // Add a new layer
  const addLayer = useCallback(async (): Promise<{
    index: number;
    layer: Layer;
  } | null> => {
    const result = await callRpc(
      { keymap: { addLayer: {} } },
      (response) => response.keymap?.addLayer,
    );

    if (result?.ok && result.ok.layer) {
      const newLayerIndex = result.ok.index;
      const newLayer = result.ok.layer;

      // Update keymap with the new layer
      setKeymap((prev) => {
        if (!prev) return prev;
        const newLayers = [...prev.layers];
        newLayers.splice(newLayerIndex, 0, newLayer);
        return {
          ...prev,
          layers: newLayers,
        };
      });
      setHasUnsavedChanges(true);
      clearError();
      return { index: newLayerIndex, layer: newLayer };
    }

    if (result?.err !== undefined) {
      setErrorWithAutoClear(
        `Failed to add layer: maximum layer count reached or operation not allowed`,
      );
    }

    return null;
  }, [callRpc, clearError, setErrorWithAutoClear]);

  // Remove a layer
  const removeLayer = useCallback(
    async (layerIndex: number): Promise<boolean> => {
      const result = await callRpc(
        { keymap: { removeLayer: { layerIndex } } },
        (response) => response.keymap?.removeLayer,
      );

      if (result?.ok !== undefined) {
        // Update keymap by removing the layer. The removed id drops out of the
        // active set, so removedLayerIds (derived) picks it up automatically —
        // no separate bookkeeping needed.
        setKeymap((prev) => {
          if (!prev) return prev;
          const newLayers = prev.layers.filter((_, i) => i !== layerIndex);
          return {
            ...prev,
            layers: newLayers,
          };
        });

        setHasUnsavedChanges(true);
        clearError();
        return true;
      }

      if (result?.err !== undefined) {
        setErrorWithAutoClear(
          `Failed to remove layer: invalid layer index or operation not allowed`,
        );
      }

      return false;
    },
    [callRpc, clearError, setErrorWithAutoClear],
  );

  // Restore a deleted layer
  const restoreLayer = useCallback(
    async (layerId: number, atIndex: number): Promise<Layer | null> => {
      const result = await callRpc(
        { keymap: { restoreLayer: { layerId, atIndex } } },
        (response) => response.keymap?.restoreLayer,
      );

      if (result?.ok) {
        const restoredLayer = result.ok;

        // Update keymap with the restored layer. It re-enters the active set, so
        // removedLayerIds (derived) drops it automatically.
        setKeymap((prev) => {
          if (!prev) return prev;
          const newLayers = [...prev.layers];
          newLayers.splice(atIndex, 0, restoredLayer);
          return {
            ...prev,
            layers: newLayers,
          };
        });

        setHasUnsavedChanges(true);
        clearError();
        return restoredLayer;
      }

      if (result?.err !== undefined) {
        setErrorWithAutoClear(
          `Failed to restore layer: layer not found or invalid position`,
        );
      }

      return null;
    },
    [callRpc, clearError, setErrorWithAutoClear],
  );

  // Set layer name
  const setLayerName = useCallback(
    async (layerId: number, name: string): Promise<boolean> => {
      const result = await callRpc(
        { keymap: { setLayerProps: { layerId, name } } },
        (response) => response.keymap?.setLayerProps,
      );

      // SET_LAYER_PROPS_RESP_OK = 0
      if (result === 0) {
        setKeymap((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            layers: prev.layers.map((layer) =>
              layer.id === layerId ? { ...layer, name } : layer,
            ),
          };
        });
        setHasUnsavedChanges(true);
        clearError();
        return true;
      }

      // SET_LAYER_PROPS_RESP_ERR_INVALID_ID = 2
      if (result === 2) {
        setErrorWithAutoClear(`Failed to rename layer: invalid layer ID`);
      } else {
        setErrorWithAutoClear(`Failed to rename layer`);
      }

      return false;
    },
    [callRpc, clearError, setErrorWithAutoClear],
  );

  // Save changes
  const saveChanges = useCallback(
    async (savedKeymapOverride?: Keymap): Promise<boolean> => {
      const result = await callRpc(
        { keymap: { saveChanges: true } },
        (response) => response.keymap?.saveChanges,
      );

      if (result?.ok) {
        setHasUnsavedChanges(false);
        // Everything is now persisted: nothing is pending on the device anymore.
        setPendingPositions(new Set());
        // Update original bindings to current state after save
        const savedKeymap = savedKeymapOverride ?? keymap;
        if (savedKeymap) {
          storeOriginalBindings(savedKeymap);
        }
        clearError();
        return true;
      }

      if (result?.err !== undefined) {
        setErrorWithAutoClear(
          `Failed to save changes: operation not allowed or storage error`,
        );
      }

      return false;
    },
    [callRpc, keymap, storeOriginalBindings, clearError, setErrorWithAutoClear],
  );

  // Discard changes
  const discardChanges = useCallback(async (): Promise<boolean> => {
    const result = await callRpc(
      { keymap: { discardChanges: true } },
      (response) => response.keymap?.discardChanges,
    );

    if (result) {
      // Reload keymap to get original values
      dataLoadedRef.current = false;
      await loadKeymapData();
      clearError();
      return true;
    }

    setErrorWithAutoClear("Failed to discard changes");
    return false;
  }, [callRpc, loadKeymapData, clearError, setErrorWithAutoClear]);

  // Reset the persistent keymap to the hard-coded default: set every binding
  // that differs from its default value, then save. Only works when the default
  // keymap has been loaded (fast-keymap subsystem present).
  const resetToDefault = useCallback(async (): Promise<boolean> => {
    if (!keymap) return false;
    if (defaultBindings.size === 0) {
      setErrorWithAutoClear("Default keymap is not available");
      return false;
    }

    // Track the post-reset bindings locally so saveChanges() records the new
    // defaults as originalBindings rather than the stale pre-reset closure.
    const nextLayers = keymap.layers.map((layer) => ({
      ...layer,
      bindings: [...layer.bindings],
    }));

    // Apply only the positions whose current binding differs from the default,
    // to keep the number of RPCs (BLE round-trips) to what actually changed.
    for (let layerIdx = 0; layerIdx < keymap.layers.length; layerIdx++) {
      const layer = keymap.layers[layerIdx];
      for (let position = 0; position < layer.bindings.length; position++) {
        const def = defaultBindings.get(bindingKey(layer.id, position));
        if (!def) continue;
        const current = layer.bindings[position];
        if (current && bindingsEqual(current, def)) continue;
        const ok = await setBinding(layer.id, position, def);
        if (!ok) {
          // setBinding already surfaced the error (incl. unlock-required).
          return false;
        }
        nextLayers[layerIdx].bindings[position] = { ...def };
      }
    }

    // Persist the now-default keymap to flash.
    return saveChanges({ ...keymap, layers: nextLayers });
  }, [keymap, defaultBindings, setBinding, saveChanges, setErrorWithAutoClear]);

  // Set active physical layout
  const setActiveLayout = useCallback(
    async (layoutIndex: number): Promise<boolean> => {
      const result = await callRpc(
        {
          keymap: {
            setActivePhysicalLayout: layoutIndex,
          },
        },
        (response) => response.keymap?.setActivePhysicalLayout,
      );

      if (result?.ok) {
        setKeymap(result.ok);

        // On the fast path, non-active layout geometry is loaded lazily (not
        // at initial load — that kept "Finalizing" fast). Fetch the geometry
        // for the layout we're switching to if it hasn't been loaded yet.
        const target = physicalLayouts?.layouts[layoutIndex];
        let geometry: KeyPhysicalAttrs[] | null = null;
        if (target && target.keys.length === 0) {
          try {
            geometry = await loadLayoutGeometry(layoutIndex);
          } catch (err) {
            console.error("Failed to load layout geometry:", err);
          }
        }

        setPhysicalLayouts((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activeLayoutIndex: layoutIndex,
            layouts: geometry
              ? prev.layouts.map((l, i) =>
                  i === layoutIndex ? { ...l, keys: geometry } : l,
                )
              : prev.layouts,
          };
        });
        clearError();
        return true;
      }
      if (result?.err !== undefined) {
        setErrorWithAutoClear(
          `Failed to set active layout: invalid layout index`,
        );
      }

      return false;
    },
    [
      callRpc,
      physicalLayouts,
      loadLayoutGeometry,
      clearError,
      setErrorWithAutoClear,
    ],
  );

  // Get original binding
  const getOriginalBinding = useCallback(
    (layerId: number, keyPosition: number): BehaviorBinding | null => {
      return originalBindings.get(bindingKey(layerId, keyPosition)) ?? null;
    },
    [originalBindings],
  );

  // Get hard-coded default binding
  const getDefaultBinding = useCallback(
    (layerId: number, keyPosition: number): BehaviorBinding | null => {
      return defaultBindings.get(bindingKey(layerId, keyPosition)) ?? null;
    },
    [defaultBindings],
  );

  // Check if a binding is unsaved (pending to save) — i.e. it differs from the
  // value currently persisted to the device's flash. Two independent sources:
  //   1. An in-memory edit made in THIS session: current binding differs from
  //      the one loaded (`originalBindings`).
  //   2. An edit that was already in device memory when we loaded (e.g. after
  //      switching back to the keymap tab): the freshly-loaded original matches
  //      the current value so (1) finds no diff, but `get_pending` told us the
  //      device still holds this position unsaved (see `pendingPositions`).
  const isBindingModified = useCallback(
    (layerId: number, keyPosition: number): boolean => {
      const key = bindingKey(layerId, keyPosition);

      const original = originalBindings.get(key);
      const layer = keymap?.layers.find((l) => l.id === layerId);
      const current = layer?.bindings[keyPosition];
      if (original && current && !bindingsEqual(original, current)) {
        return true;
      }

      return pendingPositions.has(key);
    },
    [originalBindings, keymap, pendingPositions],
  );

  // Whether we still know a position's ORIGINAL (last-saved) binding.
  //
  // - Not reported pending by the device → the value we loaded IS the saved
  //   one, so the original is known.
  // - Reported pending (`get_pending`) → the device holds an unsaved edit whose
  //   saved value it never sends. We still know the original only if our stored
  //   `originalBindings` value DIFFERS from the current binding — a genuine
  //   pre-edit "before" value (e.g. the warm fingerprint cache preserved it, or
  //   this session made the edit). If our stored original EQUALS the current
  //   binding, a fresh load stored the device's unsaved value as the "original"
  //   and the true saved value is lost — the UI then shows "original: unknown"
  //   and reverts to the hard-coded default instead.
  const isBindingOriginalKnown = useCallback(
    (layerId: number, keyPosition: number): boolean => {
      const key = bindingKey(layerId, keyPosition);
      if (!pendingPositions.has(key)) return true;
      const original = originalBindings.get(key);
      const layer = keymap?.layers.find((l) => l.id === layerId);
      const current = layer?.bindings[keyPosition];
      return !!(original && current && !bindingsEqual(original, current));
    },
    [pendingPositions, originalBindings, keymap],
  );

  // Check if a binding's PERSISTED value differs from the hard-coded default.
  // Uses the original (persistent) binding, not the current in-memory one, so a
  // key the user is actively editing surfaces as "modified" (green) rather than
  // here — the two highlights are mutually exclusive by design.
  const isBindingChangedFromDefault = useCallback(
    (layerId: number, keyPosition: number): boolean => {
      const key = bindingKey(layerId, keyPosition);
      const def = defaultBindings.get(key);
      if (!def) return false;
      const original = originalBindings.get(key);
      if (!original) return false;
      // Suppress while the key is modified in memory — that takes precedence.
      if (isBindingModified(layerId, keyPosition)) return false;
      return !bindingsEqual(original, def);
    },
    [defaultBindings, originalBindings, isBindingModified],
  );

  // Whether the persisted keymap differs from the hard-coded default anywhere —
  // drives the "saved but customized" badge state. Compares the persisted
  // (original) bindings, not the current in-memory ones, so it reflects what is
  // actually on the device once saved.
  const isKeymapChangedFromDefault = useMemo(() => {
    if (defaultBindings.size === 0) return false;
    for (const [key, def] of defaultBindings) {
      const original = originalBindings.get(key);
      if (original && !bindingsEqual(original, def)) return true;
    }
    return false;
  }, [defaultBindings, originalBindings]);

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

      // For simple behaviors, just return the name
      if (binding.param1 === 0 && binding.param2 === 0) {
        return behavior.displayName;
      }

      // For behaviors with parameters, format them
      return `${behavior.displayName}`;
    },
    [behaviors],
  );

  // Layer ids the device still holds but that aren't currently active — i.e.
  // removed layers that can be restored. Derived from device state (the fixed
  // layer pool minus the active ids) rather than tracked only in session memory,
  // so a layer that was removed and saved in an EARLIER session is still
  // restorable after a reconnect (ZMK preserves the layer's bindings/name and
  // `restore_layer` brings them back). In-session removals are covered too — a
  // removed id leaves the active set immediately — and anything re-added or
  // restored drops out because it re-enters the active set.
  const removedLayerIds = useMemo(() => {
    if (totalLayerCount === null || !keymap) return [];
    const active = new Set(keymap.layers.map((layer) => layer.id));
    const removed: number[] = [];
    for (let id = 0; id < totalLayerCount; id++) {
      if (!active.has(id)) removed.push(id);
    }
    return removed;
  }, [totalLayerCount, keymap]);

  // Subscribe to keymap notifications
  useEffect(() => {
    if (!zmkApp) return;

    const unsubscribe = zmkApp.onNotification({
      type: "keymap",
      callback: (notification) => {
        if (notification.unsavedChangesStatusChanged !== undefined) {
          setHasUnsavedChanges(notification.unsavedChangesStatusChanged);
        }
      },
    });

    return unsubscribe;
  }, [zmkApp]);

  // Lock-state handling (open unlock modal, auto-retry the failed request on
  // unlock) is centralized in StudioUnlockProvider via `runWithUnlock`.

  // Auto-load keymap data when connected
  useEffect(() => {
    if (connection && !dataLoadedRef.current) {
      loadKeymapData();
    }
  }, [connection, loadKeymapData]);

  // Load the hard-coded default keymap as the FINAL step of the keymap tab
  // load — only once the preview + background behaviors/layers have all settled
  // (isFullyLoaded), so its one-round-trip-per-layer fetch never competes with
  // the preview. Fast-keymap only; skipped entirely on the official path. Fires
  // once per load (guarded by defaultKeymapRequestedRef, re-armed on reload).
  useEffect(() => {
    if (!isFullyLoaded || !isFastKeymapAvailable) return;
    if (defaultKeymapRequestedRef.current) return;
    const layers = keymap?.layers;
    if (!layers || layers.length === 0) return;

    defaultKeymapRequestedRef.current = true;
    const loadId = loadIdRef.current;
    const layerIds = layers.map((layer) => layer.id);
    void loadDefaultKeymap(layerIds)
      .then((defaultsByLayer) => {
        // Ignore a late result from a superseded load (reconnect/reload).
        if (loadIdRef.current !== loadId) return;
        const next = new Map<string, BehaviorBinding>();
        for (const [layerId, bindings] of defaultsByLayer) {
          bindings.forEach((binding, position) => {
            next.set(bindingKey(layerId, position), { ...binding });
          });
        }
        setDefaultBindings(next);
      })
      .catch((err) => {
        // Best-effort: the default keymap only drives an optional highlight and
        // the reset action, so a failure just leaves both unavailable.
        console.error("Failed to load default keymap:", err);
      });
  }, [isFullyLoaded, isFastKeymapAvailable, keymap?.layers, loadDefaultKeymap]);

  // (The device's UNSAVED (pending) positions are fetched inline in
  // loadKeymapData on the fast path — see the get_pending call there. Doing it
  // there rather than in a standalone effect keeps it tied to the load id, so a
  // remount's second racing load can't strand a stale result.)

  // Reset state when disconnected
  useEffect(() => {
    if (!connection) {
      setPhysicalLayouts(null);
      setKeymap(null);
      setBehaviors(new Map());
      setOriginalBindings(new Map());
      setDefaultBindings(new Map());
      setPendingPositions(new Set());
      setHasUnsavedChanges(false);
      setError(null);
      setTotalLayerCount(null);
      setLoadingProgress(null);
      dataLoadedRef.current = false;
      defaultKeymapRequestedRef.current = false;
      // Clear error timer
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    }
  }, [connection]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
    };
  }, []);

  return {
    physicalLayouts,
    keymap,
    behaviors,
    originalBindings,
    hasUnsavedChanges,
    isLoading,
    isFullyLoaded,
    loadingProgress,
    error,
    loadKeymapData,
    setBinding,
    resetBinding,
    resetBindingToDefault,
    moveLayer,
    addLayer,
    removeLayer,
    restoreLayer,
    setLayerName,
    availableLayers: keymap?.availableLayers ?? 0,
    maxLayerNameLength: keymap?.maxLayerNameLength ?? 0,
    removedLayerIds,
    saveChanges,
    discardChanges,
    resetToDefault,
    setActiveLayout,
    getOriginalBinding,
    getDefaultBinding,
    isBindingModified,
    isBindingOriginalKnown,
    isFastKeymapAvailable,
    isBindingChangedFromDefault,
    isKeymapChangedFromDefault,
    getBehavior,
    getBindingDisplayName,
  };
}
