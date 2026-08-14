/**
 * Release notes data + helpers.
 *
 * The source of truth is {@link ./releaseNotes.json}. It is edited by hand in
 * PRs (add entries to the `upcoming` release) and by the release CI, which
 * rewrites the `upcoming` entry's version/date and prepends a fresh empty
 * `upcoming` on every release. See docs/RELEASE_GUIDE.md.
 *
 * The app derives the current shipped version from this data — there is no
 * separate version file — so a build always shows whatever the newest released
 * entry says.
 */
import data from "./releaseNotes.json";
import type { Language } from "./translations";
import { UPCOMING } from "../lib/releaseVersioning";

export { UPCOMING };

/** Change severity, ordered most- to least-significant for display. */
export type ChangeCategory = "major" | "minor" | "patch";

export const CHANGE_CATEGORIES: ChangeCategory[] = ["major", "minor", "patch"];

/** A piece of text authored in the supported languages. */
export interface LocalizedText {
  en: string;
  ja: string;
  zh?: string;
}

/** A single change entry, authored in both supported languages. */
export interface LocalizedChange extends LocalizedText {
  /**
   * Optional related pull request number(s) on GitHub. Rendered as links on
   * the release notes page. Accepts a single number or an array.
   */
  pr?: number | number[];
}

/**
 * Optional free-form summary shown above the categorized changes — a lead
 * sentence and a few headline highlights for the release.
 */
export interface ReleaseSummary {
  lead?: LocalizedText;
  highlights?: LocalizedText[];
}

/** GitHub repository the release notes link back to. */
export const GITHUB_REPO_URL = "https://github.com/cormoran/dya-studio";

/** Normalize a change's optional `pr` field to a list of PR numbers. */
export function prNumbers(change: LocalizedChange): number[] {
  if (change.pr == null) {
    return [];
  }
  return Array.isArray(change.pr) ? change.pr : [change.pr];
}

/** GitHub URL for a pull request number. */
export function pullRequestUrl(pr: number): string {
  return `${GITHUB_REPO_URL}/pull/${pr}`;
}

export interface Release {
  /** Semantic-ish version `YYYY.MM.DD.N`, or {@link UPCOMING}. */
  version: string;
  /** Release date `YYYY-MM-DD`, or `null` for the upcoming section. */
  date: string | null;
  /** Optional headline summary shown above the categorized changes. */
  summary?: ReleaseSummary;
  changes: Record<ChangeCategory, LocalizedChange[]>;
}

export interface ReleaseNotesData {
  releases: Release[];
}

const releaseNotes = data as ReleaseNotesData;

/** All releases, newest first, exactly as stored (upcoming may be first). */
export function getReleases(): Release[] {
  return releaseNotes.releases;
}

/** True when a release is the in-progress `upcoming` section. */
export function isUpcoming(release: Release): boolean {
  return release.version === UPCOMING;
}

/** True when a release has a non-empty summary (lead or highlights). */
export function hasSummary(release: Release): boolean {
  const s = release.summary;
  return !!s && (!!s.lead || (s.highlights?.length ?? 0) > 0);
}

/** True when a release has no summary and no change entries in any category. */
export function isEmptyRelease(release: Release): boolean {
  return (
    !hasSummary(release) &&
    CHANGE_CATEGORIES.every((c) => (release.changes[c]?.length ?? 0) === 0)
  );
}

/**
 * The newest actually-released version, or `null` if nothing has shipped yet
 * (only an `upcoming` section exists). Drives the version shown on the splash
 * screen link.
 */
export function getCurrentVersion(): string | null {
  const released = releaseNotes.releases.find((r) => !isUpcoming(r));
  return released ? released.version : null;
}

/** Pick the text of a localized value in the active language. */
export function localizeText(text: LocalizedText, language: Language): string {
  return text[language] || text.en;
}

/** Pick the text for a change in the active language. */
export function localizeChange(
  change: LocalizedChange,
  language: Language,
): string {
  return localizeText(change, language);
}
