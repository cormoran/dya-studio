/**
 * Keyboard Abyss login state for the Import/Export tab.
 *
 * The token itself lives in the shared client (`getAbyssClient`), which reads
 * and writes `sessionStorage`; this hook only mirrors it into React state and
 * owns the login/logout actions. Mount it once, at the page, and pass what the
 * sections need down as props — a second instance would issue a second
 * `userinfo()` request for no benefit.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { AbyssUserInfo } from "@keyboard-hub/abyss-client";
import { getAbyssClient, isAbyssConfigured } from "../lib/abyss/abyssClient";
import {
  IMPORT_EXPORT_PATH,
  startAbyssLogin,
  type AbyssLoginOutcome,
} from "../lib/abyss/abyssOAuth";
import {
  abyssErrorMessageKey,
  classifyAbyssError,
  isAbyssUnauthorized,
} from "../lib/abyss/abyssErrors";
import { trackAbyssFailed, trackAbyssOperation } from "../lib/analytics";

export interface UseAbyssAuthReturn {
  /** Whether this build has an Abyss OAuth client id at all. */
  isConfigured: boolean;
  /** True once a token is stored and the profile has been read. */
  isAuthenticated: boolean;
  /** The signed-in Abyss profile, or `null`. */
  user: AbyssUserInfo | null;
  /** A login, logout, or profile fetch is in flight. */
  isLoading: boolean;
  /** English message key for the last failure, or `null`. */
  error: string | null;
  /** Opens the Abyss consent flow. Resolves once tokens are stored. */
  login: () => Promise<void>;
  /** Revokes and forgets the stored token. */
  logout: () => Promise<void>;
}

export function useAbyssAuth(): UseAbyssAuthReturn {
  const configured = isAbyssConfigured();
  const [user, setUser] = useState<AbyssUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Reads the profile for a stored token. Clears the token on 401 so the UI
   * offers a fresh login instead of failing every later call. */
  const refreshProfile = useCallback(async () => {
    const client = getAbyssClient();
    if (!client || !client.getTokenSet()) {
      if (mountedRef.current) {
        setUser(null);
        setIsLoading(false);
      }
      return;
    }
    try {
      const profile = await client.userinfo();
      if (mountedRef.current) {
        setUser(profile);
        setError(null);
      }
    } catch (caught) {
      if (isAbyssUnauthorized(caught)) client.clearTokenSet();
      if (mountedRef.current) {
        setUser(null);
        setError(abyssErrorMessageKey(caught));
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }
    void refreshProfile();
  }, [configured, refreshProfile]);

  const login = useCallback(async () => {
    const client = getAbyssClient();
    if (!client) return;
    setIsLoading(true);
    setError(null);
    let outcome: AbyssLoginOutcome;
    try {
      outcome = await startAbyssLogin(client, IMPORT_EXPORT_PATH);
    } catch (caught) {
      trackAbyssFailed("login", classifyAbyssError(caught));
      if (mountedRef.current) {
        setError(abyssErrorMessageKey(caught));
        setIsLoading(false);
      }
      return;
    }
    if (outcome.status === "redirecting") {
      // The document is navigating away; leave the spinner up.
      return;
    }
    if (outcome.status === "cancelled") {
      trackAbyssFailed("login", "cancelled");
      if (mountedRef.current) {
        setError("Abyss login was cancelled.");
        setIsLoading(false);
      }
      return;
    }
    trackAbyssOperation("login");
    await refreshProfile();
  }, [refreshProfile]);

  const logout = useCallback(async () => {
    const client = getAbyssClient();
    if (!client) return;
    setIsLoading(true);
    try {
      // Best effort: a failed revoke must not leave the token in storage.
      await client.revoke();
    } catch {
      // Ignored on purpose.
    }
    client.clearTokenSet();
    if (mountedRef.current) {
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  return {
    isConfigured: configured,
    isAuthenticated: user !== null,
    user,
    isLoading,
    error,
    login,
    logout,
  };
}
