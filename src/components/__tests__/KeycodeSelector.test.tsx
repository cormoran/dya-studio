import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeycodeSelector } from "../KeycodeSelector";
import { KeycodeValueSelector } from "../KeycodeValueSelector";
import { BEHAVIORS } from "../../lib/transport/behaviors";
import { getBehaviorMetadata } from "../../lib/behaviorMetadata";
import { translate } from "../../i18n/translations";
import { combineWithModifiers, MODIFIER_FLAGS } from "../../lib/keycodes";

beforeEach(() => localStorage.clear());

it("localizes every standard behavior parameter explanation", () => {
  const names = [
    "Key Press",
    "Momentary Layer",
    "To Layer",
    "Toggle Layer",
    "Layer-Tap",
    "Mod-Tap",
    "Runtime Macro",
    "Key Toggle",
    "Sticky Key",
    "Sticky Layer",
    "Mouse Key Press",
    "Mouse Move",
    "Mouse Scroll",
    "Bluetooth",
    "Output Selection",
  ];
  for (const name of names) {
    const metadata = getBehaviorMetadata(name)!;
    for (const description of [
      metadata.param1Description,
      metadata.param2Description,
    ]) {
      if (!description) continue;
      expect(translate("ja", description)).not.toBe(description);
      expect(translate("zh", description)).not.toBe(description);
    }
  }
});

it("defaults to the keyboard layout with collapsed modifiers and no search", async () => {
  const user = userEvent.setup();
  render(<KeycodeValueSelector value={0x70004} onChange={jest.fn()} compact />);
  expect(
    screen.getByRole("button", { name: "Show keycodes by category" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Show keycodes by category" }),
  ).toHaveClass(
    "text-[var(--color-text-muted)]",
    "border-[var(--color-border)]",
  );
  expect(
    screen.getByText(
      "For other keys, use the category button at the top right",
    ),
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

it("starts with the keyboard layout even after category mode was previously saved", () => {
  localStorage.setItem("keycodeSelectorViewModeV2", "category");
  render(<KeycodeValueSelector compact value={0x70004} onChange={jest.fn()} />);
  expect(
    screen.getByRole("button", { name: "Show keycodes by category" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "For other keys, use the category button at the top right",
    ),
  ).toBeInTheDocument();
});

it("shows selected modifiers with the purple toggle without listing their names", async () => {
  const user = userEvent.setup();
  const modifier = MODIFIER_FLAGS[0];
  render(
    <KeycodeValueSelector
      compact
      value={combineWithModifiers(0x70004, modifier.value)}
      onChange={jest.fn()}
    />,
  );
  const toggle = screen.getByRole("button", { name: "Modifiers", exact: true });
  expect(toggle).toHaveTextContent("Modifiers");
  expect(toggle).not.toHaveTextContent(modifier.label);
  expect(toggle).toHaveClass(
    "border-[var(--color-cyber)]",
    "text-[var(--color-cyber)]",
  );
  await user.click(toggle);
  expect(screen.getByRole("button", { name: modifier.label })).toHaveClass(
    "border-[var(--color-cyber)]",
  );
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
    screen
      .getByRole("button", { name: "LCtrl", exact: true })
      .closest("[class~='tablet:flex']"),
  ).toHaveClass("hidden", "tablet:flex");
  expect(
    screen.getByRole("button", { name: /Key:/ }).parentElement?.parentElement,
  ).toHaveClass("h-7", "mb-2", "flex");
  expect(screen.getByText("Modifiers:")).toBeInTheDocument();
  expect(screen.getByTestId("active-param-description")).toHaveTextContent(
    "Key to press",
  );
  expect(screen.queryByText("param1 - Select Key")).not.toBeInTheDocument();
});

it("explains both layer-tap parameters and uses firmware parameter names", async () => {
  const user = userEvent.setup();
  const layerTap = BEHAVIORS.find(
    (behavior) => behavior.displayName === "Layer-Tap",
  )!;
  render(
    <KeycodeSelector
      open
      presentation="floating"
      onClose={jest.fn()}
      onSelect={jest.fn()}
      currentBinding={{ behaviorId: layerTap.id, param1: 0, param2: 0x70004 }}
      behaviors={new Map([[layerTap.id, layerTap]])}
      layers={[{ id: 0, name: "Base" }]}
    />,
  );
  expect(screen.getByRole("button", { name: /Layer:/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Key:/ })).toBeInTheDocument();
  expect(screen.getByTestId("active-param-description")).toHaveTextContent(
    "Layer active while held",
  );
  expect(screen.queryByText("Key sent on tap")).not.toBeInTheDocument();
  expect(screen.getByText("Layer on hold, key on tap")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /Key:/ }));
  expect(screen.getByTestId("active-param-description")).toHaveTextContent(
    "Key sent on tap",
  );
  expect(screen.queryByText("Layer active while held")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Key:/ })).toHaveClass(
    "border-[var(--color-electric)]",
  );
});

it("uses firmware parameter names and type guidance for an unknown behavior", () => {
  render(
    <KeycodeSelector
      open
      onClose={jest.fn()}
      onSelect={jest.fn()}
      currentBinding={{ behaviorId: 42, param1: 0, param2: 0 }}
      behaviors={
        new Map([
          [
            42,
            {
              id: 42,
              displayName: "Custom Layer",
              metadata: [
                { param1: [{ name: "Target", layerId: {} }], param2: [] },
              ],
            },
          ],
        ])
      }
      layers={[{ id: 0, name: "Base" }]}
    />,
  );
  expect(screen.getByRole("button", { name: /Target:/ })).toBeInTheDocument();
  expect(screen.getByTestId("active-param-description")).toHaveTextContent(
    "Select Layer",
  );
});

it("shows a caller-provided target identity in modal and floating presentations", () => {
  const { rerender } = render(
    <KeycodeSelector
      open
      targetLabel="Base · Key position 0: A"
      onClose={jest.fn()}
      onSelect={jest.fn()}
      currentBinding={{ behaviorId: 1, param1: 0, param2: 0 }}
      behaviors={
        new Map([[1, { id: 1, displayName: "Transparent", metadata: [] }]])
      }
      layers={[]}
    />,
  );
  expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
    "Base · Key position 0: A",
  );

  rerender(
    <KeycodeSelector
      open
      presentation="floating"
      targetLabel="Base · Key position 1: B"
      onClose={jest.fn()}
      onSelect={jest.fn()}
      currentBinding={{ behaviorId: 1, param1: 0, param2: 0 }}
      behaviors={
        new Map([[1, { id: 1, displayName: "Transparent", metadata: [] }]])
      }
      layers={[]}
    />,
  );
  expect(screen.getByTestId("binding-editor-target")).toHaveTextContent(
    "Base · Key position 1: B",
  );
});

