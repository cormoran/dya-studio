/**
 * KeycodeValueSelector Component
 *
 * Grid-based keycode selector with search, category filtering, and modifier support.
 */
import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import {
  IconSearch,
  IconX,
  IconKeyboard,
  IconLayoutGrid,
} from "@tabler/icons-react";
import {
  CATEGORY_DISPLAY_NAMES,
  searchKeycodes,
  getKeycodesByCategory,
  type KeycodeCategory,
  type KeycodeDefinition,
  HID_USAGE_PAGE_KEYBOARD,
  createHidUsage,
  MODIFIER_FLAGS,
  NO_PARAM_VALUE,
  extractModifierFlags,
  extractBaseKeycode,
  combineWithModifiers,
} from "../lib/keycodes";
import {
  getLayoutDisplayName,
  getLayoutName,
  type KeyboardLayoutType,
} from "../lib/keyboardLayouts";
import { KeyLayoutSelector } from "./KeyLayoutSelector";
import { useLanguage } from "../hooks/useLanguage";

/** Selection UI mode: category grid or physical key layout preview */
type ViewMode = "category" | "layout";

// Start with the keyboard layout even for browsers that auto-saved the old category default.
const VIEW_MODE_STORAGE_KEY = "keycodeSelectorViewModeV2";

// Keycode categories in display order
const KEYCODE_CATEGORY_ORDER: KeycodeCategory[] = [
  "letters",
  "numbers",
  "punctuation",
  "navigation",
  "modifiers",
  "function",
  "numpad",
  "media",
  "system",
  "international",
  "miscellaneous",
];

interface KeycodeValueSelectorProps {
  toolbar?: ReactNode;
  compact?: boolean;
  value: number;
  onChange: (value: number, shouldNotClose?: boolean) => void;
  showModifiers?: boolean;
  keyboardLayout?: KeyboardLayoutType;
}

