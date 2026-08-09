/**
 * Merged "Macro&Combo" page: one tab that hosts both the runtime-macro and
 * runtime-combo editors. The left column shows the two lists (Macros on top,
 * Combos below); the right column shows exactly one of: the selected macro's
 * editor, the selected combo's editor, the macro global settings, the combo
 * global settings, or an empty placeholder. A single top action bar refreshes,
 * saves and discards both domains at once.
 */
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconDeviceFloppy,
  IconLoader2,
  IconLock,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconWand,
} from "@tabler/icons-react";
import { ConnectionContext } from "../components/DeviceConnection";
import { KeyboardLayoutContext } from "../contexts/KeyboardLayoutContext";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { StatusDot } from "../components/EditStatusIndicator";
import { useStudioLockState } from "@cormoran/zmk-studio-react-hook";
import { useStudioUnlock } from "../hooks/useStudioUnlock";
import { useKeymap, getKeymapLoadingLabel } from "../hooks/useKeymap";
import { useLanguage } from "../hooks/useLanguage";
import { useRuntimeCombo } from "../hooks/useRuntimeCombo";
import { useRuntimeMacro } from "../hooks/useRuntimeMacro";
import { useMemo } from "react";
import { MacroEditorCard } from "../components/macroCombo/MacroEditorCard";
import { ComboEditorCard } from "../components/macroCombo/ComboEditorCard";
import {
  ComboGlobalSettingsCard,
  MacroGlobalSettingsCard,
} from "../components/macroCombo/GlobalSettingsCards";
import {
  comboEditStatus,
  defaultBehaviorBinding,
  formatComboBehavior,
  formatLayerScope,
} from "../components/macroCombo/comboUtils";
import { useComboEditor } from "../components/macroCombo/useComboEditor";
import { useMacroEditor } from "../components/macroCombo/useMacroEditor";
import { DocTip } from "../components/DocTip";
import { ResetVersionMenu } from "../components/versionHistory/ResetVersionMenu";
import { VersionDiffModal } from "../components/versionHistory/VersionDiffModal";
import { useMacroComboVersionHistory } from "../hooks/versionHistory/useMacroComboVersionHistory";
import { macroDoc, comboDoc } from "../i18n/featureDocs";
import type { Combo } from "../hooks/useRuntimeCombo";
import type { MacroSummary } from "../proto/cormoran/runtime_macro/runtime_macro";

/** What the right column currently shows. `null` renders the placeholder
 * (until the macro auto-select picks the first macro, mirroring the old
 * MacroPage behavior). */
type RightView = "macro" | "combo" | "macro-settings" | "combo-settings" | null;

