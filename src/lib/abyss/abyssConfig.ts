/**
 * Build-time Keyboard Abyss configuration.
 *
 * Deliberately separate from {@link ./abyssClient.ts}: `App.tsx` only needs to
 * know *whether* Abyss is configured in order to decide if the Import/Export
 * tab exists, and that question should not drag the Abyss SDK into the app
 * shell's module graph.
 */
import { ABYSS_BASE_URL, ABYSS_CLIENT_ID } from "../viteEnv";

export { ABYSS_BASE_URL, ABYSS_CLIENT_ID };

/**
 * Whether this build was given an Abyss OAuth client id.
 *
 * When false the Import/Export tab is not registered at all — its only entry
 * point is a sign-in that could not succeed.
 */
export function isAbyssConfigured(): boolean {
  return ABYSS_CLIENT_ID.length > 0;
}

/** Where the client library points when `VITE_ABYSS_BASE_URL` is unset. */
const DEFAULT_ABYSS_BASE_URL = "https://abyss.keyboard-hub.com";

/**
 * Origin of the Abyss instance this build talks to.
 *
 * Dev and PR preview builds point at the staging deployment, so anything that
 * links to Abyss or names it in copy has to read this rather than hardcoding
 * the production host — otherwise a dev build tells the user it is uploading
 * somewhere it is not.
 */
export function abyssBaseUrl(): string {
  return ABYSS_BASE_URL || DEFAULT_ABYSS_BASE_URL;
}

/** Host shown in UI copy, e.g. `abyss.keyboard-hub.com`. */
export function abyssHost(): string {
  try {
    return new URL(abyssBaseUrl()).host;
  } catch {
    return DEFAULT_ABYSS_BASE_URL.replace("https://", "");
  }
}

/** Public page for a keyboard in the Abyss catalog. */
export function abyssKeyboardUrl(slug: string): string {
  return `${abyssBaseUrl()}/keyboard/${encodeURIComponent(slug)}`;
}

/** Where a user registers a keyboard/keymap that Abyss does not know yet. */
export function abyssRegisterUrl(): string {
  return `${abyssBaseUrl()}/keymaps/register`;
}
