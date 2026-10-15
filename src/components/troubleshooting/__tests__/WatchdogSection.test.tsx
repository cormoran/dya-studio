import { fireEvent, render, screen } from "@testing-library/react";
import { WatchdogSection } from "../WatchdogSection";
import type { UseWatchdogReturn } from "../../../hooks/useWatchdog";
import {
  Incident,
  StatusResponse,
} from "../../../proto/cormoran/watchdog/watchdog";

function watchdog(
  overrides: Partial<UseWatchdogReturn> = {},
): UseWatchdogReturn {
  return {
    isAvailable: true,
    source: 0,
    setSource: jest.fn(),
    status: StatusResponse.create({ capacity: 16 }),
    incidents: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    deleteOne: jest.fn(),
    deleteAll: jest.fn(),
    ...overrides,
  };
}
function expand() {
  fireEvent.click(screen.getByRole("button", { name: "Stability (Watchdog)" }));
}
it("shows health only for a completed successful empty read", () => {
  render(<WatchdogSection watchdog={watchdog()} />);
  expect(screen.getByText("No incidents")).toBeInTheDocument();
  expand();
  expect(
    screen.getByText("No incidents recorded — your keyboard looks stable."),
  ).toBeInTheDocument();
  expect(screen.getByText(/^Capacity:/)).toHaveTextContent("16");
});
it.each([
  { isLoading: true },
  { error: "Peripheral unsupported" },
  { status: null },
  { isAvailable: false },
])(
  "does not show healthy summaries or statistics without a successful read: %p",
  (overrides) => {
    render(<WatchdogSection watchdog={watchdog(overrides)} />);
    expect(screen.queryByText("No incidents")).not.toBeInTheDocument();
    expand();
    expect(
      screen.queryByText("No incidents recorded — your keyboard looks stable."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^Capacity:/)).not.toBeInTheDocument();
    if (overrides.error)
      expect(screen.getByText(overrides.error)).toBeInTheDocument();
    if (overrides.isLoading)
      expect(screen.getByText("Loading")).toBeInTheDocument();
    if (overrides.isAvailable === false)
      expect(
        screen.getByRole("link", { name: "cormoran/zmk-feature-watchdog" }),
      ).toBeInTheDocument();
  },
);
it("keeps source switching available while loading", () => {
  const setSource = jest.fn();
  render(
    <WatchdogSection
      watchdog={watchdog({ isLoading: true, source: 1, setSource })}
    />,
  );
  expand();
  fireEvent.click(screen.getByRole("button", { name: "Central" }));
  expect(setSource).toHaveBeenCalledWith(0);
  expect(
    screen.getByRole("button", { name: "Refresh incidents" }),
  ).toBeDisabled();
});
it("keeps row deletion and delete-all cancellation/confirmation behavior", () => {
  const data = watchdog({ incidents: [Incident.create({ id: 7 })] });
  render(<WatchdogSection watchdog={data} />);
  expand();
  fireEvent.click(screen.getByRole("button", { name: "Delete incident 7" }));
  expect(data.deleteOne).toHaveBeenCalledWith(7);
  fireEvent.click(screen.getByRole("button", { name: "Delete all" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(data.deleteAll).not.toHaveBeenCalled();
  expect(screen.getByText("7")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete all" }));
  fireEvent.click(
    screen.getAllByRole("button", { name: "Delete all" }).at(-1)!,
  );
  expect(data.deleteAll).toHaveBeenCalledTimes(1);
});
