/**
 * SensorRotationConfig Component
 *
 * Displays and configures rotary encoder sensor bindings for the selected layer.
 * Shows multiple sensors horizontally with wrapping.
 */
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  IconRotateClockwise,
  IconRotateClockwise2,
  IconLoader2,
  IconInfoTriangle,
} from "@tabler/icons-react";
import { useRuntimeSensorRotate } from "../hooks/useRuntimeSensorRotate";
import { MEMORY_WRITE_DEBOUNCE_MS } from "../hooks/useDebouncedMemoryWrite";
import type { LayerBindings, Binding } from "../hooks/useRuntimeSensorRotate";
import type { BehaviorDefinition } from "../hooks/useKeymap";
import type { BehaviorBinding } from "../hooks/useKeymap";
import { KeycodeSelector } from "./KeycodeSelector";
import { formatBehaviorBinding } from "../lib/behaviorMetadata";
import type { KeyboardLayoutType } from "../lib/keyboardLayouts";
import { useLanguage } from "../hooks/useLanguage";

interface SensorRotationConfigProps {
  selectedLayerId: number;
  behaviors: Map<number, BehaviorDefinition>;
  layers: Array<{ id: number; name: string }>;
  keyboardLayout?: KeyboardLayoutType;
}

export function SensorRotationConfig({
  selectedLayerId,
  behaviors,
  layers,
  keyboardLayout,
}: SensorRotationConfigProps) {
  const { t } = useLanguage();
  const sensorRotate = useRuntimeSensorRotate();

  // Local state for sensor bindings per sensor
  const [sensorBindings, setSensorBindings] = useState<
    Map<number, LayerBindings[]>
  >(new Map());

  // State for behavior selector dialog
  const [showBehaviorSelector, setShowBehaviorSelector] = useState(false);
  const [editingConfig, setEditingConfig] = useState<{
    sensorIndex: number;
    direction: "clockwise" | "counterClockwise";
    currentBinding: Binding | null;
  } | null>(null);

  // Debounced tap time state per sensor
  const [pendingTapTimes, setPendingTapTimes] = useState<Map<number, number>>(
    new Map(),
  );
  const tapTimeTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = tapTimeTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // Load bindings for all sensors
  useEffect(() => {
    if (!sensorRotate.isAvailable || sensorRotate.sensors.length === 0) {
      return;
    }

    const loadAllBindings = async () => {
      const allBindings = new Map<number, LayerBindings[]>();
      for (const sensor of sensorRotate.sensors) {
        const bindings = await sensorRotate.getAllLayerBindings(sensor.index);
        allBindings.set(sensor.index, bindings);
      }
      setSensorBindings(allBindings);
    };
    console.log("Loading all sensor bindings");
    loadAllBindings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sensorRotate.sensors,
    sensorRotate.isAvailable,
    sensorRotate.getAllLayerBindings,
  ]);

  // Get bindings for a specific sensor and layer
  const getBindingsForLayer = useCallback(
    (sensorIndex: number, layerId: number): LayerBindings | null => {
      const bindings = sensorBindings.get(sensorIndex);
      if (!bindings) return null;
      return bindings.find((b) => b.layer === layerId) ?? null;
    },
    [sensorBindings],
  );

  // Handle clicking on a sensor binding to edit it
  const handleBindingClick = useCallback(
    (sensorIndex: number, direction: "clockwise" | "counterClockwise") => {
      const layerBindings = getBindingsForLayer(sensorIndex, selectedLayerId);

      const currentBinding =
        direction === "clockwise"
          ? (layerBindings?.cwBinding ?? null)
          : (layerBindings?.ccwBinding ?? null);

      setEditingConfig({
        sensorIndex,
        direction,
        currentBinding,
      });
      setShowBehaviorSelector(true);
    },
    [getBindingsForLayer, selectedLayerId],
  );

  // Handle behavior selection from the dialog
  const handleBehaviorSelect = useCallback(
    async (binding: BehaviorBinding) => {
      if (!editingConfig) return;

      const { sensorIndex, direction } = editingConfig;
      const layerBindings = getBindingsForLayer(sensorIndex, selectedLayerId);

      let success = false;
      let newBinding: Binding;
      if (direction === "clockwise") {
        newBinding = {
          behaviorId: binding.behaviorId,
          param1: binding.param1,
          param2: binding.param2,
          tapMs: layerBindings?.cwBinding?.tapMs || 5,
        };
        success = await sensorRotate.setLayerCwBindings(
          sensorIndex,
          selectedLayerId,
          newBinding,
        );
      } else if (direction === "counterClockwise") {
        newBinding = {
          behaviorId: binding.behaviorId,
          param1: binding.param1,
          param2: binding.param2,
          tapMs: layerBindings?.ccwBinding?.tapMs || 5,
        };
        success = await sensorRotate.setLayerCcwBindings(
          sensorIndex,
          selectedLayerId,
          newBinding,
        );
      } else {
        return;
      }
      if (success) {
        // Update local state optimistically
        setSensorBindings((prev) => {
          const newBindings = new Map(prev);
          const sensorBindingsList = newBindings.get(sensorIndex) ?? [];
          const updatedBindings = sensorBindingsList.filter(
            (b) => b.layer !== selectedLayerId,
          );
          updatedBindings.push({
            layer: selectedLayerId,
            cwBinding:
              direction === "clockwise" ? newBinding : layerBindings?.cwBinding,
            ccwBinding:
              direction === "counterClockwise"
                ? newBinding
                : layerBindings?.ccwBinding,
          });
          newBindings.set(sensorIndex, updatedBindings);
          return newBindings;
        });
      }

      setShowBehaviorSelector(false);
      setEditingConfig(null);
    },
    [editingConfig, getBindingsForLayer, selectedLayerId, sensorRotate],
  );

  // Handle tap time change with debouncing
  const handleTapTimeChange = useCallback(
    (sensorIndex: number, newTapMs: number) => {
      // Update pending state immediately for UI feedback
      setPendingTapTimes((prev) => {
        const newMap = new Map(prev);
        newMap.set(sensorIndex, newTapMs);
        return newMap;
      });

      // Clear existing timer for this sensor
      const existingTimer = tapTimeTimersRef.current.get(sensorIndex);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new debounced timer
      const timer = setTimeout(async () => {
        const layerBindings = getBindingsForLayer(sensorIndex, selectedLayerId);
        const cwBinding = layerBindings?.cwBinding;
        const ccwBinding = layerBindings?.ccwBinding;

        // Update both bindings for this sensor/layer
        if (cwBinding) {
          await sensorRotate.setLayerCwBindings(sensorIndex, selectedLayerId, {
            ...cwBinding,
            tapMs: newTapMs,
          });
        }
        if (ccwBinding) {
          await sensorRotate.setLayerCcwBindings(sensorIndex, selectedLayerId, {
            ...ccwBinding,
            tapMs: newTapMs,
          });
        }

        // Update local state
        setSensorBindings((prev) => {
          const newBindings = new Map(prev);
          const sensorBindingsList = newBindings.get(sensorIndex) ?? [];
          const updatedBindings = sensorBindingsList.filter(
            (b) => b.layer !== selectedLayerId,
          );
          updatedBindings.push({
            layer: selectedLayerId,
            cwBinding: cwBinding
              ? { ...cwBinding, tapMs: newTapMs }
              : undefined,
            ccwBinding: ccwBinding
              ? { ...ccwBinding, tapMs: newTapMs }
              : undefined,
          });
          newBindings.set(sensorIndex, updatedBindings);
          return newBindings;
        });

        // Clear pending state
        setPendingTapTimes((prev) => {
          const newMap = new Map(prev);
          newMap.delete(sensorIndex);
          return newMap;
        });

        tapTimeTimersRef.current.delete(sensorIndex);
      }, MEMORY_WRITE_DEBOUNCE_MS);

      tapTimeTimersRef.current.set(sensorIndex, timer);
    },
    [getBindingsForLayer, selectedLayerId, sensorRotate],
  );

  // Get display name for a sensor binding
  const getBindingDisplayName = useCallback(
    (binding: Binding | null | undefined): string => {
      if (!binding || binding.behaviorId === 0) {
        return t("Trans");
      }
      const behavior = behaviors.get(binding.behaviorId);
      if (!behavior) {
        return t("Behavior {{id}}", { id: binding.behaviorId });
      }
      return formatBehaviorBinding(binding, behavior, {
        // Skip passing layers to displayShortName
        layers: layers,
        keyboardLayout: keyboardLayout,
      });
    },
    [behaviors, layers, keyboardLayout, t],
  );

  // Convert Binding to BehaviorBinding for KeycodeSelector
  const currentBindingForSelector = useMemo(() => {
    if (!editingConfig || !editingConfig.currentBinding) return null;
    return {
      behaviorId: editingConfig.currentBinding.behaviorId,
      param1: editingConfig.currentBinding.param1,
      param2: editingConfig.currentBinding.param2,
    };
  }, [editingConfig]);

  const behaviorQuickSelects = useMemo(
    () => ["kp", "mmv", "msc", "none", "transparent"],
    [],
  );

  return (
    <>
      <div className="glass-card p-4 sm:p-6">
        <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">
          {t("Rotary Encoder Configuration")}
        </h3>

        <div className="mb-2">
          <span className="text-xs text-[var(--color-text-muted)]">
            {t("The value is saved in real-time upon selection for now.")}
          </span>
        </div>

        {/* Sensors Grid */}
        <div className="flex flex-wrap gap-4">
          {sensorRotate.sensors.map((sensor) => {
            const layerBindings = getBindingsForLayer(
              sensor.index,
              selectedLayerId,
            );
            const cwBinding = layerBindings?.cwBinding;
            const ccwBinding = layerBindings?.ccwBinding;

            return (
              <div
                key={sensor.index}
                className="flex-1 min-w-0 basis-[280px] max-w-[400px] p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
              >
                {/* Sensor Name */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-electric)]/10 border border-[var(--color-electric)]/20 flex items-center justify-center">
                    <span className="text-xs font-mono text-[var(--color-electric)]">
                      {sensor.index}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {sensor.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {t("Rotary Encoder")}
                    </p>
                  </div>
                </div>

                {/* Rotation Bindings */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Counter-clockwise */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <IconRotateClockwise2
                          size={16}
                          className="text-[var(--color-cyber)]"
                          style={{ transform: "scaleX(-1)" }}
                        />
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {t("Counter-clockwise")}
                        </span>
                      </div>
                      <button
                        className="w-full min-h-9 px-3 py-2 rounded-md bg-[var(--color-border)] hover:bg-[var(--color-border-hover)] text-left text-sm break-words text-[var(--color-text-secondary)] transition-colors"
                        onClick={() =>
                          handleBindingClick(sensor.index, "counterClockwise")
                        }
                      >
                        {getBindingDisplayName(ccwBinding)}
                      </button>
                    </div>
                    {/* Clockwise */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <IconRotateClockwise
                          size={16}
                          className="text-[var(--color-neon)]"
                        />
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {t("Clockwise")}
                        </span>
                      </div>
                      <button
                        className="w-full min-h-9 px-3 py-2 rounded-md bg-[var(--color-border)] hover:bg-[var(--color-border-hover)] text-left text-sm break-words text-[var(--color-text-secondary)] transition-colors"
                        onClick={() =>
                          handleBindingClick(sensor.index, "clockwise")
                        }
                      >
                        {getBindingDisplayName(cwBinding)}
                      </button>
                    </div>
                  </div>

                  {/* Tap Time */}
                  <div>
                    <div className="grid grid-cols-2 items-center gap-2 mb-1">
                      <label
                        htmlFor={`sensor-tap-time-${sensor.index}`}
                        className="text-xs text-[var(--color-text-muted)]"
                      >
                        {t("Tap Time")}
                      </label>
                      <div className="flex min-w-0 h-9 items-center rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] focus-within:border-[var(--color-electric)]">
                        <input
                          id={`sensor-tap-time-${sensor.index}`}
                          type="number"
                          min={1}
                          className="w-full min-w-0 h-full px-3 rounded-md text-base tablet:text-sm tabular-nums text-[var(--color-text-secondary)] bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-electric)] text-right"
                          value={
                            pendingTapTimes.get(sensor.index) ??
                            cwBinding?.tapMs ??
                            ccwBinding?.tapMs ??
                            5
                          }
                          step={5}
                          onChange={(e) => {
                            const newTapMs = Number(e.target.value);
                            handleTapTimeChange(sensor.index, newTapMs);
                          }}
                        />
                        <span className="shrink-0 pr-3 text-xs text-[var(--color-text-muted)]">
                          ms
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] flex flex-wrap items-center gap-1 justify-between my-2">
                      <span>{t("Time between rotation triggers")}</span>
                      {pendingTapTimes.has(sensor.index) && (
                        <span className="text-[var(--color-electric)] ml-1">
                          {t("pending to save...")}
                        </span>
                      )}
                    </div>
                  </div>
                  {(pendingTapTimes.get(sensor.index) ??
                    cwBinding?.tapMs ??
                    ccwBinding?.tapMs ??
                    5) < 20 && (
                    <div className="text-xs text-[var(--color-text-muted)] opacity-70">
                      <IconInfoTriangle size={14} className="inline mr-1" />
                      {t(
                        "For scroll or mouse move, tap time need to be > behavior-input-two-axis's trigger-period-ms (default 16ms).",
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading State */}
        {sensorRotate.isLoading && (
          <div className="flex items-center justify-center gap-2 py-4">
            <IconLoader2
              size={16}
              className="animate-spin text-[var(--color-electric)]"
            />
            <span className="text-sm text-[var(--color-text-muted)]">
              {t("Loading sensors...")}
            </span>
          </div>
        )}

        {/* Empty State */}
        {!sensorRotate.isLoading &&
          sensorRotate.sensors.length === 0 &&
          sensorRotate.isAvailable && (
            <div className="text-center py-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("No rotary encoders detected")}
              </p>
            </div>
          )}
      </div>

      {/* Behavior Selector Dialog */}
      <KeycodeSelector
        open={showBehaviorSelector}
        onClose={() => {
          setShowBehaviorSelector(false);
          setEditingConfig(null);
        }}
        onSelect={handleBehaviorSelect}
        currentBinding={currentBindingForSelector}
        behaviors={behaviors}
        layers={layers}
        keyboardLayout={keyboardLayout}
        behaviorQuickSelects={behaviorQuickSelects}
      />
    </>
  );
}
