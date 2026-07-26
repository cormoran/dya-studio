/**
 * Writes a Keyboard Abyss keymap onto the connected keyboard.
 *
 * This is the only part of the tab that changes the device, so it is
 * deliberately stepwise: list → select → diff → pre-flight → explicit confirm.
 * The adapter applies changes one RPC at a time and commits with `saveChanges`
 * at the end, so a failure partway leaves the keyboard in a mixed state — which
 * is why mismatches are caught before the write rather than during it.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { compareKeyboardHubKeymaps } from "@keyboard-hub/adapter-common";
import { writeZmkKeymapDiff } from "@keyboard-hub/adapter-zmk";
import type { AbyssKeymapSummary } from "@keyboard-hub/abyss-client";
import { getAbyssClient } from "../lib/abyss/abyssClient";
import { useStudioUnlock } from "./useStudioUnlock";
import {
  EMPTY_DIFF,
  filterDiff,
  isEmptyDiff,
  type KeymapDiff,
} from "../lib/abyss/abyssDiff";
import { runPreflight, isBlocked } from "../lib/abyss/abyssPreflight";
import {
  ALL_SECTIONS,
  selectedSectionIds,
  type AbyssSectionSelection,
  type KeymapDocument,
} from "../lib/abyss/abyssExportPayload";
import {
  abyssErrorMessageKey,
  classifyAbyssError,
  isAbyssUnauthorized,
} from "../lib/abyss/abyssErrors";
import { studioLockErrorText } from "../lib/studioUnlock";
import { trackAbyssFailed, trackAbyssOperation } from "../lib/analytics";
import type { UseAbyssDeviceReturn } from "./useAbyssDevice";

/** Widest layer in a keymap, which is what "key count" means for compatibility. */
function keyCountOf(keymap: KeymapDocument | undefined): number {
  if (!keymap?.layers.length) return 0;
  return Math.max(...keymap.layers.map((layer) => layer.bindings.length));
}

export interface UseAbyssImportReturn {
  keymaps: AbyssKeymapSummary[];
  isLoadingKeymaps: boolean;
  selectedKeymapId: string | null;
  /** Selecting fetches the keymap's data and recomputes the diff. */
  selectKeymap: (id: string | null) => Promise<void>;
  isLoadingSelection: boolean;
  selection: AbyssSectionSelection;
  setSelection: (selection: AbyssSectionSelection) => void;
  /** The diff after the section filter, i.e. exactly what would be written. */
  diff: KeymapDiff;
  isInSync: boolean;
  preflight: ReturnType<typeof runPreflight>;
  canWrite: boolean;
  isWriting: boolean;
  /** True once a write finished and the re-read confirmed an empty diff. */
  didWrite: boolean;
  error: string | null;
  write: () => Promise<void>;
}

