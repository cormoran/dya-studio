/**
 * StudioUnlockContext — the single, app-wide gate for "the keyboard is locked".
 *
 * Every feature routes its device requests through {@link useStudioUnlock}'s
 * `runWithUnlock`. When a request fails with a Studio-unlock error the failed
 * operation is *parked* and the shared {@link UnlockPrompt} modal opens; once
 * the user unlocks (auto-detected via `lockStateChanged`, or by clicking Retry)
 * the parked operation is retried and its original promise resolves with the
 * real result — so the caller sees a single awaited call that "just works"
 * after the unlock detour.
 *
 * `requireUnlock` is the proactive counterpart used by editor pages: it opens
 * the same modal *before* sending a doomed request when Studio is already known
 * to be locked. Callers may hand it an `onUnlocked` callback — the action the
 * user was trying to take (open the keycode selector, apply the edit, …) — and
 * it is *parked* just like a failed request: once the user unlocks, the action
 * runs, so a locked click resumes into what it was going to do instead of being
 * silently dropped.
 *
 * Cancel cooldown: after the user dismisses the modal, further unlock errors
 * are auto-cancelled (no modal) until every unlock-gated request has finished
 * *and* things have stayed quiet for {@link DEFAULT_QUIET_MS}. This keeps a load
 * that fans out into several RPCs — some of which may take a while — from
 * immediately re-popping the modal the user just closed: as long as requests
 * keep arriving the quiet timer restarts, so suppression lasts until the burst
 * settles. An actual unlock clears it.
 */
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStudioLockState } from "@cormoran/zmk-studio-react-hook";
import { UnlockPrompt } from "../components/UnlockPrompt";
import {
  StudioUnlockCancelledError,
  isStudioUnlockError,
} from "../lib/studioUnlock";

