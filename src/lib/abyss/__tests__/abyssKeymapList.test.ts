/**
 * Tests for how candidate keymaps are queried.
 *
 * These pin a regression that made both dropdowns permanently empty: the
 * keyboard slug on the device snapshot is derived by the adapter from the ZMK
 * device name, not from the Abyss catalog, so filtering on it excluded
 * everything.
 */
import type { AbyssClient } from "@keyboard-hub/abyss-client";
import { listCandidateKeymaps } from "../abyssKeymapList";

/**
 * Each argument is one *query* (the filtered attempt, then the widened retry),
 * given as the pages that query returns.
 */
function fakeClient(...queries: unknown[][][]) {
  const listMyKeymaps = jest.fn();
  for (const pages of queries.length ? queries : [[[]]]) {
    pages.forEach((items, index) => {
      listMyKeymaps.mockResolvedValueOnce({
        items,
        pageCount: pages.length,
        page: index + 1,
      });
    });
  }
  listMyKeymaps.mockResolvedValue({ items: [], pageCount: 1, page: 1 });
  return {
    client: { listMyKeymaps } as unknown as AbyssClient,
    listMyKeymaps,
  };
}

/** One query returning a single page. */
const onePage = (items: unknown[]) => [items];

describe("listCandidateKeymaps", () => {
  it("never filters by keyboard slug", async () => {
    // The device reports "DYA Keyboard", which the adapter turns into
    // "dya-keyboard", while the catalog knows the same board as "dya2".
    const { client, listMyKeymaps } = fakeClient(onePage([]));

    await listCandidateKeymaps(client, { layoutId: "layout-1" });

    const [query] = listMyKeymaps.mock.calls[0];
    expect(query).not.toHaveProperty("keyboard");
  });

  it("filters by layout but never by variation", async () => {
    // A keymap saved against another variation of the same layout is still a
    // valid update target; narrowing to the variation hid those entirely.
    const { client, listMyKeymaps } = fakeClient(onePage([]));

    await listCandidateKeymaps(client, { layoutId: "layout-1" });

    const [query] = listMyKeymaps.mock.calls[0];
    expect(query).toMatchObject({ visibility: "all", layoutId: "layout-1" });
    expect(query).not.toHaveProperty("layoutVariationId");
  });

  it("omits layout filters entirely when the layout was not resolved", async () => {
    // Sending undefined would still be a filter key; showing the user's whole
    // list beats showing them nothing, and pre-flight catches a bad choice.
    const { client, listMyKeymaps } = fakeClient(onePage([]));

    await listCandidateKeymaps(client, {});

    const [query] = listMyKeymaps.mock.calls[0];
    expect(query).not.toHaveProperty("layoutId");
    expect(query.visibility).toBe("all");
  });

  it("never asks for more than the API's limit of 20", async () => {
    // GET /me/keymaps rejects limit > 20 with a 400 rather than clamping, so
    // asking for 50 failed every request and looked like an empty account.
    const { client, listMyKeymaps } = fakeClient(onePage([{ id: "k1" }]));

    await listCandidateKeymaps(client, {});

    expect(listMyKeymaps.mock.calls[0][0].limit).toBe(20);
  });

  it("pages through results beyond the first 20", async () => {
    const first = Array.from({ length: 20 }, (_, i) => ({ id: `k${i}` }));
    const { client, listMyKeymaps } = fakeClient([first, [{ id: "k20" }]]);

    const result = await listCandidateKeymaps(client, {});

    expect(listMyKeymaps).toHaveBeenCalledTimes(2);
    expect(listMyKeymaps.mock.calls[1][0].page).toBe(2);
    expect(result.items).toHaveLength(21);
  });

  it("returns the page items", async () => {
    const { client } = fakeClient(onePage([{ id: "k1" }, { id: "k2" }]));
    const result = await listCandidateKeymaps(client, {});

    expect(result.items).toHaveLength(2);
    expect(result.widened).toBe(false);
  });

  it("widens the search when the layout filter matches nothing", async () => {
    // resolveLayout matches on the geometry the firmware reports, so a keymap
    // saved against a slightly different variation of the same layout falls
    // outside the filter — which looked exactly like having no keymaps at all.
    const { client, listMyKeymaps } = fakeClient(
      onePage([]),
      onePage([{ id: "k1" }]),
    );

    const result = await listCandidateKeymaps(client, { layoutId: "layout-1" });

    expect(listMyKeymaps).toHaveBeenCalledTimes(2);
    expect(listMyKeymaps.mock.calls[1][0]).not.toHaveProperty("layoutId");
    expect(result.items).toHaveLength(1);
    expect(result.widened).toBe(true);
  });

  it("does not retry when the filtered query already found something", async () => {
    const { client, listMyKeymaps } = fakeClient(onePage([{ id: "k1" }]));

    await listCandidateKeymaps(client, { layoutId: "layout-1" });

    expect(listMyKeymaps).toHaveBeenCalledTimes(1);
  });

  it("does not retry when there was no filter to widen", async () => {
    const { client, listMyKeymaps } = fakeClient(onePage([]));

    const result = await listCandidateKeymaps(client, {});

    expect(listMyKeymaps).toHaveBeenCalledTimes(1);
    expect(result.widened).toBe(false);
  });
});
