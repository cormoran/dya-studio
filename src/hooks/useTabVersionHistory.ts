/**
 * useTabVersionHistory
 *
 * The whole per-tab version feature in one hook: capture (via
 * {@link useVersionHistory}) plus the restore flow a tab drives from its reset
 * dropdown — pick a version, re-read the keyboard so the diff is against what
 * is actually on it right now, show the diff modal, and on confirm write the
 * version back through the tab's own memory writes.
 *
 * A tab supplies three things: `collect` (read everything it owns as JSON),
 * `apply` (write a snapshot back to keyboard memory) and `isLoaded`. Wiring is
 * then just `<ResetVersionMenu {...} />` plus `<VersionDiffModal {...} />`.
 */
import { useCallback, useRef, useState } from "react";
import { useVersionHistory } from "./useVersionHistory";
import type { UseVersionHistoryOptions } from "./useVersionHistory";
import type { JsonValue, StoredSnapshot } from "../lib/versionHistory";

export interface UseTabVersionHistoryOptions<
  T extends JsonValue,
> extends UseVersionHistoryOptions<T> {
  /**
   * Write a stored snapshot back to the keyboard. Per the app's memory-write
   * model this should only touch RAM — persisting stays the user's explicit
   * Save.
   */
  apply: (snapshot: T) => Promise<void>;
}

export interface UseTabVersionHistoryReturn<T extends JsonValue> {
  /** Stored versions, newest first — pass to `ResetVersionMenu`. */
  versions: StoredSnapshot<T>[];
  /** True while a capture or a restore is running. */
  isBusy: boolean;
  /** Capture the current state now (e.g. after an explicit Refresh). */
  capture: () => Promise<void>;
  /** Open the diff modal for a version — pass as `onSelectVersion`. */
  selectVersion: (version: StoredSnapshot<T>) => void;
  /** Props for `VersionDiffModal` (except the optional `labeler`). */
  diffModalProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    version: StoredSnapshot<T> | null;
    current: T | null;
    onApply: () => void;
    isApplying: boolean;
    error: string | null;
  };
}

export function useTabVersionHistory<T extends JsonValue>({
  apply,
  ...historyOptions
}: UseTabVersionHistoryOptions<T>): UseTabVersionHistoryReturn<T> {
  const { versions, isBusy, capture } = useVersionHistory<T>(historyOptions);

  const [selected, setSelected] = useState<StoredSnapshot<T> | null>(null);
  const [current, setCurrent] = useState<T | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collectRef = useRef(historyOptions.collect);
  collectRef.current = historyOptions.collect;
  const applyRef = useRef(apply);
  applyRef.current = apply;

  const selectVersion = useCallback((version: StoredSnapshot<T>) => {
    setSelected(version);
    setCurrent(null);
    setError(null);
    // Diff against a fresh read: the tab may have unsaved edits made since the
    // last capture, and those are exactly what the user is about to overwrite.
    void (async () => {
      try {
        setCurrent(await collectRef.current());
      } catch (err) {
        console.warn("Failed to read the current state for a diff:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to read the current state from the keyboard",
        );
      }
    })();
  }, []);

  const close = useCallback((open: boolean) => {
    if (open) return;
    setSelected(null);
    setCurrent(null);
    setError(null);
  }, []);

  const onApply = useCallback(() => {
    const version = selected;
    if (!version) return;
    setIsApplying(true);
    setError(null);
    void (async () => {
      try {
        await applyRef.current(version.data);
        setSelected(null);
        setCurrent(null);
      } catch (err) {
        console.error("Failed to restore a version:", err);
        setError(
          err instanceof Error ? err.message : "Failed to restore this version",
        );
      } finally {
        setIsApplying(false);
      }
    })();
  }, [selected]);

  return {
    versions,
    isBusy: isBusy || isApplying,
    capture,
    selectVersion,
    diffModalProps: {
      open: selected !== null,
      onOpenChange: close,
      version: selected,
      current,
      onApply,
      isApplying,
      error,
    },
  };
}
