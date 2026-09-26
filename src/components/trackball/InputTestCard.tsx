import { InputGraph, type InputSample } from "./InputGraph";
import { useFloatingWindow } from "../../hooks/useFloatingWindow";
import { useEffect, useRef, useState } from "react";
import type { InputProcessor } from "../../hooks/useRuntimeInputProcessor";
import { useLanguage } from "../../hooks/useLanguage";

const STOP_LABELS: Record<number, string> = {
  1: "Settled",
  3: "Reverse input",
  4: "Layer inactive",
  5: "Settings changed",
};
export function InputTestCard({
  processor,
  samples = [],
  now = 0,
  onClose,
  onInput,
}: {
  processor: InputProcessor;
  samples?: InputSample[];
  now?: number;
  onClose?: () => void;
  onInput?: (x: number, y: number) => void;
}) {
  const { t } = useLanguage();
  const area = useRef<HTMLDivElement>(null);
  const releaseClick = useRef(false);
  const [horizontal, setHorizontal] = useState(true);
  const [vertical, setVertical] = useState(true);
  const [captured, setCaptured] = useState(false);
  const [captureError, setCaptureError] = useState(false);
  const floating = useFloatingWindow(true, true);
  const [point, setPoint] = useState({ x: 12000, y: 12000 });
  const [delta, setDelta] = useState({ x: 0, y: 0, kind: "Scroll" });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const element = area.current!;
    element.scrollLeft = (24000 - element.clientWidth) / 2;
    element.scrollTop = (24000 - element.clientHeight) / 2;
  }, []);
  useEffect(() => {
    const element = area.current!;

    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? element.clientHeight
            : 1;
      if (horizontal) element.scrollLeft += event.deltaX * factor;
      if (vertical) element.scrollTop += event.deltaY * factor;
      onInput?.(event.deltaX * factor, event.deltaY * factor);
      setDelta({ x: event.deltaX, y: event.deltaY, kind: "Scroll" });
    };
    const lock = () => setCaptured(document.pointerLockElement === element);
    const failure = () => setCaptureError(true);
    const move = (event: MouseEvent) => {
      if (document.pointerLockElement !== element) return;
      setPoint((point) => ({
        x: Math.max(0, Math.min(24000, point.x + event.movementX)),
        y: Math.max(0, Math.min(24000, point.y + event.movementY)),
      }));
      onInput?.(event.movementX, event.movementY);
      setDelta({
        x: event.movementX,
        y: event.movementY,
        kind: "Mouse movement",
      });
    };
    element.addEventListener("wheel", wheel, { passive: false });
    document.addEventListener("pointerlockchange", lock);
    document.addEventListener("pointerlockerror", failure);
    document.addEventListener("mousemove", move);
    return () => {
      element.removeEventListener("wheel", wheel);
      document.removeEventListener("pointerlockchange", lock);
      document.removeEventListener("pointerlockerror", failure);
      document.removeEventListener("mousemove", move);
    };
  }, [horizontal, vertical, onInput]);
  useEffect(() => {
    const element = area.current;
    return () => {
      if (document.pointerLockElement === element) document.exitPointerLock();
    };
  }, []);
  const notifications = processor.inertiaNotificationsEnabled;
  const status = !processor.inertia
    ? "Inertia is not supported by this device"
    : !notifications
      ? "Activity notifications are off"
      : processor.inertiaFastInput
        ? "Fast input"
        : processor.inertiaActive
          ? "Inertia active"
          : "Inertia idle";
  return (
    <section
      ref={floating.ref}
      style={floating.style}
      className="fixed right-4 bottom-4 z-[100] w-[min(760px,calc(100vw-32px))] max-h-[85vh] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 shadow-xl"
      aria-label={t("Input test")}
    >
      <div
        {...floating.handleProps}
        className="flex justify-between cursor-move touch-none"
      >
        <h3 className="text-sm font-medium">{t("Input test")}</h3>
        <button
          type="button"
          aria-label={t("Close input test")}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        {t(
          "Scroll in the finite area. Left-click to capture mouse movement; Escape, left-click or right-click releases it.",
        )}
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        <label>
          <input
            type="checkbox"
            checked={horizontal}
            onChange={(event) => setHorizontal(event.target.checked)}
          />{" "}
          {t("Horizontal scroll")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={vertical}
            onChange={(event) => setVertical(event.target.checked)}
          />{" "}
          {t("Vertical scroll")}
        </label>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            const element = area.current!;
            element.scrollLeft = (24000 - element.clientWidth) / 2;
            element.scrollTop = (24000 - element.clientHeight) / 2;
            setPoint({ x: 12000, y: 12000 });
            setDelta({ x: 0, y: 0, kind: "Scroll" });
          }}
        >
          {t("Center")}
        </button>
      </div>
      <div role="status" className="text-sm flex flex-wrap gap-3">
        <span
          className={
            notifications && processor.inertiaFastInput
              ? "text-amber-500"
              : notifications && processor.inertiaActive
                ? "text-[var(--color-electric)]"
                : "text-[var(--color-text-muted)]"
          }
        >
          {t(status)}
        </span>
        {notifications && processor.inertiaStopReason ? (
          <span>
            {t(
              STOP_LABELS[processor.inertiaStopReason] ?? "Unknown stop reason",
            )}
          </span>
        ) : null}
        <span>
          {t(
            captured
              ? "Mouse captured — Escape to release"
              : "Mouse not captured",
          )}
        </span>
      </div>
      {captureError && (
        <p role="alert">
          {t("Mouse capture is unavailable. Scrolling still works.")}
        </p>
      )}
      <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-2">
        <InputGraph samples={samples} now={now} axis="y" vertical />
        <div
          ref={area}
          role="region"
          tabIndex={0}
          aria-label={t("Finite input test area")}
          className="relative h-80 rounded border-2"
          style={{
            overflowX: horizontal ? "scroll" : "hidden",
            overflowY: vertical ? "scroll" : "hidden",
            overscrollBehavior: "contain",
            borderColor:
              notifications && processor.inertiaFastInput
                ? "#f59e0b"
                : notifications && processor.inertiaActive
                  ? "var(--color-electric)"
                  : "var(--color-border)",
          }}
          onScroll={(event) =>
            setPosition({
              x: event.currentTarget.scrollLeft,
              y: event.currentTarget.scrollTop,
            })
          }
          onKeyDown={(event) => {
            if (
              (!horizontal &&
                ["ArrowLeft", "ArrowRight"].includes(event.key)) ||
              (!vertical &&
                [
                  "ArrowUp",
                  "ArrowDown",
                  "PageUp",
                  "PageDown",
                  " ",
                  "Home",
                  "End",
                ].includes(event.key))
            )
              event.preventDefault();
          }}
          onMouseDown={(event) => {
            if (
              document.pointerLockElement === area.current &&
              (event.button === 0 || event.button === 2)
            ) {
              releaseClick.current = event.button === 0;
              document.exitPointerLock();
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            if (document.pointerLockElement === area.current)
              document.exitPointerLock();
          }}
          onClick={async () => {
            if (releaseClick.current) {
              releaseClick.current = false;
              return;
            }
            if (document.pointerLockElement === area.current) {
              document.exitPointerLock();
              return;
            }
            setCaptureError(false);
            try {
              if (!area.current?.requestPointerLock)
                throw new Error("Unsupported");
              await area.current.requestPointerLock();
            } catch {
              setCaptureError(true);
            }
          }}
        >
          <div
            style={{
              width: 24000,
              height: 24000,
              position: "relative",
              backgroundImage:
                "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          >
            {Array.from({ length: 100 }, (_, i) => (
              <span
                aria-hidden="true"
                key={i}
                className="absolute text-xs text-[var(--color-text-muted)]"
                style={{
                  left: (i % 10) * 2400 + 12,
                  top: Math.floor(i / 10) * 2400 + 12,
                }}
              >
                {i % 10}, {Math.floor(i / 10)}
              </span>
            ))}
            <span
              className="absolute w-4 h-4 rounded-full bg-[var(--color-electric)] pointer-events-none"
              style={{ left: point.x - 8, top: point.y - 8 }}
            />
          </div>
        </div>
        <div className="col-start-2">
          <InputGraph samples={samples} now={now} axis="x" />
        </div>
      </div>
      <p className="text-xs font-mono">
        {t(delta.kind)} Δ X: {delta.x}, Y: {delta.y} · {t("Scroll position")}:{" "}
        {Math.round(position.x)}, {Math.round(position.y)} ·{" "}
        {t("Mouse position")}: {point.x}, {point.y}
      </p>
      <p className="text-xs text-[var(--color-text-muted)]">
        {t(
          "Movement is browser input from any pointing device. Activity is reported by the selected processor; this area does not simulate inertia.",
        )}
      </p>
    </section>
  );
}
