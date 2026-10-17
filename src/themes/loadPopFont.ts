const STYLESHEET_ID = "pop-theme-font";

/** Start only when Pop is used; native font-display: swap keeps the UI usable. */
export function setPopFontEnabled(enabled: boolean): void {
  const existing = document.getElementById(
    STYLESHEET_ID,
  ) as HTMLLinkElement | null;
  if (existing) {
    existing.disabled = !enabled;
    return;
  }
  if (!enabled) return;

  const link = document.createElement("link");
  link.id = STYLESHEET_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700&display=swap";
  // Keep successful/in-flight requests across theme changes. A failed stylesheet
  // may be retried the next time Pop is selected.
  link.addEventListener("error", () => link.remove(), { once: true });
  document.head.appendChild(link);
}
