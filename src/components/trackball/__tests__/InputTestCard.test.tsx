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
  it("moves the window by dragging its header", () => {
    render(<InputTestCard processor={processor} />);
    const panel = screen.getByRole("region", { name: "Input test" });
    const header = screen.getByRole("heading", {
      name: "Input test",
    }).parentElement!;
    const rect = {
      x: 200,
      y: 100,
      left: 200,
      top: 100,
      right: 800,
      bottom: 600,
      width: 600,
      height: 500,
      toJSON: () => ({}),
    };
    jest.spyOn(panel, "getBoundingClientRect").mockReturnValue(rect);
    jest
      .spyOn(header, "getBoundingClientRect")
      .mockReturnValue({ ...rect, height: 24 });
    Object.assign(header, { setPointerCapture: jest.fn() });
    fireEvent(
      header,
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: 300,
        clientY: 110,
      }),
    );
    fireEvent(
      header,
      new MouseEvent("pointermove", {
        bubbles: true,
        clientX: 350,
        clientY: 150,
      }),
    );
    expect(panel).toHaveStyle({ left: "250px", top: "140px" });
    fireEvent(header, new MouseEvent("pointerup", { bubbles: true }));
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
      fireEvent.mouseDown(area, { button: 2 });
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
