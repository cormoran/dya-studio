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
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    if (!focused) {
      setDraft(null);
      setInvalid(false);
    }
  }
  const [failed, setFailed] = useState(false);
  const queued = useDebouncedSave<number>({ delay: MEMORY_WRITE_DEBOUNCE_MS });
  return (
    <label className="block space-y-1">
      <span className="text-sm">{t(field.label)}</span>
      <input
        aria-label={t(field.label)}
        type="text"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        step={1}
        value={draft ?? String(value)}
        aria-invalid={invalid}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full rounded border p-2 ${invalid ? "border-amber-500 bg-amber-500/10 text-amber-600" : "border-[var(--color-border)] bg-[var(--color-surface)]"}`}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const number = Number(raw);
          const invalid =
            raw.trim() === "" ||
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
  graph,
}: {
  graph?: React.ReactNode;
  processor: InputProcessor;
  setInertia: UseRuntimeInputProcessorReturn["setInertia"];
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [fastEpoch, setFastEpoch] = useState(0);
  return (
    <section className="glass-card p-6 space-y-4" aria-label={t("Inertia")}>
      <h3 className="text-sm font-medium">{t("Inertia")}</h3>
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
          {[false, true].map((fast) => (
            <div
              key={String(fast)}
              className={`space-y-3 ${fast ? "border-t border-[var(--color-border)] pt-4" : ""}`}
            >
              {fast && (
                <>
                  <label className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={processor.inertia!.inertiaFastThreshold > 0}
                      disabled={busy}
                      onChange={async (event) => {
                        const threshold = event.target.checked
                          ? Math.min(
                              65535,
                              Math.ceil(
                                Math.max(
                                  processor.inertia!.inertiaThreshold * 1.5,
                                  20,
                                ),
                              ),
                            )
                          : 0;
                        setFastEpoch((epoch) => epoch + 1);
                        setBusy(true);
                        try {
                          await setInertia(
                            processor.id,
                            "inertiaFastThreshold",
                            threshold,
                          );
                        } catch {
                          /* hook displays the error */
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                    {t("Enable Fast input")}
                  </label>
                </>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inertiaFields
                  .filter(
                    (field) => field.key.startsWith("inertiaFast") === fast,
                  )
                  .map((field) => (
                    <InertiaNumber
                      key={`${field.key}-${fast ? fastEpoch : 0}`}
                      field={field}
                      value={processor.inertia![field.key]}
                      save={(key, value) =>
                        setInertia(processor.id, key, value)
                      }
                    />
                  ))}
              </div>
            </div>
          ))}
          {graph}
        </>
      )}
    </section>
  );
}
