import { useMemo } from "react";
import type { InputProcessor } from "../../hooks/useRuntimeInputProcessor";
import { useLanguage } from "../../hooks/useLanguage";
import {
  inertiaExample,
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
  const path = (key: "input" | "normal" | "fast") =>
    points
      .map(
        (p, i) =>
          `${i ? "H" : "M"}${x(p.time).toFixed(2)}${i ? "V" : ","}${y(p[key]).toFixed(2)}`,
      )
      .join(" ");
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
        {t(
          "A fixed mountain-shaped input lasts 5 seconds (peak 40 counts every 20 ms, before scaling). Lines show total output per 20 ms, including physical input. Inertia is assumed enabled; Fast input uses its configured threshold. Output may continue beyond 15 seconds.",
        )}
      </p>
    </figure>
  );
}