export function MacroComboPage() {
  const { t } = useLanguage();
  const connection = useContext(ConnectionContext);
  const keyboardLayoutContext = useContext(KeyboardLayoutContext);
  const keymap = useKeymap();
  const runtimeMacro = useRuntimeMacro();
  const runtimeCombo = useRuntimeCombo();
  // Proactive lock state: show a lock badge in place of Save/Discard when
  // Studio is locked. Editing is guarded by the shared unlock gate below.
  const { locked } = useStudioLockState();
  // Proactive unlock gate (opens the shared unlock modal); the reactive
  // fail→modal→retry path is handled inside the feature hooks via runWithUnlock.
  const { requireUnlock: requireUnlocked } = useStudioUnlock();
  const [rightView, setRightView] = useState<RightView>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const macroAvailable = runtimeMacro.isAvailable;
  const comboAvailable = runtimeCombo.isAvailable;
  const anyAvailable = macroAvailable || comboAvailable;
  const anyLoading = runtimeMacro.isLoading || runtimeCombo.isLoading;
  const hasPendingChanges =
    runtimeMacro.hasUnsavedChanges || runtimeCombo.hasPendingChanges;

  // Version history capture point. Every macro/combo edit toggles the hooks'
  // `isLoading` too, so "the tab finished reading the keyboard" can't be read
  // off that alone: this flips true once after the first load settles, and the
  // explicit actions below re-capture by hand.
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  // Global settings arrive with the first successful load of each domain, so
  // they are the signal that the domain has actually been read.
  const macroRead = !macroAvailable || runtimeMacro.globalSettings !== null;
  const comboRead = !comboAvailable || runtimeCombo.globalSettings !== null;
  useEffect(() => {
    if (anyAvailable && !anyLoading && macroRead && comboRead) {
      setInitialLoadDone(true);
    }
  }, [anyAvailable, anyLoading, comboRead, macroRead]);

  const versionHistory = useMacroComboVersionHistory({
    runtimeMacro,
    runtimeCombo,
    behaviors: keymap.behaviors,
    isLoaded: initialLoadDone,
    t,
  });

  const layersForSelector = useMemo(() => {
    if (!keymap.keymap?.layers) return [];
    return keymap.keymap.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
    }));
  }, [keymap.keymap?.layers]);

  // Auto-selecting the first macro (old MacroPage behavior) may only claim the
  // right column while nothing else owns it.
  const onMacroAutoSelected = useCallback(() => {
    setRightView((view) => (view === null ? "macro" : view));
  }, []);
  const onComboSelected = useCallback(() => {
    setRightView("combo");
  }, []);

  const macroEditor = useMacroEditor({
    runtimeMacro,
    keymap,
    layers: layersForSelector,
    keyboardLayout: keyboardLayoutContext.layout,
    requireUnlocked,
    t,
    canMaintainSelection: rightView === null || rightView === "macro",
    onAutoSelected: onMacroAutoSelected,
  });

  const comboEditor = useComboEditor({
    runtimeCombo,
    keymap,
    requireUnlocked,
    t,
    onComboSelected,
  });

  // The macro/combo list RPCs require unlock. Proactively open the shared
  // unlock modal whenever this tab is viewed while locked, so the user is
  // prompted up front instead of only when an edit is attempted. The reactive
  // gate additionally parks any failed load and auto-retries it once unlocked.
  useEffect(() => {
    if (locked) requireUnlocked();
  }, [locked, requireUnlocked]);

  // Clear stale errors and reload on the locked -> unlocked transition. A load
  // RPC that failed while the unlock modal was open surfaces an error into
  // `runtimeMacro.error` / `runtimeCombo.error` whenever it was *not* parked and
  // auto-retried — e.g. the user dismissed the modal (or a request landed during
  // the post-cancel cooldown), so `callRpc` set the "device is locked" message.
  // Unlock's `retryAll` only replays parked ops, and the auto-load effects fire
  // once per subsystem, so nothing else clears that error. Reacting to the
  // transition here clears both hooks' errors and refetches so the page reflects
  // the now-unlocked device. (`loadMacros`/`reload` are in-flight-guarded, so
  // this no-ops when a parked op is already being retried.)
  const wasLockedRef = useRef(locked);
  useEffect(() => {
    const wasLocked = wasLockedRef.current;
    wasLockedRef.current = locked;
    if (wasLocked && !locked) {
      runtimeMacro.clearError();
      runtimeCombo.clearError();
      if (macroAvailable) void runtimeMacro.loadMacros();
      if (comboAvailable) void runtimeCombo.reload();
    }
  }, [locked, macroAvailable, comboAvailable, runtimeMacro, runtimeCombo]);

  // --- Selection routing (exclusive across the two lists) ---

  const handleSelectMacro = useCallback(
    (macro: MacroSummary) => {
      comboEditor.clearSelection();
      macroEditor.selectMacro(macro);
      setRightView("macro");
    },
    [comboEditor, macroEditor],
  );

  const handleCreateMacro = useCallback(() => {
    comboEditor.clearSelection();
    setRightView("macro");
    void macroEditor.handleCreateMacro();
  }, [comboEditor, macroEditor]);

  const handleSelectCombo = useCallback(
    (combo: Combo) => {
      macroEditor.clearSelection();
      comboEditor.selectCombo(combo);
    },
    [comboEditor, macroEditor],
  );

  const handleNewCombo = useCallback(() => {
    macroEditor.clearSelection();
    void comboEditor.handleNewCombo();
  }, [comboEditor, macroEditor]);

  const openMacroSettings = useCallback(() => {
    macroEditor.clearSelection();
    comboEditor.clearSelection();
    setRightView("macro-settings");
  }, [comboEditor, macroEditor]);

  const openComboSettings = useCallback(() => {
    macroEditor.clearSelection();
    comboEditor.clearSelection();
    setRightView("combo-settings");
  }, [comboEditor, macroEditor]);

  // --- Unified top-bar actions (both domains at once) ---

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      macroAvailable ? runtimeMacro.loadMacros() : Promise.resolve(),
      comboAvailable ? runtimeCombo.reload() : Promise.resolve(),
    ]);
    // A completed read is exactly when a new version may be worth keeping.
    await versionHistory.capture();
  }, [
    comboAvailable,
    macroAvailable,
    runtimeCombo,
    runtimeMacro,
    versionHistory,
  ]);

  // "Reset to initial state": put every macro and combo slot back to the
  // firmware's compile-time defaults. Both reset RPCs are per-slot, so this
  // walks them; the result is reloaded (and captured) like any other read.
  const handleResetToInitial = useCallback(async () => {
    if (!requireUnlocked()) return;
    if (
      !confirm(
        t(
          "Reset every runtime macro and combo to the firmware defaults? Your customizations will be lost.",
        ),
      )
    ) {
      return;
    }
    setIsResetting(true);
    try {
      if (macroAvailable) {
        for (const macro of [...runtimeMacro.macros]) {
          await runtimeMacro.resetMacro(macro.slot);
        }
      }
      if (comboAvailable) {
        for (const combo of [...runtimeCombo.combos]) {
          await runtimeCombo.resetCombo(combo.index);
        }
      }
      await handleRefresh();
    } finally {
      setIsResetting(false);
    }
  }, [
    comboAvailable,
    handleRefresh,
    macroAvailable,
    requireUnlocked,
    runtimeCombo,
    runtimeMacro,
    t,
  ]);

  const handleSave = useCallback(async () => {
    if (!requireUnlocked()) return;
    setIsSaving(true);
    try {
      // Flush any queued debounced edits so they are part of this persist.
      await macroEditor.flushPendingWrites();
      await comboEditor.flushPendingWrites();
      if (macroAvailable) {
        await runtimeMacro.saveMacros();
        macroEditor.clearGlobalModified();
      }
      if (comboAvailable) {
        const status = await runtimeCombo.saveChanges();
        if (status) {
          comboEditor.clearModified();
          comboEditor.setStatusMessage(
            t("Saved {{count}} runtime combo changes.", {
              count: status.affectedCount,
            }),
          );
        }
      }
      // What is now on the keyboard is worth keeping as a version.
      await versionHistory.capture();
    } finally {
      setIsSaving(false);
    }
  }, [
    comboAvailable,
    comboEditor,
    macroAvailable,
    macroEditor,
    requireUnlocked,
    runtimeCombo,
    runtimeMacro,
    t,
    versionHistory,
  ]);

  const handleDiscard = useCallback(async () => {
    if (!requireUnlocked()) return;
    setIsDiscarding(true);
    try {
      // Drop queued edits — discard restores the persisted values.
      macroEditor.cancelPendingWrites();
      comboEditor.cancelPendingWrites();
      if (macroAvailable) {
        await runtimeMacro.discardMacros();
        macroEditor.clearGlobalModified();
        await macroEditor.reloadLoadedMacro();
      }
      if (comboAvailable) {
        const status = await runtimeCombo.discardChanges();
        if (status) {
          comboEditor.clearModified();
          comboEditor.clearSelection();
          comboEditor.setStatusMessage(
            t("Discarded {{count}} runtime combo changes.", {
              count: status.affectedCount,
            }),
          );
          // A discarded combo selection no longer exists reliably; fall back
          // to the placeholder (the macro auto-select may then take over).
          setRightView((view) => (view === "combo" ? null : view));
        }
      }
      // Memory now mirrors what is stored on the keyboard again.
      await versionHistory.capture();
    } finally {
      setIsDiscarding(false);
    }
  }, [
    comboAvailable,
    comboEditor,
    macroAvailable,
    macroEditor,
    requireUnlocked,
    runtimeCombo,
    runtimeMacro,
    t,
    versionHistory,
  ]);

  const firstError =
    runtimeMacro.error ||
    macroEditor.encodedSizeError ||
    macroEditor.stringConversionError ||
    runtimeCombo.error ||
    keymap.error;

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col tablet:flex-row tablet:items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20">
              <IconWand size={24} className="text-[var(--color-electric)]" />
            </div>
            <div>
              <h1 className="text-xl font-medium text-[var(--color-text)]">
                {t("Macro&Combo")}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("Edit runtime macro and combo slots")}
              </p>
            </div>
          </div>

          {connection.isConnected && anyAvailable && (
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <button
                className="btn-ghost text-sm flex items-center gap-1.5"
                onClick={() => void handleRefresh()}
                disabled={anyLoading}
              >
                <IconRefresh size={16} />
                {t("Refresh")}
              </button>
              {locked ? (
                <button
                  type="button"
                  onClick={() => requireUnlocked()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/20 transition-colors"
                  title={t("Studio is locked — click to unlock")}
                >
                  <IconLock size={16} />
                  {t("Locked")}
                </button>
              ) : (
                <>
                  {hasPendingChanges && (
                    <span className="flex items-center gap-1 text-xs text-[var(--color-neon)] mr-2">
                      <StatusDot status="unsaved" />
                      {t("Unsaved changes")}
                    </span>
                  )}
                  {/* Reset, Discard and every captured version in one menu. */}
                  <ResetVersionMenu
                    versions={versionHistory.versions}
                    onSelectVersion={versionHistory.selectVersion}
                    disabled={anyLoading}
                    isBusy={
                      isDiscarding || isResetting || versionHistory.isBusy
                    }
                    resetToDefault={{
                      description: t(
                        "Puts every macro and combo back to the firmware's compile-time defaults.",
                      ),
                      onSelect: () => void handleResetToInitial(),
                      disabled: isResetting || anyLoading,
                    }}
                    discard={{
                      description: t(
                        "Drops the edits held in keyboard memory and reloads the macros and combos saved on the keyboard.",
                      ),
                      onSelect: () => void handleDiscard(),
                      disabled: isDiscarding || !hasPendingChanges,
                    }}
                  />
                  <button
                    className="btn-electric text-sm flex items-center gap-1.5"
                    onClick={handleSave}
                    disabled={
                      isSaving ||
                      anyLoading ||
                      !hasPendingChanges ||
                      Boolean(macroEditor.encodedSizeError)
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

        {!connection.isConnected && (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("Connect your keyboard to edit runtime macros and combos")}
            </p>
          </div>
        )}

        {connection.isConnected && !macroAvailable && (
          <div className="glass-card p-6 text-center mb-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("Runtime macro subsystem not found. Build firmware with")}{" "}
              <a
                href="https://github.com/cormoran/zmk-feature-runtime-macro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-electric)] underline"
              >
                cormoran/zmk-feature-runtime-macro
              </a>
              .
            </p>
          </div>
        )}

        {connection.isConnected && !comboAvailable && (
          <div className="glass-card p-4 warning-banner border flex items-center gap-3 mb-4">
            <IconAlertTriangle size={24} className="flex-shrink-0" />
            <p className="text-sm">
              {t("Runtime combo subsystem is not available for your keyboard.")}
              <a
                href="https://github.com/cormoran/zmk-feature-runtime-combo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-electric)] underline mx-1"
              >
                cormoran/zmk-feature-runtime-combo
              </a>
              {t("is required in firmware.")}
            </p>
          </div>
        )}

        {firstError && (
          <div className="glass-card p-4 mb-4 border-red-500/20 bg-red-500/10 flex items-center gap-3">
            <IconAlertCircle size={20} className="text-red-400" />
            <p className="text-sm text-red-400">{t(firstError)}</p>
            {runtimeCombo.error && (
              <button
                className="ml-auto text-xs text-red-300 hover:text-red-200"
                onClick={runtimeCombo.clearError}
              >
                {t("Dismiss")}
              </button>
            )}
          </div>
        )}

        {comboEditor.statusMessage && (
          <div className="glass-card p-3 mb-4 border-[var(--color-electric)]/20 bg-[var(--color-electric)]/10">
            <p className="text-sm text-[var(--color-electric)]">
              {comboEditor.statusMessage}
            </p>
          </div>
        )}

        {connection.isConnected &&
          comboAvailable &&
          (runtimeCombo.isLoading || keymap.isLoading) &&
          !keymap.keymap && (
            <LoadingIndicator
              className="mb-6"
              label={
                keymap.isLoading
                  ? getKeymapLoadingLabel(t, keymap.loadingProgress)
                  : t("Loading combo data...")
              }
              current={
                keymap.isLoading ? keymap.loadingProgress?.current : undefined
              }
              total={
                keymap.isLoading ? keymap.loadingProgress?.total : undefined
              }
            />
          )}

        {connection.isConnected && anyAvailable && (
          <div className="grid grid-cols-1 desktop:grid-cols-[300px_1fr] gap-4 min-w-0">
            <div className="space-y-4">
              {/* Macros list */}
              {macroAvailable && (
                <section className="glass-card p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-medium text-[var(--color-text)]">
                        {t("Macros")}
                      </h2>
                      <DocTip content={macroDoc(t)} />
                    </div>
                    <div className="flex items-center gap-1">
                      {runtimeMacro.isLoading && (
                        <IconLoader2
                          size={14}
                          className="animate-spin text-[var(--color-electric)]"
                        />
                      )}
                      <button
                        className="relative p-1 rounded hover:bg-[var(--color-border)] text-[var(--color-electric)] transition-colors"
                        onClick={openMacroSettings}
                        title={t("Macro Global Settings")}
                        aria-label={t("Macro Global Settings")}
                      >
                        <IconSettings size={15} />
                        {macroEditor.globalModifiedFields.size > 0 && (
                          <StatusDot
                            status="unsaved"
                            className="absolute -top-0.5 -right-0.5"
                          />
                        )}
                      </button>
                      <button
                        className="p-1 rounded hover:bg-[var(--color-border)] text-[var(--color-electric)] disabled:opacity-40 transition-colors"
                        onClick={handleCreateMacro}
                        disabled={
                          macroEditor.isCreating || runtimeMacro.isLoading
                        }
                        title={t("Create macro")}
                      >
                        {macroEditor.isCreating ? (
                          <IconLoader2 size={15} className="animate-spin" />
                        ) : (
                          <IconPlus size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {runtimeMacro.macros.length === 0 && (
                      <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                        {t("No macros yet. Create one above.")}
                      </p>
                    )}
                    {runtimeMacro.macros.map((macro) => (
                      <button
                        key={macro.name}
                        className={`w-full px-3 py-2 rounded-lg text-left transition-colors ${
                          rightView === "macro" &&
                          macroEditor.selectedName === macro.name
                            ? "bg-[var(--color-electric)]/20 text-[var(--color-electric)] border border-[var(--color-electric)]/30"
                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                        }`}
                        onClick={() => handleSelectMacro(macro)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="block text-sm font-medium truncate flex-1">
                            {macro.name ||
                              t("Macro {{slot}}", { slot: macro.slot })}
                          </span>
                          {macro.hasUnsavedChanges && (
                            <StatusDot status="unsaved" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Combos list */}
              {comboAvailable && keymap.keymap && (
                <section className="glass-card p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-medium text-[var(--color-text)]">
                        {t("Combos")}
                      </h2>
                      <DocTip content={comboDoc(t)} />
                    </div>
                    <div className="flex items-center gap-1">
                      {runtimeCombo.isLoading && (
                        <IconLoader2
                          size={14}
                          className="animate-spin text-[var(--color-electric)]"
                        />
                      )}
                      <button
                        className="relative p-1 rounded hover:bg-[var(--color-border)] text-[var(--color-electric)] transition-colors"
                        onClick={openComboSettings}
                        title={t("Combo Global Settings")}
                        aria-label={t("Combo Global Settings")}
                      >
                        <IconSettings size={15} />
                        {comboEditor.globalModifiedFields.size > 0 && (
                          <StatusDot
                            status="unsaved"
                            className="absolute -top-0.5 -right-0.5"
                          />
                        )}
                      </button>
                      <button
                        className="p-1 rounded hover:bg-[var(--color-border)] text-[var(--color-electric)] disabled:opacity-40 transition-colors"
                        onClick={handleNewCombo}
                        title={t("New combo")}
                      >
                        <IconPlus size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {runtimeCombo.combos.length === 0 && (
                      <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                        {t("No runtime combos configured")}
                      </p>
                    )}
                    {runtimeCombo.combos.map((combo) => {
                      const binding =
                        combo.behavior ??
                        defaultBehaviorBinding(keymap.behaviors);
                      return (
                        <button
                          key={combo.index}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            rightView === "combo" &&
                            comboEditor.selectedIndex === combo.index
                              ? "bg-[var(--color-electric)]/10 border-[var(--color-electric)]/40"
                              : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-electric)]/40"
                          } ${combo.enabled ? "" : "opacity-60"}`}
                          onClick={() => handleSelectCombo(combo)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-[var(--color-text)] truncate flex-1">
                              {combo.name ||
                                t("Combo {{index}}", {
                                  index: combo.index,
                                })}
                            </span>
                            <span className="flex items-center gap-1.5 shrink-0">
                              <StatusDot
                                status={comboEditStatus(
                                  combo.source,
                                  combo.index,
                                  comboEditor.modifiedIndices,
                                )}
                              />
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-[var(--color-text-muted)] truncate">
                            {combo.keyPositions.join(" + ")} ·{" "}
                            {formatLayerScope(combo.layerMask, t)}
                          </div>
                          <div className="mt-1 text-xs text-[var(--color-text-secondary)] truncate">
                            {formatComboBehavior(
                              binding,
                              keymap.behaviors,
                              layersForSelector,
                              keyboardLayoutContext.layout,
                              runtimeMacro.macros,
                              t,
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            <div className="min-w-0">
              {rightView === "macro" && macroAvailable ? (
                <MacroEditorCard
                  macro={macroEditor}
                  runtimeMacro={runtimeMacro}
                  keymap={keymap}
                  layers={layersForSelector}
                  keyboardLayout={keyboardLayoutContext.layout}
                />
              ) : rightView === "combo" &&
                comboAvailable &&
                keymap.keymap &&
                comboEditor.selectedIndex !== null ? (
                <ComboEditorCard
                  combo={comboEditor}
                  runtimeCombo={runtimeCombo}
                  keymap={keymap}
                  layers={layersForSelector}
                  keyboardLayout={keyboardLayoutContext.layout}
                  runtimeMacros={runtimeMacro.macros}
                />
              ) : rightView === "macro-settings" && macroAvailable ? (
                <MacroGlobalSettingsCard
                  macro={macroEditor}
                  runtimeMacro={runtimeMacro}
                />
              ) : rightView === "combo-settings" && comboAvailable ? (
                <ComboGlobalSettingsCard
                  combo={comboEditor}
                  runtimeCombo={runtimeCombo}
                />
              ) : (
                <section className="glass-card p-6 flex items-center justify-center min-h-[320px] text-center">
                  <div>
                    <IconWand
                      size={28}
                      className="mx-auto mb-3 text-[var(--color-electric)]"
                    />
                    <h2 className="text-sm font-medium text-[var(--color-text)]">
                      {t("Select a macro or combo")}
                    </h2>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      {t("Choose an item from the lists on the left.")}
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Restore-a-version diff modal (opened from the reset dropdown) */}
      <VersionDiffModal
        {...versionHistory.diffModalProps}
        labeler={versionHistory.labeler}
      />
    </div>
  );
}
