/**
 * Jest stand-in for `@keyboard-hub/abyss-client`.
 *
 * The real package publishes untranspiled ESM TypeScript and declares only the
 * `types` and `import` export conditions, so the CommonJS test runtime cannot
 * load it at all. It is wired in via `moduleNameMapper` so every test gets this
 * stub without per-file boilerplate; the real SDK is only ever executed by the
 * Vite build and in the browser.
 *
 * Only the surface DYA Studio actually uses is stubbed. Tests that need client
 * behaviour inject their own fake through `getAbyssClient`.
 */

/** Mirrors the real error's `status` field, which the error mapping reads. */
export class AbyssApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status = 500, code?: string) {
    super(`AbyssApiError ${status}`);
    this.name = "AbyssApiError";
    this.status = status;
    this.code = code;
  }
}

export class AbyssOAuthError extends Error {
  readonly code?: string;

  constructor(message = "AbyssOAuthError", code?: string) {
    super(message);
    this.name = "AbyssOAuthError";
    this.code = code;
  }
}

export class AbyssClient {}

// Plain functions rather than jest.fn(): this file is part of the `src`
// TypeScript project, which has no jest globals. Tests that need client
// behaviour inject a fake through `getAbyssClient` instead of asserting on
// these.
export function createAbyssClient(): AbyssClient {
  return new AbyssClient();
}

export function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}
