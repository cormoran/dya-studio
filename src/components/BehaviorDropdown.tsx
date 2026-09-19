/**
 * BehaviorDropdown Component
 *
 * Custom dropdown with quick-select buttons for common behaviors.
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import {
  getBehaviorMetadata,
  type BehaviorCategory,
} from "../lib/behaviorMetadata";
import type { BehaviorDefinition } from "../hooks/useKeymap";
import { EditorTooltip } from "./EditorTooltip";
import { useLanguage } from "../hooks/useLanguage";

// Predefined behavior categories
const BEHAVIOR_CATEGORIES: { id: BehaviorCategory; name: string }[] = [
  { id: "keypress", name: "Key Press" },
  { id: "layer", name: "Layers" },
  { id: "mod", name: "Modifiers" },
  { id: "mouse", name: "Mouse" },
  { id: "transport", name: "Transport" },
  { id: "system", name: "System" },
  { id: "miscellaneous", name: "Misc" },
  { id: "others", name: "Others" },
];

// Quick-select behaviors for faster access
const QUICK_SELECT_BEHAVIORS = ["kp", "lt", "mt", "none", "transparent"];

interface BehaviorOption {
  id: number;
  name: string;
  displayName: string;
  category: BehaviorCategory;
  description?: string;
}

interface BehaviorDropdownProps {
  compact?: boolean;
  behaviors: Map<number, BehaviorDefinition>;
  selectedBehaviorId: number | null;
  onSelect: (behaviorId: number) => void;
  onQuickSelect: (behaviorId: number) => void;
  quickSelects?: string[];
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
  const [isOpen, setIsOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<
    BehaviorCategory | "all"
  >("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Recently selected behaviors (persisted in sessionStorage)
  const [recentBehaviors, setRecentBehaviors] = useState<number[]>(() => {
    try {
      const saved = sessionStorage.getItem("recentBehaviors");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Build behavior options
  const behaviorOptions = useMemo((): BehaviorOption[] => {
    const allOptions: BehaviorOption[] = [];
    behaviors.forEach((behavior, id) => {
      const metadata = getBehaviorMetadata(behavior.displayName);
      const category = metadata?.category || "others";
      allOptions.push({
        id,
        name: behavior.displayName,
        displayName:
          metadata?.displayNameVariants?.at(0) || behavior.displayName,
        category,
        description: metadata?.description,
      });
    });
    return allOptions.sort((a, b) => {
      const catA = BEHAVIOR_CATEGORIES.findIndex((c) => c.id === a.category);
      const catB = BEHAVIOR_CATEGORIES.findIndex((c) => c.id === b.category);
      if (catA !== catB) return catA - catB;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [behaviors]);

  // Filtered options
  const filteredOptions = useMemo(() => {
    if (filterCategory === "all") return behaviorOptions;
    return behaviorOptions.filter((opt) => opt.category === filterCategory);
  }, [behaviorOptions, filterCategory]);

  // Update recent behaviors when selection changes
  const updateRecentBehaviors = (behaviorId: number) => {
    setRecentBehaviors((prev) => {
      // Remove if already exists, then add to front
      const filtered = prev.filter((id) => id !== behaviorId);
      const updated = [behaviorId, ...filtered].slice(0, 2); // Keep only 2 most recent
      try {
        sessionStorage.setItem("recentBehaviors", JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  };

  // Quick select behaviors (predefined + recent)
  const quickSelectBehaviors = useMemo(() => {
    const predefined = (quickSelects || QUICK_SELECT_BEHAVIORS)
      .map((name) => {
        const metadata = getBehaviorMetadata(name);
        if (!metadata) return null;
        const behavior = Array.from(behaviors.values()).find((b) =>
          metadata.displayNameVariants.includes(b.displayName),
        );
        return behavior
          ? {
              id: behavior.id,
              name,
              displayName:
                metadata.displayNameVariants.at(0) || behavior.displayName,
              isRecent: false,
            }
          : null;
      })
      .filter(Boolean) as {
      id: number;
      name: string;
      displayName: string;
      isRecent: boolean;
    }[];

    // Add recent behaviors that aren't already in predefined
    const predefinedIds = new Set(predefined.map((b) => b.id));
    const recent = recentBehaviors
      .filter((id) => !predefinedIds.has(id) && behaviors.has(id))
      .map((id) => {
        const behavior = behaviors.get(id)!;
        const metadata = getBehaviorMetadata(behavior.displayName);
        return {
          id,
          name: behavior.displayName,
          displayName:
            metadata?.displayNameVariants?.at(0) || behavior.displayName,
          isRecent: true,
        };
      });

    return [...predefined, ...recent];
  }, [behaviors, recentBehaviors, quickSelects]);

  // Current selection display
  const selectedBehavior =
    selectedBehaviorId !== null ? behaviors.get(selectedBehaviorId) : null;
  const selectedBehaviorOverrideMeta = selectedBehavior
    ? getBehaviorMetadata(selectedBehavior.displayName)
    : null;

  return (
    <div
      className={`relative ${compact ? "flex items-center gap-1" : ""}`}
      ref={dropdownRef}
    >
      {/* Main Row: Dropdown + Quick Select */}
      {/* Dropdown Trigger */}
      <button
        className={`${compact ? "shrink-0 max-w-[40%] px-2 py-1" : "w-full px-3 py-1.5"} flex items-center justify-between gap-1 rounded bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-electric)]/50 transition-colors`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          className={`${compact ? "text-xs truncate" : "text-sm"} text-[var(--color-text)]`}
        >
          {selectedBehaviorOverrideMeta?.displayNameVariants?.at(0) ||
            t("Select behavior")}
          {!compact && selectedBehaviorOverrideMeta?.description && (
            <span className="mx-1 text-xs text-[var(--color-text-muted)]">
              - {t(selectedBehaviorOverrideMeta.description)}
            </span>
          )}
        </span>
        <IconChevronDown
          size={16}
          className={`text-[var(--color-text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Quick Select Buttons with label (moved to bottom) */}
      <div
        className={`items-center gap-1 overflow-x-auto flex ${compact ? "min-w-0" : "mt-2 pl-2"}`}
      >
        <span
          className={`${compact ? "sr-only" : "text-xs text-[var(--color-text-muted)] mr-1 flex-shrink-0"}`}
        >
          {t("Quick Select")}:
        </span>
        {quickSelectBehaviors.map((qb) => (
          <EditorTooltip
            key={qb.id}
            content={
              <>
                <div className="font-medium">{qb.displayName}</div>
                <div>
                  {t(
                    getBehaviorMetadata(qb.name)?.description ??
                      "Select this behavior",
                  )}
                </div>
                {qb.isRecent && (
                  <div className="mt-1 text-[var(--color-text-muted)]">
                    {t("Recently used")}
                  </div>
                )}
              </>
            }
          >
            <button
              className={`${compact ? "px-2 py-1 rounded" : "px-3 py-1.5 rounded-lg"} text-xs font-medium transition-colors flex-shrink-0 ${
                selectedBehaviorId === qb.id
                  ? "bg-[var(--color-electric)]/20 text-[var(--color-electric)] border border-[var(--color-electric)]"
                  : qb.isRecent
                    ? "bg-[var(--color-neon)]/10 text-[var(--color-neon)] border border-[var(--color-neon)]/30 hover:border-[var(--color-neon)]"
                    : "bg-[var(--color-border)] text-[var(--color-text-secondary)] border border-transparent hover:border-[var(--color-electric)]/50"
              }`}
              onClick={() => {
                updateRecentBehaviors(qb.id);
                onQuickSelect(qb.id);
              }}
            >
              {qb.displayName}
            </button>
          </EditorTooltip>
        ))}
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl z-10 max-h-80 overflow-hidden flex">
          {/* Category Filter */}
          <div className="w-28 border-r border-[var(--color-border)] overflow-y-auto py-1">
            <button
              className={`w-full px-2 py-1.5 text-left text-xs transition-colors ${
                filterCategory === "all"
                  ? "bg-[var(--color-electric)]/10 text-[var(--color-electric)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
              }`}
              onClick={() => setFilterCategory("all")}
            >
              {t("All")}
            </button>
            {BEHAVIOR_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`w-full px-2 py-1.5 text-left text-xs transition-colors ${
                  filterCategory === cat.id
                    ? "bg-[var(--color-electric)]/10 text-[var(--color-electric)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                }`}
                onClick={() => setFilterCategory(cat.id)}
              >
                {t(cat.name)}
              </button>
            ))}
          </div>

          {/* Behavior List */}
          <div className="flex-1 overflow-y-auto py-1">
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                className={`w-full px-3 py-2 text-left transition-colors ${
                  selectedBehaviorId === option.id
                    ? "bg-[var(--color-electric)]/10"
                    : "hover:bg-[var(--color-border)]"
                }`}
                onClick={() => {
                  updateRecentBehaviors(option.id);
                  onSelect(option.id);
                  setIsOpen(false);
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { BEHAVIOR_CATEGORIES };
export type { BehaviorOption };
