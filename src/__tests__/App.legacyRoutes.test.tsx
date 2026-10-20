import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useContext, type ReactNode } from "react";
import App from "../App";
import { ConnectionContext } from "../contexts/DeviceConnectionContext";

// Exercise the real shell, tab retention, and browser history with controlled
// connection state, without device RPCs or page-specific loading effects.
let mockConnected = false;
const mockDeviceProviderMounted = jest.fn();
jest.mock("../components/DeviceConnection", () => ({
  DeviceConnectionProvider: ({ children }: { children: ReactNode }) => {
    const connection = useContext(ConnectionContext);
    mockDeviceProviderMounted();
    return (
      <ConnectionContext.Provider
        value={{
          ...connection,
          isConnected: mockConnected,
        }}
      >
        {children}
      </ConnectionContext.Provider>
    );
  },
}));
jest.mock("../contexts/StudioUnlockContext", () => ({
  StudioUnlockProvider: ({ children }: { children: ReactNode }) => children,
}));
jest.mock("../hooks/useDevtool", () => ({
  useDevtool: () => ({ isAvailable: false }),
}));
jest.mock("../hooks/useAbyssSessionRenewal", () => ({
  useAbyssSessionRenewal: () => {},
}));
jest.mock("../components/SplashScreen", () => ({
  SplashScreen: () => <div data-testid="splash" />,
}));
jest.mock("../pages/KeymapPage", () => ({
  KeymapPage: () => <input aria-label="Keymap draft" defaultValue="initial" />,
}));
jest.mock("../pages/SettingsPage", () => ({
  SettingsPage: () => <div data-testid="settings" />,
}));
jest.mock("../pages/AbyssCallbackPage", () => ({
  AbyssCallbackPage: () => <div data-testid="oauth-callback" />,
}));
jest.mock("../pages/ReleaseNotesPage", () => ({
  RELEASE_NOTES_PATH: "/release-notes",
  ReleaseNotesPage: () => <div data-testid="release-notes" />,
}));
jest.mock("../components/developerGuide", () => ({
  DeveloperGuidePage: () => <div data-testid="developer-guide" />,
}));

function visit(url: string) {
  act(() => {
    window.history.pushState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}

describe.each([false, true])("legacy routes (connected=%s)", (connected) => {
  beforeEach(() => {
    mockConnected = connected;
    mockDeviceProviderMounted.mockClear();
    window.history.replaceState(null, "", "/");
  });

  it.each(["", "?source=legacy#sharing", "/?source=legacy#sharing"])(
    "replaces a direct Import/Export entry and retains its query/hash: %s",
    async (suffix) => {
      window.history.replaceState(null, "", `/import-export${suffix}`);
      const historyLength = window.history.length;
      const push = jest.spyOn(window.history, "pushState");
      const replace = jest.spyOn(window.history, "replaceState");
      try {
        render(<App />);
        const expectedSuffix = suffix.replace(/^\//, "");
        await waitFor(() =>
          expect(window.location.href).toBe(
            `http://localhost/keymap${expectedSuffix}`,
          ),
        );
        expect(replace).toHaveBeenCalledWith(
          null,
          "",
          `/keymap${expectedSuffix}`,
        );
        expect(push).not.toHaveBeenCalled();
        expect(window.history.length).toBe(historyLength);
        if (connected) {
          expect(screen.getByRole("tab", { name: "Keymap" })).toHaveAttribute(
            "aria-selected",
            "true",
          );
          expect(screen.getByLabelText("Keymap draft")).toBeInTheDocument();
          expect(screen.queryByTestId("splash")).not.toBeInTheDocument();
        } else {
          expect(screen.getByTestId("splash")).toBeInTheDocument();
          expect(screen.queryByRole("tab")).not.toBeInTheDocument();
          expect(
            screen.queryByLabelText("Keymap draft"),
          ).not.toBeInTheDocument();
        }
        expect(screen.queryByRole("tab", { name: "Import/Export" })).toBeNull();
      } finally {
        push.mockRestore();
        replace.mockRestore();
      }
    },
  );

  it("Back leaves the replaced entry and Forward returns to canonical Keymap", async () => {
    window.history.replaceState(null, "", "/settings");
    window.history.pushState(null, "", "/import-export?source=legacy#sharing");
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe("/keymap"));

    act(() => window.history.back());
    await waitFor(() => expect(window.location.pathname).toBe("/settings"));
    if (connected) {
      expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    }
    act(() => window.history.forward());
    await waitFor(() =>
      expect(window.location.href).toBe(
        "http://localhost/keymap?source=legacy#sharing",
      ),
    );
  });

  it.each([
    ["/oauth/callback?code=test&state=test#callback", "oauth-callback"],
    ["/release-notes?source=test#release", "release-notes"],
    ["/developer-guide/modules/keymap?source=test#example", "developer-guide"],
  ])("leaves standalone route %s intact", (url, testId) => {
    window.history.replaceState(null, "", url);
    render(<App />);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
    expect(window.location.href).toBe(`http://localhost${url}`);
    if (testId === "developer-guide") {
      expect(mockDeviceProviderMounted).not.toHaveBeenCalled();
    }
  });

  it("keeps Macro&Combo replacement behavior", async () => {
    window.history.replaceState(null, "", "/macro-combo?source=legacy#editor");
    const historyLength = window.history.length;
    render(<App />);
    await waitFor(() =>
      expect(window.location.href).toBe("http://localhost/keymap"),
    );
    expect(window.history.length).toBe(historyLength);
  });
});

it("keeps the Keymap draft when navigating to the legacy alias with the same tab ID", async () => {
  mockConnected = true;
  window.history.replaceState(null, "", "/keymap");
  render(<App />);
  const draft = screen.getByLabelText("Keymap draft");
  fireEvent.change(draft, { target: { value: "unsaved draft" } });
  visit("/import-export?source=legacy#sharing");
  await waitFor(() => expect(window.location.pathname).toBe("/keymap"));
  expect(screen.getByLabelText("Keymap draft")).toBe(draft);
  expect(draft).toHaveValue("unsaved draft");
});

it("opens Keymap after connecting from the canonicalized disconnected entry", async () => {
  mockConnected = false;
  window.history.replaceState(null, "", "/import-export");
  const app = render(<App />);
  await waitFor(() => expect(window.location.pathname).toBe("/keymap"));
  expect(screen.getByTestId("splash")).toBeInTheDocument();
  mockConnected = true;
  app.rerender(<App />);
  expect(screen.getByRole("tab", { name: "Keymap" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByLabelText("Keymap draft")).toBeInTheDocument();
});
