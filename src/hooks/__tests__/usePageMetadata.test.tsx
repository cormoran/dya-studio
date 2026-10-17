import { renderHook } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { usePageMetadata } from "../usePageMetadata";
import { aboutContent } from "../../content/about";
import { PUBLIC_PAGE_PATHS, SITE_URL } from "../../lib/seo";
import type { Language } from "../../i18n/translations";

beforeEach(() => {
  document.head.innerHTML = "";
});

test("updates existing metadata across public routes and languages without duplicate tags", () => {
  const html = readFileSync("index.html", "utf8");
  document.head.innerHTML = new DOMParser().parseFromString(
    html,
    "text/html",
  ).head.innerHTML;
  const { rerender } = renderHook(
    ({ path, language }: { path: string; language: Language }) =>
      usePageMetadata(path, language),
    { initialProps: { path: "/", language: "en" } },
  );
  const initialTitle = document.title;
  const initialDescription = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  )!.content;
  expect(initialTitle).toContain("ZMK");
  expect(initialDescription).toContain("firmware modules");

  rerender({ path: "/developer-guide/modules/trackball", language: "en" });
  const guideTitle = document.title;
  expect(guideTitle).not.toBe(initialTitle);
  expect(
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href,
  ).toBe(`${SITE_URL}/developer-guide/modules/trackball`);
  expect(
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')!
      .content,
  ).toBe(guideTitle);
  expect(
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')!
      .content,
  ).not.toBe(initialDescription);

  rerender({ path: "/developer-guide/modules/trackball", language: "ja" });
  expect(document.title).not.toBe(guideTitle);
  expect(
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href,
  ).toBe(`${SITE_URL}/developer-guide/modules/trackball`);

  rerender({ path: "/release-notes", language: "zh" });
  expect(document.title).toBe("发行说明 | DYA Studio");
  expect(
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')!.content,
  ).toBe(`${SITE_URL}/release-notes`);

  rerender({ path: "/", language: "en" });
  expect(document.title).toBe(initialTitle);
  expect(
    document.querySelector<HTMLMetaElement>('meta[name="description"]')!
      .content,
  ).toBe(initialDescription);
  for (const selector of [
    'meta[name="description"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[property="og:url"]',
    'link[rel="canonical"]',
  ]) {
    expect(document.querySelectorAll(selector)).toHaveLength(1);
  }
});

test.each(["/oauth/callback", "/keymap", "/developer-guide/typo"])(
  "does not assign a public canonical to %s or leak URL parameters",
  (path) => {
    window.history.replaceState(
      null,
      "",
      `${path}?code=secret&state=private#token`,
    );
    const { rerender } = renderHook(
      ({ pathname }) => usePageMetadata(pathname, "en"),
      { initialProps: { pathname: "/" } },
    );
    expect(document.querySelector('link[rel="canonical"]')).not.toBeNull();
    rerender({ pathname: window.location.pathname });
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.innerHTML).not.toMatch(/secret|private|token/);
    window.history.replaceState(null, "", "/");
  },
);

test("sitemap contains exactly the public routes, with production URLs and valid XML", () => {
  const xml = new DOMParser().parseFromString(
    readFileSync("public/sitemap.xml", "utf8"),
    "application/xml",
  );
  expect(xml.querySelector("parsererror")).toBeNull();
  expect(xml.documentElement.namespaceURI).toBe(
    "http://www.sitemaps.org/schemas/sitemap/0.9",
  );
  expect(
    Array.from(xml.querySelectorAll("loc"), (node) => node.textContent).sort(),
  ).toEqual(PUBLIC_PAGE_PATHS.map((path) => `${SITE_URL}${path}`).sort());
  expect(readFileSync("public/robots.txt", "utf8")).toContain(
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  );
});

test.each(["en", "ja", "zh"] as const)(
  "about metadata follows %s and removes query/hash",
  (language) => {
    window.history.replaceState(null, "", "/about?source=test#compatibility");
    renderHook(() => usePageMetadata(window.location.pathname, language));
    expect(document.title).toContain("DYA Studio");
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href,
    ).toBe(`${SITE_URL}/about`);
    expect(
      document.querySelector<HTMLMetaElement>('meta[property="og:url"]')!
        .content,
    ).toBe(`${SITE_URL}/about`);
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="description"]')!
        .content,
    ).toBe(aboutContent[language].description);
    expect(
      document.querySelector<HTMLMetaElement>('meta[property="og:title"]')!
        .content,
    ).toBe(document.title);
    expect(document.head.innerHTML).not.toContain("source=test");
    window.history.replaceState(null, "", "/");
  },
);
