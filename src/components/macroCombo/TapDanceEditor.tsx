import { useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { KeycodeSelector } from "../KeycodeSelector";
import { useIsTabActive } from "../../hooks/useIsTabActive";
import { useLanguage } from "../../hooks/useLanguage";
import {
  useRuntimeTapDance,
  type RuntimeTapDance,
} from "../../hooks/useRuntimeTapDance";
import type { BehaviorDefinition, Keymap } from "../../hooks/useKeymap";
import type { KeyboardLayoutType } from "../../lib/keyboardLayouts";
import { formatBehaviorBinding } from "../../lib/behaviorMetadata";
import {
  emptyTapDance,
  isRuntimeTapDance,
  TAP_DANCE_ACTIONS,
  TAP_DANCE_LABELS,
  tapDanceUsageCount,
} from "../../lib/runtimeTapDance";
import { Config } from "../../proto/cormoran/runtime_tapdance/runtime_tapdance";

type Props = {
  behaviors: Map<number, BehaviorDefinition>;
  layers: Array<{ id: number; name: string }>;
  keyboardLayout?: KeyboardLayoutType;
  keymap?: Keymap | null;
  currentSlot?: number;
};

function TapDanceDraft({
  config,
  slot,
  runtime,
  onSaved,
  ...props
}: Props & {
  config: Config;
  slot: number;
  runtime: RuntimeTapDance;
  onSaved?: () => void;
}) {
  const { t } = useLanguage();
  const panelId = useId();
  const [draft, setDraft] = useState(() => Config.create(config));
  const [active, setActive] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [saved, setSaved] = useState(false);
  const field = TAP_DANCE_ACTIONS[active];
  const binding = draft[field];
  const usage = tapDanceUsageCount(props.keymap, props.behaviors, slot);
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);
  const valid =
    !!draft.singleBinding?.behaviorId &&
    (!draft.tripleBinding?.behaviorId || !!draft.doubleBinding?.behaviorId);
  const allowed = new Map(
    [...props.behaviors].filter(([, behavior]) => !isRuntimeTapDance(behavior)),
  );
  const save = async () => {
    setSaved(false);
    if (await runtime.save(slot, draft)) {
      setSaved(true);
      onSaved?.();
    }
  };
  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label={t("Tapdance actions")}
        className="flex border-b border-[var(--color-border)]"
      >
        {TAP_DANCE_LABELS.map((label, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-controls={`${panelId}-action`}
            id={`${panelId}-tab-${index}`}
            tabIndex={active === index ? 0 : -1}
            onKeyDown={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 2
                      : (active + (event.key === "ArrowRight" ? 1 : 2)) % 3;
                setActive(next);
                (
                  event.currentTarget.parentElement?.children[
                    next
                  ] as HTMLElement
                )?.focus();
              }
            }}
            className={`flex-1 px-3 py-2 text-sm border-b-2 ${active === index ? "border-[var(--color-electric)] text-[var(--color-electric)]" : "border-transparent text-[var(--color-text-muted)]"}`}
            onClick={() => setActive(index)}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${panelId}-action`}
        aria-labelledby={`${panelId}-tab-${active}`}
        className="flex items-center gap-2"
      >
        <button
          type="button"
          className="btn-ghost flex-1 min-h-11"
          disabled={runtime.busy}
          onClick={() => setSelecting(true)}
        >
          {binding?.behaviorId
            ? formatBehaviorBinding(
                binding,
                props.behaviors.get(binding.behaviorId) ?? null,
                { layers: props.layers, keyboardLayout: props.keyboardLayout },
              )
            : t("Select binding")}
        </button>
        {active > 0 && (
          <button
            type="button"
            className="btn-ghost"
            disabled={runtime.busy || !binding?.behaviorId}
            onClick={() => {
              setDraft((current) => ({
                ...current,
                [field]: { behaviorId: 0, param1: 0, param2: 0 },
              }));
              setSaved(false);
            }}
          >
            {t("Clear")}
          </button>
        )}
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">
        {usage === null
          ? t(
              "This configuration is shared by all keys using this tapdance slot. Usage count is unavailable.",
            )
          : t(
              "Saving these actions also updates {{count}} other tapdance key bindings.",
              {
                count: Math.max(
                  0,
                  usage - (props.currentSlot === slot ? 1 : 0),
                ),
              },
            )}
      </p>
      {!draft.singleBinding?.behaviorId && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("Choose a Single action to enable this tapdance.")}
        </p>
      )}
      {!!draft.tripleBinding?.behaviorId &&
        !draft.doubleBinding?.behaviorId && (
          <p role="alert" className="text-sm text-red-500">
            {t("A Triple action requires a Double action.")}
          </p>
        )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn-ghost"
          disabled={runtime.busy || !dirty}
          onClick={() => {
            setDraft(Config.create(config));
            setSaved(false);
          }}
        >
          {t("Discard edits")}
        </button>
        <button
          type="button"
          className="btn-electric"
          disabled={runtime.busy || !valid || !dirty}
          onClick={() => void save()}
        >
          {t(runtime.busy ? "Saving..." : "Save tapdance")}
        </button>
      </div>
      {saved && (
        <p role="status" className="text-sm text-[var(--color-electric)]">
          {t("Tapdance saved to keyboard.")}
        </p>
      )}
      <KeycodeSelector
        open={selecting}
        onClose={() => setSelecting(false)}
        currentBinding={binding}
        behaviors={allowed}
        layers={props.layers}
        keyboardLayout={props.keyboardLayout}
        modalLayerClassName="z-[90]"
        onSelect={(next) => {
          setDraft((current) => ({ ...current, [field]: next }));
          setSaved(false);
          setSelecting(false);
        }}
      />
    </div>
  );
}

export function TapDanceEditor({
  slot: controlledSlot,
  onSlotChange,
  onUseSlot,
  ...props
}: Props & {
  slot?: number;
  onSlotChange?: (slot: number) => void;
  onUseSlot?: (slot: number) => void;
}) {
  const { t } = useLanguage();
  const active = useIsTabActive();
  const runtime = useRuntimeTapDance(active);
  const [selected, setSelected] = useState(0);
  const [editorSession, setEditorSession] = useState(0);
  const [modal, setModal] = useState<{ slot: number; create: boolean } | null>(
    null,
  );
  const [intervalDraft, setIntervalDraft] = useState<number | null>(null);
  const slot = controlledSlot ?? selected;
  const choose = (value: number) => {
    setSelected(value);
    onSlotChange?.(value);
  };
  const free = runtime.slots.findIndex(
    (config, index) =>
      !config.singleBinding?.behaviorId &&
      !(tapDanceUsageCount(props.keymap, props.behaviors, index) ?? 0),
  );
  if (!runtime.isAvailable)
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        {t("Runtime tapdance subsystem is unavailable.")}
      </p>
    );
  return (
    <section className="space-y-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium text-[var(--color-text)]">
          {t("Tapdance")}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={runtime.busy}
            onClick={async () => {
              await runtime.load();
              setIntervalDraft(null);
            }}
          >
            {t("Refresh")}
          </button>
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={runtime.busy || free < 0}
            onClick={() => setModal({ slot: free, create: true })}
          >
            {t("New tapdance")}
          </button>
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={runtime.busy || !runtime.slots[slot]}
            onClick={() => setModal({ slot, create: false })}
          >
            {t("Edit tapdance")}
          </button>
        </div>
      </div>
      {runtime.error && (
        <p role="alert" className="text-sm text-red-500">
          {t(runtime.error)}
        </p>
      )}
      {runtime.busy && <p role="status">{t("Loading...")}</p>}
      <label className="flex items-center gap-2 text-sm">
        {t("Tapdance slot")}
        <select
          className="min-h-11 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] px-2"
          value={slot}
          disabled={runtime.busy}
          onChange={(event) => choose(Number(event.target.value))}
        >
          {runtime.slots.map((config, index) => (
            <option key={index} value={index}>
              {t("Tapdance")} {index}
              {config.singleBinding?.behaviorId ? "" : ` (${t("Empty")})`}
            </option>
          ))}
        </select>
      </label>
      {runtime.slots[slot] && (
        <TapDanceDraft
          key={`${slot}:${runtime.revision}:${editorSession}`}
          {...props}
          config={runtime.slots[slot]}
          slot={slot}
          runtime={runtime}
        />
      )}
      {onUseSlot && (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-electric"
            disabled={
              runtime.busy || !runtime.slots[slot]?.singleBinding?.behaviorId
            }
            onClick={() => onUseSlot(slot)}
          >
            {t("Use tapdance")}
          </button>
        </div>
      )}
      {controlledSlot === undefined && (
        <>
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
            <label className="text-sm">
              {t("Tapdance interval (ms)")}{" "}
              <input
                type="number"
                min={1}
                max={2000}
                className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
                value={
                  Number.isNaN(intervalDraft)
                    ? ""
                    : (intervalDraft ?? runtime.intervalMs)
                }
                disabled={runtime.busy}
                onChange={(event) =>
                  setIntervalDraft(
                    event.target.value === ""
                      ? NaN
                      : Number(event.target.value),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="btn-ghost text-sm"
              disabled={
                runtime.busy ||
                intervalDraft === null ||
                intervalDraft === runtime.intervalMs ||
                !Number.isInteger(intervalDraft) ||
                intervalDraft < 1 ||
                intervalDraft > 2000
              }
              onClick={async () => {
                if (
                  intervalDraft !== null &&
                  (await runtime.saveInterval(intervalDraft))
                )
                  setIntervalDraft(null);
              }}
            >
              {t("Save interval")}
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              disabled={
                runtime.busy || !runtime.slots[slot]?.singleBinding?.behaviorId
              }
              onClick={() => {
                if (
                  window.confirm(
                    t(
                      "Delete this tapdance? Keys using this slot will stop producing tapdance actions.",
                    ),
                  )
                )
                  void runtime.remove(slot);
              }}
            >
              {t("Delete tapdance")}
            </button>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t(
              "The interval applies to all tapdance slots. Tapdance saves separately from macros and combos.",
            )}
          </p>
        </>
      )}
      <Dialog.Root
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open && !runtime.busy) setModal(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/50" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-[70] max-h-[90dvh] w-[95vw] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <Dialog.Title>
                {t(modal?.create ? "New tapdance" : "Edit tapdance")}{" "}
                {modal?.slot}
              </Dialog.Title>
              <Dialog.Close className="btn-ghost" disabled={runtime.busy}>
                {t("Close")}
              </Dialog.Close>
            </div>
            {runtime.error && (
              <p role="alert" className="mb-3 text-sm text-red-500">
                {t(runtime.error)}
              </p>
            )}
            {modal && (
              <TapDanceDraft
                key={`${modal.slot}:${modal.create}`}
                {...props}
                config={
                  modal.create ? emptyTapDance() : runtime.slots[modal.slot]
                }
                slot={modal.slot}
                runtime={runtime}
                onSaved={() => {
                  choose(modal.slot);
                  setEditorSession((value) => value + 1);
                  setModal(null);
                }}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
