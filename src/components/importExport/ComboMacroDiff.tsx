/**
 * Human-readable rendering of combo and macro changes, with the raw JSON kept
 * underneath.
 *
 * `{"positions":[12,13],"binding":{"type":"key","usage":43}}` is precise and
 * unreadable. The summary line says what it does; the JSON stays one click away
 * because it is the only thing that is unambiguous when the summary does not
 * cover a case.
 */
import { useLanguage } from "../../hooks/useLanguage";
import { bindingLabel, type CollectionChange } from "../../lib/abyss/abyssDiff";

/** A combo as KeyboardHub stores it. */
type ComboShape = {
  positions?: number[];
  binding?: unknown;
};

/** A macro as KeyboardHub stores it. */
type MacroShape = {
  name?: string;
  bindings?: MacroStep[];
};

type MacroStep = {
  action?: string;
  binding?: unknown;
  wait?: number;
  tap?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** `keys 12 + 13 → SPACE` */
function ComboSummary({ value }: { value: unknown }) {
  const { t } = useLanguage();
  if (!isRecord(value)) return null;
  const combo = value as ComboShape;
  const positions = combo.positions ?? [];

  return (
    <span className="text-[var(--color-text)]">
      {positions.length > 0 ? (
        <>
          {t("Keys")}{" "}
          <span className="tabular-nums">{positions.join(" + ")}</span>
        </>
      ) : (
        t("No keys")
      )}
      {" → "}
      <span className="text-[var(--color-neon)]">
        {bindingLabel(combo.binding)}
      </span>
    </span>
  );
}

/** Macro name plus its steps as chips, in order. */
function MacroSummary({ value }: { value: unknown }) {
  const { t } = useLanguage();
  if (!isRecord(value)) return null;
  const macro = value as MacroShape;
  const steps = macro.bindings ?? [];

  return (
    <div>
      <span className="text-[var(--color-text)]">
        {macro.name || t("Unnamed macro")}
      </span>
      <div className="mt-1 flex flex-wrap gap-1">
        {steps.length === 0 && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {t("No steps")}
          </span>
        )}
        {steps.map((step, index) => (
          <span
            key={index}
            className="px-1.5 py-0.5 rounded bg-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]"
          >
            {step.wait !== undefined
              ? t("wait {{ms}}ms", { ms: step.wait })
              : step.tap !== undefined
                ? t("tap {{ms}}ms", { ms: step.tap })
                : `${step.action ?? "tap"} ${bindingLabel(step.binding)}`}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChangeRow({
  change,
  kind,
}: {
  change: CollectionChange;
  kind: "combo" | "macro";
}) {
  const { t } = useLanguage();
  const Summary = kind === "combo" ? ComboSummary : MacroSummary;
  // A missing `to` means the entry goes away; a missing `from` means it is new.
  const verb =
    change.to === undefined
      ? t("Removed")
      : change.from === undefined
        ? t("Added")
        : t("Changed");

  return (
    <div className="py-2 border-t border-[var(--color-border)] first:border-t-0">
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
        {change.label} · {verb}
      </p>
      {change.from !== undefined && change.to !== undefined && (
        <div className="text-xs opacity-60 mb-1">
          <Summary value={change.from} />
        </div>
      )}
      <div className="text-xs">
        <Summary value={change.to ?? change.from} />
      </div>
      <details className="mt-1">
        <summary className="cursor-pointer text-[10px] text-[var(--color-text-muted)]">
          {t("Raw")}
        </summary>
        <pre className="mt-1 p-2 rounded bg-[var(--color-border)] overflow-x-auto text-[10px] text-[var(--color-text-muted)]">
          {JSON.stringify(change.to ?? change.from, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export function ComboMacroDiff({
  title,
  kind,
  changes,
}: {
  title: string;
  kind: "combo" | "macro";
  changes: CollectionChange[];
}) {
  if (changes.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h4 className="text-sm font-medium text-[var(--color-text)] mb-2">
        {title}
      </h4>
      {changes.map((change) => (
        <ChangeRow key={change.index} change={change} kind={kind} />
      ))}
    </div>
  );
}