it("names modal apply and floating discard actions, and skips unchanged modal callbacks", async () => {
  const user = userEvent.setup();
  const onClose = jest.fn();
  const onSelect = jest.fn();
  const { rerender } = render(
    <KeycodeSelector
      open
      onClose={onClose}
      onSelect={onSelect}
      currentBinding={{ behaviorId: 1, param1: 0, param2: 0 }}
      behaviors={
        new Map([[1, { id: 1, displayName: "Transparent", metadata: [] }]])
      }
      layers={[]}
    />,
  );

  await user.click(
    screen.getByRole("button", { name: "Apply changes and close" }),
  );
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();

  rerender(
    <KeycodeSelector
      open
      presentation="floating"
      onClose={jest.fn()}
      onSelect={jest.fn()}
      currentBinding={{ behaviorId: 1, param1: 0, param2: 0 }}
      behaviors={
        new Map([[1, { id: 1, displayName: "Transparent", metadata: [] }]])
      }
      layers={[]}
    />,
  );
  expect(
    screen.getByRole("button", {
      name: "Close without applying unfinished edits",
    }),
  ).toBeInTheDocument();
});

it("applies a changed modal draft when its apply action closes the editor", async () => {
  localStorage.setItem("keycodeSelectorCloseOnSelect", "false");
  const user = userEvent.setup();
  const onSelect = jest.fn();
  const keypress = BEHAVIORS.find(
    (behavior) => behavior.displayName === "Key Press",
  )!;
  render(
    <KeycodeSelector
      open
      onClose={jest.fn()}
      onSelect={onSelect}
      currentBinding={{ behaviorId: keypress.id, param1: 0x70004, param2: 0 }}
      behaviors={new Map([[keypress.id, keypress]])}
      layers={[]}
    />,
  );

  await user.click(screen.getByRole("button", { name: "B", exact: true }));
  expect(onSelect).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Apply changes and close" }),
  );
  expect(onSelect).toHaveBeenCalledWith({
    behaviorId: keypress.id,
    param1: 0x70005,
    param2: 0,
  });
});

it("opens macro editing from Runtime Macro parameter controls", async () => {
  const user = userEvent.setup();
  const onOpenMacroEditor = jest.fn();
  render(
    <KeycodeSelector
      open
      onClose={jest.fn()}
      onSelect={jest.fn()}
      currentBinding={{ behaviorId: 91, param1: 7, param2: 0 }}
      behaviors={
        new Map([[91, { id: 91, displayName: "Runtime Macro", metadata: [] }]])
      }
      layers={[]}
      onOpenMacroEditor={onOpenMacroEditor}
    />,
  );

  await user.click(screen.getByRole("button", { name: "New macro" }));
  await user.click(screen.getByRole("button", { name: "Edit macros" }));

  expect(onOpenMacroEditor).toHaveBeenNthCalledWith(1);
  expect(onOpenMacroEditor).toHaveBeenNthCalledWith(2, 7);
});

it("applies a saved macro shortcut as a Runtime Macro binding", async () => {
  const user = userEvent.setup();
  const onSelect = jest.fn();
  render(
    <KeycodeSelector
      open
      onClose={jest.fn()}
      onSelect={onSelect}
      currentBinding={{ behaviorId: 10, param1: 0x70004, param2: 0 }}
      behaviors={
        new Map([
          [10, { id: 10, displayName: "Key Press", metadata: [] }],
          [91, { id: 91, displayName: "Runtime Macro", metadata: [] }],
        ])
      }
      layers={[]}
      runtimeMacros={[{ slot: 4, name: "Email" }]}
    />,
  );

  await user.click(
    screen.getByRole("button", { name: "Key Press - Press a key" }),
  );
  await user.click(screen.getByRole("button", { name: "Macro" }));
  await user.click(screen.getByRole("button", { name: "Email Execute macro" }));

  expect(onSelect).toHaveBeenCalledWith({
    behaviorId: 91,
    param1: 4,
    param2: 0,
  });
});
