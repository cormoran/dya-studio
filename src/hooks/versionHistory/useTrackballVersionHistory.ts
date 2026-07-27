/**
 * Trackball tab version history: every runtime input processor's tuning plus
 * the PMW3610 driver's custom settings.
 *
 * The two halves behave differently on restore, matching how the tab already
 * writes them: input-processor RPCs are persistent write-throughs that take
 * effect immediately, while custom settings go to keyboard memory and need the
 * section's own Save to persist. Both are written from one confirm so the tab
 * ends up in the state the version describes.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTabVersionHistory } from "../useTabVersionHistory";
import type { UseTabVersionHistoryReturn } from "../useTabVersionHistory";
import type {
  InputProcessor,
  UseRuntimeInputProcessorReturn,
} from "../useRuntimeInputProcessor";
import type { UseCustomSettingsReturn } from "../useCustomSettings";
import type { AxisSnapMode } from "../../proto/zmk/runtime_input_processor/runtime_input_processor";
import {
  buildCustomSettingsSnapshot,
  type CustomSettingsSnapshot,
} from "../../lib/versionHistory/tabs/customSettings";
import {
  applyCustomSettingsSnapshot,
  combineLabelers,
  customSettingsLabeler,
} from "./customSettingsRestore";
import type { DiffLabeler } from "../../lib/versionHistory";

/** Bump when the payload shape below changes. */
export const TRACKBALL_SNAPSHOT_SCHEMA_VERSION = 1;
export const TRACKBALL_TAB_ID = "trackball";

/** The writable half of an input processor, as stored in a snapshot. */
export type ProcessorSnapshot = {
  scaleMultiplier: number;
  scaleDivisor: number;
  rotationDegrees: number;
  tempLayerEnabled: boolean;
  tempLayerLayer: number;
  tempLayerActivationDelayMs: number;
  tempLayerDeactivationDelayMs: number;
  activeLayers: number;
  axisSnapMode: number;
  axisSnapThreshold: number;
  axisSnapTimeoutMs: number;
  xInvert: boolean;
  yInvert: boolean;
  xyToScrollEnabled: boolean;
  xySwapEnabled: boolean;
};

export type TrackballSnapshot = {
  /** Processor settings keyed by processor id. */
  processors: Record<string, ProcessorSnapshot>;
  custom: CustomSettingsSnapshot;
};

/** Readable names for the processor fields, used by the diff modal. */
const PROCESSOR_FIELD_LABELS: Record<keyof ProcessorSnapshot, string> = {
  scaleMultiplier: "Sensitivity multiplier",
  scaleDivisor: "Sensitivity divisor",
  rotationDegrees: "Rotation (degrees)",
  tempLayerEnabled: "Temporary layer enabled",
  tempLayerLayer: "Temporary layer",
  tempLayerActivationDelayMs: "Temporary layer activation delay (ms)",
  tempLayerDeactivationDelayMs: "Temporary layer deactivation delay (ms)",
  activeLayers: "Active layers",
  axisSnapMode: "Axis snap mode",
  axisSnapThreshold: "Axis snap threshold",
  axisSnapTimeoutMs: "Axis snap timeout (ms)",
  xInvert: "Invert X",
  yInvert: "Invert Y",
  xyToScrollEnabled: "XY to scroll",
  xySwapEnabled: "Swap XY",
};

function toProcessorSnapshot(processor: InputProcessor): ProcessorSnapshot {
  return {
    scaleMultiplier: processor.scaleMultiplier,
    scaleDivisor: processor.scaleDivisor,
    rotationDegrees: processor.rotationDegrees,
    tempLayerEnabled: processor.tempLayerEnabled,
    tempLayerLayer: processor.tempLayerLayer,
    tempLayerActivationDelayMs: processor.tempLayerActivationDelayMs,
    tempLayerDeactivationDelayMs: processor.tempLayerDeactivationDelayMs,
    activeLayers: processor.activeLayers,
    axisSnapMode: processor.axisSnapMode,
    axisSnapThreshold: processor.axisSnapThreshold,
    axisSnapTimeoutMs: processor.axisSnapTimeoutMs,
    xInvert: processor.xInvert,
    yInvert: processor.yInvert,
    xyToScrollEnabled: processor.xyToScrollEnabled,
    xySwapEnabled: processor.xySwapEnabled,
  };
}

