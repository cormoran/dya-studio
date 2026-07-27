import {
  diffSnapshots,
  flattenSnapshot,
  formatDiffValue,
  snapshotsEqual,
  stableStringify,
} from "../diff";

describe("stableStringify", () => {
  test("is independent of object key order", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(
      stableStringify({ a: 2, b: 1 }),
    );
  });

  test("is sensitive to array order", () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });
});

describe("snapshotsEqual", () => {
  test("ignores key order but not values", () => {
    expect(
      snapshotsEqual({ a: [1, { x: 1, y: 2 }] }, { a: [1, { y: 2, x: 1 }] }),
    ).toBe(true);
    expect(snapshotsEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe("flattenSnapshot", () => {
  test("indexes arrays by position and keeps empty containers as leaves", () => {
    const leaves = flattenSnapshot({ layers: [{ name: "base" }], removed: [] });
    expect([...leaves.values()].map((leaf) => leaf.path)).toEqual(
      expect.arrayContaining([["layers", "0", "name"], ["removed"]]),
    );
  });
});

describe("diffSnapshots", () => {
  test("reports changed, added and removed leaves", () => {
    const before = { tapMs: 5, macros: { a: 1 } };
    const after = { tapMs: 9, macros: { b: 2 } };
    const entries = diffSnapshots(before, after);

    expect(entries).toEqual([
      { path: ["macros", "a"], before: 1, kind: "removed" },
      { path: ["macros", "b"], after: 2, kind: "added" },
      { path: ["tapMs"], before: 5, after: 9, kind: "changed" },
    ]);
  });

  test("is empty for structurally identical snapshots", () => {
    expect(diffSnapshots({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toEqual([]);
  });
});

describe("formatDiffValue", () => {
  test("renders missing, empty and structured values readably", () => {
    expect(formatDiffValue(undefined)).toBe("—");
    expect(formatDiffValue("")).toBe('""');
    expect(formatDiffValue(false)).toBe("false");
    expect(formatDiffValue([1, 2])).toBe("[1,2]");
  });
});
