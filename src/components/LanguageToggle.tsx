import { IconLanguage } from "@tabler/icons-react";
import { useLanguage } from "../hooks/useLanguage";
import { languageLabels, type Language } from "../i18n/translations";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <IconLanguage
        size={18}
        className="pointer-events-none absolute left-3 text-[var(--color-text-secondary)]"
        aria-hidden="true"
      />
      <select
        className="select-field language-select h-10 cursor-pointer"
        aria-label={t("Language")}
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
      >
        {Object.entries(languageLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
