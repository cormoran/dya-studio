/**
 * Tests for PhysicalKey — focused on the changed-from-default affordances
 * (the hover reset-to-default button). Other states (modified, selected,
 * highlighted) are exercised indirectly through KeymapPage.
 */
import { act, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhysicalKey } from "../PhysicalKey";

const attrs = { width: 100, height: 100, x: 0, y: 0, r: 0, rx: 0, ry: 0 };

function renderKey(overrides = {}) {
  const props = {
    attrs,
    keyPosition: 0,
    isModified: false,
    displayName: "A",
    isSelected: false,
    onClick: jest.fn(),
    onReset: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<PhysicalKey {...props} />) };
}

describe("PhysicalKey — changed from default", () => {
  it("reveals a reset-to-default button on hover and calls onResetToDefault", () => {
    const onResetToDefault = jest.fn();
    renderKey({
      isChangedFromDefault: true,
      defaultDisplayName: "B",
      onResetToDefault,
    });

    // Hidden until hovered.
    expect(screen.queryByTitle("Reset to default")).not.toBeInTheDocument();

    // mouseenter doesn't bubble, so fire it on the key container itself.
    const keyEl = screen.getByText("A").closest("div")!;
    fireEvent.mouseEnter(keyEl);

    const resetBtn = screen.getByTitle("Reset to default");
    fireEvent.click(resetBtn);
    expect(onResetToDefault).toHaveBeenCalledTimes(1);
  });

  it("does not show the reset-to-default button when the key is modified", () => {
    renderKey({
      isModified: true,
      isChangedFromDefault: false,
      onResetToDefault: jest.fn(),
    });

    const keyEl = screen.getByText("A").closest("div")!;
    fireEvent.mouseEnter(keyEl);

    // The modified state shows the reset-to-original button instead.
    expect(screen.queryByTitle("Reset to default")).not.toBeInTheDocument();
    expect(screen.getByTitle("Reset to original")).toBeInTheDocument();
  });
});

describe("PhysicalKey — accessible interaction", () => {
  it("exposes the key position and binding as a native button name", () => {
    renderKey({ keyPosition: 12, longDisplayName: "Keyboard A" });

    const key = screen.getByRole("button", {
      name: "Key position 12: Keyboard A",
    });
    expect(key).toHaveAttribute("data-key-position", "12");
    expect(key).toHaveAttribute("data-binding-label", "Keyboard A");
  });

  it("can be activated from the keyboard", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    renderKey({ onClick });

    const key = screen.getByRole("button", { name: "Key position 0: A" });
    act(() => key.focus());
    await user.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keeps the reset action as a separately named button", () => {
    renderKey({ isModified: true });

    fireEvent.mouseEnter(
      screen.getByRole("button", { name: "Key position 0: A" }).parentElement!,
    );

    expect(
      screen.getByRole("button", {
        name: "Reset key position 0 to original",
      }),
    ).toBeInTheDocument();
  });
});
