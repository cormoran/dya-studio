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
    press(" ", "Space");
    press("Dead", "Quote");

    expect(screen.getByTestId("browser-key-input-overlay")).toHaveTextContent(
      "a Space Quote",
    );
  });

  it("removes the oldest key first after input is idle", () => {
    render(<BrowserKeyInputOverlay />);

    press("a");
    press("b");

    act(() => {
      jest.advanceTimersByTime(1_650);
    });
    expect(screen.getByTestId("browser-key-input-overlay")).toHaveTextContent(
      "b",
    );

    act(() => {
      jest.advanceTimersByTime(150);
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
