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

/**
 * Fetches candidate keymaps.
 *
 * Deliberately does *not* filter by keyboard slug. The slug on the device
 * snapshot is derived by the adapter from the ZMK device name
 * (`normalizeKeyboardSlug(deviceName)`), which is a different thing from the
 * Abyss catalog slug — a keyboard reporting itself as "DYA Keyboard" yields
 * "dya-keyboard" while the catalog knows it as "dya2". Passing that through
 * filtered every result out, so both dropdowns were permanently empty.
 *
 * The layout ids from `resolveLayout` *are* catalog identities, so they are
 * used when available. When the layout was not recognised there is nothing
 * trustworthy to filter on, and showing the user's full list beats showing an
 * empty one — the pre-flight checks catch a genuinely incompatible choice
 * before anything is written.
 */
export async function listCandidateKeymaps(
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
