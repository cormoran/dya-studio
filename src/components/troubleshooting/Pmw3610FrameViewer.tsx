/**
 * Live sensor view for the Trackball section: size selector, one-shot
 * "Capture Once" and streaming controls, a <canvas> rendering the most
 * recent frame, and a small stats row (pixels/complete/invalid/capture
 * time/fps).
 *
 * Ported from cormoran/zmk-driver-pmw3610-with-custom-studio-rpc's
 * web/src/FrameViewer.tsx, adapted to this app's CSS variables and the
 * data/streaming state now owned by usePmw3610.
 */
import { useEffect, useRef } from "react";
import type { UsePmw3610Return } from "../../hooks/usePmw3610";
import { useLanguage } from "../../hooks/useLanguage";
import { frameToRgba, PixelFormat } from "../../lib/pmw3610Frame";

const SIDE_OPTIONS = [19, 20, 21, 22];
const PIXEL_SCALE = 12; // px per sensor pixel on <canvas>

function renderFrame(
  canvas: HTMLCanvasElement,
  bytes: Uint8Array,
  sideLength: number,
  format: PixelFormat = PixelFormat.PIXEL_FORMAT_PG7,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = sideLength * PIXEL_SCALE;
  canvas.height = sideLength * PIXEL_SCALE;

  const rgba = frameToRgba(bytes, format);
  const off = document.createElement("canvas");
  off.width = sideLength;
  off.height = sideLength;
  const offCtx = off.getContext("2d");
  if (!offCtx) return;
  const imageData = new ImageData(
    new Uint8ClampedArray(rgba),
    sideLength,
    Math.max(1, Math.ceil(bytes.length / sideLength)),
  );
  offCtx.putImageData(imageData, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    off,
    0,
    0,
    sideLength,
    sideLength,
    0,
    0,
    canvas.width,
    canvas.height,
  );
}

export interface Pmw3610FrameViewerProps {
  pmw3610: UsePmw3610Return;
  source: number;
  deviceIndex: number;
  side: number;
  onSideChange: (side: number) => void;
}

export function Pmw3610FrameViewer({
  pmw3610,
  source,
  deviceIndex,
  side,
  onSideChange,
}: Pmw3610FrameViewerProps) {
  const { t } = useLanguage();
  const {
    frame,
    isCapturing,
    isStreaming,
    fps,
    captureOnce,
    startStreaming,
    stopStreaming,
  } = pmw3610;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!frame || !canvasRef.current) return;
    renderFrame(canvasRef.current, frame.bytes, frame.sideLength, frame.format);
  }, [frame]);

  // Stop streaming when this view unmounts (e.g. the section collapses or
  // the page navigates away).
  useEffect(() => {
    return () => {
      void stopStreaming();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-4 p-3 rounded-lg bg-[var(--color-border)]/30 border border-[var(--color-border)]">
      <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
        {t("Live sensor view")}
      </h3>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          {t("Size")}
          <select
            value={side}
            onChange={(e) => onSideChange(Number(e.target.value))}
            disabled={isStreaming}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-xs text-[var(--color-text)]"
          >
            {SIDE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} x {n} ({n * n} px)
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn-ghost text-sm"
          disabled={isCapturing || isStreaming}
          onClick={() => void captureOnce(source, deviceIndex, side)}
        >
          {isCapturing ? t("Capturing…") : t("Capture Once")}
        </button>

        {isStreaming ? (
          <button
            type="button"
            className="btn-ghost text-sm text-red-400 hover:text-red-300"
            onClick={() => void stopStreaming()}
          >
            {t("Stop Streaming")}
          </button>
        ) : (
          <button
            type="button"
            className="btn-electric text-sm"
            disabled={isCapturing}
            onClick={() => void startStreaming(source, deviceIndex, side)}
          >
            {t("Start Streaming")}
          </button>
        )}
      </div>

      <div className="flex justify-center mb-3 overflow-x-auto">
        <canvas
          ref={canvasRef}
          data-testid="pmw3610-frame-canvas"
          className="rounded border border-[var(--color-border)] bg-black"
        />
      </div>

      <dl className="flex flex-wrap gap-4 text-xs text-[var(--color-text-secondary)] font-mono">
        <div>
          <dt className="text-[var(--color-text-muted)] inline">
            {t("Pixels captured")}:{" "}
          </dt>
          <dd className="inline">{frame?.pixelCount ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)] inline">
            {t("Complete")}:{" "}
          </dt>
          <dd className="inline">
            {frame === null ? "-" : frame.complete ? t("yes") : t("no")}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)] inline">
            {t("Invalid bytes")}:{" "}
          </dt>
          <dd className="inline">{frame?.invalidCount ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)] inline">
            {t("Capture time")}:{" "}
          </dt>
          <dd className="inline">
            {frame?.durationMs != null ? `${frame.durationMs} ms` : "-"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)] inline">
            {t("FPS (streaming)")}:{" "}
          </dt>
          <dd className="inline">{fps !== null ? fps.toFixed(1) : "-"}</dd>
        </div>
      </dl>
    </div>
  );
}
