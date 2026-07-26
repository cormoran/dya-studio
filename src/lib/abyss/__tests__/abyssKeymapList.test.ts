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

function fakeClient(...pages: unknown[][]) {
  const listMyKeymaps = jest.fn();
  for (const items of pages.length ? pages : [[]]) {
    listMyKeymaps.mockResolvedValueOnce({ items });
  }
  listMyKeymaps.mockResolvedValue({ items: [] });
  return {
    client: { listMyKeymaps } as unknown as AbyssClient,
    listMyKeymaps,
  };
}

describe("listCandidateKeymaps", () => {
  it("never filters by keyboard slug", async () => {
    // The device reports "DYA Keyboard", which the adapter turns into
    // "dya-keyboard", while the catalog knows the same board as "dya2".
    const { client, listMyKeymaps } = fakeClient();

    await listCandidateKeymaps(client, {
      layoutId: "layout-1",
      layoutVariationId: "variation-1",
    });

    const [query] = listMyKeymaps.mock.calls[0];
    expect(query).not.toHaveProperty("keyboard");
  });

  it("filters by the resolved layout, which is a catalog identity", async () => {
    const { client, listMyKeymaps } = fakeClient();

    await listCandidateKeymaps(client, {
      layoutId: "layout-1",
      layoutVariationId: "variation-1",
    });

    expect(listMyKeymaps).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: "all",
        layoutId: "layout-1",
        layoutVariationId: "variation-1",
      }),
    );
  });

  it("omits layout filters entirely when the layout was not resolved", async () => {
    // Sending undefined would still be a filter key; showing the user's whole
    // list beats showing them nothing, and pre-flight catches a bad choice.
    const { client, listMyKeymaps } = fakeClient();

    await listCandidateKeymaps(client, {});

    const [query] = listMyKeymaps.mock.calls[0];
    expect(query).not.toHaveProperty("layoutId");
    expect(query).not.toHaveProperty("layoutVariationId");
    expect(query.visibility).toBe("all");
  });

  it("returns the page items", async () => {
    const { client } = fakeClient([{ id: "k1" }, { id: "k2" }]);
    const result = await listCandidateKeymaps(client, {});

    expect(result.items).toHaveLength(2);
    expect(result.widened).toBe(false);
  });

  it("widens the search when the layout filter matches nothing", async () => {
    // resolveLayout matches on the geometry the firmware reports, so a keymap
    // saved against a slightly different variation of the same layout falls
    // outside the filter — which looked exactly like having no keymaps at all.
    const { client, listMyKeymaps } = fakeClient([], [{ id: "k1" }]);

    const result = await listCandidateKeymaps(client, {
      layoutId: "layout-1",
      layoutVariationId: "variation-1",
    });

    expect(listMyKeymaps).toHaveBeenCalledTimes(2);
    expect(listMyKeymaps.mock.calls[1][0]).not.toHaveProperty("layoutId");
    expect(result.items).toHaveLength(1);
    expect(result.widened).toBe(true);
  });

  it("does not retry when the filtered query already found something", async () => {
    const { client, listMyKeymaps } = fakeClient([{ id: "k1" }]);

    await listCandidateKeymaps(client, { layoutId: "layout-1" });

    expect(listMyKeymaps).toHaveBeenCalledTimes(1);
  });

  it("does not retry when there was no filter to widen", async () => {
    const { client, listMyKeymaps } = fakeClient([]);

    const result = await listCandidateKeymaps(client, {});

    expect(listMyKeymaps).toHaveBeenCalledTimes(1);
    expect(result.widened).toBe(false);
  });
});
