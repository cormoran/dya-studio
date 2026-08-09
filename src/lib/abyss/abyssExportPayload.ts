/**
 * Builds the KeyboardHub JSON uploaded to Abyss from the device snapshot and
 * the user's section selection.
 *
 * Written here rather than using adapter-common's
 * `applyKeyboardHubKeymapSelection` for two reasons: that helper unconditionally
 * overwrites `keyboard`, `name` and `description` from the device side, which
 * would silently rename the user's Abyss keymap to the device name on every
 * update; and keeping this pure and local means it is unit-testable, which the
 * ESM-only adapter packages are not under the CommonJS test runtime.
 */

/** Which parts of the keymap the user chose to upload. */
export interface AbyssSectionSelection {
  /** Layer names and key bindings. */
  keymap: boolean;
  combos: boolean;
  macros: boolean;
  /** Global and per-layer module settings (trackball, encoders, …). */
  modules: boolean;
}

/** Every section on, the default for a first export. */
export const ALL_SECTIONS: AbyssSectionSelection = {
  keymap: true,
  combos: true,
  macros: true,
  modules: true,
};

/** Stable order for display and for the analytics `sections` parameter. */
export const SECTION_IDS = ["keymap", "combos", "macros", "modules"] as const;

export type AbyssSectionId = (typeof SECTION_IDS)[number];

/** Sorted, comma-joined ids of the selected sections. Safe to send to analytics. */
export function selectedSectionIds(selection: AbyssSectionSelection): string {
  return SECTION_IDS.filter((id) => selection[id]).join(",");
}

/** Minimal structural view of the keymap JSON, shared by device and Abyss. */
type KeymapLayer = {
  name?: string;
  bindings: unknown[];
  modules?: unknown[];
};

export type KeymapDocument = {
  keyboard: string;
  name?: string;
  description?: string | null;
  layers: KeymapLayer[];
  modules?: unknown[];
  combos?: unknown[];
  macros?: unknown[];
  [key: string]: unknown;
};

/**
 * Produces the document to upload.
 *
 * `base` is what the result starts from — the existing Abyss keymap when
 * updating, or the device snapshot itself when creating a new one. Selected
 * sections are taken from `device`; unselected ones keep whatever `base` had,
 * so an update never clobbers data the user did not choose to overwrite.
 *
 * Identity fields (`keyboard`, `name`, `description`) always come from `base`:
 * an export replaces keymap *data*, never the record's own metadata.
 */
export function buildExportData(
  device: KeymapDocument,
  base: KeymapDocument,
  selection: AbyssSectionSelection,
): KeymapDocument {
  const layerCount = selection.keymap
    ? Math.max(device.layers.length, base.layers.length)
    : base.layers.length;

  const layers = Array.from({ length: layerCount }, (_, index) => {
    const baseLayer = base.layers[index];
    const deviceLayer = device.layers[index];
    // A layer the device has but Abyss does not is only added when the user is
    // uploading keymap data at all.
    if (!baseLayer) return selection.keymap ? deviceLayer : undefined;
    if (!deviceLayer) return baseLayer;
    return {
      ...baseLayer,
      name: selection.keymap ? deviceLayer.name : baseLayer.name,
      bindings: selection.keymap ? deviceLayer.bindings : baseLayer.bindings,
      modules: selection.modules ? deviceLayer.modules : baseLayer.modules,
    };
  }).filter((layer): layer is KeymapLayer => Boolean(layer));

  return {
    ...base,
    keyboard: base.keyboard,
    name: base.name,
    description: base.description,
    layers,
    modules: selection.modules ? device.modules : base.modules,
    combos: selection.combos ? device.combos : base.combos,
    macros: selection.macros ? device.macros : base.macros,
  };
}

/**
 * The document for a brand-new Abyss keymap.
 *
 * Same merge with the device as its own base, which reduces to "keep the
 * selected sections, drop the rest". `keymap` is always on for a new keymap —
 * a keymap with no layers is meaningless — so the caller forces it.
 */
export function buildNewExportData(
  device: KeymapDocument,
  selection: AbyssSectionSelection,
  name: string,
): KeymapDocument {
  const merged = buildExportData(
    device,
    { ...device, name },
    { ...selection, keymap: true },
  );
  // Unselected collections are dropped rather than sent empty, so Abyss stores
  // "this export did not cover combos" rather than "this keymap has no combos".
  if (!selection.combos) delete merged.combos;
  if (!selection.macros) delete merged.macros;
  if (!selection.modules) delete merged.modules;
  return merged;
}
