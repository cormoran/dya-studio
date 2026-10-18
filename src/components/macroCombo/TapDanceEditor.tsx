import { useEffect, useId, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { KeycodeSelector } from "../KeycodeSelector";
import { useLanguage } from "../../hooks/useLanguage";
import type { RuntimeTapDance } from "../../hooks/useRuntimeTapDance";
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

export function TapDanceDraft({
  config,
  slot,
  runtime,
  onSaved,
  onSave,
  applyToMemory = false,
  onPendingChange,
  saveDisabled = false,
  hideActions = false,
  ...props
}: Props & {
  config: Config;
  slot?: number;
  runtime: RuntimeTapDance;
  onSaved?: () => void;
  onSave?: (config: Config) => Promise<boolean>;
  applyToMemory?: boolean;
  onPendingChange?: (pending: boolean) => void;
  saveDisabled?: boolean;
  hideActions?: boolean;
}) {
  const { t } = useLanguage();
  const panelId = useId();
  const [draft, setDraft] = useState(() => Config.create(config));
  const [active, setActive] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [saved, setSaved] = useState(false);
  const field = TAP_DANCE_ACTIONS[active];
  const binding = draft[field];
  const usage =
    slot === undefined
      ? 0
      : tapDanceUsageCount(props.keymap, props.behaviors, slot);
  const otherUsage =
    usage === null
      ? null
      : Math.max(0, usage - (props.currentSlot === slot ? 1 : 0));
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);
  const valid =
    (!!draft.singleBinding?.behaviorId ||
      (applyToMemory &&
        !draft.doubleBinding?.behaviorId &&
        !draft.tripleBinding?.behaviorId)) &&
    (!draft.tripleBinding?.behaviorId || !!draft.doubleBinding?.behaviorId);
  useEffect(() => {
    onPendingChange?.(dirty || !valid);
  }, [dirty, valid, onPendingChange]);
  const commitDraft = (next: Config) => {
    setDraft(next);
    setSaved(false);
    if (
      applyToMemory &&
      slot !== undefined &&
      next.singleBinding?.behaviorId &&
      (!next.tripleBinding?.behaviorId || next.doubleBinding?.behaviorId)
    )
      void runtime.save(slot, next, false);
  };
  const allowed = new Map(
    [...props.behaviors].filter(([, behavior]) => !isRuntimeTapDance(behavior)),
  );
  const save = async () => {
    setSaved(false);
    if (
      await (onSave
        ? onSave(draft)
        : slot === undefined
          ? false
          : runtime.save(slot, draft, !applyToMemory))
    ) {
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
              commitDraft({
                ...draft,
                [field]: { behaviorId: 0, param1: 0, param2: 0 },
              });
            }}
          >
            {t("Clear")}
          </button>
        )}
      </div>
      {(otherUsage === null || otherUsage > 0) && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {otherUsage === null
            ? t(
                "This configuration is shared by all keys using this tapdance. Usage count is unavailable.",
              )
            : t(
                applyToMemory
                  ? "Applying these actions also updates {{count}} other tapdance key bindings."
                  : "Saving these actions also updates {{count}} other tapdance key bindings.",
                { count: otherUsage },
              )}
        </p>
      )}
      {!applyToMemory && runtime.hasUnsavedChanges && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t(
            "Saving here also saves other tapdance changes already in memory.",
          )}
        </p>
      )}
      {!!draft.tripleBinding?.behaviorId &&
        !draft.doubleBinding?.behaviorId && (
          <p role="alert" className="text-sm text-red-500">
            {t("A Triple action requires a Double action.")}
          </p>
        )}
      {!hideActions && (
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
            disabled={
              runtime.busy ||
              !valid ||
              (!dirty && (applyToMemory || !runtime.hasUnsavedChanges)) ||
              saveDisabled
            }
            onClick={() => void save()}
          >
            {t(
              runtime.busy
                ? "Saving..."
                : applyToMemory
                  ? "Apply to memory"
                  : "Save tapdance",
            )}
          </button>
        </div>
      )}
      {saved && (
        <p role="status" className="text-sm text-[var(--color-electric)]">
          {t(
            applyToMemory ? "Applied to memory" : "Tapdance saved to keyboard.",
          )}
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
          commitDraft({ ...draft, [field]: next });
          setSelecting(false);
        }}
      />
    </div>
  );
}

