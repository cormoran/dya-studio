/**
 * Collapsed view of a JSON document.
 *
 * Exporting sends a document the user never otherwise sees; being able to open
 * it and read exactly what left the machine is the difference between trusting
 * the feature and hoping. Collapsed by default because it is long.
 *
 * The body is always rendered and simply hidden by `<details>`, rather than
 * mounted on toggle. Gating it on an `onToggle` state handler looked like a
 * free optimisation but silently rendered an empty pane — the browser opened
 * the element while React never mounted its contents. The stringify cost is
 * paid once per payload instead, via `useMemo`.
 */
import { useMemo } from "react";
import { useLanguage } from "../../hooks/useLanguage";

export function JsonPreview({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  const { t } = useLanguage();
  const text = useMemo(
    () =>
      value === null || value === undefined
        ? null
        : JSON.stringify(value, null, 2),
    [value],
  );

  return (
    <details className="rounded-lg border border-[var(--color-border)] px-3 py-2">
      <summary className="cursor-pointer text-xs text-[var(--color-text-muted)]">
        {title}
      </summary>
      <pre className="mt-2 max-h-80 overflow-auto rounded bg-[var(--color-border)] p-2 text-[10px] leading-relaxed text-[var(--color-text-muted)]">
        {text ?? t("Not available.")}
      </pre>
    </details>
  );
}
