/**
 * Read-only physical preview of one layer, with changed keys highlighted.
 *
 * Purpose-built rather than reusing `KeyboardLayout`, which is wired to the ZMK
 * editing types (device `Layer`, behaviour ids, edit callbacks). Here the
 * geometry comes from the Abyss layout document and the bindings from
 * KeyboardHub JSON, and nothing is editable — adapting the editor would have
 * meant bending both sides to fit.
 *
 * The point of the physical view is scale: "the whole alpha block moved" and
 * "three keys changed" are indistinguishable in a list of 300 rows and obvious
 * here.
 */
import * as Tooltip from "@radix-ui/react-tooltip";
import { useLanguage } from "../../hooks/useLanguage";
import { bindingLabel } from "../../lib/abyss/abyssDiff";

/** Geometry for one key, in key units, as the Abyss layout document stores it. */
export interface PreviewPosition {
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** Rotation in centidegrees. */
  r?: number;
  rx?: number;
  ry?: number;
}

/** What changed at one key position. */
export interface PreviewChange {
  from?: unknown;
  to?: unknown;
}

/** Pixels per key unit. Small enough that a 60% board fits without scrolling. */
const UNIT = 34;
const GAP = 2;

function KeyCap({
  position,
  index,
  binding,
  change,
}: {
  position: PreviewPosition;
  index: number;
  binding: unknown;
  change?: PreviewChange;
}) {
  const { t } = useLanguage();
  const width = (position.w ?? 1) * UNIT - GAP;
  const height = (position.h ?? 1) * UNIT - GAP;
  const rotation = (position.r ?? 0) / 100;

  const cap = (
    <div
      className={`absolute flex items-center justify-center overflow-hidden rounded text-[9px] leading-none ${
        change
          ? "bg-[var(--color-neon)]/25 border border-[var(--color-neon)] text-[var(--color-text)]"
          : "bg-[var(--color-border)] border border-[var(--color-border-hover)] text-[var(--color-text-muted)]"
      }`}
      style={{
        left: position.x * UNIT,
        top: position.y * UNIT,
        width,
        height,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin:
          position.rx !== undefined && position.ry !== undefined
            ? `${(position.rx - position.x) * UNIT}px ${(position.ry - position.y) * UNIT}px`
            : undefined,
      }}
    >
      <span className="px-0.5 truncate">{bindingLabel(binding)}</span>
    </div>
  );

  // Only changed keys get a tooltip; a tooltip on every key would make the
  // board unusable to move a pointer across.
  if (!change) return cap;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{cap}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="px-3 py-2 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs shadow-lg z-50 max-w-xs"
          sideOffset={5}
        >
          <p className="text-[var(--color-text-muted)] mb-1">
            {t("Key {{index}}", { index })}
          </p>
          <p className="text-[var(--color-text)]">
            <span className="text-[var(--color-text-muted)] line-through">
              {bindingLabel(change.from)}
            </span>
            {" → "}
            <span className="text-[var(--color-neon)]">
              {bindingLabel(change.to)}
            </span>
          </p>
          <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function KeymapLayerPreview({
  positions,
  bindings,
  changes,
}: {
  positions: PreviewPosition[];
  /** Bindings for this layer, indexed by key position. */
  bindings: unknown[];
  /** Changed keys by position index. */
  changes: Map<number, PreviewChange>;
}) {
  const { t } = useLanguage();

  if (positions.length === 0) {
    return (
      <p className="text-xs text-[var(--color-text-muted)]">
        {t("No layout geometry available for a preview.")}
      </p>
    );
  }

  const width = Math.max(...positions.map((p) => p.x + (p.w ?? 1))) * UNIT;
  const height = Math.max(...positions.map((p) => p.y + (p.h ?? 1))) * UNIT;

  return (
    <Tooltip.Provider delayDuration={150} disableHoverableContent>
      <div className="overflow-x-auto">
        <div className="relative" style={{ width, height }}>
          {positions.map((position, index) => (
            <KeyCap
              key={index}
              index={index}
              position={position}
              binding={bindings[index]}
              change={changes.get(index)}
            />
          ))}
        </div>
      </div>
    </Tooltip.Provider>
  );
}
