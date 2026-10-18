import { abyssPointerScaleCorrections } from "../abyssPointerScales";
import { EMPTY_DIFF } from "../abyssDiff";
function diff(scaleX: number, before = 1) {
  return {
    ...EMPTY_DIFF,
    moduleChanges: [
      {
        scope: "global" as const,
        moduleName: "scroll",
        from: { scaleX: before },
        to: {
          name: "scroll",
          type: "trackball",
          scaleX,
          scaleY: scaleX,
          firmwareDialect: { zmk: { cormoran_rip: { processorId: 1 } } },
        },
      },
    ],
  };
}
it("preserves exact scroll fractions rather than adapter decimal rounding", () => {
  expect(abyssPointerScaleCorrections(diff(1 / 60))).toEqual([
    { id: 1, multiplier: 1, divisor: 60 },
  ]);
  expect(abyssPointerScaleCorrections(diff(1 / 120))).toEqual([
    { id: 1, multiplier: 1, divisor: 120 },
  ]);
});
it("does not rewrite unchanged or already exact scales", () => {
  expect(abyssPointerScaleCorrections(diff(1.2))).toEqual([]);
  expect(abyssPointerScaleCorrections(diff(1 / 60, 1 / 60))).toEqual([]);
  expect(
    abyssPointerScaleCorrections({ ...EMPTY_DIFF, moduleChanges: [] }),
  ).toEqual([]);
});
