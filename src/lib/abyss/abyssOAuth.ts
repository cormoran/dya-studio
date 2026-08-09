/**
 * OAuth redirect plumbing for the Keyboard Abyss login.
 *
 * ## Why a popup rather than a plain redirect
 *
 * The Import/Export tab only renders while a keyboard is connected, so the user
 * is *by construction* connected when they press "Log in". A full-page
 * navigation to abyss.keyboard-hub.com tears down the Web Serial / WebUSB / BLE
 * session; on BLE they would have to re-pick the device from the browser picker
 * afterwards. A popup keeps the connection alive in the opener.
 *
 * The full-page redirect is still supported as a fallback for popup blockers,
 * which is why the callback route has to work standalone.
 *
 * ## How the popup talks back
 *
 * The callback page broadcasts the callback URL on a `BroadcastChannel` and,
 * belt-and-braces, via `window.opener.postMessage`. `BroadcastChannel` is the
 * primary path because `window.opener` is severed if Abyss serves
 * `Cross-Origin-Opener-Policy: same-origin`.
 *
 * Only the tab that *started* the login answers, and it proves that by matching
 * the OAuth `state` parameter against the one it generated. That matters: the
 * PKCE code verifier lives in the initiating tab's `sessionStorage`, so any
 * other open DYA Studio tab would fail the exchange. The acknowledgement is
 * also how the callback page tells which mode it is in — acknowledged means it
 * is a popup and should close, silence means it is a full-page redirect and
 * must exchange the code itself.
 */
import type { AbyssClient } from "@keyboard-hub/abyss-client";
import { navigateTo } from "../navigate";

/** Standalone route that Abyss redirects back to. Must match the redirect URI
 * registered on the OAuth client. */
export const OAUTH_CALLBACK_PATH = "/oauth/callback";

/** Path the user is sent back to after a full-page redirect login. */
export const IMPORT_EXPORT_PATH = "/import-export";

const CHANNEL_NAME = "dya-studio-abyss-oauth";
const MSG_CALLBACK = "dya-studio:abyss-oauth-callback";
const MSG_ACK = "dya-studio:abyss-oauth-ack";
const RETURN_PATH_KEY = "dya-studio-abyss-return-path";

/** How long the callback page waits for the opener to claim the callback
 * before assuming it is a full-page redirect and exchanging the code itself. */
const ACK_TIMEOUT_MS = 1500;
/** Give up on a login the user never finished. */
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
/** `window.closed` is the only way to notice the user dismissed the popup. */
const POPUP_POLL_MS = 500;

const POPUP_FEATURES = "width=520,height=760,menubar=no,toolbar=no";
const POPUP_NAME = "abyss-oauth";

/** Outcome of a login attempt started from the Import/Export tab. */
export type AbyssLoginOutcome =
  /** Tokens are stored; the caller should refresh its auth state. */
  | { status: "authorized" }
  /** Popups are blocked, so the whole page is navigating to Abyss. Nothing
   * further will run in this document. */
  | { status: "redirecting" }
  /** The user closed the popup, or it never reported back in time. */
  | { status: "cancelled" };

type CallbackMessage = { type: typeof MSG_CALLBACK; href: string };
type AckMessage = { type: typeof MSG_ACK; state: string };

function openChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The `state` value carried by a callback URL, or `null` if it has none. */
function stateOf(href: string): string | null {
  try {
    return new URL(href).searchParams.get("state");
  } catch {
    return null;
  }
}

/** Where to send the user after a full-page redirect login. */
export function saveReturnPath(path: string): void {
  try {
    window.sessionStorage.setItem(RETURN_PATH_KEY, path);
  } catch {
    // Private-mode storage failures just cost us the deep link.
  }
}

/** The stashed return path, defaulting to the Import/Export tab. */
export function takeReturnPath(): string {
  try {
    const path = window.sessionStorage.getItem(RETURN_PATH_KEY);
    window.sessionStorage.removeItem(RETURN_PATH_KEY);
    return path || IMPORT_EXPORT_PATH;
  } catch {
    return IMPORT_EXPORT_PATH;
  }
}

