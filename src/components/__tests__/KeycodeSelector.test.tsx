import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeycodeSelector } from "../KeycodeSelector";
import { KeycodeValueSelector } from "../KeycodeValueSelector";
import { BEHAVIORS } from "../../lib/transport/behaviors";

beforeEach(() => localStorage.clear());

it("defaults to the keyboard layout with collapsed modifiers and no search", async () => {
  const user = userEvent.setup();
  render(<KeycodeValueSelector value={0x70004} onChange={jest.fn()} compact />);
  expect(
    screen.getByRole("button", { name: "Show keycodes by category" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByPlaceholderText("Search keycodes..."),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "LCtrl" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Modifiers" }));
  expect(screen.getByRole("button", { name: "LCtrl" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Modifiers" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(screen.queryByText("Modifiers:")).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Show keycodes by category" }),
  );
  await user.type(screen.getByPlaceholderText("Search keycodes..."), "Enter");
  await user.click(screen.getByRole("button", { name: "Show key layout" }));
  expect(
    screen.queryByPlaceholderText("Search keycodes..."),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "A", exact: true }),
  ).toBeInTheDocument();
});

it("toggles search in keyboard-layout mode and returns to the keyboard when hidden", async () => {
  const user = userEvent.setup();
  render(<KeycodeValueSelector compact value={0x70004} onChange={jest.fn()} />);
  const toggle = screen.getByRole("button", { name: "Search keycodes..." });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  await user.click(toggle);
  const input = screen.getByPlaceholderText("Search keycodes...");
  await user.type(input, "Enter");
  expect(
    screen.queryByRole("button", { name: "A", exact: true }),
  ).not.toBeInTheDocument();
  await user.click(toggle);
  expect(
    screen.queryByPlaceholderText("Search keycodes..."),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "A", exact: true }),
  ).toBeInTheDocument();
});

it("commits a complete numeric value with Enter instead of advancing while typing", async () => {
  const user = userEvent.setup();
  const onSelect = jest.fn();
  render(
    <KeycodeSelector
      open
      presentation="floating"
      onClose={jest.fn()}
      onSelect={onSelect}
      currentBinding={{ behaviorId: 1, param1: 0, param2: 0 }}
      behaviors={
        new Map([
          [
            1,
            {
              id: 1,
              displayName: "Custom",
              metadata: [
                {
                  param1: [{ name: "Value", range: { min: 0, max: 1000 } }],
                  param2: [],
                },
              ],
            },
          ],
        ])
      }
      layers={[]}
    />,
  );
  expect(screen.queryByText("Select Keymap")).not.toBeInTheDocument();
  const input = screen.getByRole("spinbutton");
  await user.clear(input);
  await user.type(input, "123");
  expect(onSelect).not.toHaveBeenCalled();
  await user.keyboard("{Enter}");
  expect(onSelect).toHaveBeenCalledWith({
    behaviorId: 1,
    param1: 123,
    param2: 0,
  });
  expect(
    screen.queryByRole("button", { name: "Apply and next" }),
  ).not.toBeInTheDocument();
});

it("waits for the second parameter before selecting a layer-tap binding", async () => {
  const user = userEvent.setup();
  const onSelect = jest.fn();
  const onClose = jest.fn();
  render(
    <KeycodeSelector
      open
      presentation="floating"
      onClose={onClose}
      onSelect={onSelect}
      currentBinding={{ behaviorId: 29, param1: 0, param2: 0x70004 }}
      behaviors={new Map(BEHAVIORS.map((behavior) => [behavior.id, behavior]))}
      layers={[
        { id: 0, name: "Base" },
        { id: 1, name: "Lower" },
      ]}
    />,
  );
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: /Lower/ }),
  );
  expect(onSelect).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "B", exact: true }));
  expect(onSelect).toHaveBeenCalledWith({
    behaviorId: 29,
    param1: 1,
    param2: 0x70005,
  });
  expect(onClose).not.toHaveBeenCalled();
});

it("uses the keycode control row for parameters and collapses modal modifiers on mobile", () => {
  const keypress = BEHAVIORS.find(
    (behavior) => behavior.displayName === "Key Press",
  )!;
  render(
    <KeycodeSelector
      open
      onClose={jest.fn()}
      onSelect={jest.fn()}
      currentBinding={{ behaviorId: keypress.id, param1: 0x70004, param2: 0 }}
      behaviors={new Map([[keypress.id, keypress]])}
      layers={[]}
    />,
  );
  expect(screen.getByPlaceholderText("Search keycodes...")).toBeInTheDocument();
  expect(screen.getByText("Select Keymap")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Modifiers", exact: true }),
  ).toHaveClass("tablet:hidden");
  expect(
    screen.getByRole("button", { name: "LCtrl", exact: true }).parentElement
      ?.parentElement,
  ).toHaveClass("hidden", "tablet:flex");
  expect(
    screen.getByRole("button", { name: /param1:/ }).parentElement
      ?.parentElement,
  ).toHaveClass("h-7", "mb-2", "flex");
  expect(screen.getByText("Modifiers:")).toBeInTheDocument();
  expect(screen.getByText("param1 - Select Key")).toBeInTheDocument();
});
