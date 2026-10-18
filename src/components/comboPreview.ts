import type { KeyPhysicalAttrs } from "../hooks/useKeymap";

export type Point = { x: number; y: number };

export function corners(key: KeyPhysicalAttrs): Point[] {
  const points = [
    { x: key.x, y: key.y },
    { x: key.x + key.width, y: key.y },
    { x: key.x + key.width, y: key.y + key.height },
    { x: key.x, y: key.y + key.height },
  ];
  if (!key.r) return points;
  const radians = (key.r / 100) * (Math.PI / 180);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return points.map(({ x, y }) => ({
    x: key.rx + (x - key.rx) * cos - (y - key.ry) * sin,
    y: key.ry + (x - key.rx) * sin + (y - key.ry) * cos,
  }));
}

/** Center of the shared edge of two touching keys, including rotated keys. */
export function adjacentComboCenter(
  keys: KeyPhysicalAttrs[],
  positions: number[],
): Point | null {
  if (positions.length !== 2) return null;
  const first = keys[positions[0]];
  const second = keys[positions[1]];
  if (!first || !second) return null;

  const a = corners(first);
  const b = corners(second);
  for (let i = 0; i < 4; i++) {
    const start = a[i];
    const end = a[(i + 1) % 4];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length === 0) continue;
    const ux = (end.x - start.x) / length;
    const uy = (end.y - start.y) / length;
    for (let j = 0; j < 4; j++) {
      const otherStart = b[j];
      const otherEnd = b[(j + 1) % 4];
      const otherLength = Math.hypot(
        otherEnd.x - otherStart.x,
        otherEnd.y - otherStart.y,
      );
      if (otherLength === 0) continue;
      const vx = (otherEnd.x - otherStart.x) / otherLength;
      const vy = (otherEnd.y - otherStart.y) / otherLength;
      if (Math.abs(ux * vy - uy * vx) > 0.01) continue;

      const distanceStart = Math.abs(
        (otherStart.x - start.x) * uy - (otherStart.y - start.y) * ux,
      );
      const distanceEnd = Math.abs(
        (otherEnd.x - start.x) * uy - (otherEnd.y - start.y) * ux,
      );
      if (distanceStart > 2 || distanceEnd > 2) continue;

      const t0 = (otherStart.x - start.x) * ux + (otherStart.y - start.y) * uy;
      const t1 = (otherEnd.x - start.x) * ux + (otherEnd.y - start.y) * uy;
      const from = Math.max(0, Math.min(t0, t1));
      const to = Math.min(length, Math.max(t0, t1));
      if (to - from <= 2) continue;
      const middle = (from + to) / 2;
      return { x: start.x + ux * middle, y: start.y + uy * middle };
    }
  }
  return null;
}

/** Two-key combos without a shared edge still need a movable preview control. */
export function comboPreviewCenter(
  keys: KeyPhysicalAttrs[],
  positions: number[],
): Point | null {
  const adjacent = adjacentComboCenter(keys, positions);
  if (adjacent) return adjacent;
  if (positions.length !== 2 || positions.some((position) => !keys[position]))
    return null;
  const points = positions.flatMap((position) => corners(keys[position]));
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / 8,
    y: points.reduce((sum, point) => sum + point.y, 0) / 8,
  };
}

/** Positive-area overlap of the 0.5U combo control and rotated physical keys. */
export function comboDropPositions(
  keys: KeyPhysicalAttrs[],
  center: Point,
): number[] {
  const box = [
    { x: center.x - 25, y: center.y - 25 },
    { x: center.x + 25, y: center.y - 25 },
    { x: center.x + 25, y: center.y + 25 },
    { x: center.x - 25, y: center.y + 25 },
  ];
  return keys.flatMap((key, position) => {
    const polygon = corners(key);
    const overlaps = [...polygon, ...box].every((point, index) => {
      const next = index < 4 ? polygon[(index + 1) % 4] : box[(index - 3) % 4];
      const axis = { x: -(next.y - point.y), y: next.x - point.x };
      if (!axis.x && !axis.y) return true;
      const a = polygon.map((p) => p.x * axis.x + p.y * axis.y);
      const b = box.map((p) => p.x * axis.x + p.y * axis.y);
      return (
        Math.min(Math.max(...a), Math.max(...b)) -
          Math.max(Math.min(...a), Math.min(...b)) >
        0.01
      );
    });
    return overlaps ? [position] : [];
  });
}
