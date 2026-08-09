/**
 * Build-time flag for RPC debug logging, isolated in its own module.
 *
 * `import.meta.env` only exists under Vite; the CommonJS Jest runtime can't
 * even parse the `import.meta` token. Keeping the reference here (and nowhere
 * else) lets Jest swap the whole module for a stub via `moduleNameMapper`
 * without every consumer having to guard the access.
 *
 * RPC logging is enabled when either:
 * - running the local `vite dev` server (`import.meta.env.DEV`), or
 * - the build was produced with `VITE_ENABLE_RPC_LOG=true` — the dev and PR
 *   preview Cloudflare Workers deployments (built in `.github/workflows/test.yml`)
 *   set this so their production-mode bundles still log; the real production
 *   release build (`.github/workflows/release.yml`) leaves it unset.
 *
 * Both operands are static, so Vite folds `RPC_LOG_ENABLED` to a literal and
 * tree-shakes the logging branch out of the production release bundle.
 */
export const RPC_LOG_ENABLED: boolean =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_RPC_LOG === "true";

/**
 * Short badge shown in the header to mark non-production builds, or `null` to
 * show nothing. The value comes from:
 * - `VITE_BUILD_LABEL` — set at build time by `.github/workflows/test.yml` to
 *   `"PR"` for pull-request preview deployments and `"Dev"` for the `main`
 *   dev deployment.
 * - a local `vite dev` server falls back to `"Dev"` (`import.meta.env.DEV`).
 *
 * The production release build (`.github/workflows/release.yml`) leaves
 * `VITE_BUILD_LABEL` unset and runs in production mode, so this folds to `null`
 * and the badge is tree-shaken away.
 */
export const BUILD_LABEL: string | null =
  (import.meta.env.VITE_BUILD_LABEL as string | undefined) ||
  (import.meta.env.DEV ? "Dev" : null);

/**
 * OAuth client id issued by Keyboard Abyss (Settings > Developer), or `""` when
 * the build was produced without one.
 *
 * The Import/Export tab is hidden entirely when this is empty — a local
 * `vite dev` without a `.env` should not show a tab whose only action is a login
 * that cannot succeed. Set `VITE_ABYSS_CLIENT_ID` in the build environment
 * (`.github/workflows/test.yml` and `.github/workflows/release.yml`) to enable
 * it.
 */
export const ABYSS_CLIENT_ID: string =
  (import.meta.env.VITE_ABYSS_CLIENT_ID as string | undefined) || "";

/**
 * Base URL of the Keyboard Abyss instance to talk to. Empty means "use the
 * library default" (https://abyss.keyboard-hub.com). Overridden by
 * `VITE_ABYSS_BASE_URL` when pointing a build at a local or staging Abyss.
 */
export const ABYSS_BASE_URL: string =
  (import.meta.env.VITE_ABYSS_BASE_URL as string | undefined) || "";
