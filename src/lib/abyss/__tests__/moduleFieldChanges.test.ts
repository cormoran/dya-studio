import { moduleFieldChanges } from "../moduleFieldChanges";

it("shows changed nested fields, array entries, removals and false/zero/null values", () => {
  expect(
    moduleFieldChanges(
      {
        name: "ball",
        config: { speed: 2, enabled: true, unused: 1 },
        inputs: [1, 2],
      },
      {
        name: "ball",
        config: { speed: 0, enabled: false, nullable: null },
        inputs: [3],
      },
    ),
  ).toEqual([
    { path: '$["config"]["enabled"]', from: true, to: false },
    { path: '$["config"]["nullable"]', from: undefined, to: null },
    { path: '$["config"]["speed"]', from: 2, to: 0 },
    { path: '$["config"]["unused"]', from: 1, to: undefined },
    { path: '$["inputs"][0]', from: 1, to: 3 },
    { path: '$["inputs"][1]', from: 2, to: undefined },
  ]);
});
it("does not invent edits for reordered object keys or identical empty structures", () => {
  expect(
    moduleFieldChanges({ x: 1, y: [], z: {} }, { z: {}, y: [], x: 1 }),
  ).toEqual([]);
});
it("handles whole-module additions, removals, and empty object changes", () => {
  expect(moduleFieldChanges(undefined, { value: 0 })).toEqual([
    { path: '$["value"]', from: undefined, to: 0 },
  ]);
  expect(moduleFieldChanges({ value: false }, undefined)).toEqual([
    { path: '$["value"]', from: false, to: undefined },
  ]);
  expect(moduleFieldChanges(null, {})).toEqual([
    { path: "$", from: null, to: {} },
  ]);
});
