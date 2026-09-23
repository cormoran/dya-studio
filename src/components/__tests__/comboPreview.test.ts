import { adjacentComboCenter } from "../comboPreview";
import type { KeyPhysicalAttrs } from "../../hooks/useKeymap";

const key = (x: number, y: number, r = 0): KeyPhysicalAttrs => ({
  x,
  y,
  width: 100,
  height: 100,
  r,
  rx: x,
  ry: y,
});

describe("adjacentComboCenter", () => {
  const keys = [key(0, 0), key(100, 0), key(0, 100), key(300, 0)];

  it("places horizontal and vertical combos on the shared edge", () => {
    expect(adjacentComboCenter(keys, [0, 1])).toEqual({ x: 100, y: 50 });
    expect(adjacentComboCenter(keys, [0, 2])).toEqual({ x: 50, y: 100 });
  });

  it("uses badges for distant, multi-key and invalid combos", () => {
    expect(adjacentComboCenter(keys, [0, 3])).toBeNull();
    expect(adjacentComboCenter(keys, [0, 1, 2])).toBeNull();
    expect(adjacentComboCenter(keys, [0, 9])).toBeNull();
  });

  it("finds the shared edge when both keys rotate together", () => {
    const rotated = [
      { ...key(0, 0, 9000), rx: 0, ry: 0 },
      { ...key(100, 0, 9000), rx: 0, ry: 0 },
    ];
    const center = adjacentComboCenter(rotated, [0, 1]);
    expect(center?.x).toBeCloseTo(-50);
    expect(center?.y).toBeCloseTo(100);
  });
});
