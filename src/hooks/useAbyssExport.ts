/**
 * Uploads the device snapshot to Keyboard Abyss, either as a new keymap or as a
 * new version of one the user already owns.
 *
 * Which API call is right depends on how the connected layout resolved against
 * the Abyss catalog:
 *
 * - exact layout match → `createKeymap` / `updateKeymap` against that variation
 * - compatible layout only, or an unregistered keyboard → `importKeymap`, which
 *   is documented to create the catalog records it needs
 *
 * Exports are non-destructive on both sides: Abyss keeps version history, and
 * nothing is written to the keyboard.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AbyssKeymapData,
  AbyssKeymapSummary,
  AbyssKeymapVisibility,
  AbyssKeymapWriteResult,
  AbyssLayoutDefinition,
  AbyssLayoutResolveResult,
} from "@keyboard-hub/abyss-client";
import type { ZmkLoadedConnection } from "@keyboard-hub/adapter-zmk";
import { compareKeyboardHubKeymaps } from "@keyboard-hub/adapter-common";
import { getAbyssClient } from "../lib/abyss/abyssClient";
import { EMPTY_DIFF, type KeymapDiff } from "../lib/abyss/abyssDiff";
import { listCandidateKeymaps } from "../lib/abyss/abyssKeymapList";
import {
  ALL_SECTIONS,
  buildExportData,
  buildNewExportData,
  selectedSectionIds,
  type AbyssSectionSelection,
  type KeymapDocument,
} from "../lib/abyss/abyssExportPayload";
import {
  abyssErrorMessageKey,
  classifyAbyssError,
  isAbyssUnauthorized,
} from "../lib/abyss/abyssErrors";
import { trackAbyssFailed, trackAbyssOperation } from "../lib/analytics";

/** Whether the upload creates a keymap or appends a version to one. */
export type AbyssExportMode = "new" | "update";

export interface UseAbyssExportReturn {
  mode: AbyssExportMode;
  setMode: (mode: AbyssExportMode) => void;
  /** Existing keymaps for this keyboard, for the "update" dropdown. */
  keymaps: AbyssKeymapSummary[];
  isLoadingKeymaps: boolean;
  /** Why the keymap list is empty, when it failed rather than being empty. */
  listError: string | null;
  selectedKeymapId: string | null;
  setSelectedKeymapId: (id: string | null) => void;
  /** Name for a new keymap. Ignored when updating. */
  name: string;
  setName: (name: string) => void;
  /** Who can see a new keymap on Abyss. Ignored when updating, since that
   * appends a version rather than changing the record's metadata. */
  visibility: AbyssKeymapVisibility;
  setVisibility: (visibility: AbyssKeymapVisibility) => void;
  selection: AbyssSectionSelection;
  setSelection: (selection: AbyssSectionSelection) => void;
  isExporting: boolean;
  error: string | null;
  /** Set after a successful upload, so the UI can link to the result. */
  result: AbyssKeymapWriteResult | null;
  /** Whether the button should be enabled. */
  canExport: boolean;
  exportNow: () => Promise<void>;
  /** The exact JSON that would be uploaded, for the preview panes. */
  preview: { keymap: unknown; layout: unknown } | null;
  /** What the upload would change on Abyss, for the visual preview. */
  diff: KeymapDiff;
  /** The selected keymap's current document on Abyss. */
  selectedExistingData: unknown;
}

/** Most recently updated keymap, or the first when timestamps are absent. */
function latestKeymapId(items: AbyssKeymapSummary[]): string | null {
  if (items.length === 0) return null;
  const sorted = [...items].sort((left, right) =>
    (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""),
  );
  return sorted[0].id;
}

