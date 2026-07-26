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
import { useCallback, useEffect, useState } from "react";
import type {
  AbyssKeymapData,
  AbyssKeymapSummary,
  AbyssKeymapWriteResult,
  AbyssLayoutDefinition,
  AbyssLayoutResolveResult,
} from "@keyboard-hub/abyss-client";
import type { ZmkLoadedConnection } from "@keyboard-hub/adapter-zmk";
import { getAbyssClient } from "../lib/abyss/abyssClient";
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
  selectedKeymapId: string | null;
  setSelectedKeymapId: (id: string | null) => void;
  /** Name for a new keymap. Ignored when updating. */
  name: string;
  setName: (name: string) => void;
  selection: AbyssSectionSelection;
  setSelection: (selection: AbyssSectionSelection) => void;
  isExporting: boolean;
  error: string | null;
  /** Set after a successful upload, so the UI can link to the result. */
  result: AbyssKeymapWriteResult | null;
  /** Whether the button should be enabled. */
  canExport: boolean;
  exportNow: () => Promise<void>;
}

/** `2026-07-26` — a stable default name suffix. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useAbyssExport(
  loaded: ZmkLoadedConnection | null,
  resolved: AbyssLayoutResolveResult | null,
): UseAbyssExportReturn {
  const [mode, setMode] = useState<AbyssExportMode>("new");
  const [keymaps, setKeymaps] = useState<AbyssKeymapSummary[]>([]);
  const [isLoadingKeymaps, setIsLoadingKeymaps] = useState(false);
  const [selectedKeymapId, setSelectedKeymapId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selection, setSelection] =
    useState<AbyssSectionSelection>(ALL_SECTIONS);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AbyssKeymapWriteResult | null>(null);

  const deviceName = loaded?.deviceName;
  const keyboard = loaded?.state.currentKeymap.keyboard;

  // Seed the new-keymap name once a device has been read.
  useEffect(() => {
    if (deviceName) setName(`${deviceName} — ${today()}`);
  }, [deviceName]);

  // Load the user's existing keymaps for this keyboard so "update" has options.
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
          visibility: "private",
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
          visibility: "private",
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
  }, [loaded, mode, keymaps, selectedKeymapId, selection, resolved, name]);

  return {
    mode,
    setMode,
    keymaps,
    isLoadingKeymaps,
    selectedKeymapId,
    setSelectedKeymapId,
    name,
    setName,
    selection,
    setSelection,
    isExporting,
    error,
    result,
    canExport,
    exportNow,
  };
}
