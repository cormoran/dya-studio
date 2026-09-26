import { render, screen, fireEvent, act } from "@testing-library/react";
import { InputTestCard } from "../InputTestCard";
import type { InputProcessor } from "../../../hooks/useRuntimeInputProcessor";
jest.mock("../../../hooks/useLanguage", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));
const processor = { id: 0 } as InputProcessor;

describe("finite input test area", () => {
  it("consumes wheel input, fixes disabled axes at the current position", () => {
    render(<InputTestCard processor={processor} />);
    const area = screen.getByRole("region", { name: "Finite input test area" });
    expect(area.firstElementChild).toHaveStyle({
      width: "24000px",
      height: "24000px",
    });
    const initialX = area.scrollLeft,
      initialY = area.scrollTop;
    fireEvent.wheel(area, { deltaX: 30, deltaY: 50 });
    expect(area.scrollLeft).toBe(initialX + 30);
    expect(area.scrollTop).toBe(initialY + 50);
    fireEvent.click(screen.getByLabelText("Horizontal scroll"));
    fireEvent.wheel(area, { deltaX: 60, deltaY: 70 });
    expect(area.scrollLeft).toBe(initialX + 30);
    expect(area.scrollTop).toBe(initialY + 120);
    fireEvent.click(screen.getByLabelText("Vertical scroll"));
    const wheel = new WheelEvent("wheel", {
      deltaX: 50,
      deltaY: 50,
      cancelable: true,
    });
    act(() => area.dispatchEvent(wheel));
    expect(wheel.defaultPrevented).toBe(true);
    expect(area.scrollTop).toBe(initialY + 120);
    expect(
      screen.queryByLabelText("Show inertia activity"),
    ).not.toBeInTheDocument();
  });
  it("requests mouse capture from a click and falls back gracefully when unavailable", async () => {
    render(<InputTestCard processor={processor} />);
    const area = screen.getByRole("region", { name: "Finite input test area" });
    const request = jest.fn().mockRejectedValue(new Error("not supported"));
    Object.assign(area, { requestPointerLock: request });
    await act(async () => fireEvent.click(area));
    expect(request).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Scrolling still works",
    );
    fireEvent.wheel(area, { deltaY: 20 });
    expect(screen.getByText(/Scroll Δ X: 0, Y: 20/)).toBeInTheDocument();
  });
  it("releases pointer lock with either mouse button", async () => {
    render(<InputTestCard processor={processor} />);
    const area = screen.getByRole("region", { name: "Finite input test area" });
    const original = Object.getOwnPropertyDescriptor(
      document,
      "pointerLockElement",
    );
    const originalExit = document.exitPointerLock;
    const exit = jest.fn();
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      value: area,
    });
    document.exitPointerLock = exit;
    try {
      await act(async () => fireEvent.click(area));
      fireEvent.contextMenu(area);
      expect(exit).toHaveBeenCalledTimes(2);
    } finally {
      if (original)
        Object.defineProperty(document, "pointerLockElement", original);
      else Reflect.deleteProperty(document, "pointerLockElement");
      document.exitPointerLock = originalExit;
    }
  });
  it("shows reported Fast input and stop reason without inferring them from wheel input", () => {
    const modern = {
      ...processor,
      inertia: {},
      inertiaNotificationsEnabled: true,
      inertiaActive: true,
      inertiaFastInput: true,
    } as InputProcessor;
    const { rerender } = render(<InputTestCard processor={modern} />);
    expect(screen.getByText("Fast input")).toBeInTheDocument();
    rerender(
      <InputTestCard
        processor={{
          ...modern,
          inertiaActive: false,
          inertiaFastInput: false,
          inertiaStopReason: 3,
        }}
      />,
    );
    expect(screen.getByText("Inertia idle")).toBeInTheDocument();
    expect(screen.getByText("Reverse input")).toBeInTheDocument();
  });
});
