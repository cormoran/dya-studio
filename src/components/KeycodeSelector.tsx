/**
 * KeycodeSelector Component
 *
 * A modal dialog for selecting behaviors and configuring parameters.
 * Behavior-first approach: select behavior, then configure parameters.
 * Supports various parameter types with dedicated UI selectors.
 *
 * Features:
 * - Close on select: Automatically close the dialog after selecting the last parameter
 *   (setting is persisted in localStorage)
 */
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  IconCheck,
  IconRestore,
  IconX,
  IconGripVertical,
} from "@tabler/icons-react";
import { MOUSE_KEYCODES } from "../lib/keycodes";
import {
  getBehaviorMetadata,
  formatBehaviorParam,
  filterMatchingBehaviorValueDescriptions,
  type BehaviorMetadata,
} from "../lib/behaviorMetadata";
import type { BehaviorBinding, BehaviorDefinition } from "../hooks/useKeymap";
import { EditorTooltip } from "./EditorTooltip";
import { BehaviorDropdown } from "./BehaviorDropdown";
import { ButtonListSelector } from "./ButtonListSelector";
import { KeycodeValueSelector } from "./KeycodeValueSelector";
import { RangeValueSelector } from "./RangeValueSelector";
import { MouseMoveInputSelector } from "./MouseMoveInputSelector";
import { type KeyboardLayoutType } from "../lib/keyboardLayouts";
import { BehaviorParameterValueDescription } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { useFloatingWindow } from "../hooks/useFloatingWindow";
import { useLanguage } from "../hooks/useLanguage";

// =============================================================================
// Types
// =============================================================================

/**
 * Selected behavior information for KeycodeSelector
 * Contains all necessary information for parameter configuration
 */
interface SelectedBehaviorInfo {
  behavior: BehaviorDefinition;
  // metadata defined in DYA Studio for overriding values defined in ZMK firmware
  overrideMetadata: BehaviorMetadata | null;
  // List of valid value descriptions for param1
  param1Descriptions: BehaviorParameterValueDescription[];
  // List of valid value descriptions for param2, which is filtered based on param1 value
  param2Descriptions: BehaviorParameterValueDescription[];
}