/** `2026-07-26` — a stable default name suffix. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useAbyssExport(
  loaded: ZmkLoadedConnection | null,
  resolved: AbyssLayoutResolveResult | null,
): UseAbyssExportReturn {
  // Updating is the common case once a keymap exists on Abyss; creating a new
  // one every save would litter the account with near-duplicates.
  const [mode, setMode] = useState<AbyssExportMode>("update");
  const [keymaps, setKeymaps] = useState<AbyssKeymapSummary[]>([]);
  const [isLoadingKeymaps, setIsLoadingKeymaps] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedKeymapId, setSelectedKeymapId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [visibility, setVisibility] =
    useState<AbyssKeymapVisibility>("private");
  const [selection, setSelection] =
    useState<AbyssSectionSelection>(ALL_SECTIONS);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AbyssKeymapWriteResult | null>(null);

  const deviceName = loaded?.deviceName;
  // A boolean, not `loaded` itself: the effect below must not re-run on every
  // render just because a caller passed a fresh object.
  const hasDevice = Boolean(loaded);

  // Seed the new-keymap name once a device has been read.
  useEffect(() => {
    if (deviceName) setName(`${deviceName} — ${today()}`);
  }, [deviceName]);

  // Load the user's existing keymaps so "update" has options.
  useEffect(() => {
    const client = getAbyssClient();
    if (!client || !hasDevice) return;
    let cancelled = false;
    setIsLoadingKeymaps(true);
    setListError(null);
    void (async () => {
      try {
        const result = await listCandidateKeymaps(client, {
          layoutId: resolved?.layout?.id,
        });
        if (!cancelled) {
          setKeymaps(result.items);
          // Preselect the most recently updated one: with "update" as the
          // default mode, an empty picker would make the primary action
          // unavailable until the user works out what to choose.
          setSelectedKeymapId(
            (current) => current ?? latestKeymapId(result.items),
          );
        }
      } catch (caught) {
        if (isAbyssUnauthorized(caught)) client.clearTokenSet();
        if (!cancelled) {
          setKeymaps([]);
          // Without this a failed request is indistinguishable from an empty
          // account, which is exactly how the earlier slug bug hid itself.
          setListError(abyssErrorMessageKey(caught));
        }
      } finally {
        if (!cancelled) setIsLoadingKeymaps(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasDevice, resolved?.layout?.id]);

  /** The selected keymap's document on Abyss, i.e. the merge base. */
  const selectedExistingData = useMemo(() => {
    const existing = keymaps.find((keymap) => keymap.id === selectedKeymapId);
    return (existing?.data ??
      existing?.latestVersion?.data ??
      null) as KeymapDocument | null;
  }, [keymaps, selectedKeymapId]);

  /**
   * The document that `exportNow` would upload, built with the same functions
   * so the preview cannot drift from what is actually sent.
   *
   * For an update this needs the existing keymap's data as the merge base; list
   * summaries usually carry it, and when they do not the preview falls back to
   * the new-keymap shape rather than guessing at the merge.
   */
  const preview = useMemo(() => {
    if (!loaded) return null;
    const device = loaded.state.currentKeymap as unknown as KeymapDocument;
    const layout = loaded.state.detectedLayout ?? null;
    if (mode === "update") {
      if (!selectedExistingData) return { keymap: null, layout };
      return {
        keymap: buildExportData(device, selectedExistingData, selection),
        layout,
      };
    }
    return {
      keymap: buildNewExportData(device, selection, name.trim()),
      layout,
    };
  }, [loaded, mode, selectedExistingData, selection, name]);

  /**
   * What the upload would change on Abyss, for the visual preview.
   *
   * Argument order is (target, current): the payload is the target, the keymap
   * already on Abyss is current, so `to` is the value that would be saved.
   */
  const diff = useMemo<KeymapDiff>(() => {
    const base = selectedExistingData;
    if (mode !== "update" || !base || !preview?.keymap) return EMPTY_DIFF;
    return compareKeyboardHubKeymaps(
      preview.keymap as never,
      base as never,
    ) as unknown as KeymapDiff;
  }, [mode, preview, selectedExistingData]);

  const canExport = Boolean(
    loaded &&
    !isExporting &&
    (mode === "new" ? name.trim().length > 0 : selectedKeymapId),
  );

  const exportNow = useCallback(async () => {
    const client = getAbyssClient();
    if (!client || !loaded) return;
    setIsExporting(true);
    setError(null);
    setResult(null);

    const device = loaded.state.currentKeymap as unknown as KeymapDocument;
    // The layout the device reported, sent alongside the data so Abyss can
    // create or match the variation. Typed differently by the two packages for
    // the same JSON; see useAbyssDevice for why the cast is safe.
    const layout = loaded.state.detectedLayout as unknown as
      | AbyssLayoutDefinition
      | undefined;

    try {
      let written: AbyssKeymapWriteResult;
      if (mode === "update") {
        const existing = keymaps.find(
          (keymap) => keymap.id === selectedKeymapId,
        );
        const base = (existing?.data ??
          existing?.latestVersion?.data ??
          // A summary without data means we only know its metadata; fall back
          // to fetching the full record rather than uploading a partial merge.
          (await client.getKeymap(selectedKeymapId!)).data) as
          | KeymapDocument
          | undefined;
        if (!base) throw new Error("Keymap data unavailable");
        written = await client.updateKeymap(selectedKeymapId!, {
          data: buildExportData(device, base, selection) as AbyssKeymapData,
          layoutVariationId: resolved?.layout?.variation.id,
          layoutVersionId: resolved?.layout?.latestVersion.id,
          layout,
          message: `Saved from DYA Studio (${selectedSectionIds(selection)})`,
        });
      } else if (resolved?.layout) {
        written = await client.createKeymap(resolved.layout.variation.id, {
          data: buildNewExportData(
            device,
            selection,
            name.trim(),
          ) as AbyssKeymapData,
          name: name.trim(),
          visibility,
          layout,
          message: "Created from DYA Studio",
        });
      } else {
        // No exact variation, or the keyboard is not in the catalog at all.
        // importKeymap creates the records it needs.
        written = await client.importKeymap({
          data: buildNewExportData(
            device,
            selection,
            name.trim(),
          ) as AbyssKeymapData,
          name: name.trim(),
          visibility,
          layout,
          message: "Imported from DYA Studio",
        });
      }
      setResult(written);
      trackAbyssOperation("export", {
        mode,
        sections: selectedSectionIds(selection),
      });
    } catch (caught) {
      if (isAbyssUnauthorized(caught)) getAbyssClient()?.clearTokenSet();
      trackAbyssFailed("export", classifyAbyssError(caught));
      setError(abyssErrorMessageKey(caught));
    } finally {
      setIsExporting(false);
    }
  }, [
    loaded,
    mode,
    keymaps,
    selectedKeymapId,
    selection,
    resolved,
    name,
    visibility,
  ]);

  return {
    mode,
    setMode,
    keymaps,
    isLoadingKeymaps,
    listError,
    selectedKeymapId,
    setSelectedKeymapId,
    name,
    setName,
    visibility,
    setVisibility,
    selection,
    setSelection,
    isExporting,
    error,
    result,
    canExport,
    exportNow,
    preview,
    diff,
    selectedExistingData,
  };
}
