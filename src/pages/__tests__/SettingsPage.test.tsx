import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "../SettingsPage";
import { TabActiveContext } from "../../contexts/TabActiveContext";
import { ConnectionContext } from "../../contexts/DeviceConnectionContext";
import { useSettings, type UseSettingsReturn } from "../../hooks/useSettings";

jest.mock("../../hooks/useSettings");
jest.mock("../../hooks/useLanguage", () => ({
  useLanguage: () => ({
    t: (text: string, params?: Record<string, number | string>) =>
      Object.entries(params ?? {}).reduce(
        (result, [key, value]) => result.replace(`{{${key}}}`, String(value)),
        text,
      ),
  }),
}));
jest.mock("../../hooks/useResetSettings", () => ({
  useResetSettings: () => ({
    resetAllSettings: jest.fn(),
    isResetting: false,
    error: null,
    clearError: jest.fn(),
  }),
}));
jest.mock("../../hooks/versionHistory/useSettingsVersionHistory", () => ({
  useSettingsVersionHistory: () => ({
    versions: [],
    isBusy: false,
    capture: jest.fn(),
    diffModalProps: {},
  }),
}));
jest.mock("../../components/versionHistory/VersionDiffModal", () => ({
  VersionDiffModal: () => null,
}));
jest.mock("../../components/versionHistory/ResetVersionMenu", () => ({
  ResetVersionMenu: () => null,
}));
jest.mock("../../components/AdvancedSettingsSection", () => ({
  AdvancedSettingsSection: () => <div>Advanced Settings</div>,
}));
jest.mock("../../lib/webmcp/useWebMCPTools", () => ({
  useWebMCPTools: jest.fn(),
}));

let settings: UseSettingsReturn;
let connected: boolean;
function Page() {
  return (
    <ConnectionContext.Provider value={{ isConnected: connected } as never}>
      <SettingsPage />
    </ConnectionContext.Provider>
  );
}
function session(overrides: Partial<UseSettingsReturn> = {}) {
  settings = { ...settings, sessionKey: {}, ...overrides };
}
beforeEach(() => {
  jest.useFakeTimers();
  connected = true;
  settings = {
    sessionKey: {},
    isAvailable: true,
    isLoading: false,
    error: null,
    devices: [
      { sourceId: 0, deviceName: "Central", idleMs: 300000, sleepMs: 900000 },
    ],
    setActivitySettings: jest.fn().mockResolvedValue(true),
    loadAllSettings: jest.fn().mockResolvedValue([]),
    resetToDefaults: jest.fn(),
  };
  jest.mocked(useSettings).mockImplementation(() => settings);
});
afterEach(() => jest.useRealTimers());

it("exposes timeout values, preset state, and the controlled disclosure to keyboard users", async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  render(<Page />);

  const idleTimeout = screen.getByRole("button", {
    name: "Idle Timeout 5 minutes",
  });
  expect(idleTimeout).toHaveAttribute("aria-expanded", "false");
  const optionsId = idleTimeout.getAttribute("aria-controls");
  expect(optionsId).toBeTruthy();
  expect(document.getElementById(optionsId!)).toHaveAttribute("hidden");

  idleTimeout.focus();
  await user.keyboard("{Enter}");

  expect(idleTimeout).toHaveAttribute("aria-expanded", "true");
  const options = screen.getByRole("group", { name: "Idle Timeout options" });
  expect(options).toHaveAttribute("id", optionsId);
  expect(
    within(options).getByRole("button", { name: "5 minutes" }),
  ).toHaveAttribute("aria-pressed", "true");

  expect(within(options).getByRole("button", { name: "Never" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(idleTimeout).toHaveAttribute("aria-expanded", "false");
});

it("identifies a custom timeout value and submits it with the labeled form", async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  settings.devices[0].sleepMs = 15000;
  render(<Page />);

  const sleepTimeout = screen.getByRole("button", {
    name: "Sleep Timeout 0.25 min",
  });
  await user.click(sleepTimeout);
  expect(
    screen.getByRole("button", { name: "Custom value..." }),
  ).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "Custom value..." }));
  expect(
    screen.getByRole("button", { name: "Custom value..." }),
  ).toHaveAttribute("aria-pressed", "true");

  const input = screen.getByRole("spinbutton", {
    name: "Sleep Timeout (min)",
  });
  await user.type(input, "0.25");
  await user.keyboard("{Enter}");

  expect(
    screen.getByRole("button", { name: "Sleep Timeout 0.25 min" }),
  ).toBeVisible();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1500);
  });
  expect(settings.setActivitySettings).toHaveBeenCalledWith(300000, 15000);
});

it("returns keyboard focus to the custom option when its form is canceled", async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  render(<Page />);

  await user.click(
    screen.getByRole("button", { name: "Idle Timeout 5 minutes" }),
  );
  const customOption = screen.getByRole("button", { name: "Custom value..." });
  await user.click(customOption);
  expect(
    screen.getByRole("spinbutton", { name: "Idle Timeout (min)" }),
  ).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(customOption).toHaveFocus();
  expect(
    screen.queryByRole("spinbutton", { name: "Idle Timeout (min)" }),
  ).not.toBeInTheDocument();
});

