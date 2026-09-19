import { useEffect, useRef, useState, type PointerEvent } from "react";

/** Drag by the title, keeping the entire window inside the viewport. */
export function useFloatingWindow(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number }>();

  useEffect(() => {
    const reset = () => setPosition(undefined);
    window.addEventListener("resize", reset);
    return () => window.removeEventListener("resize", reset);
  }, []);

  return {
    ref,
    style:
      enabled && position
        ? { ...position, bottom: "auto", right: "auto" }
        : undefined,
    handleProps: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (!enabled || event.button !== 0 || !ref.current) return;
        if (
          event.target instanceof Element &&
          event.target.closest("button, input, select, label")
        )
          return;
        const rect = ref.current.getBoundingClientRect();
        drag.current = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        if (!enabled || !drag.current || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        setPosition({
          left: Math.max(
            0,
            Math.min(
              window.innerWidth - rect.width,
              event.clientX - drag.current.x,
            ),
          ),
          top: Math.max(
            0,
            Math.min(
              window.innerHeight - rect.height,
              event.clientY - drag.current.y,
            ),
          ),
        });
      },
      onPointerUp() {
        drag.current = null;
      },
      onPointerCancel() {
        drag.current = null;
      },
      onLostPointerCapture() {
        drag.current = null;
      },
    },
  };
}
