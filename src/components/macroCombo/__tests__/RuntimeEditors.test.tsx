import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RuntimeEditors } from "../RuntimeEditors";

function setup(
  view:
    | "macro-settings"
    | "combo-settings"
    | "tapdance-settings" = "macro-settings",
) {
  const onClose = jest.fn();
  const runtimeMacro = {
    isAvailable: true,
    isLoading: false,
    error: null,
    hasUnsavedChanges: false,
    globalSettings: { tapMs: 30 },
    setTapMs: jest.fn().mockResolvedValue(true),
    saveMacros: jest.fn().mockResolvedValue(true),
  };
  const runtimeCombo = {
    isAvailable: true,
    isLoading: false,
    error: null,
    hasPendingChanges: false,
    combos: [],
    globalSettings: {
      timeoutMs: 50,
      requirePriorIdleMs: 0,
      slowRelease: false,
      maxCombo: 16,
    },
    setTimeoutMs: jest.fn().mockResolvedValue(true),
    setRequirePriorIdleMs: jest.fn().mockResolvedValue(true),
    setSlowRelease: jest.fn().mockResolvedValue(true),
    saveChanges: jest.fn().mockResolvedValue({ affectedCount: 1 }),
  };
  const runtimeTapDance = {
    isAvailable: true,
    busy: false,
    error: null,
    hasUnsavedChanges: false,
    entries: [],
    globalSettings: { maxEntries: 16 },
    intervalMs: 200,
    saveInterval: jest.fn().mockResolvedValue(true),
    saveChanges: jest.fn().mockResolvedValue(true),
  };
  const macro = {
    isMemoryWritePending: false,
    loadedMacroHasUnsavedChanges: false,
    clearGlobalModified: jest.fn(),
  };
  const combo = {
    modifiedIndices: new Set(),
    globalModifiedFields: new Set(),
    clearModified: jest.fn(),
  };
  render(
    <RuntimeEditors
      view={view}
      onClose={onClose}
      onBusyChange={jest.fn()}
      macro={macro as never}
      combo={combo as never}
      runtimeMacro={runtimeMacro as never}
      runtimeCombo={runtimeCombo as never}
      runtimeTapDance={runtimeTapDance as never}
      tapDanceSlot={null}
      keymap={{ behaviors: new Map(), keymap: null } as never}
      layers={[]}
      keyboardLayout="qwerty"
    />,
  );
  return { onClose, runtimeMacro, runtimeCombo, runtimeTapDance };
}

it("applies settings to RAM, lets Cancel keep editing, then restores only the opening value on close", async () => {
  const user = userEvent.setup();
  const { onClose, runtimeMacro } = setup();
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "73" } });
  await waitFor(() => expect(runtimeMacro.setTapMs).toHaveBeenCalledWith(73));
  await user.click(screen.getByRole("button", { name: "Close", exact: true }));
  expect(
    screen.getByRole("dialog", { name: "Discard changes?" }),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Keep editing" }));
  expect(onClose).not.toHaveBeenCalled();
  expect(runtimeMacro.setTapMs).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Close", exact: true }));
  await user.click(screen.getByRole("button", { name: "Discard and close" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(runtimeMacro.setTapMs).toHaveBeenLastCalledWith(30);
  expect(runtimeMacro.saveMacros).not.toHaveBeenCalled();
});

it("flushes the first Save click before flash persistence and closes only on success", async () => {
  const { onClose, runtimeMacro } = setup();
  const calls: string[] = [];
  runtimeMacro.setTapMs.mockImplementation(async () => {
    calls.push("memory");
    return true;
  });
  runtimeMacro.saveMacros.mockImplementation(async () => {
    calls.push("flash");
    return true;
  });
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "41" } });
  fireEvent.click(screen.getByRole("button", { name: "Save and close" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(calls).toEqual(["memory", "flash"]);
});

it("keeps failed restoration open for retry", async () => {
  const user = userEvent.setup();
  const { onClose, runtimeMacro } = setup();
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "43" } });
  await waitFor(() => expect(runtimeMacro.setTapMs).toHaveBeenCalledWith(43));
  runtimeMacro.setTapMs.mockResolvedValueOnce(false);
  await user.click(screen.getByRole("button", { name: "Close", exact: true }));
  await user.click(screen.getByRole("button", { name: "Discard and close" }));
  expect(
    await within(
      screen.getByRole("dialog", { name: "Discard changes?" }),
    ).findByRole("alert"),
  ).toBeVisible();
  expect(onClose).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Discard and close" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});

it("retains an invalid combo field even when another field becomes valid", async () => {
  const { runtimeCombo } = setup("combo-settings");
  const timeout = screen.getByRole("spinbutton", { name: "Timeout ms" });
  fireEvent.change(timeout, { target: { value: "" } });
  fireEvent.change(
    screen.getByRole("spinbutton", {
      name: "Require prior idle ms (0 disables)",
    }),
    { target: { value: "12" } },
  );
  await waitFor(() =>
    expect(runtimeCombo.setRequirePriorIdleMs).toHaveBeenCalledWith(12),
  );
  expect(timeout).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("button", { name: "Save and close" })).toBeDisabled();
  expect(runtimeCombo.saveChanges).not.toHaveBeenCalled();
});

it("applies tapdance interval immediately without an Apply button", async () => {
  const { runtimeTapDance } = setup("tapdance-settings");
  fireEvent.change(screen.getByRole("spinbutton"), {
    target: { value: "250" },
  });
  await waitFor(() =>
    expect(runtimeTapDance.saveInterval).toHaveBeenCalledWith(250),
  );
  expect(
    screen.queryByRole("button", { name: "Apply to memory" }),
  ).not.toBeInTheDocument();
});
