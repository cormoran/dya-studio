import { render, screen } from "@testing-library/react";
import { InertiaPreviewGraph } from "../InertiaPreviewGraph";
import type { InputProcessor } from "../../../hooks/useRuntimeInputProcessor";
jest.mock("../../../hooks/useLanguage", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));
const processor = {
  scaleMultiplier: 1,
  scaleDivisor: 1,
  inertia: {
    inertiaEnabled: false,
    inertiaWindowMs: 200,
    inertiaIntervalMs: 20,
    inertiaThreshold: 10,
    inertiaDecayPercent: 8,
    inertiaNormalMaxOutput: 0,
    inertiaFastThreshold: 20,
    inertiaFastOutputPercent: 200,
  },
} as InputProcessor;
it("keeps the fixed example independent of live activity and updates for settings", () => {
  const { rerender } = render(<InertiaPreviewGraph processor={processor} />);
  const chart = screen.getByRole("img", {
    name: "Five-second input and simulated output",
  });
  const paths = () =>
    Array.from(chart.querySelectorAll("path[data-series]"), (p) =>
      p.getAttribute("d"),
    );
  const initial = paths();
  const inputPath = chart
    .querySelector('[data-series="input"]')!
    .getAttribute("d")!;
  expect(inputPath).toContain(" Q");
  expect(inputPath).toMatch(/ V[\d.]+ H580$/);
  const normalPath = chart
    .querySelector('[data-series="normal"]')!
    .getAttribute("d")!;
  expect(normalPath.match(/ L/g)).toHaveLength(75);
  // Only the abrupt physical cutoff is vertical; integer ticks are not stairs.
  expect(normalPath.match(/ V/g)).toHaveLength(1);
  expect(normalPath).not.toContain("NaN");
  expect(chart.textContent).toContain("5 s");
  rerender(
    <InertiaPreviewGraph
      processor={{ ...processor, inertiaActive: true, inertiaFastInput: true }}
    />,
  );
  expect(paths()).toEqual(initial);
  rerender(
    <InertiaPreviewGraph
      processor={{
        ...processor,
        inertia: { ...processor.inertia!, inertiaDecayPercent: 100 },
      }}
    />,
  );
  expect(paths()).not.toEqual(initial);
});

it("draws distinct smooth comparisons for scroll scaling", () => {
  const { container } = render(
    <InertiaPreviewGraph
      processor={{
        ...processor,
        scaleMultiplier: 1,
        scaleDivisor: 60,
        inertia: {
          ...processor.inertia!,
          inertiaWindowMs: 300,
          inertiaFastThreshold: 15,
          inertiaFastOutputPercent: 300,
        },
      }}
    />,
  );
  expect(
    container.querySelector('[data-series="normal"]')!.getAttribute("d"),
  ).not.toBe(
    container.querySelector('[data-series="fast"]')!.getAttribute("d"),
  );
  expect(container.textContent).toContain("2400 / 20 ms");
});
