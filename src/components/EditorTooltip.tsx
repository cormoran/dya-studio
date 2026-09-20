import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

/** Shared help for editor controls, including unavailable navigation buttons. */
export function EditorTooltip({
  content,
  children,
  tapToOpen = false,
}: {
  content: ReactNode;
  children: ReactElement<{ disabled?: boolean }>;
  tapToOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const origin = useRef<{ x: number; y: number } | undefined>(undefined);
  const held = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const cancel = () => {
    clearTimeout(timer.current);
    origin.current = undefined;
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: Event) => {
      if (
        event.target instanceof Node &&
        contentRef.current?.contains(event.target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <span
          className="contents"
          onPointerDownCapture={(event) => {
            cancel();
            held.current = false;
            if (event.pointerType !== "touch") return;
            origin.current = { x: event.clientX, y: event.clientY };
            timer.current = setTimeout(() => {
              held.current = true;
              setOpen(true);
            }, 500);
          }}
          onPointerMoveCapture={(event) => {
            if (
              origin.current &&
              Math.hypot(
                event.clientX - origin.current.x,
                event.clientY - origin.current.y,
              ) > 10
            ) {
              cancel();
              setOpen(false);
            }
          }}
          onPointerUpCapture={cancel}
          onPointerCancelCapture={() => {
            cancel();
            setOpen(false);
          }}
          onClickCapture={(event) => {
            if (!held.current && !tapToOpen) return;
            event.preventDefault();
            event.stopPropagation();
            if (!held.current && tapToOpen) setOpen(true);
            held.current = false;
          }}
          onContextMenu={(event) => {
            if (origin.current || held.current) event.preventDefault();
          }}
        >
          <Tooltip.Trigger asChild>
            {children.props.disabled ? (
              <span className="inline-flex shrink-0">{children}</span>
            ) : (
              children
            )}
          </Tooltip.Trigger>
        </span>
        <Tooltip.Portal>
          <Tooltip.Content
            ref={contentRef}
            side="bottom"
            sideOffset={6}
            collisionPadding={8}
            className="z-[100] max-w-[min(20rem,calc(100vw-16px))] max-h-[var(--radix-tooltip-content-available-height)] overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text)] shadow-lg"
          >
            {content}
            <Tooltip.Arrow className="fill-[var(--color-surface-elevated)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
