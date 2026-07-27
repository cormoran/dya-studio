import { useMemo, useState, useRef } from "react";
import {
  IconAlertTriangleFilled,
  IconChevronLeft,
  IconChevronRight,
  IconCpu,
  IconLoader2,
  IconMouse,
  IconPointer,
  IconRefresh,
} from "@tabler/icons-react";
import * as Switch from "@radix-ui/react-switch";
import { useRuntimeInputProcessor } from "../hooks/useRuntimeInputProcessor";
import {
  CustomSettingsSectionCard,
  PMW3610_CUSTOM_SETTINGS_IDENTIFIER,
} from "../components/AdvancedSettingsSection";
import { StatusDot } from "../components/EditStatusIndicator";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { DocTip } from "../components/DocTip";
import { processorDoc, pmw3610Doc } from "../i18n/featureDocs";
import { AxisSnapMode } from "../proto/zmk/runtime_input_processor/runtime_input_processor";
import { useCustomSettings } from "../hooks/useCustomSettings";
import { useDebouncedSave } from "../hooks/useDebouncedSave";
import { useKeymap } from "../hooks/useKeymap";
import { MEMORY_WRITE_DEBOUNCE_MS } from "../hooks/useDebouncedMemoryWrite";
import { useLanguage } from "../hooks/useLanguage";

// Which detail is shown in the right pane: the selected runtime input
// processor, or one PMW3610 driver section (keyed by its subsystem index).
type RightView = { kind: "processor" } | { kind: "pmw3610"; index: number };

interface LayerInfo {
  id: number;
  name: string;
}

// Visualizes a processor's "Active on Layers" (filled squares) and its
// "Temporary Layer" target (ringed square) as a compact grid of layer cells.
function LayerGrid({
  layers,
  activeLayers,
  tempLayerEnabled,
  tempLayerLayer,
}: {
  layers: LayerInfo[];
  activeLayers: number;
  tempLayerEnabled: boolean;
  tempLayerLayer: number;
}) {
  const { t } = useLanguage();

  if (layers.length === 0) {
    return (
      <span className="text-[10px] text-[var(--color-text-muted)]">
        {t("Loading layers...")}
      </span>
    );
  }

  // A bitmask of 0 means the processor is active on every layer.
  const allActive = activeLayers === 0;

  return (
    <div className="flex flex-wrap gap-1">
      {layers.map((layer) => {
        const isActive = allActive || (activeLayers & (1 << layer.id)) !== 0;
        const isTemp = tempLayerEnabled && tempLayerLayer === layer.id;
        const label = layer.name || t("Layer {{id}}", { id: layer.id });
        return (
          <span
            key={layer.id}
            title={
              isTemp
                ? t("{{layer}} — temporary layer target", { layer: label })
                : isActive
                  ? t("{{layer}} — active", { layer: label })
                  : t("{{layer}} — inactive", { layer: label })
            }
            className={`flex h-5 w-5 items-center justify-center rounded border text-[10px] font-mono transition-colors ${
              isActive
                ? "border-[var(--color-electric)]/50 bg-[var(--color-electric)]/20 text-[var(--color-electric)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
            } ${isTemp ? "ring-2 ring-[var(--color-cyber)]" : ""}`}
          >
            {layer.id}
          </span>
        );
      })}
    </div>
  );
}

const SCALING_MIN = 0.01;
const SCALING_MAX = 10;
const SCALING_STEPS = 100;
const SCALING_BUTTON_STEP = 0.05;
const SCALING_PRECISION = 1000;
const ROTATION_MIN = -180;
const ROTATION_MAX = 180;
const ROTATION_STEP = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

function scalingIndexToValue(index: number): number {
  const normalized = clamp(index, 0, SCALING_STEPS) / SCALING_STEPS;
  return SCALING_MIN * (SCALING_MAX / SCALING_MIN) ** normalized;
}

function scalingValueToIndex(value: number): number {
  const clampedValue = clamp(value, SCALING_MIN, SCALING_MAX);
  const normalized =
    Math.log(clampedValue / SCALING_MIN) / Math.log(SCALING_MAX / SCALING_MIN);
  return Math.round(normalized * SCALING_STEPS);
}

function scalingValueToFraction(value: number): {
  multiplier: number;
  divisor: number;
} {
  const multiplier = Math.round(value * SCALING_PRECISION);
  const divisor = SCALING_PRECISION;
  const divisorValue = gcd(multiplier, divisor);
  return {
    multiplier: multiplier / divisorValue,
    divisor: divisor / divisorValue,
  };
}

function scalingValueToButtonStep(value: number, direction: -1 | 1): number {
  const stepCount = Math.round(value / SCALING_BUTTON_STEP) + direction;
  return clamp(stepCount * SCALING_BUTTON_STEP, SCALING_MIN, SCALING_MAX);
}

function formatScalingValue(value: number): string {
  return value.toFixed(2);
}

