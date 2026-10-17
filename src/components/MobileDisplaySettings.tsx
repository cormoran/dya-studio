import { useId } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IconSettings, IconX } from "@tabler/icons-react";
import { useLanguage } from "../hooks/useLanguage";
import { ThemeSelect } from "./ThemeSelect";
import { languageLabels, type Language } from "../i18n/translations";

export function MobileDisplaySettings() {
  const { language, setLanguage, t } = useLanguage();
  const languageId = useId();

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="theme-toggle min-w-11 min-h-11"
          aria-label={t("Display settings")}
        >
          <IconSettings size={20} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest('[role="menu"]')
            ) {
              event.preventDefault();
            }
          }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xl z-50 p-4"
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <Dialog.Title className="text-lg font-medium">
              {t("Display settings")}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="theme-toggle min-w-11 min-h-11 shrink-0"
                aria-label={t("Close")}
              >
                <IconX size={20} />
              </button>
            </Dialog.Close>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor={languageId} className="block text-sm mb-2">
                {t("Language")}
              </label>
              <select
                id={languageId}
                className="select-field w-full min-w-0 min-h-11 text-base"
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as Language)
                }
              >
                {Object.entries(languageLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <ThemeSelect fullWidth />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
