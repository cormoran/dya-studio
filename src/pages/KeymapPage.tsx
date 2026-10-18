import { KeymapLayerTabs } from "../components/KeymapLayerTabs";
import { KeymapSharingMenu } from "../components/importExport/KeymapSharingMenu";
import { ResponsiveButton } from "../components/ResponsiveButton";
import {
  useState,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";
import {
  IconKeyboard,
  IconChevronLeft,
  IconChevronRight,
  IconArrowsMaximize,
  IconAppWindow,
  IconPlayerTrackNext,
  IconDeviceFloppy,
  IconAlertCircle,
  IconLoader2,
  IconPlus,
  IconChevronDown,
  IconRestore,
  IconAlertTriangle,
  IconInfoCircle,
  IconPencil,
  IconLock,
  IconRefresh,
  IconX,
  IconLink,
} from "@tabler/icons-react";
import { useStudioLockState } from "@cormoran/zmk-studio-react-hook";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import * as Switch from "@radix-ui/react-switch";
import { ConnectionContext } from "../contexts/DeviceConnectionContext";
import { KeyboardLayoutContext } from "../contexts/KeyboardLayoutContext";
import { KeyboardLayout } from "../components/KeyboardLayout";
import { BrowserKeyInputOverlay } from "../components/BrowserKeyInputOverlay";
import { EditorTooltip } from "../components/EditorTooltip";
import { KeycodeSelector } from "../components/KeycodeSelector";
import { MacroEditorDialog } from "../components/macroCombo/MacroEditorDialog";
import { SensorRotationConfig } from "../components/SensorRotationConfig";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { useKeymap, getKeymapLoadingLabel } from "../hooks/useKeymap";
import { usePhysicalLayoutModules } from "../hooks/usePhysicalLayoutModules";
import { useRuntimeSensorRotate } from "../hooks/useRuntimeSensorRotate";
import { useRuntimeMacro } from "../hooks/useRuntimeMacro";
import { useMacroEditor } from "../components/macroCombo/useMacroEditor";
import { useRuntimeCombo, type Combo } from "../hooks/useRuntimeCombo";
import { useComboEditor } from "../components/macroCombo/useComboEditor";
import { ComboEditorCard } from "../components/macroCombo/ComboEditorCard";
import {
  comboEditStatus,
  formatComboBehavior,
  defaultBehaviorBinding,
  formatLayerScope,
} from "../components/macroCombo/comboUtils";
import { StatusDot } from "../components/EditStatusIndicator";
import { useInputStream } from "../hooks/useInputStream";
import { getAvailableLayouts, getLayoutLabel } from "../lib/keyboardLayouts";
import type { BehaviorBinding } from "../hooks/useKeymap";
import { useStudioUnlock } from "../hooks/useStudioUnlock";
import { useLanguage } from "../hooks/useLanguage";
import { formatBehaviorBinding } from "../lib/behaviorMetadata";
import { ResetVersionMenu } from "../components/versionHistory/ResetVersionMenu";
import { VersionDiffModal } from "../components/versionHistory/VersionDiffModal";
import { useKeymapVersionHistory } from "../hooks/versionHistory/useKeymapVersionHistory";
import { useMobileLayout } from "../hooks/useMobileLayout";
import { useIsTabActive } from "../hooks/useIsTabActive";
import type { FloatingWindowPosition } from "../hooks/useFloatingWindow";
import "./keymap.css";

export function KeymapPage() {
  const { t } = useLanguage();
  const connection = useContext(ConnectionContext);
  const keyboardLayoutContext = useContext(KeyboardLayoutContext);
  const keymap = useKeymap();
  const physicalLayoutModules = usePhysicalLayoutModules();
  const sensorRotate = useRuntimeSensorRotate();
  // Defer macro loading (see the effect below): the macro list is only needed
  // to label macro keys, not to paint the preview, so we don't let its RPCs
  // compete with the keymap load. autoLoad:false suppresses the on-mount fetch.
  const runtimeMacro = useRuntimeMacro({ autoLoad: false });
  const runtimeCombo = useRuntimeCombo({ autoLoad: false });
  const { isAvailable: isComboAvailable, reload: reloadRuntimeCombos } =
    runtimeCombo;
  const inputStream = useInputStream();
  // Snapshots the keymap into IndexedDB after every full load, and drives the
  // "restore a previous version" flow behind the reset dropdown.
  const versionHistory = useKeymapVersionHistory(keymap, t);
  const isTabActive = useIsTabActive();
  const mobile = useMobileLayout();
  const pageRef = useRef<HTMLDivElement>(null);
  // Proactive lock state: the fast-keymap subsystem is unsecured, so the keymap
  // is viewable while Studio is locked. We use this to (a) show a lock badge in
  // place of Save/Reset and (b) prompt for unlock the moment the user tries to
  // edit — rather than letting the edit fail and then reacting.
  const { locked } = useStudioLockState();
  // Proactive unlock gate (opens the shared unlock modal); the reactive
  // fail→modal→retry path is handled inside useKeymap via runWithUnlock.
  const { requireUnlock: requireUnlocked } = useStudioUnlock();

  const [selectorMode, setSelectorMode] = useState<"modal" | "floating">(() => {
    try {
      const savedMode = localStorage.getItem("keymapSelectorMode");
      if (savedMode === "floating" || savedMode === "modal") return savedMode;
    } catch {
      // Use the viewport default when preferences cannot be read.
    }
    return mobile ? "floating" : "modal";
  });
  const [autoAdvance, setAutoAdvance] = useState(() => {
    try {
      return localStorage.getItem("keymapAutoAdvance") !== "false";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("keymapAutoAdvance", String(autoAdvance));
    } catch {
      /* Storage may be disabled. */
    }
  }, [autoAdvance]);
  const [isApplyingBinding, setIsApplyingBinding] = useState(false);
  const applyingBindingRef = useRef(false);
  const selectionRevision = useRef(0);
  const closeSelector = useCallback(() => {
    selectionRevision.current += 1;
    setShowKeycodeSelector(false);
    setSelectedKeyPosition(null);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("keymapSelectorMode", selectorMode);
    } catch {
      /* Storage may be disabled. */
    }
  }, [selectorMode]);

  // Local UI state
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
  // Discard, Reload and history restoration can replace the layer list without
  // going through a layer handler. Reconcile before committing the preview and
  // controls; an empty list resets selection for the next successful load.
  const lastLayerIndex = Math.max(0, (keymap.keymap?.layers.length ?? 0) - 1);
  if (selectedLayerIndex > lastLayerIndex) {
    setSelectedLayerIndex(lastLayerIndex);
  }
  const [selectedKeyPosition, setSelectedKeyPosition] = useState<number | null>(
    null,
  );
  // The info panel and keyboard preview share the same content-column edges.
  const keymapContentAnchorRef = useRef<HTMLDivElement>(null);
  const [showKeycodeSelector, setShowKeycodeSelector] = useState(false);
  const [macroEditorMode, setMacroEditorMode] = useState<
    "create" | "edit" | null
  >(null);
  const [macroEditorSlot, setMacroEditorSlot] = useState<number | undefined>();
  const [macroEditorSession, setMacroEditorSession] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isEditingLayers, setIsEditingLayers] = useState(false);
  const [isMovingLayer, setIsMovingLayer] = useState(false);
  const movingLayerRef = useRef(false);
  const [renameLayerId, setRenameLayerId] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  // Popup listing the device's deleted (restorable) layers, opened from the
  // restore button in the layer toolbar.
  const [showRestoreMenu, setShowRestoreMenu] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState(false);
  const renamingRef = useRef(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  // Guards the deferred macro load so it fires once per keymap load; reset when
  // a new load starts (see the effect below).
  const macrosRequestedRef = useRef(false);
  const combosRequestedRef = useRef(false);
  const [showComboEditor, setShowComboEditor] = useState(false);
  const [showComboBindingSelector, setShowComboBindingSelector] =
    useState(false);
  const [sharedFloatingPosition, setSharedFloatingPosition] =
    useState<FloatingWindowPosition>();
  useEffect(() => {
    if (!showKeycodeSelector && !showComboBindingSelector) {
      setSharedFloatingPosition(undefined);
    }
  }, [showComboBindingSelector, showKeycodeSelector]);
  const comboEditor = useComboEditor({
    runtimeCombo,
    keymap,
    requireUnlocked,
    t,
    onComboSelected: () => {},
  });

  const openComboEditor = useCallback(
    (combo: Combo) => {
      closeSelector();
      comboEditor.selectCombo(combo);
      setShowComboEditor(true);
    },
    [closeSelector, comboEditor],
  );
  const openComboBinding = useCallback(
    (combo: Combo) => {
      closeSelector();
      comboEditor.selectCombo(combo);
      setShowComboBindingSelector(true);
    },
    [closeSelector, comboEditor],
  );
  const returnToComboEditor = useCallback(() => {
    setShowComboBindingSelector(false);
    setShowComboEditor(true);
  }, []);
  const handleCreateCombo = useCallback(async () => {
    if (await comboEditor.handleNewCombo()) setShowComboEditor(true);
  }, [comboEditor]);
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

  const handleMacroAutoSelected = useCallback(() => undefined, []);

  const macroEditor = useMacroEditor({
    runtimeMacro,
    keymap,
    layers: layersForSelector,
    keyboardLayout: keyboardLayoutContext.layout,
    requireUnlocked,
    t,
    canMaintainSelection: macroEditorMode === "edit",
    onAutoSelected: handleMacroAutoSelected,
  });
  const {
    clearSelection: clearMacroSelection,
    selectMacro,
    beginCreate: beginMacroCreate,
  } = macroEditor;

  const handleOpenMacroEditor = useCallback(
    (slot?: number) => {
      setMacroEditorSession((session) => session + 1);
      setMacroEditorSlot(slot);
      if (slot === undefined) {
        beginMacroCreate();
        setMacroEditorMode("create");
      } else {
        const macro = runtimeMacro.macros.find(
          (candidate) => candidate.slot === slot,
        );
        if (macro) {
          clearMacroSelection();
          selectMacro(macro);
        } else {
          clearMacroSelection();
        }
        setMacroEditorMode("edit");
      }
    },
    [beginMacroCreate, clearMacroSelection, runtimeMacro.macros, selectMacro],
  );

  // Get current binding for selected key
  const currentBinding = useMemo(() => {
    if (selectedKeyPosition === null || !currentLayer) return null;
    return currentLayer.bindings[selectedKeyPosition] ?? null;
  }, [selectedKeyPosition, currentLayer]);

  const selectorTargetLabel = useMemo(() => {
    if (selectedKeyPosition === null || !currentLayer) return undefined;
    const binding = formatBehaviorBinding(
      currentBinding ?? undefined,
      currentBinding
        ? (keymap.behaviors.get(currentBinding.behaviorId) ?? null)
        : null,
      {
        layers: layersForSelector,
        keyboardLayout: keyboardLayoutContext.layout,
        runtimeMacros: runtimeMacro.macros,
      },
    );
    return `${currentLayer.name} · ${t(
      "Key position {{position}}: {{binding}}",
      {
        position: selectedKeyPosition,
        binding,
      },
    )}`;
  }, [
    currentBinding,
    currentLayer,
    keymap.behaviors,
    keyboardLayoutContext.layout,
    layersForSelector,
    runtimeMacro.macros,
    selectedKeyPosition,
    t,
  ]);

  // `requireUnlocked` (from the shared unlock gate) guards an edit action: if
  // Studio is locked it opens the unlock modal and returns false so the caller
  // bails out. `unknown` lock state is treated as unlocked (optimistic) — a
  // rare edit during that brief window still surfaces the modal reactively when
  // the request fails (see useKeymap's runWithUnlock).
  //
  // `withUnlock` wraps an edit behind that gate *and* resumes it after unlock:
  // run the action now if unlocked, otherwise hand it to the modal so it
  // replays the exact operation the user attempted once they unlock — instead
  // of silently dropping the click.
  const withUnlock = useCallback(
    (action: () => void | Promise<void>) => {
      if (!requireUnlocked(action)) return;
      return action();
    },
    [requireUnlocked],
  );

  // Handle key click
  const handleKeyClick = useCallback(
    (keyPosition: number) =>
      withUnlock(() => {
        selectionRevision.current += 1;
        setShowComboBindingSelector(false);
        setSelectedKeyPosition(keyPosition);
        setShowKeycodeSelector(true);
      }),
    [withUnlock],
  );

  // Handle key reset
  const handleKeyReset = useCallback(
    (keyPosition: number) =>
      withUnlock(async () => {
        if (!currentLayer) return;
        await keymap.resetBinding(currentLayer.id, keyPosition);
      }),
    [currentLayer, keymap, withUnlock],
  );

  // Handle key reset-to-default (in-memory edit; becomes an unsaved change)
  const handleKeyResetToDefault = useCallback(
    (keyPosition: number) =>
      withUnlock(async () => {
        if (!currentLayer) return;
        await keymap.resetBindingToDefault(currentLayer.id, keyPosition);
      }),
    [currentLayer, keymap, withUnlock],
  );

  // Handle binding selection
  const handleBindingSelect = useCallback(
    (binding: BehaviorBinding) =>
      withUnlock(async () => {
        if (!currentLayer || selectedKeyPosition === null) return;
        if (applyingBindingRef.current) return;
        applyingBindingRef.current = true;
        setIsApplyingBinding(true);
        const revision = selectionRevision.current;
        try {
          const success = await keymap.setBinding(
            currentLayer.id,
            selectedKeyPosition,
            binding,
          );
          if (!success || revision !== selectionRevision.current) return;
          if (selectorMode === "floating" && !autoAdvance) return;
          const count = Math.min(
            currentLayer.bindings.length,
            currentLayout?.keys.length ?? 0,
          );
          if (selectorMode === "floating" && selectedKeyPosition + 1 < count) {
            setSelectedKeyPosition(selectedKeyPosition + 1);
          } else {
            closeSelector();
          }
        } finally {
          applyingBindingRef.current = false;
          setIsApplyingBinding(false);
        }
      }),
    [
      currentLayer,
      currentLayout,
      selectedKeyPosition,
      selectorMode,
      autoAdvance,
      keymap,
      withUnlock,
      closeSelector,
    ],
  );

  useEffect(() => {
    closeSelector();
  }, [
    selectedLayerIndex,
    currentLayout,
    connection.isConnected,
    isTabActive,
    closeSelector,
  ]);

  const hasComboChanges =
    runtimeCombo.hasPendingChanges ||
    comboEditor.modifiedIndices.size > 0 ||
    comboEditor.globalModifiedFields.size > 0;
  const hasUnsavedChanges = keymap.hasUnsavedChanges || hasComboChanges;

  // The page-level Save is the single flash-persistence boundary for both
  // keymap bindings and runtime combos.
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await comboEditor.flushPendingWrites();
      if (keymap.hasUnsavedChanges) {
        await keymap.saveChanges();
      }
      if (isComboAvailable && hasComboChanges) {
        const status = await runtimeCombo.saveChanges();
        if (status) comboEditor.clearModified();
      }
    } finally {
      setIsSaving(false);
    }
  }, [comboEditor, hasComboChanges, isComboAvailable, keymap, runtimeCombo]);

  // Re-read the keymap from the keyboard. The page keeps its state across tab
  // switches now, so this is the way to pick up changes made outside the app
  // (or to retry after a failed load). Unsaved edits are staged on the device
  // itself, so a reload shows them again rather than dropping them.
  const handleReload = useCallback(() => {
    void keymap.loadKeymapData();
  }, [keymap]);

  // Discard restores both independent in-memory editing domains to their
  // last flash-saved values.
  const handleDiscard = useCallback(async () => {
    if (!confirm(t("Are you sure you want to discard all changes?"))) return;
    setIsDiscarding(true);
    try {
      comboEditor.cancelPendingWrites();
      await Promise.all([
        keymap.hasUnsavedChanges
          ? keymap.discardChanges()
          : Promise.resolve(true),
        isComboAvailable && hasComboChanges
          ? runtimeCombo.discardChanges()
          : Promise.resolve(null),
      ]);
      comboEditor.clearModified();
      setShowComboEditor(false);
      setShowComboBindingSelector(false);
    } finally {
      setIsDiscarding(false);
    }
  }, [comboEditor, hasComboChanges, isComboAvailable, keymap, runtimeCombo, t]);

  // Reset combines the keymap's built-in defaults with every currently known
  // runtime-combo slot, then persists both domains to flash.
  const handleResetToDefault = useCallback(
    () =>
      withUnlock(async () => {
        setIsResetting(true);
        try {
          const keymapReset = await keymap.resetToDefault();
          const combosReset = isComboAvailable
            ? (
                await Promise.all(
                  [...runtimeCombo.combos].map((combo) =>
                    runtimeCombo.resetCombo(combo.index),
                  ),
                )
              ).every(Boolean)
            : true;
          let combosSaved = true;
          if (isComboAvailable) {
            combosSaved =
              combosReset && Boolean(await runtimeCombo.saveChanges());
          }
          if (keymapReset && combosSaved) {
            comboEditor.clearModified();
            setShowResetDialog(false);
          }
        } finally {
          setIsResetting(false);
        }
      }),
    [comboEditor, isComboAvailable, keymap, runtimeCombo, withUnlock],
  );

  // Keep the preview on the same stable layer ID when its ordered index changes.
  const handleMoveLayer = useCallback(
    async (from: number, to: number) => {
      if (movingLayerRef.current || from === to) return;
      movingLayerRef.current = true;
      setIsMovingLayer(true);
      try {
        await withUnlock(async () => {
          // The protocol swaps two indexes. Move through adjacent positions
          // so a drop across several tabs inserts the layer at the drop point.
          const step = to > from ? 1 : -1;
          for (let index = from; index !== to; index += step) {
            const next = index + step;
            if (!(await keymap.moveLayer(index, next))) break;
            setSelectedLayerIndex((selected) =>
              selected === index ? next : selected === next ? index : selected,
            );
          }
        });
      } finally {
        movingLayerRef.current = false;
        setIsMovingLayer(false);
      }
    },
    [keymap, withUnlock],
  );

  // Handle add layer
  const handleAddLayer = useCallback(
    () =>
      withUnlock(async () => {
        const result = await keymap.addLayer();
        if (result) {
          // Select the new layer
          setSelectedLayerIndex(result.index);
        }
      }),
    [keymap, withUnlock],
  );

  // Handle delete layer
  const handleDeleteLayer = useCallback(
    (index: number) =>
      withUnlock(async () => {
        if (!keymap.keymap?.layers || keymap.keymap.layers.length <= 1) return;
        if (!confirm(t("Are you sure you want to delete this layer?"))) return;

        const remainingCount = keymap.keymap.layers.length - 1;
        const success = await keymap.removeLayer(index);
        if (success) {
          setSelectedLayerIndex((selected) =>
            selected > index
              ? selected - 1
              : selected === index
                ? Math.min(index, remainingCount - 1)
                : selected,
          );
        }
      }),
    [keymap, t, withUnlock],
  );

  // Handle restore of a single deleted layer (picked from the restore popup).
  // Restores the chosen layer id at the end of the layer list and selects it.
  const handleRestoreLayer = useCallback(
    (layerId: number) => {
      setShowRestoreMenu(false);
      withUnlock(async () => {
        const atIndex = keymap.keymap?.layers.length ?? 0;
        const layer = await keymap.restoreLayer(layerId, atIndex);
        if (layer) {
          setSelectedLayerIndex(atIndex);
        }
      });
    },
    [keymap, withUnlock],
  );

  // Handle "restore all": restore every deleted layer in id order, appending
  // each to the end. removedLayerIds is snapshotted first since it shrinks as
  // each restore completes, and atIndex is advanced manually (the closure's
  // keymap.layers length is the render snapshot, so it doesn't grow mid-loop).
  const handleRestoreAllLayers = useCallback(() => {
    setShowRestoreMenu(false);
    withUnlock(async () => {
      const ids = [...keymap.removedLayerIds];
      if (ids.length === 0) return;
      let atIndex = keymap.keymap?.layers.length ?? 0;
      for (const layerId of ids) {
        const layer = await keymap.restoreLayer(layerId, atIndex);
        if (layer) atIndex += 1;
      }
      if (atIndex > 0) setSelectedLayerIndex(atIndex - 1);
    });
  }, [keymap, withUnlock]);

  // Handle open rename dialog
  const handleOpenRenameDialog = useCallback(
    (index: number) =>
      withUnlock(() => {
        if (!keymap.keymap?.layers) return;
        const layer = keymap.keymap.layers[index];
        if (!layer) return;
        setRenameLayerId(layer.id);
        setRenameValue(layer.name);
        setRenameError(false);
        setShowRenameDialog(true);
      }),
    [keymap.keymap?.layers, withUnlock],
  );

  // Handle rename confirm
  const handleRenameConfirm = useCallback(async () => {
    if (renamingRef.current || !renameValue) return;
    if (!keymap.keymap?.layers) return;
    const layer = keymap.keymap.layers.find(
      (layer) => layer.id === renameLayerId,
    );
    if (!layer) return;
    renamingRef.current = true;
    setIsRenaming(true);
    setRenameError(false);
    try {
      if (await keymap.setLayerName(layer.id, renameValue)) {
        setShowRenameDialog(false);
      } else {
        setRenameError(true);
      }
    } catch {
      setRenameError(true);
    } finally {
      renamingRef.current = false;
      setIsRenaming(false);
    }
  }, [keymap, renameLayerId, renameValue]);

  useEffect(() => {
    if (
      isEditingLayers ||
      inputStream.activeLayerIndex === null ||
      !keymap.keymap?.layers[inputStream.activeLayerIndex]
    ) {
      return;
    }

    setSelectedLayerIndex(inputStream.activeLayerIndex);
  }, [inputStream.activeLayerIndex, keymap.keymap?.layers, isEditingLayers]);

  // Stream mode highlights (and beeps on) every key press, which only makes
  // sense while the Keymap tab is on screen. The page stays mounted when you
  // switch tabs, so turn the stream off on the way out instead of letting it
  // keep chirping in the background.
  const { isEnabled: isStreamEnabled, toggleStream } = inputStream;
  useEffect(() => {
    if (!isTabActive && isStreamEnabled) {
      void toggleStream();
    }
  }, [isTabActive, isStreamEnabled, toggleStream]);

  // Load the runtime-macro list as the FINAL step of the keymap tab load: only
  // after the keymap has fully loaded (preview + background behaviors/layers) so
  // the macro RPCs (list_macros / get_macro_global_settings) run last instead of
  // competing with the preview. Fires once per load; reset when a load restarts.
  const { isAvailable: isMacroAvailable, loadMacros: loadRuntimeMacros } =
    runtimeMacro;
  useEffect(() => {
    if (keymap.isLoading) {
      macrosRequestedRef.current = false;
      return;
    }
    if (
      keymap.isFullyLoaded &&
      isMacroAvailable &&
      !macrosRequestedRef.current
    ) {
      macrosRequestedRef.current = true;
      void loadRuntimeMacros();
    }
  }, [
    keymap.isLoading,
    keymap.isFullyLoaded,
    isMacroAvailable,
    loadRuntimeMacros,
  ]);

  useEffect(() => {
    if (keymap.isLoading) {
      combosRequestedRef.current = false;
      return;
    }
    if (
      keymap.isFullyLoaded &&
      isComboAvailable &&
      !combosRequestedRef.current
    ) {
      combosRequestedRef.current = true;
      void reloadRuntimeCombos();
    }
  }, [
    keymap.isLoading,
    keymap.isFullyLoaded,
    isComboAvailable,
    reloadRuntimeCombos,
  ]);

  useEffect(() => {
    if (!isTabActive) {
      setShowComboEditor(false);
      setShowComboBindingSelector(false);
      comboEditor.clearSelection();
    } else if (combosRequestedRef.current && isComboAvailable) {
      void runtimeCombo.loadCombos();
    }
    // A tab return must read edits made on Macro&Combo while this page was retained.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTabActive]);

  const sheetOpen =
    selectorMode === "floating" &&
    isTabActive &&
    connection.isConnected &&
    (showKeycodeSelector || showComboBindingSelector);
  useLayoutEffect(() => {
    if (sheetOpen && mobile && pageRef.current) pageRef.current.scrollTop = 0;
  }, [sheetOpen, mobile]);

  useLayoutEffect(() => {
    if (
      !sheetOpen ||
      !showKeycodeSelector ||
      !autoAdvance ||
      selectedKeyPosition === null
    )
      return;
    // Reveal only as far as needed in each scrollable ancestor, including the
    // preview's horizontal scroller and the workspace above a mobile sheet.
    // Do not focus the preview or queue scroll animations.
    pageRef.current
      ?.querySelector<HTMLElement>(
        `[data-key-position="${selectedKeyPosition}"]`,
      )
      ?.scrollIntoView?.({
        block: "nearest",
        inline: "nearest",
        behavior: "instant",
      });
  }, [
    sheetOpen,
    showKeycodeSelector,
    autoAdvance,
    selectedKeyPosition,
    mobile,
  ]);

  return (
    <div
      ref={pageRef}
      data-mobile-sheet-open={sheetOpen}
      className="keymap-page app-page p-4 sm:p-6 h-full"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="keymap-before-layers page-header flex flex-wrap items-center justify-between gap-x-6 gap-y-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="hidden sm:block p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20">
              <IconKeyboard
                size={24}
                className="text-[var(--color-electric)]"
              />
            </div>
            <div>
              <h1 className="text-xl font-medium text-[var(--color-text)]">
                {t("Keymap")}
              </h1>
              <p className="page-header-description text-sm text-[var(--color-text-muted)]">
                {t("Configure key bindings and layers")}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {connection.isConnected && keymap.keymap && (
            <div className="page-header-actions keymap-actions flex flex-wrap items-center gap-2">
              {/* Reading is allowed while locked, so Reload sits outside the
                  lock branch below. */}
              <ResponsiveButton
                label={t("Reload")}
                className="btn-ghost text-sm flex items-center gap-1.5 flex-shrink-0"
                onClick={handleReload}
                disabled={keymap.isLoading}
                title={t("Reload the keymap from the keyboard")}
              >
                <IconRefresh
                  size={16}
                  className={keymap.isLoading ? "animate-spin" : undefined}
                />
              </ResponsiveButton>
              {/* When Studio is locked, editing is disabled — show a lock badge
                  (click to unlock) instead of the Save / Reset controls. */}
              {locked ? (
                <button
                  type="button"
                  onClick={() => requireUnlocked()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium flex-shrink-0 border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/20 transition-colors"
                  title={t("Studio is locked — click to unlock")}
                >
                  <IconLock size={16} />
                  {t("Locked")}
                </button>
              ) : (
                <>
                  {/* Reset, Discard and every captured version live in one
                      dropdown — see ResetVersionMenu. */}
                  <div className="flex-shrink-0">
                    <ResetVersionMenu
                      title={t(
                        "Restore the keymap to a previous version or its defaults",
                      )}
                      versions={versionHistory.versions}
                      onSelectVersion={versionHistory.selectVersion}
                      disabled={keymap.isLoading}
                      isBusy={
                        isResetting || isDiscarding || versionHistory.isBusy
                      }
                      resetToDefault={{
                        description: keymap.isFastKeymapAvailable
                          ? t(
                              "Restores the keyboard's built-in default keymap and writes it to flash immediately.",
                            )
                          : t(
                              'This keyboard cannot reset the keymap on its own. To clear the keymap, use "Reset all settings" in the Settings tab, which restores every setting to its firmware default.',
                            ),
                        onSelect: () => setShowResetDialog(true),
                        disabled:
                          !keymap.isFastKeymapAvailable ||
                          isResetting ||
                          keymap.isLoading,
                      }}
                      discard={{
                        description: t(
                          "Drops unsaved keymap and combo edits in keyboard memory, then reloads their saved values.",
                        ),
                        onSelect: () => void handleDiscard(),
                        disabled: !hasUnsavedChanges || isDiscarding,
                      }}
                    />
                  </div>
                  <KeymapSharingMenu
                    beforeRead={comboEditor.flushPendingWrites}
                    disabled={
                      keymap.isLoading ||
                      isSaving ||
                      isResetting ||
                      isDiscarding
                    }
                    onApplied={async () => {
                      await keymap.loadKeymapData();
                      if (isComboAvailable) {
                        await runtimeCombo.reload();
                        comboEditor.clearModified();
                      }
                    }}
                  />
                  <ResponsiveButton
                    label={t("Save")}
                    title={t(
                      "Save the currently applied keymap so it is kept after the keyboard restarts",
                    )}
                    className="btn-electric text-sm flex items-center gap-1.5"
                    onClick={handleSave}
                    disabled={
                      isSaving ||
                      !hasUnsavedChanges ||
                      keymap.isLoading ||
                      Boolean(comboEditor.validationError && showComboEditor)
                    }
                  >
                    {isSaving ? (
                      <IconLoader2 size={16} className="animate-spin" />
                    ) : (
                      <IconDeviceFloppy size={16} />
                    )}
                  </ResponsiveButton>
                </>
              )}
            </div>
          )}
        </div>

        {/* Not Connected State */}
        {!connection.isConnected && (
          <div className="keymap-before-layers glass-card p-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("Connect your keyboard to edit keymaps")}
            </p>
          </div>
        )}

        {/* Error State (unlock errors are handled by the shared unlock modal) */}
        {keymap.error && (
          <div
            role="alert"
            className="keymap-before-layers glass-card p-4 mb-4 border-red-500/20 bg-red-500/10 flex items-center gap-3"
          >
            <IconAlertCircle size={20} className="text-red-400" />
            <p className="text-sm text-red-400">{t(keymap.error)}</p>
          </div>
        )}
        {inputStream.error && (
          <div
            role="alert"
            className="keymap-before-layers glass-card p-4 mb-4 border-red-500/20 bg-red-500/10 flex items-center gap-3"
          >
            <IconAlertCircle size={20} className="text-red-400" />
            <p className="text-sm text-red-400">{t(inputStream.error)}</p>
            <button
              className="ml-auto text-xs text-red-300 hover:text-red-200"
              onClick={inputStream.clearError}
            >
              {t("Dismiss")}
            </button>
          </div>
        )}
        {/* Loading State */}
        {connection.isConnected && keymap.isLoading && (
          <LoadingIndicator
            className="keymap-before-layers mb-6"
            label={getKeymapLoadingLabel(t, keymap.loadingProgress)}
            current={keymap.loadingProgress?.current}
            total={keymap.loadingProgress?.total}
          />
        )}

        {/* Main Content */}
        {connection.isConnected && keymap.keymap && currentLayout && (
          <>
            {/* The same layer toolbar is used on desktop and mobile. */}
            <div
              className="keymap-layer-toolbar flex items-center gap-2 mb-4"
              data-editing={isEditingLayers}
            >
              <span className="keymap-layer-label text-sm font-medium text-[var(--color-text-muted)]">
                {t("Layer")}
              </span>
              <KeymapLayerTabs
                layers={keymap.keymap.layers}
                selectedIndex={selectedLayerIndex}
                editing={isEditingLayers}
                busy={isMovingLayer || keymap.isLoading}
                onSelect={setSelectedLayerIndex}
                onMove={handleMoveLayer}
                onRename={handleOpenRenameDialog}
                onDelete={handleDeleteLayer}
              />
              <div className="keymap-layer-actions ml-auto flex shrink-0 items-center gap-1">
                {isEditingLayers ? (
                  <>
                    <EditorTooltip
                      content={t("Add a layer for another set of key bindings")}
                    >
                      <button
                        type="button"
                        aria-label={t("Add new layer")}
                        className="keymap-layer-action"
                        onClick={handleAddLayer}
                        disabled={
                          isMovingLayer ||
                          keymap.isLoading ||
                          keymap.availableLayers <= keymap.keymap.layers.length
                        }
                      >
                        <IconPlus size={16} />
                      </button>
                    </EditorTooltip>
                    <Popover.Root
                      open={showRestoreMenu}
                      onOpenChange={setShowRestoreMenu}
                    >
                      <EditorTooltip
                        content={
                          <>
                            {keymap.removedLayerIds.length > 0
                              ? t(
                                  "Restore deleted layer ({{count}} available)",
                                  {
                                    count: keymap.removedLayerIds.length,
                                  },
                                )
                              : t("No deleted layers to restore")}
                          </>
                        }
                      >
                        <Popover.Trigger
                          asChild
                          disabled={
                            isMovingLayer ||
                            keymap.isLoading ||
                            keymap.removedLayerIds.length === 0
                          }
                        >
                          <button
                            className="keymap-layer-action keymap-layer-restore"
                            disabled={
                              isMovingLayer ||
                              keymap.isLoading ||
                              keymap.removedLayerIds.length === 0
                            }
                            aria-label={t("Restore deleted layer")}
                            aria-haspopup="menu"
                            aria-expanded={showRestoreMenu}
                          >
                            <IconRestore
                              size={16}
                              className="text-[var(--color-electric)]"
                            />
                            <IconChevronDown size={12} aria-hidden="true" />
                          </button>
                        </Popover.Trigger>
                      </EditorTooltip>

                      {showRestoreMenu && keymap.removedLayerIds.length > 0 && (
                        <Popover.Portal>
                          <Popover.Content
                            role="menu"
                            aria-label={t("Restore deleted layer")}
                            align="end"
                            sideOffset={4}
                            collisionPadding={8}
                            className="z-50 w-64 max-w-[calc(100vw-16px)] max-h-[min(16rem,var(--radix-popover-content-available-height))] overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-xl py-1"
                          >
                            <button
                              role="menuitem"
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-left text-[var(--color-electric)] hover:bg-[var(--color-border)]"
                              onClick={handleRestoreAllLayers}
                            >
                              <IconRestore size={14} />
                              {t("Restore all deleted layers ({{count}})", {
                                count: keymap.removedLayerIds.length,
                              })}
                            </button>
                            <div className="my-1 border-t border-[var(--color-border)]" />
                            {keymap.removedLayerIds.map((layerId) => (
                              <button
                                key={`restore-${layerId}`}
                                role="menuitem"
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]"
                                onClick={() => handleRestoreLayer(layerId)}
                              >
                                <IconRestore
                                  size={14}
                                  className="text-[var(--color-text-muted)]"
                                />
                                {t("Layer {{id}}", { id: layerId })}
                              </button>
                            ))}
                          </Popover.Content>
                        </Popover.Portal>
                      )}
                    </Popover.Root>
                    <ResponsiveButton
                      label={t("Finish editing")}
                      className="keymap-layer-action text-sm"
                      disabled={isMovingLayer}
                      onClick={() => {
                        setShowRestoreMenu(false);
                        setIsEditingLayers(false);
                      }}
                    >
                      <IconX size={16} />
                    </ResponsiveButton>
                  </>
                ) : (
                  <ResponsiveButton
                    label={t("Edit layers")}
                    className="keymap-layer-action keymap-layer-edit text-sm"
                    onClick={() =>
                      withUnlock(() => {
                        closeSelector();
                        setIsEditingLayers(true);
                      })
                    }
                  >
                    <IconPencil size={14} />
                  </ResponsiveButton>
                )}
              </div>
            </div>

            {/* Keyboard Layout */}
            {currentLayer && (
              <div className="keymap-preview glass-card p-3 sm:p-6 relative">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="flex shrink-0 items-center gap-3">
                    {inputStream.isAvailable && (
                      <EditorTooltip
                        content={t(
                          "Highlight keys pressed on your keyboard when turned on",
                        )}
                      >
                        <label className="flex min-h-8 cursor-pointer items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                          <span>{t("Stream")}</span>
                          <Switch.Root
                            checked={inputStream.isEnabled}
                            onCheckedChange={() =>
                              void inputStream.toggleStream()
                            }
                            disabled={
                              inputStream.isToggling || keymap.isLoading
                            }
                            aria-label={t("Toggle stream mode")}
                            className="relative h-4 w-7 shrink-0 rounded-full bg-[var(--color-border)] transition-colors data-[state=checked]:bg-[var(--color-electric)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-electric)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Switch.Thumb className="block h-3 w-3 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-3.5" />
                          </Switch.Root>
                        </label>
                      </EditorTooltip>
                    )}
                    {/* Status indicator: unsaved edits (neon), saved-but-
                    customized-from-default (electric/blue), or saved-and-stock
                    (muted). */}
                    <div
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                      className="flex shrink-0 items-center gap-1.5 px-2 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs"
                      title={
                        !keymap.hasUnsavedChanges &&
                        keymap.isKeymapChangedFromDefault
                          ? t("Saved — changed from the default keymap")
                          : undefined
                      }
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          keymap.hasUnsavedChanges
                            ? "bg-[var(--color-neon)]"
                            : keymap.isKeymapChangedFromDefault
                              ? "bg-[var(--color-electric)]"
                              : "bg-[var(--color-text-muted)]"
                        }`}
                      />
                      <span
                        className={
                          keymap.hasUnsavedChanges
                            ? "text-[var(--color-neon)]"
                            : keymap.isKeymapChangedFromDefault
                              ? "text-[var(--color-electric)]"
                              : "text-[var(--color-text-muted)]"
                        }
                      >
                        {keymap.hasUnsavedChanges
                          ? t("Unsaved changes")
                          : t("Saved")}
                      </span>
                    </div>
                  </div>
                  <div className="ml-auto min-w-0 max-w-full">
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <button
                          type="button"
                          aria-label={t("Layout and display")}
                          aria-description={`${t("Physical Layout")}: ${currentLayout.name || t("Physical Layout")}; ${t("OS Layout")}: ${getLayoutLabel(keyboardLayoutContext.layout)}`}
                          className="flex h-7 max-w-full items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-electric)]/50 hover:text-[var(--color-text)] data-[state=open]:border-[var(--color-electric)]/50"
                        >
                          <IconKeyboard
                            size={14}
                            className="shrink-0 text-[var(--color-text-muted)]"
                          />
                          <span
                            className="max-w-40 truncate"
                            title={currentLayout.name || t("Physical Layout")}
                          >
                            {currentLayout.name || t("Physical Layout")}
                          </span>
                          <span
                            aria-hidden="true"
                            className="h-3 w-px bg-[var(--color-border)]"
                          />
                          <span className="shrink-0">
                            <span className="text-[var(--color-text-muted)]">
                              OS{" "}
                            </span>
                            {keyboardLayoutContext.layout === "US_JP"
                              ? "US (JP)"
                              : keyboardLayoutContext.layout}
                          </span>
                          <IconChevronDown
                            size={12}
                            className="shrink-0 text-[var(--color-text-muted)]"
                          />
                        </button>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content
                          aria-label={t("Layout and display")}
                          align="end"
                          sideOffset={8}
                          collisionPadding={12}
                          className="keymap-layout-options z-50 w-72 max-w-[calc(100vw-24px)] space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-xl"
                        >
                          <h3 className="text-sm font-medium text-[var(--color-text)]">
                            {t("Layout and display")}
                          </h3>
                          {/* Physical Layout Selector (if multiple layouts) */}
                          {keymap.physicalLayouts &&
                            keymap.physicalLayouts.layouts.length > 1 && (
                              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                <label
                                  htmlFor="keymap-physical-layout"
                                  className="text-xs text-[var(--color-text-muted)]"
                                >
                                  {t("Physical Layout")}
                                </label>
                                <select
                                  id="keymap-physical-layout"
                                  value={
                                    keymap.physicalLayouts.activeLayoutIndex
                                  }
                                  onChange={(e) =>
                                    keymap.setActiveLayout(
                                      Number(e.target.value),
                                    )
                                  }
                                  className="select-field keymap-layout-select w-full min-w-0 text-xs"
                                >
                                  {keymap.physicalLayouts.layouts.map(
                                    (layout, index) => (
                                      <option key={index} value={index}>
                                        {layout.name ||
                                          t("Layout {{id}}", { id: index + 1 })}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </div>
                            )}

                          {/* Keyboard Layout Selector */}
                          <div className="flex min-w-0 items-end gap-2">
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                              <label
                                htmlFor="keymap-os-layout"
                                className="text-xs text-[var(--color-text-muted)]"
                              >
                                {t("OS Layout")}
                              </label>
                              <select
                                id="keymap-os-layout"
                                value={keyboardLayoutContext.layout}
                                onChange={(e) =>
                                  keyboardLayoutContext.setLayout(
                                    e.target
                                      .value as import("../lib/keyboardLayouts").KeyboardLayoutType,
                                  )
                                }
                                className="select-field keymap-layout-select w-full min-w-0 text-xs"
                              >
                                {getAvailableLayouts().map((layoutType) => (
                                  <option key={layoutType} value={layoutType}>
                                    {getLayoutLabel(layoutType)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <>
                              {/* Tips: */}
                              <EditorTooltip
                                content={
                                  <>
                                    <div className="mb-1 font-semibold text-[var(--color-electric)]">
                                      {t("Choose OS's keyboard layout setting")}
                                    </div>
                                    <ul className="list-disc pl-4 space-y-1">
                                      <li>
                                        {t(
                                          "This setting only affects the visual key labels in DYA Studio web UI.",
                                        )}
                                      </li>
                                      <li>
                                        {t(
                                          "Changing this does not update any firmware setting. The keyboard is detected as US regardless of this setting. Please change the layout setting in your OS if needed. For MacOS, USB connection is always detected as US and cannot be changed for now.",
                                        )}
                                      </li>
                                      <li>
                                        {t(
                                          "The selection is saved in your browser's local storage for now.",
                                        )}
                                      </li>
                                    </ul>
                                  </>
                                }
                              >
                                <button
                                  type="button"
                                  className="shrink-0 rounded-md p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                                  aria-label={t(
                                    "Choose OS's keyboard layout setting",
                                  )}
                                >
                                  <IconInfoCircle size={16} />
                                </button>
                              </EditorTooltip>
                            </>
                          </div>
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>
                  </div>
                </div>
                <div className="relative hidden sm:block">
                  {inputStream.isEnabled && <BrowserKeyInputOverlay />}
                </div>
                <KeyboardLayout
                  layout={currentLayout}
                  layer={currentLayer}
                  layers={keymap.keymap.layers}
                  behaviors={keymap.behaviors}
                  selectedKey={selectedKeyPosition}
                  onKeyClick={handleKeyClick}
                  onKeyReset={handleKeyReset}
                  onKeyResetToDefault={handleKeyResetToDefault}
                  isBindingModified={keymap.isBindingModified}
                  isBindingOriginalKnown={keymap.isBindingOriginalKnown}
                  isBindingChangedFromDefault={
                    keymap.isBindingChangedFromDefault
                  }
                  getOriginalBinding={keymap.getOriginalBinding}
                  getDefaultBinding={keymap.getDefaultBinding}
                  keyboardLayout={keyboardLayoutContext.layout}
                  runtimeMacros={runtimeMacro.macros}
                  combos={isComboAvailable ? runtimeCombo.combos : []}
                  onComboClick={openComboBinding}
                  modules={
                    physicalLayoutModules.isAvailable
                      ? physicalLayoutModules.modules
                      : []
                  }
                  highlightedKeys={inputStream.highlightedKeys}
                  ariaLabel={t("Keyboard layout for {{layer}}", {
                    layer:
                      currentLayer.name ||
                      t("Layer {{id}}", { id: selectedLayerIndex }),
                  })}
                />
              </div>
            )}

            {physicalLayoutModules.error && (
              <div className="glass-card p-4 mt-4 border-yellow-500/20 bg-yellow-500/10 flex items-center gap-3">
                <div className="p-2">
                  <IconAlertTriangle size={24} />
                </div>
                <p className="text-sm">
                  {t(
                    "Physical layout module preview could not be loaded: {{error}}",
                    { error: physicalLayoutModules.error },
                  )}
                </p>
              </div>
            )}

            {/* Sensor Rotation Configuration */}
            {!sensorRotate.isAvailable && (
              <div className="glass-card p-4 mt-6 mb-4 border-yellow-500/20 bg-yellow-500/10 flex items-center gap-3">
                <div className="p-2">
                  <IconAlertTriangle size={24} />
                </div>
                <p className="text-sm">
                  {t(
                    "Runtime sensor rotation subsystem is not available for your keyboard. Rotary encoder configuration will not be displayed. You can enable the feature by applying cormoran/zmk-behavior-runtime-sensor-rotate in your firmware.",
                  )}
                  <br />
                  <a
                    href="https://github.com/cormoran/zmk-behavior-runtime-sensor-rotate"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-electric)] underline mx-1"
                  >
                    cormoran/zmk-behavior-runtime-sensor-rotate
                  </a>
                </p>
              </div>
            )}

            {sensorRotate.isAvailable && currentLayer && (
              <div className="mt-6">
                <SensorRotationConfig
                  selectedLayerId={currentLayer.id}
                  behaviors={keymap.behaviors}
                  layers={layersForSelector}
                  keyboardLayout={keyboardLayoutContext.layout}
                />
              </div>
            )}
            {isComboAvailable && (
              <section className="glass-card p-4 mt-6" aria-label={t("Combos")}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-sm font-medium text-[var(--color-text)] flex items-center gap-2">
                    <IconLink
                      size={17}
                      className="text-[var(--color-electric)]"
                    />
                    {t("Combos")}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-1 rounded text-[var(--color-electric)] hover:bg-[var(--color-border)] disabled:opacity-40"
                      onClick={() => void handleCreateCombo()}
                      disabled={runtimeCombo.isLoading || !keymap.isFullyLoaded}
                      aria-label={t("New combo")}
                      title={t("New combo")}
                    >
                      <IconPlus size={18} />
                    </button>
                  </div>
                </div>
                {runtimeCombo.error && (
                  <p role="alert" className="text-sm text-red-400 mb-2">
                    {t(runtimeCombo.error)}
                  </p>
                )}
                {comboEditor.statusMessage && (
                  <p
                    role="status"
                    className="text-sm text-[var(--color-warning)] mb-2"
                  >
                    {comboEditor.statusMessage}
                  </p>
                )}
                {runtimeCombo.combos.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {t("No runtime combos configured")}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {runtimeCombo.combos.map((combo, position) => {
                      const status = comboEditStatus(
                        combo.source,
                        combo.index,
                        comboEditor.modifiedIndices,
                      );
                      const isUnsaved = status === "unsaved";

                      return (
                        <button
                          key={combo.index}
                          type="button"
                          data-testid={`combo-list-item-${combo.index}`}
                          className={`min-w-56 max-w-full flex-[1_1_14rem] p-3 rounded-lg border text-left transition-colors ${
                            isUnsaved
                              ? "bg-[var(--color-neon)]/10 border-[var(--color-neon)]/50 hover:border-[var(--color-neon)]"
                              : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-electric)]/60"
                          } ${combo.enabled ? "" : "opacity-60"}`}
                          onClick={() => openComboEditor(combo)}
                        >
                          <span className="flex items-center gap-1.5 text-sm font-medium truncate">
                            <span
                              className={`flex shrink-0 items-center gap-px ${
                                isUnsaved
                                  ? "text-[var(--color-neon)]"
                                  : "text-[var(--color-electric)]"
                              }`}
                            >
                              <IconLink size={14} aria-hidden="true" />
                              {position + 1}
                            </span>
                            <span
                              className={`truncate ${
                                isUnsaved
                                  ? "text-[var(--color-neon)]"
                                  : "text-[var(--color-text)]"
                              }`}
                            >
                              {combo.name ||
                                t("Combo {{index}}", { index: combo.index })}
                            </span>
                            <StatusDot status={status} />
                          </span>
                          <span className="block text-xs text-[var(--color-text-muted)] truncate">
                            {combo.keyPositions.join(" + ")}
                          </span>
                          <span className="block text-xs text-[var(--color-text-muted)] truncate">
                            {t("Layers")}:{" "}
                            {formatLayerScope(
                              combo.layerMask,
                              t,
                              layersForSelector,
                            )}
                          </span>
                          <span
                            className={`block text-xs truncate ${
                              isUnsaved
                                ? "text-[var(--color-neon)]"
                                : "text-[var(--color-electric)]"
                            }`}
                          >
                            {formatComboBehavior(
                              combo.behavior ??
                                defaultBehaviorBinding(keymap.behaviors),
                              keymap.behaviors,
                              layersForSelector,
                              keyboardLayoutContext.layout,
                              runtimeMacro.macros,
                              t,
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
        {/* Info */}
        <div
          ref={keymapContentAnchorRef}
          className="mt-8 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)]"
        >
          <p className="text-xs text-[var(--color-text-muted)]">
            {connection.isConnected
              ? t(
                  "Click on a key to modify its binding. Modified keys are highlighted in green and show the original binding on hover. Use the Discard button to drop unsaved changes, or Reset to restore the default keymap.",
                )
              : t(
                  "Connect your keyboard to edit keymaps. Click on a key to modify its binding.",
                )}
          </p>
        </div>
      </div>

      {/* Rename Layer Dialog */}
      <Dialog.Root
        open={showRenameDialog}
        onOpenChange={(open) => {
          if (!open && !renamingRef.current) setShowRenameDialog(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]" />
          <Dialog.Content
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-2xl z-[10000] p-6"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              renameInputRef.current?.focus();
              renameInputRef.current?.select();
            }}
          >
            <Dialog.Title className="text-base font-medium text-[var(--color-text)] mb-4">
              {t("Rename Layer")}
            </Dialog.Title>
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              disabled={isRenaming}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void handleRenameConfirm();
                }
              }}
              maxLength={keymap.maxLayerNameLength || undefined}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-electric)] mb-4"
              placeholder={t("Layer name")}
            />
            {renameError && (
              <p role="alert" className="text-sm text-red-400 mb-4">
                {t("Failed to rename layer. Please try again.")}
              </p>
            )}
            <div className="flex gap-3">
              <button
                className="flex-1 btn-ghost border border-[var(--color-border)]"
                onClick={() => setShowRenameDialog(false)}
                disabled={isRenaming}
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                className="flex-1 btn-electric flex items-center justify-center gap-2"
                onClick={() => void handleRenameConfirm()}
                disabled={isRenaming || !renameValue}
              >
                {isRenaming && (
                  <IconLoader2 size={16} className="animate-spin" />
                )}
                {t("Rename")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Reset-to-Default Confirmation Dialog */}
      <Dialog.Root
        open={showResetDialog}
        onOpenChange={(open) => {
          if (!open && !isResetting) setShowResetDialog(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-2xl z-50 p-6">
            <Dialog.Title className="text-base font-medium text-[var(--color-text)] mb-2 flex items-center gap-2">
              <IconAlertTriangle
                size={18}
                className="text-[var(--color-warning)]"
              />
              {t("Reset to default keymap?")}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-[var(--color-text-muted)] mb-5">
              {t(
                "This writes the selected defaults to your keyboard flash immediately. This cannot be undone.",
              )}
            </Dialog.Description>
            <ul className="mb-5 list-disc space-y-1 pl-5 text-sm text-[var(--color-text-muted)]">
              <li>
                {t(
                  "All saved key bindings are reset to the keyboard's built-in default keymap.",
                )}
              </li>
              {isComboAvailable && (
                <li>
                  {t(
                    "All saved runtime combos are reset to their firmware defaults.",
                  )}
                </li>
              )}
            </ul>
            <div className="flex gap-3">
              <button
                className="flex-1 btn-ghost border border-[var(--color-border)]"
                onClick={() => setShowResetDialog(false)}
                disabled={isResetting}
              >
                {t("Cancel")}
              </button>
              <ResponsiveButton
                label={t("Reset to default")}
                className="flex-1 btn-electric flex items-center justify-center gap-2"
                onClick={() => void handleResetToDefault()}
                disabled={isResetting}
              >
                {isResetting && (
                  <IconLoader2 size={16} className="animate-spin" />
                )}
              </ResponsiveButton>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Restore-a-version diff modal (opened from the reset dropdown) */}
      <VersionDiffModal
        {...versionHistory.diffModalProps}
        labeler={versionHistory.labeler}
      />

      <Dialog.Root
        open={showComboEditor && isTabActive}
        onOpenChange={(open) => !open && setShowComboEditor(false)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[10000]" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(96vw,900px)] max-h-[90vh] overflow-y-auto rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl z-[10000]"
          >
            <Dialog.Title className="sr-only">{t("Combo Editor")}</Dialog.Title>
            <div className="flex justify-end p-2">
              <Dialog.Close
                className="p-1 rounded hover:bg-[var(--color-border)]"
                aria-label={t("Close")}
              >
                <IconX size={18} />
              </Dialog.Close>
            </div>
            {comboEditor.selectedIndex !== null && (
              <ComboEditorCard
                combo={comboEditor}
                runtimeCombo={runtimeCombo}
                keymap={keymap}
                layers={layersForSelector}
                keyboardLayout={keyboardLayoutContext.layout}
                runtimeMacros={runtimeMacro.macros}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <KeycodeSelector
        open={showComboBindingSelector && isTabActive}
        presentation={selectorMode}
        modalLayer="nested"
        floatingAnchorRef={keymapContentAnchorRef}
        floatingPosition={sharedFloatingPosition}
        onFloatingPositionChange={setSharedFloatingPosition}
        onClose={() => setShowComboBindingSelector(false)}
        onSelect={(binding) => {
          comboEditor.applyDraftChange(
            { ...comboEditor.draft, behavior: binding },
            true,
          );
          setShowComboBindingSelector(false);
        }}
        targetLabel={`${t("Combo Editor")} · ${comboEditor.draft.name || comboEditor.draft.index}`}
        currentBinding={comboEditor.draft.behavior}
        behaviors={keymap.behaviors}
        layers={layersForSelector}
        keyboardLayout={keyboardLayoutContext.layout}
        runtimeMacros={runtimeMacro.macros}
        toolbar={
          <div className="flex items-center gap-1">
            <EditorTooltip content={t("Open Combo Editor")}>
              <button
                type="button"
                className="p-1 rounded hover:bg-[var(--color-border)]"
                aria-label={t("Open Combo Editor")}
                onClick={returnToComboEditor}
              >
                <IconLink size={16} />
              </button>
            </EditorTooltip>
            {selectorMode === "floating" ? (
              <EditorTooltip
                content={t("Edit in a dialog that covers the keyboard preview")}
              >
                <button
                  type="button"
                  className="p-1 rounded hover:bg-[var(--color-border)]"
                  aria-label={t("Dialog mode")}
                  onClick={() => setSelectorMode("modal")}
                >
                  <IconArrowsMaximize size={16} />
                </button>
              </EditorTooltip>
            ) : (
              <EditorTooltip
                content={t(
                  mobile
                    ? "Edit in a bottom sheet below the keyboard preview"
                    : "Edit beside the keyboard preview while keeping it visible",
                )}
              >
                <button
                  type="button"
                  className="p-1 rounded hover:bg-[var(--color-border)]"
                  aria-label={t(mobile ? "Sheet mode" : "Floating mode")}
                  onClick={() => setSelectorMode("floating")}
                >
                  <IconAppWindow size={16} />
                </button>
              </EditorTooltip>
            )}
          </div>
        }
      />

      {/* Keycode Selector Dialog */}
      <MacroEditorDialog
        key={macroEditorSession}
        open={macroEditorMode !== null}
        mode={macroEditorMode ?? "edit"}
        editSlot={macroEditorSlot}
        onOpenChange={(open) => {
          if (!open) {
            if (macroEditorMode === "create") macroEditor.cancelCreate();
            setMacroEditorMode(null);
            if (macroEditorMode === "edit") void runtimeMacro.loadMacros();
          }
        }}
        macro={macroEditor}
        runtimeMacro={runtimeMacro}
        keymap={keymap}
        layers={layersForSelector}
        keyboardLayout={keyboardLayoutContext.layout}
      />
      <KeycodeSelector
        open={showKeycodeSelector && isTabActive && connection.isConnected}
        presentation={selectorMode}
        floatingAnchorRef={keymapContentAnchorRef}
        floatingPosition={sharedFloatingPosition}
        onFloatingPositionChange={setSharedFloatingPosition}
        selectionKey={`${currentLayer?.id}:${selectedKeyPosition}:${currentBinding?.behaviorId}:${currentBinding?.param1}:${currentBinding?.param2}`}
        targetLabel={selectorTargetLabel}
        busy={isApplyingBinding}
        error={keymap.error}
        toolbar={
          selectorMode === "floating" &&
          selectedKeyPosition !== null &&
          currentLayer ? (
            <div className="flex shrink-0 items-center gap-1">
              <div className="flex gap-1 shrink-0">
                <EditorTooltip content={t("Automatically select the next key")}>
                  <button
                    type="button"
                    aria-label={t("Auto advance")}
                    aria-pressed={autoAdvance}
                    disabled={isApplyingBinding}
                    onClick={() => setAutoAdvance(!autoAdvance)}
                    className={`p-1 rounded disabled:opacity-40 ${autoAdvance ? "bg-[var(--color-electric)]/15 text-[var(--color-electric)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"}`}
                  >
                    <IconPlayerTrackNext size={16} />
                  </button>
                </EditorTooltip>
                <EditorTooltip content={t("Edit the previous key")}>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-[var(--color-border)] disabled:opacity-40"
                    aria-label={t("Previous key")}
                    disabled={isApplyingBinding || selectedKeyPosition === 0}
                    onClick={() => handleKeyClick(selectedKeyPosition - 1)}
                  >
                    <IconChevronLeft size={16} />
                  </button>
                </EditorTooltip>
                <EditorTooltip content={t("Edit the next key")}>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-[var(--color-border)] disabled:opacity-40"
                    aria-label={t("Next key")}
                    disabled={
                      isApplyingBinding ||
                      selectedKeyPosition + 1 >=
                        Math.min(
                          currentLayer.bindings.length,
                          currentLayout?.keys.length ?? 0,
                        )
                    }
                    onClick={() => handleKeyClick(selectedKeyPosition + 1)}
                  >
                    <IconChevronRight size={16} />
                  </button>
                </EditorTooltip>
                <EditorTooltip
                  content={t(
                    "Edit in a dialog that covers the keyboard preview",
                  )}
                >
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-[var(--color-border)] disabled:opacity-40"
                    aria-label={t("Dialog mode")}
                    onClick={() => {
                      selectionRevision.current += 1;
                      setSelectorMode("modal");
                    }}
                  >
                    <IconArrowsMaximize size={16} />
                  </button>
                </EditorTooltip>
              </div>
            </div>
          ) : (
            <EditorTooltip
              content={t(
                mobile
                  ? "Edit in a bottom sheet below the keyboard preview"
                  : "Edit beside the keyboard preview while keeping it visible",
              )}
            >
              <button
                type="button"
                className="p-1 rounded hover:bg-[var(--color-border)]"
                aria-label={t(mobile ? "Sheet mode" : "Floating mode")}
                onClick={() => {
                  selectionRevision.current += 1;
                  setSelectorMode("floating");
                }}
              >
                <IconAppWindow size={16} />
              </button>
            </EditorTooltip>
          )
        }
        onClose={closeSelector}
        onSelect={handleBindingSelect}
        currentBinding={currentBinding}
        behaviors={keymap.behaviors}
        layers={layersForSelector}
        keyboardLayout={keyboardLayoutContext.layout}
        runtimeMacros={runtimeMacro.macros}
        onOpenMacroEditor={handleOpenMacroEditor}
      />
    </div>
  );
}
