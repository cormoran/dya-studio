import type { ReactElement, ReactNode } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

/** Shared help for editor controls, including unavailable navigation buttons. */
export function EditorTooltip({
  content,
  children,
}: {
  content: ReactNode;
  children: ReactElement<{ disabled?: boolean }>;
}) {
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {children.props.disabled ? (
            <span className="inline-flex shrink-0">{children}</span>
          ) : (
            children
          )}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            sideOffset={6}
            collisionPadding={8}
            className="z-[100] max-w-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text)] shadow-lg"
          >
            {content}
            <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
