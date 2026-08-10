import { useEffect, useRef, useState } from "react";

const KEY_VISIBLE_DURATION_MS = 3_000;
const KEY_CLEANUP_INTERVAL_MS = 100;

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
  const [keys, setKeys] = useState<{ value: string; receivedAt: number }[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      setKeys((current) => [
        ...current,
        { value: humanReadableKey(event), receivedAt: Date.now() },
      ]);
    };

    const cleanup = window.setInterval(() => {
      const expiry = Date.now() - KEY_VISIBLE_DURATION_MS;
      setKeys((current) => current.filter((key) => key.receivedAt > expiry));
    }, KEY_CLEANUP_INTERVAL_MS);

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearInterval(cleanup);
    };
  }, []);

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
        className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black)]"
      >
        <span className="flex min-w-full w-max justify-center whitespace-pre text-lg font-medium tracking-wide text-[var(--color-text)]">
          {keys.map((key) => key.value).join(" ")}
        </span>
      </div>
    </div>
  );
}
