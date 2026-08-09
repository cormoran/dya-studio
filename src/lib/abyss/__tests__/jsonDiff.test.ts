/**
 * Tests for the JSON patch that backs the diff viewer.
 */
import {
  COLLAPSED_CONTEXT_LINES,
  buildJsonDiff,
  toDiffJson,
} from "../jsonDiff";

/** Total rendered lines across every hunk. */
function lineCount(files: ReturnType<typeof buildJsonDiff>["collapsedFiles"]) {
  return files.reduce(
    (total, file) =>
      total + file.hunks.reduce((sum, hunk) => sum + hunk.changes.length, 0),
    0,
  );
}

const long = (marker: string) =>
  toDiffJson({
    keyboard: "dya2",
    layers: Array.from({ length: 40 }, (_, index) => ({
      name: index === 20 ? marker : `Layer ${index}`,
      bindings: [index],
    })),
  });

describe("toDiffJson", () => {
  it("pretty-prints with a trailing newline so the last line diffs cleanly", () => {
    expect(toDiffJson({ a: 1 })).toBe('{\n  "a": 1\n}\n');
  });

  it("renders an absent document as empty rather than 'null'", () => {
    expect(toDiffJson(null)).toBe("");
    expect(toDiffJson(undefined)).toBe("");
  });
});

describe("buildJsonDiff", () => {
  it("reports no changes for identical documents", () => {
    const json = toDiffJson({ keyboard: "dya2" });
    const diff = buildJsonDiff(json, json);

    expect(diff.hasChanges).toBe(false);
    expect(diff.hasHiddenContext).toBe(false);
  });

  it("finds changes between different documents", () => {
    const diff = buildJsonDiff(
      toDiffJson({ keyboard: "dya2", name: "Before" }),
      toDiffJson({ keyboard: "dya2", name: "After" }),
    );

    expect(diff.hasChanges).toBe(true);
    expect(diff.collapsedFiles[0].hunks.length).toBeGreaterThan(0);
  });

  it("shows fewer lines collapsed than expanded for a long document", () => {
    // This is the whole point of the toggle: a 40-layer keymap with one changed
    // line should not render 200 unchanged lines by default.
    const diff = buildJsonDiff(long("Before"), long("After"));

    expect(lineCount(diff.collapsedFiles)).toBeLessThan(
      lineCount(diff.expandedFiles),
    );
    expect(diff.hasHiddenContext).toBe(true);
  });

  it("keeps context around the change in the collapsed view", () => {
    const diff = buildJsonDiff(long("Before"), long("After"));
    const changes = diff.collapsedFiles[0].hunks.flatMap(
      (hunk) => hunk.changes,
    );
    const normal = changes.filter((change) => change.type === "normal");

    // Context on both sides of the change, so a reader can tell where they are.
    expect(normal.length).toBeGreaterThanOrEqual(COLLAPSED_CONTEXT_LINES);
  });

  it("does not offer to expand when nothing is hidden", () => {
    // A tiny document is fully visible collapsed; a toggle here would do
    // nothing when clicked.
    const diff = buildJsonDiff(toDiffJson({ a: 1 }), toDiffJson({ a: 2 }));

    expect(diff.hasChanges).toBe(true);
    expect(diff.hasHiddenContext).toBe(false);
  });

  it("handles one side being absent, as when a keymap has no data yet", () => {
    const diff = buildJsonDiff("", toDiffJson({ keyboard: "dya2" }));
    expect(diff.hasChanges).toBe(true);
  });
});
