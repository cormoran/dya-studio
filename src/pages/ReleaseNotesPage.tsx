import { useEffect } from "react";
import { IconArrowLeft, IconSparkles, IconTag } from "@tabler/icons-react";
import DyaLogo from "../assets/dya.svg?react";
import { useLanguage } from "../hooks/useLanguage";
import { LanguageToggle } from "../components/LanguageToggle";
import {
  CHANGE_CATEGORIES,
  getReleases,
  hasSummary,
  isEmptyRelease,
  isUpcoming,
  localizeChange,
  localizeText,
  prNumbers,
  pullRequestUrl,
  type ChangeCategory,
  type LocalizedChange,
  type Release,
} from "../i18n/releaseNotes";

/** Route path for the standalone release notes page. */
export const RELEASE_NOTES_PATH = "/release-notes";

const CATEGORY_LABEL: Record<ChangeCategory, string> = {
  major: "Major",
  minor: "Minor",
  patch: "Patch",
};

const CATEGORY_ACCENT: Record<ChangeCategory, string> = {
  major: "var(--color-electric)",
  minor: "var(--color-neon)",
  patch: "var(--color-cyber)",
};

/** Renders the optional PR reference(s) for a change as GitHub links. */
function PrLinks({ change }: { change: LocalizedChange }) {
  const prs = prNumbers(change);
  if (prs.length === 0) {
    return null;
  }
  return (
    <>
      {prs.map((pr) => (
        <a
          key={pr}
          href={pullRequestUrl(pr)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1.5 align-baseline text-xs text-[var(--color-electric)] hover:text-[var(--color-neon)] hover:underline whitespace-nowrap"
          title={`Pull request #${pr}`}
        >
          #{pr}
        </a>
      ))}
    </>
  );
}

function CategoryGroup({
  category,
  release,
}: {
  category: ChangeCategory;
  release: Release;
}) {
  const { language, t } = useLanguage();
  const changes = release.changes[category] ?? [];
  if (changes.length === 0) {
    return null;
  }
  const accent = CATEGORY_ACCENT[category];
  return (
    <div className="mb-4 last:mb-0">
      <span
        className="inline-block text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full mb-2"
        style={{
          color: accent,
          backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
        }}
      >
        {t(CATEGORY_LABEL[category])}
      </span>
      <ul className="list-disc pl-5 space-y-1.5">
        {changes.map((change, i) => (
          <li
            key={i}
            className="text-sm text-[var(--color-text-secondary)] leading-relaxed"
          >
            {localizeChange(change, language)}
            <PrLinks change={change} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Headline summary block shown above the categorized changes. */
function SummaryBlock({ release }: { release: Release }) {
  const { language } = useLanguage();
  if (!hasSummary(release)) {
    return null;
  }
  const { lead, highlights } = release.summary!;
  return (
    <div className="mb-6 rounded-lg border border-[var(--color-electric)]/25 bg-[var(--color-electric)]/5 p-4">
      {lead && (
        <p className="text-[15px] font-medium text-[var(--color-text)] leading-relaxed flex items-start gap-2">
          <IconSparkles
            size={18}
            className="text-[var(--color-electric)] mt-0.5 flex-shrink-0"
          />
          <span>{localizeText(lead, language)}</span>
        </p>
      )}
      {highlights && highlights.length > 0 && (
        <ul className="mt-3 space-y-1.5 list-disc pl-5">
          {highlights.map((h, i) => (
            <li
              key={i}
              className="text-sm text-[var(--color-text-secondary)] leading-relaxed"
            >
              {localizeText(h, language)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReleaseSection({ release }: { release: Release }) {
  const { t } = useLanguage();
  const upcoming = isUpcoming(release);
  const empty = isEmptyRelease(release);
  return (
    <section
      id={release.version}
      className="glass-card p-5 mb-6 scroll-mt-6 last:mb-0"
    >
      <div className="flex items-baseline gap-3 mb-4 flex-wrap">
        <h2 className="text-lg font-medium text-[var(--color-text)] flex items-center gap-2">
          <IconTag size={18} className="text-[var(--color-electric)]" />
          {upcoming ? t("Upcoming") : release.version}
        </h2>
        {release.date && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {release.date}
          </span>
        )}
      </div>
      {empty ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          {upcoming
            ? t("No upcoming changes yet.")
            : t("No changes recorded for this release.")}
        </p>
      ) : (
        <>
          <SummaryBlock release={release} />
          {CHANGE_CATEGORIES.map((category) => (
            <CategoryGroup
              key={category}
              category={category}
              release={release}
            />
          ))}
        </>
      )}
    </section>
  );
}

/**
 * Standalone, connection-independent release notes page served at
 * {@link RELEASE_NOTES_PATH}. Each release renders with `id={version}` so the
 * release CI's GitHub Release can deep-link to `#<version>`.
 */
export function ReleaseNotesPage({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const releases = getReleases();

  // Deep links (e.g. #2026.04.01.0) — scroll the target into view once the
  // sections have rendered client-side.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (hash) {
      document.getElementById(hash)?.scrollIntoView({ block: "start" });
    }
  }, []);

  return (
    <div className="fixed inset-0 z-40 overflow-auto bg-[var(--color-bg)]">
      <div className="absolute inset-0 bg-gradient-cyber opacity-20 pointer-events-none" />

      {/* Top bar: brand on the left (mirrors the app header), controls right */}
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <DyaLogo className="w-8 h-8 [&_polygon]:fill-[var(--color-text)]" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-light tracking-widest text-[var(--color-text)]">
                DYA
              </span>
              <span className="text-xs font-light tracking-wider text-[var(--color-text-muted)] uppercase pt-1">
                Studio
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label={t("Back")}
              className="btn-ghost border border-[var(--color-border)] flex items-center gap-2 text-sm"
            >
              <IconArrowLeft size={18} />
              <span className="hidden sm:inline">{t("Back")}</span>
            </button>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <div className="relative max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-light tracking-wide text-[var(--color-text)]">
            {t("Release Notes")}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {t("What's new in DYA Studio")}
          </p>
        </div>

        {releases.map((release) => (
          <ReleaseSection key={release.version} release={release} />
        ))}
      </div>
    </div>
  );
}
