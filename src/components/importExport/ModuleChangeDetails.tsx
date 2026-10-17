import type { ModuleChange } from "../../lib/abyss/abyssDiff";
import { moduleFieldChanges } from "../../lib/abyss/moduleFieldChanges";
import { useLanguage } from "../../hooks/useLanguage";

/** Field paths make nested and array edits readable without opening the code diff. */
export function ModuleChangeDetails({ change }: { change: ModuleChange }) {
  const { t } = useLanguage();
  const fields = moduleFieldChanges(change.from, change.to);
  const value = (entry: unknown) =>
    entry === undefined ? t("Not set") : JSON.stringify(entry);
  return (
    <section
      className="my-2 min-w-0"
      aria-label={`${t("Module")}: ${change.moduleName}`}
    >
      <h5 className="text-xs font-medium mb-1">{change.moduleName}</h5>
      <dl className="space-y-1 text-xs">
        {fields.map((field) => (
          <div
            key={field.path}
            className="flex flex-wrap gap-x-2 gap-y-1 break-all"
          >
            <dt className="font-mono text-[var(--color-text-muted)]">
              {field.path}
            </dt>
            <dd className="min-w-0">
              <span className="text-[var(--color-text-muted)] line-through">
                {value(field.from)}
              </span>
              {" → "}
              <span className="text-[var(--color-neon)]">
                {value(field.to)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
