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

function fakeClient(items: unknown[] = []) {
  const listMyKeymaps = jest.fn().mockResolvedValue({ items });
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
    await expect(listCandidateKeymaps(client, {})).resolves.toHaveLength(2);
  });
});
