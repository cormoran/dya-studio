/**
 * Jest stub for {@link ../viteEnv}. The real module reads `import.meta.env`,
 * which the CommonJS test runtime can't parse. Tests run as a production-like
 * build, so dev-only logging stays off.
 */
export const RPC_LOG_ENABLED = false;
export const BUILD_LABEL: string | null = null;
export const ABYSS_CLIENT_ID = "test-abyss-client-id";
export const ABYSS_BASE_URL = "";
