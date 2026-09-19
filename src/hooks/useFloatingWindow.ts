import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";

/** Allow clipped overflow while leaving enough of the header to drag back. */
export function useFloatingWindow(
  enabled: boolean,
  open: boolean,
  anchorRef?: RefObject<HTMLElement | null>,
) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; headerHeight: number } | null>(
    null,
  );
  const [position, setPosition] = useState<{ left: number; top: number }>();

  useLayoutEffect(() => {
    if (!enabled || !open) return;
    const align = () => {
      const panel = ref.current;
      if (!panel) return;
      const rightEdge = Math.min(
        anchorRef?.current?.getBoundingClientRect().right ?? window.innerWidth,
        window.innerWidth,
      );
      const right =
        rightEdge >= panel.offsetWidth ? window.innerWidth - rightEdge : 0;
      panel.style.setProperty("--floating-right", `${right}px`);
    };
    align();
    const observer = new ResizeObserver(align);
    if (anchorRef?.current) observer.observe(anchorRef.current);
    window.addEventListener("resize", align);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", align);
    };
  }, [enabled, open, anchorRef]);

  useEffect(() => {
    const reset = () => setPosition(undefined);
    window.addEventListener("resize", reset);
    return () => window.removeEventListener("resize", reset);
  }, []);

  // Reset while closed so reopening starts at a known visible position.
  if (!open && position !== undefined) {
    setPosition(undefined);
  }

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
          headerHeight: event.currentTarget.getBoundingClientRect().height,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        if (!enabled || !drag.current || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        // Keep a draggable header area visible, including when the controls at
        // its right edge occupy part of the remaining strip.
        const visibleWidth = Math.min(160, rect.width, window.innerWidth);
        const visibleHeight = Math.min(
          24,
          drag.current.headerHeight,
          window.innerHeight,
        );
        setPosition({
          left: Math.max(
            visibleWidth - rect.width,
            Math.min(
              window.innerWidth - visibleWidth,
              event.clientX - drag.current.x,
            ),
          ),
          top: Math.max(
            visibleHeight - drag.current.headerHeight,
            Math.min(
              window.innerHeight - visibleHeight,
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
