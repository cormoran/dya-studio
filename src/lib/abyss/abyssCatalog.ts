import { abyssBaseUrl, abyssKeyboardUrl } from "./abyssConfig";

export const abyssDiscoverUrl = () => `${abyssBaseUrl()}/discover`;

/** Public catalog lookup: never sends OAuth tokens/cookies or guesses a slug.
 * Only a unique exact name/slug match is safe; ambiguous search results use Discover.
 */
export async function findAbyssKeyboardUrl(
  deviceName: string,
  signal: AbortSignal,
): Promise<string> {
  const query = new URLSearchParams({ q: deviceName, page: "1", limit: "20" });
  const response = await fetch(
    `${abyssBaseUrl()}/api/v1/keyboards/search?${query}`,
    { signal, credentials: "omit" },
  );
  if (!response.ok) return abyssDiscoverUrl();
  const data: unknown = await response.json();
  if (!Array.isArray(data)) return abyssDiscoverUrl();
  const normalize = (name: string) =>
    name
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s_-]+/gu, "");
  const name = normalize(deviceName);
  const matches = data.filter(
    (item): item is { name: string; slug: string } =>
      typeof item?.name === "string" &&
      typeof item?.slug === "string" &&
      (normalize(item.name) === name || normalize(item.slug) === name),
  );
  return matches.length === 1
    ? abyssKeyboardUrl(matches[0].slug)
    : abyssDiscoverUrl();
}
