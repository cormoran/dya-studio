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
