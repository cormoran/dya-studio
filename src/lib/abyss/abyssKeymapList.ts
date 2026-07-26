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

export interface KeymapListFilter {
  /** Abyss layout id from `resolveLayout`, when the layout was recognised. */
  layoutId?: string;
  /** Abyss layout variation id from `resolveLayout`. */
  layoutVariationId?: string;
}

export interface KeymapListResult {
  items: AbyssKeymapSummary[];
  /** True when the layout filter matched nothing and the list was widened. */
  widened: boolean;
}

async function fetchPage(
  client: AbyssClient,
  filter: KeymapListFilter,
): Promise<AbyssKeymapSummary[]> {
  const page = await client.listMyKeymaps({
    visibility: "all",
    ...(filter.layoutId ? { layoutId: filter.layoutId } : {}),
    ...(filter.layoutVariationId
      ? { layoutVariationId: filter.layoutVariationId }
      : {}),
    page: 1,
    limit: 50,
  });
  return page.items;
}

/**
 * Fetches candidate keymaps, widening the search rather than showing nothing.
 *
 * Deliberately never filters by keyboard slug. The slug on the device snapshot
 * is derived by the adapter from the ZMK device name
 * (`normalizeKeyboardSlug(deviceName)`), which is a different thing from the
 * Abyss catalog slug — a board reporting itself as "DYA Keyboard" yields
 * "dya-keyboard" while the catalog knows it as "dya2". Passing that through
 * filtered every result out.
 *
 * The layout ids from `resolveLayout` *are* catalog identities, so they narrow
 * the list when available. But `resolveLayout` matches on the geometry the
 * firmware reports, and a keymap saved against a slightly different variation
 * of the same layout then falls outside the filter — which looked exactly like
 * having no keymaps at all. So when the filtered query comes back empty, the
 * search is retried unfiltered and the caller is told it was widened. The
 * pre-flight checks are what actually stop an incompatible write.
 */
export async function listCandidateKeymaps(
  client: AbyssClient,
  filter: KeymapListFilter,
): Promise<KeymapListResult> {
  const hasFilter = Boolean(filter.layoutId || filter.layoutVariationId);
  const filtered = await fetchPage(client, filter);
  if (filtered.length > 0 || !hasFilter) {
    return { items: filtered, widened: false };
  }
  return { items: await fetchPage(client, {}), widened: true };
}
