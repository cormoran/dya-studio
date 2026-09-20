/**
 * Tests for how the configured Abyss instance is resolved.
 *
 * Dev and PR builds point at a staging deployment, so anything that links to
 * Abyss or names it in copy must follow this rather than the production host —
 * otherwise a dev build tells the user it is uploading somewhere it is not.
 */

const DEV_INSTANCE = "https://keyboard-abyss.cormoran707.workers.dev";

interface ConfigOptions {
  baseUrl?: string;
  clientId?: string;
  isLocalDevelopment?: boolean;
}

/** Reloads abyssConfig with the supplied build-time settings. */
async function loadConfig({
  baseUrl = "",
  clientId = "test-client",
  isLocalDevelopment = false,
}: ConfigOptions = {}) {
  jest.resetModules();
  jest.doMock("../../viteEnv", () => ({
    RPC_LOG_ENABLED: false,
    BUILD_LABEL: null,
    IS_LOCAL_DEVELOPMENT: isLocalDevelopment,
    ABYSS_CLIENT_ID: clientId,
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
    const { abyssBaseUrl } = await loadConfig();
    expect(abyssBaseUrl()).toBe("https://abyss.keyboard-hub.com");
  });

  it("uses the configured instance for dev and PR builds", async () => {
    const { abyssBaseUrl } = await loadConfig({ baseUrl: DEV_INSTANCE });
    expect(abyssBaseUrl()).toBe(DEV_INSTANCE);
  });
});

describe("abyssHost", () => {
  it("shows the production host by default", async () => {
    const { abyssHost } = await loadConfig();
    expect(abyssHost()).toBe("abyss.keyboard-hub.com");
  });

  it("shows the configured host so dev copy is not misleading", async () => {
    const { abyssHost } = await loadConfig({ baseUrl: DEV_INSTANCE });
    expect(abyssHost()).toBe("keyboard-abyss.cormoran707.workers.dev");
  });

  it("falls back rather than throwing on an unparseable value", async () => {
    const { abyssHost } = await loadConfig({ baseUrl: "not a url" });
    expect(abyssHost()).toBe("abyss.keyboard-hub.com");
  });
});

describe("isAbyssConfigured", () => {
  it("is false without a client id", async () => {
    const { isAbyssConfigured } = await loadConfig({ clientId: "" });
    expect(isAbyssConfigured()).toBe(false);
  });
});

describe("isAbyssTabVisible", () => {
  it("shows the tab locally without an OAuth client id", async () => {
    const { isAbyssConfigured, isAbyssTabVisible } = await loadConfig({
      clientId: "",
      isLocalDevelopment: true,
    });

    expect(isAbyssConfigured()).toBe(false);
    expect(isAbyssTabVisible()).toBe(true);
  });

  it("keeps the tab hidden in deployed builds without an OAuth client id", async () => {
    const { isAbyssTabVisible } = await loadConfig({ clientId: "" });
    expect(isAbyssTabVisible()).toBe(false);
  });

  it("shows the tab in deployed builds only when OAuth is configured", async () => {
    const { isAbyssTabVisible } = await loadConfig({ clientId: "test-client" });
    expect(isAbyssTabVisible()).toBe(true);
  });
});
