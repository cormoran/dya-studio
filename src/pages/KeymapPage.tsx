import {
  useState,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  IconKeyboard,
  IconDeviceFloppy,
  IconChevronUp,
  IconChevronDown,
  IconAlertCircle,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconRestore,
  IconAlertTriangle,
  IconInfoCircle,
  IconPencil,
  IconLock,
  IconRefresh,
} from "@tabler/icons-react";
import { useStudioLockState } from "@cormoran/zmk-studio-react-hook";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import { ConnectionContext } from "../components/DeviceConnection";
import { KeyboardLayoutContext } from "../contexts/KeyboardLayoutContext";
import { KeyboardLayout } from "../components/KeyboardLayout";
import { KeycodeSelector } from "../components/KeycodeSelector";
import { SensorRotationConfig } from "../components/SensorRotationConfig";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { useKeymap, getKeymapLoadingLabel } from "../hooks/useKeymap";
import { usePhysicalLayoutModules } from "../hooks/usePhysicalLayoutModules";
import { useRuntimeSensorRotate } from "../hooks/useRuntimeSensorRotate";
import { useRuntimeMacro } from "../hooks/useRuntimeMacro";
import { useInputStream } from "../hooks/useInputStream";
import { getAvailableLayouts, getLayoutLabel } from "../lib/keyboardLayouts";
import type { BehaviorBinding } from "../hooks/useKeymap";
import { useStudioUnlock } from "../hooks/useStudioUnlock";
import { useLanguage } from "../hooks/useLanguage";
import { ResetVersionMenu } from "../components/versionHistory/ResetVersionMenu";
import { VersionDiffModal } from "../components/versionHistory/VersionDiffModal";
import { useKeymapVersionHistory } from "../hooks/versionHistory/useKeymapVersionHistory";
import { useIsTabActive } from "../hooks/useIsTabActive";

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
  const inputStream = useInputStream();
  // Snapshots the keymap into IndexedDB after every full load, and drives the
  // "restore a previous version" flow behind the reset dropdown.
  const versionHistory = useKeymapVersionHistory(keymap, t);
  const isTabActive = useIsTabActive();
  // Proactive lock state: the fast-keymap subsystem is unsecured, so the keymap
  // is viewable while Studio is locked. We use this to (a) show a lock badge in
  // place of Save/Reset and (b) prompt for unlock the moment the user tries to
  // edit — rather than letting the edit fail and then reacting.
  const { locked } = useStudioLockState();
  // Proactive unlock gate (opens the shared unlock modal); the reactive
  // fail→modal→retry path is handled inside useKeymap via runWithUnlock.
  const { requireUnlock: requireUnlocked } = useStudioUnlock();

  // Local UI state
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
  const [selectedKeyPosition, setSelectedKeyPosition] = useState<number | null>(
    null,
  );
  const [showKeycodeSelector, setShowKeycodeSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  // Popup listing the device's deleted (restorable) layers, opened from the
  // restore button in the layer toolbar.
  const [showRestoreMenu, setShowRestoreMenu] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  // Guards the deferred macro load so it fires once per keymap load; reset when
  // a new load starts (see the effect below).
  const macrosRequestedRef = useRef(false);

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
      void action();
    },
    [requireUnlocked],
  );

  // Handle key click
  const handleKeyClick = useCallback(
    (keyPosition: number) =>
      withUnlock(() => {
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
        await keymap.setBinding(currentLayer.id, selectedKeyPosition, binding);
        setShowKeycodeSelector(false);
        setSelectedKeyPosition(null);
      }),
    [currentLayer, selectedKeyPosition, keymap, withUnlock],
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

  // Re-read the keymap from the keyboard. The page keeps its state across tab
  // switches now, so this is the way to pick up changes made outside the app
  // (or to retry after a failed load). Unsaved edits are staged on the device
  // itself, so a reload shows them again rather than dropping them.
  const handleReload = useCallback(() => {
    void keymap.loadKeymapData();
  }, [keymap]);

  // Handle discard
  const handleDiscard = useCallback(async () => {
    if (!confirm(t("Are you sure you want to discard all changes?"))) return;
    setIsDiscarding(true);
    try {
      await keymap.discardChanges();
    } finally {
      setIsDiscarding(false);
    }
  }, [keymap, t]);

  // Handle reset-to-default: reset the persistent keymap to the hard-coded
  // default, then close the confirmation dialog. Gated on unlock (it edits +
  // saves) like every other keymap edit.
  const handleResetToDefault = useCallback(
    () =>
      withUnlock(async () => {
        setIsResetting(true);
        try {
          const ok = await keymap.resetToDefault();
          if (ok) {
            setShowResetDialog(false);
          }
        } finally {
          setIsResetting(false);
        }
      }),
    [keymap, withUnlock],
  );

  // Handle layer move up
  const handleMoveLayerUp = useCallback(
    () =>
      withUnlock(async () => {
        if (selectedLayerIndex <= 0) return;
        const success = await keymap.moveLayer(
          selectedLayerIndex,
          selectedLayerIndex - 1,
        );
        if (success) {
          setSelectedLayerIndex(selectedLayerIndex - 1);
        }
      }),
    [selectedLayerIndex, keymap, withUnlock],
  );

  // Handle layer move down
  const handleMoveLayerDown = useCallback(
    () =>
      withUnlock(async () => {
        if (!keymap.keymap?.layers) return;
        if (selectedLayerIndex >= keymap.keymap.layers.length - 1) return;
        const success = await keymap.moveLayer(
          selectedLayerIndex,
          selectedLayerIndex + 1,
        );
        if (success) {
          setSelectedLayerIndex(selectedLayerIndex + 1);
        }
      }),
    [selectedLayerIndex, keymap, withUnlock],
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
    () =>
      withUnlock(async () => {
        if (!keymap.keymap?.layers || keymap.keymap.layers.length <= 1) return;
        if (!confirm(t("Are you sure you want to delete this layer?"))) return;

        const success = await keymap.removeLayer(selectedLayerIndex);
        if (success) {
          // Adjust selected index if we deleted the last layer
          if (selectedLayerIndex >= keymap.keymap.layers.length - 1) {
            setSelectedLayerIndex(Math.max(0, selectedLayerIndex - 1));
          }
        }
      }),
    [selectedLayerIndex, keymap, t, withUnlock],
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
    () =>
      withUnlock(() => {
        if (!keymap.keymap?.layers) return;
        const layer = keymap.keymap.layers[selectedLayerIndex];
        if (!layer) return;
        setRenameValue(layer.name);
        setShowRenameDialog(true);
      }),
    [keymap.keymap?.layers, selectedLayerIndex, withUnlock],
  );

  // Handle rename confirm
  const handleRenameConfirm = useCallback(async () => {
    if (!keymap.keymap?.layers) return;
    const layer = keymap.keymap.layers[selectedLayerIndex];
    if (!layer) return;
    setIsRenaming(true);
    try {
      await keymap.setLayerName(layer.id, renameValue);
      setShowRenameDialog(false);
    } finally {
      setIsRenaming(false);
    }
  }, [keymap, selectedLayerIndex, renameValue]);

  useEffect(() => {
    if (
      inputStream.activeLayerIndex === null ||
      !keymap.keymap?.layers[inputStream.activeLayerIndex]
    ) {
      return;
    }

    setSelectedLayerIndex(inputStream.activeLayerIndex);
  }, [inputStream.activeLayerIndex, keymap.keymap?.layers]);

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

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col tablet:flex-row tablet:items-center gap-3 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20">
              <IconKeyboard
                size={24}
                className="text-[var(--color-electric)]"
              />
            </div>
            <div>
              <h1 className="text-xl font-medium text-[var(--color-text)]">
                {t("Keymap")}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("Configure key bindings and layers")}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {connection.isConnected && keymap.keymap && (
            <div className="flex items-center gap-2 ml-auto">
              {inputStream.isAvailable && (
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {t("Stream")}
                  </span>
                  <Switch.Root
                    checked={inputStream.isEnabled}
                    onCheckedChange={() => void inputStream.toggleStream()}
                    disabled={inputStream.isToggling || keymap.isLoading}
                    aria-label={t("Toggle stream mode")}
                    className="w-10 h-5 rounded-full relative data-[state=checked]:bg-[var(--color-electric)] bg-[var(--color-border)] border border-[var(--color-border)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Switch.Thumb className="block w-4 h-4 rounded-full transition-transform data-[state=checked]:translate-x-5 translate-x-0.5 will-change-transform bg-white border border-[var(--color-border)]" />
                  </Switch.Root>
                </div>
              )}
              {/* Reading is allowed while locked, so Reload sits outside the
                  lock branch below. */}
              <button
                className="btn-ghost text-sm flex items-center gap-1.5 flex-shrink-0"
                onClick={handleReload}
                disabled={keymap.isLoading}
                title={t("Reload the keymap from the keyboard")}
              >
                <IconRefresh
                  size={16}
                  className={keymap.isLoading ? "animate-spin" : undefined}
                />
                {t("Reload")}
              </button>
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
                          "Drops the unsaved edits in keyboard memory and reloads the keymap stored on the keyboard.",
                        ),
                        onSelect: () => void handleDiscard(),
                        disabled: !keymap.hasUnsavedChanges || isDiscarding,
                      }}
                    />
                  </div>
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
                    {t("Save")}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Not Connected State */}
        {!connection.isConnected && (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("Connect your keyboard to edit keymaps")}
            </p>
          </div>
        )}

        {/* Error State (unlock errors are handled by the shared unlock modal) */}
        {keymap.error && (
          <div className="glass-card p-4 mb-4 border-red-500/20 bg-red-500/10 flex items-center gap-3">
            <IconAlertCircle size={20} className="text-red-400" />
            <p className="text-sm text-red-400">{t(keymap.error)}</p>
          </div>
        )}
        {inputStream.error && (
          <div className="glass-card p-4 mb-4 border-red-500/20 bg-red-500/10 flex items-center gap-3">
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
            className="mb-6"
            label={getKeymapLoadingLabel(t, keymap.loadingProgress)}
            current={keymap.loadingProgress?.current}
            total={keymap.loadingProgress?.total}
          />
        )}

        {/* Main Content */}
        {connection.isConnected && keymap.keymap && currentLayout && (
          <>
            {/* Layer Tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <div className="flex gap-2 flex-1 overflow-x-auto pb-2 basis-full sm:basis-auto">
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
                    {layer.name || t("Layer {{id}}", { id: index })}
                  </button>
                ))}
              </div>

              {/* Layer Management Buttons */}
              <Tooltip.Provider delayDuration={200}>
                <div className="flex items-center gap-1 border-l border-[var(--color-border)] pl-2 ml-auto">
                  {/* Layer Sorting Label */}
                  <span className="text-xs text-[var(--color-text-muted)] mr-1">
                    {t("Sort")}:
                  </span>

                  {/* Move Up Button */}
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={handleMoveLayerUp}
                        disabled={selectedLayerIndex <= 0}
                        aria-label={t("Move layer up (higher priority)")}
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
                        {t("Move layer up (higher priority)")}
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
                        aria-label={t("Move layer down (lower priority)")}
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
                        {t("Move layer down (lower priority)")}
                        <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </div>

                {/* Layer Add/Delete/Restore Buttons */}
                <div className="flex items-center gap-1 border-l border-[var(--color-border)] pl-2">
                  {/* Rename Layer Button */}
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={handleOpenRenameDialog}
                        aria-label={t("Rename current layer")}
                      >
                        <IconPencil
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
                        {t("Rename current layer")}
                        <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>

                  {/* Add Layer Button */}
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={handleAddLayer}
                        disabled={
                          keymap.availableLayers <= keymap.keymap.layers.length
                        }
                        aria-label={t("Add new layer")}
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
                        {t("Add new layer")}
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
                        aria-label={t("Delete current layer")}
                      >
                        <IconTrash size={16} className="text-red-400" />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="px-2 py-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] shadow-lg z-50"
                        sideOffset={5}
                      >
                        {t("Delete current layer")}
                        <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>

                  {/* Restore Layer Button — opens a popup listing the device's
                      deleted (restorable) layers: a "restore all" action on top,
                      then one row per deleted layer. */}
                  <div className="relative">
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button
                          className="p-2 rounded-lg hover:bg-[var(--color-border)] disabled:opacity-30 disabled:cursor-not-allowed"
                          onClick={() => setShowRestoreMenu((open) => !open)}
                          disabled={keymap.removedLayerIds.length === 0}
                          aria-label={t("Restore deleted layer")}
                          aria-haspopup="menu"
                          aria-expanded={showRestoreMenu}
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
                            ? t("Restore deleted layer ({{count}} available)", {
                                count: keymap.removedLayerIds.length,
                              })
                            : t("No deleted layers to restore")}
                          <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>

                    {showRestoreMenu && keymap.removedLayerIds.length > 0 && (
                      <>
                        {/* Click-away backdrop */}
                        <button
                          type="button"
                          aria-hidden="true"
                          tabIndex={-1}
                          className="fixed inset-0 z-40 cursor-default"
                          onClick={() => setShowRestoreMenu(false)}
                        />
                        <div
                          role="menu"
                          aria-label={t("Restore deleted layer")}
                          className="absolute right-0 top-full mt-1 z-50 min-w-[12rem] max-h-64 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-xl py-1"
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
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Tooltip.Provider>
            </div>

            <div className="flex items-center gap-2 justify-between flex-wrap mb-4">
              {/* Physical Layout Selector (if multiple layouts) */}
              {keymap.physicalLayouts &&
                keymap.physicalLayouts.layouts.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {t("Physical Layout")}:
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
                          {layout.name || t("Layout {{id}}", { id: index + 1 })}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {/* Keyboard Layout Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t("OS Layout")}:
                </span>
                <select
                  value={keyboardLayoutContext.layout}
                  onChange={(e) =>
                    keyboardLayoutContext.setLayout(
                      e.target
                        .value as import("../lib/keyboardLayouts").KeyboardLayoutType,
                    )
                  }
                  className="px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)]"
                >
                  {getAvailableLayouts().map((layoutType) => (
                    <option key={layoutType} value={layoutType}>
                      {getLayoutLabel(layoutType)}
                    </option>
                  ))}
                </select>
                <Tooltip.Provider delayDuration={200}>
                  {/* Tips: */}
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <IconInfoCircle size={14} />
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="px-3 py-2 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] shadow-lg z-50 max-w-xs"
                        sideOffset={5}
                      >
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
                        <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
            </div>

            {/* Keyboard Layout */}
            {currentLayer && (
              <div className="glass-card p-8 relative">
                {/* Status indicator: unsaved edits (neon), saved-but-
                    customized-from-default (electric/blue), or saved-and-stock
                    (muted). */}
                <div
                  className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/70 text-xs"
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
                  modules={
                    physicalLayoutModules.isAvailable
                      ? physicalLayoutModules.modules
                      : []
                  }
                  highlightedKeys={inputStream.highlightedKeys}
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
          </>
        )}
        {/* Info */}
        <div className="mt-8 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)]">
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
        onOpenChange={(open) => !open && setShowRenameDialog(false)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-2xl z-50 p-6"
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
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRenameConfirm();
                if (e.key === "Escape") setShowRenameDialog(false);
              }}
              maxLength={keymap.maxLayerNameLength || undefined}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-electric)] mb-4"
              placeholder={t("Layer name")}
            />
            <div className="flex gap-3">
              <button
                className="flex-1 btn-ghost border border-[var(--color-border)]"
                onClick={() => setShowRenameDialog(false)}
                disabled={isRenaming}
              >
                {t("Cancel")}
              </button>
              <button
                className="flex-1 btn-electric flex items-center justify-center gap-2"
                onClick={() => void handleRenameConfirm()}
                disabled={isRenaming}
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
                "This resets the saved keymap on your keyboard back to its hard-coded default and writes it to flash immediately. All saved key bindings will be lost. This cannot be undone.",
              )}
            </Dialog.Description>
            <div className="flex gap-3">
              <button
                className="flex-1 btn-ghost border border-[var(--color-border)]"
                onClick={() => setShowResetDialog(false)}
                disabled={isResetting}
              >
                {t("Cancel")}
              </button>
              <button
                className="flex-1 btn-electric flex items-center justify-center gap-2"
                onClick={() => void handleResetToDefault()}
                disabled={isResetting}
              >
                {isResetting && (
                  <IconLoader2 size={16} className="animate-spin" />
                )}
                {t("Reset to default")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Restore-a-version diff modal (opened from the reset dropdown) */}
      <VersionDiffModal
        {...versionHistory.diffModalProps}
        labeler={versionHistory.labeler}
      />

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
        keyboardLayout={keyboardLayoutContext.layout}
        runtimeMacros={runtimeMacro.macros}
      />
    </div>
  );
}