it("removes stale values, timeout portals and editors on unsupported reconnect but keeps Danger Zone", () => {
  const { rerender } = render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: /^Idle Timeout/ }));
  expect(screen.getByRole("button", { name: "Custom value..." })).toBeVisible();
  // Defensive UI gate even if a caller still has stale data.
  session({ isAvailable: false });
  rerender(<Page />);
  expect(
    screen.getByText(
      "Settings RPC subsystem is not available for your keyboard.",
      { exact: false },
    ),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: /^Idle Timeout/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("Current Settings by Device", { exact: false }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Advanced Settings")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Custom value..." }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("Waiting for device connection..."),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reset all settings" }));
  expect(screen.getByRole("dialog")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("distinguishes disconnected from connected but unavailable", () => {
  connected = false;
  session({ isAvailable: false, devices: [] });
  render(<Page />);
  expect(screen.getByText("Waiting for device connection...")).toBeVisible();
  expect(
    screen.queryByText(
      "Settings RPC subsystem is not available for your keyboard.",
      { exact: false },
    ),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Danger Zone")).not.toBeInTheDocument();
});

it.each([false, true])(
  "cancels queued edits on reconnect (support: %s) and restores fresh values",
  async (supported) => {
    const oldWrite = settings.setActivitySettings;
    const newWrite = jest.fn().mockResolvedValue(true);
    const { rerender } = render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: /^Idle Timeout/ }));
    fireEvent.click(screen.getByRole("button", { name: "10 minutes" }));
    session({
      isAvailable: supported,
      devices: supported
        ? [
            {
              sourceId: 0,
              deviceName: "Central",
              idleMs: 60000,
              sleepMs: 900000,
            },
          ]
        : [],
      setActivitySettings: newWrite,
    });
    rerender(<Page />);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(oldWrite).not.toHaveBeenCalled();
    expect(newWrite).not.toHaveBeenCalled();
    if (!supported) {
      session({
        isAvailable: true,
        devices: [
          {
            sourceId: 0,
            deviceName: "Central",
            idleMs: 60000,
            sleepMs: 900000,
          },
        ],
      });
      rerender(<Page />);
    }
    expect(
      screen.getByRole("button", { name: /^Idle Timeout/ }),
    ).toHaveTextContent("1 minute");
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  },
);

it("late write completion cannot clear a new session edit or show Saved", async () => {
  let resolve!: (ok: boolean) => void;
  settings.setActivitySettings = jest.fn(
    () =>
      new Promise<boolean>((yes) => {
        resolve = yes;
      }),
  );
  const { rerender } = render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: /^Idle Timeout/ }));
  fireEvent.click(screen.getByRole("button", { name: "10 minutes" }));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1500);
  });
  session({ setActivitySettings: jest.fn().mockResolvedValue(true) });
  rerender(<Page />);
  fireEvent.click(screen.getByRole("button", { name: /^Idle Timeout/ }));
  fireEvent.click(screen.getByRole("button", { name: "1 minute" }));
  await act(async () => {
    resolve(true);
  });
  expect(
    screen.getByRole("button", { name: /^Idle Timeout/ }),
  ).toHaveTextContent("1 minute");
  expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  expect(screen.getByText("Saving...")).toBeVisible();
});

it("hides timeout portal options while inactive and restores the pending custom form", () => {
  const { rerender } = render(
    <TabActiveContext.Provider value={true}>
      <Page />
    </TabActiveContext.Provider>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Idle Timeout 5 minutes" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Custom value..." }));
  const customInput = screen.getByRole("spinbutton");
  fireEvent.change(customInput, { target: { value: "42" } });
  rerender(
    <TabActiveContext.Provider value={false}>
      <Page />
    </TabActiveContext.Provider>,
  );
  expect(
    screen.queryByRole("group", { name: "Idle Timeout options" }),
  ).not.toBeInTheDocument();
  expect(customInput).not.toBeVisible();
  expect(settings.setActivitySettings).not.toHaveBeenCalled();
  rerender(
    <TabActiveContext.Provider value={true}>
      <Page />
    </TabActiveContext.Provider>,
  );
  expect(screen.getByRole("spinbutton")).toBe(customInput);
  expect(customInput).toHaveValue(42);
});

it("hides factory reset confirmation while inactive without confirming or cancelling", () => {
  const { rerender } = render(
    <TabActiveContext.Provider value={true}>
      <Page />
    </TabActiveContext.Provider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Reset all settings" }));
  expect(screen.getByRole("dialog")).toBeVisible();
  rerender(
    <TabActiveContext.Provider value={false}>
      <Page />
    </TabActiveContext.Provider>,
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  rerender(
    <TabActiveContext.Provider value={true}>
      <Page />
    </TabActiveContext.Provider>,
  );
  expect(screen.getByRole("dialog")).toBeVisible();
});