export function TrackballPage() {
  const { t } = useLanguage();
  const {
    isAvailable,
    processors,
    layers,
    isLoading,
    error,
    loadProcessors,
    setScaling,
    setRotation,
    setTempLayerEnabled,
    setTempLayerLayer,
    setTempLayerActivationDelay,
    setTempLayerDeactivationDelay,
    setActiveLayers,
    setAxisSnapMode,
    setAxisSnapThreshold,
    setAxisSnapTimeout,
    setXInvert,
    setYInvert,
    setXyToScrollEnabled,
    setXySwapEnabled,
  } = useRuntimeInputProcessor();

  // PMW3610 driver sections (custom settings) shown in the left list. Scoped to
  // the pmw3610 subsystem so unrelated custom subsystems aren't fetched here.
  const customSettings = useCustomSettings({
    subsystemIdentifier: PMW3610_CUSTOM_SETTINGS_IDENTIFIER,
  });
  const { keymap, behaviors, isLoading: keymapLoading } = useKeymap();
  const keymapLayers = useMemo<LayerInfo[]>(
    () =>
      keymap?.layers.map((layer) => ({
        id: layer.id,
        name: layer.name || t("Layer {{id}}", { id: layer.id }),
      })) ?? [],
    [keymap?.layers, t],
  );
  const pmw3610Sections = useMemo(
    () =>
      customSettings.sections.filter(
        (section) => section.identifier === PMW3610_CUSTOM_SETTINGS_IDENTIFIER,
      ),
    [customSettings.sections],
  );

  // Selected processor index
  const [selectedProcessorIndex, setSelectedProcessorIndex] = useState(0);

  // Which detail pane is shown on the right.
  const [rightView, setRightView] = useState<RightView>({ kind: "processor" });

  // Rotation enabled state
  const [rotationEnabled, setRotationEnabled] = useState(false);

  // Active layers mode: "all" or "specific"
  const [activeLayersMode, setActiveLayersMode] = useState<"all" | "specific">(
    "all",
  );

  // Debounced save hooks for each field
  const scalingMultiplierSave = useDebouncedSave<number>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const scalingDivisorSave = useDebouncedSave<number>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const rotationSave = useDebouncedSave<number>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const tempLayerEnabledSave = useDebouncedSave<boolean>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const tempLayerLayerSave = useDebouncedSave<number>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const tempLayerActivationDelaySave = useDebouncedSave<number>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const tempLayerDeactivationDelaySave = useDebouncedSave<number>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const activeLayersSave = useDebouncedSave<number>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const axisSnapModeSave = useDebouncedSave<AxisSnapMode>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const axisSnapThresholdSave = useDebouncedSave<number>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const axisSnapTimeoutSave = useDebouncedSave<number>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const xInvertSave = useDebouncedSave<boolean>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const yInvertSave = useDebouncedSave<boolean>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const xyToScrollEnabledSave = useDebouncedSave<boolean>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });
  const xySwapEnabledSave = useDebouncedSave<boolean>({
    delay: MEMORY_WRITE_DEBOUNCE_MS,
  });

  // Track previous processor to detect changes and reset pending state
  const previousProcessorRef = useRef<string | null>(null);

  // Get the selected processor
  const processor = processors[selectedProcessorIndex] || null;

  // Reset pending state when processor changes
  const currentProcessorName = processor?.name || null;
  if (previousProcessorRef.current !== currentProcessorName) {
    previousProcessorRef.current = currentProcessorName;
    scalingMultiplierSave.reset();
    scalingDivisorSave.reset();
    rotationSave.reset();
    tempLayerEnabledSave.reset();
    tempLayerLayerSave.reset();
    tempLayerActivationDelaySave.reset();
    tempLayerDeactivationDelaySave.reset();
    activeLayersSave.reset();
    axisSnapModeSave.reset();
    axisSnapThresholdSave.reset();
    axisSnapTimeoutSave.reset();
    xInvertSave.reset();
    yInvertSave.reset();
    xyToScrollEnabledSave.reset();
    xySwapEnabledSave.reset();
    setRotationEnabled(processor?.rotationDegrees !== 0);
    setActiveLayersMode(processor?.activeLayers === 0 ? "all" : "specific");
  }

  // Calculate display values with pending states
  const displayScalingMultiplier =
    scalingMultiplierSave.pendingValue ?? processor?.scaleMultiplier ?? 1;
  const displayScalingDivisor =
    scalingDivisorSave.pendingValue ?? processor?.scaleDivisor ?? 1;
  const displayRotation =
    rotationSave.pendingValue ?? processor?.rotationDegrees ?? 0;
  const displayTempLayerEnabled =
    tempLayerEnabledSave.pendingValue ?? processor?.tempLayerEnabled ?? false;
  const displayTempLayerLayer =
    tempLayerLayerSave.pendingValue ?? processor?.tempLayerLayer ?? 0;
  const displayTempLayerActivationDelay =
    tempLayerActivationDelaySave.pendingValue ??
    processor?.tempLayerActivationDelayMs ??
    100;
  const displayTempLayerDeactivationDelay =
    tempLayerDeactivationDelaySave.pendingValue ??
    processor?.tempLayerDeactivationDelayMs ??
    500;
  const displayActiveLayers =
    activeLayersSave.pendingValue ?? processor?.activeLayers ?? 0;
  const displayAxisSnapMode =
    axisSnapModeSave.pendingValue ??
    processor?.axisSnapMode ??
    AxisSnapMode.AXIS_SNAP_MODE_NONE;
  const displayAxisSnapThreshold =
    axisSnapThresholdSave.pendingValue ?? processor?.axisSnapThreshold ?? 50;
  const displayAxisSnapTimeout =
    axisSnapTimeoutSave.pendingValue ?? processor?.axisSnapTimeoutMs ?? 200;
  const displayXInvert =
    xInvertSave.pendingValue ?? processor?.xInvert ?? false;
  const displayYInvert =
    yInvertSave.pendingValue ?? processor?.yInvert ?? false;
  const displayXyToScrollEnabled =
    xyToScrollEnabledSave.pendingValue ?? processor?.xyToScrollEnabled ?? false;
  const displayXySwapEnabled =
    xySwapEnabledSave.pendingValue ?? processor?.xySwapEnabled ?? false;

  // Calculate final scaling value (multiplier/divisor)
  const finalScalingValue =
    displayScalingDivisor !== 0
      ? displayScalingMultiplier / displayScalingDivisor
      : 1;
  const scalingSliderIndex = scalingValueToIndex(finalScalingValue);

  // Handler functions using useDebouncedSave
  const handleScalingValueChange = (value: number) => {
    if (!processor) return;
    const { multiplier, divisor } = scalingValueToFraction(value);
    scalingMultiplierSave.cancel();
    scalingDivisorSave.cancel();
    scalingMultiplierSave.setPendingValue(multiplier, async () => {
      await setScaling(processor.id, multiplier, divisor);
    });
    scalingDivisorSave.setPendingValue(divisor, async () => {
      // Multiplier save writes both values together.
    });
  };

  const handleScalingSliderChange = (index: number) => {
    handleScalingValueChange(scalingIndexToValue(index));
  };

  const handleScalingStepChange = (direction: -1 | 1) => {
    handleScalingValueChange(
      scalingValueToButtonStep(finalScalingValue, direction),
    );
  };

  const handleRotationEnabledChange = (enabled: boolean) => {
    setRotationEnabled(enabled);
    if (!enabled && processor) {
      rotationSave.setPendingValue(0, async () => {
        await setRotation(processor.id, 0);
      });
    }
  };

  const handleRotationChange = (degrees: number) => {
    if (!processor) return;
    const clampedDegrees = clamp(degrees, ROTATION_MIN, ROTATION_MAX);
    rotationSave.setPendingValue(clampedDegrees, async (value) => {
      await setRotation(processor.id, value);
    });
  };

  const handleTempLayerEnabledChange = (enabled: boolean) => {
    if (!processor) return;
    tempLayerEnabledSave.setPendingValue(enabled, async (value) => {
      await setTempLayerEnabled(processor.id, value);
    });
  };

  const handleTempLayerLayerChange = (layer: number) => {
    if (!processor) return;
    tempLayerLayerSave.setPendingValue(layer, async (value) => {
      await setTempLayerLayer(processor.id, value);
    });
  };

  const handleTempLayerActivationDelayChange = (delayMs: number) => {
    if (!processor) return;
    tempLayerActivationDelaySave.setPendingValue(delayMs, async (value) => {
      await setTempLayerActivationDelay(processor.id, value);
    });
  };

  const handleTempLayerDeactivationDelayChange = (delayMs: number) => {
    if (!processor) return;
    tempLayerDeactivationDelaySave.setPendingValue(delayMs, async (value) => {
      await setTempLayerDeactivationDelay(processor.id, value);
    });
  };

  const handleActiveLayersModeChange = (mode: "all" | "specific") => {
    setActiveLayersMode(mode);
    if (mode === "all" && processor) {
      // Set bitmask to 0 for all layers
      activeLayersSave.setPendingValue(0, async () => {
        await setActiveLayers(processor.id, 0);
      });
    }
  };

  const handleLayerToggle = (layerId: number) => {
    if (!processor) return;
    const currentBitmask = displayActiveLayers;
    const layerBit = 1 << layerId;
    const newBitmask =
      (currentBitmask & layerBit) !== 0
        ? currentBitmask & ~layerBit // Clear bit
        : currentBitmask | layerBit; // Set bit

    activeLayersSave.setPendingValue(newBitmask, async (value) => {
      await setActiveLayers(processor.id, value);
    });
  };

  const handleAxisSnapEnabledChange = (enabled: boolean) => {
    if (!processor) return;
    // When enabling, default to Y axis snap
    const newMode = enabled
      ? AxisSnapMode.AXIS_SNAP_MODE_Y
      : AxisSnapMode.AXIS_SNAP_MODE_NONE;
    axisSnapModeSave.setPendingValue(newMode, async (value) => {
      await setAxisSnapMode(processor.id, value);
    });
  };

  const handleAxisSnapModeChange = (mode: AxisSnapMode) => {
    if (!processor) return;
    axisSnapModeSave.setPendingValue(mode, async (value) => {
      await setAxisSnapMode(processor.id, value);
    });
  };

  const handleAxisSnapThresholdChange = (threshold: number) => {
    if (!processor) return;
    axisSnapThresholdSave.setPendingValue(threshold, async (value) => {
      await setAxisSnapThreshold(processor.id, value);
    });
  };

  const handleAxisSnapTimeoutChange = (timeoutMs: number) => {
    if (!processor) return;
    axisSnapTimeoutSave.setPendingValue(timeoutMs, async (value) => {
      await setAxisSnapTimeout(processor.id, value);
    });
  };

  const handleXInvertChange = (invert: boolean) => {
    if (!processor) return;
    xInvertSave.setPendingValue(invert, async (value) => {
      await setXInvert(processor.id, value);
    });
  };

  const handleYInvertChange = (invert: boolean) => {
    if (!processor) return;
    yInvertSave.setPendingValue(invert, async (value) => {
      await setYInvert(processor.id, value);
    });
  };

  const handleXyToScrollEnabledChange = (enabled: boolean) => {
    if (!processor) return;
    xyToScrollEnabledSave.setPendingValue(enabled, async (value) => {
      await setXyToScrollEnabled(processor.id, value);
    });
  };

  const handleXySwapEnabledChange = (enabled: boolean) => {
    if (!processor) return;
    xySwapEnabledSave.setPendingValue(enabled, async (value) => {
      await setXySwapEnabled(processor.id, value);
    });
  };

  const handleSelectProcessor = (index: number) => {
    setSelectedProcessorIndex(index);
    setRightView({ kind: "processor" });
  };

  const handleSelectDriver = (customSubsystemIndex: number) => {
    setRightView({ kind: "pmw3610", index: customSubsystemIndex });
  };

  const selectedDriverSection =
    rightView.kind === "pmw3610"
      ? pmw3610Sections.find(
          (section) => section.customSubsystemIndex === rightView.index,
        )
      : undefined;

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-[var(--color-cyber)]/10 border border-[var(--color-cyber)]/20">
            <IconPointer size={24} className="text-[var(--color-cyber)]" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-[var(--color-text)]">
              {t("Trackball Settings")}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("Adjust sensitivity and behavior via runtime input processor")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 desktop:grid-cols-[300px_1fr] gap-4 min-w-0">
          {/* Left: selectable lists */}
          <div className="space-y-4">
            {/* Processors */}
            <section className="glass-card p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <IconCpu size={16} className="text-[var(--color-cyber)]" />
                  <h2 className="text-sm font-medium text-[var(--color-text)]">
                    {t("Processors")}
                  </h2>
                  <DocTip content={processorDoc(t)} />
                </div>
                <div className="flex items-center gap-1">
                  {isLoading && (
                    <IconLoader2
                      size={14}
                      className="animate-spin text-[var(--color-electric)]"
                    />
                  )}
                  {/* The page keeps its state across tab switches, so re-reading
                      the processor list is an explicit action. */}
                  <button
                    className="p-1 rounded hover:bg-[var(--color-border)] text-[var(--color-electric)] disabled:opacity-40 transition-colors"
                    onClick={() => void loadProcessors()}
                    disabled={isLoading}
                    title={t("Reload")}
                    aria-label={t("Reload processors")}
                  >
                    <IconRefresh size={15} />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {processors.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                    {isLoading ? t("Loading...") : t("No processors found")}
                  </p>
                ) : (
                  processors.map((p, index) => {
                    const isSelectedProcessor =
                      rightView.kind === "processor" &&
                      selectedProcessorIndex === index;
                    // Reflect pending (unsaved) edits for the processor
                    // currently loaded into the detail pane; other rows show
                    // their persisted values.
                    const isEditing = selectedProcessorIndex === index;
                    const rowActiveLayers = isEditing
                      ? displayActiveLayers
                      : p.activeLayers;
                    const rowTempEnabled = isEditing
                      ? displayTempLayerEnabled
                      : p.tempLayerEnabled;
                    const rowTempLayer = isEditing
                      ? displayTempLayerLayer
                      : p.tempLayerLayer;
                    return (
                      <button
                        key={`${p.id}-${p.name}-${index}`}
                        onClick={() => handleSelectProcessor(index)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          isSelectedProcessor
                            ? "bg-[var(--color-electric)]/10 border-[var(--color-electric)]/40"
                            : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-electric)]/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="block text-sm font-medium text-[var(--color-text)] truncate flex-1">
                            {p.name || t("Processor {{id}}", { id: p.id })}
                          </span>
                        </div>
                        <LayerGrid
                          layers={layers}
                          activeLayers={rowActiveLayers}
                          tempLayerEnabled={rowTempEnabled}
                          tempLayerLayer={rowTempLayer}
                        />
                      </button>
                    );
                  })
                )}
              </div>
              {processors.length > 0 && layers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--color-text-muted)]">
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded border border-[var(--color-electric)]/50 bg-[var(--color-electric)]/20" />
                    {t("Active on layer")}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded border border-[var(--color-border)] ring-2 ring-[var(--color-cyber)]" />
                    {t("Temp layer")}
                  </span>
                </div>
              )}
            </section>

            {/* PMW3610 drivers */}
            <section className="glass-card p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <IconMouse size={16} className="text-[var(--color-neon)]" />
                  <h2 className="text-sm font-medium text-[var(--color-text)]">
                    {t("PMW3610 Drivers")}
                  </h2>
                  <DocTip content={pmw3610Doc(t)} />
                </div>
                <div className="flex items-center gap-1">
                  {customSettings.isLoading && (
                    <IconLoader2
                      size={14}
                      className="animate-spin text-[var(--color-electric)]"
                    />
                  )}
                  <button
                    className="p-1 rounded hover:bg-[var(--color-border)] text-[var(--color-electric)] disabled:opacity-40 transition-colors"
                    onClick={customSettings.loadSettings}
                    disabled={customSettings.isLoading}
                    title={t("Reload")}
                    aria-label={t("Reload")}
                  >
                    <IconRefresh size={15} />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {!customSettings.isAvailable ? (
                  <p className="text-xs text-[var(--color-text-muted)] py-2">
                    {t(
                      "Custom settings subsystem is not available for this keyboard.",
                    )}
                  </p>
                ) : customSettings.isLoading && pmw3610Sections.length === 0 ? (
                  <LoadingIndicator
                    variant="inline"
                    label={t("Loading advanced settings...")}
                  />
                ) : pmw3610Sections.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] py-2">
                    {t(
                      "No pmw3610 driver settings were reported by the keyboard.",
                    )}
                  </p>
                ) : (
                  pmw3610Sections.map((section) => {
                    const isSelectedDriver =
                      rightView.kind === "pmw3610" &&
                      rightView.index === section.customSubsystemIndex;
                    const hasUnsaved = section.settings.some(
                      (s) => s.hasUnsavedValue,
                    );
                    return (
                      <button
                        key={section.customSubsystemIndex}
                        onClick={() =>
                          handleSelectDriver(section.customSubsystemIndex)
                        }
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          isSelectedDriver
                            ? "bg-[var(--color-electric)]/10 border-[var(--color-electric)]/40"
                            : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-electric)]/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="block text-sm font-medium text-[var(--color-text)] truncate flex-1">
                            {section.identifier}
                            {pmw3610Sections.length > 1
                              ? ` #${section.customSubsystemIndex}`
                              : ""}
                          </span>
                          {hasUnsaved && <StatusDot status="unsaved" />}
                        </div>
                        <span className="block text-xs text-[var(--color-text-muted)]">
                          {t("{{count}} settings", {
                            count: section.settings.length,
                          })}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Right: detail pane for the selected item */}
          <div className="min-w-0">
            {rightView.kind === "pmw3610" ? (
              selectedDriverSection ? (
                <CustomSettingsSectionCard
                  section={selectedDriverSection}
                  layers={keymapLayers}
                  behaviors={behaviors}
                  customSettings={customSettings}
                  keymapLoading={keymapLoading}
                  defaultExpanded
                />
              ) : (
                <section className="glass-card p-6 flex items-center justify-center min-h-[320px] text-center">
                  <div>
                    <IconMouse
                      size={28}
                      className="mx-auto mb-3 text-[var(--color-neon)]"
                    />
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {t("This driver is no longer available.")}
                    </p>
                  </div>
                </section>
              )
            ) : (
              <>
                {!isAvailable && !isLoading && !error && (
                  <div className="mb-6 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)] flex items-start gap-3">
                    <div className="p-2">
                      <IconAlertTriangleFilled
                        size={24}
                        className="text-red-500"
                      />
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {t(
                        "Runtime input processor subsystem is not available for your keyboard.",
                      )}
                      <br />
                      {t(
                        "Make sure your firmware has the {{module}} enabled.",
                        {
                          module: "cormoran/zmk-module-runtime-input-processor",
                        },
                      )}
                      <a
                        href="https://github.com/cormoran/zmk-module-runtime-input-processor"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-electric)] underline mx-1"
                      >
                        cormoran/zmk-module-runtime-input-processor
                      </a>
                    </p>
                  </div>
                )}

                {/* Error state */}
                {error && (
                  <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">{t(error)}</p>
                  </div>
                )}

                {/* Loading state */}
                {isLoading && !processor && (
                  <LoadingIndicator
                    className="mb-6"
                    label={t("Loading trackball settings...")}
                  />
                )}

                {/* No processor found */}
                {!isLoading && !processor && !error && (
                  <div className="mb-6 p-4 rounded-lg bg-[var(--color-border)] border border-[var(--color-border-hover)]">
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {t(
                        "No runtime input processor found. Make sure your firmware has the runtime input processor module enabled.",
                      )}
                    </p>
                  </div>
                )}

                {/* Settings */}
                {processor && (
                  <div className="space-y-6">
                    {/* Active Layers Selection */}
                    <div className="glass-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-medium text-[var(--color-text)]">
                            {t("Active on Layers")}
                          </h3>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {t(
                              "Configure which layers this processor is active on",
                            )}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Switch.Root
                            checked={activeLayersMode === "specific"}
                            onCheckedChange={(checked) =>
                              handleActiveLayersModeChange(
                                checked ? "specific" : "all",
                              )
                            }
                            className="w-11 h-6 rounded-full relative data-[state=checked]:bg-[var(--color-electric)] bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors cursor-pointer"
                          >
                            <Switch.Thumb className="block w-5 h-5 rounded-full transition-transform data-[state=checked]:translate-x-5 translate-x-0.5 will-change-transform bg-white border border-[var(--color-border)]" />
                          </Switch.Root>
                        </div>
                      </div>

                      {activeLayersMode === "specific" && (
                        <div className="space-y-2 mt-4">
                          {layers.length > 0 ? (
                            layers.map((layer) => {
                              const isChecked =
                                (displayActiveLayers & (1 << layer.id)) !== 0;
                              return (
                                <label
                                  key={layer.id}
                                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-border)]/50 cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleLayerToggle(layer.id)}
                                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-electric)] focus:ring-[var(--color-electric)] focus:ring-offset-0 cursor-pointer"
                                  />
                                  <span className="text-sm text-[var(--color-text-secondary)]">
                                    {layer.name ||
                                      t("Layer {{id}}", { id: layer.id })}
                                  </span>
                                </label>
                              );
                            })
                          ) : (
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {t("Loading layers...")}
                            </p>
                          )}
                        </div>
                      )}

                      {activeLayersMode === "all" && (
                        <p className="text-sm text-[var(--color-text-secondary)] mt-4">
                          {t("Processor is active on all layers")}
                        </p>
                      )}
                    </div>

                    {/* Scaling Setting */}
                    <div className="glass-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-medium text-[var(--color-text)]">
                            {t("Scaling")}
                          </h3>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {t("Adjust sensitivity from 0.01x to 10x")}
                          </p>
                        </div>
                        <span className="text-lg font-mono text-[var(--color-electric)]">
                          {formatScalingValue(finalScalingValue)}x
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label={t("Decrease scaling")}
                          onClick={() => handleScalingStepChange(-1)}
                          disabled={finalScalingValue <= SCALING_MIN}
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <IconChevronLeft size={18} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <input
                            type="range"
                            aria-label={t("Scaling")}
                            min={0}
                            max={SCALING_STEPS}
                            step={1}
                            value={scalingSliderIndex}
                            onChange={(e) =>
                              handleScalingSliderChange(Number(e.target.value))
                            }
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer
                      bg-[var(--color-border)]
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-[var(--color-electric)]
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:shadow-[0_0_8px_var(--color-electric)]
                      [&::-moz-range-thumb]:w-4
                      [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-[var(--color-electric)]
                      [&::-moz-range-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:border-0
                      [&::-moz-range-thumb]:shadow-[0_0_8px_var(--color-electric)]"
                          />
                          <div className="mt-2 flex justify-between text-xs text-[var(--color-text-muted)]">
                            <span>{formatScalingValue(SCALING_MIN)}x</span>
                            <span>{SCALING_MAX}x</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          aria-label={t("Increase scaling")}
                          onClick={() => handleScalingStepChange(1)}
                          disabled={finalScalingValue >= SCALING_MAX}
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <IconChevronRight size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Rotation Setting */}
                    <div className="glass-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-medium text-[var(--color-text)]">
                            {t("Sensor Rotation")}
                          </h3>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {t("Rotate input for different mounting angles")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-mono text-[var(--color-electric)]">
                            {displayRotation}°
                          </span>
                          <div className="flex-shrink-0">
                            <Switch.Root
                              checked={rotationEnabled}
                              onCheckedChange={handleRotationEnabledChange}
                              className="w-11 h-6 rounded-full relative data-[state=checked]:bg-[var(--color-electric)] bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors cursor-pointer"
                            >
                              <Switch.Thumb className="block w-5 h-5 rounded-full transition-transform data-[state=checked]:translate-x-5 translate-x-0.5 will-change-transform bg-white border border-[var(--color-border)]" />
                            </Switch.Root>
                          </div>
                        </div>
                      </div>

                      {rotationEnabled && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label={t("Decrease rotation")}
                            onClick={() =>
                              handleRotationChange(
                                displayRotation - ROTATION_STEP,
                              )
                            }
                            disabled={displayRotation <= ROTATION_MIN}
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <IconChevronLeft size={18} />
                          </button>

                          {/* Slider centered at 0, ranging from -180 to +180 */}
                          <div className="min-w-0 flex-1">
                            <input
                              type="range"
                              aria-label={t("Sensor Rotation")}
                              min={ROTATION_MIN}
                              max={ROTATION_MAX}
                              step={ROTATION_STEP}
                              value={displayRotation}
                              onChange={(e) =>
                                handleRotationChange(Number(e.target.value))
                              }
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer
                        bg-[var(--color-border)]
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-[var(--color-electric)]
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-[0_0_8px_var(--color-electric)]
                        [&::-moz-range-thumb]:w-4
                        [&::-moz-range-thumb]:h-4
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-[var(--color-electric)]
                        [&::-moz-range-thumb]:border-0
                        [&::-moz-range-thumb]:cursor-pointer
                        [&::-moz-range-thumb]:shadow-[0_0_8px_var(--color-electric)]"
                            />
                            <div className="flex justify-between mt-2 text-xs text-[var(--color-text-muted)]">
                              <span>-180°</span>
                              <span>0°</span>
                              <span>+180°</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            aria-label={t("Increase rotation")}
                            onClick={() =>
                              handleRotationChange(
                                displayRotation + ROTATION_STEP,
                              )
                            }
                            disabled={displayRotation >= ROTATION_MAX}
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <IconChevronRight size={18} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Temp Layer Settings */}
                    <div className="glass-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-medium text-[var(--color-text)]">
                            {t("Temporary Layer")}
                          </h3>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {t("Auto-activate layer when trackball is in use")}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Switch.Root
                            checked={displayTempLayerEnabled}
                            onCheckedChange={handleTempLayerEnabledChange}
                            className="w-11 h-6 rounded-full relative data-[state=checked]:bg-[var(--color-electric)] bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors cursor-pointer"
                          >
                            <Switch.Thumb className="block w-5 h-5 rounded-full transition-transform data-[state=checked]:translate-x-5 translate-x-0.5 will-change-transform bg-white border border-[var(--color-border)]" />
                          </Switch.Root>
                        </div>
                      </div>

                      {displayTempLayerEnabled && (
                        <div className="space-y-4 mt-6">
                          {/* Layer Selection */}
                          <div>
                            <label className="text-sm text-[var(--color-text-secondary)] mb-3 block">
                              {t("Target Layer")}
                            </label>
                            {layers.length > 0 ? (
                              <select
                                value={displayTempLayerLayer}
                                onChange={(e) =>
                                  handleTempLayerLayerChange(
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-sm cursor-pointer hover:border-[var(--color-border-hover)] focus:outline-none focus:border-[var(--color-electric)] transition-colors"
                              >
                                {layers.map((layer) => (
                                  <option key={layer.id} value={layer.id}>
                                    {layer.name ||
                                      t("Layer {{id}}", { id: layer.id })}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="text-xs text-[var(--color-text-muted)]">
                                {t("Loading layers...")}
                              </p>
                            )}
                          </div>

                          {/* Activation Delay */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm text-[var(--color-text-secondary)]">
                                {t("Activation Delay")}
                              </label>
                              <span className="text-sm font-mono text-[var(--color-electric)]">
                                {displayTempLayerActivationDelay}ms
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={1000}
                              step={50}
                              value={displayTempLayerActivationDelay}
                              onChange={(e) =>
                                handleTempLayerActivationDelayChange(
                                  Number(e.target.value),
                                )
                              }
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer
                        bg-[var(--color-border)]
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-[var(--color-electric)]
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-[0_0_8px_var(--color-electric)]
                        [&::-moz-range-thumb]:w-4
                        [&::-moz-range-thumb]:h-4
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-[var(--color-electric)]
                        [&::-moz-range-thumb]:border-0
                        [&::-moz-range-thumb]:cursor-pointer
                        [&::-moz-range-thumb]:shadow-[0_0_8px_var(--color-electric)]"
                            />
                            <p className="text-xs text-[var(--color-text-muted)] mt-2">
                              {t(
                                "Delay before activating layer when trackball moves",
                              )}
                            </p>
                          </div>

                          {/* Deactivation Delay */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm text-[var(--color-text-secondary)]">
                                {t("Deactivation Delay")}
                              </label>
                              <span className="text-sm font-mono text-[var(--color-electric)]">
                                {displayTempLayerDeactivationDelay}ms
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={2000}
                              step={100}
                              value={displayTempLayerDeactivationDelay}
                              onChange={(e) =>
                                handleTempLayerDeactivationDelayChange(
                                  Number(e.target.value),
                                )
                              }
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer
                        bg-[var(--color-border)]
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-[var(--color-electric)]
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-[0_0_8px_var(--color-electric)]
                        [&::-moz-range-thumb]:w-4
                        [&::-moz-range-thumb]:h-4
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-[var(--color-electric)]
                        [&::-moz-range-thumb]:border-0
                        [&::-moz-range-thumb]:cursor-pointer
                        [&::-moz-range-thumb]:shadow-[0_0_8px_var(--color-electric)]"
                            />
                            <p className="text-xs text-[var(--color-text-muted)] mt-2">
                              {t(
                                "Delay before deactivating layer when trackball stops",
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Axis Snapping */}
                    <div className="glass-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-medium text-[var(--color-text)]">
                            {t("Axis Snapping")}
                          </h3>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {t(
                              "Constrain movement to a single axis for precision scrolling",
                            )}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Switch.Root
                            checked={
                              displayAxisSnapMode !==
                              AxisSnapMode.AXIS_SNAP_MODE_NONE
                            }
                            onCheckedChange={handleAxisSnapEnabledChange}
                            className="w-11 h-6 rounded-full relative data-[state=checked]:bg-[var(--color-electric)] bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors cursor-pointer"
                          >
                            <Switch.Thumb className="block w-5 h-5 rounded-full transition-transform data-[state=checked]:translate-x-5 translate-x-0.5 will-change-transform bg-white border border-[var(--color-border)]" />
                          </Switch.Root>
                        </div>
                      </div>

                      {displayAxisSnapMode !==
                        AxisSnapMode.AXIS_SNAP_MODE_NONE && (
                        <div className="space-y-4 mt-6">
                          {/* Axis Selection */}
                          <div>
                            <label className="text-sm text-[var(--color-text-secondary)] mb-3 block">
                              {t("Snap Axis")}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  handleAxisSnapModeChange(
                                    AxisSnapMode.AXIS_SNAP_MODE_Y,
                                  )
                                }
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  displayAxisSnapMode ===
                                  AxisSnapMode.AXIS_SNAP_MODE_Y
                                    ? "bg-[var(--color-electric)] text-white"
                                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                                }`}
                              >
                                {t("Y Axis (Vertical)")}
                              </button>
                              <button
                                onClick={() =>
                                  handleAxisSnapModeChange(
                                    AxisSnapMode.AXIS_SNAP_MODE_X,
                                  )
                                }
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  displayAxisSnapMode ===
                                  AxisSnapMode.AXIS_SNAP_MODE_X
                                    ? "bg-[var(--color-electric)] text-white"
                                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                                }`}
                              >
                                {t("X Axis (Horizontal)")}
                              </button>
                            </div>
                          </div>
                          {/* Snap Threshold */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm text-[var(--color-text-secondary)]">
                                {t("Snap Threshold")}
                              </label>
                              <span className="text-sm font-mono text-[var(--color-electric)]">
                                {displayAxisSnapThreshold}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={1000}
                              step={1}
                              value={displayAxisSnapThreshold}
                              onChange={(e) =>
                                handleAxisSnapThresholdChange(
                                  Number(e.target.value),
                                )
                              }
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer
                        bg-[var(--color-border)]
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-[var(--color-electric)]
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-[0_0_8px_var(--color-electric)]
                        [&::-moz-range-thumb]:w-4
                        [&::-moz-range-thumb]:h-4
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-[var(--color-electric)]
                        [&::-moz-range-thumb]:border-0
                        [&::-moz-range-thumb]:cursor-pointer
                        [&::-moz-range-thumb]:shadow-[0_0_8px_var(--color-electric)]"
                            />
                            <p className="text-xs text-[var(--color-text-muted)] mt-2">
                              {t(
                                "Threshold for unsnapping from the locked axis",
                              )}
                            </p>
                          </div>

                          {/* Snap Timeout */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm text-[var(--color-text-secondary)]">
                                {t("Snap Timeout")}
                              </label>
                              <span className="text-sm font-mono text-[var(--color-electric)]">
                                {displayAxisSnapTimeout}ms
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={600}
                              step={50}
                              value={displayAxisSnapTimeout}
                              onChange={(e) =>
                                handleAxisSnapTimeoutChange(
                                  Number(e.target.value),
                                )
                              }
                              className="w-full h-2 rounded-lg appearance-none cursor-pointer
                        bg-[var(--color-border)]
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-[var(--color-electric)]
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-[0_0_8px_var(--color-electric)]
                        [&::-moz-range-thumb]:w-4
                        [&::-moz-range-thumb]:h-4
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-[var(--color-electric)]
                        [&::-moz-range-thumb]:border-0
                        [&::-moz-range-thumb]:cursor-pointer
                        [&::-moz-range-thumb]:shadow-[0_0_8px_var(--color-electric)]"
                            />
                            <p className="text-xs text-[var(--color-text-muted)] mt-2">
                              {t("Time window for threshold check")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Axis Inversion */}
                    <div className="glass-card p-6">
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-[var(--color-text)]">
                          {t("Axis Inversion")}
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {t("Reverse the direction of X or Y axis movement")}
                        </p>
                      </div>

                      <div className="space-y-4">
                        {/* X Invert */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              {t("Invert X Axis")}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {t("Reverse horizontal movement direction")}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <Switch.Root
                              checked={displayXInvert}
                              onCheckedChange={handleXInvertChange}
                              className="w-11 h-6 rounded-full relative data-[state=checked]:bg-[var(--color-electric)] bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors cursor-pointer"
                            >
                              <Switch.Thumb className="block w-5 h-5 rounded-full transition-transform data-[state=checked]:translate-x-5 translate-x-0.5 will-change-transform bg-white border border-[var(--color-border)]" />
                            </Switch.Root>
                          </div>
                        </div>

                        {/* Y Invert */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              {t("Invert Y Axis")}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {t("Reverse vertical movement direction")}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <Switch.Root
                              checked={displayYInvert}
                              onCheckedChange={handleYInvertChange}
                              className="w-11 h-6 rounded-full relative data-[state=checked]:bg-[var(--color-electric)] bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors cursor-pointer"
                            >
                              <Switch.Thumb className="block w-5 h-5 rounded-full transition-transform data-[state=checked]:translate-x-5 translate-x-0.5 will-change-transform bg-white border border-[var(--color-border)]" />
                            </Switch.Root>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Code Mapping */}
                    <div className="glass-card p-6">
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-[var(--color-text)]">
                          {t("Code Mapping")}
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {t(
                            "Transform trackball movement into different input types",
                          )}
                        </p>
                      </div>

                      <div className="space-y-4">
                        {/* XY to Scroll */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              {t("XY-to-Scroll")}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {t(
                                "Map X/Y movement to horizontal/vertical scroll",
                              )}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <Switch.Root
                              checked={displayXyToScrollEnabled}
                              onCheckedChange={handleXyToScrollEnabledChange}
                              className="w-11 h-6 rounded-full relative data-[state=checked]:bg-[var(--color-electric)] bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors cursor-pointer"
                            >
                              <Switch.Thumb className="block w-5 h-5 rounded-full transition-transform data-[state=checked]:translate-x-5 translate-x-0.5 will-change-transform bg-white border border-[var(--color-border)]" />
                            </Switch.Root>
                          </div>
                        </div>

                        {/* XY Swap */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              {t("XY-Swap")}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {t("Swap X and Y axes")}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <Switch.Root
                              checked={displayXySwapEnabled}
                              onCheckedChange={handleXySwapEnabledChange}
                              className="w-11 h-6 rounded-full relative data-[state=checked]:bg-[var(--color-electric)] bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors cursor-pointer"
                            >
                              <Switch.Thumb className="block w-5 h-5 rounded-full transition-transform data-[state=checked]:translate-x-5 translate-x-0.5 will-change-transform bg-white border border-[var(--color-border)]" />
                            </Switch.Root>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
