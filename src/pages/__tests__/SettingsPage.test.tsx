import { act, fireEvent, render, screen } from "@testing-library/react";
import { SettingsPage } from "../SettingsPage";
import { ConnectionContext } from "../../contexts/DeviceConnectionContext";
import { useSettings, type UseSettingsReturn } from "../../hooks/useSettings";

jest.mock("../../hooks/useSettings");
jest.mock("../../hooks/useLanguage", () => ({
  useLanguage: () => ({ t: (text: string) => text }),
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

it("removes stale values, timeout portals and editors on unsupported reconnect but keeps Danger Zone", () => {
  const { rerender } = render(<Page />);
  fireEvent.click(screen.getByRole("button", { name: "Idle Timeout" }));
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
    screen.queryByRole("button", { name: "Idle Timeout" }),
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
    fireEvent.click(screen.getByRole("button", { name: "Idle Timeout" }));
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
      screen.getByRole("button", { name: "Idle Timeout" }),
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
  fireEvent.click(screen.getByRole("button", { name: "Idle Timeout" }));
  fireEvent.click(screen.getByRole("button", { name: "10 minutes" }));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1500);
  });
  session({ setActivitySettings: jest.fn().mockResolvedValue(true) });
  rerender(<Page />);
  fireEvent.click(screen.getByRole("button", { name: "Idle Timeout" }));
  fireEvent.click(screen.getByRole("button", { name: "1 minute" }));
  await act(async () => {
    resolve(true);
  });
  expect(
    screen.getByRole("button", { name: "Idle Timeout" }),
  ).toHaveTextContent("1 minute");
  expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  expect(screen.getByText("Saving...")).toBeVisible();
});
