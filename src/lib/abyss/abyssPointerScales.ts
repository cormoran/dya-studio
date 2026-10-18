import type { KeymapDiff } from "./abyssDiff";

/** Recover small exact firmware fractions that adapter-zmk rounds to /1000. */
export function abyssPointerScaleCorrections(diff: KeymapDiff) {
  const corrections: { id: number; multiplier: number; divisor: number }[] = [];
  for (const change of diff.moduleChanges) {
    if (change.scope !== "global") continue;
    const target = change.to as
      | {
          type?: string;
          scaleX?: number;
          scaleY?: number;
          firmwareDialect?: {
            zmk?: { cormoran_rip?: { processorId?: number } };
          };
        }
      | undefined;
    if (target?.type !== "trackball" && target?.type !== "touch_pad") continue;
    const scale = target.scaleX ?? target.scaleY ?? 1;
    const id = target.firmwareDialect?.zmk?.cormoran_rip?.processorId;
    const previous = change.from as
      | { scaleX?: number; scaleY?: number }
      | undefined;
    if (
      id === undefined ||
      !Number.isFinite(scale) ||
      scale <= 0 ||
      (previous?.scaleX ?? previous?.scaleY ?? 1) === scale ||
      Math.round(scale * 1000) / 1000 === scale
    )
      continue;
    for (let divisor = 1; divisor <= 1000; divisor += 1) {
      const multiplier = Math.round(scale * divisor);
      if (
        multiplier > 0 &&
        multiplier <= 32767 &&
        multiplier / divisor === scale
      ) {
        corrections.push({ id, multiplier, divisor });
        break;
      }
    }
  }
  return corrections;
}
