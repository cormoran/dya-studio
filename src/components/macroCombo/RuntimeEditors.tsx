import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import { useLanguage } from "../../hooks/useLanguage";
import { useDebouncedMemoryWrite } from "../../hooks/useDebouncedMemoryWrite";
import type { UseRuntimeMacroReturn } from "../../hooks/useRuntimeMacro";
import type { UseRuntimeComboReturn } from "../../hooks/useRuntimeCombo";
import type { RuntimeTapDance } from "../../hooks/useRuntimeTapDance";
import type { UseKeymapReturn } from "../../hooks/useKeymap";
import type { KeyboardLayoutType } from "../../lib/keyboardLayouts";
import type { MacroEditorController } from "./useMacroEditor";
import type { ComboEditorController } from "./useComboEditor";
import { ComboSource } from "../../proto/cormoran/runtime_combo/runtime_combo";
import { MacroEditorCard } from "./MacroEditorCard";
import { ComboEditorCard } from "./ComboEditorCard";
import { TapDanceEditorCard } from "./TapDanceEditorCard";
import { RetainedInput } from "./RetainedInput";
import { RuntimeEditorModal, RuntimeModalActions } from "./RuntimeListCard";

export type RuntimeView =
  | "macro"
  | "combo"
  | "tapdance"
  | "macro-settings"
  | "combo-settings"
  | "tapdance-settings";
export const MEMORY_EDIT_NOTICE =
  "Changes are applied to memory immediately, but are not saved permanently until you press Save.";

