/**
 * Controller state for the runtime-combo half of the Macro&Combo page:
 * selection, the combo draft, debounced memory writes and the combo global
 * settings. Extracted from the former ComboPage.
 */
import { useCallback, useMemo, useState } from "react";
import { useDebouncedMemoryWrite } from "../../hooks/useDebouncedMemoryWrite";
import type { UseRuntimeComboReturn } from "../../hooks/useRuntimeCombo";
import type { UseKeymapReturn } from "../../hooks/useKeymap";
import type { Combo } from "../../hooks/useRuntimeCombo";
import type { TranslationParams } from "../../i18n/translations";
import {
  comboToDraft,
  createDraft,
  defaultBehaviorBinding,
  normalizePositions,
  validateCombo,
  DEFAULT_COMBO_KEYCODE,
  DEFAULT_COMBO_POSITIONS,
  type ComboDraft,
} from "./comboUtils";

type TranslateFn = (key: string, params?: TranslationParams) => string;

/** Global-setting field keys tracked for the pending-change (green) dots. */
export type ComboGlobalField =
  | "timeoutMs"
  | "slowRelease"
  | "requirePriorIdleMs";

export interface UseComboEditorArgs {
  runtimeCombo: UseRuntimeComboReturn;
  keymap: UseKeymapReturn;
  requireUnlocked: () => boolean;
  t: TranslateFn;
  /** Called whenever a combo becomes the selected item so the page can switch
   * the right column to the combo editor. */
  onComboSelected: () => void;
}

