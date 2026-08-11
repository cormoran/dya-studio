/**
 * PhysicalKey Component
 *
 * Renders a single key in the physical keyboard layout.
 * Supports positioning, rotation, sizing, and interactive states.
 */
import { useState, useMemo } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  IconArrowBigUp,
  IconBrandWindows,
  IconChevronUp,
  IconCommand,
  IconHistory,
  IconOption,
  IconRotateClockwise,
  IconSpace,
} from "@tabler/icons-react";
import type { KeyPhysicalAttrs, BehaviorBinding } from "../hooks/useKeymap";
import { useLanguage } from "../hooks/useLanguage";

// Base unit size for 1U key in pixels at scale 1.0
const BASE_UNIT_SIZE = 54;

interface PhysicalKeyProps {
  /** Physical attributes of the key (position, size, rotation) */
  attrs: KeyPhysicalAttrs;
  /** Key position index in the layout */
  keyPosition: number;
  /** Current binding for this key */
  binding?: BehaviorBinding;
  /** Whether this key has been modified from original */
  isModified: boolean;
  /** Whether this key's ORIGINAL (last-saved) binding is still known. When
   * false and the key is modified, its saved value couldn't be recovered
   * (e.g. after a tab switch), so the tooltip shows "original: unknown" and the
   * per-key reset reverts to the hard-coded default instead of the original. */
  isOriginalKnown?: boolean;
  /** Whether this key's persisted binding differs from the hard-coded default
   * keymap (a modest, informational highlight, distinct from `isModified`). */
  isChangedFromDefault?: boolean;
  /** Default-binding display name (for tooltip when changed from default) */
  defaultDisplayName?: string;
  /** Display name for the binding */
  displayName: string;
  /** Long display name (for tooltip) */
  longDisplayName?: string;
  /** Original display name (for tooltip when modified) */
  originalDisplayName?: string;
  /** Full binding description including params (for tooltip) */
  bindingDescription?: string;
  /** Whether this key is currently selected */
  isSelected: boolean;
  /** Whether this key is currently highlighted in the preview */
  isHighlighted?: boolean;
  /** Callback when key is clicked */
  onClick: () => void;
  /** Callback to reset this key to original */
  onReset: () => void;
  /** Callback to reset this key to its hard-coded default (optional) */
  onResetToDefault?: () => void;
  /** Scale factor for responsive sizing */
  scale?: number;
}

