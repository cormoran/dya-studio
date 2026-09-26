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
