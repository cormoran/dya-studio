/**
 * Builds the unified patch that backs the JSON diff viewer.
 *
 * Mirrors Keyboard Abyss's own diff editor so the same keymap reads the same
 * way on both sides: a unified patch from `diff`, parsed by `react-diff-view`,
 * rendered either inline or side by side, with a collapsed view that keeps a
 * few lines of context around each change and an expanded view that shows the
 * whole document.
 */
import { createTwoFilesPatch } from "diff";
import { parseDiff, type FileData } from "react-diff-view";

/** Lines of context kept around each change in the collapsed view. */
export const COLLAPSED_CONTEXT_LINES = 3;

/** `react-diff-view` calls side-by-side "split". */
export type DiffViewMode = "unified" | "split";

/** `createTwoFilesPatch` emits this separator line, which `parseDiff` chokes on. */
const PATCH_SEPARATOR =
  "===================================================================";

/** Pretty-prints a value the way both sides of the diff should see it. */
export function toDiffJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  return `${JSON.stringify(value, null, 2)}\n`;
}

function countLines(source: string): number {
  if (!source) return 0;
  return source.split("\n").length;
}

/**
 * Parses a two-file patch into the file model `react-diff-view` renders.
 *
 * The synthetic `diff --git` header is what makes `parseDiff` treat this as a
 * real file rather than a bare hunk list.
 */
function buildFiles(
  before: string,
  after: string,
  contextLines: number,
): FileData[] {
  const patch = createTwoFilesPatch(
    "a/keymap.json",
    "b/keymap.json",
    before,
    after,
    "",
    "",
    { context: contextLines },
  );

  return parseDiff(
    [
      "diff --git a/keymap.json b/keymap.json",
      "index 0000000..1111111 100644",
      ...patch.split("\n").filter((line) => line !== PATCH_SEPARATOR),
    ].join("\n"),
    { nearbySequences: "zip" },
  );
}

export interface JsonDiff {
  /** A few lines of context around each change. */
  collapsedFiles: FileData[];
  /** The whole document, changes highlighted in place. */
  expandedFiles: FileData[];
  /** False when the two documents are identical. */
  hasChanges: boolean;
  /**
   * Whether collapsing actually hides anything. When the documents are small
   * enough that the collapsed view already shows every line, offering the
   * toggle would be a control that does nothing.
   */
  hasHiddenContext: boolean;
}

/** Diffs two JSON documents, in both collapsed and expanded form. */
export function buildJsonDiff(before: string, after: string): JsonDiff {
  const beforeLines = countLines(before);
  const afterLines = countLines(after);
  // "Show everything" is just a context radius larger than the document.
  const expandedContext = Math.max(beforeLines, afterLines, 1);

  const collapsedFiles = buildFiles(before, after, COLLAPSED_CONTEXT_LINES);
  const expandedFiles = buildFiles(before, after, expandedContext);
  const hasChanges = collapsedFiles.some((file) => file.hunks.length > 0);

  const collapsedLines = collapsedFiles.reduce(
    (total, file) =>
      total + file.hunks.reduce((sum, hunk) => sum + hunk.changes.length, 0),
    0,
  );
  const expandedLines = expandedFiles.reduce(
    (total, file) =>
      total + file.hunks.reduce((sum, hunk) => sum + hunk.changes.length, 0),
    0,
  );

  return {
    collapsedFiles,
    expandedFiles,
    hasChanges,
    hasHiddenContext: hasChanges && expandedLines > collapsedLines,
  };
}
