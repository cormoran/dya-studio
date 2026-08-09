/**
 * Tests for the checks that gate writing an Abyss keymap to the keyboard.
 */
import { EMPTY_DIFF, type KeymapDiff } from "../abyssDiff";
import { isBlocked, layoutNamesMatch, runPreflight } from "../abyssPreflight";

const baseInput = {
  diff: EMPTY_DIFF,
  deviceKeyCount: 87,
  targetKeyCount: 87,
  deviceLayerCount: 3,
};

function idsOf(checks: ReturnType<typeof runPreflight>) {
  return checks.map((check) => check.id);
}

describe("runPreflight", () => {
  it("passes cleanly when the keymap matches the keyboard", () => {
    const checks = runPreflight(baseInput);
    expect(checks).toHaveLength(0);
    expect(isBlocked(checks)).toBe(false);
  });

  it("blocks a keymap with more keys than the keyboard has", () => {
    // Positions are indices into the layout, so a too-wide keymap would map
    // bindings onto the wrong physical keys rather than fail loudly.
    const checks = runPreflight({ ...baseInput, targetKeyCount: 104 });

    expect(idsOf(checks)).toContain("key-count");
    expect(isBlocked(checks)).toBe(true);
  });

  it("only warns when the keymap covers fewer keys", () => {
    const checks = runPreflight({ ...baseInput, targetKeyCount: 60 });

    expect(idsOf(checks)).toEqual(["key-count-partial"]);
    expect(isBlocked(checks)).toBe(false);
  });

  it("warns when the write needs layers the keyboard does not have yet", () => {
    const diff: KeymapDiff = {
      ...EMPTY_DIFF,
      bindingChanges: [
        { layerIndex: 4, layerName: "Extra", keyIndex: 0, to: {} },
      ],
    };
    const checks = runPreflight({ ...baseInput, diff });

    expect(idsOf(checks)).toContain("layer-count");
    // The adapter adds layers itself; firmware may refuse, but that is not
    // knowable here, so it must not block.
    expect(isBlocked(checks)).toBe(false);
  });

  it("warns when the layouts differ", () => {
    const checks = runPreflight({
      ...baseInput,
      deviceLayoutName: "DYA2 ANSI",
      targetLayoutName: "DYA2 ISO",
    });

    expect(idsOf(checks)).toContain("layout-name");
  });

  it("does not warn on cosmetic layout-name differences", () => {
    // A false mismatch here trains users to ignore the warnings that matter.
    const checks = runPreflight({
      ...baseInput,
      deviceLayoutName: "DYA2 ANSI",
      targetLayoutName: "dya2_ansi",
    });

    expect(idsOf(checks)).not.toContain("layout-name");
  });

  it("says nothing about the layout when either side is unknown", () => {
    expect(
      idsOf(runPreflight({ ...baseInput, deviceLayoutName: "DYA2 ANSI" })),
    ).not.toContain("layout-name");
    expect(
      idsOf(runPreflight({ ...baseInput, targetLayoutName: "DYA2 ISO" })),
    ).not.toContain("layout-name");
  });
});

describe("layoutNamesMatch", () => {
  it.each([
    ["DYA2 ANSI", "dya2-ansi", true],
    ["dya2_ansi", "DYA2ANSI", true],
    ["DYA2 ANSI", "DYA2 ISO", false],
  ])("%s vs %s -> %s", (left, right, expected) => {
    expect(layoutNamesMatch(left, right)).toBe(expected);
  });
});