export function RuntimeEditors({
  view,
  onClose,
  macro,
  combo,
  runtimeMacro,
  runtimeCombo,
  runtimeTapDance,
  tapDanceSlot,
  keymap,
  layers,
  keyboardLayout,
  onBusyChange,
}: {
  onBusyChange: (busy: boolean) => void;
  view: RuntimeView;
  onClose: () => void;
  macro: MacroEditorController;
  combo: ComboEditorController;
  runtimeMacro: UseRuntimeMacroReturn;
  runtimeCombo: UseRuntimeComboReturn;
  runtimeTapDance: RuntimeTapDance;
  tapDanceSlot: number | null;
  keymap: UseKeymapReturn;
  layers: Array<{ id: number; name: string }>;
  keyboardLayout: KeyboardLayoutType;
}) {
  const { t } = useLanguage();
  const domain = view.split("-")[0];
  const settings = view.endsWith("-settings");
  const [working, setWorking] = useState(false);
  const actionInFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"close" | "discard" | "delete" | null>(
    null,
  );
  const [settingsEdited, setSettingsEdited] = useState(false);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const invalidSetting = invalidFields.size > 0;
  const [tapDraftPending, setTapDraftPending] = useState(false);
  const baseline = useRef({
    tapMs: runtimeMacro.globalSettings?.tapMs ?? 0,
    timeoutMs: runtimeCombo.globalSettings?.timeoutMs ?? 50,
    idleMs: runtimeCombo.globalSettings?.requirePriorIdleMs ?? 0,
    slowRelease: runtimeCombo.globalSettings?.slowRelease ?? false,
    intervalMs: runtimeTapDance.intervalMs,
  });
  const settingsWriteFailed = useRef(false);
  const settingsWrite = useDebouncedMemoryWrite<() => Promise<boolean>>(
    async (write) => {
      settingsWriteFailed.current = !(await write());
    },
    0,
  );
  const settingsRef = useRef(baseline.current);
  const runtimeBusy =
    domain === "macro"
      ? runtimeMacro.isLoading
      : domain === "combo"
        ? runtimeCombo.isLoading
        : runtimeTapDance.busy;
  const domainDirty = settings
    ? false
    : domain === "macro"
      ? macro.loadedMacroHasUnsavedChanges || macro.isMemoryWritePending
      : domain === "combo"
        ? runtimeCombo.isComboUnsaved(combo.draft.index) ||
          combo.modifiedIndices.has(combo.draft.index)
        : !!runtimeTapDance.entries.find(
            (entry) => entry.index === tapDanceSlot,
          )?.hasUnsavedChanges || tapDraftPending;
  const rpcError =
    domain === "macro"
      ? runtimeMacro.error ||
        macro.encodedSizeError ||
        macro.stringConversionError
      : domain === "combo"
        ? runtimeCombo.error
        : runtimeTapDance.error;
  const settingsAvailable =
    domain === "macro"
      ? !!runtimeMacro.globalSettings
      : domain === "combo"
        ? !!runtimeCombo.globalSettings
        : !!runtimeTapDance.globalSettings;
  const invalid = settings
    ? invalidSetting
    : domain === "macro"
      ? !!macro.encodedSizeError ||
        !!macro.stringConversionError ||
        !macro.renameDraft.trim()
      : domain === "combo"
        ? !!combo.validationError
        : tapDraftPending;
  const run = async (operation: () => Promise<boolean>, close = true) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setWorking(true);
    onBusyChange(true);
    setError(null);
    try {
      if (await operation()) {
        setConfirm(null);
        if (close) onClose();
      } else
        setError(
          t(
            "The operation failed. Your changes remain available; retry or reload.",
          ),
        );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      actionInFlight.current = false;
      setWorking(false);
      onBusyChange(false);
    }
  };
  const flush = async () => {
    if (settings) {
      await settingsWrite.flush();
      return !settingsWriteFailed.current && !invalidSetting;
    }
    if (domain === "macro") return macro.flushPendingWrites();
    if (domain === "combo") {
      if ((await combo.flushPendingWrites()) === false) return false;
      return !combo.validationError && !runtimeCombo.error;
    }
    return !tapDraftPending && !runtimeTapDance.error;
  };
  const save = async () => {
    if (!(await flush())) return false;
    if (domain === "macro") {
      if (!(await runtimeMacro.saveMacros())) return false;
      macro.clearGlobalModified();
    } else if (domain === "combo") {
      if (!(await runtimeCombo.saveChanges())) return false;
      combo.clearModified();
    } else if (!(await runtimeTapDance.saveChanges())) return false;
    return true;
  };
  const restoreSettings = async () => {
    settingsWrite.cancel();
    await settingsWrite.flush();
    const b = baseline.current;
    if (domain === "macro") return runtimeMacro.setTapMs(b.tapMs);
    if (domain === "combo") {
      if (!(await runtimeCombo.setTimeoutMs(b.timeoutMs))) return false;
      if (!(await runtimeCombo.setRequirePriorIdleMs(b.idleMs))) return false;
      return runtimeCombo.setSlowRelease(b.slowRelease);
    }
    return runtimeTapDance.saveInterval(b.intervalMs);
  };
  const discard = async () => {
    if (domain === "macro") {
      macro.cancelPendingWrites();
      await macro.flushPendingWrites();
      const name = macro.loadedMacro?.name ?? macro.selectedName;
      if (!name) return false;
      const restored = await runtimeMacro.discardMacro(name);
      if (!restored) {
        await macro.reloadLoadedMacro();
        return false;
      }
      macro.clearSelection();
      return true;
    }
    if (domain === "combo") {
      combo.cancelPendingWrites();
      await combo.flushPendingWrites();
      if (!(await runtimeCombo.discardCombo(combo.draft.index))) return false;
      combo.clearModified(combo.draft.index);
      combo.clearSelection();
      return true;
    }
    return tapDanceSlot !== null && runtimeTapDance.discardEntry(tapDanceSlot);
  };
  const remove = async () => {
    if (domain === "macro") {
      macro.cancelPendingWrites();
      await macro.flushPendingWrites();
      const name = macro.loadedMacro?.name ?? macro.selectedName;
      return !!name && runtimeMacro.deleteMacro(name);
    }
    if (domain === "combo") {
      combo.cancelPendingWrites();
      await combo.flushPendingWrites();
      return runtimeCombo.deleteCombo(combo.draft.index);
    }
    return tapDanceSlot !== null && runtimeTapDance.remove(tapDanceSlot);
  };
  const changeNumber = (
    key: "tapMs" | "timeoutMs" | "idleMs" | "intervalMs",
    text: string,
    min: number,
    max: number,
  ) => {
    setSettingsEdited(true);
    const value = Number(text);
    const valid =
      text !== "" && Number.isInteger(value) && value >= min && value <= max;
    setInvalidFields((current) => {
      const next = new Set(current);
      if (valid) next.delete(key);
      else next.add(key);
      return next;
    });
    if (!valid) return;
    settingsRef.current = { ...settingsRef.current, [key]: value };
    const next = { ...settingsRef.current };
    // Queue the entire settings draft so rapid edits to different fields are retained.
    settingsWrite.queue(async () => {
      if (domain === "macro") return runtimeMacro.setTapMs(next.tapMs);
      if (domain === "tapdance")
        return runtimeTapDance.saveInterval(next.intervalMs);
      if (!(await runtimeCombo.setTimeoutMs(next.timeoutMs))) return false;
      if (!(await runtimeCombo.setRequirePriorIdleMs(next.idleMs)))
        return false;
      return runtimeCombo.setSlowRelease(next.slowRelease);
    });
  };
  const numberField = (
    label: string,
    key: "tapMs" | "timeoutMs" | "idleMs" | "intervalMs",
    min: number,
    max: number,
  ) => (
    <label className="block space-y-1 text-sm text-[var(--color-text)]">
      {t(label)}
      <RetainedInput
        type="number"
        min={min}
        max={max}
        value={String(settingsRef.current[key])}
        aria-invalid={invalidFields.has(key)}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
        onChange={(value) => changeNumber(key, value, min, max)}
      />
    </label>
  );
  const title =
    view === "combo"
      ? "Combo Editor"
      : view === "macro"
        ? "Edit macros"
        : view === "tapdance"
          ? "Tapdance Editor"
          : view === "macro-settings"
            ? "Macro Global Settings"
            : view === "combo-settings"
              ? "Combo Global Settings"
              : "Tapdance Global Settings";
  const dirty = domainDirty || settingsEdited;
  return (
    <>
      <RuntimeEditorModal
        open
        title={t(title)}
        busy={working}
        onClose={() => {
          if (
            settings &&
            settingsEdited &&
            (invalidSetting ||
              settingsWrite.state !== "idle" ||
              JSON.stringify(settingsRef.current) !==
                JSON.stringify(baseline.current))
          )
            setConfirm("close");
          else onClose();
        }}
        actions={
          <>
            {view === "combo" && (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <span>
                  {t(combo.selectedComboExists ? "Existing slot" : "New slot")}
                </span>
                {(combo.editorSource === ComboSource.COMBO_SOURCE_DEFAULT ||
                  combo.editorSource ===
                    ComboSource.COMBO_SOURCE_OVERRIDDEN) && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    disabled={working || runtimeBusy}
                    onClick={() => void combo.handleResetCombo()}
                  >
                    {t("Reset to Default")}
                  </button>
                )}
                <label className="flex items-center gap-1">
                  {t("Enabled")}
                  <input
                    type="checkbox"
                    checked={combo.draft.enabled}
                    disabled={working || runtimeBusy}
                    onChange={(event) =>
                      combo.applyDraftChange(
                        { ...combo.draft, enabled: event.target.checked },
                        true,
                      )
                    }
                  />
                </label>
              </div>
            )}
            <RuntimeModalActions
              mutationBusy={runtimeBusy}
              busy={working}
              dirty={dirty}
              saveDisabled={
                invalid ||
                (settings && !settingsAvailable) ||
                (runtimeBusy &&
                  !macro.isMemoryWritePending &&
                  settingsWrite.state === "idle")
              }
              onSave={settings ? () => void run(save) : undefined}
              onDiscard={
                !settings && domainDirty
                  ? () => setConfirm("discard")
                  : undefined
              }
              onDelete={!settings ? () => setConfirm("delete") : undefined}
            />
          </>
        }
      >
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">
          {t(MEMORY_EDIT_NOTICE)}
        </p>
        {(error || rpcError) && (
          <p role="alert" className="mb-3 text-sm text-red-400">
            {t(error || rpcError || "")}
          </p>
        )}
        <fieldset
          disabled={working || (settings && !settingsAvailable)}
          className="min-w-0"
        >
          {view === "macro" && (
            <MacroEditorCard
              macro={macro}
              runtimeMacro={runtimeMacro}
              keymap={keymap}
              layers={layers}
              keyboardLayout={keyboardLayout}
              allowDestructiveActions={false}
              nestedSelectorLayer="z-[90]"
            />
          )}
          {view === "combo" && (
            <ComboEditorCard
              hideHeader
              combo={combo}
              runtimeCombo={runtimeCombo}
              keymap={keymap}
              layers={layers}
              keyboardLayout={keyboardLayout}
              runtimeMacros={runtimeMacro.macros}
            />
          )}
          {view === "tapdance" && tapDanceSlot !== null && (
            <TapDanceEditorCard
              runtime={runtimeTapDance}
              slot={tapDanceSlot}
              behaviors={keymap.behaviors}
              layers={layers}
              keyboardLayout={keyboardLayout}
              keymap={keymap.keymap}
              onDeleted={onClose}
              onPendingChange={setTapDraftPending}
              hideActions
            />
          )}
          {settings && (
            <section className="space-y-4">
              {domain === "macro" && (
                <>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t("Shared macro pool: {{used}}/{{total}} B", {
                      used: runtimeMacro.globalSettings?.poolBytesUsed ?? 0,
                      total: runtimeMacro.globalSettings?.poolBytesTotal ?? 0,
                    })}
                  </p>
                  {numberField("Tap ms", "tapMs", 0, 10000)}
                </>
              )}
              {domain === "tapdance" && (
                <>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t(
                      "Shared pool: {{used}} / {{total}} bytes · {{count}} / {{max}} tapdances",
                      {
                        used:
                          runtimeTapDance.globalSettings?.poolBytesUsed ?? 0,
                        total:
                          runtimeTapDance.globalSettings?.poolBytesTotal ?? 0,
                        count: runtimeTapDance.entries.length,
                        max: runtimeTapDance.globalSettings?.maxEntries ?? 0,
                      },
                    )}
                  </p>
                  {numberField("Tapdance interval (ms)", "intervalMs", 1, 2000)}
                </>
              )}
              {domain === "combo" && (
                <>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t("Max slots")}:{" "}
                    {runtimeCombo.globalSettings?.maxCombo ?? 0}
                  </p>
                  {numberField("Timeout ms", "timeoutMs", 1, 65535)}
                  {numberField(
                    "Require prior idle ms (0 disables)",
                    "idleMs",
                    0,
                    65535,
                  )}
                  <label className="flex items-center justify-between text-sm">
                    {t("Slow release")}
                    <Switch.Root
                      aria-label={t("Slow release")}
                      checked={settingsRef.current.slowRelease}
                      onCheckedChange={(value) => {
                        setSettingsEdited(true);
                        settingsRef.current = {
                          ...settingsRef.current,
                          slowRelease: value,
                        };
                        const next = { ...settingsRef.current };
                        settingsWrite.queue(async () => {
                          if (
                            !(await runtimeCombo.setTimeoutMs(next.timeoutMs))
                          )
                            return false;
                          if (
                            !(await runtimeCombo.setRequirePriorIdleMs(
                              next.idleMs,
                            ))
                          )
                            return false;
                          return runtimeCombo.setSlowRelease(next.slowRelease);
                        });
                      }}
                      className="relative h-5 w-10 rounded-full bg-[var(--color-border)] data-[state=checked]:bg-[var(--color-electric)]"
                    >
                      <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white data-[state=checked]:translate-x-5" />
                    </Switch.Root>
                  </label>
                </>
              )}
              {invalidSetting && (
                <p role="alert" className="text-sm text-red-400">
                  {t("Enter a whole number within the displayed range.")}
                </p>
              )}
            </section>
          )}
        </fieldset>
      </RuntimeEditorModal>
      <Dialog.Root
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !working) setConfirm(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-[100] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl"
          >
            <Dialog.Title className="text-lg font-medium text-[var(--color-text)]">
              {t(confirm === "delete" ? "Delete" : "Discard changes?")}
            </Dialog.Title>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              {t(
                confirm === "close"
                  ? "Close and restore the settings from when this dialog opened?"
                  : confirm === "discard"
                    ? "Discard this item’s unsaved changes and restore its saved value?"
                    : domain === "tapdance"
                      ? "Delete this tapdance permanently? Keys using it will stop producing tapdance actions. Discard cannot restore it."
                      : "Delete this item from keyboard memory?",
              )}
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost text-sm"
                disabled={working}
                onClick={() => setConfirm(null)}
              >
                {t("Keep editing")}
              </button>
              <button
                type="button"
                className="btn-electric text-sm"
                disabled={working}
                onClick={() =>
                  void run(
                    confirm === "close"
                      ? restoreSettings
                      : confirm === "discard"
                        ? discard
                        : remove,
                  )
                }
              >
                {t(confirm === "delete" ? "Delete" : "Discard and close")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
