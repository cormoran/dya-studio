import { useLanguage } from "../../hooks/useLanguage";
import type { InputProcessor } from "../../hooks/useRuntimeInputProcessor";
export interface InputSample {
  time: number;
  x: number;
  y: number;
  mode: "input" | "inertia" | "fast";
}
const colors = { input: "#a78bfa", inertia: "#22d3ee", fast: "#f59e0b" };
export function InputGraph({
  samples,
  now,
  processor,
  axis,
  vertical = false,
  reference = false,
}: {
  samples: InputSample[];
  now: number;
  processor: InputProcessor;
  axis?: "x" | "y";
  vertical?: boolean;
  reference?: boolean;
}) {
  const { t } = useLanguage();
  const settings = processor.inertia;
  const windowMs = 10000;
  const magnitude = (s: InputSample) => (axis ? s[axis] : Math.hypot(s.x, s.y));
  const peak = Math.max(
    20,
    ...samples.map((s) => Math.abs(magnitude(s))),
    reference
      ? ((settings?.inertiaThreshold ?? 10) *
          (settings?.inertiaFastOutputPercent ?? 200)) /
          100
      : 0,
  );
  const path = (mode: InputSample["mode"]) =>
    samples
      .map((s, i) => {
        const x = 40 + 540 * (1 - (now - s.time) / windowMs);
        const y = 80 - (magnitude(s) / peak) * 50;
        return `${i && samples[i - 1].mode === mode && s.mode === mode ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  const curve = (fast: boolean) =>
    Array.from({ length: 101 }, (_, i) => {
      const interval = settings?.inertiaIntervalMs ?? 20;
      const seed =
        ((settings?.inertiaThreshold ?? 10) * interval) /
        (settings?.inertiaWindowMs ?? 200);
      const decayed =
        seed *
        Math.pow(
          1 - (settings?.inertiaDecayPercent ?? 8) / 100,
          (i * 50) / interval,
        ) *
        (fast ? (settings?.inertiaFastOutputPercent ?? 200) / 100 : 1);
      const value =
        !fast && settings?.inertiaNormalMaxOutput
          ? Math.min(settings.inertiaNormalMaxOutput, decayed)
          : decayed;
      return `${i ? "L" : "M"}${40 + i * 5.4},${80 - (value / peak) * 50}`;
    }).join(" ");
  return (
    <figure
      className="min-w-0"
      style={vertical ? { width: 100, height: 320 } : undefined}
    >
      <svg
        viewBox={vertical ? "0 0 160 600" : "0 0 600 160"}
        role="img"
        aria-label={t(
          axis === "x"
            ? "Horizontal input history"
            : axis === "y"
              ? "Vertical input history"
              : "Inertia output history",
        )}
        className={vertical ? "h-full w-full" : "w-full h-40"}
        preserveAspectRatio="none"
      >
        <g transform={vertical ? "translate(160 0) rotate(90)" : undefined}>
          <path
            d="M40 20V130H580 M40 80H580"
            fill="none"
            stroke="var(--color-border)"
          />
          {reference && (
            <>
              <path
                d={curve(false)}
                stroke={colors.inertia}
                strokeDasharray="5 4"
                fill="none"
              />
              <path
                d={curve(true)}
                stroke={colors.fast}
                strokeDasharray="5 4"
                fill="none"
              />
            </>
          )}
          {(["input", "inertia", "fast"] as const).map((mode) => (
            <path
              key={mode}
              d={path(mode)}
              fill="none"
              stroke={colors[mode]}
              strokeWidth="2"
            />
          ))}
          <text x="40" y="150" fill="currentColor" fontSize="11">
            −10 s
          </text>
          <text x="545" y="150" fill="currentColor" fontSize="11">
            0 s
          </text>
          <text x="4" y="30" fill="currentColor" fontSize="11">
            {Math.round(peak)}
          </text>
          <text x="10" y="84" fill="currentColor" fontSize="11">
            0
          </text>
        </g>
      </svg>
      <figcaption className="text-xs flex flex-wrap gap-3">
        <span style={{ color: colors.inertia }}>┄ {t("Inertia")}</span>
        <span style={{ color: colors.fast }}>┄ {t("Fast input")}</span>
        <span style={{ color: colors.input }}>━ {t("Browser input")}</span>
        {reference && (
          <span>
            {t(
              "Dashed: reference curves; solid: live browser input classified by device activity.",
            )}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
