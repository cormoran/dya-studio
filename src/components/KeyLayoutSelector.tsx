/**
 * KeyLayoutSelector Component
 *
 * Renders a static ~70% keyboard preview. Clicking a keyswitch selects the
 * corresponding keycode. Used as an alternative to the category grid in
 * KeycodeValueSelector.
 */
import {
  KEY_LAYOUT_70,
  KEY_LAYOUT_70_JIS,
  ROW_UNITS,
  isSpacer,
  type KeyLayoutItem,
} from "../lib/keyLayout";
import { getKeycodeByCode } from "../lib/keycodes";
import { mapToLayout, type KeyboardLayoutType } from "../lib/keyboardLayouts";
import { useLanguage } from "../hooks/useLanguage";

interface KeyLayoutSelectorProps {
  /** Currently selected base keycode (modifiers already stripped) */
  selectedCode: number;
  /** Called with the base HID keyboard usage code when a key is clicked */
  onSelect: (code: number) => void;
  keyboardLayout?: KeyboardLayoutType;
}

function widthPercent(w: number): string {
  return `${(w / ROW_UNITS) * 100}%`;
}

export function KeyLayoutSelector({
  selectedCode,
  onSelect,
  keyboardLayout,
}: KeyLayoutSelectorProps) {
  const { t } = useLanguage();
  const keyLayout =
    keyboardLayout === "JIS" ? KEY_LAYOUT_70_JIS : KEY_LAYOUT_70;

  const renderKey = (item: KeyLayoutItem, index: number) => {
    if (isSpacer(item)) {
      return (
        <div
          key={`spacer-${index}`}
          style={{ width: widthPercent(item.w) }}
          aria-hidden="true"
        />
      );
    }

    const w = item.w ?? 1;
    const h = item.h ?? 1;
    const isIsoEnter = item.shape === "iso-enter";
    const keycode = getKeycodeByCode(item.code);
    const mapped = keycode ? mapToLayout(keycode, keyboardLayout) : undefined;
    const label = mapped?.displayName ?? `0x${item.code.toString(16)}`;
    const name = mapped?.name ?? label;
    const isSelected = selectedCode === item.code;

    return (
      <div
        key={`key-${item.code}`}
        className={`relative shrink-0 p-[2px] ${h === 2 ? "pointer-events-none z-10 h-16 tablet:h-20" : "h-full"}`}
        style={{ width: widthPercent(w) }}
      >
        <button
          type="button"
          onClick={() => onSelect(item.code)}
          title={`${name} (0x${item.code.toString(16).toUpperCase()})`}
          aria-label={name}
          aria-pressed={isSelected}
          data-key-shape={item.shape}
          style={
            isIsoEnter
              ? {
                  // The 0.25u notch is 1/6 of the 1.5u key. Account for
                  // the wrapper's 2px padding to keep a 4px gap on both rows.
                  clipPath:
                    "polygon(0 0, 100% 0, 100% 100%, calc(100% / 6 + 2px / 3) 100%, calc(100% / 6 + 2px / 3) calc(50% - 2px), 0 calc(50% - 2px))",
                }
              : undefined
          }
          className={`relative flex h-full w-full items-center justify-center overflow-hidden px-0.5 text-center transition-colors ${isIsoEnter ? "pointer-events-auto group" : "rounded border"} ${
            isIsoEnter
              ? isSelected
                ? "bg-[var(--color-electric)] text-[var(--color-electric)]"
                : "bg-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-electric)]/50 focus-visible:bg-[var(--color-electric)]"
              : isSelected
                ? "bg-[var(--color-electric)]/20 border-[var(--color-electric)] text-[var(--color-electric)]"
                : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-electric)]/50"
          }`}
        >
          {isIsoEnter && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-px bg-[var(--color-bg)]"
              style={{
                // Inset the entire L-shaped contour by 1px, including the
                // notch. Clipping a rectangular border loses these two edges.
                clipPath:
                  "polygon(0 0, 100% 0, 100% 100%, calc(100% / 6 + 1px) 100%, calc(100% / 6 + 1px) calc(50% - 3px), 0 calc(50% - 3px))",
              }}
            >
              {isSelected && (
                <span className="absolute inset-0 bg-[var(--color-electric)]/20" />
              )}
            </span>
          )}
          <span
            className={`relative truncate text-[10px] font-medium leading-tight tablet:text-xs ${isIsoEnter ? "ml-[16.666667%]" : ""}`}
          >
            {label}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto min-w-[540px] max-w-3xl px-1 py-2">
        {keyLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="flex h-8 w-full tablet:h-10">
            {row.map((item, index) => renderKey(item, index))}
          </div>
        ))}
        <p className="mt-3 text-center text-[10px] text-[var(--color-text-muted)]">
          {t("For other keys, use the category button at the top right")}
        </p>
      </div>
    </div>
  );
}
