import { inertiaFields } from "../inputInertia";
/**
 * Demo Runtime Input Processor Custom Subsystem Handler
 *
 * Provides mock runtime input processor data for demo mode.
 */

import {
  Notification,
  type Request,
  type Response,
  type ProcessorInfo,
  AxisSnapMode,
} from "../../proto/zmk/runtime_input_processor/runtime_input_processor";

export const RUNTIME_INPUT_PROCESSOR_IDENTIFIER = "cormoran_rip";

/**
 * Mock runtime input processor data
 * Simulates a trackball processor with default settings
 */
const MOCK_PROCESSORS: ProcessorInfo[] = [
  {
    id: 0,
    name: "trackpad",
    scaleMultiplier: 1,
    scaleDivisor: 1,
    rotationDegrees: 0,
    tempLayerEnabled: false,
    tempLayerLayer: 0,
    tempLayerActivationDelayMs: 100,
    tempLayerDeactivationDelayMs: 500,
    activeLayers: 0, // Bitmask: 0 = active on all layers
    axisSnapMode: AxisSnapMode.AXIS_SNAP_MODE_NONE,
    axisSnapThreshold: 50,
    axisSnapTimeoutMs: 200,
    xInvert: false,
    yInvert: false,
    xyToScrollEnabled: false,
    xySwapEnabled: false,
    inertiaEnabled: false,
    inertiaWindowMs: 200,
    inertiaIntervalMs: 20,
    inertiaThreshold: 10,
    inertiaDecayPercent: 8,
    inertiaNormalMaxOutput: 0,
    inertiaFastThreshold: 0,
    inertiaFastOutputPercent: 200,
    inertiaNotificationsEnabled: false,
    inertiaActive: false,
  },
];

/**
 * Mock layer information
 */
const MOCK_LAYERS = [
  { id: 0, name: "Default" },
  { id: 1, name: "Lower" },
  { id: 2, name: "Raise" },
  { id: 3, name: "Adjust" },
];

/**
 * Runtime Input Processor Handler
 */
export class RuntimeInputProcessorHandler {
  private callbacks: ((data: Uint8Array) => void)[] = [];
  private processors: ProcessorInfo[] = JSON.parse(
    JSON.stringify(MOCK_PROCESSORS),
  );

  process(request: Request): Response {
    const inertiaField = inertiaFields.find(
      (field) => request[field.request] !== undefined,
    );
    const inertiaRequest = inertiaField
      ? request[inertiaField.request]
      : (request.setInertiaEnabled ?? request.setInertiaNotifications);
    if (inertiaRequest) {
      const processor = this.processors.find((p) => p.id === inertiaRequest.id);
      if (!processor)
        return {
          error: { message: `Processor not found: ${inertiaRequest.id}` },
        };
      const requestKey =
        inertiaField?.request ??
        (request.setInertiaEnabled
          ? "setInertiaEnabled"
          : "setInertiaNotifications");
      const key =
        inertiaField?.key ??
        (request.setInertiaEnabled
          ? "inertiaEnabled"
          : "inertiaNotificationsEnabled");
      Object.assign(processor, {
        [key]: (inertiaRequest as unknown as Record<string, number | boolean>)[
          inertiaField?.value ?? "enabled"
        ],
      });
      setTimeout(
        () =>
          this.callbacks.forEach((cb) =>
            cb(
              Notification.encode({ processorChanged: { processor } }).finish(),
            ),
          ),
        50,
      );
      return { [requestKey]: {} };
    }
    if (request.listProcessors !== undefined) {
      // Send processor data via notifications
      setTimeout(() => {
        this.processors.forEach((processor) => {
          console.log("Demo sending processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        });
      }, 100);

      return { listProcessors: {} };
    }

    if (request.getProcessor !== undefined) {
      const { id } = request.getProcessor;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        return { getProcessor: { processor } };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setScaleMultiplier !== undefined) {
      const { id, value } = request.setScaleMultiplier;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.scaleMultiplier = value;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setScaleMultiplier: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setScaleDivisor !== undefined) {
      const { id, value } = request.setScaleDivisor;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.scaleDivisor = value;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setScaleDivisor: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setRotation !== undefined) {
      const { id, value } = request.setRotation;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.rotationDegrees = value;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setRotation: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setTempLayerEnabled !== undefined) {
      const { id, enabled } = request.setTempLayerEnabled;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.tempLayerEnabled = enabled;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setTempLayerEnabled: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setTempLayerLayer !== undefined) {
      const { id, layer } = request.setTempLayerLayer;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.tempLayerLayer = layer;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setTempLayerLayer: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setTempLayerActivationDelay !== undefined) {
      const { id, activationDelayMs } = request.setTempLayerActivationDelay;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.tempLayerActivationDelayMs = activationDelayMs;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setTempLayerActivationDelay: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setTempLayerDeactivationDelay !== undefined) {
      const { id, deactivationDelayMs } = request.setTempLayerDeactivationDelay;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.tempLayerDeactivationDelayMs = deactivationDelayMs;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setTempLayerDeactivationDelay: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setActiveLayers !== undefined) {
      const { id, layers } = request.setActiveLayers;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.activeLayers = layers;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setActiveLayers: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setAxisSnapMode !== undefined) {
      const { id, mode } = request.setAxisSnapMode;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.axisSnapMode = mode;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setAxisSnapMode: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setAxisSnapThreshold !== undefined) {
      const { id, threshold } = request.setAxisSnapThreshold;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.axisSnapThreshold = threshold;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setAxisSnapThreshold: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setAxisSnapTimeout !== undefined) {
      const { id, timeoutMs } = request.setAxisSnapTimeout;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.axisSnapTimeoutMs = timeoutMs;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setAxisSnapTimeout: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setXInvert !== undefined) {
      const { id, invert } = request.setXInvert;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.xInvert = invert;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setXInvert: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setYInvert !== undefined) {
      const { id, invert } = request.setYInvert;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.yInvert = invert;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setYInvert: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setXyToScrollEnabled !== undefined) {
      const { id, enabled } = request.setXyToScrollEnabled;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.xyToScrollEnabled = enabled;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setXyToScrollEnabled: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.setXySwapEnabled !== undefined) {
      const { id, enabled } = request.setXySwapEnabled;
      const processor = this.processors.find((p) => p.id === id);

      if (processor) {
        processor.xySwapEnabled = enabled;

        // Send notification about the update
        setTimeout(() => {
          console.log("Demo sending updated processor settings:", processor);
          this.callbacks.forEach((cb) => {
            cb(
              Notification.encode({
                processorChanged: {
                  processor,
                },
              }).finish(),
            );
          });
        }, 50);

        return { setXySwapEnabled: {} };
      }

      return { error: { message: `Processor not found: ${id}` } };
    }

    if (request.getLayerInfo !== undefined) {
      return { getLayerInfo: { layers: MOCK_LAYERS } };
    }

    return { error: { message: "Not implemented" } };
  }

  notify(callback: (data: Uint8Array) => void) {
    this.callbacks.push(callback);
  }
}
