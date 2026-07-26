/**
 * Shaping and summarising the writeback diff for the import UI.
 *
 * The diff itself is computed by `compareKeyboardHubKeymaps` in
 * `@keyboard-hub/adapter-common`. Everything here works on the resulting shape:
 * filtering it by the user's section selection, counting it, and turning
 * bindings into labels. Kept structural and local so it is unit-testable — the
 * ESM-only adapter packages cannot be loaded by the CommonJS test runtime.
 */
import type { AbyssSectionSelection } from "./abyssExportPayload";

/** One key binding that differs between the Abyss keymap and the device. */
export interface BindingChange {
  layerIndex: number;
  layerName: string;
  keyIndex: number;
  from?: unknown;
  to?: unknown;
}

/** An entry in an ordered collection (combos, macros) that differs. */
export interface CollectionChange {
  index: number;
  label: string;
  from?: unknown;
  to?: unknown;
}

/** A module setting that differs, at keymap or layer scope. */
export interface ModuleChange {
  scope: "global" | "layer";
  layerIndex?: number;
  moduleName: string;
  from?: unknown;
  to?: unknown;
}

export interface LayerNameChange {
  layerIndex: number;
  from?: string;
  to: string;
}

/** The firmware-neutral writeback diff, as adapter-common produces it. */
export interface KeymapDiff {
  bindingChanges: BindingChange[];
  comboChanges: CollectionChange[];
  macroChanges: CollectionChange[];
  moduleChanges: ModuleChange[];
  layerNameChanges: LayerNameChange[];
}

export const EMPTY_DIFF: KeymapDiff = {
  bindingChanges: [],
  comboChanges: [],
  macroChanges: [],
  moduleChanges: [],
  layerNameChanges: [],
};

/**
 * Drops the sections the user did not tick.
 *
 * `keymap` covers both bindings and layer names — they are written by the same
 * RPCs and make no sense to split.
 */
export function filterDiff(
  diff: KeymapDiff,
  selection: AbyssSectionSelection,
): KeymapDiff {
  return {
    bindingChanges: selection.keymap ? diff.bindingChanges : [],
    layerNameChanges: selection.keymap ? diff.layerNameChanges : [],
    comboChanges: selection.combos ? diff.comboChanges : [],
    macroChanges: selection.macros ? diff.macroChanges : [],
    moduleChanges: selection.modules ? diff.moduleChanges : [],
  };
}

/** True when there is nothing left to write. */
export function isEmptyDiff(diff: KeymapDiff): boolean {
  return (
    diff.bindingChanges.length === 0 &&
    diff.layerNameChanges.length === 0 &&
    diff.comboChanges.length === 0 &&
    diff.macroChanges.length === 0 &&
    diff.moduleChanges.length === 0
  );
}

/** Highest layer index the diff touches, or -1 when it touches no layer. */
export function maxLayerIndex(diff: KeymapDiff): number {
  return Math.max(
    -1,
    ...diff.layerNameChanges.map((change) => change.layerIndex),
    ...diff.bindingChanges.map((change) => change.layerIndex),
    ...diff.moduleChanges
      .map((change) => change.layerIndex)
      .filter((index): index is number => index !== undefined),
  );
}

/** Headline counts for the summary bar. */
export interface DiffCounts {
  bindings: number;
  layerNames: number;
  combos: number;
  macros: number;
  modules: number;
  total: number;
}

export function countDiff(diff: KeymapDiff): DiffCounts {
  const counts = {
    bindings: diff.bindingChanges.length,
    layerNames: diff.layerNameChanges.length,
    combos: diff.comboChanges.length,
    macros: diff.macroChanges.length,
    modules: diff.moduleChanges.length,
  };
  return {
    ...counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
  };
}

/** Everything the diff changes within one layer. */
export interface LayerDiff {
  layerIndex: number;
  layerName: string;
  nameChange?: LayerNameChange;
  bindingChanges: BindingChange[];
  moduleChanges: ModuleChange[];
}

