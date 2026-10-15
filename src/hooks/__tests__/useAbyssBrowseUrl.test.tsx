import { act, renderHook, waitFor } from "@testing-library/react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { useAbyssBrowseUrl } from "../useAbyssBrowseUrl";
import { abyssDiscoverUrl } from "../../lib/abyss/abyssCatalog";
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
  app.state.deviceInfo.name = "DYA";
});
afterAll(() => {
  global.fetch = originalFetch;
});
it("does not look up a closed menu and resolves a public keyboard without sign-in", async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => [{ name: "DYA", slug: "dya-split" }],
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
      json: async () => [{ name: "DYA", slug: "old-board" }],
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
