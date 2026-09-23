/**
 * useDebouncedMemoryWrite
 *
 * Shared debounce for the unified edit flow: an input edit is written to
 * keyboard RAM automatically after a short quiet period — no per-field save
 * button. Every editing surface (combo, macro, custom settings, ...) uses the
 * same delay and the same "queued → saving → idle" state so the experience is
 * identical everywhere.
 *
 * This generalizes the inline timer that custom settings' SettingRow used to
 * roll by hand. Persisting RAM to flash is a separate, explicit action (a
 * section/page Save); this hook only covers the debounced memory write.
 */
import { useCallback, useEffect, useRef, useState } from "react";

/** Shared debounce for auto-writing edits to keyboard memory. */
export const MEMORY_WRITE_DEBOUNCE_MS = 1500;

export type MemoryWriteState = "idle" | "queued" | "saving";

export interface UseDebouncedMemoryWriteReturn<T> {
  /** Current write state, for status text/indicators. */
  state: MemoryWriteState;
  /** Schedule a debounced memory write of `value`. */
  queue: (value: T) => void;
  /** Write any queued value immediately (e.g. on blur or before persist). */
  flush: () => Promise<void>;
  /** Drop any queued write without sending it. */
  cancel: () => void;
}

export function useDebouncedMemoryWrite<T>(
  write: (value: T) => Promise<void>,
  delay: number = MEMORY_WRITE_DEBOUNCE_MS,
): UseDebouncedMemoryWriteReturn<T> {
  const [state, setState] = useState<MemoryWriteState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ value: T } | null>(null);
  const inFlightRef = useRef<Set<Promise<void>>>(new Set());
  // Keep the latest writer without re-creating callbacks on every render.
  const writeRef = useRef(write);
  writeRef.current = write;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runWrite = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    clearTimer();
    const write = (async () => {
      setState("saving");
      try {
        await writeRef.current(pending.value);
      } catch (error) {
        console.error("Debounced memory write failed:", error);
      } finally {
        setState(
          pendingRef.current
            ? "queued"
            : inFlightRef.current.size > 1
              ? "saving"
              : "idle",
        );
      }
    })();
    inFlightRef.current.add(write);
    try {
      await write;
    } finally {
      inFlightRef.current.delete(write);
    }
  }, [clearTimer]);

  const queue = useCallback(
    (value: T) => {
      pendingRef.current = { value };
      clearTimer();
      setState("queued");
      timerRef.current = setTimeout(() => {
        void runWrite();
      }, delay);
    },
    [clearTimer, delay, runWrite],
  );

  const flush = useCallback(async () => {
    if (pendingRef.current) {
      await runWrite();
    }
    await Promise.all(inFlightRef.current);
  }, [runWrite]);

  const cancel = useCallback(() => {
    pendingRef.current = null;
    clearTimer();
    setState("idle");
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { state, queue, flush, cancel };
}
