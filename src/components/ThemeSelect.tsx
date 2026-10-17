import { useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { IconCheck, IconPalette } from "@tabler/icons-react";
import { useTheme } from "../hooks/useTheme";
import { useLanguage } from "../hooks/useLanguage";
import { themeOptions } from "../themes/themes";

export function ThemeSelect({ fullWidth = false }: { fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const selectedRef = useRef<HTMLButtonElement>(null);
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const currentLabel = t(
    themeOptions.find(({ value }) => value === theme)!.label,
  );

  return (
    <div
      ref={fullWidth ? setPortalContainer : undefined}
      className={fullWidth ? "w-full" : "shrink-0"}
    >
      {fullWidth && <p className="text-sm mb-2">{t("Theme")}</p>}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="theme-toggle min-w-11 min-h-11"
            aria-label={t("Theme")}
            aria-haspopup="menu"
            title={`${t("Theme")}: ${currentLabel}`}
          >
            <IconPalette size={20} aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal container={fullWidth ? portalContainer : undefined}>
          <Popover.Content
            role="menu"
            aria-label={t("Theme")}
            align={fullWidth ? "start" : "end"}
            sideOffset={6}
            collisionPadding={12}
            className="z-[60] min-w-44 max-w-[calc(100vw-1.5rem)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 text-[var(--color-text)] shadow-xl"
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              setOpen(false);
            }}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              selectedRef.current?.focus();
            }}
            onKeyDown={(event) => {
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
                return;
              event.preventDefault();
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  '[role="menuitemradio"]',
                ),
              );
              const index = items.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        items.length) %
                      items.length;
              items[next]?.focus();
            }}
          >
            {themeOptions.map(({ value, label }) => (
              <button
                key={value}
                ref={value === theme ? selectedRef : undefined}
                type="button"
                role="menuitemradio"
                aria-checked={value === theme}
                tabIndex={value === theme ? 0 : -1}
                className="flex min-h-11 w-full items-center justify-between gap-6 rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-elevated)] focus-visible:bg-[var(--color-surface-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-electric)] focus-visible:-outline-offset-2"
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
              >
                {t(label)}
                {value === theme && <IconCheck size={18} aria-hidden="true" />}
              </button>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
