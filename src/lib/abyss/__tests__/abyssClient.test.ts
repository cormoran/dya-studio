jest.mock("../abyssConfig", () => ({
  ABYSS_CLIENT_ID: "test-client",
  ABYSS_BASE_URL: "https://example.com",
  isAbyssConfigured: () => true,
}));
jest.mock("@keyboard-hub/abyss-client", () => ({
  createAbyssClient: jest.fn((options) => ({
    getTokenSet: () =>
      JSON.parse(
        options.storage.getItem("keyboard-abyss:test-client:token") ?? "null",
      ),
    clearTokenSet: () =>
      options.storage.removeItem("keyboard-abyss:test-client:token"),
    refreshToken: jest.fn(),
  })),
}));
import { createAbyssClient } from "@keyboard-hub/abyss-client";
import { getAbyssClient, resetAbyssClientForTest } from "../abyssClient";

const key = "keyboard-abyss:test-client:token";
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetAbyssClientForTest();
  jest.clearAllMocks();
});

it("migrates a tab login and retains it across client recreation and session loss", () => {
  sessionStorage.setItem(key, JSON.stringify({ refreshToken: "saved" }));
  expect(getAbyssClient()?.getTokenSet()?.refreshToken).toBe("saved");
  expect(sessionStorage.getItem(key)).toBeNull();
  sessionStorage.clear();
  resetAbyssClientForTest();
  expect(getAbyssClient()?.getTokenSet()?.refreshToken).toBe("saved");
  expect(createAbyssClient).toHaveBeenLastCalledWith(
    expect.objectContaining({
      storage: localStorage,
      transactionStorage: sessionStorage,
    }),
  );
  getAbyssClient()?.clearTokenSet();
  resetAbyssClientForTest();
  expect(getAbyssClient()?.getTokenSet()).toBeNull();
});

it("does not overwrite a newer persistent login with a legacy tab token", () => {
  localStorage.setItem(key, JSON.stringify({ refreshToken: "new" }));
  sessionStorage.setItem(key, JSON.stringify({ refreshToken: "old" }));
  expect(getAbyssClient()?.getTokenSet()?.refreshToken).toBe("new");
  expect(sessionStorage.getItem(key)).toBeNull();
});

it("shares one token rotation between concurrent requests", async () => {
  const api = getAbyssClient()!;
  const original = (createAbyssClient as jest.Mock).mock.results[0].value;
  // The constructor mock provides the underlying refresh implementation.
  const refresh = jest.fn().mockResolvedValue({ refreshToken: "rotated" });
  (createAbyssClient as jest.Mock).mockImplementationOnce(() => ({
    ...original,
    refreshToken: refresh,
  }));
  resetAbyssClientForTest();
  const rebuilt = getAbyssClient()!;
  const first = rebuilt.refreshToken();
  const second = rebuilt.refreshToken();
  expect(first).toBe(second);
  await first;
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(api).toBeDefined();
});
