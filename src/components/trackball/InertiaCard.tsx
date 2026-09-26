import { useState } from "react";
import { inertiaFields, type InertiaSetting } from "../../lib/inputInertia";
import type {
  InputProcessor,
  UseRuntimeInputProcessorReturn,
} from "../../hooks/useRuntimeInputProcessor";
import { useLanguage } from "../../hooks/useLanguage";
import { useDebouncedSave } from "../../hooks/useDebouncedSave";
import { MEMORY_WRITE_DEBOUNCE_MS } from "../../hooks/useDebouncedMemoryWrite";

function InertiaNumber({
  field,
  value,
  save,
}: {
  field: (typeof inertiaFields)[number];
  value: number;
  save: (key: InertiaSetting, value: number) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [invalid, setInvalid] = useState(false);
  const [failed, setFailed] = useState(false);
  const queued = useDebouncedSave<number>({ delay: MEMORY_WRITE_DEBOUNCE_MS });
  return (
    <label className="block space-y-1">
      <span className="text-sm">{t(field.label)}</span>
      <input
        aria-label={t(field.label)}
        type="number"
        min={field.min}
        max={field.max}
        step={1}
        value={queued.pendingValue ?? value}
        aria-invalid={invalid}
        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
        onChange={(event) => {
          const number = event.target.valueAsNumber;
          const invalid =
            !Number.isInteger(number) ||
            number < field.min ||
            number > field.max;
          setInvalid(invalid);
          if (invalid) {
            queued.cancel();
            return;
          }
          setFailed(false);
          queued.setPendingValue(number, async (value) => {
            try {
              await save(field.key, value);
            } catch (error) {
              setFailed(true);
              throw error;
            }
          });
        }}
      />
      <span className="block text-xs text-[var(--color-text-muted)]">
        {t(field.hint)}
      </span>
      <span className="block text-xs" role="status">
        {invalid
          ? `${field.min}–${field.max}`
          : failed
            ? t("Failed to save")
            : t(
                queued.saveStatus === "pending"
                  ? "Queued"
                  : queued.saveStatus === "saving"
                    ? "Saving…"
                    : queued.saveStatus === "saved"
                      ? "Saved"
                      : "",
              )}
      </span>
    </label>
  );
}
export function InertiaCard({
  processor,
  setInertia,
}: {
  processor: InputProcessor;
  setInertia: UseRuntimeInputProcessorReturn["setInertia"];
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  return (
    <section
      className="glass-card p-6 space-y-4"
      aria-label={t("Inertia / Fast input")}
    >
      <h3 className="text-sm font-medium">{t("Inertia / Fast input")}</h3>
      {!processor.inertia ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("Inertia is not supported by this device")}
        </p>
      ) : (
        <>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t(
              "Changes are saved to the device after a short delay. Inertia settings remain editable when disabled.",
            )}
          </p>
          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={processor.inertia.inertiaEnabled}
              disabled={busy}
              onChange={async (event) => {
                setBusy(true);
                try {
                  await setInertia(
                    processor.id,
                    "inertiaEnabled",
                    event.target.checked,
                  );
                } catch {
                  /* hook displays the error */
                } finally {
                  setBusy(false);
                }
              }}
            />
            {t("Enable Inertia")}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inertiaFields.map((field) => (
              <InertiaNumber
                key={field.key}
                field={field}
                value={processor.inertia![field.key]}
                save={(key, value) => setInertia(processor.id, key, value)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
