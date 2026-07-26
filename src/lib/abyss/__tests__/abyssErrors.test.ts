/**
 * Tests for the Abyss error classification.
 */
import { AbyssApiError, AbyssOAuthError } from "@keyboard-hub/abyss-client";
import {
  abyssErrorMessageKey,
  classifyAbyssError,
  isAbyssUnauthorized,
} from "../abyssErrors";

describe("classifyAbyssError", () => {
  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [422, "conflict"],
    [429, "rate_limited"],
    [500, "server"],
    [503, "server"],
    [418, "error"],
  ])("maps HTTP %i to %s", (status, expected) => {
    expect(classifyAbyssError(new AbyssApiError(status))).toBe(expected);
  });

  it("treats a user-declined consent as cancelled", () => {
    expect(
      classifyAbyssError(new AbyssOAuthError("denied", "access_denied")),
    ).toBe("cancelled");
  });

  it("treats a broken OAuth flow as its own bucket, not as cancelled", () => {
    // State mismatch / expired transaction is not the user backing out; saying
    // "cancelled" would send them looking for a mistake they did not make.
    expect(
      classifyAbyssError(new AbyssOAuthError("OAuth state mismatch")),
    ).toBe("oauth");
  });

  it("recognises the adapter's locked-keyboard error by duck typing", () => {
    expect(classifyAbyssError({ name: "FirmwareLockedError" })).toBe("locked");
    expect(classifyAbyssError({ code: "LOCKED" })).toBe("locked");
  });

  it("maps a failed fetch to a network error", () => {
    expect(classifyAbyssError(new TypeError("Failed to fetch"))).toBe(
      "network",
    );
  });

  it("falls back to a generic bucket", () => {
    expect(classifyAbyssError(new Error("boom"))).toBe("error");
    expect(classifyAbyssError(undefined)).toBe("error");
  });
});

describe("isAbyssUnauthorized", () => {
  it("is true only for a 401", () => {
    expect(isAbyssUnauthorized(new AbyssApiError(401))).toBe(true);
    expect(isAbyssUnauthorized(new AbyssApiError(403))).toBe(false);
    expect(isAbyssUnauthorized(new Error("401"))).toBe(false);
  });
});

describe("abyssErrorMessageKey", () => {
  it("never leaks the server's own message", () => {
    const error = new AbyssApiError(409);
    error.message = "keymap 01JABC does not match layout 01JXYZ";
    expect(abyssErrorMessageKey(error)).not.toContain("01JABC");
  });

  it("returns a distinct message per bucket", () => {
    const keys = [401, 403, 404, 429, 500].map((status) =>
      abyssErrorMessageKey(new AbyssApiError(status)),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