export interface UseTrackballVersionHistoryOptions {
  inputProcessor: UseRuntimeInputProcessorReturn;
  customSettings: UseCustomSettingsReturn;
  /** True once processors and the PMW3610 settings have both been read. */
  isLoaded: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export interface UseTrackballVersionHistoryReturn extends UseTabVersionHistoryReturn<TrackballSnapshot> {
  labeler: DiffLabeler;
}

export function useTrackballVersionHistory({
  inputProcessor,
  customSettings,
  isLoaded,
  t,
}: UseTrackballVersionHistoryOptions): UseTrackballVersionHistoryReturn {
  // Declared before useTabVersionHistory so the refs are current by the time
  // its capture effect runs.
  const processorRef = useRef(inputProcessor);
  const settingsRef = useRef(customSettings);
  useEffect(() => {
    processorRef.current = inputProcessor;
    settingsRef.current = customSettings;
  });

  const collect = useCallback(async (): Promise<TrackballSnapshot | null> => {
    const processors = processorRef.current;
    const settings = settingsRef.current;
    if (!processors.isAvailable && !settings.isAvailable) return null;

    return {
      processors: Object.fromEntries(
        processors.processors.map((processor) => [
          String(processor.id),
          toProcessorSnapshot(processor),
        ]),
      ),
      custom: buildCustomSettingsSnapshot(settings.sections),
    };
  }, []);

  const apply = useCallback(async (snapshot: TrackballSnapshot) => {
    const read = () => processorRef.current;

    for (const [rawId, wanted] of Object.entries(snapshot.processors)) {
      const id = Number(rawId);
      const have = read().processors.find((processor) => processor.id === id);
      // A processor that no longer exists (different firmware) is skipped
      // rather than guessed at.
      if (!have) continue;
      const current = toProcessorSnapshot(have);

      if (
        current.scaleMultiplier !== wanted.scaleMultiplier ||
        current.scaleDivisor !== wanted.scaleDivisor
      ) {
        await read().setScaling(
          id,
          wanted.scaleMultiplier,
          wanted.scaleDivisor,
        );
      }
      if (current.rotationDegrees !== wanted.rotationDegrees) {
        await read().setRotation(id, wanted.rotationDegrees);
      }
      if (current.tempLayerEnabled !== wanted.tempLayerEnabled) {
        await read().setTempLayerEnabled(id, wanted.tempLayerEnabled);
      }
      if (current.tempLayerLayer !== wanted.tempLayerLayer) {
        await read().setTempLayerLayer(id, wanted.tempLayerLayer);
      }
      if (
        current.tempLayerActivationDelayMs !== wanted.tempLayerActivationDelayMs
      ) {
        await read().setTempLayerActivationDelay(
          id,
          wanted.tempLayerActivationDelayMs,
        );
      }
      if (
        current.tempLayerDeactivationDelayMs !==
        wanted.tempLayerDeactivationDelayMs
      ) {
        await read().setTempLayerDeactivationDelay(
          id,
          wanted.tempLayerDeactivationDelayMs,
        );
      }
      if (current.activeLayers !== wanted.activeLayers) {
        await read().setActiveLayers(id, wanted.activeLayers);
      }
      if (current.axisSnapMode !== wanted.axisSnapMode) {
        await read().setAxisSnapMode(id, wanted.axisSnapMode as AxisSnapMode);
      }
      if (current.axisSnapThreshold !== wanted.axisSnapThreshold) {
        await read().setAxisSnapThreshold(id, wanted.axisSnapThreshold);
      }
      if (current.axisSnapTimeoutMs !== wanted.axisSnapTimeoutMs) {
        await read().setAxisSnapTimeout(id, wanted.axisSnapTimeoutMs);
      }
      if (current.xInvert !== wanted.xInvert) {
        await read().setXInvert(id, wanted.xInvert);
      }
      if (current.yInvert !== wanted.yInvert) {
        await read().setYInvert(id, wanted.yInvert);
      }
      if (current.xyToScrollEnabled !== wanted.xyToScrollEnabled) {
        await read().setXyToScrollEnabled(id, wanted.xyToScrollEnabled);
      }
      if (current.xySwapEnabled !== wanted.xySwapEnabled) {
        await read().setXySwapEnabled(id, wanted.xySwapEnabled);
      }
    }

    await applyCustomSettingsSnapshot(
      () => settingsRef.current.sections,
      (setting, value) =>
        settingsRef.current.writeSettingToMemory(setting, value),
      snapshot.custom,
    );
  }, []);

  const history = useTabVersionHistory<TrackballSnapshot>({
    tabId: TRACKBALL_TAB_ID,
    schemaVersion: TRACKBALL_SNAPSHOT_SCHEMA_VERSION,
    collect,
    apply,
    isLoaded,
    enabled: inputProcessor.isAvailable || customSettings.isAvailable,
  });

  const processorNames = useMemo(
    () =>
      new Map(
        inputProcessor.processors.map((processor) => [
          String(processor.id),
          processor.name,
        ]),
      ),
    [inputProcessor.processors],
  );

  const labeler = useMemo<DiffLabeler>(
    () =>
      combineLabelers(
        {
          label(path) {
            if (path[0] !== "processors") return null;
            const name =
              processorNames.get(path[1]) ??
              t("Processor {{id}}", { id: path[1] });
            const field =
              PROCESSOR_FIELD_LABELS[path[2] as keyof ProcessorSnapshot];
            return field ? `${name} › ${t(field)}` : name;
          },
        },
        customSettingsLabeler(["custom"], t),
      ),
    [processorNames, t],
  );

  return { ...history, labeler };
}
