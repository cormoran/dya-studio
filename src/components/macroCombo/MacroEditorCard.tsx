/**
 * Right-column card of the Macro&Combo page showing the selected macro's
 * editor (name, size, steps) plus its behavior-picker modal. The editing state
 * lives in useMacroEditor; this component is presentation only.
 */
import {
  IconHistory,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { KeycodeSelector } from "../KeycodeSelector";
import { StatusDot } from "../EditStatusIndicator";
import { useLanguage } from "../../hooks/useLanguage";
import type { UseRuntimeMacroReturn } from "../../hooks/useRuntimeMacro";
import type { UseKeymapReturn } from "../../hooks/useKeymap";
import type { KeyboardLayoutType } from "../../lib/keyboardLayouts";
import { formatMacroName, getStepBinding } from "./macroStepUtils";
import type { StepAction } from "./macroStepUtils";
import type { MacroEditorController } from "./useMacroEditor";

interface MacroEditorCardProps {
  macro: MacroEditorController;
  runtimeMacro: UseRuntimeMacroReturn;
  keymap: UseKeymapReturn;
  layers: Array<{ id: number; name: string }>;
  keyboardLayout: KeyboardLayoutType;
  nestedSelectorLayer?: string;
}

export function MacroEditorCard({
  macro,
  runtimeMacro,
  keymap,
  layers,
  keyboardLayout,
  nestedSelectorLayer,
}: MacroEditorCardProps) {
  const { t } = useLanguage();
  const loadedMacro = macro.loadedMacro;

  return (
    <div className="glass-card p-4 min-w-0">
      {loadedMacro ? (
        <>
          <div className="flex flex-col tablet:flex-row tablet:items-end gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] mb-1">
                {t("Name")}
                {macro.loadedMacroHasUnsavedChanges && (
                  <StatusDot status="unsaved" />
                )}
              </label>
              <input
                className="w-full h-10 px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-electric)]/50"
                value={macro.renameDraft}
                maxLength={runtimeMacro.maxNameLength}
                placeholder={formatMacroName(loadedMacro, loadedMacro.slot)}
                onChange={(event) =>
                  macro.handleRenameChange(event.target.value)
                }
                onBlur={() => void macro.renameDebounce.flush()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                {t("Size")}
              </label>
              <div
                className={`h-10 flex items-center px-3 py-2 rounded-lg border text-sm tabular-nums ${
                  macro.encodedSizeError
                    ? "border-red-500/40 text-red-400 bg-red-500/10"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[var(--color-bg)]"
                }`}
              >
                {macro.encodedSize}/{runtimeMacro.maxMacroBytes}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-medium text-[var(--color-text)]">
                {t("Steps")}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="btn-ghost text-sm flex items-center gap-1.5"
                onClick={() => void macro.handleResetMacro()}
                disabled={macro.isResetting || runtimeMacro.isLoading}
                title={t("Reset this macro to its default")}
              >
                {macro.isResetting ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : (
                  <IconHistory size={16} />
                )}
                {t("Reset")}
              </button>
              <button
                className="btn-ghost text-sm flex items-center gap-1.5 text-red-400"
                onClick={() => void macro.handleDeleteMacro()}
                disabled={macro.isDeleting || runtimeMacro.isLoading}
              >
                {macro.isDeleting ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : (
                  <IconTrash size={16} />
                )}
                {t("Delete")}
              </button>
              <button
                className="btn-electric text-sm flex items-center gap-1.5"
                onClick={macro.handleAddStep}
                disabled={runtimeMacro.isLoading}
              >
                <IconPlus size={16} />
                {t("Step")}
              </button>
            </div>
          </div>

          {macro.stepRows.length === 0 ? (
            <div className="p-6 text-center rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("No steps in this macro")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {macro.stepRows.map((row, rowIndex) => {
                const step = row.step;
                const action = row.action;
                return (
                  <div
                    key={`${row.action}-${row.startIndex}-${rowIndex}`}
                    className="grid grid-cols-1 tablet:grid-cols-[64px_128px_1fr_40px] gap-2 items-center p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
                  >
                    <div className="text-xs font-mono text-[var(--color-text-muted)]">
                      #{row.startIndex + 1}
                    </div>
                    <select
                      className="px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-electric)]/50"
                      value={action}
                      onChange={(event) =>
                        void macro.handleActionChange(
                          row.startIndex,
                          event.target.value as StepAction,
                        )
                      }
                    >
                      <option value="tap">{t("Tap")}</option>
                      <option value="down">{t("Down")}</option>
                      <option value="up">{t("Up")}</option>
                      <option value="delay">{t("Delay")}</option>
                      <option value="string">{t("String")}</option>
                    </select>

                    {action === "delay" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-electric)]/50"
                          value={step?.delay?.delayMs ?? 0}
                          onChange={(event) => {
                            macro.handleDelayChange(
                              row.startIndex,
                              Number(event.target.value),
                            );
                            macro.delayDebounce.queue(row.startIndex);
                          }}
                          onBlur={() => void macro.delayDebounce.flush()}
                        />
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {t("ms")}
                        </span>
                      </div>
                    ) : action === "string" ? (
                      <input
                        className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-electric)]/50"
                        value={row.value ?? ""}
                        onChange={(event) => {
                          macro.handleStringChange(row, event.target.value);
                          macro.stringDebounce.queue();
                        }}
                        onBlur={() => void macro.stringDebounce.flush()}
                      />
                    ) : (
                      <button
                        className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-left text-sm text-[var(--color-text-secondary)] transition-colors"
                        onClick={() =>
                          macro.setEditingStepIndex(row.startIndex)
                        }
                      >
                        {step ? macro.getStepDisplayName(step) : ""}
                      </button>
                    )}

                    <button
                      className="p-2 rounded-lg hover:bg-[var(--color-border)] disabled:opacity-40"
                      onClick={() =>
                        void macro.commitSteps([
                          ...loadedMacro.steps.slice(0, row.startIndex),
                          ...loadedMacro.steps.slice(
                            row.startIndex + row.length,
                          ),
                        ])
                      }
                      disabled={runtimeMacro.isLoading}
                      aria-label={t("Remove step {{n}}", {
                        n: row.startIndex + 1,
                      })}
                    >
                      <IconTrash
                        size={16}
                        className="text-[var(--color-text-muted)]"
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="p-6 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {runtimeMacro.macros.length === 0
              ? t("No macros yet. Create one to get started.")
              : t("Select a macro")}
          </p>
        </div>
      )}

      <KeycodeSelector
        open={macro.editingStepIndex !== null}
        targetLabel={
          macro.loadedMacro && macro.editingStepIndex !== null
            ? t("{{macro}} › Step {{step}}", {
                macro: formatMacroName(
                  macro.loadedMacro,
                  macro.loadedMacro.slot,
                ),
                step: macro.editingStepIndex + 1,
              })
            : undefined
        }
        onClose={() => macro.setEditingStepIndex(null)}
        onSelect={macro.handleBehaviorSelect}
        currentBinding={
          macro.selectedStep ? getStepBinding(macro.selectedStep) : null
        }
        behaviors={keymap.behaviors}
        layers={layers}
        keyboardLayout={keyboardLayout}
        behaviorQuickSelects={["kp", "rmacro", "none", "transparent"]}
        runtimeMacros={runtimeMacro.macros}
        modalLayerClassName={nestedSelectorLayer}
      />
    </div>
  );
}
