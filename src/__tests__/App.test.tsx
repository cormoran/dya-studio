/**
 * Routing tests for the App shell.
 *
 * The reason this file exists: `AppContent` canonicalizes any pathname that
 * does not correspond to a tab back to "/". The OAuth callback is such a
 * pathname, and rewriting it would throw away the `?code=&state=` query string
 * before the callback page could read it — a failure that only shows up as
 * "login silently does nothing". These tests pin that down.
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import App from "../App";
import { DEVELOPER_GUIDE_PATH } from "../content/developerGuide";
import { OAUTH_CALLBACK_PATH } from "../lib/abyss/abyssOAuth";
import { RELEASE_NOTES_PATH } from "../pages/ReleaseNotesPage";
import type { WebMcpTool } from "../lib/webMcp";

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
  });
});

describe("App WebMCP navigation", () => {
  afterEach(() => {
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
  });

  it("registers app tools and switches tabs through the tracked navigation path", async () => {
    const registered: WebMcpTool[] = [];
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: (tool: WebMcpTool) => {
          registered.push(tool);
        },
      },
    });
    goTo("/");

    render(<App />);
    await waitFor(() =>
      expect(registered.some((tool) => tool.name === "dya_switch_tab")).toBe(
        true,
      ),
    );
    const switchTab = registered.find((tool) => tool.name === "dya_switch_tab");
    if (!switchTab) throw new Error("dya_switch_tab was not registered");

    await act(async () => {
      await switchTab.execute({ tab: "keymap" });
    });

    expect(window.location.pathname).toBe("/keymap");
  });
});
