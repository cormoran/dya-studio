/**
 * Turns Keyboard Abyss client errors into user-facing text and coarse
 * analytics buckets.
 *
 * API error bodies can echo request data back, so they are never surfaced
 * verbatim or sent to analytics — the HTTP status is mapped to a fixed message
 * key instead.
 */
import { AbyssApiError, AbyssOAuthError } from "@keyboard-hub/abyss-client";

/** Coarse, non-identifying bucket for a failed Abyss operation. */
export type AbyssFailReason =
  | "cancelled"
  | "oauth"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "network"
  | "locked"
  | "server"
  | "error";

/** True when the failure means the stored token is no longer usable. The
 * client refreshes on its own, so a 401 that reaches us means the refresh token
 * is gone too and the user has to log in again. */
export function isAbyssUnauthorized(error: unknown): boolean {
  return error instanceof AbyssApiError && error.status === 401;
}

/** Map an arbitrary error to a coarse bucket safe to send to analytics. */
export function classifyAbyssError(error: unknown): AbyssFailReason {
  if (error instanceof AbyssApiError) {
    if (error.status === 401) return "unauthorized";
    if (error.status === 403) return "forbidden";
    if (error.status === 404) return "not_found";
    if (error.status === 409 || error.status === 422) return "conflict";
    if (error.status === 429) return "rate_limited";
    if (error.status >= 500) return "server";
    return "error";
  }
  if (error instanceof AbyssOAuthError) {
    // `code` is only set when Abyss itself returned an OAuth `error` param.
    // Everything else (state mismatch, expired or missing PKCE transaction) is
    // a broken flow, not a user declining consent — saying "cancelled" there
    // would send the user looking for a mistake they did not make.
    return error.code === "access_denied" ? "cancelled" : "oauth";
  }
  const named = error as { code?: unknown; name?: unknown } | null;
  if (named?.code === "LOCKED" || named?.name === "FirmwareLockedError") {
    return "locked";
  }
  // `fetch` rejects with a TypeError when it cannot reach the host at all.
  if (error instanceof TypeError) return "network";
  return "error";
}

/**
 * English message key for an Abyss error, to be passed through `t()`.
 *
 * Returns fixed strings rather than the server's message so that nothing from
 * a response body is rendered directly.
 */
export function abyssErrorMessageKey(error: unknown): string {
  switch (classifyAbyssError(error)) {
    case "unauthorized":
      return "Your Abyss session expired. Please log in again.";
    case "forbidden":
      return "Your Abyss account does not have permission for this action.";
    case "not_found":
      return "This keymap no longer exists on Abyss.";
    case "conflict":
      return "Abyss rejected this keymap. It may not match the connected keyboard.";
    case "rate_limited":
      return "Too many requests to Abyss. Please wait a moment and try again.";
    case "server":
      return "Abyss is having trouble right now. Please try again later.";
    case "network":
      return "Could not reach Abyss. Check your network connection.";
    case "locked":
      return "The keyboard is locked. Unlock it and try again.";
    case "cancelled":
      return "Abyss login was cancelled.";
    case "oauth":
      return "Abyss sign-in could not be completed. Please start again from the Import/Export tab.";
    default:
      return "Something went wrong talking to Abyss.";
  }
}
