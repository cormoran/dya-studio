/**
 * Tests for the layer preview's fit-to-width scaling.
 */
import { render, screen } from "@testing-library/react";
import { KeymapLayerPreview } from "../KeymapLayerPreview";
import {
  normalizePositions,
  previewScale,
} from "../../../lib/abyss/previewLayout";

describe("previewScale", () => {
  it("shrinks a board that is wider than the space available", () => {
    expect(previewScale(1000, 500)).toBe(0.5);
  });

  it("never enlarges a board that already fits", () => {
    // Blowing a 40% keyboard up to fill a wide window would look broken.
    expect(previewScale(400, 1200)).toBe(1);
    expect(previewScale(400, 400)).toBe(1);
  });

  it("stops shrinking before the legends become unreadable", () => {
    // Past this the board scrolls instead; illegible is worse than scrolled.
    expect(previewScale(2000, 100)).toBe(0.45);
  });

  it("renders at full size when the width is not known yet", () => {
    // The first paint happens before measurement, and in environments with no
    // layout at all; collapsing to nothing there would be worse.
    expect(previewScale(800, 0)).toBe(1);
    expect(previewScale(0, 500)).toBe(1);
  });
});

describe("normalizePositions", () => {
  it("passes key units through untouched", () => {
    const positions = [{ x: 0, y: 0, w: 1, h: 1 }];
    expect(normalizePositions(positions)).toEqual(positions);
  });

  it("converts ZMK's hundredths to key units", () => {
    // The KeyboardHub schema documents key units, but the ZMK adapter copies
    // ZMK Studio's KeyPhysicalAttrs verbatim and those are hundredths — a 1u
    // key is `width: 100`. Believing the schema drew the board 100x too large.
    expect(
      normalizePositions([
        { x: 0, y: 0, w: 100, h: 100 },
        { x: 1400, y: 300, w: 200, h: 100, rx: 1400, ry: 300, r: 1500 },
      ]),
    ).toEqual([
      { x: 0, y: 0, w: 1, h: 1, r: undefined, rx: undefined, ry: undefined },
      { x: 14, y: 3, w: 2, h: 1, rx: 14, ry: 3, r: 1500 },
    ]);
  });

  it("leaves rotation in centidegrees, which both conventions share", () => {
    const [key] = normalizePositions([
      { x: 0, y: 0, w: 100, h: 100, r: 1500 },
      { x: 5000, y: 0 },
    ]);
    expect(key.r).toBe(1500);
  });

  it("handles an empty layout", () => {
    expect(normalizePositions([])).toEqual([]);
  });
});

describe("KeymapLayerPreview", () => {
  const positions = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ];

  it("says so when there is no geometry to draw", () => {
    render(
      <KeymapLayerPreview positions={[]} bindings={[]} changes={new Map()} />,
    );

    expect(
      screen.getByText("No layout geometry available for a preview."),
    ).toBeInTheDocument();
  });

  it("labels every key from its binding", () => {
    render(
      <KeymapLayerPreview
        positions={positions}
        bindings={[
          { type: "trans" },
          { type: "mo", layer: 2 },
          { type: "none" },
        ]}
        changes={new Map()}
      />,
    );

    expect(screen.getByText("▽")).toBeInTheDocument();
    expect(screen.getByText("MO(2)")).toBeInTheDocument();
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("marks only the changed keys", () => {
    const { container } = render(
      <KeymapLayerPreview
        positions={positions}
        bindings={[{ type: "trans" }, { type: "trans" }, { type: "trans" }]}
        changes={
          new Map([[1, { from: { type: "trans" }, to: { type: "none" } }]])
        }
      />,
    );

    // The highlight is what makes "three keys changed" visible at a glance.
    const highlighted = container.querySelectorAll("[class*='color-neon']");
    expect(highlighted.length).toBeGreaterThan(0);
  });
});
