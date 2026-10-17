import type { FastKeymapModel, FastKeymapBinding } from "./fastKeymap";

export interface UnlockStep {
  position: number;
  layer: number;
  action: "hold" | "press" | "unlock";
  binding: FastKeymapBinding;
}

/** A bounded search from the base layer, never treating unknown behaviors as
 * transparent. Layer parameters are ordered indices, not stable layer IDs.
 * Runtime active/conditional layers and custom behavior internals aren't exposed
 * by fast-keymap; the guide explicitly asks the user to start on the base layer. */
export function findUnlockGuide(model: FastKeymapModel): UnlockStep[] | null {
  const keys = model.layouts[model.activeLayoutIndex]?.keys;
  if (
    !keys?.length ||
    !model.layers.length ||
    model.pendingLayerIds.length ||
    model.behaviorsDeferred
  )
    return null;
  if (model.layers.some((l) => l.bindings.length !== keys.length)) return null;
  if (
    keys.some(
      (key) =>
        ![key.x, key.y, key.width, key.height, key.r, key.rx, key.ry].every(
          Number.isFinite,
        ) ||
        key.width <= 0 ||
        key.height <= 0,
    )
  )
    return null;
  const aliases = new Map(model.behaviors.map((b) => [b.localId, b.alias]));
  const queue: { active: number[]; steps: UnlockStep[]; held: number[] }[] = [
    { active: [0], steps: [], held: [] },
  ];
  const visited = new Set<string>();
  // Bound both depth and work for unusual keyboards with many layer keys.
  for (let cursor = 0; cursor < queue.length && cursor < 512; cursor++) {
    const { active, steps, held } = queue[cursor];
    const state = `${active.join(",")}/${held
      .slice()
      .sort((a, b) => a - b)
      .join(",")}`;
    if (visited.has(state)) continue;
    visited.add(state);
    const effective = keys.map((_, position) => {
      for (const layer of active) {
        const binding = model.layers[layer].bindings[position];
        if (aliases.get(binding.behaviorId) !== "trans")
          return { binding, layer };
      }
      return null;
    });
    // Prefer a direct unlock before adding any more layer operations.
    for (let position = 0; position < effective.length; position++) {
      const item = effective[position];
      if (
        item &&
        !held.includes(position) &&
        aliases.get(item.binding.behaviorId) === "studio_unlock"
      ) {
        return [...steps, { ...item, position, action: "unlock" }];
      }
    }
    if (steps.length >= 3) continue;
    for (let position = 0; position < effective.length; position++) {
      const item = effective[position];
      if (!item || held.includes(position)) continue;
      const alias = aliases.get(item.binding.behaviorId);
      if (!["mo", "lt", "to", "tog"].includes(alias ?? "")) continue;
      const target = item.binding.param1;
      if (
        !Number.isInteger(target) ||
        target <= 0 ||
        target >= model.layers.length ||
        active.includes(target)
      )
        continue;
      // TO drops other layers; avoid recommending it while layer keys are held.
      if (alias === "to" && held.length) continue;
      const hold = alias === "mo" || alias === "lt";
      queue.push({
        active: (alias === "to" ? [0, target] : [...active, target]).sort(
          (a, b) => b - a,
        ),
        steps: [
          ...steps,
          { ...item, position, action: hold ? "hold" : "press" },
        ],
        held: hold ? [...held, position] : held,
      });
    }
  }
  return null;
}