/**
 * Regroups the flat change lists by layer, in layer order.
 *
 * The UI shows one collapsible card per affected layer; a flat list of 300
 * binding rows is unreadable, and grouping is what makes "the whole alpha block
 * moved" distinguishable from "three keys changed".
 */
export function groupByLayer(diff: KeymapDiff): LayerDiff[] {
  const byIndex = new Map<number, LayerDiff>();
  const ensure = (layerIndex: number, layerName?: string) => {
    const existing = byIndex.get(layerIndex);
    if (existing) {
      if (layerName && !existing.layerName) existing.layerName = layerName;
      return existing;
    }
    const created: LayerDiff = {
      layerIndex,
      layerName: layerName ?? "",
      bindingChanges: [],
      moduleChanges: [],
    };
    byIndex.set(layerIndex, created);
    return created;
  };

  for (const change of diff.layerNameChanges) {
    ensure(change.layerIndex, change.to).nameChange = change;
  }
  for (const change of diff.bindingChanges) {
    ensure(change.layerIndex, change.layerName).bindingChanges.push(change);
  }
  for (const change of diff.moduleChanges) {
    if (change.layerIndex === undefined) continue;
    ensure(change.layerIndex).moduleChanges.push(change);
  }

  return [...byIndex.values()].sort((a, b) => a.layerIndex - b.layerIndex);
}

/** Module changes that apply to the whole keymap rather than one layer. */
export function globalModuleChanges(diff: KeymapDiff): ModuleChange[] {
  return diff.moduleChanges.filter((change) => change.scope === "global");
}

/**
 * Above this many binding rows the UI shows counts only until the user asks for
 * the full list. A full keymap replacement is several hundred rows, and
 * rendering them all is both slow and useless.
 */
export const BINDING_ROW_LIMIT = 250;

/**
 * A short human label for one binding.
 *
 * KeyboardHub bindings are discriminated by `type`, with the interesting detail
 * in different fields per variant. This covers the common ones and degrades to
 * the type name rather than guessing, so an unrecognised binding still shows
 * *something* truthful.
 */
export function bindingLabel(binding: unknown): string {
  if (binding === undefined || binding === null) return "—";
  if (typeof binding !== "object") return String(binding);

  const value = binding as Record<string, unknown>;
  const type = typeof value.type === "string" ? value.type : null;
  if (!type) return "—";

  const usage = typeof value.usage === "number" ? value.usage : null;
  const mods = Array.isArray(value.mods) ? (value.mods as string[]) : [];
  const withMods = (label: string) =>
    mods.length ? `${mods.join("+")}+${label}` : label;
  const hex = (code: number) => `0x${code.toString(16)}`;

  switch (type) {
    case "key":
      return usage === null ? "key" : withMods(hex(usage));
    case "mt":
      return `MT(${String(value.mod ?? "?")}, ${usage === null ? "?" : hex(usage)})`;
    case "lt":
      return `LT(${String(value.layer ?? "?")}, ${usage === null ? "?" : hex(usage)})`;
    case "mo":
    case "tog":
    case "to":
    case "sl":
      return `${type.toUpperCase()}(${String(value.layer ?? "?")})`;
    case "sticky_key":
      return usage === null ? "sticky" : `SK(${withMods(hex(usage))})`;
    case "key_toggle":
      return usage === null ? "KT" : `KT(${withMods(hex(usage))})`;
    case "mouse_button":
      return `MB${String(value.button ?? "?")}`;
    case "mouse_move":
    case "mouse_scroll":
      return `${type === "mouse_move" ? "MOVE" : "SCRL"} ${String(value.direction ?? "?")}`;
    case "bluetooth":
      return `BT ${String(value.action ?? "?")}`;
    case "output":
      return `OUT ${String(value.action ?? "?")}`;
    case "macro":
      return `macro ${String(value.macro ?? "?")}`;
    case "raw":
      return String(value.zmk ?? value.label ?? "raw");
    case "trans":
      return "▽";
    case "none":
      return "✕";
    default:
      // caps_word, key_repeat, grave_escape, bootloader, reset, …
      return type;
  }
}
