import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronDown,
  IconChevronRight,
  IconLink,
  IconMenu2,
  IconPhoto,
} from "@tabler/icons-react";
import type { MouseEvent, ReactNode } from "react";
import { useLanguage } from "../../hooks/useLanguage";
import type {
  DeveloperGuideLink,
  DeveloperGuideNavigationItem,
  DeveloperGuidePageDefinition,
  DeveloperGuideSection,
} from "./types";

export type { DeveloperGuidePageDefinition } from "./types";

function GuideLink({
  link,
  className,
  children,
}: {
  link: DeveloperGuideLink;
  className?: string;
  children: ReactNode;
}) {
  if (link.onClick) {
    return (
      <button type="button" onClick={link.onClick} className={className}>
        {children}
      </button>
    );
  }

  return (
    <a href={link.href ?? "#"} className={className}>
      {children}
    </a>
  );
}

function NavigationItems({
  items,
  activeId,
  depth = 0,
}: {
  items: DeveloperGuideNavigationItem[];
  activeId?: string;
  depth?: number;
}) {
  return (
    <ul className={depth === 0 ? "space-y-1" : "mt-1 space-y-1 pl-3"}>
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <li key={item.id}>
            <a
              href={item.href ?? `#${item.id}`}
              aria-current={active ? "page" : undefined}
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-[var(--color-electric)]/10 font-medium text-[var(--color-electric)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)]"
              }`}
            >
              {item.label}
            </a>
            {item.items && (
              <NavigationItems
                items={item.items}
                activeId={activeId}
                depth={depth + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function findNavigationLabel(
  items: DeveloperGuideNavigationItem[],
  activeId?: string,
): string | undefined {
  for (const item of items) {
    if (item.id === activeId) return item.label;

    const nestedLabel = item.items
      ? findNavigationLabel(item.items, activeId)
      : undefined;
    if (nestedLabel) return nestedLabel;
  }

  return undefined;
}

function Section({ section }: { section: DeveloperGuideSection }) {
  switch (section.type) {
    case "paragraph":
      return (
        <p className="text-sm leading-7 text-[var(--color-text-secondary)]">
          {section.content}
        </p>
      );
    case "heading": {
      const Tag = section.level === 3 ? "h3" : "h2";
      return (
        <Tag
          id={section.id}
          className={`group scroll-mt-6 font-semibold text-[var(--color-text)] ${
            section.level === 3 ? "pt-2 text-base" : "pt-5 text-xl"
          }`}
        >
          <a
            href={`#${section.id}`}
            className="inline-flex items-center gap-2 hover:text-[var(--color-electric)]"
            aria-label={section.title}
          >
            <span>
              {section.number && `${section.number}. `}
              {section.title}
            </span>
            <IconLink
              size={16}
              className="text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              aria-hidden="true"
            />
          </a>
        </Tag>
      );
    }
    case "list": {
      const Tag = section.ordered ? "ol" : "ul";
      return (
        <Tag
          className={`space-y-2 pl-5 text-sm leading-6 text-[var(--color-text-secondary)] ${
            section.ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {section.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </Tag>
      );
    }
    case "callout": {
      const tone =
        section.tone === "warning"
          ? "border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10"
          : section.tone === "success"
            ? "border-[var(--color-neon)]/40 bg-[var(--color-neon)]/10"
            : "border-[var(--color-electric)]/40 bg-[var(--color-electric)]/10";
      return (
        <aside className={`rounded-lg border p-4 ${tone}`}>
          {section.title && (
            <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">
              {section.title}
            </h3>
          )}
          <div className="text-sm leading-6 text-[var(--color-text-secondary)]">
            {section.content}
          </div>
        </aside>
      );
    }
    case "code":
      return (
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
          {(section.title || section.language) && (
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)]">
              <span>{section.title}</span>
              <span className="font-mono">{section.language}</span>
            </div>
          )}
          <pre className="overflow-x-auto p-4 text-xs leading-6 text-[var(--color-text-secondary)]">
            <code>{section.code}</code>
          </pre>
        </div>
      );
    case "table":
      return (
        <figure className="overflow-hidden rounded-lg border border-[var(--color-border)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-elevated)] text-xs text-[var(--color-text-secondary)]">
                <tr>
                  {section.table.headers.map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-4 py-3 font-medium"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {section.table.rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-3 align-top leading-6 text-[var(--color-text-secondary)]"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {section.caption && (
            <figcaption className="border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)]">
              {section.caption}
            </figcaption>
          )}
        </figure>
      );
    case "image":
      return (
        <figure className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          {section.src ? (
            <img
              src={section.src}
              alt={section.alt}
              className="h-80 w-full object-cover object-top tablet:h-96"
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-[var(--color-surface-elevated)] p-6 text-center text-[var(--color-text-muted)]">
              <IconPhoto size={28} aria-hidden="true" />
              <span className="text-sm font-medium">
                {section.placeholderLabel ?? "Screenshot placeholder"}
              </span>
              <span className="max-w-md text-xs leading-5">{section.alt}</span>
            </div>
          )}
          {section.caption && (
            <figcaption className="px-4 py-3 text-xs leading-5 text-[var(--color-text-muted)]">
              {section.caption}
            </figcaption>
          )}
        </figure>
      );
    case "flow":
      return (
        <figure className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          {section.title && (
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">
              {section.title}
            </h3>
          )}
          <ol className="flex flex-col gap-2 tablet:flex-row tablet:items-stretch">
            {section.steps.map((step, index) => (
              <li
                key={step}
                className="flex flex-1 items-center gap-2 tablet:gap-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-electric)]/10 text-xs font-semibold text-[var(--color-electric)]">
                  {index + 1}
                </span>
                <span className="text-sm leading-5 text-[var(--color-text-secondary)]">
                  {step}
                </span>
                {index < section.steps.length - 1 && (
                  <IconChevronRight
                    size={16}
                    className="ml-auto hidden shrink-0 text-[var(--color-text-muted)] tablet:block"
                    aria-hidden="true"
                  />
                )}
              </li>
            ))}
          </ol>
          {section.description && (
            <figcaption className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
              {section.description}
            </figcaption>
          )}
        </figure>
      );
    case "features":
      return (
        <div className="grid gap-3 tablet:grid-cols-2">
          {section.cards.map((card) => (
            <article key={card.title} className="glass-card p-4">
              <div className="mb-3 flex items-start gap-3">
                {card.icon && (
                  <span className="rounded-md bg-[var(--color-electric)]/10 p-2 text-[var(--color-electric)]">
                    {card.icon}
                  </span>
                )}
                <div>
                  {card.eyebrow && (
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--color-electric)]">
                      {card.eyebrow}
                    </p>
                  )}
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">
                    {card.title}
                  </h3>
                </div>
              </div>
              <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      );
    case "levels":
      return (
        <div className="grid gap-3 tablet:grid-cols-3">
          {section.cards.map((card) => (
            <article
              key={card.level}
              className={`rounded-lg border p-4 ${
                card.current
                  ? "border-[var(--color-electric)]/50 bg-[var(--color-electric)]/5"
                  : "border-[var(--color-border)] bg-[var(--color-surface)]"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-electric)]">
                {card.level}
              </p>
              <h3 className="mt-1 text-base font-semibold text-[var(--color-text)]">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {card.description}
              </p>
              <ul className="mt-3 space-y-1.5 text-xs leading-5 text-[var(--color-text-muted)]">
                {card.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span
                      className="text-[var(--color-neon)]"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      );
  }
}

