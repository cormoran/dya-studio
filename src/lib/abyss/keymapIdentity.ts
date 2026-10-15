import { abyssBaseUrl } from "./abyssConfig";

/** Stable source convention for fast-keymap PR #5; never hashes bindings. */
export function keymapIdentitySource(id: string): string {
  return `abyss:${new URL(abyssBaseUrl()).origin}/keymaps/${id}`;
}

export async function keymapIdentifier(id: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(keymapIdentitySource(id)),
  );
  const bytes = new Uint8Array(digest);
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  return (
    alphabet[bytes[0] >> 2] +
    alphabet[((bytes[0] & 3) << 4) | (bytes[1] >> 4)] +
    alphabet[((bytes[1] & 15) << 2) | (bytes[2] >> 6)] +
    alphabet[bytes[2] & 63]
  );
}

const storageKey = () =>
  `dya-studio:abyss-identities:${new URL(abyssBaseUrl()).origin}`;

export function rememberKeymap(identifier: string, id: string): void {
  try {
    const known = JSON.parse(localStorage.getItem(storageKey()) ?? "{}");
    localStorage.setItem(
      storageKey(),
      JSON.stringify({ ...known, [identifier]: id }),
    );
  } catch {
    /* Storage is optional; the owned list also resolves identifiers. */
  }
}

export function rememberedKeymap(identifier: string): string | undefined {
  try {
    const id = JSON.parse(localStorage.getItem(storageKey()) ?? "{}")[
      identifier
    ];
    return typeof id === "string" ? id : undefined;
  } catch {
    return undefined;
  }
}
