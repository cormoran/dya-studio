/**
 * Jest stand-in for `@keyboard-hub/adapter-zmk`.
 *
 * Like `@keyboard-hub/abyss-client`, the package publishes untranspiled ESM
 * TypeScript with only `types` and `import` export conditions, so the CommonJS
 * test runtime can neither resolve nor execute it. Wired in via
 * `moduleNameMapper`; the real module runs in the Vite build and the browser.
 *
 * Nothing here is worth asserting against — `loadZmkConnection` and
 * `writeZmkKeymapDiff` only do anything with a live keyboard. Tests that need
 * them supply their own behaviour with `jest.mock(..., factory)`; this stub
 * exists so importing the module does not explode, and so a test that forgets
 * to mock fails loudly instead of silently doing nothing.
 */

function notMocked(name: string): never {
  throw new Error(
    `@keyboard-hub/adapter-zmk.${name} was called in a test without being mocked. ` +
      `It requires a live ZMK Studio connection; mock it with jest.mock().`,
  );
}

export function loadZmkConnection(): never {
  return notMocked("loadZmkConnection");
}

export function loadZmkPreview(): never {
  return notMocked("loadZmkPreview");
}

export function writeZmkKeymapDiff(): never {
  return notMocked("writeZmkKeymapDiff");
}

export const zmkAdapterLabel = "ZMK Studio";
