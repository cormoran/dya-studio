/**
 * Standalone route Keyboard Abyss redirects back to after consent.
 *
 * It runs in one of two very different situations and has to work out which:
 *
 * - **Popup** (the normal case): the tab that started the login claims the
 *   callback, exchanges the code itself, and closes this window. All this page
 *   does is relay the URL and get out of the way. It must *not* exchange the
 *   code — the PKCE verifier is in the opener's `sessionStorage`, and the code
 *   is single-use.
 * - **Full-page redirect** (popup blocker fallback): nobody answers the relay,
 *   so this document owns the exchange and then navigates back into the app.
 *
 * See {@link relayAbyssCallback} for how the two are told apart. Because this
 * route renders before the connection gate in `App.tsx`, it works with no
 * keyboard connected — which is always the case after a full-page redirect.
 */
import { useEffect, useRef, useState } from "react";
import { IconCheck, IconAlertTriangle } from "@tabler/icons-react";
import DyaLogo from "../assets/dya.svg?react";
import { useLanguage } from "../hooks/useLanguage";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { getAbyssClient } from "../lib/abyss/abyssClient";
import {
  IMPORT_EXPORT_PATH,
  relayAbyssCallback,
  takeReturnPath,
} from "../lib/abyss/abyssOAuth";
import { abyssErrorMessageKey } from "../lib/abyss/abyssErrors";

type CallbackState =
  | { phase: "working" }
  /** This document was the popup; the opener took over. */
  | { phase: "relayed" }
  | { phase: "error"; messageKey: string };

export function AbyssCallbackPage({
  onDone,
}: {
  /** Navigates back into the SPA, replacing history so Back never returns to a
   * spent authorization code. */
  onDone: (path: string) => void;
}) {
  const { t } = useLanguage();
  const [state, setState] = useState<CallbackState>({ phase: "working" });
  // React runs effects twice in development StrictMode; exchanging the same
  // single-use code twice would fail the second time and show a false error.
  //
  // Deliberately no "cancelled" flag paired with this: the cleanup from
  // StrictMode's first pass would abort the one run that actually started, and
  // the second pass short-circuits here — leaving the page stuck on the
  // spinner forever. Settling state after unmount is harmless.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      const href = window.location.href;
      const claimed = await relayAbyssCallback(href);
      if (claimed) {
        setState({ phase: "relayed" });
        try {
          window.close();
        } catch {
          // Some browsers refuse to close a window they did not open; the
          // "you can close this" message below covers that.
        }
        return;
      }

      const client = getAbyssClient();
      if (!client) {
        setState({
          phase: "error",
          messageKey: "Abyss is not configured for this build.",
        });
        return;
      }
      try {
        await client.handleRedirectCallback(href);
        onDone(takeReturnPath());
      } catch (caught) {
        setState({ phase: "error", messageKey: abyssErrorMessageKey(caught) });
      }
    })();
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-40 overflow-auto bg-[var(--color-bg)]">
      <div className="absolute inset-0 bg-gradient-cyber opacity-20 pointer-events-none" />
      <div className="relative min-h-full flex items-center justify-center p-6">
        <div className="glass-card p-8 w-full max-w-md text-center">
          <DyaLogo className="w-10 h-10 mx-auto mb-6 [&_polygon]:fill-[var(--color-text)]" />

          {state.phase === "working" && (
            <LoadingIndicator label={t("Completing Abyss sign-in...")} />
          )}

          {state.phase === "relayed" && (
            <>
              <div className="flex justify-center mb-3 text-[var(--color-neon)]">
                <IconCheck size={24} />
              </div>
              <h1 className="text-base font-medium text-[var(--color-text)] mb-2">
                {t("Signed in to Abyss")}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("You can close this window.")}
              </p>
            </>
          )}

          {state.phase === "error" && (
            <>
              <div className="flex justify-center mb-3 text-red-400">
                <IconAlertTriangle size={24} />
              </div>
              <h1 className="text-base font-medium text-[var(--color-text)] mb-2">
                {t("Abyss sign-in failed")}
              </h1>
              <p className="text-sm text-red-400 mb-6">{t(state.messageKey)}</p>
              <button
                className="btn-ghost border border-[var(--color-border)] text-sm"
                onClick={() => onDone(IMPORT_EXPORT_PATH)}
              >
                {t("Back to DYA Studio")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