export function useAbyssImport(
  device: UseAbyssDeviceReturn,
): UseAbyssImportReturn {
  const { loaded, resolved, read } = device;
  const { runWithUnlock } = useStudioUnlock();
  const [keymaps, setKeymaps] = useState<AbyssKeymapSummary[]>([]);
  const [isLoadingKeymaps, setIsLoadingKeymaps] = useState(false);
  const [selectedKeymapId, setSelectedKeymapId] = useState<string | null>(null);
  const [targetKeymap, setTargetKeymap] = useState<KeymapDocument | null>(null);
  const [isLoadingSelection, setIsLoadingSelection] = useState(false);
  const [selection, setSelection] =
    useState<AbyssSectionSelection>(ALL_SECTIONS);
  const [isWriting, setIsWriting] = useState(false);
  const [didWrite, setDidWrite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentKeymap = loaded?.state.currentKeymap as
    | KeymapDocument
    | undefined;
  const keyboard = currentKeymap?.keyboard;

  // Only keymaps for this keyboard and layout variation are candidates.
  useEffect(() => {
    const client = getAbyssClient();
    if (!client || !keyboard) return;
    let cancelled = false;
    setIsLoadingKeymaps(true);
    void (async () => {
      try {
        const page = await client.listMyKeymaps({
          visibility: "all",
          keyboard,
          layoutId: resolved?.layout?.id,
          layoutVariationId: resolved?.layout?.variation.id,
          page: 1,
          limit: 50,
        });
        if (!cancelled) setKeymaps(page.items);
      } catch (caught) {
        if (isAbyssUnauthorized(caught)) client.clearTokenSet();
        if (!cancelled) setKeymaps([]);
      } finally {
        if (!cancelled) setIsLoadingKeymaps(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [keyboard, resolved?.layout?.id, resolved?.layout?.variation.id]);

  const selectKeymap = useCallback(
    async (id: string | null) => {
      setSelectedKeymapId(id);
      setTargetKeymap(null);
      setDidWrite(false);
      setError(null);
      if (!id) return;
      const client = getAbyssClient();
      if (!client) return;
      setIsLoadingSelection(true);
      try {
        const summary = keymaps.find((keymap) => keymap.id === id);
        // List summaries may omit the payload; fetch the full record rather
        // than diffing against a partial one.
        const data =
          summary?.data ??
          summary?.latestVersion?.data ??
          (await client.getKeymap(id)).data;
        setTargetKeymap((data ?? null) as KeymapDocument | null);
      } catch (caught) {
        if (isAbyssUnauthorized(caught)) client.clearTokenSet();
        setError(abyssErrorMessageKey(caught));
      } finally {
        setIsLoadingSelection(false);
      }
    },
    [keymaps],
  );

  // Argument order is (target, current): what Abyss has versus what the device
  // has, so `to` is the value that would be written.
  const fullDiff = useMemo<KeymapDiff>(() => {
    if (!targetKeymap || !currentKeymap) return EMPTY_DIFF;
    return compareKeyboardHubKeymaps(
      targetKeymap as never,
      currentKeymap as never,
    ) as unknown as KeymapDiff;
  }, [targetKeymap, currentKeymap]);

  const diff = useMemo(
    () => filterDiff(fullDiff, selection),
    [fullDiff, selection],
  );

  const preflight = useMemo(() => {
    if (!targetKeymap || !currentKeymap) return [];
    return runPreflight({
      diff,
      deviceKeyCount: keyCountOf(currentKeymap),
      targetKeyCount: keyCountOf(targetKeymap),
      deviceLayerCount: currentKeymap.layers.length,
      deviceLayoutName: loaded?.state.detectedLayout?.name,
      targetLayoutName: keymaps.find((keymap) => keymap.id === selectedKeymapId)
        ?.layout?.name,
    });
  }, [diff, targetKeymap, currentKeymap, loaded, keymaps, selectedKeymapId]);

  const isInSync = Boolean(targetKeymap) && isEmptyDiff(diff);
  const canWrite = Boolean(
    loaded &&
    targetKeymap &&
    !isEmptyDiff(diff) &&
    !isBlocked(preflight) &&
    !isWriting,
  );

  const write = useCallback(async () => {
    if (!loaded) return;
    setIsWriting(true);
    setError(null);
    try {
      // A locked device throws before anything is written, so the unlock gate
      // can park the whole write and retry it once the user unlocks.
      await runWithUnlock(() => writeZmkKeymapDiff(loaded, diff as never));
      trackAbyssOperation("import", {
        sections: selectedSectionIds(selection),
      });
      // Re-read so the shown state is what the keyboard actually accepted, not
      // what we hoped it would.
      await read();
      setDidWrite(true);
    } catch (caught) {
      trackAbyssFailed("import", classifyAbyssError(caught));
      setError(studioLockErrorText(caught) ?? abyssErrorMessageKey(caught));
    } finally {
      setIsWriting(false);
    }
  }, [loaded, diff, selection, runWithUnlock, read]);

  return {
    keymaps,
    isLoadingKeymaps,
    selectedKeymapId,
    selectKeymap,
    isLoadingSelection,
    selection,
    setSelection,
    diff,
    isInSync,
    preflight,
    canWrite,
    isWriting,
    didWrite,
    error,
    write,
  };
}
