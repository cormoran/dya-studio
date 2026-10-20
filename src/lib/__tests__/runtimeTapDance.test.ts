import { isRuntimeTapDance, tapDanceUsageCount } from "../runtimeTapDance";
import type { Keymap, BehaviorDefinition } from "../../hooks/useKeymap";
const behaviors = new Map<number, BehaviorDefinition>([
  [32, { id: 32, displayName: "Runtime Tap Dance", metadata: [] }],
  [33, { id: 33, displayName: "rtd", metadata: [] }],
]);
it("counts shared slots across layers and behavior aliases, without counting other slots", () => {
  const keymap = {
    layers: [
      {
        bindings: [
          { behaviorId: 32, param1: 2 },
          { behaviorId: 33, param1: 2 },
          { behaviorId: 32, param1: 3 },
        ],
      },
      {
        bindings: [
          { behaviorId: 32, param1: 2 },
          { behaviorId: 10, param1: 2 },
        ],
      },
    ],
  } as Keymap;
  expect(tapDanceUsageCount(keymap, behaviors, 2)).toBe(3);
  expect(tapDanceUsageCount(null, behaviors, 2)).toBeNull();
});
it.each(["Runtime Tap Dance", "Runtime Tapdance", "runtime_tapdance", "rtd"])(
  "recognizes %s",
  (displayName) => {
    expect(isRuntimeTapDance({ id: 32, displayName, metadata: [] })).toBe(true);
  },
);