export function useComboEditor({
  runtimeCombo,
  keymap,
  requireUnlocked,
  t,
  onComboSelected,
}: UseComboEditorArgs) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<ComboDraft>(() =>
    createDraft([], undefined, new Map()),
  );
  const [showBehaviorSelector, setShowBehaviorSelector] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  // Client-side green tracking: the proto carries no per-combo "unsaved" flag,
  // so we mark a slot whenever a field auto-writes to memory and clear the set
  // on the global Save/Discard.
  const [modifiedIndices, setModifiedIndices] = useState<Set<number>>(
    new Set(),
  );
  // Global settings likewise have no per-value unsaved flag; track green with
  // a client-side set of modified field keys, cleared on Save/Discard.
  const [globalModifiedFields, setGlobalModifiedFields] = useState<
    Set<ComboGlobalField>
  >(new Set());

  const maxCombo = runtimeCombo.globalSettings?.maxCombo;

  const highlightedKeys = useMemo(
    () => new Set(draft.keyPositions),
    [draft.keyPositions],
  );

  // Writer for the debounced auto-write: pushes the whole draft to keyboard
  // MEMORY (persist=false) and marks the slot green. `setCombo` refreshes the
  // combo list from the device (which derives `source`), then the name is
  // written on top.
  const writeComboToMemory = useCallback(
    async (next: ComboDraft) => {
      const comboSaved = await runtimeCombo.setCombo({
        index: next.index,
        keyPositions: next.keyPositions,
        behavior: next.behavior,
        layerMask: next.layerMask,
        enabled: next.enabled,
        timeoutMs: next.timeoutMs,
        requirePriorIdleMs: next.requirePriorIdleMs,
        slowReleaseOverride: next.slowReleaseOverride,
      });
      if (!comboSaved) return;
      await runtimeCombo.setComboName(next.index, next.name);
      setModifiedIndices((prev) => new Set(prev).add(next.index));
    },
    [runtimeCombo],
  );

  const comboMemoryWrite = useDebouncedMemoryWrite(writeComboToMemory);

  const globalTimeoutWrite = useDebouncedMemoryWrite<number>(
    useCallback(
      async (timeoutMs: number) => {
        if (timeoutMs < 1 || timeoutMs > 65535) return;
        const ok = await runtimeCombo.setTimeoutMs(timeoutMs);
        if (ok) {
          setGlobalModifiedFields((prev) => new Set(prev).add("timeoutMs"));
        }
      },
      [runtimeCombo],
    ),
  );

  const globalIdleWrite = useDebouncedMemoryWrite<number>(
    useCallback(
      async (requirePriorIdleMs: number) => {
        if (requirePriorIdleMs < 0 || requirePriorIdleMs > 65535) return;
        const ok = await runtimeCombo.setRequirePriorIdleMs(requirePriorIdleMs);
        if (ok) {
          setGlobalModifiedFields((prev) =>
            new Set(prev).add("requirePriorIdleMs"),
          );
        }
      },
      [runtimeCombo],
    ),
  );

  const handleSlowReleaseChange = useCallback(
    (slowRelease: boolean) => {
      if (!requireUnlocked()) return;
      void runtimeCombo.setSlowRelease(slowRelease).then((ok) => {
        if (ok) {
          setGlobalModifiedFields((prev) => new Set(prev).add("slowRelease"));
        }
      });
    },
    [requireUnlocked, runtimeCombo],
  );

  const handleTimeoutMsChange = useCallback(
    (value: string) => {
      if (!requireUnlocked()) return;
      globalTimeoutWrite.queue(Number(value));
    },
    [globalTimeoutWrite, requireUnlocked],
  );

  const handleRequirePriorIdleMsChange = useCallback(
    (value: string) => {
      if (!requireUnlocked()) return;
      globalIdleWrite.queue(Number(value));
    },
    [globalIdleWrite, requireUnlocked],
  );

  const selectDraft = useCallback(
    (nextDraft: ComboDraft) => {
      // Flush any pending write for the previously edited slot before switching
      // (the queued value carries its own index, so it targets the right slot).
      void comboMemoryWrite.flush();
      setSelectedIndex(nextDraft.index);
      setDraft(nextDraft);
      setStatusMessage(null);
      onComboSelected();
    },
    [comboMemoryWrite, onComboSelected],
  );

  /** Explicit list-click selection. */
  const selectCombo = useCallback(
    (combo: Combo) => {
      selectDraft(comboToDraft(combo, keymap.behaviors));
    },
    [keymap.behaviors, selectDraft],
  );

  /** Drop the combo selection (e.g. when a macro takes the right column). */
  const clearSelection = useCallback(() => {
    // Keep the queued write (it carries its own slot index) but close the
    // editor-local UI state.
    void comboMemoryWrite.flush();
    setSelectedIndex(null);
    setShowBehaviorSelector(false);
  }, [comboMemoryWrite]);

  // Single entry point for every per-combo field edit: update the local draft
  // (keeping inputs responsive) and, when the draft is valid, auto-write it to
  // memory. Discrete controls pass `immediate` to write without the debounce.
  const applyDraftChange = useCallback(
    (next: ComboDraft, immediate = false) => {
      if (!requireUnlocked()) return;
      setDraft(next);
      setStatusMessage(null);
      if (validateCombo(next, maxCombo, t)) {
        // Invalid drafts are shown (with the error banner) but never written.
        return;
      }
      // Optimistic green so the dot reacts immediately, before the debounce.
      setModifiedIndices((prev) => new Set(prev).add(next.index));
      comboMemoryWrite.queue(next);
      if (immediate) {
        void comboMemoryWrite.flush();
      }
    },
    [comboMemoryWrite, maxCombo, requireUnlocked, t],
  );

  const handleNewCombo = useCallback(async () => {
    if (!requireUnlocked()) return false;
    const slotLimit = maxCombo && maxCombo > 0 ? maxCombo : 16;
    if (runtimeCombo.combos.length >= slotLimit) {
      setStatusMessage(t("No available combo slots."));
      return false;
    }
    const base = createDraft(runtimeCombo.combos, maxCombo, keymap.behaviors);
    const newCombo: ComboDraft = {
      ...base,
      name: t("Combo {{index}}", { index: base.index }),
      keyPositions: [...DEFAULT_COMBO_POSITIONS],
      behavior: {
        ...defaultBehaviorBinding(keymap.behaviors),
        param1: DEFAULT_COMBO_KEYCODE,
      },
    };
    setStatusMessage(null);
    const comboSaved = await runtimeCombo.setCombo({
      index: newCombo.index,
      keyPositions: newCombo.keyPositions,
      behavior: newCombo.behavior,
      layerMask: newCombo.layerMask,
      enabled: newCombo.enabled,
      timeoutMs: newCombo.timeoutMs,
      requirePriorIdleMs: newCombo.requirePriorIdleMs,
      slowReleaseOverride: newCombo.slowReleaseOverride,
    });
    if (!comboSaved) return false;
    if (!(await runtimeCombo.setComboName(newCombo.index, newCombo.name)))
      return false;
    setModifiedIndices((prev) => new Set(prev).add(newCombo.index));
    selectDraft(newCombo);
    return true;
  }, [
    keymap.behaviors,
    maxCombo,
    runtimeCombo,
    selectDraft,
    requireUnlocked,
    t,
  ]);

  const handlePositionToggle = useCallback(
    (position: number) => {
      const nextPositions = draft.keyPositions.includes(position)
        ? draft.keyPositions.filter((item) => item !== position)
        : normalizePositions([...draft.keyPositions, position]);
      applyDraftChange({ ...draft, keyPositions: nextPositions }, true);
    },
    [applyDraftChange, draft],
  );

  const validationError = useMemo(
    () => validateCombo(draft, maxCombo, t),
    [draft, maxCombo, t],
  );

  const handleDeleteCombo = useCallback(async () => {
    if (!requireUnlocked()) return;
    comboMemoryWrite.cancel();
    const deleted = await runtimeCombo.deleteCombo(draft.index);
    if (deleted) {
      const remaining = runtimeCombo.combos.filter(
        (combo) => combo.index !== draft.index,
      );
      const nextDraft = remaining.at(0)
        ? comboToDraft(remaining[0], keymap.behaviors)
        : createDraft(remaining, maxCombo, keymap.behaviors);
      setModifiedIndices((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(draft.index);
        return nextSet;
      });
      selectDraft(nextDraft);
    }
  }, [
    comboMemoryWrite,
    draft.index,
    keymap.behaviors,
    maxCombo,
    runtimeCombo,
    selectDraft,
    requireUnlocked,
  ]);

  const handleResetCombo = useCallback(async () => {
    if (!requireUnlocked()) return;
    comboMemoryWrite.cancel();
    const resetIndex = draft.index;
    const reset = await runtimeCombo.resetCombo(resetIndex);
    if (reset) {
      const updated = runtimeCombo.combos.find(
        (combo) => combo.index === resetIndex,
      );
      const nextDraft = updated
        ? comboToDraft(updated, keymap.behaviors)
        : createDraft(runtimeCombo.combos, maxCombo, keymap.behaviors);
      // Reset clears any local unsaved marker for the slot; the device now
      // reports its source (default/empty), which drives the dot.
      setModifiedIndices((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(resetIndex);
        return nextSet;
      });
      selectDraft(nextDraft);
    }
  }, [
    comboMemoryWrite,
    draft.index,
    keymap.behaviors,
    maxCombo,
    runtimeCombo,
    selectDraft,
    requireUnlocked,
  ]);

  const selectedCombo = useMemo(
    () =>
      runtimeCombo.combos.find((combo) => combo.index === draft.index) ?? null,
    [runtimeCombo.combos, draft.index],
  );
  const selectedComboExists = selectedCombo !== null;
  const editorSource = selectedCombo?.source ?? draft.source;

  // --- Integration points for the page-level unified Save/Discard bar ---

  /** Persist any still-queued edits to memory before a memory→flash flush. */
  const flushPendingWrites = useCallback(async () => {
    await comboMemoryWrite.flush();
    await globalTimeoutWrite.flush();
    await globalIdleWrite.flush();
  }, [comboMemoryWrite, globalIdleWrite, globalTimeoutWrite]);

  /** Drop queued edits — discard restores the persisted values. */
  const cancelPendingWrites = useCallback(() => {
    comboMemoryWrite.cancel();
    globalTimeoutWrite.cancel();
    globalIdleWrite.cancel();
  }, [comboMemoryWrite, globalIdleWrite, globalTimeoutWrite]);

  /** Clear client-side green tracking after a Save/Discard completed. */
  const clearModified = useCallback(() => {
    setModifiedIndices(new Set());
    setGlobalModifiedFields(new Set());
  }, []);

  return {
    selectedIndex,
    draft,
    showBehaviorSelector,
    setShowBehaviorSelector,
    statusMessage,
    setStatusMessage,
    isAdvancedExpanded,
    setIsAdvancedExpanded,
    modifiedIndices,
    globalModifiedFields,
    maxCombo,
    highlightedKeys,
    validationError,
    selectedCombo,
    selectedComboExists,
    editorSource,
    selectCombo,
    clearSelection,
    applyDraftChange,
    handleNewCombo,
    handlePositionToggle,
    handleDeleteCombo,
    handleResetCombo,
    handleSlowReleaseChange,
    handleTimeoutMsChange,
    handleRequirePriorIdleMsChange,
    flushPendingWrites,
    cancelPendingWrites,
    clearModified,
  };
}

export type ComboEditorController = ReturnType<typeof useComboEditor>;