/** A request that failed with an unlock error and is awaiting unlock+retry. */
interface ParkedOp {
  /** Re-runs the original request; throws/returns-unlock while still locked. */
  attempt: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

export interface StudioUnlockContextValue {
  /**
   * Run `fn` (a device request). If it fails with a Studio-unlock error, open
   * the unlock modal, and after the user unlocks retry `fn` and resolve with
   * its result. Non-unlock errors propagate unchanged. If the user cancels the
   * modal, the returned promise rejects with {@link StudioUnlockCancelledError}.
   */
  runWithUnlock: <T>(fn: () => Promise<T>) => Promise<T>;
  /**
   * Proactive gate for editor actions: if Studio is currently locked, open the
   * unlock modal and return `false` (caller should bail); otherwise `true`.
   *
   * Pass `onUnlocked` to have the action the user attempted resume after they
   * unlock — it is parked while locked and invoked once unlocked (or discarded
   * if the modal is cancelled). When already unlocked the callback is ignored:
   * `requireUnlock` returns `true` and the caller proceeds inline.
   */
  requireUnlock: (onUnlocked?: () => void | Promise<void>) => boolean;
}

/**
 * How long unlock-gated requests must stay quiet (no request in flight, none
 * arriving) after a Cancel before the modal is allowed to re-open. See file doc.
 */
export const DEFAULT_QUIET_MS = 1_000;

// Default (no provider): a transparent passthrough so hooks that call device
// RPCs still work when rendered outside the provider (e.g. isolated unit
// tests) — they simply don't get the unlock modal. The real gate is supplied
// by StudioUnlockProvider, which wraps the whole app.
const StudioUnlockContext = createContext<StudioUnlockContextValue>({
  runWithUnlock: (fn) => fn(),
  requireUnlock: () => true,
});

export function StudioUnlockProvider({
  children,
  visible = true,
  quietMs = DEFAULT_QUIET_MS,
}: {
  children: ReactNode;
  /** Hide the prompt on public routes without cancelling parked operations. */
  visible?: boolean;
  /**
   * Quiet window (ms) after a Cancel before the modal may re-open. Overridable
   * mainly so tests don't have to wait out the real-world default.
   */
  quietMs?: number;
}) {
  const { locked, lockState } = useStudioLockState();

  // All bookkeeping lives in refs so every gate helper below can be a *stable*
  // useCallback. The context value must never change identity: if it did, every
  // consumer's `call` (and the auto-load effects that depend on it) would get a
  // new identity each time the provider re-renders — e.g. when the modal opens —
  // and re-fire, which is exactly the infinite-refresh loop we must avoid.
  const parkedRef = useRef<ParkedOp[]>([]);
  // True when the proactive gate opened the modal without a parked op.
  const proactiveOpenRef = useRef(false);
  // Actions handed to `requireUnlock(onUnlocked)` while locked: the operation
  // the user was attempting, replayed once the device is actually unlocked.
  const pendingActionsRef = useRef<Array<() => void | Promise<void>>>([]);
  // Cancel cooldown state: `suppressing` is true from a Cancel until things go
  // quiet; `inFlight` counts executing unlock-gated requests; `quietTimer` fires
  // once no request has been in flight for `quietMs`.
  const suppressingRef = useRef(false);
  const inFlightRef = useRef(0);
  const quietTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirror of `locked` for the stable `requireUnlock` (updated off-render so the
  // callback can stay dependency-free and never change identity).
  const lockedRef = useRef(locked);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  const [isOpen, setIsOpen] = useState(false);

  const syncOpen = useCallback(() => {
    setIsOpen(parkedRef.current.length > 0 || proactiveOpenRef.current);
  }, []);

  const clearQuietTimer = useCallback(() => {
    if (quietTimerRef.current !== null) {
      clearTimeout(quietTimerRef.current);
      quietTimerRef.current = null;
    }
  }, []);

  // While suppressing, (re)arm the quiet timer once nothing is in flight; when
  // it fires with no further activity the cooldown ends and the modal may open
  // again.
  const scheduleQuietTimer = useCallback(() => {
    clearQuietTimer();
    if (suppressingRef.current && inFlightRef.current === 0) {
      quietTimerRef.current = setTimeout(() => {
        quietTimerRef.current = null;
        suppressingRef.current = false;
      }, quietMs);
    }
  }, [clearQuietTimer, quietMs]);

  const beginActivity = useCallback(() => {
    inFlightRef.current += 1;
    // A request in flight means we're not quiet — hold off the timer.
    clearQuietTimer();
  }, [clearQuietTimer]);

  const endActivity = useCallback(() => {
    inFlightRef.current -= 1;
    scheduleQuietTimer();
  }, [scheduleQuietTimer]);

  const retryAll = useCallback(async () => {
    // Snapshot and clear: any op that is still locked re-parks itself below.
    const ops = parkedRef.current;
    parkedRef.current = [];
    // Proactive resume actions only fire once the device is actually unlocked.
    // If the user hit Retry while still locked, keep them parked (and the modal
    // open) so the pending edit isn't dropped.
    const unlocked = !lockedRef.current;
    const pendingActions = unlocked ? pendingActionsRef.current : [];
    if (unlocked) {
      pendingActionsRef.current = [];
      proactiveOpenRef.current = false;
    }
    syncOpen();

    await Promise.all(
      ops.map(async (op) => {
        try {
          op.resolve(await op.attempt());
        } catch (err) {
          if (isStudioUnlockError(err)) {
            // Still locked: keep it parked and the modal open.
            parkedRef.current.push(op);
            syncOpen();
          } else {
            op.reject(err);
          }
        }
      }),
    );

    // Replay the operations the user originally attempted (open the selector,
    // apply the edit, …) now that we're unlocked. Best-effort: a throwing
    // resume must not take down the others.
    for (const action of pendingActions) {
      try {
        await action();
      } catch {
        // Swallow — resume is best-effort; the action owns its error handling.
      }
    }
  }, [syncOpen]);

  const cancel = useCallback(() => {
    // Enter the cooldown; arm the quiet timer (nothing may be in flight right
    // now, in which case it starts counting down immediately).
    suppressingRef.current = true;
    scheduleQuietTimer();
    const ops = parkedRef.current;
    parkedRef.current = [];
    proactiveOpenRef.current = false;
    // Dismissing the modal drops the pending edits too — the user chose not to
    // unlock, so nothing should resume.
    pendingActionsRef.current = [];
    syncOpen();
    for (const op of ops) {
      op.reject(new StudioUnlockCancelledError());
    }
  }, [scheduleQuietTimer, syncOpen]);

  // On unlock: clear the cancel cooldown (a real unlock supersedes any recent
  // dismissal) and auto-retry any parked requests.
  useEffect(() => {
    if (lockState === "unlocked") {
      suppressingRef.current = false;
      clearQuietTimer();
      if (parkedRef.current.length > 0 || proactiveOpenRef.current) {
        void retryAll();
      }
    }
  }, [lockState, clearQuietTimer, retryAll]);

  // Clean up the quiet timer on unmount.
  useEffect(() => {
    return () => {
      if (quietTimerRef.current !== null) {
        clearTimeout(quietTimerRef.current);
      }
    };
  }, []);

  const runWithUnlock = useCallback(
    <T,>(fn: () => Promise<T>): Promise<T> => {
      const attempt = async (): Promise<T> => {
        // Count this as in-flight activity so the cancel cooldown knows whether
        // requests are still arriving (each keeps the quiet timer from firing).
        beginActivity();
        try {
          const result = await fn();
          // Normalize a resolved-but-locked response (official reads) into a
          // throw so parking/retry treats both error shapes identically.
          if (isStudioUnlockError(result)) {
            throw result;
          }
          return result;
        } finally {
          endActivity();
        }
      };

      return attempt().catch((err) => {
        if (!isStudioUnlockError(err)) {
          throw err;
        }
        // Cancel cooldown: while suppressing (Cancel pressed, activity not yet
        // quiet for `quietMs`), auto-cancel instead of re-opening the modal.
        if (suppressingRef.current) {
          throw new StudioUnlockCancelledError();
        }
        return new Promise<T>((resolve, reject) => {
          parkedRef.current.push({
            attempt: attempt as () => Promise<unknown>,
            resolve: resolve as (value: unknown) => void,
            reject,
          });
          syncOpen();
        });
      });
    },
    [beginActivity, endActivity, syncOpen],
  );

  const requireUnlock = useCallback(
    (onUnlocked?: () => void | Promise<void>): boolean => {
      if (lockedRef.current) {
        // Park the attempted action so it resumes after unlock (see retryAll).
        if (onUnlocked) {
          pendingActionsRef.current.push(onUnlocked);
        }
        proactiveOpenRef.current = true;
        syncOpen();
        return false;
      }
      return true;
    },
    [syncOpen],
  );

  // Stable context value: `runWithUnlock`/`requireUnlock` never change identity,
  // so consumers don't re-render (and their `call`/auto-load effects don't
  // re-fire) when the provider re-renders to open/close the modal.
  const value = useMemo(
    () => ({ runWithUnlock, requireUnlock }),
    [runWithUnlock, requireUnlock],
  );

  return (
    <StudioUnlockContext.Provider value={value}>
      {children}
      <UnlockPrompt
        open={visible && isOpen}
        onClose={cancel}
        onRetry={retryAll}
      />
    </StudioUnlockContext.Provider>
  );
}

export { StudioUnlockContext };
