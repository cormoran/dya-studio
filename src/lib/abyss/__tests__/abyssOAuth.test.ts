/**
 * Tests for the OAuth popup/redirect plumbing.
 *
 * The interesting behaviour is entirely about *which* document exchanges the
 * authorization code, so the tests drive both halves of the handshake against
 * a real `BroadcastChannel`.
 */
import type { AbyssClient } from "@keyboard-hub/abyss-client";
import {
  IMPORT_EXPORT_PATH,
  OAUTH_CALLBACK_PATH,
  relayAbyssCallback,
  saveReturnPath,
  startAbyssLogin,
  takeReturnPath,
} from "../abyssOAuth";

jest.mock("../../navigate");
import { navigateTo } from "../../navigate";
const mockNavigateTo = navigateTo as jest.MockedFunction<typeof navigateTo>;

const AUTHORIZE_URL = "https://abyss.keyboard-hub.com/oauth/authorize?x=1";

function callbackHref(state: string): string {
  return `http://localhost${OAUTH_CALLBACK_PATH}?code=abc&state=${state}`;
}

/** Minimal client stand-in: only the two methods the login flow calls. */
function createFakeClient(): {
  client: AbyssClient;
  buildAuthorizationUrl: jest.Mock;
  handleRedirectCallback: jest.Mock;
  lastState: () => string;
} {
  let lastState = "";
  const buildAuthorizationUrl = jest.fn(
    async (options?: { state?: string }) => {
      lastState = options?.state ?? "";
      return AUTHORIZE_URL;
    },
  );
  const handleRedirectCallback = jest.fn(async () => ({}));
  return {
    client: {
      buildAuthorizationUrl,
      handleRedirectCallback,
    } as unknown as AbyssClient,
    buildAuthorizationUrl,
    handleRedirectCallback,
    lastState: () => lastState,
  };
}

/** A popup handle the test can "close" on demand. */
function createFakePopup() {
  return { closed: false, close: jest.fn() } as unknown as Window & {
    closed: boolean;
    close: jest.Mock;
  };
}

describe("abyssOAuth", () => {
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    sessionStorage.clear();
    mockNavigateTo.mockReset();
    openSpy = jest.spyOn(window, "open");
  });

  afterEach(() => {
    openSpy.mockRestore();
    jest.useRealTimers();
  });

  describe("return path", () => {
    it("round-trips a saved path and clears it", () => {
      saveReturnPath("/import-export");
      expect(takeReturnPath()).toBe("/import-export");
      // Consumed, so a later read falls back to the default.
      expect(takeReturnPath()).toBe(IMPORT_EXPORT_PATH);
    });

    it("defaults to the Import/Export tab when nothing was saved", () => {
      expect(takeReturnPath()).toBe(IMPORT_EXPORT_PATH);
    });
  });

  describe("startAbyssLogin", () => {
    it("exchanges the code in the opener when the popup reports back", async () => {
      const popup = createFakePopup();
      openSpy.mockReturnValue(popup);
      const { client, handleRedirectCallback, lastState } = createFakeClient();

      const login = startAbyssLogin(client, "/import-export");
      // Let buildAuthorizationUrl resolve so the state exists.
      await Promise.resolve();
      await Promise.resolve();

      const relayed = relayAbyssCallback(callbackHref(lastState()));

      await expect(login).resolves.toEqual({ status: "authorized" });
      // The callback page must learn that the opener claimed it, so that it
      // closes instead of burning the single-use code a second time.
      await expect(relayed).resolves.toBe(true);
      expect(handleRedirectCallback).toHaveBeenCalledWith(
        callbackHref(lastState()),
      );
      expect(popup.close).toHaveBeenCalled();
    });

    it("ignores a callback carrying a different state", async () => {
      const popup = createFakePopup();
      openSpy.mockReturnValue(popup);
      const { client, handleRedirectCallback } = createFakeClient();

      const login = startAbyssLogin(client, "/import-export");
      await Promise.resolve();
      await Promise.resolve();

      // Another tab's login finishing must not be claimed by this one: only
      // the initiating tab holds the matching PKCE verifier.
      await expect(
        relayAbyssCallback(callbackHref("someone-else")),
      ).resolves.toBe(false);
      expect(handleRedirectCallback).not.toHaveBeenCalled();

      popup.closed = true;
      await expect(login).resolves.toEqual({ status: "cancelled" });
    });

    it("reports cancelled when the user closes the popup", async () => {
      const popup = createFakePopup();
      openSpy.mockReturnValue(popup);
      const { client, handleRedirectCallback } = createFakeClient();

      const login = startAbyssLogin(client, "/import-export");
      await Promise.resolve();
      await Promise.resolve();
      popup.closed = true;

      await expect(login).resolves.toEqual({ status: "cancelled" });
      expect(handleRedirectCallback).not.toHaveBeenCalled();
    });

    it("falls back to a full-page redirect when the popup is blocked", async () => {
      openSpy.mockReturnValue(null);
      const { client, handleRedirectCallback } = createFakeClient();

      await expect(startAbyssLogin(client, "/import-export")).resolves.toEqual({
        status: "redirecting",
      });
      expect(mockNavigateTo).toHaveBeenCalledWith(AUTHORIZE_URL);
      // The redirect leaves this document; nothing is exchanged here.
      expect(handleRedirectCallback).not.toHaveBeenCalled();
      expect(takeReturnPath()).toBe("/import-export");
    });
  });

  describe("relayAbyssCallback", () => {
    it("reports unclaimed when no tab answers", async () => {
      await expect(relayAbyssCallback(callbackHref("orphan"))).resolves.toBe(
        false,
      );
    });
  });
});
