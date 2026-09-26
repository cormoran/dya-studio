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
    const keycode = getKeycodeByCode(item.code);
    const mapped = keycode ? mapToLayout(keycode, keyboardLayout) : undefined;
    const label = mapped?.displayName ?? `0x${item.code.toString(16)}`;
    const name = mapped?.name ?? label;
    const isSelected = selectedCode === item.code;

    return (
      <div
        key={`key-${item.code}`}
        className={`relative z-0 p-[2px] ${h === 2 ? "z-10 h-16 tablet:h-20" : "h-full"}`}
        style={{ width: widthPercent(w) }}
      >
        <button
          type="button"
          onClick={() => onSelect(item.code)}
          title={`${name} (0x${item.code.toString(16).toUpperCase()})`}
          aria-label={name}
          aria-pressed={isSelected}
          className={`flex h-full w-full items-center justify-center overflow-hidden rounded border px-0.5 text-center transition-colors ${
            isSelected
              ? "bg-[var(--color-electric)]/20 border-[var(--color-electric)] text-[var(--color-electric)]"
              : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-electric)]/50"
          }`}
        >
          <span className="truncate text-[10px] font-medium leading-tight tablet:text-xs">
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
