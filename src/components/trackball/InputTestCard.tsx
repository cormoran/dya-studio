import { useEffect, useRef, useState } from "react";
import type {
  InputProcessor,
  UseRuntimeInputProcessorReturn,
} from "../../hooks/useRuntimeInputProcessor";
import { useLanguage } from "../../hooks/useLanguage";

const STOP_LABELS: Record<number, string> = {
  1: "Settled",
  3: "Reverse input",
  4: "Layer inactive",
  5: "Settings changed",
};
export function InputTestCard({
  processor,
  setInertiaNotifications,
}: {
  processor: InputProcessor;
  setInertiaNotifications: UseRuntimeInputProcessorReturn["setInertiaNotifications"];
}) {
  const { t } = useLanguage();
  const area = useRef<HTMLDivElement>(null);
  const [horizontal, setHorizontal] = useState(true);
  const [vertical, setVertical] = useState(true);
  const [captured, setCaptured] = useState(false);
  const [captureError, setCaptureError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [point, setPoint] = useState({ x: 1200, y: 1200 });
  const [delta, setDelta] = useState({ x: 0, y: 0, kind: "Scroll" });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const element = area.current!;
    element.scrollLeft = (2400 - element.clientWidth) / 2;
    element.scrollTop = (2400 - element.clientHeight) / 2;
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
      setDelta({ x: event.deltaX, y: event.deltaY, kind: "Scroll" });
    };
    const lock = () => setCaptured(document.pointerLockElement === element);
    const failure = () => setCaptureError(true);
    const move = (event: MouseEvent) => {
      if (document.pointerLockElement !== element) return;
      setPoint((point) => ({
        x: Math.max(0, Math.min(2400, point.x + event.movementX)),
        y: Math.max(0, Math.min(2400, point.y + event.movementY)),
      }));
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
      if (document.pointerLockElement === element) document.exitPointerLock();
      element.removeEventListener("wheel", wheel);
      document.removeEventListener("pointerlockchange", lock);
      document.removeEventListener("pointerlockerror", failure);
      document.removeEventListener("mousemove", move);
    };
  }, [horizontal, vertical]);
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
    <section className="glass-card p-6 space-y-4" aria-label={t("Input test")}>
      <h3 className="text-sm font-medium">{t("Input test")}</h3>
      <p className="text-xs text-[var(--color-text-muted)]">
        {t(
          "Scroll in the finite area. Left-click to capture mouse movement; Escape releases it.",
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
        <label>
          <input
            type="checkbox"
            checked={Boolean(notifications)}
            disabled={!processor.inertia || busy}
            onChange={async (event) => {
              setBusy(true);
              try {
                await setInertiaNotifications(
                  processor.id,
                  event.target.checked,
                );
              } catch {
                /* hook displays the error */
              } finally {
                setBusy(false);
              }
            }}
          />{" "}
          {t("Show inertia activity")}
        </label>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            const element = area.current!;
            element.scrollLeft = (2400 - element.clientWidth) / 2;
            element.scrollTop = (2400 - element.clientHeight) / 2;
            setPoint({ x: 1200, y: 1200 });
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
            (!horizontal && ["ArrowLeft", "ArrowRight"].includes(event.key)) ||
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
        onClick={async () => {
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
            width: 2400,
            height: 2400,
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
                left: (i % 10) * 240 + 12,
                top: Math.floor(i / 10) * 240 + 12,
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