interface KeycodeSelectorProps {
  presentation?: "modal" | "floating";
  selectionKey?: string;
  /** Caller-owned identity for the item whose binding is being edited. */
  targetLabel?: ReactNode;
  toolbar?: ReactNode;
  floatingAnchorRef?: RefObject<HTMLElement | null>;
  busy?: boolean;
  error?: string | null;
  open: boolean;
  onClose: () => void;
  onSelect: (binding: BehaviorBinding) => void;
  currentBinding?: BehaviorBinding | null;
  behaviors: Map<number, BehaviorDefinition>;
  layers: Array<{ id: number; name: string }>;
  keyboardLayout?: KeyboardLayoutType;
  behaviorQuickSelects?: string[]; // Optional list of behavior displayNameVariants for quick select
  runtimeMacros?: Array<{ slot: number; name?: string }>;
  /** Opens the caller-owned runtime macro editor without changing this draft. */
  onOpenMacroEditor?: () => void;
  /** Lets a selector opened from another modal render above its parent. */
  modalLayerClassName?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get description for a parameter type
 */
function getParamTypeDescription(
  behaviorInfo: SelectedBehaviorInfo,
  paramNumber: 1 | 2,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const overrideMeta = behaviorInfo.overrideMetadata;
  // From DYA Studio override metadata
  if (overrideMeta) {
    const overrideDescription =
      paramNumber === 1
        ? overrideMeta.param1Description
        : overrideMeta.param2Description;
    if (overrideDescription) {
      return t(overrideDescription);
    }
  }
  // From firmware metadata
  const paramDescriptions =
    paramNumber === 1
      ? behaviorInfo.param1Descriptions
      : behaviorInfo.param2Descriptions;
  if (paramDescriptions.length == 1) {
    const description = paramDescriptions[0];
    const name = description.layerId
      ? t("Layer")
      : description.hidUsage
        ? t("Keycode")
        : description.name;
    return t("Select {{name}}", { name });
  }
  return t("Select options"); // Contains constant from multiple options
}

function getParamDisplayName(
  behaviorInfo: SelectedBehaviorInfo,
  paramNumber: 1 | 2,
  t: (key: string) => string,
): string {
  const descriptions =
    paramNumber === 1
      ? behaviorInfo.param1Descriptions
      : behaviorInfo.param2Descriptions;
  const names = [
    ...new Set(descriptions.map((description) => description.name)),
  ];
  return names.length === 1 && names[0]
    ? t(names[0])
    : t(paramNumber === 1 ? "param1" : "param2");
}

/**
 * Format parameter value for display
 */
function formatParamValue(
  behaviorInfo: SelectedBehaviorInfo,
  param1: number,
  param2: number,
  paramNumber: 1 | 2,
  layers: Array<{ id: number; name: string }>,
  keyboardLayout?: KeyboardLayoutType,
  runtimeMacros?: Array<{ slot: number; name?: string }>,
): string {
  const behavior = behaviorInfo.behavior;
  // From DYA Studio override metadata
  const overrideMeta = behaviorInfo.overrideMetadata;
  if (overrideMeta?.formatParam) {
    return overrideMeta.formatParam(param1, param2, paramNumber, {
      layers,
      keyboardLayout,
      runtimeMacros,
    });
  }
  // From firmware metadata
  return formatBehaviorParam(behavior, param1, param2, paramNumber, {
    layers,
    keyboardLayout,
    runtimeMacros,
  });
}

function buildSelectedBehaviorInfo(
  behaviors: Map<number, BehaviorDefinition>,
  selectedBehavior: number | null,
  param1: number,
): SelectedBehaviorInfo | null {
  if (selectedBehavior === null) return null;
  const behavior = behaviors.get(selectedBehavior);
  if (!behavior) {
    return null; // Behavior not found in the firmware - this shouldn't happen but we should handle it gracefully
  }
  const validParamSetsForParam1 = behavior?.metadata
    ?.map((m) => {
      return {
        ...m,
        param1: m.param1.filter((desc) =>
          filterMatchingBehaviorValueDescriptions(desc, null),
        ),
        param2: m.param2.filter((desc) =>
          filterMatchingBehaviorValueDescriptions(desc, null),
        ),
      };
    })
    .filter((m) => m.param1.length > 0);
  const param1MatchingParamSetsForParam2 = validParamSetsForParam1
    .filter((m) => m.param2.length > 0)
    .map((m) => {
      return {
        ...m,
        param1: m.param1.filter((desc) =>
          filterMatchingBehaviorValueDescriptions(desc, param1),
        ),
      };
    })
    .filter((m) => m.param1.length > 0);

  // Use metadata if available, otherwise fall back to BehaviorDefinition.metadata
  const overrideMetadata = getBehaviorMetadata(behavior.displayName);
  return {
    behavior,
    overrideMetadata,
    param1Descriptions: validParamSetsForParam1.flatMap((m) => m.param1),
    param2Descriptions: param1MatchingParamSetsForParam2.flatMap(
      (m) => m.param2,
    ),
  };
}

function hasParam(
  behaviorInfo: SelectedBehaviorInfo | null,
  paramNumber: 1 | 2,
): boolean {
  if (!behaviorInfo) return false;
  const overrideMeta = behaviorInfo.overrideMetadata;
  const overrideType =
    paramNumber === 1 ? overrideMeta?.param1Type : overrideMeta?.param2Type;
  if (overrideType) {
    return true;
  }
  // Fallback to checking if there are any value descriptions for the parameter
  const descriptions =
    paramNumber === 1
      ? behaviorInfo.param1Descriptions
      : behaviorInfo.param2Descriptions;
  return descriptions.length > 0;
}

// =============================================================================
// Main Component
// =============================================================================

export function KeycodeSelector({
  presentation = "modal",
  selectionKey,
  targetLabel,
  toolbar,
  floatingAnchorRef,
  busy = false,
  error,
  open,
  onClose,
  onSelect,
  currentBinding,
  behaviors,
  layers,
  keyboardLayout,
  behaviorQuickSelects,
  runtimeMacros = [],
  onOpenMacroEditor,
  modalLayerClassName = "z-50",
}: KeycodeSelectorProps) {
  const { t } = useLanguage();
  const floating = presentation === "floating";
  const activePresentation = useRef(presentation);
  useEffect(() => {
    activePresentation.current = presentation;
  }, [presentation]);
  const floatingWindow = useFloatingWindow(floating, open, floatingAnchorRef);
  const editingNumber = useRef(false);
  // State
  const [selectedBehavior, setSelectedBehavior] = useState<number | null>(null);
  const [param1, setParam1] = useState<number>(0);
  const [param2, setParam2] = useState<number>(0);
  const [activeParam, setActiveParam] = useState<1 | 2>(1);
  const [savedCloseOnSelect, setCloseOnSelect] = useState<boolean>(() => {
    const saved = localStorage.getItem("keycodeSelectorCloseOnSelect");
    return saved !== null ? saved === "true" : true;
  });
  const closeOnSelect = floating || savedCloseOnSelect;
  const [wasOpened, setWasOpened] = useState<boolean>(false);

  // Initial values to detect changes
  const [initialValues, setInitialValues] = useState<{
    behaviorId: number | null;
    param1: number;
    param2: number;
  }>({ behaviorId: null, param1: 0, param2: 0 });

  // Save closeOnSelect setting to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "keycodeSelectorCloseOnSelect",
      String(savedCloseOnSelect),
    );
  }, [savedCloseOnSelect]);

  // Check if values have changed
  const hasChanges = useMemo(() => {
    return (
      selectedBehavior !== initialValues.behaviorId ||
      param1 !== initialValues.param1 ||
      param2 !== initialValues.param2
    );
  }, [selectedBehavior, param1, param2, initialValues]);

  // Get selected behavior info
  const selectedBehaviorInfo = useMemo(
    (): SelectedBehaviorInfo | null =>
      buildSelectedBehaviorInfo(behaviors, selectedBehavior, param1),
    [selectedBehavior, behaviors, param1],
  );

  // Check if behavior needs parameters
  const needsParam1 = hasParam(selectedBehaviorInfo, 1);
  const needsParam2 = hasParam(selectedBehaviorInfo, 2);
  const needsAnyParam = needsParam1 || needsParam2;

  // Handle behavior selection from dropdown
  const handleBehaviorSelect = useCallback(
    (behaviorId: number) => {
      const behavior = behaviors.get(behaviorId);
      if (!behavior) return;

      setSelectedBehavior(behaviorId);
      setParam1(0);
      setParam2(0);
      setActiveParam(1);

      // Check if behavior needs params using fallback
      const nextSelectedBehaviorInfo = buildSelectedBehaviorInfo(
        behaviors,
        behaviorId,
        0,
      );
      const needsAnyParam =
        hasParam(nextSelectedBehaviorInfo, 1) ||
        hasParam(nextSelectedBehaviorInfo, 2);

      // If behavior doesn't need params and closeOnSelect is enabled, apply immediately
      if (closeOnSelect && !needsAnyParam) {
        onSelect({
          behaviorId,
          param1: 0,
          param2: 0,
        });
        if (!floating) onClose();
      }
    },
    [behaviors, closeOnSelect, onSelect, onClose, floating],
  );

  const handleParam1Change = useCallback(
    (value: number, shouldNotClose?: boolean) => {
      setParam1(value);
      if (floating && editingNumber.current) return;
      const nextSelectedBehaviorInfo = buildSelectedBehaviorInfo(
        behaviors,
        selectedBehavior,
        value,
      );
      const needsParam2 = hasParam(nextSelectedBehaviorInfo, 2);
      if (needsParam2) {
        setActiveParam(2);
      } else {
        if (
          shouldNotClose !== true &&
          closeOnSelect &&
          selectedBehavior !== null
        ) {
          // If param1 is the last param and closeOnSelect is enabled, apply and close
          onSelect({
            behaviorId: selectedBehavior,
            param1: value,
            param2: 0,
          });
          if (!floating) onClose();
        }
        if (param2 !== 0) {
          setParam2(0);
        }
      }
    },
    [
      behaviors,
      closeOnSelect,
      onClose,
      onSelect,
      param2,
      selectedBehavior,
      floating,
    ],
  );

  const handleMacroSelect = useCallback(
    (slot: number) => {
      const runtimeMacroBehavior = Array.from(behaviors.values()).find(
        (behavior) =>
          getBehaviorMetadata(behavior.displayName)?.param1Type === "macro",
      );
      if (!runtimeMacroBehavior) return;

      setSelectedBehavior(runtimeMacroBehavior.id);
      setParam1(slot);
      setParam2(0);
      setActiveParam(1);
      if (closeOnSelect) {
        onSelect({
          behaviorId: runtimeMacroBehavior.id,
          param1: slot,
          param2: 0,
        });
        if (!floating) onClose();
      }
    },
    [behaviors, closeOnSelect, floating, onClose, onSelect],
  );

  const handleParam2Change = useCallback(
    (value: number, shouldNotClose?: boolean) => {
      setParam2(value);
      if (floating && editingNumber.current) return;
      // If param2 is set and closeOnSelect is enabled, apply and close
      if (
        shouldNotClose !== true &&
        closeOnSelect &&
        selectedBehavior !== null
      ) {
        onSelect({
          behaviorId: selectedBehavior,
          param1,
          param2: value,
        });
        if (!floating) onClose();
      }
    },
    [closeOnSelect, selectedBehavior, param1, onSelect, onClose, floating],
  );

  // Handle revert button click
  const handleRevert = useCallback(() => {
    setSelectedBehavior(initialValues.behaviorId);
    setParam1(initialValues.param1);
    setParam2(initialValues.param2);
    setActiveParam(1);
  }, [initialValues.behaviorId, initialValues.param1, initialValues.param2]);

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        // Pre-select current binding if available
        if (currentBinding) {
          setSelectedBehavior(currentBinding.behaviorId);
          setParam1(currentBinding.param1);
          setParam2(currentBinding.param2);
          setInitialValues({
            behaviorId: currentBinding.behaviorId,
            param1: currentBinding.param1,
            param2: currentBinding.param2,
          });
        } else {
          // Default to keypress behavior
          const kpMetadata = getBehaviorMetadata("kp");
          if (kpMetadata) {
            const kpBehavior = Array.from(behaviors.values()).find((b) =>
              kpMetadata.displayNameVariants.includes(b.displayName),
            );
            if (kpBehavior) {
              setSelectedBehavior(kpBehavior.id);
              setInitialValues({
                behaviorId: kpBehavior.id,
                param1: 0,
                param2: 0,
              });
            }
          }
          setParam1(0);
          setParam2(0);
        }
        setActiveParam(1);
        setWasOpened(true);
      } else {
        // A no-op close must not make callers dirty by resending the initial
        // binding. A changed modal draft still applies when it closes.
        if (!floating && selectedBehavior !== null && wasOpened && hasChanges) {
          setWasOpened(false);
          onSelect({
            behaviorId: selectedBehavior,
            param1,
            param2,
          });
          setInitialValues({
            behaviorId: selectedBehavior,
            param1: param1,
            param2: param2,
          });
        }
        onClose();
      }
    },
    [
      onClose,
      currentBinding,
      behaviors,
      selectedBehavior,
      param1,
      param2,
      onSelect,
      wasOpened,
      floating,
      hasChanges,
    ],
  );

  // Run handleOpenChange on mount if open is true
  useEffect(() => {
    if (open) {
      handleOpenChange(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectionKey]);

  // Render parameter value selector based on type
  const renderParamValueSelector = useCallback(
    (
      param1: number,
      param2: number,
      onChange: (v: number, shouldNotClose?: boolean) => void,
      paramNumber: 1 | 2,
      toolbar?: ReactNode,
    ) => {
      const value = paramNumber === 1 ? param1 : param2;

      const overrideMeta = selectedBehaviorInfo?.overrideMetadata;
      const overrideType =
        paramNumber === 1 ? overrideMeta?.param1Type : overrideMeta?.param2Type;
      // From DYA Studio override metadata
      if (overrideType) {
        switch (overrideType) {
          case "macro":
            if (runtimeMacros.length > 0 || onOpenMacroEditor) {
              return (
                <div className="space-y-2">
                  {runtimeMacros.length > 0 && (
                    <ButtonListSelector
                      options={runtimeMacros.map((macro) => ({
                        value: macro.slot,
                        label: macro.name || `Macro ${macro.slot}`,
                      }))}
                      value={value}
                      onChange={onChange}
                      columns={Math.min(runtimeMacros.length, 4)}
                    />
                  )}
                  {onOpenMacroEditor && (
                    <button
                      type="button"
                      className="w-full rounded-lg border border-dashed border-[var(--color-electric)]/60 px-3 py-2 text-sm font-medium text-[var(--color-electric)] hover:bg-[var(--color-electric)]/10"
                      onClick={onOpenMacroEditor}
                    >
                      {t("New macro")}
                    </button>
                  )}
                </div>
              );
            }
            return (
              <input
                type="number"
                min={0}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-electric)]/50"
              />
            );

          case "mouse_keycode":
            return (
              <ButtonListSelector
                options={MOUSE_KEYCODES.map((mk) => ({
                  value: mk.value,
                  label: mk.label,
                  shortLabel: mk.shortLabel,
                }))}
                value={value}
                onChange={onChange}
                columns={3}
              />
            );

          case "mouse_movement":
            return (
              <MouseMoveInputSelector
                value={value}
                onChange={onChange}
                isScroll={false}
              />
            );

          case "mouse_scroll":
            return (
              <MouseMoveInputSelector
                value={value}
                onChange={onChange}
                isScroll={true}
              />
            );
        }
      }

      // Fallback: use BehaviorDefinition metadata from firmware
      if (selectedBehaviorInfo !== null) {
        // accumulate descriptions to collect all constants
        const descriptions =
          paramNumber === 1
            ? selectedBehaviorInfo.param1Descriptions
            : selectedBehaviorInfo.param2Descriptions;
        const groupByType = descriptions.reduce(
          (acc, desc) => {
            if (desc.constant !== undefined) {
              acc.constants.push(desc);
            } else if (desc.range !== undefined) {
              acc.ranges.push(desc);
            } else if (desc.hidUsage !== undefined) {
              acc.hidUsages.push(desc);
            } else if (desc.layerId !== undefined) {
              acc.layerIds.push(desc);
            } else {
              acc.others.push(desc);
            }
            return acc;
          },
          {
            constants: [] as BehaviorParameterValueDescription[],
            ranges: [] as BehaviorParameterValueDescription[],
            layerIds: [] as BehaviorParameterValueDescription[],
            hidUsages: [] as BehaviorParameterValueDescription[],
            others: [] as BehaviorParameterValueDescription[],
          },
        );
        return (
          <>
            {/* layerIds */}
            {groupByType.layerIds.length > 0 && (
              <ButtonListSelector
                options={layers.map((l) => ({
                  value: l.id,
                  label: l.name || `Layer ${l.id}`,
                }))}
                value={value}
                onChange={onChange}
                columns={Math.min(layers.length, 4)}
              />
            )}
            {/* ranges */}
            {groupByType.ranges.length > 0 && (
              <RangeValueSelector
                min={groupByType.ranges.reduce(
                  (min, desc) => Math.min(min, desc.range?.min ?? 0),
                  Infinity,
                )}
                max={groupByType.ranges.reduce(
                  (max, desc) => Math.max(max, desc.range?.max ?? 0),
                  -Infinity,
                )}
                value={value}
                onChange={onChange}
              />
            )}
            {/* constants */}
            {groupByType.constants.length > 0 && (
              <ButtonListSelector
                options={groupByType.constants.map((l) => ({
                  value: l.constant!,
                  label: `${l.name} (${l.constant})`,
                }))}
                value={value}
                onChange={onChange}
                columns={Math.min(groupByType.constants.length, 4)}
              />
            )}
            {/* hidUsages */}
            {groupByType.hidUsages.length > 0 && (
              <KeycodeValueSelector
                key={floating ? "floating" : "modal"}
                compact={floating}
                collapseModifiersOnMobile={!floating}
                toolbar={toolbar}
                value={value}
                onChange={onChange}
                showModifiers={true}
                keyboardLayout={keyboardLayout}
              />
            )}
            {groupByType.others.length > 0 && (
              <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-electric)]/50"
              />
            )}
          </>
        );
      }
      return null;
    },
    [
      layers,
      selectedBehaviorInfo,
      keyboardLayout,
      runtimeMacros,
      floating,
      onOpenMacroEditor,
      t,
    ],
  );

  const activeDescriptions =
    activeParam === 1
      ? selectedBehaviorInfo?.param1Descriptions
      : selectedBehaviorInfo?.param2Descriptions;
  const activeOverride =
    activeParam === 1
      ? selectedBehaviorInfo?.overrideMetadata?.param1Type
      : selectedBehaviorInfo?.overrideMetadata?.param2Type;
  const inlineParamToolbar =
    !["macro", "mouse_keycode", "mouse_movement", "mouse_scroll"].includes(
      activeOverride ?? "",
    ) &&
    activeDescriptions?.some(
      (description) => description.hidUsage !== undefined,
    );
  const parameterTabs = selectedBehaviorInfo && (
    <div
      className={`flex h-7 min-w-0 shrink-0 overflow-x-auto ${inlineParamToolbar ? "flex-1" : "mx-2 mt-2"}`}
    >
      {([1, 2] as const)
        .filter((number) => (number === 1 ? needsParam1 : needsParam2))
        .map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => setActiveParam(number)}
            className={`flex min-w-0 items-center gap-1 border-b-2 px-2 py-1 text-xs transition-colors ${activeParam === number ? "border-[var(--color-electric)] text-[var(--color-electric)]" : "border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50"}`}
          >
            <span className="text-xs whitespace-nowrap">
              {getParamDisplayName(selectedBehaviorInfo, number, t)}:
            </span>
            <span className="truncate text-xs font-mono text-[var(--color-neon)]">
              {formatParamValue(
                selectedBehaviorInfo,
                param1,
                param2,
                number,
                layers,
                keyboardLayout,
                runtimeMacros,
              )}
            </span>
          </button>
        ))}
      <span
        role="status"
        data-testid="active-param-description"
        className="ml-2 min-w-[8rem] flex-1 self-center truncate text-xs text-[var(--color-text-muted)]"
      >
        {getParamTypeDescription(selectedBehaviorInfo, activeParam, t)}
      </span>
    </div>
  );

  return (
    <Dialog.Root
      key={presentation}
      open={open}
      modal={!floating}
      onOpenChange={handleOpenChange}
    >
      <Dialog.Portal>
        {!floating && (
          <Dialog.Overlay
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm ${modalLayerClassName}`}
          />
        )}
        <div
          className={
            floating
              ? "fixed inset-0 z-50 overflow-hidden pointer-events-none [contain:paint]"
              : "contents"
          }
        >
          <Dialog.Content
            ref={floatingWindow.ref}
            style={floatingWindow.style}
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              // A mode switch replaces the Radix focus scope. Its delayed
              // cleanup must not move focus out of the newly opened dialog.
              if (activePresentation.current !== presentation)
                event.preventDefault();
            }}
            onInteractOutside={
              floating ? (event) => event.preventDefault() : undefined
            }
            className={
              floating
                ? "pointer-events-auto fixed bottom-3 right-[var(--floating-right,0px)] w-[680px] max-w-full h-[min(480px,calc(100dvh-24px))] bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-2xl z-50 flex flex-col overflow-hidden"
                : `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full tablet:w-[90vw] max-w-4xl h-full tablet:h-[85vh] bg-[var(--color-surface)] rounded-none tablet:rounded-xl border border-[var(--color-border)] shadow-2xl ${modalLayerClassName} flex flex-col overflow-hidden`
            }
          >
            {error && (
              <p role="alert" className="px-4 text-sm text-red-500">
                {error}
              </p>
            )}
            <fieldset
              disabled={busy}
              className="flex flex-col flex-1 min-h-0 min-w-0 overflow-y-auto"
            >
              {/* Header with mode-specific ending action */}
              <div
                {...floatingWindow.handleProps}
                className={`flex items-center border-b border-[var(--color-border)] shrink-0 ${floating ? "gap-1 px-2 py-1 cursor-move touch-none select-none" : "gap-3 p-4"}`}
              >
                {floating && (
                  <IconGripVertical
                    size={14}
                    className="shrink-0 text-[var(--color-text-muted)]"
                  />
                )}
                <Dialog.Title className="sr-only">
                  {t("Select Key Binding")}
                </Dialog.Title>
                <div className="min-w-0 flex-1">
                  {!floating && (
                    <span className="text-xs font-medium text-[var(--color-text-muted)]">
                      {t("Select Keymap")}
                    </span>
                  )}
                  {targetLabel && (
                    <p
                      role="status"
                      data-testid="binding-editor-target"
                      className={`min-w-0 truncate font-medium text-[var(--color-text)] ${
                        floating ? "text-xs" : "text-sm"
                      }`}
                    >
                      {targetLabel}
                    </p>
                  )}
                </div>
                {floating &&
                  selectedBehaviorInfo?.overrideMetadata?.description && (
                    <span className="min-w-0 truncate text-xs text-[var(--color-text-muted)]">
                      {t(selectedBehaviorInfo.overrideMetadata.description)}
                    </span>
                  )}
                <div
                  data-testid="binding-editor-actions"
                  className="ml-auto flex shrink-0 items-center gap-1"
                >
                  {toolbar}
                  {!floating && (
                    <EditorTooltip
                      content={t(
                        "Apply the binding after selecting its final parameter",
                      )}
                    >
                      <button
                        type="button"
                        aria-label={t("Close on select")}
                        aria-pressed={closeOnSelect}
                        onClick={() => setCloseOnSelect((enabled) => !enabled)}
                        className={`p-1 rounded transition-colors ${closeOnSelect ? "bg-[var(--color-electric)]/15 text-[var(--color-electric)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"}`}
                      >
                        <IconCheck size={16} />
                      </button>
                    </EditorTooltip>
                  )}
                  {hasChanges && (
                    <EditorTooltip
                      content={t(
                        "Restore the binding shown when this editor opened",
                      )}
                    >
                      <button
                        className="p-1 rounded text-red-600 hover:bg-red-50"
                        aria-label={t("Revert")}
                        onClick={handleRevert}
                      >
                        <IconRestore size={16} className="animate-pulse" />
                      </button>
                    </EditorTooltip>
                  )}
                  <EditorTooltip
                    content={
                      floating
                        ? t("Close without applying unfinished edits")
                        : t("Apply changes and close")
                    }
                  >
                    <Dialog.Close asChild>
                      <button
                        className="p-1 rounded hover:bg-[var(--color-border)] transition-colors"
                        aria-label={
                          floating
                            ? t("Close without applying unfinished edits")
                            : t("Apply changes and close")
                        }
                      >
                        {floating ? (
                          <IconX
                            size={20}
                            className="text-[var(--color-text-muted)]"
                          />
                        ) : (
                          <IconCheck
                            size={20}
                            className="text-[var(--color-electric)]"
                          />
                        )}
                      </button>
                    </Dialog.Close>
                  </EditorTooltip>
                </div>
              </div>

              {/* Behavior Selection */}
              <div
                className={`${floating ? "px-2 py-1" : "p-4"} border-b border-[var(--color-border)] shrink-0`}
              >
                <label
                  className={
                    floating
                      ? "sr-only"
                      : "block text-xs font-medium text-[var(--color-text-muted)] mb-1"
                  }
                >
                  {t("Behavior")}
                </label>
                {behaviors.size === 0 ? (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-600">
                    ⚠️ {t("Behaviors not loaded from keyboard.")}
                  </div>
                ) : (
                  <BehaviorDropdown
                    compact={floating}
                    behaviors={behaviors}
                    selectedBehaviorId={selectedBehavior}
                    onSelect={handleBehaviorSelect}
                    onQuickSelect={handleBehaviorSelect}
                    quickSelects={behaviorQuickSelects}
                    runtimeMacros={runtimeMacros}
                    onMacroSelect={handleMacroSelect}
                  />
                )}
              </div>

              {/* Parameter Selection - Horizontal Layout */}
              {selectedBehaviorInfo && needsAnyParam && (
                <div
                  className={`flex-1 flex flex-col overflow-hidden ${floating ? "min-h-[240px]" : "min-h-0"}`}
                >
                  {/* Parameters Label */}
                  <div
                    className={`px-4 pt-4 pb-1 ${floating ? "hidden" : "hidden tablet:block"}`}
                  >
                    <label className="text-xs font-medium text-[var(--color-text-muted)]">
                      {t("Parameters")}
                    </label>
                  </div>
                  {!inlineParamToolbar && parameterTabs}

                  {/* Parameter Value Selector */}
                  <div
                    className={`flex-1 ${
                      floating
                        ? "p-2 overflow-y-auto"
                        : inlineParamToolbar
                          ? "px-4 pt-2 pb-4 overflow-hidden"
                          : "p-4 overflow-hidden"
                    } flex flex-col`}
                    onFocusCapture={(event) => {
                      editingNumber.current =
                        event.target instanceof HTMLInputElement &&
                        event.target.type === "number";
                    }}
                    onBlurCapture={() => {
                      editingNumber.current = false;
                    }}
                    onKeyDown={(event) => {
                      if (
                        floating &&
                        event.key === "Enter" &&
                        event.target instanceof HTMLInputElement &&
                        event.target.type === "number"
                      ) {
                        event.preventDefault();
                        editingNumber.current = false;
                        if (activeParam === 1) handleParam1Change(param1);
                        else handleParam2Change(param2);
                      }
                    }}
                  >
                    {activeParam === 1 && needsParam1
                      ? renderParamValueSelector(
                          param1,
                          param2,
                          handleParam1Change,
                          1,
                          inlineParamToolbar ? parameterTabs : undefined,
                        )
                      : activeParam === 2 && needsParam2
                        ? renderParamValueSelector(
                            param1,
                            param2,
                            handleParam2Change,
                            2,
                            inlineParamToolbar ? parameterTabs : undefined,
                          )
                        : null}
                    {activeOverride === "macro" && onOpenMacroEditor && (
                      <button
                        type="button"
                        className="mt-3 self-start rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-electric)]/50 hover:text-[var(--color-text)]"
                        onClick={onOpenMacroEditor}
                      >
                        {t("Edit macros")}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* No Parameters Message */}
              {selectedBehaviorInfo && !needsAnyParam && (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="text-4xl mb-4">
                      {selectedBehaviorInfo.behavior.displayName === "none" ||
                      selectedBehaviorInfo.behavior.displayName === "trans"
                        ? "✓"
                        : "⚡"}
                    </div>
                    <p className="text-[var(--color-text-secondary)]">
                      {selectedBehaviorInfo.behavior.displayName}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      No parameters needed
                    </p>
                  </div>
                </div>
              )}
            </fieldset>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
