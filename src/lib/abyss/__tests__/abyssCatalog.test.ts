import { findAbyssKeyboardUrl, abyssDiscoverUrl } from "../abyssCatalog";
const originalFetch = global.fetch;
const mockFetch = jest.fn();
beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
});
afterAll(() => {
  global.fetch = originalFetch;
});
it("links a confirmed public catalog keyboard using its canonical slug without authentication", async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => [{ name: "DYA Keyboard", slug: "dya2" }],
  });
  expect(
    await findAbyssKeyboardUrl("DYA Keyboard", new AbortController().signal),
  ).toMatch(/\/keyboard\/dya2$/);
  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/v1/keyboards/search?"),
    expect.objectContaining({ credentials: "omit" }),
  );
});
it("uses Discover when missing, ambiguous, or the catalog is unavailable", async () => {
  for (const items of [
    [],
    [{ name: "Other", slug: "other" }],
    [
      { name: "DYA", slug: "dya" },
      { name: "DYA", slug: "dya-2" },
    ],
  ]) {
    mockFetch.mockResolvedValue({ ok: true, json: async () => items });
    expect(
      await findAbyssKeyboardUrl("DYA", new AbortController().signal),
    ).toBe(abyssDiscoverUrl());
  }
  mockFetch.mockResolvedValue({ ok: false });
  expect(await findAbyssKeyboardUrl("DYA", new AbortController().signal)).toBe(
    abyssDiscoverUrl(),
  );
});
it("preserves Japanese names rather than matching unrelated non-Latin names", async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => [{ name: "別のキーボード", slug: "another" }],
  });
  expect(
    await findAbyssKeyboardUrl("キーボード", new AbortController().signal),
  ).toBe(abyssDiscoverUrl());
});
