import type { FastKeymapModel } from "../lib/fastKeymap";
import type { UnlockStep } from "../lib/unlockGuide";
import { formatBehaviorBinding } from "../lib/behaviorMetadata";
import { useLanguage } from "../hooks/useLanguage";

export function UnlockKeymapGuide({
  model,
  steps,
}: {
  model: FastKeymapModel;
  steps: UnlockStep[];
}) {
  const { t } = useLanguage();
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
          const unlock = matches.some(({ step }) => step.action === "unlock");
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
                {t("Key {{index}}", { index: position })}: {label}
                {highlighted
                  ? ` (${matches.map(({ index }) => index + 1).join(", ")})`
                  : ""}
              </title>
              <rect
                x={key.x + 3}
                y={key.y + 3}
                width={Math.max(1, key.width - 6)}
                height={Math.max(1, key.height - 6)}
                rx={8}
                fill={
                  highlighted ? "var(--color-electric)" : "var(--color-surface)"
                }
                fillOpacity={highlighted ? 0.2 : 1}
                stroke={
                  highlighted ? "var(--color-electric)" : "var(--color-border)"
                }
                strokeWidth={highlighted ? 5 : 2}
              />
              <text
                x={key.x + key.width / 2}
                y={key.y + key.height / 2 + 8}
                textAnchor="middle"
                fontSize={22}
                fill="var(--color-text)"
              >
                {highlighted
                  ? `${matches.map(({ index }) => index + 1).join("/")} ${unlock ? "Unlock" : label}`
                  : label.slice(0, 8)}
              </text>
            </g>
          );
        })}
      </svg>
      <ol className="space-y-2 text-sm text-[var(--color-text-secondary)]">
        {steps.map((step, index) => (
          <li key={index}>
            <strong>{index + 1}. </strong>
            {t(
              step.action === "hold"
                ? "Hold key {{key}} on {{layer}} and keep holding."
                : step.action === "press"
                  ? "Press and release key {{key}} on {{layer}}."
                  : "Press Studio Unlock at key {{key}} on {{layer}}.",
              {
                key: step.position,
                layer: model.layers[step.layer].name || String(step.layer),
              },
            )}
          </li>
        ))}
      </ol>
      <p className="text-xs text-[var(--color-text-muted)]">
        {t("After unlocking, release any held keys. Click Retry if needed.")}
      </p>
    </div>
  );
}
