import { act, fireEvent, render, screen } from "@testing-library/react";
import { InertiaCard } from "../InertiaCard";
import type { InputProcessor } from "../../../hooks/useRuntimeInputProcessor";
jest.mock("../../../hooks/useLanguage", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));
const processor = {
  id: 0,
  inertia: {
    inertiaEnabled: false,
    inertiaWindowMs: 200,
    inertiaIntervalMs: 20,
    inertiaThreshold: 10,
    inertiaDecayPercent: 8,
    inertiaNormalMaxOutput: 0,
    inertiaFastThreshold: 0,
    inertiaFastOutputPercent: 200,
  },
} as InputProcessor;
describe("inertia editing", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it("coalesces valid edits while disabled, cancels invalid edits, and does not transfer queued values to another processor", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <InertiaCard key={0} processor={processor} setInertia={save} />,
    );
    fireEvent.change(screen.getByLabelText("Output Interval (ms)"), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText("Output Interval (ms)"), {
      target: { value: "30" },
    });
    await act(async () => jest.advanceTimersByTimeAsync(1500));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith(0, "inertiaIntervalMs", 30);
    fireEvent.change(screen.getByLabelText("Input Threshold"), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText("Input Threshold"), {
      target: { value: "0" },
    });
    await act(async () => jest.advanceTimersByTimeAsync(1500));
    expect(save).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("Fast Input Threshold"), {
      target: { value: "100" },
    });
    rerender(
      <InertiaCard
        key={1}
        processor={{ ...processor, id: 1 }}
        setInertia={save}
      />,
    );
    await act(async () => jest.advanceTimersByTimeAsync(1500));
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Fast Input Threshold")).toHaveValue(0);
  });
  it("shows unsupported without editors", () => {
    render(
      <InertiaCard
        processor={{ ...processor, inertia: undefined }}
        setInertia={jest.fn()}
      />,
    );
    expect(
      screen.getByText("Inertia is not supported by this device"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
});
