/**
 * Version history — timestamp rendering for the version list.
 *
 * Versions are identified to the user purely by when they were captured, so
 * both the absolute stamp (which version is which) and a relative hint (how
 * old it is) matter. Both follow the app's language toggle.
 */
import type { Language } from "../../i18n/translations";

const LOCALES: Record<Language, string> = { en: "en-US", ja: "ja-JP" };

/** Absolute capture time, e.g. `Jul 27, 2026, 11:39 PM`. */
export function formatVersionTimestamp(
  timestamp: number,
  language: Language,
): string {
  return new Intl.DateTimeFormat(LOCALES[language], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/** Relative capture time, e.g. `3 minutes ago`. */
export function formatVersionAge(
  timestamp: number,
  language: Language,
  now: number = Date.now(),
): string {
  const format = new Intl.RelativeTimeFormat(LOCALES[language], {
    numeric: "auto",
  });
  const elapsed = timestamp - now;
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return format.format(Math.round(elapsed / ms), unit);
    }
  }
  return format.format(Math.round(elapsed / 1000), "second");
}
