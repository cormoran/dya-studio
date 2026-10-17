import { useEffect } from "react";
import { getPageMetadata, SITE_URL } from "../lib/seo";
import type { Language } from "../i18n/translations";

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function usePageMetadata(pathname: string, language: Language) {
  useEffect(() => {
    const metadata = getPageMetadata(pathname, language);
    document.title = metadata.title;
    setMeta("name", "description", metadata.description);
    setMeta("property", "og:title", metadata.title);
    setMeta("property", "og:description", metadata.description);
    setMeta("property", "og:url", metadata.canonical ?? `${SITE_URL}/`);

    const existing = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (metadata.canonical) {
      const link = existing ?? document.createElement("link");
      link.rel = "canonical";
      link.href = metadata.canonical;
      if (!existing) document.head.appendChild(link);
    } else {
      existing?.remove();
    }
  }, [pathname, language]);
}
