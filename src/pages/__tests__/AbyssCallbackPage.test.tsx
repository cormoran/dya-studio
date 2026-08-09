/**
 * Tests for the standalone OAuth callback route.
 *
 * The behaviour that matters is which document exchanges the single-use
 * authorization code: the popup must relay and close, while a full-page
 * redirect must exchange it itself.
 */
import { StrictMode } from "react";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import { AbyssCallbackPage } from "../AbyssCallbackPage";

// Rendered under StrictMode on purpose: main.tsx does, and StrictMode's
// double-invoked effect is exactly what once left this page stuck on its
// spinner forever.
const render = (ui: React.ReactElement) =>
  rtlRender(<StrictMode>{ui}</StrictMode>);

jest.mock("../../lib/abyss/abyssClient");
import { getAbyssClient } from "../../lib/abyss/abyssClient";
const mockGetAbyssClient = getAbyssClient as jest.MockedFunction<
  typeof getAbyssClient
>;

jest.mock("../../lib/abyss/abyssOAuth", () => ({
  ...jest.requireActual("../../lib/abyss/abyssOAuth"),
  relayAbyssCallback: jest.fn(),
}));
import { relayAbyssCallback } from "../../lib/abyss/abyssOAuth";
const mockRelay = relayAbyssCallback as jest.MockedFunction<
  typeof relayAbyssCallback
>;

function mockClient(handleRedirectCallback: jest.Mock) {
  mockGetAbyssClient.mockReturnValue({
    handleRedirectCallback,
  } as unknown as ReturnType<typeof getAbyssClient>);
}

describe("AbyssCallbackPage", () => {
  let closeSpy: jest.SpyInstance;

  beforeEach(() => {
    sessionStorage.clear();
    mockGetAbyssClient.mockReset();
    mockRelay.mockReset();
    window.history.replaceState(null, "", "/oauth/callback?code=abc&state=xyz");
    closeSpy = jest.spyOn(window, "close").mockImplementation(() => {});
  });

  afterEach(() => {
    closeSpy.mockRestore();
  });

  it("closes without exchanging the code when the opener claims it", async () => {
    mockRelay.mockResolvedValue(true);
    const handleRedirectCallback = jest.fn();
    mockClient(handleRedirectCallback);
    const onDone = jest.fn();

    render(<AbyssCallbackPage onDone={onDone} />);

    expect(
      await screen.findByText("You can close this window."),
    ).toBeInTheDocument();
    // Exchanging here too would burn the single-use code and fail.
    expect(handleRedirectCallback).not.toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("exchanges the code itself and navigates back when nobody claims it", async () => {
    mockRelay.mockResolvedValue(false);
    const handleRedirectCallback = jest.fn().mockResolvedValue({});
    mockClient(handleRedirectCallback);
    const onDone = jest.fn();
    sessionStorage.setItem("dya-studio-abyss-return-path", "/import-export");

    render(<AbyssCallbackPage onDone={onDone} />);

    await waitFor(() => expect(onDone).toHaveBeenCalledWith("/import-export"));
    expect(handleRedirectCallback).toHaveBeenCalledWith(window.location.href);
  });

  it("shows a recoverable error when the exchange fails", async () => {
    mockRelay.mockResolvedValue(false);
    mockClient(jest.fn().mockRejectedValue(new Error("boom")));
    const onDone = jest.fn();

    render(<AbyssCallbackPage onDone={onDone} />);

    expect(await screen.findByText("Abyss sign-in failed")).toBeInTheDocument();
    expect(
      screen.getByText("Something went wrong talking to Abyss."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to DYA Studio" }),
    ).toBeInTheDocument();
  });
});
