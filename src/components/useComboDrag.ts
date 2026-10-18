import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Combo } from "../hooks/useRuntimeCombo";
import type { KeyPhysicalAttrs } from "../hooks/useKeymap";
import { comboDropPositions, type Point } from "./comboPreview";

export const COMBO_HOLD_MS = 500;

/** Pointer capture keeps a held combo draggable across keys and outside the preview. */
export function useComboDrag(
  keys: KeyPhysicalAttrs[],
  context: string,
  onDrop?: (combo: Combo, positions: number[]) => void,
) {
  const [drag, setDrag] = useState<{
    index: number;
    center: Point;
    positions: number[];
  } | null>(null);
  const pending = useRef<{
    pointerId: number;
    start: Point;
    center: Point;
    active: boolean;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const suppressClick = useRef(false);

  const enabled = onDrop !== undefined;
  useEffect(() => {
    const cancel = () => {
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = null;
      setDrag(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    window.addEventListener("scroll", cancel, true);
    window.addEventListener("keydown", escape);
    return () => {
      cancel();
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
      window.removeEventListener("scroll", cancel, true);
      window.removeEventListener("keydown", escape);
    };
  }, [keys, context, enabled]);

  const cancel = () => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
    setDrag(null);
  };

  const handlers = (combo: Combo, center: Point, pixelsPerUnit: number) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (
        !onDrop ||
        event.button !== 0 ||
        event.isPrimary === false ||
        pending.current
      )
        return;
      suppressClick.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
      const start = { x: event.clientX, y: event.clientY };
      pending.current = {
        pointerId: event.pointerId,
        start,
        center,
        active: false,
        timer: setTimeout(() => {
          if (!pending.current) return;
          pending.current.active = true;
          suppressClick.current = true;
          setDrag({
            index: combo.index,
            center,
            positions: comboDropPositions(keys, center),
          });
        }, COMBO_HOLD_MS),
      };
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const state = pending.current;
      if (!state || event.pointerId !== state.pointerId) return;
      if (!state.active) {
        if (
          Math.hypot(
            event.clientX - state.start.x,
            event.clientY - state.start.y,
          ) > 8
        ) {
          suppressClick.current = true;
          cancel();
        }
        return;
      }
      const next = {
        x: state.center.x + (event.clientX - state.start.x) / pixelsPerUnit,
        y: state.center.y + (event.clientY - state.start.y) / pixelsPerUnit,
      };
      setDrag({
        index: combo.index,
        center: next,
        positions: comboDropPositions(keys, next),
      });
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      const state = pending.current;
      if (!state || event.pointerId !== state.pointerId) return;
      if (state.active) {
        const next = {
          x: state.center.x + (event.clientX - state.start.x) / pixelsPerUnit,
          y: state.center.y + (event.clientY - state.start.y) / pixelsPerUnit,
        };
        const positions = comboDropPositions(keys, next);
        if (
          positions.length === 2 &&
          !positions.every((position) => combo.keyPositions.includes(position))
        )
          onDrop?.(combo, positions);
      }
      cancel();
    },
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
    onClickCapture: (event: React.MouseEvent<HTMLButtonElement>) => {
      if (suppressClick.current && event.detail !== 0) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }
    },
    onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => {
      if (pending.current) event.preventDefault();
    },
  });
  return { drag, handlers };
}
