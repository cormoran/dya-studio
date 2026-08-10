import { act, render, screen } from "@testing-library/react";
import { BrowserKeyInputOverlay } from "../BrowserKeyInputOverlay";

describe("BrowserKeyInputOverlay", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const press = (key: string, code?: string) => {
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key, code }));
    });
  };

  it("shows browser key input with readable names while enabled", () => {
    render(<BrowserKeyInputOverlay />);

    press("a", "KeyA");
    press("Shift", "ShiftLeft");
    press(" ", "Space");
    press("Enter", "Enter");
    press("Dead", "Quote");

    expect(screen.getByTestId("browser-key-input-overlay")).toHaveTextContent(
      "a ⇧ ␣ ↵ Quote",
    );
  });

  it("removes the oldest key even while newer input continues", () => {
    render(<BrowserKeyInputOverlay />);

    press("a");
    act(() => {
      jest.advanceTimersByTime(200);
    });
    press("b");

    act(() => {
      jest.advanceTimersByTime(2_800);
    });
    expect(screen.getByTestId("browser-key-input-overlay")).toHaveTextContent(
      "b",
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.queryByTestId("browser-key-input-overlay")).toBeNull();
  });

  it("removes its browser listener when unmounted", () => {
    const { unmount } = render(<BrowserKeyInputOverlay />);
    unmount();

    press("a");

    expect(screen.queryByTestId("browser-key-input-overlay")).toBeNull();
  });
});
