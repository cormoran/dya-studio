/**
 * Right-column card of the Macro&Combo page showing the selected combo's
 * editor (name, behavior, layers, positions, layout preview, advanced
 * options) plus its behavior-picker modal. The editing state lives in
 * useComboEditor; this component is presentation only.
 */
import { useMemo } from "react";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconRestore,
  IconTrash,
} from "@tabler/icons-react";
import * as Switch from "@radix-ui/react-switch";
import { KeyboardLayout } from "../KeyboardLayout";
import { KeycodeSelector } from "../KeycodeSelector";
import { StatusDot } from "../EditStatusIndicator";
import { useLanguage } from "../../hooks/useLanguage";
import type { UseKeymapReturn } from "../../hooks/useKeymap";
import type { UseRuntimeComboReturn } from "../../hooks/useRuntimeCombo";
import type { KeyboardLayoutType } from "../../lib/keyboardLayouts";
import type { MacroSummary } from "../../proto/cormoran/runtime_macro/runtime_macro";
import {
  ComboSource,
  SlowReleaseOverride,
} from "../../proto/cormoran/runtime_combo/runtime_combo";
import {
  comboEditStatus,
  formatComboBehavior,
  formatLayerScope,
  hasLayer,
  positionsToText,
  toggleLayer,
  MAX_NAME_LENGTH,
} from "./comboUtils";
import type { ComboEditorController } from "./useComboEditor";

interface ComboEditorCardProps {
  combo: ComboEditorController;
  runtimeCombo: UseRuntimeComboReturn;
  keymap: UseKeymapReturn;
  layers: Array<{ id: number; name: string }>;
  keyboardLayout: KeyboardLayoutType;
  runtimeMacros: MacroSummary[];
}

