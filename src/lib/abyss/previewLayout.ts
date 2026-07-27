/**
 * Sizing helpers for the keymap preview.
 *
 * Kept out of the component file so fast refresh keeps working — a module that
 * exports both components and plain functions is not refreshable, and this app
 * is developed almost entirely through the dev server.
 */

/**
 * Smallest scale worth rendering. Below this the legends stop being readable,
 * so a very wide board scrolls instead of shrinking into illegibility.
 */
export const MIN_PREVIEW_SCALE = 0.45;

/**
 * Scale that fits `naturalWidth` into `availableWidth`, never enlarging.
 *
 * Returns 1 when the available width is unknown (0), which is what happens
 * before the first measurement and in environments without layout — better to
 * render at full size for a frame than to collapse to nothing.
 */
export function previewScale(
  naturalWidth: number,
  availableWidth: number,
): number {
  if (naturalWidth <= 0 || availableWidth <= 0) return 1;
  return Math.max(
    MIN_PREVIEW_SCALE,
    Math.min(1, availableWidth / naturalWidth),
  );
}

/** Key geometry as it arrives from the Abyss layout document. */
export interface RawPreviewPosition {
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  rx?: number;
  ry?: number;
}

/**
 * Above this, the geometry cannot plausibly be in key units — no keyboard is
 * 40 units wide — so it is being reported in hundredths.
 */
const CENTI_UNIT_THRESHOLD = 40;

/**
 * Converts key geometry to key units, whichever unit it arrived in.
 *
 * The KeyboardHub layout schema documents `x`/`y`/`w`/`h` in key units, but the
 * ZMK adapter copies ZMK Studio's `KeyPhysicalAttrs` through verbatim, and those
 * are hundredths of a key unit — a 1u key is `width: 100`. Taking the schema at
 * its word rendered the preview a hundred times too large.
 *
 * Detected from the data rather than hardcoded, so this keeps working if the
 * adapter is fixed upstream to match its own schema.
 */
export function normalizePositions(
  positions: RawPreviewPosition[],
): RawPreviewPosition[] {
  if (positions.length === 0) return positions;
  const extent = Math.max(
    ...positions.map((position) => position.x + (position.w ?? 1)),
  );
  if (extent <= CENTI_UNIT_THRESHOLD) return positions;

  const scale = 1 / 100;
  return positions.map((position) => ({
    x: position.x * scale,
    y: position.y * scale,
    w: position.w === undefined ? undefined : position.w * scale,
    h: position.h === undefined ? undefined : position.h * scale,
    // Rotation stays in centidegrees either way; only lengths are affected.
    r: position.r,
    rx: position.rx === undefined ? undefined : position.rx * scale,
    ry: position.ry === undefined ? undefined : position.ry * scale,
  }));
}
