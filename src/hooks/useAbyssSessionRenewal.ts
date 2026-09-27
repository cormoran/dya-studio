import { useEffect } from "react";
import { getAbyssClient } from "../lib/abyss/abyssClient";
import { OAUTH_CALLBACK_PATH } from "../lib/abyss/abyssOAuth";

/** Renew a saved login while Studio is in use, even without a keyboard. */
export function useAbyssSessionRenewal(): void {
  useEffect(() => {
    // A popup callback only relays authorization; it must not rotate tokens.
    if (window.location.pathname === OAUTH_CALLBACK_PATH) return;
    const renew = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const client = getAbyssClient();
        if (client?.getTokenSet()) await client.getAccessToken();
      } catch {
        // Keep credentials on transient failures. Import/Export reports auth
        // errors when used; a later foreground visit retries renewal.
      }
    };
    void renew();
    const onForeground = () => void renew();
    window.addEventListener("focus", onForeground);
    document.addEventListener("visibilitychange", onForeground);
    const timer = window.setInterval(onForeground, 5 * 60 * 1000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onForeground);
      document.removeEventListener("visibilitychange", onForeground);
    };
  }, []);
}