export function KeycodeValueSelector({
  toolbar,
  compact = false,
  value,
  onChange,
  keyboardLayout,
  showModifiers = true,
}: KeycodeValueSelectorProps) {
  const { t } = useLanguage();
  const [layoutSearchExpanded, setLayoutSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<KeycodeCategory>("letters");
  const [selectedModifiers, setSelectedModifiers] = useState<number>(
    extractModifierFlags(value),
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return saved === "category" ? "category" : "layout";
  });
  const [modifiersExpanded, setModifiersExpanded] = useState(false);
  const modifiersVisible = !compact || modifiersExpanded;
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Update modifiers when value changes externally
  useEffect(() => {
    setSelectedModifiers(extractModifierFlags(value));
  }, [value]);
  // Update selectedCategory when value changes or initially provided
  useEffect(() => {
    const baseCode = extractBaseKeycode(value);
    const keycodes = KEYCODE_CATEGORY_ORDER.flatMap((c) =>
      getKeycodesByCategory(c, keyboardLayout),
    );
    const found = keycodes.find((k) => k.code === baseCode);
    if (found && found.category !== selectedCategory) {
      setSelectedCategory(found.category);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, keyboardLayout]);
  // Focus the search input when the component is mounted (shown)
  useEffect(() => {
    const isTouchDevice = window.matchMedia(
      "(hover: none) and (pointer: coarse)",
    ).matches;
    if (!isTouchDevice) {
      searchInputRef.current?.focus();
    }
  }, [viewMode, layoutSearchExpanded]);
  const filteredKeycodes = useMemo((): KeycodeDefinition[] => {
    if (searchQuery.trim()) {
      return searchKeycodes(searchQuery, keyboardLayout);
    }
    return getKeycodesByCategory(selectedCategory, keyboardLayout);
  }, [searchQuery, selectedCategory, keyboardLayout]);

  const handleCodeSelect = useCallback(
    (code: number) => {
      const combined = combineWithModifiers(code, selectedModifiers);
      onChange(combined);
    },
    [onChange, selectedModifiers],
  );

  const handleKeycodeSelect = useCallback(
    (keycode: KeycodeDefinition) => {
      handleCodeSelect(keycode.code);
    },
    [handleCodeSelect],
  );

  const handleModifierToggle = useCallback(
    (modValue: number) => {
      const newModifiers = selectedModifiers ^ modValue;
      setSelectedModifiers(newModifiers);
      // Update the current value with new modifiers if a keycode is selected
      const baseCode = extractBaseKeycode(value);
      if (baseCode !== NO_PARAM_VALUE) {
        onChange(combineWithModifiers(baseCode, newModifiers), true);
      }
    },
    [selectedModifiers, value, onChange],
  );

  const handleClearModifiers = useCallback(() => {
    setSelectedModifiers(0);
    // Update the current value with no modifiers if a keycode is selected
    const baseCode = extractBaseKeycode(value);
    if (baseCode !== NO_PARAM_VALUE) {
      onChange(combineWithModifiers(baseCode, 0));
    }
  }, [value, onChange]);

  const showSearch =
    !compact || viewMode === "category" || layoutSearchExpanded;
  const showSearchResults = showSearch && searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Search + view mode toggle */}
      <div className="mb-2 flex items-center gap-2 shrink-0">
        {toolbar}
        {compact && showModifiers && (
          <button
            type="button"
            aria-expanded={modifiersExpanded}
            onClick={() => setModifiersExpanded(!modifiersExpanded)}
            className={`px-2 py-1 text-xs rounded border whitespace-nowrap ${modifiersExpanded ? "border-[var(--color-electric)] text-[var(--color-electric)] bg-[var(--color-electric)]/10" : "border-[var(--color-border)] text-[var(--color-text-secondary)]"}`}
          >
            {t("Modifiers")}
            {selectedModifiers !== 0
              ? ` (${MODIFIER_FLAGS.filter(
                  (mod) => selectedModifiers & mod.value,
                )
                  .map((mod) => mod.label)
                  .join("+")})`
              : ""}
          </button>
        )}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {compact && viewMode === "layout" && (
            <button
              type="button"
              aria-label={t("Search keycodes...")}
              title={t("Search keycodes...")}
              aria-expanded={layoutSearchExpanded}
              className={`p-1 rounded border ${layoutSearchExpanded ? "border-[var(--color-electric)] text-[var(--color-electric)] bg-[var(--color-electric)]/10" : "border-[var(--color-border)] text-[var(--color-text-muted)]"}`}
              onClick={() => {
                setLayoutSearchExpanded(!layoutSearchExpanded);
                if (layoutSearchExpanded) setSearchQuery("");
              }}
            >
              <IconSearch size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setLayoutSearchExpanded(false);
              setViewMode((m) => (m === "layout" ? "category" : "layout"));
            }}
            aria-pressed={viewMode === "layout"}
            title={
              viewMode === "layout"
                ? t("Show keycodes by category")
                : t("Show key layout")
            }
            aria-label={
              viewMode === "layout"
                ? t("Show keycodes by category")
                : t("Show key layout")
            }
            className={`flex-shrink-0 p-1 rounded border transition-colors ${
              viewMode === "layout"
                ? "bg-[var(--color-electric)]/20 border-[var(--color-electric)] text-[var(--color-electric)]"
                : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-electric)]/50"
            }`}
          >
            {viewMode === "layout" ? (
              <IconLayoutGrid size={18} />
            ) : (
              <IconKeyboard size={18} />
            )}
          </button>
        </div>
      </div>

      {/* Modifier Flags */}
      {showModifiers && modifiersVisible && (
        <div className="mb-2 flex items-center gap-2 shrink-0">
          {(!compact || selectedModifiers !== 0) && (
            <div className="flex items-center gap-2 shrink-0">
              {!compact && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t("Modifiers")}:
                </span>
              )}
              {selectedModifiers !== 0 && (
                <button
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1"
                  onClick={handleClearModifiers}
                >
                  <IconX size={12} />
                  {t("Clear")}
                </button>
              )}
            </div>
          )}
          <div className="flex min-w-0 gap-1 overflow-x-auto">
            {MODIFIER_FLAGS.map((mod) => (
              <button
                key={mod.value}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  selectedModifiers & mod.value
                    ? "bg-[var(--color-cyber)]/20 text-[var(--color-cyber)] border border-[var(--color-cyber)]"
                    : "bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-cyber)]/50"
                }`}
                onClick={() => handleModifierToggle(mod.value)}
              >
                {mod.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showSearch && (
        <div className="relative mb-2 shrink-0">
          <IconSearch
            size={16}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t("Search keycodes...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] tablet:text-sm text-base text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-electric)]/50"
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              onClick={() => {
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              aria-label={t("Clear search")}
              tabIndex={0}
            >
              <IconX size={16} />
            </button>
          )}
        </div>
      )}

      {/* Key Layout Preview */}
      {viewMode === "layout" && !showSearchResults && (
        <div className="flex-1 flex overflow-hidden min-h-0">
          <KeyLayoutSelector
            selectedCode={extractBaseKeycode(value)}
            onSelect={handleCodeSelect}
            keyboardLayout={keyboardLayout}
          />
        </div>
      )}

      {/* Category + Grid Layout */}
      {(viewMode === "category" || showSearchResults) && (
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Category Sidebar */}
          {!searchQuery && (
            <div className="w-28 border-r border-[var(--color-border)] overflow-y-auto pr-2">
              {KEYCODE_CATEGORY_ORDER.map((category) => (
                <button
                  key={category}
                  className={`w-full px-2 py-1.5 text-left text-xs rounded transition-colors mb-0.5 ${
                    selectedCategory === category
                      ? "bg-[var(--color-electric)]/10 text-[var(--color-electric)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {t(CATEGORY_DISPLAY_NAMES[category])}
                </button>
              ))}
            </div>
          )}

          {/* Keycode Grid */}
          <div className="flex-1 overflow-y-auto pl-2">
            <div
              className={`grid gap-1 tablet:grid-cols-5 ${
                searchQuery.trim() ? "grid-cols-4" : "grid-cols-2 "
              }`}
            >
              {filteredKeycodes.map((keycode) => {
                const isSelected =
                  extractBaseKeycode(value) === keycode.code ||
                  extractBaseKeycode(value) ===
                    createHidUsage(HID_USAGE_PAGE_KEYBOARD, keycode.code);
                return (
                  <button
                    key={`${keycode.category}-${keycode.code}`}
                    className={`p-1.5 rounded border text-center transition-colors ${
                      isSelected
                        ? "bg-[var(--color-electric)]/20 border-[var(--color-electric)]"
                        : "bg-[var(--color-bg)] border-[var(--color-border)] hover:border-[var(--color-electric)]/50"
                    }`}
                    onClick={() => handleKeycodeSelect(keycode)}
                    title={`${keycode.name} (0x${keycode.code.toString(16).toUpperCase()})`}
                  >
                    <span className="block text-xs font-medium text-[var(--color-text)]">
                      {getLayoutDisplayName(keycode.code, keyboardLayout) ??
                        keycode.displayName}
                    </span>
                    {keycode.displayName !== keycode.name && (
                      <span className="block text-[10px] text-[var(--color-text-muted)] truncate">
                        {getLayoutName(keycode.code, keyboardLayout) ??
                          keycode.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {filteredKeycodes.length === 0 && (
              <div className="text-center py-4 text-xs text-[var(--color-text-muted)]">
                {t("No keycodes found")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