export function TapDanceEditor({
  slot,
  onSlotChange,
  runtime,
  ...props
}: Props & {
  slot?: number;
  onSlotChange?: (id: number) => void;
  runtime: RuntimeTapDance;
}) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<number | undefined>();
  const [session, setSession] = useState(0);
  const saveTarget = useRef<number | undefined>(undefined);
  const [modal, setModal] = useState<{ create: boolean; id?: number } | null>(
    null,
  );
  const [name, setName] = useState("");
  const id = slot ?? selected ?? runtime.entries[0]?.index;
  const entry = runtime.entries.find((candidate) => candidate.index === id);
  const modalEntry = runtime.entries.find(
    (candidate) => candidate.index === modal?.id,
  );
  const choose = (next: number) => {
    setSelected(next);
    onSlotChange?.(next);
  };
  const canCreate =
    !!runtime.globalSettings &&
    runtime.entries.length < runtime.globalSettings.maxEntries &&
    !runtime.busy;
  const invalidName =
    !name.trim() ||
    new TextEncoder().encode(name.trim()).length >
      (runtime.globalSettings?.maxNameLength ?? 0) ||
    (modal?.id === undefined &&
      runtime.entries.some((candidate) => candidate.name === name.trim()));
  const openEditor = (create: boolean) => {
    setSession((value) => value + 1);
    setName(create ? "" : (entry?.name ?? ""));
    saveTarget.current = create ? undefined : id;
    setModal({ create, id: create ? undefined : id });
  };
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
            onClick={() => void runtime.load()}
          >
            {t("Refresh")}
          </button>
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={!canCreate}
            onClick={() => openEditor(true)}
          >
            {t("New tapdance")}
          </button>
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={runtime.busy || !entry}
            onClick={() => openEditor(false)}
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
      {runtime.entries.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("No tapdances yet. Create one above.")}
        </p>
      )}
      {id !== undefined && !entry && runtime.entries.length > 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("Tapdance unavailable")}
        </p>
      )}
      {entry?.config && (
        <TapDanceDraft
          key={`${entry.index}:${runtime.revision}:${session}`}
          {...props}
          config={entry.config}
          slot={entry.index}
          runtime={runtime}
        />
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
                {t(modal?.create ? "New tapdance" : "Edit tapdance")}
                {modalEntry ? ` · ${modalEntry.name}` : ""}
              </Dialog.Title>
              <Dialog.Close className="btn-ghost" disabled={runtime.busy}>
                {t("Close")}
              </Dialog.Close>
            </div>
            {modal?.create && (
              <label className="mb-4 flex flex-col gap-1 text-sm">
                {t("Name")}
                <input
                  className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
                  value={name}
                  disabled={runtime.busy || modal.id !== undefined}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            )}
            {runtime.error && (
              <p role="alert" className="mb-3 text-sm text-red-500">
                {t(runtime.error)}
              </p>
            )}
            {modal && (
              <TapDanceDraft
                key={session}
                {...props}
                config={
                  modal.create
                    ? emptyTapDance()
                    : (modalEntry?.config ?? emptyTapDance())
                }
                slot={modal.id}
                runtime={runtime}
                saveDisabled={modal.create && invalidName}
                onSave={async (config) => {
                  let target = modal.id;
                  if (target === undefined) {
                    const created = await runtime.create(name);
                    if (created === null) return false;
                    target = created;
                    saveTarget.current = target;
                    setModal({ ...modal, id: target });
                  }
                  return runtime.save(target, config);
                }}
                onSaved={() => {
                  const target = saveTarget.current;
                  if (target !== undefined) choose(target);
                  setSession((value) => value + 1);
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
