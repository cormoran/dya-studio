/**
 * Lists the signed-in user's keymaps that are candidates for this keyboard.
 *
 * Shared by the export and import sections so they cannot drift apart on which
 * keymaps they consider compatible.
 */
import type {
  AbyssClient,
  AbyssKeymapSummary,
} from "@keyboard-hub/abyss-client";

/**
 * `GET /me/keymaps` rejects `limit` above 20 outright — a 400
 * `VALIDATION_ERROR`, not a clamp — so candidates have to be paged in. Matches
 * what Abyss's own import modal does.
 */
const PAGE_SIZE = 20;
const MAX_PAGES = 5;

export interface KeymapListFilter {
  /**
   * Abyss layout id from `resolveLayout`, when the layout was recognised.
   *
   * Deliberately the only filter. Narrowing further by `layoutVariationId`
   * excluded keymaps saved against a different variation of the *same* layout,
   * which are still perfectly writable — the pre-flight checks are what decide
   * whether a given keymap actually fits the connected keyboard.
   */
  layoutId?: string;
}

export interface KeymapListResult {
  items: AbyssKeymapSummary[];
  /** True when the layout filter matched nothing and the list was widened. */
  widened: boolean;
}

/** Pages through the user's keymaps, up to {@link MAX_PAGES}. */
async function fetchAll(
  client: AbyssClient,
  filter: KeymapListFilter,
): Promise<AbyssKeymapSummary[]> {
  const collected: AbyssKeymapSummary[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await client.listMyKeymaps({
      visibility: "all",
      ...(filter.layoutId ? { layoutId: filter.layoutId } : {}),
      page,
      limit: PAGE_SIZE,
    });
    collected.push(...result.items);
    // Stop on a short page as well as on `pageCount`: a full page is the only
    // reliable signal that another one might exist, and it keeps the loop
    // terminating even if the field is missing.
    if (result.items.length < PAGE_SIZE || page >= result.pageCount) break;
  }
  return collected;
}

/**
 * Fetches candidate keymaps, widening the search rather than showing nothing.
 *
 * Deliberately never filters by keyboard slug. The slug on the device snapshot
 * is derived by the adapter from the ZMK device name
 * (`normalizeKeyboardSlug(deviceName)`), which is a different thing from the
 * Abyss catalog slug — a board reporting itself as "DYA Keyboard" yields
 * "dya-keyboard" while the catalog knows it as "dya2".
 *
 * The layout id from `resolveLayout` *is* a catalog identity, so it narrows the
 * list when available — but only the layout, never the variation: a keymap on
 * another variation of the same layout is still a valid update target. When
 * even that comes back empty the search is retried unfiltered and the caller is
 * told it was widened; the pre-flight checks are what actually stop an
 * incompatible write.
 */
export async function listCandidateKeymaps(
  client: AbyssClient,
  filter: KeymapListFilter,
): Promise<KeymapListResult> {
  const hasFilter = Boolean(filter.layoutId);
  const filtered = await fetchAll(client, filter);
  if (filtered.length > 0 || !hasFilter) {
    return { items: filtered, widened: false };
  }
  return { items: await fetchAll(client, {}), widened: true };
}
