/**
 * ResetVersionMenu
 *
 * Replaces the per-tab "Reset" button with a dropdown that groups every way to
 * move a tab back to a known state:
 *
 *   Reset to initial state   ← firmware defaults (with a short explanation)
 *   Discard                  ← drop unsaved edits (with a short explanation)
 *   ────────────────────────
 *   <captured versions, newest first>
 *
 * Picking a version doesn't write anything on its own — the caller opens the
 * diff modal so the user confirms first.
 */
import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconHistory, IconRestore } from "@tabler/icons-react";
import { useLanguage } from "../../hooks/useLanguage";
import {
  formatVersionAge,
  formatVersionTimestamp,
} from "../../lib/versionHistory";
import type { JsonValue, StoredSnapshot } from "../../lib/versionHistory";

export interface ResetMenuAction {
  /** Small explanation rendered under the option label. */
  description: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface ResetVersionMenuProps<T extends JsonValue = JsonValue> {
  /** Captured versions, newest first. */
  versions: StoredSnapshot<T>[];
  /** Called when a version is picked; the caller confirms via the diff modal. */
  onSelectVersion: (version: StoredSnapshot<T>) => void;
  /** "Reset to initial state" entry. Omit to hide it. */
  resetToDefault?: ResetMenuAction;
  /** "Discard" entry. Omit to hide it. */
  discard?: ResetMenuAction;
  /**
   * Trigger label. Defaults to "Reset"; tabs that have no reset or discard
   * action (their writes are persistent, with no memory tier) pass "Versions"
   * so the button says what the menu actually offers.
   */
  label?: string;
  /** Disables the trigger entirely (loading, disconnected, ...). */
  disabled?: boolean;
  /** Shows the trigger in a busy state (a capture or restore is running). */
  isBusy?: boolean;
}

export function ResetVersionMenu<T extends JsonValue = JsonValue>({
  versions,
  onSelectVersion,
  resetToDefault,
  discard,
  label,
  disabled = false,
  isBusy = false,
}: ResetVersionMenuProps<T>) {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const run = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="btn-ghost text-sm flex items-center gap-1.5"
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <IconRestore size={16} className={isBusy ? "animate-spin" : ""} />
        {label ?? t("Reset")}
        <IconChevronDown
          size={14}
          className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 w-72 max-h-96 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-xl py-1"
        >
          {resetToDefault && (
            <MenuAction
              label={t("Reset to initial state")}
              action={resetToDefault}
              onRun={run}
            />
          )}
          {discard && (
            <MenuAction label={t("Discard")} action={discard} onRun={run} />
          )}

          {(resetToDefault || discard) && (
            <div className="my-1 border-t border-[var(--color-border)]" />
          )}

          <div className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
            <IconHistory size={12} />
            {t("Saved versions")}
          </div>

          {versions.length === 0 ? (
            <p className="px-3 pb-2 text-xs text-[var(--color-text-muted)]">
              {t(
                "No versions saved yet. A version is saved each time this tab reads the keyboard and finds something changed.",
              )}
            </p>
          ) : (
            versions.map((version) => (
              <button
                key={version.id}
                type="button"
                role="menuitem"
                className="w-full text-left px-3 py-2 hover:bg-[var(--color-electric)]/10 transition-colors"
                onClick={() => run(() => onSelectVersion(version))}
              >
                <span className="block text-sm text-[var(--color-text)]">
                  {formatVersionTimestamp(version.timestamp, language)}
                </span>
                <span className="block text-[11px] text-[var(--color-text-muted)]">
                  {formatVersionAge(version.timestamp, language)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MenuAction({
  label,
  action,
  onRun,
}: {
  label: string;
  action: ResetMenuAction;
  onRun: (run: () => void) => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="w-full text-left px-3 py-2 hover:bg-[var(--color-electric)]/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
      onClick={() => onRun(action.onSelect)}
      disabled={action.disabled}
    >
      <span className="block text-sm text-[var(--color-text)]">{label}</span>
      <span className="block text-[11px] leading-snug text-[var(--color-text-muted)]">
        {action.description}
      </span>
    </button>
  );
}
