import {
  splitWritableKeymapDiff,
  withoutSkippedChanges,
} from "../keymapApplyResult";
import { EMPTY_DIFF } from "../abyssDiff";
const raw = { type: "raw", zmk: "&custom" };
it("skips unsupported nested changes atomically while keeping supported edits and deletes", () => {
  const diff = {
    ...EMPTY_DIFF,
    bindingChanges: [
      { layerIndex: 0, layerName: "Base", keyIndex: 0, to: raw },
      {
        layerIndex: 0,
        layerName: "Base",
        keyIndex: 1,
        to: { type: "key", usage: 4 },
      },
    ],
    comboChanges: [
      { index: 0, label: "combo", to: { binding: raw } },
      { index: 1, label: "delete", from: { binding: raw } },
    ],
    macroChanges: [
      {
        index: 0,
        label: "macro",
        to: { bindings: [{ type: "macro", name: "nested" }] },
      },
    ],
    moduleChanges: [
      {
        scope: "layer" as const,
        layerIndex: 1,
        moduleName: "encoder",
        to: { bindings: [raw] },
      },
    ],
  };
  const { writable, skipped } = splitWritableKeymapDiff(diff);
  expect(writable.bindingChanges.map((c) => c.keyIndex)).toEqual([1]);
  expect(writable.comboChanges.map((c) => c.index)).toEqual([1]);
  expect(skipped.macroChanges).toHaveLength(1);
  expect(skipped.moduleChanges).toHaveLength(1);
  expect(withoutSkippedChanges(diff, skipped)).toEqual(writable);
  expect(diff.bindingChanges).toHaveLength(2);
});
it("does not hide mismatches at other positions or in a different module scope", () => {
  const skipped = {
    ...EMPTY_DIFF,
    bindingChanges: [
      { layerIndex: 0, layerName: "Base", keyIndex: 0, to: raw },
    ],
    moduleChanges: [
      { scope: "global" as const, moduleName: "encoder", to: raw },
    ],
  };
  const actual = {
    ...skipped,
    bindingChanges: [{ layerIndex: 1, layerName: "Nav", keyIndex: 0, to: raw }],
    moduleChanges: [
      {
        scope: "layer" as const,
        layerIndex: 0,
        moduleName: "encoder",
        to: raw,
      },
    ],
  };
  expect(withoutSkippedChanges(actual, skipped)).toEqual(actual);
});

it("skips known unsupported module routes while preserving ZMK write routes", () => {
  const moduleChanges = [
    {
      scope: "global" as const,
      moduleName: "pointer",
      to: { type: "trackball" },
    },
    {
      scope: "layer" as const,
      layerIndex: 0,
      moduleName: "pointer",
      to: { type: "trackball" },
    },
    {
      scope: "global" as const,
      moduleName: "encoder",
      to: { type: "rotary_encoder" },
    },
    {
      scope: "layer" as const,
      layerIndex: 0,
      moduleName: "encoder",
      to: { type: "rotary_encoder" },
    },
    {
      scope: "global" as const,
      moduleName: "unknown",
      to: { type: "lighting" },
    },
  ];
  const { writable, skipped } = splitWritableKeymapDiff({
    ...EMPTY_DIFF,
    moduleChanges,
  });
  expect(writable.moduleChanges).toEqual([moduleChanges[0], moduleChanges[3]]);
  expect(skipped.moduleChanges).toEqual([
    moduleChanges[1],
    moduleChanges[2],
    moduleChanges[4],
  ]);
});
