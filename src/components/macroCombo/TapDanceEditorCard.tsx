import { useEffect, useId, useState } from "react";
import { TapDanceDraft } from "./TapDanceEditor";
import type { RuntimeTapDance } from "../../hooks/useRuntimeTapDance";
import type { BehaviorDefinition, Keymap } from "../../hooks/useKeymap";
import type { KeyboardLayoutType } from "../../lib/keyboardLayouts";
import { useLanguage } from "../../hooks/useLanguage";

type Props = {
  runtime: RuntimeTapDance;
  slot: number;
  behaviors: Map<number, BehaviorDefinition>;
  layers: Array<{ id: number; name: string }>;
  keymap: Keymap | null;
  keyboardLayout: KeyboardLayoutType;
  onDeleted: () => void;
  onPendingChange?: (pending: boolean) => void;
};

export function TapDanceEditorCard({
  runtime,
  slot,
  onDeleted,
  onPendingChange,
  ...props
}: Props) {
  const { t } = useLanguage();
  const nameId = useId();
  const entry = runtime.entries.find((candidate) => candidate.index === slot);
  const config = entry?.config;
  const [name, setName] = useState<string | null>(null);
  const [actionsPending, setActionsPending] = useState(false);
  const nameDraft = name ?? entry?.name ?? "";
  const validName =
    !!nameDraft.trim() &&
    new TextEncoder().encode(nameDraft.trim()).length <=
      (runtime.globalSettings?.maxNameLength ?? 0) &&
    !runtime.entries.some(
      (candidate) =>
        candidate.index !== slot && candidate.name === nameDraft.trim(),
    );
  useEffect(() => {
    onPendingChange?.(
      actionsPending || (name !== null && nameDraft.trim() !== entry?.name),
    );
  }, [actionsPending, entry?.name, name, nameDraft, onPendingChange]);
  if (!config) return null;
  return (
    <section className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium text-[var(--color-text)]">{entry?.name}</h2>
        <button
          type="button"
          className="btn-ghost text-sm"
          disabled={runtime.busy}
          onClick={async () => {
            if (
              window.confirm(
                t(
                  "Delete this tapdance permanently? Keys using it will stop producing tapdance actions. Discard cannot restore it.",
                ),
              ) &&
              (await runtime.remove(slot))
            )
              onDeleted();
          }}
        >
          {t("Delete tapdance")}
        </button>
      </div>
      {runtime.error && (
        <p role="alert" className="text-sm text-red-500">
          {t(runtime.error)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={nameId}>{t("Name")}</label>
        <input
          id={nameId}
          className="min-w-0 flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
          value={nameDraft}
          disabled={runtime.busy}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          type="button"
          className="btn-ghost text-sm"
          disabled={
            runtime.busy || !validName || nameDraft.trim() === entry?.name
          }
          onClick={async () => {
            if (await runtime.rename(slot, nameDraft)) setName(null);
          }}
        >
          {t("Rename")}
        </button>
      </div>
      <TapDanceDraft
        key={`${slot}:${runtime.revision}`}
        config={config}
        slot={slot}
        runtime={runtime}
        applyToMemory
        onPendingChange={setActionsPending}
        {...props}
      />
      <p className="text-sm text-[var(--color-text-muted)]">
        {t(
          "Actions are applied to memory. Use Save above to keep tapdance changes after restart.",
        )}
      </p>
    </section>
  );
}

export function TapDanceGlobalSettingsCard({
  runtime,
}: {
  runtime: RuntimeTapDance;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<number | null>(null);
  return (
    <section className="glass-card p-4 space-y-4">
      <h2 className="font-medium text-[var(--color-text)]">
        {t("Tapdance Global Settings")}
      </h2>
      {runtime.error && (
        <p role="alert" className="text-sm text-red-500">
          {t(runtime.error)}
        </p>
      )}
      {runtime.globalSettings && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t(
            "Shared pool: {{used}} / {{total}} bytes · {{count}} / {{max}} tapdances",
            {
              used: runtime.globalSettings.poolBytesUsed,
              total: runtime.globalSettings.poolBytesTotal,
              count: runtime.globalSettings.usedEntries,
              max: runtime.globalSettings.maxEntries,
            },
          )}
        </p>
      )}
      <label className="flex flex-wrap items-center gap-2 text-sm">
        {t("Tapdance interval (ms)")}
        <input
          type="number"
          min={1}
          max={2000}
          className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-text)]"
          value={Number.isNaN(draft) ? "" : (draft ?? runtime.intervalMs)}
          disabled={runtime.busy}
          onChange={(event) =>
            setDraft(
              event.target.value === "" ? NaN : Number(event.target.value),
            )
          }
        />
      </label>
      <button
        type="button"
        className="btn-electric text-sm"
        disabled={
          runtime.busy ||
          draft === null ||
          draft === runtime.intervalMs ||
          !Number.isInteger(draft) ||
          draft < 1 ||
          draft > 2000
        }
        onClick={async () => {
          if (draft !== null && (await runtime.saveInterval(draft)))
            setDraft(null);
        }}
      >
        {t("Apply to memory")}
      </button>
      <p className="text-sm text-[var(--color-text-muted)]">
        {t(
          "The interval applies to all tapdances. Use Save above to keep changes after restart.",
        )}
      </p>
    </section>
  );
}
