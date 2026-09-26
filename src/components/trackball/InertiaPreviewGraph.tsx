import { useMemo } from "react";
import type { InputProcessor } from "../../hooks/useRuntimeInputProcessor";
import { useLanguage } from "../../hooks/useLanguage";
import {
  inertiaExample,
  inertiaExamplePeak,
  EXAMPLE_DURATION_MS,
  EXAMPLE_INPUT_MS,
} from "../../lib/inertiaSimulation";
export function InertiaPreviewGraph({
  processor,
}: {
  processor: InputProcessor;
}) {
  const { t } = useLanguage();
  const points = useMemo(
    () =>
      processor.inertia
        ? inertiaExample(
            processor.inertia,
            processor.scaleMultiplier,
            processor.scaleDivisor,
          )
        : [],
    [processor.inertia, processor.scaleMultiplier, processor.scaleDivisor],
  );
  const peak = Math.max(
    1,
    ...points.flatMap((p) => [p.input, p.normal, p.fast]),
  );
  const x = (time: number) => 48 + (532 * time) / EXAMPLE_DURATION_MS;
  const y = (value: number) => 130 - (value * 100) / peak;
  // Average firmware ticks into 200 ms spans for a readable trend. Keep the
  // physical-input cutoff explicit rather than smoothing across it.
  const ratio =
    processor.scaleMultiplier > 0 && processor.scaleDivisor > 0
      ? processor.scaleMultiplier / processor.scaleDivisor
      : 1;
  const rawPeak = processor.inertia
    ? inertiaExamplePeak(
        processor.inertia,
        processor.scaleMultiplier,
        processor.scaleDivisor,
      )
    : 40;
  const input = (time: number) =>
    rawPeak * ratio * (1 - ((time - 3200) / 3200) ** 2);
  const path = (key: "input" | "normal" | "fast") => {
    if (!points.length) return "";
    if (key === "input") {
      // Exact quadratic Bezier for the unquantized scenario, then a hard stop.
      return `M${x(0)},${y(0)} Q${x(2500)},${y(rawPeak * 1.5625 * ratio)} ${x(5000)},${y(input(5000))} V${y(0)} H${x(EXAMPLE_DURATION_MS)}`;
    }
    let result = `M${x(0)},${y(0)}`;
    for (let time = 200; time <= EXAMPLE_DURATION_MS; time += 200) {
      const span = points.filter((p) => p.time > time - 200 && p.time <= time);
      const inertia =
        span.reduce((sum, p) => sum + p[key] - p.input, 0) / span.length;
      const physical = time <= EXAMPLE_INPUT_MS ? input(time) : 0;
      result += ` L${x(time).toFixed(2)},${y(inertia + physical).toFixed(2)}`;
      if (time === EXAMPLE_INPUT_MS) result += ` V${y(inertia).toFixed(2)}`;
    }
    return result;
  };
  return (
    <figure className="space-y-2" aria-label={t("Inertia simulation")}>
      <svg
        viewBox="0 0 600 165"
        className="w-full h-52"
        role="img"
        aria-label={t("Five-second input and simulated output")}
      >
        <rect
          x={x(0)}
          y="20"
          width={x(EXAMPLE_INPUT_MS) - x(0)}
          height="110"
          fill="#a78bfa"
          fillOpacity="0.06"
        />
        <path d="M48 20V130H580" fill="none" stroke="var(--color-border)" />
        <path
          d={`M${x(EXAMPLE_INPUT_MS)} 20V130`}
          fill="none"
          stroke="var(--color-border)"
          strokeDasharray="3 3"
        />
        <path
          data-series="normal"
          d={path("normal")}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="3"
        />
        <path
          data-series="fast"
          d={path("fast")}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <path
          data-series="input"
          d={path("input")}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="1.5"
        />
        <text x="4" y="33" fill="currentColor" fontSize="11">
          {peak}
        </text>
        <text x="24" y="134" fill="currentColor" fontSize="11">
          0
        </text>
        {[0, 5000, 10000, 15000].map((time) => (
          <text
            key={time}
            x={x(time)}
            y="153"
            textAnchor={time === 15000 ? "end" : "middle"}
            fill="currentColor"
            fontSize="11"
          >
            {time / 1000} s
          </text>
        ))}
      </svg>
      <figcaption className="text-xs flex flex-wrap gap-x-4 gap-y-1">
        <span style={{ color: "#a78bfa" }}>━ {t("Example input")}</span>
        <span style={{ color: "#22d3ee" }}>━ {t("Inertia output")}</span>
        <span style={{ color: "#f59e0b" }}>┄ {t("Fast input output")}</span>
      </figcaption>
      <p className="text-xs text-[var(--color-text-muted)]">
        {t("Example input peak before scaling")}: {rawPeak} / 20 ms
      </p>
      <p className="text-xs text-[var(--color-text-muted)]">
        {t(
          "A parabolic input peaks at 3.2 seconds and stops abruptly at 5 seconds (20 ms reports). The example amplitude adapts to scaling and thresholds, capped at 32767 raw counts. Output trends average inertia ticks over 200 ms and include the input curve. Both modes are previewed as enabled. When Fast input is OFF, its preview threshold is ceil(max(input threshold × 1.5, 20)), capped at 65535. Curves can coincide at 100% boost or when the Fast threshold is not reached. Output may continue beyond 15 seconds.",
        )}
      </p>
    </figure>
  );
}
