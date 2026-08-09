/**
 * Jest stand-in for `@keyboard-hub/adapter-common`.
 *
 * The package publishes untranspiled ESM TypeScript with only `types` and
 * `import` export conditions, so the CommonJS test runtime can neither resolve
 * nor execute it. Wired in via `moduleNameMapper`.
 *
 * Only `compareKeyboardHubKeymaps` is consumed from it — the diff filtering,
 * counting and grouping live in `src/lib/abyss/abyssDiff.ts` precisely so they
 * can be tested for real. The comparison algorithm itself is covered by
 * `packages/adapter-common/tests/keyboard-hub-diff.test.ts` upstream, so tests
 * that need a specific diff mock this rather than reimplementing it.
 */

const EMPTY_DIFF = {
  bindingChanges: [],
  comboChanges: [],
  macroChanges: [],
  moduleChanges: [],
  layerNameChanges: [],
};

export function compareKeyboardHubKeymaps() {
  return EMPTY_DIFF;
}
