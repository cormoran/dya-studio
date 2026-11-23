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

function readStoredLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ignore storage errors in restricted contexts.
  }
}

function getInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = readStoredLanguage();
  if (stored) {
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
    writeStoredLanguage(newLanguage);
    setLanguageState(newLanguage);
  }, []);

  const toggleLanguage = useCallback(() => {
    const index = LANGUAGE_CYCLE.indexOf(language);
    const next =
      LANGUAGE_CYCLE[(index === -1 ? 0 : index + 1) % LANGUAGE_CYCLE.length];
    writeStoredLanguage(next);
    setLanguageState(next);
  }, [language]);

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
