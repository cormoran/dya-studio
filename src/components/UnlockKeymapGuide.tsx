import type { FastKeymapModel } from "../lib/fastKeymap";
import type { UnlockStep } from "../lib/unlockGuide";
import { formatBehaviorBinding } from "../lib/behaviorMetadata";
import { useLanguage } from "../hooks/useLanguage";

// Okabe and Ito's Color Universal Design palette. Letters identify keys even
// when colors cannot be distinguished: https://jfly.uni-koeln.de/color/
const KEY_MARKERS = [
  { letter: "A", color: "blue", fill: "#0072B2", text: "#FFFFFF" },
  { letter: "B", color: "orange", fill: "#E69F00", text: "#000000" },
  { letter: "C", color: "bluish green", fill: "#009E73", text: "#000000" },
  { letter: "D", color: "reddish purple", fill: "#CC79A7", text: "#000000" },
] as const;

export function UnlockKeymapGuide({
  model,
  steps,
}: {
  model: FastKeymapModel;
  steps: UnlockStep[];
}) {
  const { t } = useLanguage();
  // Assign a marker to each physical key, not each operation. A released TO
  // key can later be pressed again for unlock and must keep its color/letter.
  const positions = [...new Set(steps.map((step) => step.position))];
  const markerFor = (position: number) =>
    KEY_MARKERS[positions.indexOf(position)];
  const keys = model.layouts[model.activeLayoutIndex].keys!;
  const behaviors = new Map(
    model.behaviors.map((b) => [
      b.localId,
      { id: b.localId, displayName: b.displayName, metadata: b.metadata },
    ]),
  );
  // Include rotated corners so split/rotated thumb clusters fit in the viewBox.
  const corners = keys.flatMap((k) => {
    const angle = ((k.r / 100) * Math.PI) / 180;
    return [
      [k.x, k.y],
      [k.x + k.width, k.y],
      [k.x, k.y + k.height],
      [k.x + k.width, k.y + k.height],
    ].map(([x, y]) => ({
      x: k.rx + (x - k.rx) * Math.cos(angle) - (y - k.ry) * Math.sin(angle),
      y: k.ry + (x - k.rx) * Math.sin(angle) + (y - k.ry) * Math.cos(angle),
    }));
  });
  const left = Math.min(...corners.map((p) => p.x)) - 8;
  const top = Math.min(...corners.map((p) => p.y)) - 8;
  const width = Math.max(...corners.map((p) => p.x)) - left + 8;
  const height = Math.max(...corners.map((p) => p.y)) - top + 8;
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-text-secondary)]">
        {t(
          "Start on the default layer with other layers off. Follow the highlighted keys in order.",
        )}
      </p>
      <svg
        role="img"
        aria-label={t("Unlock key positions")}
        viewBox={`${left} ${top} ${width} ${height}`}
        className="w-full max-h-64"
      >
        {keys.map((key, position) => {
          const matches = steps
            .map((step, index) => ({ step, index }))
            .filter(({ step }) => step.position === position);
          const highlighted = matches.length > 0;
          const marker = highlighted ? markerFor(position) : null;
          const binding =
            matches.at(-1)?.step.binding ?? model.layers[0].bindings[position];
          const label = formatBehaviorBinding(
            binding,
            behaviors.get(binding.behaviorId) ?? null,
            {
              shortFormat: true,
            },
          );
          return (
            <g
              key={position}
              transform={`rotate(${key.r / 100} ${key.rx} ${key.ry})`}
            >
              <title>
                {marker
                  ? t("{{color}} key marked {{marker}}", {
                      color: t(marker.color),
                      marker: marker.letter,
                    })
                  : `${t("Key {{index}}", { index: position })}: ${label}`}
              </title>
              <rect
                x={key.x + 3}
                y={key.y + 3}
                width={Math.max(1, key.width - 6)}
                height={Math.max(1, key.height - 6)}
                rx={8}
                fill={marker?.fill ?? "var(--color-surface)"}
                stroke={
                  highlighted ? "var(--color-text)" : "var(--color-border)"
                }
                strokeWidth={highlighted ? 5 : 2}
              />
              <text
                x={key.x + key.width / 2}
                y={key.y + key.height / 2 + 8}
                textAnchor="middle"
                fontSize={marker ? 40 : 22}
                fontWeight={marker ? 700 : 400}
                fill={marker?.text ?? "var(--color-text)"}
              >
                {marker ? marker.letter : label.slice(0, 8)}
              </text>
            </g>
          );
        })}
      </svg>
      <ol className="space-y-2 text-sm text-[var(--color-text-secondary)]">
        {steps.map((step, index) => {
          const marker = markerFor(step.position);
          return (
            <li key={index} className="flex items-start gap-2">
              <strong className="pt-0.5">{index + 1}.</strong>
              <span
                aria-hidden="true"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--color-text)] font-bold"
                style={{ backgroundColor: marker.fill, color: marker.text }}
              >
                {marker.letter}
              </span>
              <span className="pt-0.5">
                {t(
                  step.action === "hold"
                    ? "Hold the {{color}} key marked {{marker}} and keep holding."
                    : step.action === "press"
                      ? "Press and release the {{color}} key marked {{marker}}."
                      : "Press the {{color}} key marked {{marker}} (Studio Unlock).",
                  { color: t(marker.color), marker: marker.letter },
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-[var(--color-text-muted)]">
        {t("After unlocking, release any held keys. Click Retry if needed.")}
      </p>
    </div>
  );
}
