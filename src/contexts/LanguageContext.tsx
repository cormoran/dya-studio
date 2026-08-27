import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type Language,
  type TranslationParams,
  translate,
} from "../i18n/translations";
import { LanguageContext } from "./language";

const STORAGE_KEY = "dya-studio-language";
const LANGUAGE_CYCLE: Language[] = ["en", "ja", "zh"];

function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "ja" || value === "zh";
}

function detectBrowserLanguage(): Language {
  const candidates =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    if (lower.startsWith("zh")) {
      return "zh";
    }
    if (lower.startsWith("ja")) {
      return "ja";
    }
  }

  return "en";
}

function getInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (isLanguage(stored)) {
    return stored;
  }

  return detectBrowserLanguage();
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((newLanguage: Language) => {
    localStorage.setItem(STORAGE_KEY, newLanguage);
    setLanguageState(newLanguage);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => {
      const index = LANGUAGE_CYCLE.indexOf(current);
      const next =
        LANGUAGE_CYCLE[(index === -1 ? 0 : index + 1) % LANGUAGE_CYCLE.length];
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams) =>
      translate(language, key, params),
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
