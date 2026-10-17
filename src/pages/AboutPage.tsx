import type { MouseEvent } from "react";
import { LanguageToggle } from "../components/LanguageToggle";
import { ThemeSelect } from "../components/ThemeSelect";
import { aboutContent } from "../content/about";
import { useLanguage } from "../hooks/useLanguage";
import dya2Image from "../assets/dya2/dya2.jpeg";

function navigate(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  window.history.pushState(null, "", event.currentTarget.getAttribute("href"));
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

const linkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-electric)]";

export function AboutPage() {
  const { language } = useLanguage();
  const copy = aboutContent[language];
  return (
    <div className="min-h-full overflow-y-auto bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-3">
          <a href="/" onClick={navigate} className={linkClass}>
            DYA STUDIO
          </a>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeSelect />
          </div>
        </header>
        <main className="space-y-10 pb-8">
          <section aria-labelledby="about-title">
            <p className="mb-3 text-sm text-[var(--color-text-muted)]">
              {copy.aboutLabel}
            </p>
            <h1
              id="about-title"
              className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl"
            >
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--color-text-secondary)]">
              {copy.description}
            </p>
            <nav
              aria-label={copy.startTitle}
              className="mt-6 flex flex-wrap gap-3"
            >
              <a href="/" onClick={navigate} className={linkClass}>
                {copy.connect}
              </a>
              <a
                href="/developer-guide"
                onClick={navigate}
                className={linkClass}
              >
                {copy.guide}
              </a>
              <a href="/release-notes" onClick={navigate} className={linkClass}>
                {copy.releases}
              </a>
            </nav>
          </section>
          <section aria-labelledby="features">
            <h2 id="features" className="mb-4 text-xl font-semibold">
              {copy.featuresTitle}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {copy.features.map((feature) => (
                <article key={feature.title} className="glass-card p-5">
                  <h3 className="font-semibold leading-6">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </section>
          <section
            aria-labelledby="keyboards"
            className="grid items-start gap-6 sm:grid-cols-2"
          >
            <div>
              <h2 id="keyboards" className="text-xl font-semibold">
                {copy.keyboardsTitle}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)]">
                {copy.keyboards}
              </p>
            </div>
            <figure className="min-w-0">
              <img
                src={dya2Image}
                alt={copy.imageAlt}
                loading="lazy"
                className="h-auto w-full rounded-lg"
              />
              <figcaption className="mt-3 text-xs leading-6 text-[var(--color-text-muted)]">
                {copy.imageCaption}
              </figcaption>
            </figure>
          </section>
          <section aria-labelledby="compatibility">
            <h2 id="compatibility" className="text-xl font-semibold">
              {copy.compatibilityTitle}
            </h2>
            <p className="my-4 text-sm leading-7 text-[var(--color-text-secondary)]">
              {copy.compatibilityIntro}
            </p>
            <div
              role="region"
              aria-labelledby="compatibility"
              tabIndex={0}
              className="overflow-x-auto rounded-lg border border-[var(--color-border)] focus-visible:outline-2 focus-visible:outline-[var(--color-electric)]"
            >
              <table className="w-full min-w-[640px] border-collapse text-left text-sm leading-6">
                <caption className="sr-only">{copy.compatibilityTitle}</caption>
                <thead className="bg-[var(--color-surface-elevated)]">
                  <tr>
                    {copy.columns.map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="p-4 font-semibold"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {copy.environments.map((row) => (
                    <tr
                      key={row[0]}
                      className="border-t border-[var(--color-border)] bg-[var(--color-surface)]"
                    >
                      {row.map((cell, i) =>
                        i === 0 ? (
                          <th
                            key={i}
                            scope="row"
                            className="p-4 align-top font-medium"
                          >
                            {cell}
                          </th>
                        ) : (
                          <td
                            key={i}
                            className="p-4 align-top text-[var(--color-text-secondary)]"
                          >
                            {cell}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">
              {copy.caveat}
            </p>
          </section>
          <section aria-labelledby="start">
            <h2 id="start" className="mb-4 text-xl font-semibold">
              {copy.startTitle}
            </h2>
            <ol className="space-y-4">
              {copy.steps.map((step) => (
                <li key={step.title} className="glass-card p-5">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
            <a href="/" onClick={navigate} className={`${linkClass} mt-5`}>
              {copy.connect}
            </a>
            <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">
              {copy.privacy}
            </p>
          </section>
          <section
            aria-labelledby="sources"
            className="border-t border-[var(--color-border)] pt-6"
          >
            <h2 id="sources" className="text-lg font-semibold">
              {copy.sourcesTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
              {copy.sourcesNote}
            </p>
            <ul className="mt-3 space-y-3 text-sm">
              {[
                ["https://zmk.dev/docs/features/studio", "ZMK Studio"],
                [
                  "https://developer.chrome.com/docs/capabilities/serial",
                  "Web Serial · Chrome for Developers",
                ],
                [
                  "https://developer.chrome.com/docs/capabilities/bluetooth",
                  "Web Bluetooth · Chrome for Developers",
                ],
              ].map(([href, label]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-[var(--color-electric)] underline underline-offset-4"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}
