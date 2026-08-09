/**
 * Lazily-constructed Keyboard Abyss API client.
 *
 * One client instance per page load. It owns the OAuth token set, so every
 * caller must go through {@link getAbyssClient} rather than constructing its
 * own — two clients would each hold a different token and silently disagree
 * about whether the user is logged in.
 *
 * Tokens live in `sessionStorage`: they survive a reload (which the OAuth
 * redirect fallback needs) but are gone when the tab closes. The library
 * defaults to in-memory storage, which would drop the token on every reload.
 */
import {
  createAbyssClient,
  type AbyssClient,
} from "@keyboard-hub/abyss-client";
import {
  ABYSS_BASE_URL,
  ABYSS_CLIENT_ID,
  isAbyssConfigured,
} from "./abyssConfig";
import { OAUTH_CALLBACK_PATH } from "./abyssOAuth";

export { isAbyssConfigured };

/** Scopes the Import/Export tab needs: read the profile, read and write
 * keymaps, and resolve the connected keyboard's layout. */
const ABYSS_SCOPES = [
  "profile:read",
  "keymap:read",
  "keymap:write",
  "layout:read",
] as const;

let client: AbyssClient | null = null;
let clientBuilt = false;

/**
 * The shared client, or `null` when unconfigured.
 *
 * `createAbyssClient` throws on an empty client id, so the configured check has
 * to happen before construction rather than being handled by the caller.
 */
export function getAbyssClient(): AbyssClient | null {
  if (clientBuilt) return client;
  clientBuilt = true;
  if (!isAbyssConfigured()) return null;
  client = createAbyssClient({
    clientId: ABYSS_CLIENT_ID,
    redirectUri: `${window.location.origin}${OAUTH_CALLBACK_PATH}`,
    scopes: ABYSS_SCOPES,
    // Both the token set and the in-flight PKCE transaction are tab-scoped.
    // The transaction *must* stay in this tab: the tab that builds the
    // authorization URL is the tab that exchanges the code for a token.
    storage: window.sessionStorage,
    transactionStorage: window.sessionStorage,
    ...(ABYSS_BASE_URL ? { abyssBaseUrl: ABYSS_BASE_URL } : {}),
  });
  return client;
}

/** Test seam: drops the memoized client so the next call rebuilds it. */
export function resetAbyssClientForTest(): void {
  client = null;
  clientBuilt = false;
}
