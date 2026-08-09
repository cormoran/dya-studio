/**
 * Tests for the diff shaping helpers that drive the import UI.
 */
import {
  EMPTY_DIFF,
  bindingLabel,
  countDiff,
  filterDiff,
  globalModuleChanges,
  groupByLayer,
  isEmptyDiff,
  maxLayerIndex,
  type KeymapDiff,
} from "../abyssDiff";

const diff: KeymapDiff = {
  bindingChanges: [
    { layerIndex: 0, layerName: "Base", keyIndex: 3, to: { type: "trans" } },
    { layerIndex: 2, layerName: "Nav", keyIndex: 1, to: { type: "none" } },
  ],
  layerNameChanges: [{ layerIndex: 2, from: "Nav", to: "Navigation" }],
  comboChanges: [{ index: 0, label: "Combo 1" }],
  macroChanges: [],
  moduleChanges: [
    { scope: "global", moduleName: "trackball" },
    { scope: "layer", layerIndex: 2, moduleName: "encoder" },
  ],
};

describe("filterDiff", () => {
  it("keeps layer names with bindings, since one RPC path writes both", () => {
    const result = filterDiff(diff, {
      keymap: true,
      combos: false,
      macros: false,
      modules: false,
    });

    expect(result.bindingChanges).toHaveLength(2);
    expect(result.layerNameChanges).toHaveLength(1);
    expect(result.comboChanges).toHaveLength(0);
    expect(result.moduleChanges).toHaveLength(0);
  });

  it("drops bindings and layer names together", () => {
    const result = filterDiff(diff, {
      keymap: false,
      combos: true,
      macros: true,
      modules: true,
    });

    expect(result.bindingChanges).toHaveLength(0);
    expect(result.layerNameChanges).toHaveLength(0);
    expect(result.comboChanges).toHaveLength(1);
    expect(result.moduleChanges).toHaveLength(2);
  });
});

describe("isEmptyDiff", () => {
  it("is true only when nothing is left to write", () => {
    expect(isEmptyDiff(EMPTY_DIFF)).toBe(true);
    expect(isEmptyDiff(diff)).toBe(false);
    // A selection that removes every change must read as "in sync", or the
    // write button stays enabled with nothing to do.
    expect(
      isEmptyDiff(
        filterDiff(diff, {
          keymap: false,
          combos: false,
          macros: false,
          modules: false,
        }),
      ),
    ).toBe(true);
  });
});

describe("maxLayerIndex", () => {
  it("spans bindings, layer names and layer-scoped modules", () => {
    expect(maxLayerIndex(diff)).toBe(2);
  });

  it("is -1 when no layer is touched", () => {
    expect(
      maxLayerIndex({
        ...EMPTY_DIFF,
        comboChanges: [{ index: 0, label: "c" }],
      }),
    ).toBe(-1);
  });

  it("ignores global module changes, which have no layer", () => {
    expect(
      maxLayerIndex({
        ...EMPTY_DIFF,
        moduleChanges: [{ scope: "global", moduleName: "trackball" }],
      }),
    ).toBe(-1);
  });
});

describe("countDiff", () => {
  it("totals every category", () => {
    expect(countDiff(diff)).toEqual({
      bindings: 2,
      layerNames: 1,
      combos: 1,
      macros: 0,
      modules: 2,
      total: 6,
    });
  });
});

describe("groupByLayer", () => {
  it("groups changes by layer in layer order", () => {
    const groups = groupByLayer(diff);

    expect(groups.map((group) => group.layerIndex)).toEqual([0, 2]);
    expect(groups[0].bindingChanges).toHaveLength(1);
    expect(groups[1].nameChange?.to).toBe("Navigation");
    expect(groups[1].moduleChanges).toHaveLength(1);
  });

  it("keeps global module changes out of the layer groups", () => {
    expect(groupByLayer(diff).flatMap((g) => g.moduleChanges)).toHaveLength(1);
    expect(globalModuleChanges(diff)).toHaveLength(1);
  });

  it("names a layer known only from its rename", () => {
    const groups = groupByLayer({
      ...EMPTY_DIFF,
      layerNameChanges: [{ layerIndex: 1, to: "Symbols" }],
    });
    expect(groups[0].layerName).toBe("Symbols");
  });
});

describe("bindingLabel", () => {
  it("renders an empty side as a dash", () => {
    expect(bindingLabel(undefined)).toBe("—");
    expect(bindingLabel(null)).toBe("—");
  });

  it("renders the common binding types", () => {
    expect(bindingLabel({ type: "key", usage: 0x04 })).toBe("0x4");
    expect(bindingLabel({ type: "key", usage: 0x04, mods: ["LSHIFT"] })).toBe(
      "LSHIFT+0x4",
    );
    expect(bindingLabel({ type: "mo", layer: 2 })).toBe("MO(2)");
    expect(bindingLabel({ type: "lt", layer: 1, usage: 0x2c })).toBe(
      "LT(1, 0x2c)",
    );
    expect(bindingLabel({ type: "trans" })).toBe("▽");
    expect(bindingLabel({ type: "none" })).toBe("✕");
    expect(bindingLabel({ type: "raw", zmk: "&custom X" })).toBe("&custom X");
  });

  it("falls back to the type name rather than guessing", () => {
    // An unrecognised binding still shows something truthful instead of a
    // misleading label or a blank cell.
    expect(bindingLabel({ type: "caps_word" })).toBe("caps_word");
    expect(bindingLabel({ type: "some_future_thing" })).toBe(
      "some_future_thing",
    );
    expect(bindingLabel({})).toBe("—");
  });
});