/**
 * Starts the Abyss login and resolves once tokens are stored.
 *
 * Opens a popup when it can and falls back to navigating the whole page. The
 * returned promise never rejects for user-driven outcomes (a dismissed popup
 * resolves as `cancelled`); it only rejects if the token exchange itself fails.
 */
export async function startAbyssLogin(
  client: AbyssClient,
  returnPath: string,
): Promise<AbyssLoginOutcome> {
  const state = randomState();
  // Persists the PKCE verifier + state into *this* tab's transaction storage.
  const authorizeUrl = await client.buildAuthorizationUrl({ state });
  saveReturnPath(returnPath);

  let popup: Window | null = null;
  try {
    popup = window.open(authorizeUrl, POPUP_NAME, POPUP_FEATURES);
  } catch {
    popup = null;
  }

  if (!popup) {
    navigateTo(authorizeUrl);
    return { status: "redirecting" };
  }

  const href = await waitForCallback(state, popup);
  try {
    popup.close();
  } catch {
    // A popup we are not allowed to close is harmless.
  }
  if (!href) return { status: "cancelled" };

  await client.handleRedirectCallback(href);
  return { status: "authorized" };
}

/**
 * Waits for the callback page to report the redirect URL for `state`.
 *
 * Resolves with the callback href, or `null` when the user closed the popup or
 * the login timed out.
 */
function waitForCallback(state: string, popup: Window): Promise<string | null> {
  return new Promise((resolve) => {
    const channel = openChannel();
    let settled = false;

    const finish = (href: string | null) => {
      if (settled) return;
      settled = true;
      window.clearInterval(pollTimer);
      window.clearTimeout(timeoutTimer);
      window.removeEventListener("message", onMessage);
      channel?.removeEventListener("message", onChannelMessage);
      channel?.close();
      resolve(href);
    };

    const accept = (href: string) => {
      if (stateOf(href) !== state) return;
      // Tell the callback page we own this login so it closes instead of
      // trying to exchange the code itself.
      const ack: AckMessage = { type: MSG_ACK, state };
      channel?.postMessage(ack);
      finish(href);
    };

    const onChannelMessage = (event: MessageEvent) => {
      const data = event.data as CallbackMessage | AckMessage | undefined;
      if (data?.type === MSG_CALLBACK) accept(data.href);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as CallbackMessage | undefined;
      if (data?.type === MSG_CALLBACK) accept(data.href);
    };

    channel?.addEventListener("message", onChannelMessage);
    window.addEventListener("message", onMessage);

    // The popup closing without a message is the only "user cancelled" signal
    // the browser gives us.
    const pollTimer = window.setInterval(() => {
      if (popup.closed) finish(null);
    }, POPUP_POLL_MS);
    const timeoutTimer = window.setTimeout(
      () => finish(null),
      LOGIN_TIMEOUT_MS,
    );
  });
}

/**
 * Announces a finished OAuth redirect to the tab that started it.
 *
 * Resolves `true` when that tab claimed the callback — meaning this document is
 * the popup and should just close. Resolves `false` when nobody answered, in
 * which case this document is a full-page redirect and owns the token exchange.
 */
export function relayAbyssCallback(href: string): Promise<boolean> {
  return new Promise((resolve) => {
    const state = stateOf(href);
    const channel = openChannel();
    let settled = false;

    const finish = (claimed: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutTimer);
      channel?.removeEventListener("message", onChannelMessage);
      channel?.close();
      resolve(claimed);
    };

    const onChannelMessage = (event: MessageEvent) => {
      const data = event.data as AckMessage | CallbackMessage | undefined;
      if (data?.type === MSG_ACK && data.state === state) finish(true);
    };
    channel?.addEventListener("message", onChannelMessage);

    const message: CallbackMessage = { type: MSG_CALLBACK, href };
    channel?.postMessage(message);
    try {
      // Only reaches an opener that survived COOP; the channel is the real path.
      window.opener?.postMessage(message, window.location.origin);
    } catch {
      // No opener, or one we may not talk to.
    }

    const timeoutTimer = window.setTimeout(() => finish(false), ACK_TIMEOUT_MS);
  });
}