export function PhysicalKey({
  attrs,
  keyPosition,
  isModified,
  isOriginalKnown = true,
  isChangedFromDefault = false,
  displayName,
  longDisplayName,
  originalDisplayName,
  defaultDisplayName,
  bindingDescription,
  isSelected,
  isHighlighted = false,
  onClick,
  onReset,
  onResetToDefault,
  scale = 1.0,
}: PhysicalKeyProps) {
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const accessibleName = t("Key position {{position}}: {{binding}}", {
    position: keyPosition,
    binding: longDisplayName || displayName || t("No binding"),
  });

  // Calculate dimensions and position with scale
  // ZMK uses centimils (1/100 of a key unit) for dimensions
  // Standard key unit is usually around 19.05mm = 1900 centimils
  const style = useMemo(() => {
    const unitSize = BASE_UNIT_SIZE * scale;
    const width = (attrs.width / 100) * unitSize;
    const height = (attrs.height / 100) * unitSize;
    const x = (attrs.x / 100) * unitSize;
    const y = (attrs.y / 100) * unitSize;

    // Rotation: r is in centidegrees, rx and ry are rotation center
    const rotation = attrs.r / 100;
    const rotationCenterX = (attrs.rx / 100) * unitSize;
    const rotationCenterY = (attrs.ry / 100) * unitSize;

    return {
      width: `${Math.max(width, 20)}px`,
      height: `${Math.max(height, 20)}px`,
      left: `${x}px`,
      top: `${y}px`,
      transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
      transformOrigin:
        rotation !== 0
          ? `${rotationCenterX - x}px ${rotationCenterY - y}px`
          : undefined,
    };
  }, [attrs, scale]);

  // Calculate dynamic font size based on scale
  const fontSize = useMemo(() => {
    const baseSize = 12; // base font size in px
    const scaledSize = baseSize * scale;
    return Math.max(8, Math.min(14, scaledSize)); // clamp between 8px and 14px
  }, [scale]);

  // Key content
  const keyContent = (
    <button
      type="button"
      className={`
        relative w-full h-full rounded-lg border cursor-pointer transition-all duration-150
        flex flex-col items-center justify-center p-1.5 overflow-hidden
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-electric)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]
        ${
          isHighlighted
            ? "bg-amber-400/20 border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.45)]"
            : isSelected
              ? "bg-[var(--color-electric)]/20 border-[var(--color-electric)] shadow-[0_0_10px_rgba(0,212,255,0.3)]"
              : isModified
                ? "bg-[var(--color-neon)]/10 border-[var(--color-neon)]/50 hover:border-[var(--color-neon)]"
                : isChangedFromDefault
                  ? "bg-[var(--color-surface)] border-[var(--color-electric)]/30 hover:border-[var(--color-electric)]/60 hover:bg-[var(--color-electric)]/5"
                  : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-electric)]/50 hover:bg-[var(--color-electric)]/5"
        }
      `}
      onClick={onClick}
      aria-label={accessibleName}
      aria-current={isSelected ? "true" : undefined}
      data-key-position={keyPosition}
      data-binding-label={longDisplayName || displayName}
    >
      {/* Display Name */}
      <span
        className={`
            flex items-center justify-center
          font-medium text-center leading-tight break-words line-clamp-2
          ${
            isHighlighted
              ? "text-amber-100"
              : isModified
                ? "text-[var(--color-neon)]"
                : "text-[var(--color-text)]"
          }
        `}
        style={{ fontSize: `${fontSize}px` }}
        title={displayName}
      >
        {iconReplace(displayName) || "—"}
      </span>

      {/* Modified indicator */}
      {isModified && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-neon)]" />
      )}

      {/* Changed-from-default indicator (modest, distinct corner + color from
          the modified dot above) */}
      {isChangedFromDefault && !isModified && (
        <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-[var(--color-electric)]/50" />
      )}

      {isHighlighted && (
        <div className="absolute inset-0 rounded-lg border-2 border-amber-200/70 pointer-events-none animate-pulse" />
      )}
    </button>
  );

  // Always wrap with tooltip to show binding info
  return (
    <div
      className="absolute"
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Tooltip.Provider delayDuration={200} disableHoverableContent>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{keyContent}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="px-3 py-2 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] shadow-lg z-50 max-w-xs"
              sideOffset={5}
            >
              <div className="space-y-1">
                {/* Always show displayName */}
                <div>
                  <span className="font-medium">
                    {longDisplayName || displayName}
                  </span>
                </div>
                {/* Show binding description only if different from displayName */}
                {bindingDescription &&
                  bindingDescription !== displayName &&
                  longDisplayName !== bindingDescription && (
                    <div>
                      <span className="text-[var(--color-text-muted)]">
                        {t("Binding")}:{" "}
                      </span>
                      <span>{bindingDescription}</span>
                    </div>
                  )}
                {/* Original binding info when modified and still known */}
                {isModified && isOriginalKnown && originalDisplayName && (
                  <div>
                    <span className="text-[var(--color-text-muted)]">
                      {t("Original")}:{" "}
                    </span>
                    <span>{originalDisplayName}</span>
                  </div>
                )}
                {/* Original lost (e.g. after a tab switch): we can't recover the
                  saved value, so say so and fall back to the default below. */}
                {isModified && !isOriginalKnown && (
                  <div>
                    <span className="text-[var(--color-text-muted)]">
                      {t("Original")}:{" "}
                    </span>
                    <span>{t("Unknown")}</span>
                  </div>
                )}
                {/* Default binding: shown when the persisted value differs from it
                  (changed-from-default), or as the fall-back reference for a
                  modified key whose original is unknown. */}
                {((isChangedFromDefault && !isModified) ||
                  (isModified && !isOriginalKnown)) &&
                  defaultDisplayName && (
                    <div>
                      <span className="text-[var(--color-text-muted)]">
                        {t("Default")}:{" "}
                      </span>
                      <span className="text-[var(--color-electric)]">
                        {defaultDisplayName}
                      </span>
                    </div>
                  )}
              </div>
              <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>

      {/* Keep reset actions as siblings of the main key button so the DOM
          never contains an invalid nested button. */}
      {isModified && isHovered && isOriginalKnown && (
        <button
          type="button"
          className="absolute bottom-1 right-1 p-0.5 rounded bg-[var(--color-surface)]/80 hover:bg-[var(--color-surface)] border border-[var(--color-border)]"
          onClick={onReset}
          title={t("Reset to original")}
          aria-label={t("Reset key position {{position}} to original", {
            position: keyPosition,
          })}
        >
          <IconRotateClockwise
            size={12}
            className="text-[var(--color-text-muted)]"
          />
        </button>
      )}
      {isModified && isHovered && !isOriginalKnown && onResetToDefault && (
        <button
          type="button"
          className="absolute bottom-1 right-1 p-0.5 rounded bg-[var(--color-surface)]/80 hover:bg-[var(--color-surface)] border border-[var(--color-border)]"
          onClick={onResetToDefault}
          title={t("Reset to default")}
          aria-label={t("Reset key position {{position}} to default", {
            position: keyPosition,
          })}
        >
          <IconHistory size={12} className="text-[var(--color-electric)]" />
        </button>
      )}
      {isChangedFromDefault && !isModified && isHovered && onResetToDefault && (
        <button
          type="button"
          className="absolute bottom-1 right-1 p-0.5 rounded bg-[var(--color-surface)]/80 hover:bg-[var(--color-surface)] border border-[var(--color-border)]"
          onClick={onResetToDefault}
          title={t("Reset to default")}
          aria-label={t("Reset key position {{position}} to default", {
            position: keyPosition,
          })}
        >
          <IconHistory size={12} className="text-[var(--color-electric)]" />
        </button>
      )}
    </div>
  );
}

