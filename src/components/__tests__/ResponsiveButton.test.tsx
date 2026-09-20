import { act, fireEvent, render, screen } from "@testing-library/react";
import { ResponsiveButton } from "../ResponsiveButton";
import { EditorTooltip } from "../EditorTooltip";
import * as Popover from "@radix-ui/react-popover";

function touch(target: Element, type: string, clientX = 10) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerType: "touch", clientX, clientY: 10 });
  fireEvent(target, event);
}

describe("ResponsiveButton touch help", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(async () => {
    try {
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("keeps an accessible name and executes a short tap once", () => {
    const onClick = jest.fn();
    render(
      <ResponsiveButton label="Save" onClick={onClick}>
        <svg />
      </ResponsiveButton>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    touch(button, "pointerdown");
    act(() => jest.advanceTimersByTime(100));
    touch(button, "pointerup");
    fireEvent.click(button);
    act(() => jest.advanceTimersByTime(600));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows help on long press without executing the action, then allows the next tap", () => {
    const onClick = jest.fn();
    render(
      <ResponsiveButton label="Save" title="Save to keyboard" onClick={onClick}>
        <svg />
      </ResponsiveButton>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    touch(button, "pointerdown");
    act(() => jest.advanceTimersByTime(550));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Save to keyboard");
    touch(button, "pointerup");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    touch(button, "pointerdown");
    touch(button, "pointerup");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each(["pointermove", "pointercancel"])("cancels help on %s", (type) => {
    render(
      <ResponsiveButton label="Save">
        <svg />
      </ResponsiveButton>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    touch(button, "pointerdown");
    touch(button, type, 50);
    act(() => jest.advanceTimersByTime(600));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows help for unavailable actions and dismisses it on an outside touch", () => {
    render(
      <ResponsiveButton label="Save" disabled>
        <svg />
      </ResponsiveButton>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    touch(button, "pointerdown");
    act(() => jest.advanceTimersByTime(550));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Save");
    touch(button, "pointerup");
    touch(document.body, "pointerdown");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it("opens information on tap and closes it with Escape", () => {
    render(
      <EditorTooltip tapToOpen content="More details">
        <button>Info</button>
      </EditorTooltip>,
    );
    const button = screen.getByRole("button", { name: "Info" });
    touch(button, "pointerdown");
    touch(button, "pointerup");
    fireEvent.click(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent("More details");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("preserves menu trigger behavior without opening the menu on a long press", () => {
    render(
      <Popover.Root>
        <Popover.Trigger asChild>
          <ResponsiveButton label="Reset">
            <svg />
          </ResponsiveButton>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content role="menu">Saved versions</Popover.Content>
        </Popover.Portal>
      </Popover.Root>,
    );
    const button = screen.getByRole("button", { name: "Reset" });
    touch(button, "pointerdown");
    act(() => jest.advanceTimersByTime(550));
    touch(button, "pointerup");
    fireEvent.click(button);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    touch(button, "pointerdown");
    touch(button, "pointerup");
    fireEvent.click(button);
    expect(screen.getByRole("menu")).toHaveTextContent("Saved versions");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
