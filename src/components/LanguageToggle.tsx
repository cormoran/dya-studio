import { IconLanguage } from "@tabler/icons-react";
import { useLanguage } from "../hooks/useLanguage";
import { languageLabels, type Language } from "../i18n/translations";

const LANGUAGE_CYCLE: Language[] = ["en", "ja", "zh"];

function nextLanguage(language: Language): Language {
  const index = LANGUAGE_CYCLE.indexOf(language);
  return LANGUAGE_CYCLE[(index === -1 ? 0 : index + 1) % LANGUAGE_CYCLE.length];
}

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const { language, toggleLanguage, t } = useLanguage();
  const upcoming = nextLanguage(language);

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`theme-toggle language-toggle ${className}`}
      aria-label={t("Switch language")}
      title={`${t("Language")}: ${languageLabels[language]} → ${languageLabels[upcoming]}`}
    >
      <IconLanguage size={18} />
      <span className="text-xs font-medium uppercase leading-none">
        {language}
      </span>
    </button>
  );
}
