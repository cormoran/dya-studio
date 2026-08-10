import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_CLEAR_DELAY_MS = 1_500;
const KEY_REMOVE_INTERVAL_MS = 150;

const READABLE_KEY_NAMES: Record<string, string> = {
  " ": "Space",
  Escape: "Esc",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
};

function humanReadableKey(event: KeyboardEvent): string {
  if (event.key === "Dead" || event.key === "Unidentified") {
    return event.code;
  }

  return READABLE_KEY_NAMES[event.key] ?? event.key;
}

/**
 * Shows keys delivered to the browser while input stream mode is on. It is
 * mounted only while stream mode is active and never captures clicks, focus,
 * or shortcuts.
 */
export function BrowserKeyInputOverlay() {
  const [keys, setKeys] = useState<string[]>([]);
  const idleTimeoutRef = useRef<number | null>(null);
  const removeIntervalRef = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const clearTimers = useCallback(() => {
    if (idleTimeoutRef.current !== null) {
      window.clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (removeIntervalRef.current !== null) {
      window.clearInterval(removeIntervalRef.current);
      removeIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const startClearing = () => {
      removeIntervalRef.current = window.setInterval(() => {
        setKeys((current) => {
          if (current.length <= 1) {
            if (removeIntervalRef.current !== null) {
              window.clearInterval(removeIntervalRef.current);
              removeIntervalRef.current = null;
            }
            return [];
          }
          return current.slice(1);
        });
      }, KEY_REMOVE_INTERVAL_MS);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      clearTimers();
      setKeys((current) => [...current, humanReadableKey(event)]);
      idleTimeoutRef.current = window.setTimeout(
        startClearing,
        IDLE_CLEAR_DELAY_MS,
      );
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (typeof viewport.scrollTo === "function") {
      viewport.scrollTo({
        left: viewport.scrollWidth - viewport.clientWidth,
        behavior: "smooth",
      });
    } else {
      viewport.scrollLeft = viewport.scrollWidth - viewport.clientWidth;
    }
  }, [keys]);

  if (keys.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 w-[min(32rem,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 text-center"
    >
      <div
        ref={viewportRef}
        data-testid="browser-key-input-overlay"
        className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      >
        <span className="flex min-w-full w-max justify-center whitespace-pre text-lg font-medium tracking-wide text-[var(--color-text)]">
          {keys.join(" ")}
        </span>
      </div>
    </div>
  );
}
