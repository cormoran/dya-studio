/**
 * Lazily-constructed Keyboard Abyss API client.
 *
 * One client instance per page load. It owns the OAuth token set, so every
 * caller must go through {@link getAbyssClient} rather than constructing its
 * own — two clients would each hold a different token and silently disagree
 * about whether the user is logged in.
 *
 * Tokens live in `localStorage` so closing the tab or browser preserves login.
 * PKCE transactions remain in the initiating tab’s `sessionStorage`.
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
  // Preserve an existing login when upgrading from tab-scoped token storage.
  const tokenKey = `keyboard-abyss:${ABYSS_CLIENT_ID}:token`;
  const legacyToken = window.sessionStorage.getItem(tokenKey);
  if (legacyToken) {
    if (!window.localStorage.getItem(tokenKey)) {
      window.localStorage.setItem(tokenKey, legacyToken);
    }
    window.sessionStorage.removeItem(tokenKey);
  }
  client = createAbyssClient({
    clientId: ABYSS_CLIENT_ID,
    redirectUri: `${window.location.origin}${OAUTH_CALLBACK_PATH}`,
    scopes: ABYSS_SCOPES,
    // Only the in-flight PKCE transaction is tab-scoped.
    // The transaction *must* stay in this tab: the tab that builds the
    // authorization URL is the tab that exchanges the code for a token.
    storage: window.localStorage,
    transactionStorage: window.sessionStorage,
    ...(ABYSS_BASE_URL ? { abyssBaseUrl: ABYSS_BASE_URL } : {}),
  });
  // API requests and the background renewal may both encounter expiry.
  // Share the rotation so they do not spend the same refresh token twice.
  const sharedClient = client;
  const refresh = client.refreshToken.bind(client);
  const rotate = async () => {
    const previous = sharedClient.getTokenSet()?.refreshToken;
    if (!navigator.locks) return refresh();
    return navigator.locks.request(`${tokenKey}:refresh`, async () => {
      const current = sharedClient.getTokenSet();
      // Another tab may already have rotated while we waited for the lock.
      if (current && current.refreshToken !== previous) return current;
      if (!current) throw new Error("Abyss session was cleared");
      return refresh();
    });
  };
  let refreshing: ReturnType<AbyssClient["refreshToken"]> | null = null;
  client.refreshToken = () => {
    if (!refreshing) {
      refreshing = rotate().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  };
  return client;
}

/** Test seam: drops the memoized client so the next call rebuilds it. */
export function resetAbyssClientForTest(): void {
  client = null;
  clientBuilt = false;
}
