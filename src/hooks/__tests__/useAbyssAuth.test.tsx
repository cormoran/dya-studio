/**
 * Tests for the Abyss sign-in state hook.
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAbyssAuth } from "../useAbyssAuth";

// The Abyss SDK is stubbed globally via moduleNameMapper (see jest.config.ts);
// this is that stub's error class, used to simulate API failures.
import { AbyssApiError } from "@keyboard-hub/abyss-client";

jest.mock("../../lib/abyss/abyssClient");
import { getAbyssClient, isAbyssConfigured } from "../../lib/abyss/abyssClient";
const mockGetAbyssClient = getAbyssClient as jest.MockedFunction<
  typeof getAbyssClient
>;
const mockIsAbyssConfigured = isAbyssConfigured as jest.MockedFunction<
  typeof isAbyssConfigured
>;

jest.mock("../../lib/abyss/abyssOAuth", () => ({
  ...jest.requireActual("../../lib/abyss/abyssOAuth"),
  startAbyssLogin: jest.fn(),
}));
import { startAbyssLogin } from "../../lib/abyss/abyssOAuth";
const mockStartAbyssLogin = startAbyssLogin as jest.MockedFunction<
  typeof startAbyssLogin
>;

const PROFILE = { sub: "u1", username: "cormoran" };

type FakeClient = {
  getTokenSet: jest.Mock;
  userinfo: jest.Mock;
  clearTokenSet: jest.Mock;
  revoke: jest.Mock;
};

function useFakeClient(overrides: Partial<FakeClient> = {}): FakeClient {
  const client: FakeClient = {
    getTokenSet: jest.fn().mockReturnValue({ accessToken: "t" }),
    userinfo: jest.fn().mockResolvedValue(PROFILE),
    clearTokenSet: jest.fn(),
    revoke: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  mockGetAbyssClient.mockReturnValue(
    client as unknown as ReturnType<typeof getAbyssClient>,
  );
  return client;
}

describe("useAbyssAuth", () => {
  beforeEach(() => {
    mockGetAbyssClient.mockReset();
    mockIsAbyssConfigured.mockReset();
    mockStartAbyssLogin.mockReset();
    mockIsAbyssConfigured.mockReturnValue(true);
  });

  it("reports unconfigured builds without touching the client", async () => {
    mockIsAbyssConfigured.mockReturnValue(false);
    mockGetAbyssClient.mockReturnValue(null);

    const { result } = renderHook(() => useAbyssAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isConfigured).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("loads the profile when a token is already stored", async () => {
    const client = useFakeClient();

    const { result } = renderHook(() => useAbyssAuth());

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).toEqual(PROFILE);
    expect(client.userinfo).toHaveBeenCalledTimes(1);
  });

  it("stays signed out when no token is stored", async () => {
    const client = useFakeClient({
      getTokenSet: jest.fn().mockReturnValue(null),
    });

    const { result } = renderHook(() => useAbyssAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(client.userinfo).not.toHaveBeenCalled();
  });

  it("drops an unusable token on 401 so the UI offers a fresh sign-in", async () => {
    const client = useFakeClient({
      userinfo: jest.fn().mockRejectedValue(new AbyssApiError(401)),
    });

    const { result } = renderHook(() => useAbyssAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(client.clearTokenSet).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe(
      "Your Abyss session expired. Please log in again.",
    );
  });

  it("surfaces a cancelled login", async () => {
    useFakeClient({ getTokenSet: jest.fn().mockReturnValue(null) });
    mockStartAbyssLogin.mockResolvedValue({ status: "cancelled" });

    const { result } = renderHook(() => useAbyssAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login();
    });

    expect(result.current.error).toBe("Abyss login was cancelled.");
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("reads the profile after a successful login", async () => {
    const client = useFakeClient({
      getTokenSet: jest.fn().mockReturnValueOnce(null).mockReturnValue({
        accessToken: "t",
      }),
    });
    mockStartAbyssLogin.mockResolvedValue({ status: "authorized" });

    const { result } = renderHook(() => useAbyssAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(client.userinfo).toHaveBeenCalled();
  });

  it("clears the token on sign out even when revoke fails", async () => {
    const client = useFakeClient({
      revoke: jest.fn().mockRejectedValue(new Error("offline")),
    });

    const { result } = renderHook(() => useAbyssAuth());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(client.clearTokenSet).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
