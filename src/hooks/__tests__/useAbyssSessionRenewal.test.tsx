import { renderHook, act } from "@testing-library/react";
import { useAbyssSessionRenewal } from "../useAbyssSessionRenewal";
import { getAbyssClient } from "../../lib/abyss/abyssClient";

jest.mock("../../lib/abyss/abyssClient");
const getClient = getAbyssClient as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  window.history.replaceState(null, "", "/");
});
afterEach(() => jest.useRealTimers());

it("renews on startup and foreground activity without visiting Import/Export", () => {
  const getAccessToken = jest.fn().mockResolvedValue("token");
  getClient.mockReturnValue({ getTokenSet: () => ({}), getAccessToken });
  const { unmount } = renderHook(useAbyssSessionRenewal);
  expect(getAccessToken).toHaveBeenCalledTimes(1);
  act(() => window.dispatchEvent(new Event("focus")));
  act(() => jest.advanceTimersByTime(5 * 60 * 1000));
  expect(getAccessToken).toHaveBeenCalledTimes(3);
  unmount();
  act(() => window.dispatchEvent(new Event("focus")));
  expect(getAccessToken).toHaveBeenCalledTimes(3);
});

it("does not renew from an OAuth relay window", () => {
  window.history.replaceState(null, "", "/oauth/callback");
  getClient.mockClear();
  renderHook(useAbyssSessionRenewal);
  expect(getClient).not.toHaveBeenCalled();
});

it("keeps stored credentials when renewal fails", async () => {
  const clearTokenSet = jest.fn();
  getClient.mockReturnValue({
    getTokenSet: () => ({}),
    getAccessToken: jest.fn().mockRejectedValue(new TypeError("offline")),
    clearTokenSet,
  });
  await act(async () => {
    renderHook(useAbyssSessionRenewal);
  });
  expect(clearTokenSet).not.toHaveBeenCalled();
});
