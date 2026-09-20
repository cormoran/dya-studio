import { EditorTooltip } from "./EditorTooltip";
import { IconInfoCircle } from "@tabler/icons-react";
import { useLanguage } from "../hooks/useLanguage";

/** A single section of a DocTip: an optional heading plus body text and/or bullets. */
export interface DocTipSection {
  heading?: string;
  body?: string;
  bullets?: string[];
}

/** Structured, lightly formatted documentation shown inside a DocTip. */
export interface DocTipContent {
  title: string;
  intro?: string;
  sections?: DocTipSection[];
}

interface DocTipProps {
  /** Structured content (already translated). */
  content: DocTipContent;
}

/**
 * Info icon that reveals a small, section-formatted document on hover/focus.
 *
 * Unlike {@link InfoTip}, which shows a single line of text, DocTip renders a
 * titled mini-doc with intro copy, section headings and bullet lists — handy
 * for explaining a whole feature next to a card header. Clicking the icon
 * focuses it, which keeps the doc pinned open until focus moves away.
 */
export function DocTip({ content }: DocTipProps) {
  const { t } = useLanguage();
  return (
    <EditorTooltip
      tapToOpen
      content={
        <>
          <div className="space-y-2.5 text-xs leading-relaxed">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {content.title}
            </p>
            {content.intro && (
              <p className="text-[var(--color-text-secondary)]">
                {content.intro}
              </p>
            )}
            {content.sections?.map((section, i) => (
              <div
                key={i}
                className="pt-2 border-t border-[var(--color-border)] space-y-1"
              >
                {section.heading && (
                  <p className="font-semibold uppercase tracking-wide text-[10px] text-[var(--color-text-muted)]">
                    {section.heading}
                  </p>
                )}
                {section.body && (
                  <p className="text-[var(--color-text-secondary)]">
                    {section.body}
                  </p>
                )}
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="space-y-1 text-[var(--color-text-secondary)]">
                    {section.bullets.map((bullet, j) => (
                      <li key={j} className="flex gap-1.5">
                        <span
                          aria-hidden
                          className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-electric)]"
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      }
    >
      <button
        type="button"
        className="inline-flex items-center p-px opacity-60 hover:opacity-100 transition-opacity cursor-pointer align-middle text-[var(--color-text-secondary)]"
        aria-label={t("More info")}
      >
        <IconInfoCircle size={14} />
      </button>
    </EditorTooltip>
  );
}