const isWindows = navigator.userAgent.includes("Windows");
const IconComponents = {
  IconCommand: isWindows ? IconBrandWindows : IconCommand,
  IconControl: IconChevronUp,
  IconShift: IconArrowBigUp,
  IconAlt: IconOption,
  IconSpace: IconSpace,
};
const IconMap: Record<keyof typeof IconComponents, string[]> = {
  IconCommand: ["LGui", "RGui"],
  IconControl: ["LCtrl", "RCtrl"],
  IconShift: ["LShift", "RShift"],
  IconAlt: ["LAlt", "RAlt"],
  IconSpace: ["Space"],
};
const TermToIcon: Record<string, keyof typeof IconComponents> = Object.entries(
  IconMap,
).reduce((acc: Record<string, keyof typeof IconComponents>, [icon, terms]) => {
  terms.forEach((term) => {
    acc[term] = icon as keyof typeof IconComponents;
  });
  return acc;
}, {});

function iconReplace(str: string): React.ReactNode {
  const splits = str.split(" ");
  return (
    <>
      {splits
        .map((sub) => {
          if (TermToIcon[sub]) {
            const IconComponent = IconComponents[TermToIcon[sub]];

            return (
              <IconComponent
                key={sub}
                width={splits.length > 1 ? "1em" : "1.5em"}
              />
            );
          }
          return sub;
        })
        .reduce(
          (acc, val) => {
            if (
              acc.length > 0 &&
              typeof val === "string" &&
              typeof acc[acc.length - 1] === "string"
            ) {
              acc[acc.length - 1] += " " + val;
            } else {
              acc.push(val);
            }
            return acc;
          },
          [] as (string | React.ReactNode)[],
        )}
    </>
  );
}
