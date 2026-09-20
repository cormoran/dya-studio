/** Custom dropdown with searchable behaviors and configurable quick selects. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconAdjustments,
  IconChevronDown,
  IconChevronUp,
  IconEye,
  IconEyeOff,
  IconFilter,
  IconPin,
  IconPinFilled,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import {
  getBehaviorMetadata,
  type BehaviorCategory,
} from "../lib/behaviorMetadata";
import type { BehaviorDefinition } from "../hooks/useKeymap";
import { EditorTooltip } from "./EditorTooltip";
import { useLanguage } from "../hooks/useLanguage";

// Unknown behavior metadata is folded into Misc, avoiding two Japanese "その他" categories.
const BEHAVIOR_CATEGORIES: { id: BehaviorCategory; name: string }[] = [
  { id: "keypress", name: "Key Press" },
  { id: "layer", name: "Layers" },
  { id: "mod", name: "Modifiers" },
  { id: "mouse", name: "Mouse" },
  { id: "transport", name: "Transport" },
  { id: "system", name: "System" },
  { id: "miscellaneous", name: "Misc" },
];

const QUICK_SELECT_BEHAVIORS = ["kp", "lt", "mt", "none", "transparent"];
const CATEGORY_PREFERENCE_STORAGE_KEY = "behaviorDropdownKeepCategory";
const LAST_CATEGORY_STORAGE_KEY = "behaviorDropdownLastCategory";

interface BehaviorOption {
  id: number;
  name: string;
  displayName: string;
  category: BehaviorCategory;
  description?: string;
}

interface QuickSelectConfig {
  hiddenPresets: string[];
  pinnedBehaviorNames: string[];
  order: string[];
}

interface QuickSelectBehavior {
  id: number;
  name: string;
  displayName: string;
  isRecent: boolean;
  isPinned: boolean;
}

interface BehaviorDropdownProps {
  compact?: boolean;
  behaviors: Map<number, BehaviorDefinition>;
  selectedBehaviorId: number | null;
  onSelect: (behaviorId: number) => void;
  onQuickSelect: (behaviorId: number) => void;
  quickSelects?: string[];
}

function readQuickSelectConfig(storageKey: string): QuickSelectConfig {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved)
      return { hiddenPresets: [], pinnedBehaviorNames: [], order: [] };
    const parsed = JSON.parse(saved) as Partial<QuickSelectConfig>;
    const strings = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
    return {
      hiddenPresets: strings(parsed.hiddenPresets),
      pinnedBehaviorNames: strings(parsed.pinnedBehaviorNames),
      order: strings(parsed.order),
    };
  } catch {
    return { hiddenPresets: [], pinnedBehaviorNames: [], order: [] };
  }
}

function isTouchDevice() {
  return window.matchMedia?.("(hover: none) and (pointer: coarse)").matches;
}

export function BehaviorDropdown({
  compact = false,
  behaviors,
  selectedBehaviorId,
  onSelect,
  onQuickSelect,
  quickSelects,
}: BehaviorDropdownProps) {
  const { t } = useLanguage();
  const presetNames = quickSelects || QUICK_SELECT_BEHAVIORS;
  const quickSelectStorageKey = `behaviorDropdownQuickSelects:${presetNames.join("|")}`;
  const [isOpen, setIsOpen] = useState(false);
  const [isQuickSelectSettingsOpen, setIsQuickSelectSettingsOpen] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [keepCategory, setKeepCategory] = useState(() => {
    try {
      return localStorage.getItem(CATEGORY_PREFERENCE_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [filterCategory, setFilterCategory] = useState<
    BehaviorCategory | "all"
  >(() => {
    try {
      const saved = localStorage.getItem(LAST_CATEGORY_STORAGE_KEY);
      return keepCategory &&
        BEHAVIOR_CATEGORIES.some((category) => category.id === saved)
        ? (saved as BehaviorCategory)
        : "all";
    } catch {
      return "all";
    }
  });
  const [quickSelectConfig, setQuickSelectConfig] = useState<QuickSelectConfig>(
    () => readQuickSelectConfig(quickSelectStorageKey),
  );
  const [recentBehaviors, setRecentBehaviors] = useState<number[]>(() => {
    try {
      const saved = sessionStorage.getItem("recentBehaviors");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuickSelectConfig(readQuickSelectConfig(quickSelectStorageKey));
  }, [quickSelectStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        quickSelectStorageKey,
        JSON.stringify(quickSelectConfig),
      );
    } catch {
      // Storage is an optional enhancement.
    }
  }, [quickSelectConfig, quickSelectStorageKey]);

  useEffect(() => {
    if (isOpen && !isTouchDevice()) searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsQuickSelectSettingsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const behaviorOptions = useMemo((): BehaviorOption[] => {
    const options: BehaviorOption[] = [];
    behaviors.forEach((behavior, id) => {
      const metadata = getBehaviorMetadata(behavior.displayName);
      const category =
        metadata?.category === "others"
          ? "miscellaneous"
          : (metadata?.category ?? "miscellaneous");
      options.push({
        id,
        name: behavior.displayName,
        displayName:
          metadata?.displayNameVariants.at(0) || behavior.displayName,
        category,
        description: metadata?.description,
      });
    });
    return options.sort((a, b) => {
      const categoryDifference =
        BEHAVIOR_CATEGORIES.findIndex(
          (category) => category.id === a.category,
        ) -
        BEHAVIOR_CATEGORIES.findIndex((category) => category.id === b.category);
      return categoryDifference || a.displayName.localeCompare(b.displayName);
    });
  }, [behaviors]);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (query) {
      return behaviorOptions.filter((option) =>
        [option.displayName, option.name, option.description]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLocaleLowerCase().includes(query)),
      );
    }
    return filterCategory === "all"
      ? behaviorOptions
      : behaviorOptions.filter((option) => option.category === filterCategory);
  }, [behaviorOptions, filterCategory, searchQuery]);

  const findBehavior = useCallback(
    (name: string) => {
      const metadata = getBehaviorMetadata(name);
      return Array.from(behaviors.values()).find(
        (behavior) =>
          behavior.displayName === name ||
          metadata?.displayNameVariants.includes(behavior.displayName),
      );
    },
    [behaviors],
  );

  const quickSelectBehaviors = useMemo((): QuickSelectBehavior[] => {
    const unique = (items: BehaviorDefinition[]) =>
      items.filter(
        (behavior, index) =>
          items.findIndex(
            (item) => item.displayName === behavior.displayName,
          ) === index,
      );
    const presets = presetNames
      .filter((name) => !quickSelectConfig.hiddenPresets.includes(name))
      .map(findBehavior)
      .filter((behavior): behavior is BehaviorDefinition => Boolean(behavior));
    const pinned = quickSelectConfig.pinnedBehaviorNames
      .map(findBehavior)
      .filter((behavior): behavior is BehaviorDefinition => Boolean(behavior));
    const primary = unique([...presets, ...pinned]).sort((a, b) => {
      const aIndex = quickSelectConfig.order.indexOf(a.displayName);
      const bIndex = quickSelectConfig.order.indexOf(b.displayName);
      if (aIndex === -1) return bIndex === -1 ? 0 : 1;
      return bIndex === -1 ? -1 : aIndex - bIndex;
    });
    const primaryIds = new Set(primary.map((behavior) => behavior.id));
    const recent = recentBehaviors
      .filter((id) => !primaryIds.has(id) && behaviors.has(id))
      .map((id) => behaviors.get(id)!);
    return [...primary, ...recent].map((behavior) => {
      const metadata = getBehaviorMetadata(behavior.displayName);
      return {
        id: behavior.id,
        name: behavior.displayName,
        displayName:
          metadata?.displayNameVariants.at(0) || behavior.displayName,
        isRecent: recent.some(
          (recentBehavior) => recentBehavior.id === behavior.id,
        ),
        isPinned: quickSelectConfig.pinnedBehaviorNames.includes(
          behavior.displayName,
        ),
      };
    });
  }, [
    behaviors,
    findBehavior,
    presetNames,
    quickSelectConfig,
    recentBehaviors,
  ]);

  const updateRecentBehaviors = (behaviorId: number) => {
    setRecentBehaviors((previous) => {
      const updated = [
        behaviorId,
        ...previous.filter((id) => id !== behaviorId),
      ].slice(0, 2);
      try {
        sessionStorage.setItem("recentBehaviors", JSON.stringify(updated));
      } catch {
        // Storage is an optional enhancement.
      }
      return updated;
    });
  };

  const updateCategory = (category: BehaviorCategory | "all") => {
    setFilterCategory(category);
    if (keepCategory) {
      try {
        localStorage.setItem(LAST_CATEGORY_STORAGE_KEY, category);
      } catch {
        // Storage is an optional enhancement.
      }
    }
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setIsQuickSelectSettingsOpen(false);
    setSearchQuery("");
    if (!keepCategory) setFilterCategory("all");
  };

  const toggleKeepCategory = () => {
    setKeepCategory((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(CATEGORY_PREFERENCE_STORAGE_KEY, String(next));
        if (next)
          localStorage.setItem(LAST_CATEGORY_STORAGE_KEY, filterCategory);
        else localStorage.removeItem(LAST_CATEGORY_STORAGE_KEY);
      } catch {
        // Storage is an optional enhancement.
      }
      if (!next) setFilterCategory("all");
      return next;
    });
  };

  const togglePreset = (presetName: string) => {
    setQuickSelectConfig((previous) => ({
      ...previous,
      hiddenPresets: previous.hiddenPresets.includes(presetName)
        ? previous.hiddenPresets.filter((name) => name !== presetName)
        : [...previous.hiddenPresets, presetName],
    }));
  };

  const togglePinned = (behaviorName: string) => {
    setQuickSelectConfig((previous) => ({
      ...previous,
      pinnedBehaviorNames: previous.pinnedBehaviorNames.includes(behaviorName)
        ? previous.pinnedBehaviorNames.filter((name) => name !== behaviorName)
        : [...previous.pinnedBehaviorNames, behaviorName],
    }));
  };

  const orderedQuickSelects = quickSelectBehaviors.filter(
    (behavior) => !behavior.isRecent || behavior.isPinned,
  );
  const moveQuickSelect = (behaviorName: string, direction: -1 | 1) => {
    const names = orderedQuickSelects.map((behavior) => behavior.name);
    const index = names.indexOf(behaviorName);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= names.length) return;
    [names[index], names[target]] = [names[target], names[index]];
    setQuickSelectConfig((previous) => ({ ...previous, order: names }));
  };

  const selectedBehavior =
    selectedBehaviorId !== null ? behaviors.get(selectedBehaviorId) : null;
  const selectedBehaviorMetadata = selectedBehavior
    ? getBehaviorMetadata(selectedBehavior.displayName)
    : null;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div
      className={`relative ${compact ? "flex items-center gap-1" : ""}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className={`${compact ? "shrink-0 max-w-[40%] px-2 py-1" : "w-full px-3 py-1.5"} flex items-center justify-between gap-1 rounded bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-electric)]/50 transition-colors`}
        aria-expanded={isOpen}
        onClick={() => (isOpen ? closeDropdown() : setIsOpen(true))}
      >
        <span
          className={`${compact ? "text-xs truncate" : "text-sm"} text-[var(--color-text)]`}
        >
          {selectedBehaviorMetadata?.displayNameVariants.at(0) ||
            t("Select behavior")}
          {!compact && selectedBehaviorMetadata?.description && (
            <span className="mx-1 text-xs text-[var(--color-text-muted)]">
              - {t(selectedBehaviorMetadata.description)}
            </span>
          )}
        </span>
        <IconChevronDown
          size={16}
          className={`text-[var(--color-text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`items-center gap-1 overflow-x-auto flex ${compact ? "min-w-0" : "mt-2 pl-2"}`}
      >
        <span
          className={`${compact ? "sr-only" : "text-xs text-[var(--color-text-muted)] mr-1 flex-shrink-0"}`}
        >
          {t("Quick Select")}:
        </span>
        {quickSelectBehaviors.map((quickBehavior) => (
          <EditorTooltip
            key={quickBehavior.id}
            content={
              <>
                <div className="font-medium">{quickBehavior.displayName}</div>
                <div>
                  {t(
                    getBehaviorMetadata(quickBehavior.name)?.description ??
                      "Select this behavior",
                  )}
                </div>
                {quickBehavior.isRecent && (
                  <div className="mt-1 text-[var(--color-text-muted)]">
                    {t("Recently used")}
                  </div>
                )}
              </>
            }
          >
            <button
              type="button"
              className={`${compact ? "px-2 py-1 rounded" : "px-3 py-1.5 rounded-lg"} text-xs font-medium transition-colors flex-shrink-0 ${selectedBehaviorId === quickBehavior.id ? "bg-[var(--color-electric)]/20 text-[var(--color-electric)] border border-[var(--color-electric)]" : quickBehavior.isRecent ? "bg-[var(--color-neon)]/10 text-[var(--color-neon)] border border-[var(--color-neon)]/30 hover:border-[var(--color-neon)]" : "bg-[var(--color-border)] text-[var(--color-text-secondary)] border border-transparent hover:border-[var(--color-electric)]/50"}`}
              onClick={() => {
                updateRecentBehaviors(quickBehavior.id);
                onQuickSelect(quickBehavior.id);
              }}
            >
              {quickBehavior.displayName}
            </button>
          </EditorTooltip>
        ))}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl z-10 max-h-80 flex flex-col">
          <div className="p-2 border-b border-[var(--color-border)] flex items-center gap-1 shrink-0">
            <div className="relative flex-1">
              <IconSearch
                size={16}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t("Search behaviors...")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pl-8 pr-8 py-1.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-electric)]/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  aria-label={t("Clear search")}
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                >
                  <IconX size={16} />
                </button>
              )}
            </div>
            <EditorTooltip
              content={
                keepCategory
                  ? t("Keep the selected behavior category")
                  : t("Reset the behavior category when reopening")
              }
            >
              <button
                type="button"
                aria-label={t("Keep selected category")}
                aria-pressed={keepCategory}
                className={`p-1.5 rounded border ${keepCategory ? "border-[var(--color-electric)] text-[var(--color-electric)] bg-[var(--color-electric)]/10" : "border-[var(--color-border)] text-[var(--color-text-muted)]"}`}
                onClick={toggleKeepCategory}
              >
                <IconFilter size={16} />
              </button>
            </EditorTooltip>
            <div className="relative">
              <EditorTooltip content={t("Configure Quick Select")}>
                <button
                  type="button"
                  aria-label={t("Configure Quick Select")}
                  aria-expanded={isQuickSelectSettingsOpen}
                  className={`p-1.5 rounded border ${isQuickSelectSettingsOpen ? "border-[var(--color-electric)] text-[var(--color-electric)] bg-[var(--color-electric)]/10" : "border-[var(--color-border)] text-[var(--color-text-muted)]"}`}
                  onClick={() => setIsQuickSelectSettingsOpen((open) => !open)}
                >
                  <IconAdjustments size={16} />
                </button>
              </EditorTooltip>
              {isQuickSelectSettingsOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 shadow-xl">
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {t("Quick Select settings")}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {t(
                      "Choose preset behaviors, pin visible items, and arrange the quick-select row.",
                    )}
                  </p>
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">
                      {t("Preset behaviors")}
                    </p>
                    <div className="space-y-1">
                      {presetNames.map((presetName) => {
                        const behavior = findBehavior(presetName);
                        if (!behavior) return null;
                        const metadata = getBehaviorMetadata(
                          behavior.displayName,
                        );
                        const visible =
                          !quickSelectConfig.hiddenPresets.includes(presetName);
                        return (
                          <button
                            key={presetName}
                            type="button"
                            className="w-full flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-[var(--color-border)]"
                            aria-pressed={visible}
                            onClick={() => togglePreset(presetName)}
                          >
                            {visible ? (
                              <IconEye size={15} />
                            ) : (
                              <IconEyeOff size={15} />
                            )}
                            <span className="flex-1 text-[var(--color-text)]">
                              {metadata?.displayNameVariants.at(0) ||
                                behavior.displayName}
                            </span>
                            <span className="text-[var(--color-text-muted)]">
                              {visible ? t("Shown") : t("Hidden")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                    <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">
                      {t("Visible quick selects")}
                    </p>
                    <div className="space-y-1">
                      {quickSelectBehaviors.map((quickBehavior) => (
                        <div
                          key={quickBehavior.id}
                          className="flex items-center gap-1 rounded px-1.5 py-1 text-xs hover:bg-[var(--color-border)]"
                        >
                          <span className="flex-1 truncate text-[var(--color-text)]">
                            {quickBehavior.displayName}
                          </span>
                          <EditorTooltip
                            content={
                              quickBehavior.isPinned
                                ? t("Unpin this behavior")
                                : t("Pin this behavior")
                            }
                          >
                            <button
                              type="button"
                              aria-label={
                                quickBehavior.isPinned
                                  ? t("Unpin this behavior")
                                  : t("Pin this behavior")
                              }
                              aria-pressed={quickBehavior.isPinned}
                              className={`rounded p-1 ${quickBehavior.isPinned ? "text-[var(--color-electric)]" : "text-[var(--color-text-muted)]"}`}
                              onClick={() => togglePinned(quickBehavior.name)}
                            >
                              {quickBehavior.isPinned ? (
                                <IconPinFilled size={15} />
                              ) : (
                                <IconPin size={15} />
                              )}
                            </button>
                          </EditorTooltip>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                    <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">
                      {t("Quick Select order")}
                    </p>
                    <div className="space-y-1">
                      {orderedQuickSelects.map((quickBehavior, index) => (
                        <div
                          key={quickBehavior.id}
                          className="flex items-center gap-1 rounded px-1.5 py-1 text-xs hover:bg-[var(--color-border)]"
                        >
                          <span className="flex-1 truncate text-[var(--color-text)]">
                            {quickBehavior.displayName}
                          </span>
                          <button
                            type="button"
                            className="rounded p-1 text-[var(--color-text-muted)] disabled:opacity-30"
                            aria-label={t("Move up")}
                            disabled={index === 0}
                            onClick={() =>
                              moveQuickSelect(quickBehavior.name, -1)
                            }
                          >
                            <IconChevronUp size={15} />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-[var(--color-text-muted)] disabled:opacity-30"
                            aria-label={t("Move down")}
                            disabled={index === orderedQuickSelects.length - 1}
                            onClick={() =>
                              moveQuickSelect(quickBehavior.name, 1)
                            }
                          >
                            <IconChevronDown size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {!isSearching && (
              <div className="w-28 border-r border-[var(--color-border)] overflow-y-auto py-1 shrink-0">
                <button
                  type="button"
                  className={`w-full px-2 py-1.5 text-left text-xs transition-colors ${filterCategory === "all" ? "bg-[var(--color-electric)]/10 text-[var(--color-electric)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"}`}
                  onClick={() => updateCategory("all")}
                >
                  {t("All")}
                </button>
                {BEHAVIOR_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`w-full px-2 py-1.5 text-left text-xs transition-colors ${filterCategory === category.id ? "bg-[var(--color-electric)]/10 text-[var(--color-electric)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"}`}
                    onClick={() => updateCategory(category.id)}
                  >
                    {t(category.name)}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto py-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`w-full px-3 py-2 text-left transition-colors ${selectedBehaviorId === option.id ? "bg-[var(--color-electric)]/10" : "hover:bg-[var(--color-border)]"}`}
                    onClick={() => {
                      updateRecentBehaviors(option.id);
                      onSelect(option.id);
                      closeDropdown();
                    }}
                  >
                    <span className="block text-sm font-medium text-[var(--color-text)]">
                      {option.displayName}
                    </span>
                    {option.description && (
                      <span className="block text-xs text-[var(--color-text-muted)]">
                        {t(option.description)}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <p className="px-3 py-4 text-center text-xs text-[var(--color-text-muted)]">
                  {t("No behaviors found")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { BEHAVIOR_CATEGORIES };
export type { BehaviorOption };
