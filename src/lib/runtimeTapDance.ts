import type {
  BehaviorBinding,
  BehaviorDefinition,
  Keymap,
} from "../hooks/useKeymap";
import { Config } from "../proto/cormoran/runtime_tapdance/runtime_tapdance";

export const TAP_DANCE_ACTIONS = [
  "singleBinding",
  "doubleBinding",
  "tripleBinding",
] as const;
export const TAP_DANCE_LABELS = ["Single", "Double", "Triple"] as const;
export const emptyTapDance = () =>
  Config.create({ singleBinding: {}, doubleBinding: {}, tripleBinding: {} });
export function isRuntimeTapDance(behavior: BehaviorDefinition | undefined) {
  return /^(runtime[ _-]?tap[ _-]?dance|rtd)$/i.test(
    behavior?.displayName ?? "",
  );
}
export function tapDanceUsageCount(
  keymap: Keymap | null | undefined,
  behaviors: Map<number, BehaviorDefinition>,
  slot: number,
) {
  if (!keymap) return null;
  return keymap.layers.reduce(
    (count, layer) =>
      count +
      layer.bindings.filter(
        (binding: BehaviorBinding) =>
          isRuntimeTapDance(behaviors.get(binding.behaviorId)) &&
          binding.param1 === slot,
      ).length,
    0,
  );
}
