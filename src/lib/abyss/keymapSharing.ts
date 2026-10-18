import { keyboardHubKeymapSchema } from "@keyboard-hub/schema";
import type { KeymapDocument } from "./abyssExportPayload";

export const KEYMAP_SCHEMA =
  "https://abyss.keyboard-hub.com/schemas/keymap/v1.json";

export function parseSharedKeymap(value: unknown): KeymapDocument {
  const parsed = keyboardHubKeymapSchema.safeParse({
    $schema: KEYMAP_SCHEMA,
    ...(value as object),
  });
  if (!parsed.success)
    throw new Error("This file is not a valid KeyboardHub keymap.");
  return value as KeymapDocument;
}

/** Firmware cannot delete layers/positions. Preview exactly the state we can write.
 * Absent optional sections mean "not exported"; an explicit [] clears them.
 */
export function buildApplyTarget(
  device: KeymapDocument,
  target: KeymapDocument,
): KeymapDocument {
  return {
    ...target,
    combos: target.combos ?? device.combos,
    macros: target.macros ?? device.macros,
    modules: target.modules ?? device.modules,
    layers: Array.from(
      { length: Math.max(device.layers.length, target.layers.length) },
      (_, index) => {
        const current = device.layers[index];
        const next = target.layers[index];
        if (!next) return current;
        if (!current) return next;
        return {
          ...next,
          modules: next.modules ?? current.modules,
          bindings: Array.from(
            { length: Math.max(current.bindings.length, next.bindings.length) },
            (_, key) => next.bindings[key] ?? current.bindings[key],
          ),
        };
      },
    ),
  };
}

/** Per-module selection shared by visual/code previews and writeback. */
export type SharingSelection = {
  keymap: boolean;
  combos: boolean;
  macros: boolean;
  modules: Record<string, boolean>;
};

export const ALL_SHARING_PARTS: SharingSelection = {
  keymap: true,
  combos: true,
  macros: true,
  modules: {}, // An absent module name means selected.
};

/** Only a complete transfer can claim the Abyss record's identity. */
export function isCompleteSharingSelection(
  selection: SharingSelection,
): boolean {
  return (
    selection.keymap &&
    selection.combos &&
    selection.macros &&
    Object.values(selection.modules).every(Boolean)
  );
}

function moduleName(module: unknown): string {
  return module && typeof module === "object" && "name" in module
    ? String(module.name)
    : "";
}

export function sharingModuleNames(...documents: KeymapDocument[]): string[] {
  return [
    ...new Set(
      documents
        .flatMap((document) => [
          ...(document.modules ?? []),
          ...document.layers.flatMap((layer) => layer.modules ?? []),
        ])
        .map(moduleName)
        .filter(Boolean),
    ),
  ].sort();
}

/** Unselected parts retain the destination, including absent optional sections. */
export function selectSharingTarget(
  before: KeymapDocument,
  target: KeymapDocument,
  selection: SharingSelection,
): KeymapDocument {
  const modules = (
    base: unknown[] | undefined,
    next: unknown[] | undefined,
  ) => {
    const selected = (module: unknown) =>
      selection.modules[moduleName(module)] !== false;
    if ([...(base ?? []), ...(next ?? [])].every((entry) => !selected(entry)))
      return base;
    const result = [
      ...(next ?? []).filter(selected),
      ...(base ?? []).filter((module) => !selected(module)),
    ];
    return base === undefined && next === undefined ? undefined : result;
  };
  // A destination-only layer must survive if it contains an excluded module.
  // Deleting its containing layer would also delete data the user opted to keep.
  const layerCount = before.layers.reduce(
    (count, layer, index) =>
      (layer.modules ?? []).some(
        (entry) => selection.modules[moduleName(entry)] === false,
      )
        ? Math.max(count, index + 1)
        : count,
    target.layers.length,
  );
  const layers = selection.keymap
    ? Array.from(
        { length: layerCount },
        (_, index) => target.layers[index] ?? before.layers[index],
      )
    : before.layers;
  return {
    ...target,
    layers: layers.map((layer, index) => ({
      ...layer,
      modules: modules(
        before.layers[index]?.modules,
        target.layers[index]?.modules,
      ),
    })),
    modules: modules(before.modules, target.modules),
    combos: selection.combos ? target.combos : before.combos,
    macros: selection.macros ? target.macros : before.macros,
  };
}
