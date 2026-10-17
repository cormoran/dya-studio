/**
 * Routing tests for the App shell.
 *
 * The reason this file exists: `AppContent` canonicalizes any pathname that
 * does not correspond to a tab back to "/". The OAuth callback is such a
 * pathname, and rewriting it would throw away the `?code=&state=` query string
 * before the callback page could read it — a failure that only shows up as
 * "login silently does nothing". These tests pin that down.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "../App";
import { ABOUT_PATH, aboutContent } from "../content/about";
import { useAbyssSessionRenewal } from "../hooks/useAbyssSessionRenewal";
import { saveConnectionMethod } from "../lib/connectionSession";
import type { ConnectionContextValue } from "../contexts/DeviceConnectionContext";
import { useState } from "react";

const mockProviderMount = jest.fn();
const mockProviderUnmount = jest.fn();
const mockReconnect = jest.fn();
const mockCancel = jest.fn();
const mockConnect = jest.fn();
let mockInitialConnection: Partial<ConnectionContextValue> = {};
let mockUpdateConnection: (value: Partial<ConnectionContextValue>) => void;

// Exercise the real router and mounted tabs, with a controllable transport
// boundary. Provider mount is where the real provider checks saved sessions.
jest.mock("../components/DeviceConnection", () => {
  const React = jest.requireActual("react");
  const { ConnectionContext } = jest.requireActual(
    "../contexts/DeviceConnectionContext",
  );
  const { savedConnectionMethod } = jest.requireActual(
    "../lib/connectionSession",
  );
  return {
    DeviceConnectionProvider: ({ children }: { children: React.ReactNode }) => {
      const [state, setState] = React.useState(mockInitialConnection);
      mockUpdateConnection = (value) =>
        setState((previous: object) => ({ ...previous, ...value }));
      React.useEffect(() => {
        mockProviderMount();
        if (savedConnectionMethod()) mockReconnect();
        return () => mockProviderUnmount();
      }, []);
      return (
        <ConnectionContext.Provider
          value={{
            isConnected: false,
            isLoading: false,
            isReconnecting: false,
            deviceName: "Retained keyboard",
            error: null,
            onConnect: mockConnect,
            onDisconnect: jest.fn(),
            onCancelReconnect: () => {
              mockCancel();
              setState({
                isConnected: false,
                isLoading: false,
                isReconnecting: false,
              });
            },
            ...state,
          }}
        >
          {children}
        </ConnectionContext.Provider>
      );
    },
  };
});
jest.mock("../contexts/KeyboardLayoutProvider", () => ({
  KeyboardLayoutProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));
jest.mock("../contexts/StudioUnlockContext", () => ({
  StudioUnlockProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));
jest.mock("../hooks/useDevtool", () => ({
  useDevtool: () => ({ isAvailable: false }),
}));
jest.mock("../hooks/useAbyssSessionRenewal", () => ({
  useAbyssSessionRenewal: jest.fn(),
}));
jest.mock("../pages/AboutPage", () => ({
  AboutPage: () => <div data-testid="about" />,
}));
jest.mock("../pages/KeymapPage", () => ({
  KeymapPage: function KeymapFixture() {
    const [draft, setDraft] = useState("");
    const { useIsTabActive } = jest.requireActual("../hooks/useIsTabActive");
    const active = useIsTabActive();
    return (
      <label>
        Unsaved keymap
        <input
          aria-label="Unsaved keymap"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          data-active={String(active)}
        />
      </label>
    );
  },
}));
import { DEVELOPER_GUIDE_PATH } from "../content/developerGuide";
import { OAUTH_CALLBACK_PATH } from "../lib/abyss/abyssOAuth";
import { RELEASE_NOTES_PATH } from "../pages/ReleaseNotesPage";

// The standalone pages are rendered by App directly; stub them so these tests
// stay about routing rather than page internals.
jest.mock("../pages/AbyssCallbackPage", () => ({
  AbyssCallbackPage: () => <div data-testid="abyss-callback" />,
}));
jest.mock("../pages/ReleaseNotesPage", () => ({
  RELEASE_NOTES_PATH: "/release-notes",
  ReleaseNotesPage: () => <div data-testid="release-notes" />,
}));
jest.mock("../components/developerGuide", () => ({
  DeveloperGuidePage: () => <div data-testid="developer-guide" />,
}));
// Stubbed so routing tests do not pull the Abyss SDK into the module graph.
jest.mock("../pages/ImportExportPage", () => ({
  IMPORT_EXPORT_TAB_ID: "import-export",
  ImportExportPage: () => <div data-testid="import-export" />,
}));

beforeEach(() => {
  mockInitialConnection = {};
  jest.mocked(useAbyssSessionRenewal).mockClear();
  mockProviderMount.mockClear();
  mockProviderUnmount.mockClear();
  mockReconnect.mockClear();
  mockCancel.mockClear();
  mockConnect.mockClear();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

function navigate(url: string) {
  act(() => {
    window.history.pushState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}

function goTo(url: string) {
  window.history.replaceState(null, "", url);
}

describe("App routing", () => {
  let replaceStateSpy: jest.SpyInstance;

  beforeEach(() => {
    goTo("/");
    replaceStateSpy = jest.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
  });

  it("renders the OAuth callback page and keeps the query string", async () => {
    goTo(`${OAUTH_CALLBACK_PATH}?code=test-code&state=test-state`);
    replaceStateSpy.mockClear();

    render(<App />);

    expect(await screen.findByTestId("abyss-callback")).toBeInTheDocument();
    // The authorization code must survive: the callback page reads it from
    // window.location, and it is single-use.
    expect(window.location.pathname).toBe(OAUTH_CALLBACK_PATH);
    expect(window.location.search).toBe("?code=test-code&state=test-state");
    expect(replaceStateSpy).not.toHaveBeenCalledWith(null, "", "/");
  });

  it("still renders the standalone release notes route", async () => {
    goTo(RELEASE_NOTES_PATH);
    replaceStateSpy.mockClear();

    render(<App />);

    expect(await screen.findByTestId("release-notes")).toBeInTheDocument();
    expect(window.location.pathname).toBe(RELEASE_NOTES_PATH);
  });

  it("renders the static developer guide without connecting a keyboard", async () => {
    goTo(DEVELOPER_GUIDE_PATH);
    replaceStateSpy.mockClear();

    render(<App />);

    expect(await screen.findByTestId("developer-guide")).toBeInTheDocument();
    expect(window.location.pathname).toBe(DEVELOPER_GUIDE_PATH);
    expect(replaceStateSpy).not.toHaveBeenCalledWith(null, "", "/");
  });

  it("canonicalizes an unknown path back to the home tab", async () => {
    goTo("/not-a-real-tab");

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href,
    ).toBe("https://studio.dya.cormoran.works/");
  });
});

it("keeps metadata aligned with SPA navigation, history notifications, and unknown-route normalization", async () => {
  goTo("/developer-guide/modules/keymap?source=test#example");
  render(<App />);
  const guideTitle = document.title;
  expect(
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href,
  ).toBe("https://studio.dya.cormoran.works/developer-guide/modules/keymap");
  act(() => {
    window.history.pushState(null, "", "/release-notes#2026.09.20.0");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(await screen.findByTestId("release-notes")).toBeInTheDocument();
  expect(document.title).not.toBe(guideTitle);
  act(() => {
    window.history.replaceState(null, "", "/developer-guide/modules/keymap");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(document.title).toBe(guideTitle);
  act(() => {
    window.history.pushState(null, "", "/not-a-real-tab");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await waitFor(() =>
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href,
    ).toBe("https://studio.dya.cormoran.works/"),
  );
});

describe("connection-free entry and retained sessions", () => {
  test.each(["demo", "serial"] as const)(
    "direct About ignores saved %s session and absent connection APIs",
    (method) => {
      saveConnectionMethod(method);
      goTo("/about?source=test#compatibility");
      render(<App />);
      expect(screen.getByTestId("about")).toBeVisible();
      expect(mockProviderMount).not.toHaveBeenCalled();
      expect(mockReconnect).not.toHaveBeenCalled();
      expect(mockConnect).not.toHaveBeenCalled();
      expect(useAbyssSessionRenewal).toHaveBeenLastCalledWith(false);
      expect(window.location.search).toBe("?source=test");
      expect(window.location.hash).toBe("#compatibility");

      navigate("/developer-guide");
      expect(screen.getByTestId("developer-guide")).toBeVisible();
      navigate("/release-notes");
      expect(screen.getByTestId("release-notes")).toBeVisible();
      navigate(ABOUT_PATH);
      expect(mockProviderMount).not.toHaveBeenCalled();
      navigate("/");
      expect(mockProviderMount).toHaveBeenCalledTimes(1);
      expect(mockReconnect).toHaveBeenCalledTimes(1);
      navigate(ABOUT_PATH);
      navigate("/");
      expect(mockProviderMount).toHaveBeenCalledTimes(1);
      expect(mockReconnect).toHaveBeenCalledTimes(1);
    },
  );

  test("keeps a connected provider and dirty mounted editor across public routes and history", async () => {
    mockInitialConnection = { isConnected: true };
    goTo("/keymap");
    render(<App />);
    const draft = screen.getByRole("textbox", { name: "Unsaved keymap" });
    fireEvent.change(draft, { target: { value: "unsaved layer choice" } });
    navigate(ABOUT_PATH);
    expect(screen.getByTestId("about")).toBeVisible();
    expect(draft).not.toBeVisible();
    expect(draft).toHaveAttribute("data-active", "false");
    act(() => window.history.back());
    await waitFor(() => expect(window.location.pathname).toBe("/keymap"));
    expect(screen.getByRole("textbox", { name: "Unsaved keymap" })).toBe(draft);
    act(() => window.history.forward());
    await waitFor(() => expect(window.location.pathname).toBe(ABOUT_PATH));
    expect(screen.getByTestId("about")).toBeVisible();
    navigate("/developer-guide/modules/keymap");
    navigate("/release-notes#2026.09.20.0");
    navigate(`${OAUTH_CALLBACK_PATH}?code=keep-code&state=keep-state`);
    expect(window.location.search).toBe("?code=keep-code&state=keep-state");
    expect(screen.getByTestId("abyss-callback")).toBeVisible();
    // The same popstate notification used by Back/Forward must restore the
    // existing editor, rather than constructing a fresh transport or page.
    act(() => {
      window.history.replaceState(null, "", "/keymap");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("textbox", { name: "Unsaved keymap" })).toBe(draft);
    expect(draft).toHaveValue("unsaved layer choice");
    expect(draft).toHaveAttribute("data-active", "true");
    expect(mockProviderMount).toHaveBeenCalledTimes(1);
    expect(mockProviderUnmount).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTitle("Retained keyboard")).toBeVisible(),
    );
  });

  test.each(["connecting", "reconnecting"])(
    "retains in-flight %s and its return controls",
    async (phase) => {
      mockInitialConnection = {
        isLoading: true,
        isReconnecting: phase === "reconnecting",
      };
      goTo("/");
      render(<App />);
      navigate(ABOUT_PATH);
      expect(screen.getByTestId("about")).toBeVisible();
      navigate("/");
      expect(mockProviderMount).toHaveBeenCalledTimes(1);
      expect(mockProviderUnmount).not.toHaveBeenCalled();
      if (phase === "reconnecting") {
        await waitFor(() =>
          expect(
            screen.getByText("Reconnecting to your keyboard..."),
          ).toBeVisible(),
        );
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(mockCancel).toHaveBeenCalledTimes(1);
        expect(
          screen.getByRole("button", { name: "Try Demo Mode" }),
        ).toBeEnabled();
      } else {
        expect(
          screen.getByRole("button", { name: "Try Demo Mode" }),
        ).toBeDisabled();
        act(() =>
          mockUpdateConnection({ isLoading: false, isConnected: true }),
        );
        await waitFor(() =>
          expect(screen.getByTitle("Retained keyboard")).toBeVisible(),
        );
      }
    },
  );

  test("Home links to About through SPA navigation and retains the session", async () => {
    mockInitialConnection = { isConnected: true };
    goTo("/");
    render(<App />);
    const link = screen.getByRole("link", { name: aboutContent.en.aboutLabel });
    expect(link).toHaveAttribute("href", ABOUT_PATH);
    for (const modifiers of [
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ]) {
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        ...modifiers,
      });
      let preventedByApp: boolean | undefined;
      document.addEventListener(
        "click",
        (browserEvent) => {
          preventedByApp = browserEvent.defaultPrevented;
          browserEvent.preventDefault();
        },
        { once: true },
      );
      link.dispatchEvent(event);
      expect(preventedByApp).toBe(false);
      expect(window.location.pathname).toBe("/");
      event.preventDefault();
    }
    fireEvent.click(link);
    expect(window.location.pathname).toBe(ABOUT_PATH);
    expect(screen.getByTestId("about")).toBeVisible();
    navigate("/");
    expect(mockProviderMount).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByTitle("Retained keyboard")).toBeVisible(),
    );
  });
});
