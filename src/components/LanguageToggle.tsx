import { useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { IconCheck, IconLanguage } from "@tabler/icons-react";
import { useLanguage } from "../hooks/useLanguage";
import { languageLabels } from "../i18n/translations";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const selectedRef = useRef<HTMLButtonElement>(null);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`theme-toggle min-w-11 min-h-11 ${className}`}
          aria-label={`${t("Language")}: ${languageLabels[language]}`}
          aria-haspopup="menu"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <IconLanguage size={18} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          role="menu"
          aria-label={t("Language")}
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-[60] min-w-40 max-w-[calc(100vw-16px)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1 shadow-xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            selectedRef.current?.focus();
          }}
          onKeyDown={(event) => {
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitemradio"]',
              ),
            );
            const index = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            let next: number;
            switch (event.key) {
              case "ArrowDown":
                next = (index + 1) % items.length;
                break;
              case "ArrowUp":
                next = (index - 1 + items.length) % items.length;
                break;
              case "Home":
                next = 0;
                break;
              case "End":
                next = items.length - 1;
                break;
              case "Tab":
                setOpen(false);
                return;
              default:
                return;
            }
            event.preventDefault();
            items[next]?.focus();
          }}
        >
          {Object.entries(languageLabels).map(([value, label]) => (
            <button
              key={value}
              ref={value === language ? selectedRef : undefined}
              type="button"
              role="menuitemradio"
              aria-checked={value === language}
              tabIndex={value === language ? 0 : -1}
              className="flex min-h-11 w-full items-center justify-between gap-6 rounded-md px-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-electric)]/10 focus:bg-[var(--color-electric)]/10 focus:outline-none"
              onClick={() => {
                if (value === "en" || value === "ja" || value === "zh") {
                  setLanguage(value);
                  setOpen(false);
                }
              }}
            >
              {label}
              {value === language && (
                <IconCheck
                  size={16}
                  className="text-[var(--color-electric)]"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
