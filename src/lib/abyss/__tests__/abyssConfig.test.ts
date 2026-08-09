/**
 * Tests for how the configured Abyss instance is resolved.
 *
 * Dev and PR builds point at a staging deployment, so anything that links to
 * Abyss or names it in copy must follow this rather than the production host —
 * otherwise a dev build tells the user it is uploading somewhere it is not.
 */

const DEV_INSTANCE = "https://keyboard-abyss.cormoran707.workers.dev";

/** Reloads abyssConfig with a specific VITE_ABYSS_BASE_URL. */
async function loadConfig(baseUrl: string) {
  jest.resetModules();
  jest.doMock("../../viteEnv", () => ({
    RPC_LOG_ENABLED: false,
    BUILD_LABEL: null,
    ABYSS_CLIENT_ID: "test-client",
    ABYSS_BASE_URL: baseUrl,
  }));
  return import("../abyssConfig");
}

afterEach(() => {
  jest.dontMock("../../viteEnv");
  jest.resetModules();
});

describe("abyssBaseUrl", () => {
  it("falls back to production when unset", async () => {
    const { abyssBaseUrl } = await loadConfig("");
    expect(abyssBaseUrl()).toBe("https://abyss.keyboard-hub.com");
  });

  it("uses the configured instance for dev and PR builds", async () => {
    const { abyssBaseUrl } = await loadConfig(DEV_INSTANCE);
    expect(abyssBaseUrl()).toBe(DEV_INSTANCE);
  });
});

describe("abyssHost", () => {
  it("shows the production host by default", async () => {
    const { abyssHost } = await loadConfig("");
    expect(abyssHost()).toBe("abyss.keyboard-hub.com");
  });

  it("shows the configured host so dev copy is not misleading", async () => {
    const { abyssHost } = await loadConfig(DEV_INSTANCE);
    expect(abyssHost()).toBe("keyboard-abyss.cormoran707.workers.dev");
  });

  it("falls back rather than throwing on an unparseable value", async () => {
    const { abyssHost } = await loadConfig("not a url");
    expect(abyssHost()).toBe("abyss.keyboard-hub.com");
  });
});

describe("isAbyssConfigured", () => {
  it("is false without a client id, which hides the tab entirely", async () => {
    jest.resetModules();
    jest.doMock("../../viteEnv", () => ({
      RPC_LOG_ENABLED: false,
      BUILD_LABEL: null,
      ABYSS_CLIENT_ID: "",
      ABYSS_BASE_URL: "",
    }));
    const { isAbyssConfigured } = await import("../abyssConfig");
    expect(isAbyssConfigured()).toBe(false);
  });
});
