import { act, renderHook, waitFor } from "@testing-library/react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { useAbyssBrowseUrl } from "../useAbyssBrowseUrl";
import { abyssDiscoverUrl } from "../../lib/abyss/abyssCatalog";
let testCase = 0;
let deviceName = "";
const originalFetch = global.fetch;
const mockFetch = jest.fn();
const app = { state: { connection: {}, deviceInfo: { name: "DYA" } } };
function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ZMKAppContext.Provider value={app as never}>
      {children}
    </ZMKAppContext.Provider>
  );
}
beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
  app.state.connection = {};
  deviceName = `DYA ${++testCase}`;
  app.state.deviceInfo.name = deviceName;
});
afterAll(() => {
  global.fetch = originalFetch;
});
it("does not look up a closed menu and resolves a public keyboard without sign-in", async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => [{ name: deviceName, slug: "dya-split" }],
  });
  const { result, rerender } = renderHook(
    ({ open }) => useAbyssBrowseUrl(open),
    { initialProps: { open: false }, wrapper },
  );
  expect(mockFetch).not.toHaveBeenCalled();
  rerender({ open: true });
  await waitFor(() => expect(result.current).toMatch(/\/keyboard\/dya-split$/));
});
it("ignores a late response from the previously connected keyboard", async () => {
  let finish!: (value: unknown) => void;
  mockFetch
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue({ ok: true, json: async () => [] });
  const { result, rerender } = renderHook(() => useAbyssBrowseUrl(true), {
    wrapper,
  });
  app.state.connection = {};
  app.state.deviceInfo.name = "Other";
  rerender();
  await act(async () => {
    finish({
      ok: true,
      json: async () => [{ name: deviceName, slug: "old-board" }],
    });
  });
  expect(result.current).toBe(abyssDiscoverUrl());
});
it("falls back to Discover when the public API fails", async () => {
  mockFetch.mockRejectedValue(new Error("offline"));
  const { result } = renderHook(() => useAbyssBrowseUrl(true), { wrapper });
  await act(async () => {
    await Promise.resolve();
  });
  expect(result.current).toBe(abyssDiscoverUrl());
});
it("keeps an in-flight catalog lookup and its result across closing and reopening", async () => {
  let finish!: (value: unknown) => void;
  mockFetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result, rerender } = renderHook(
    ({ open }) => useAbyssBrowseUrl(open),
    { initialProps: { open: true }, wrapper },
  );
  const signal = mockFetch.mock.calls[0][1].signal as AbortSignal;
  rerender({ open: false });
  expect(signal.aborted).toBe(false);
  await act(async () => {
    finish({
      ok: true,
      json: async () => [{ name: deviceName, slug: "cached-board" }],
    });
  });
  rerender({ open: true });
  await waitFor(() =>
    expect(result.current).toMatch(/\/keyboard\/cached-board$/),
  );
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("reuses the public catalog URL after remount and connection replacement", async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => [{ name: deviceName, slug: "remembered" }],
  });
  const first = renderHook(() => useAbyssBrowseUrl(true), { wrapper });
  await waitFor(() =>
    expect(first.result.current).toMatch(/keyboard\/remembered$/),
  );
  first.unmount();
  app.state.connection = {};
  const next = renderHook(() => useAbyssBrowseUrl(true), { wrapper });
  await waitFor(() =>
    expect(next.result.current).toMatch(/keyboard\/remembered$/),
  );
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
