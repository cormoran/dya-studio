/**
 * KeyboardKey Component
 * Displays a single key with its binding and modification status
 */
import * as Tooltip from "@radix-ui/react-tooltip";
import { getKeycodeLabel, type KeyBinding } from "../types/keymap";

interface KeyboardKeyProps {
  binding: KeyBinding;
  originalBinding: KeyBinding | null;
  isModified: boolean;
  label?: string;
  onClick: () => void;
  className?: string;
}

export function KeyboardKey({
  binding,
  originalBinding,
  isModified,
  label,
  onClick,
  className = "",
}: KeyboardKeyProps) {
  const currentLabel = label || getKeycodeLabel(binding);
  const originalLabel = originalBinding ? getKeycodeLabel(originalBinding) : null;

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            onClick={onClick}
            className={`
              w-12 h-12 rounded-lg flex items-center justify-center text-xs font-medium
              transition-all cursor-pointer
              ${
                isModified
                  ? "bg-[var(--color-electric)]/10 border-2 border-[var(--color-electric)]/50 text-[var(--color-electric)]"
                  : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
              }
              hover:border-[var(--color-electric)]/50 hover:bg-[var(--color-electric)]/5
              ${className}
            `}
          >
            {currentLabel}
          </button>
        </Tooltip.Trigger>
        {isModified && originalLabel && (
          <Tooltip.Portal>
            <Tooltip.Content
              className="px-3 py-2 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] shadow-lg z-50"
              sideOffset={5}
            >
              <div className="space-y-1">
                <div className="text-xs text-[var(--color-text-muted)]">
                  Original:
                </div>
                <div className="font-medium text-[var(--color-text)]">
                  {originalLabel}
                </div>
              </div>
              <Tooltip.Arrow className="fill-[var(--color-border)]" />
            </Tooltip.Content>
          </Tooltip.Portal>
        )}
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