/** A connection-free, static layout for the developer documentation routes. */
export function DeveloperGuidePage({
  page,
}: {
  page: DeveloperGuidePageDefinition;
}) {
  const { language, setLanguage } = useLanguage();
  const guideLabel = language === "en" ? "Developer guide" : "開発者ガイド";
  const onThisPageLabel =
    language === "en" ? "On this page" : "このページの内容";
  const menuLabel = language === "en" ? "Menu" : "メニュー";
  const activeNavigationLabel =
    findNavigationLabel(page.navigation, page.activeNavigationId) ?? guideLabel;
  const breadcrumbs = [
    { label: guideLabel, href: "/developer-guide" },
    ...(page.breadcrumbs ?? []),
  ];
  const headings = page.sections.filter(
    (section): section is Extract<DeveloperGuideSection, { type: "heading" }> =>
      section.type === "heading",
  );
  const handleGuideNavigation = (event: MouseEvent<HTMLElement>) => {
    const link = (event.target as Element | null)?.closest("a[href]");
    const href = link?.getAttribute("href");
    if (!href?.startsWith("/developer-guide")) return;

    event.preventDefault();
    link?.closest("details")?.removeAttribute("open");
    window.scrollTo(0, 0);
    window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div
      className="min-h-full bg-[var(--color-bg)]"
      onClickCapture={handleGuideNavigation}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 tablet:flex-row tablet:items-start tablet:p-6">
        <aside className="shrink-0 tablet:sticky tablet:top-6 tablet:w-56">
          <details className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] tablet:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
              <IconMenu2
                size={20}
                className="shrink-0 text-[var(--color-electric)]"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {guideLabel}
                </span>
                <span className="block truncate text-sm font-medium text-[var(--color-text)]">
                  {activeNavigationLabel}
                </span>
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {menuLabel}
              </span>
              <IconChevronDown
                size={18}
                className="shrink-0 text-[var(--color-text-muted)] transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <nav
              aria-label={guideLabel}
              className="border-t border-[var(--color-border)] p-2"
            >
              <NavigationItems
                items={page.navigation}
                activeId={page.activeNavigationId}
              />
            </nav>
          </details>
          <nav
            aria-label={guideLabel}
            className="hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 tablet:block"
          >
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {guideLabel}
            </p>
            <NavigationItems
              items={page.navigation}
              activeId={page.activeNavigationId}
            />
          </nav>
          {headings.length > 0 && (
            <nav
              aria-label={onThisPageLabel}
              className="mt-4 hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 tablet:block"
            >
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {onThisPageLabel}
              </p>
              <ul className="space-y-1">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      className="block rounded-md px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-electric)]"
                    >
                      {heading.number && `${heading.number}. `}
                      {heading.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>

        <main className="min-w-0 flex-1 pb-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex flex-wrap items-center gap-1 text-xs text-[var(--color-text-muted)]"
          >
            {breadcrumbs.map((crumb, index) => (
              <span
                key={`${crumb.label}-${index}`}
                className="flex items-center gap-1"
              >
                {index > 0 && <IconChevronRight size={13} aria-hidden="true" />}
                {crumb.href && index < breadcrumbs.length - 1 ? (
                  <a
                    className="hover:text-[var(--color-electric)]"
                    href={crumb.href}
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span
                    aria-current={
                      index === breadcrumbs.length - 1 ? "page" : undefined
                    }
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>

          <header className="mb-10 border-t border-[var(--color-border)] pt-6">
            <div className="mb-4 flex justify-end gap-1 text-xs">
              {(["ja", "en"] as const).map((locale) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => setLanguage(locale)}
                  className={`rounded px-2 py-1 ${language === locale ? "bg-[var(--color-electric)]/10 text-[var(--color-electric)]" : "text-[var(--color-text-muted)]"}`}
                >
                  {locale === "ja" ? "日本語" : "English"}
                </button>
              ))}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)] tablet:text-3xl">
              {page.title}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)]">
              {page.description}
            </p>
          </header>

          <div className="flex flex-col gap-5">
            {page.sections.map((section, index) => (
              <Section
                key={section.type === "heading" ? section.id : index}
                section={section}
              />
            ))}
          </div>

          {headings.length > 0 && (
            <nav
              aria-label={onThisPageLabel}
              className="mt-8 rounded-lg bg-[var(--color-surface-elevated)] p-4 tablet:hidden"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {onThisPageLabel}
              </p>
              <ul className="space-y-1">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      className="text-sm text-[var(--color-electric)]"
                    >
                      {heading.number && `${heading.number}. `}
                      {heading.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {(page.previous || page.next) && (
            <nav
              aria-label="Page navigation"
              className="mt-10 flex gap-3 border-t border-[var(--color-border)] pt-5"
            >
              {page.previous && (
                <GuideLink
                  link={page.previous}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-3 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-electric)]/50 hover:text-[var(--color-electric)]"
                >
                  <IconArrowLeft size={16} aria-hidden="true" />
                  <span className="truncate">{page.previous.label}</span>
                </GuideLink>
              )}
              {page.next && (
                <GuideLink
                  link={page.next}
                  className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 rounded-lg border border-[var(--color-border)] px-4 py-3 text-right text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-electric)]/50 hover:text-[var(--color-electric)]"
                >
                  <span className="truncate">{page.next.label}</span>
                  <IconArrowRight size={16} aria-hidden="true" />
                </GuideLink>
              )}
            </nav>
          )}
        </main>
      </div>
    </div>
  );
}