export function ComboEditorCard({
  combo,
  runtimeCombo,
  keymap,
  layers,
  keyboardLayout,
  runtimeMacros,
}: ComboEditorCardProps) {
  const { t } = useLanguage();
  const draft = combo.draft;

  const physicalLayouts = keymap.physicalLayouts?.layouts;
  const activeLayoutIndex = keymap.physicalLayouts?.activeLayoutIndex;

  const currentLayout = useMemo(() => {
    if (!physicalLayouts || activeLayoutIndex === undefined) return null;
    return physicalLayouts[activeLayoutIndex];
  }, [activeLayoutIndex, physicalLayouts]);

  const previewLayer = keymap.keymap?.layers[0] ?? null;

  return (
    <section className="glass-card p-4 tablet:p-6 min-w-0 overflow-hidden">
      {/* Editor header */}
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-medium text-[var(--color-text)]">
              {t("Combo Editor")}
            </h2>
            <StatusDot
              status={comboEditStatus(
                combo.editorSource,
                draft.index,
                combo.modifiedIndices,
              )}
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {combo.selectedComboExists ? t("Existing slot") : t("New slot")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(combo.editorSource === ComboSource.COMBO_SOURCE_DEFAULT ||
            combo.editorSource === ComboSource.COMBO_SOURCE_OVERRIDDEN) && (
            <button
              className="btn-ghost text-sm flex items-center gap-1.5"
              onClick={combo.handleResetCombo}
              disabled={runtimeCombo.isLoading}
            >
              <IconRestore size={16} />
              {t("Reset to Default")}
            </button>
          )}
          {/* Enabled toggle inline with action buttons */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-[var(--color-text-muted)]">
              {t("Enabled")}
            </span>
            <Switch.Root
              checked={draft.enabled}
              onCheckedChange={(enabled) =>
                combo.applyDraftChange({ ...draft, enabled }, true)
              }
              className="w-8 h-4 rounded-full relative data-[state=checked]:bg-[var(--color-electric)] bg-[var(--color-border)] border border-[var(--color-border)] transition-colors"
            >
              <Switch.Thumb className="block w-3 h-3 rounded-full transition-transform data-[state=checked]:translate-x-4 translate-x-0.5 will-change-transform bg-white border border-[var(--color-border)]" />
            </Switch.Root>
          </div>
          <button
            className="btn-ghost text-sm flex items-center gap-1.5"
            onClick={combo.handleDeleteCombo}
            disabled={!combo.selectedComboExists || runtimeCombo.isLoading}
          >
            <IconTrash size={16} />
            {t("Delete")}
          </button>
        </div>
      </div>

      {combo.validationError && (
        <div className="mb-4 p-3 rounded-lg border warning-banner text-sm flex items-center gap-2">
          <IconAlertTriangle size={16} className="shrink-0" />
          <span>{combo.validationError}</span>
        </div>
      )}

      {/* Name (Slot removed) */}
      <div className="mb-4">
        <label>
          <span className="text-xs text-[var(--color-text-muted)]">
            {t("Name")}
          </span>
          <input
            maxLength={MAX_NAME_LENGTH}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)]"
            value={draft.name}
            onChange={(event) =>
              combo.applyDraftChange({
                ...draft,
                name: event.target.value,
              })
            }
          />
        </label>
      </div>

      {/* Behavior — full width */}
      <div className="mb-4">
        <button
          className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-electric)]/50 text-left transition-colors"
          onClick={() => combo.setShowBehaviorSelector(true)}
        >
          <span className="block text-xs text-[var(--color-text-muted)]">
            {t("Behavior")}
          </span>
          <span className="block text-sm text-[var(--color-text)] truncate mt-1">
            {formatComboBehavior(
              draft.behavior,
              keymap.behaviors,
              layers,
              keyboardLayout,
              runtimeMacros,
              t,
            )}
          </span>
        </button>
      </div>

      {/* Layers */}
      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-xs text-[var(--color-text-muted)]">
            {t("Layers")}
          </span>
          <button
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              draft.layerMask === 0
                ? "bg-[var(--color-electric)]/20 text-[var(--color-electric)] border-[var(--color-electric)]/40"
                : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)]"
            }`}
            onClick={() =>
              combo.applyDraftChange({ ...draft, layerMask: 0 }, true)
            }
          >
            {t("All")}
          </button>
          {layers.map((layer) => (
            <button
              key={layer.id}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                draft.layerMask !== 0 && hasLayer(draft.layerMask, layer.id)
                  ? "bg-[var(--color-electric)]/20 text-[var(--color-electric)] border-[var(--color-electric)]/40"
                  : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)]"
              }`}
              onClick={() =>
                combo.applyDraftChange(
                  {
                    ...draft,
                    layerMask: toggleLayer(draft.layerMask, layer.id),
                  },
                  true,
                )
              }
              disabled={layer.id >= 32}
            >
              {layer.name || t("Layer {{id}}", { id: layer.id })}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          {formatLayerScope(draft.layerMask, t)}
        </p>
      </div>

      {/* Positions — read-only, updated via keyboard clicks */}
      <label className="block mb-4">
        <span className="text-xs text-[var(--color-text-muted)]">
          {t("Positions")}
        </span>
        <input
          readOnly
          className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] cursor-default select-none"
          value={positionsToText(draft.keyPositions)}
        />
      </label>

      {/* Keyboard layout preview */}
      {currentLayout && previewLayer && keymap.keymap && (
        <div className="rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] p-3 overflow-x-auto mb-4">
          <KeyboardLayout
            layout={currentLayout}
            layer={previewLayer}
            layers={keymap.keymap.layers}
            behaviors={keymap.behaviors}
            selectedKey={null}
            onKeyClick={combo.handlePositionToggle}
            onKeyReset={() => {}}
            isBindingModified={() => false}
            getOriginalBinding={() => null}
            keyboardLayout={keyboardLayout}
            runtimeMacros={runtimeMacros}
            highlightedKeys={combo.highlightedKeys}
          />
        </div>
      )}

      {/* Advanced Options — collapsible */}
      <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
        <button
          className="flex items-center gap-2 w-full px-3 py-2.5 text-left bg-[var(--color-bg)] hover:bg-[var(--color-border)]/50 transition-colors"
          onClick={() => combo.setIsAdvancedExpanded(!combo.isAdvancedExpanded)}
        >
          <span className="text-xs font-medium text-[var(--color-text-muted)] flex-1">
            {t("Advanced Options")}
          </span>
          <IconChevronDown
            size={13}
            className={`text-[var(--color-text-muted)] flex-shrink-0 transition-transform ${
              combo.isAdvancedExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
        {combo.isAdvancedExpanded && (
          <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
            <div className="grid grid-cols-1 tablet:grid-cols-3 gap-3">
              <label>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t("Timeout ms (0 = inherit global)")}
                </span>
                <input
                  type="number"
                  min={0}
                  max={65535}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]"
                  value={draft.timeoutMs}
                  onChange={(event) =>
                    combo.applyDraftChange({
                      ...draft,
                      timeoutMs: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t("Require prior idle ms (0 = inherit global)")}
                </span>
                <input
                  type="number"
                  min={0}
                  max={65535}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]"
                  value={draft.requirePriorIdleMs}
                  onChange={(event) =>
                    combo.applyDraftChange({
                      ...draft,
                      requirePriorIdleMs: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t("Slow release override")}
                </span>
                <select
                  className="select-field mt-1 w-full text-sm"
                  value={draft.slowReleaseOverride}
                  onChange={(event) =>
                    combo.applyDraftChange(
                      {
                        ...draft,
                        slowReleaseOverride: Number(
                          event.target.value,
                        ) as SlowReleaseOverride,
                      },
                      true,
                    )
                  }
                >
                  <option
                    value={SlowReleaseOverride.SLOW_RELEASE_OVERRIDE_INHERIT}
                  >
                    {t("Inherit global")}
                  </option>
                  <option value={SlowReleaseOverride.SLOW_RELEASE_OVERRIDE_ON}>
                    {t("On")}
                  </option>
                  <option value={SlowReleaseOverride.SLOW_RELEASE_OVERRIDE_OFF}>
                    {t("Off")}
                  </option>
                </select>
              </label>
            </div>
          </div>
        )}
      </div>

      <KeycodeSelector
        open={combo.showBehaviorSelector}
        targetLabel={`${t("Combo Editor")} · ${draft.index}`}
        onClose={() => combo.setShowBehaviorSelector(false)}
        onSelect={(binding) =>
          combo.applyDraftChange({ ...draft, behavior: binding }, true)
        }
        currentBinding={draft.behavior}
        behaviors={keymap.behaviors}
        layers={layers}
        keyboardLayout={keyboardLayout}
        behaviorQuickSelects={["kp", "lt", "mt", "none", "transparent"]}
        runtimeMacros={runtimeMacros}
      />
    </section>
  );
}
