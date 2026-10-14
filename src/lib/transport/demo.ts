/**
 * Demo RPC Transport
 *
 * Simulates a ZMK keyboard connection for testing without a physical device.
 * Supports core, keymap, behaviors, and custom subsystems (BLE, Settings).
 */

import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import {
  Request,
  RequestResponse,
  Response,
} from "@zmkfirmware/zmk-studio-ts-client";
import { BLEManagementHandler, BLE_MANAGEMENT_IDENTIFIER } from "./demo-ble";
import { SettingsHandler, SETTINGS_IDENTIFIER } from "./demo-settings";
import { DeviceInfoHandler, DEVICE_INFO_IDENTIFIER } from "./demo-device-info";
import { WatchdogHandler, WATCHDOG_IDENTIFIER } from "./demo-watchdog";
import {
  KscanDiagnosticsHandler,
  KSCAN_DIAGNOSTICS_IDENTIFIER,
} from "./demo-kscan-diagnostics";
import { Pmw3610Handler, PMW3610_IDENTIFIER } from "./demo-pmw3610";
import {
  RuntimeInputProcessorHandler,
  RUNTIME_INPUT_PROCESSOR_IDENTIFIER,
} from "./demo-runtime-input-processor";
import {
  RuntimeSensorRotateHandler,
  RUNTIME_SENSOR_ROTATE_IDENTIFIER,
} from "./demo-runtime-sensor-rotate";
import {
  CustomSettingsHandler,
  CUSTOM_SETTINGS_IDENTIFIER,
} from "./demo-custom-settings";
import {
  RuntimeComboHandler,
  RUNTIME_COMBO_IDENTIFIER,
} from "./demo-runtime-combo";
import {
  RuntimeMacroHandler,
  RUNTIME_MACRO_IDENTIFIER,
} from "./demo-runtime-macro";
import {
  PhysicalLayoutsHandler,
  PHYSICAL_LAYOUTS_IDENTIFIER,
} from "./demo-physical-layouts";
import {
  InputStreamHandler,
  INPUT_STREAM_IDENTIFIER,
} from "./demo-input-stream";
import {
  OsDetectionHandler,
  OS_DETECTION_IDENTIFIER,
} from "./demo-os-detection";
import {
  DefaultLayerHandler,
  DEFAULT_LAYER_IDENTIFIER,
} from "./demo-default-layer";
import {
  Request as BLERequest,
  Response as BLEResponse,
} from "../../proto/zmk/ble_management/ble_management";
import {
  Request as SettingsRequest,
  Response as SettingsResponse,
} from "../../proto/zmk/settings/core";
import {
  Request as DeviceInfoRequest,
  Response as DeviceInfoResponse,
} from "../../proto/zmk/device_info/device_info";
import {
  Request as WatchdogRequest,
  Response as WatchdogResponse,
} from "../../proto/cormoran/watchdog/watchdog";
import {
  Request as KscanDiagnosticsRequest,
  Response as KscanDiagnosticsResponse,
} from "../../proto/cormoran/kscan_diagnostics/kscan_diagnostics";
import {
  Request as Pmw3610Request,
  Response as Pmw3610Response,
} from "../../proto/cormoran/pmw3610/pmw3610";
import {
  Request as RuntimeInputProcessorRequest,
  Response as RuntimeInputProcessorResponse,
} from "../../proto/zmk/runtime_input_processor/runtime_input_processor";
import {
  Request as RuntimeSensorRotateRequest,
  Response as RuntimeSensorRotateResponse,
} from "../../proto/zmk/runtime_sensor_rotate/runtime_sensor_rotate";
import {
  Request as RuntimeComboRequest,
  Response as RuntimeComboResponse,
} from "../../proto/cormoran/runtime_combo/runtime_combo";
import {
  Request as RuntimeMacroRequest,
  Response as RuntimeMacroResponse,
} from "../../proto/cormoran/runtime_macro/runtime_macro";
import {
  Request as PhysicalLayoutsRequest,
  Response as PhysicalLayoutsResponse,
} from "../../proto/zmk/physical_layouts/physical_layouts";
import {
  Request as InputStreamRequest,
  Response as InputStreamResponse,
} from "../../proto/zmk/input_stream/input_stream";
import {
  Request as CustomSettingsRequest,
  Response as CustomSettingsResponse,
} from "../../proto/cormoran/zmk/custom_settings/custom_settings";
import {
  Request as OsDetectionRequest,
  Response as OsDetectionResponse,
} from "../../proto/cormoran/os_detection/os_detection";
import {
  Request as DefaultLayerRequest,
  Response as DefaultLayerResponse,
} from "../../proto/cormoran/default_layer/default_layer";
import {
  Request as FastKeymapRequest,
  Response as FastKeymapResponse,
  ErrorCode as FastKeymapErrorCode,
  LayoutDetailsMode as FastLayoutDetailsMode,
} from "../../proto/cormoran/fast_keymap/fast_keymap";
import {
  FAST_KEYMAP_IDENTIFIER,
  SETTING_EXPOSE_IDENTIFIER,
  SETTING_EXPOSE_UI_URL,
  isDemoSubsystemEnabled,
} from "./demo-subsystems";
import {
  ANSI60,
  ORTHO,
  CORNE6,
  DYA_DASH_ARROW,
  DYA_DASH,
  DYA2_ANSI,
  DYA2_JIS,
} from "../layouts";
import { ErrorConditions } from "@zmkfirmware/zmk-studio-ts-client/meta";
import { KEYBOARD_KEYCODES } from "../keycodes";
import { BEHAVIORS } from "./behaviors";
import {
  RemoveLayerErrorCode,
  MoveLayerErrorCode,
  RestoreLayerErrorCode,
  SetLayerPropsResponse,
  type Layer,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";

// Framing protocol
const SOF = 0xab;
const EOF = 0xad;
const ESC = 0xac;

/**
 * Demo keyboard data
 */
const LAYOUTS = [
  DYA_DASH,
  DYA_DASH_ARROW,
  DYA2_ANSI,
  DYA2_JIS,
  ANSI60,
  ORTHO,
  CORNE6,
];
const maxKeys = LAYOUTS.reduce(
  (max, layout) => (layout.keys.length > max ? layout.keys.length : max),
  0,
);
const DEMO = {
  device: {
    name: "DYA Keyboard (Demo)",
    serialNumber: new Uint8Array([0x44, 0x59, 0x41, 0x44, 0x45, 0x4d, 0x4f]), // "DYADEMO"
  },
  layouts: {
    activeLayoutIndex: 0,
    layouts: LAYOUTS,
  },
  keymap: {
    layers: [
      {
        id: 0,
        name: "Base",
        bindings: KEYBOARD_KEYCODES.splice(0, maxKeys).map((code) => ({
          behaviorId: 10,
          param1: code.code,
          param2: 0,
        })),
      },
      {
        id: 1,
        name: "Lower",
        bindings: Array(maxKeys).fill({ behaviorId: 35, param1: 0, param2: 0 }),
      },
      {
        id: 2,
        name: "Raise",
        bindings: Array(maxKeys).fill({ behaviorId: 35, param1: 0, param2: 0 }),
      },
    ],
    availableLayers: 8,
    maxLayerNameLength: 32,
  },
  behaviors: BEHAVIORS,
};

/**
 * Frame bytes
 */
function frame(bytes: Uint8Array): Uint8Array {
  const result: number[] = [SOF];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === SOF || b === EOF || b === ESC) {
      result.push(ESC);
    }
    result.push(b);
  }
  result.push(EOF);
  return new Uint8Array(result);
}

/**
 * Demo keyboard
 */
class Keyboard {
  private dirty = false;
  private persistent: typeof DEMO = JSON.parse(JSON.stringify(DEMO));
  private data: typeof DEMO = JSON.parse(JSON.stringify(DEMO));
  private deletedLayers: Layer[] = [];

  // Custom subsystem handlers
  private bleHandler = new BLEManagementHandler();
  private settingsHandler = new SettingsHandler();
  private deviceInfoHandler = new DeviceInfoHandler();
  private watchdogHandler = new WatchdogHandler();
  private kscanDiagnosticsHandler = new KscanDiagnosticsHandler();
  private pmw3610Handler = new Pmw3610Handler();
  private runtimeInputProcessorHandler = new RuntimeInputProcessorHandler();
  private runtimeSensorRotateHandler = new RuntimeSensorRotateHandler();
  private runtimeComboHandler = new RuntimeComboHandler();
  private runtimeMacroHandler: RuntimeMacroHandler;
  private physicalLayoutsHandler = new PhysicalLayoutsHandler();
  private inputStreamHandler = new InputStreamHandler();
  private customSettingsHandler: CustomSettingsHandler;
  private osDetectionHandler = new OsDetectionHandler();
  private defaultLayerHandler: DefaultLayerHandler;

  // Custom subsystems registry
  private readonly BLE_SUBSYSTEM_INDEX = 0;
  private readonly SETTINGS_SUBSYSTEM_INDEX = 1;
  private readonly DEVICE_INFO_SUBSYSTEM_INDEX = 2;
  private readonly RUNTIME_INPUT_PROCESSOR_SUBSYSTEM_INDEX = 3;
  private readonly RUNTIME_SENSOR_ROTATE_SUBSYSTEM_INDEX = 4;
  private readonly RUNTIME_COMBO_SUBSYSTEM_INDEX = 5;
  private readonly RUNTIME_MACRO_SUBSYSTEM_INDEX = 6;
  private readonly PHYSICAL_LAYOUTS_SUBSYSTEM_INDEX = 7;
  private readonly INPUT_STREAM_SUBSYSTEM_INDEX = 8;
  private readonly CUSTOM_SETTINGS_SUBSYSTEM_INDEX = 9;
  private readonly WATCHDOG_SUBSYSTEM_INDEX = 10;
  private readonly KSCAN_DIAGNOSTICS_SUBSYSTEM_INDEX = 11;
  private readonly PMW3610_SUBSYSTEM_INDEX = 12;
  private readonly OS_DETECTION_SUBSYSTEM_INDEX = 13;
  private readonly DEFAULT_LAYER_SUBSYSTEM_INDEX = 14;
  private readonly FAST_KEYMAP_SUBSYSTEM_INDEX = 15;
  private readonly SETTING_EXPOSE_SUBSYSTEM_INDEX = 16;

  constructor() {
    this.customSettingsHandler = new CustomSettingsHandler(
      this.SETTINGS_SUBSYSTEM_INDEX,
    );
    this.runtimeMacroHandler = new RuntimeMacroHandler(
      this.customSettingsHandler,
    );
    this.defaultLayerHandler = new DefaultLayerHandler(
      this.data.keymap.layers.length,
    );
  }

  private customSubsystems = [
    {
      index: this.BLE_SUBSYSTEM_INDEX,
      identifier: BLE_MANAGEMENT_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.SETTINGS_SUBSYSTEM_INDEX,
      identifier: SETTINGS_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.DEVICE_INFO_SUBSYSTEM_INDEX,
      identifier: DEVICE_INFO_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.RUNTIME_INPUT_PROCESSOR_SUBSYSTEM_INDEX,
      identifier: RUNTIME_INPUT_PROCESSOR_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.RUNTIME_SENSOR_ROTATE_SUBSYSTEM_INDEX,
      identifier: RUNTIME_SENSOR_ROTATE_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.RUNTIME_COMBO_SUBSYSTEM_INDEX,
      identifier: RUNTIME_COMBO_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.RUNTIME_MACRO_SUBSYSTEM_INDEX,
      identifier: RUNTIME_MACRO_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.PHYSICAL_LAYOUTS_SUBSYSTEM_INDEX,
      identifier: PHYSICAL_LAYOUTS_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.INPUT_STREAM_SUBSYSTEM_INDEX,
      identifier: INPUT_STREAM_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.CUSTOM_SETTINGS_SUBSYSTEM_INDEX,
      identifier: CUSTOM_SETTINGS_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.WATCHDOG_SUBSYSTEM_INDEX,
      identifier: WATCHDOG_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.KSCAN_DIAGNOSTICS_SUBSYSTEM_INDEX,
      identifier: KSCAN_DIAGNOSTICS_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.PMW3610_SUBSYSTEM_INDEX,
      identifier: PMW3610_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.OS_DETECTION_SUBSYSTEM_INDEX,
      identifier: OS_DETECTION_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.DEFAULT_LAYER_SUBSYSTEM_INDEX,
      identifier: DEFAULT_LAYER_IDENTIFIER,
      uiUrl: [],
    },
    {
      index: this.FAST_KEYMAP_SUBSYSTEM_INDEX,
      identifier: FAST_KEYMAP_IDENTIFIER,
      uiUrl: [],
    },
    {
      // No dedicated DYA Studio UI: the firmware module ships its own external
      // web UI, so this advertises a uiUrl and shows up as an external-link
      // card on the Subsystems tab.
      index: this.SETTING_EXPOSE_SUBSYSTEM_INDEX,
      identifier: SETTING_EXPOSE_IDENTIFIER,
      uiUrl: [SETTING_EXPOSE_UI_URL],
    },
  ];

  process(req: Request): Response {
    // Response structure: { requestResponse: { requestId, core/keymap/behaviors } }
    const rr: RequestResponse = { requestId: req.requestId };
    console.log("Demo received request:", req);
    if (req.core?.getDeviceInfo) {
      rr.core = { getDeviceInfo: this.data.device };
    } else if (req.core?.getLockState) {
      // The demo keyboard is always unlocked
      // (LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED = 1).
      rr.core = { getLockState: 1 };
    } else if (req.core?.resetSettings) {
      // Factory reset: acknowledge success. The demo keeps its in-memory
      // keymap as-is (a real device would wipe flash and reload defaults).
      rr.core = { resetSettings: true };
    } else if (req.keymap?.getPhysicalLayouts) {
      rr.keymap = { getPhysicalLayouts: this.data.layouts };
    } else if (req.keymap?.getKeymap) {
      rr.keymap = { getKeymap: this.data.keymap };
    } else if (req.keymap?.checkUnsavedChanges !== undefined) {
      rr.keymap = { checkUnsavedChanges: this.dirty };
    } else if (req.keymap?.setActivePhysicalLayout !== undefined) {
      const layoutIndex = req.keymap.setActivePhysicalLayout;
      this.data.layouts.activeLayoutIndex = layoutIndex;
      rr.keymap = {
        setActivePhysicalLayout: {
          ok: this.data.keymap,
        },
      };
    } else if (req.keymap?.setLayerBinding) {
      const { layerId, keyPosition, binding } = req.keymap.setLayerBinding;
      const layer = this.data.keymap.layers.find(
        (l: { id: number }) => l.id === layerId,
      );
      if (layer && keyPosition >= 0 && keyPosition < layer.bindings.length) {
        layer.bindings[keyPosition] = binding;
        this.dirty = true;
        rr.keymap = { setLayerBinding: 0 };
      } else {
        rr.keymap = { setLayerBinding: 1 };
      }
    } else if (req.keymap?.setLayerProps) {
      const { layerId, name } = req.keymap.setLayerProps;
      const layer = this.data.keymap.layers.find(
        (layer) => layer.id === layerId,
      );
      // An empty name is an acknowledged no-op in the official protocol.
      if (!name) {
        rr.keymap = {
          setLayerProps: SetLayerPropsResponse.SET_LAYER_PROPS_RESP_OK,
        };
      } else if (!layer) {
        rr.keymap = {
          setLayerProps:
            SetLayerPropsResponse.SET_LAYER_PROPS_RESP_ERR_INVALID_ID,
        };
      } else if (
        new TextEncoder().encode(name).length >=
        this.data.keymap.maxLayerNameLength
      ) {
        // The firmware limit includes the terminating NUL byte.
        rr.keymap = {
          setLayerProps: SetLayerPropsResponse.SET_LAYER_PROPS_RESP_ERR_GENERIC,
        };
      } else {
        layer.name = name;
        this.dirty = true;
        rr.keymap = {
          setLayerProps: SetLayerPropsResponse.SET_LAYER_PROPS_RESP_OK,
        };
      }
    } else if (req.keymap?.saveChanges !== undefined) {
      this.persistent = JSON.parse(JSON.stringify(this.data));
      this.dirty = false;
      rr.keymap = { saveChanges: { ok: true } };
    } else if (req.keymap?.discardChanges !== undefined) {
      this.dirty = false;
      this.data = JSON.parse(JSON.stringify(this.persistent));
      rr.keymap = { discardChanges: true };
    } else if (req.keymap?.addLayer) {
      const newIndex =
        this.data.keymap.layers.reduce(
          (max: number, layer: { id: number }) =>
            layer.id > max ? layer.id : max,
          -1,
        ) + 1;
      this.data.keymap.layers.push({
        id: newIndex,
        name: `Layer ${newIndex}`,
        bindings: Array(
          this.data.layouts.layouts[this.data.layouts.activeLayoutIndex].keys
            .length,
        ).fill({ behaviorId: 35, param1: 0, param2: 0 }),
      });
      this.dirty = true;
      rr.keymap = {
        addLayer: {
          ok: {
            index: newIndex,
            layer: this.data.keymap.layers[this.data.keymap.layers.length - 1],
          },
        },
      };
    } else if (req.keymap?.removeLayer) {
      const { layerIndex } = req.keymap.removeLayer;
      const layer = this.data.keymap.layers[layerIndex];
      if (layer) {
        this.deletedLayers.push(layer);
        this.data.keymap.layers.splice(layerIndex, 1);
        this.dirty = true;
        rr.keymap = {
          removeLayer: {
            ok: {},
          },
        };
      } else {
        rr.keymap = {
          removeLayer: {
            err: RemoveLayerErrorCode.REMOVE_LAYER_ERR_INVALID_INDEX,
          },
        };
      }
    } else if (req.keymap?.restoreLayer) {
      const layer = this.deletedLayers.find(
        (l) => l.id === req.keymap?.restoreLayer?.layerId,
      );
      if (layer) {
        this.deletedLayers = this.deletedLayers.filter(
          (l) => l.id !== layer.id,
        );
        this.data.keymap.layers.splice(
          req.keymap.restoreLayer.atIndex,
          0,
          layer,
        );
        this.dirty = true;
        rr.keymap = {
          restoreLayer: {
            ok: layer,
          },
        };
      } else {
        rr.keymap = {
          restoreLayer: {
            err: RestoreLayerErrorCode.RESTORE_LAYER_ERR_INVALID_ID,
          },
        };
      }
    } else if (req.keymap?.moveLayer) {
      const fromIdx = req.keymap.moveLayer.startIndex;
      const toIdx = req.keymap.moveLayer.destIndex;

      if (this.data.keymap.layers[fromIdx] && this.data.keymap.layers[toIdx]) {
        const a = this.data.keymap.layers[fromIdx];
        const b = this.data.keymap.layers[toIdx];
        this.data.keymap.layers[toIdx] = a;
        this.data.keymap.layers[fromIdx] = b;
        this.dirty = true;
        rr.keymap = {
          moveLayer: {
            ok: this.data.keymap,
          },
        };
      } else {
        rr.keymap = {
          moveLayer: {
            err: MoveLayerErrorCode.MOVE_LAYER_ERR_INVALID_LAYER,
          },
        };
      }
    } else if (req.behaviors?.listAllBehaviors) {
      rr.behaviors = {
        listAllBehaviors: {
          behaviors: this.persistent.behaviors.map((b) => b.id),
        },
      };
    } else if (req.behaviors?.getBehaviorDetails) {
      const b = DEMO.behaviors.find(
        (x) => x.id === req.behaviors?.getBehaviorDetails?.behaviorId,
      );
      rr.behaviors = { getBehaviorDetails: b || DEMO.behaviors[0] };
    } else if (req.custom?.listCustomSubsystems) {
      // Honor the demo-mode per-subsystem enable/disable toggles so the app
      // sees only the subsystems the user turned on (Subsystems tab).
      rr.custom = {
        listCustomSubsystems: {
          subsystems: this.customSubsystems.filter((s) =>
            isDemoSubsystemEnabled(s.identifier),
          ),
        },
      };
    } else if (req.custom?.call) {
      const { subsystemIndex, payload: data } = req.custom.call;
      let responseData: Uint8Array | null = null;

      if (subsystemIndex === this.BLE_SUBSYSTEM_INDEX) {
        // BLE Management
        try {
          const bleReq = BLERequest.decode(data);
          const bleResp = this.bleHandler.process(bleReq);
          responseData = BLEResponse.encode(bleResp).finish();
        } catch (e) {
          console.error("BLE subsystem error:", e);
        }
      } else if (subsystemIndex === this.SETTINGS_SUBSYSTEM_INDEX) {
        // Settings
        try {
          const settingsReq = SettingsRequest.decode(data);
          const settingsResp = this.settingsHandler.process(settingsReq);
          responseData = SettingsResponse.encode(settingsResp).finish();
        } catch (e) {
          console.error("Settings subsystem error:", e);
        }
      } else if (subsystemIndex === this.DEVICE_INFO_SUBSYSTEM_INDEX) {
        // Device Info
        try {
          const deviceInfoReq = DeviceInfoRequest.decode(data);
          const deviceInfoResp = this.deviceInfoHandler.process(deviceInfoReq);
          responseData = DeviceInfoResponse.encode(deviceInfoResp).finish();
        } catch (e) {
          console.error("Device Info subsystem error:", e);
        }
      } else if (subsystemIndex === this.WATCHDOG_SUBSYSTEM_INDEX) {
        // Watchdog
        try {
          const watchdogReq = WatchdogRequest.decode(data);
          const watchdogResp = this.watchdogHandler.process(watchdogReq);
          responseData = WatchdogResponse.encode(watchdogResp).finish();
        } catch (e) {
          console.error("Watchdog subsystem error:", e);
        }
      } else if (subsystemIndex === this.KSCAN_DIAGNOSTICS_SUBSYSTEM_INDEX) {
        // KScan Diagnostics
        try {
          const kscanReq = KscanDiagnosticsRequest.decode(data);
          const kscanResp = this.kscanDiagnosticsHandler.process(kscanReq);
          responseData = KscanDiagnosticsResponse.encode(kscanResp).finish();
        } catch (e) {
          console.error("KScan Diagnostics subsystem error:", e);
        }
      } else if (subsystemIndex === this.PMW3610_SUBSYSTEM_INDEX) {
        // PMW3610
        try {
          const pmw3610Req = Pmw3610Request.decode(data);
          const pmw3610Resp = this.pmw3610Handler.process(pmw3610Req);
          responseData = Pmw3610Response.encode(pmw3610Resp).finish();
        } catch (e) {
          console.error("PMW3610 subsystem error:", e);
        }
      } else if (
        subsystemIndex === this.RUNTIME_INPUT_PROCESSOR_SUBSYSTEM_INDEX
      ) {
        // Runtime Input Processor
        try {
          const runtimeReq = RuntimeInputProcessorRequest.decode(data);
          const runtimeResp =
            this.runtimeInputProcessorHandler.process(runtimeReq);
          responseData =
            RuntimeInputProcessorResponse.encode(runtimeResp).finish();
        } catch (e) {
          console.error("Runtime Input Processor subsystem error:", e);
        }
      } else if (
        subsystemIndex === this.RUNTIME_SENSOR_ROTATE_SUBSYSTEM_INDEX
      ) {
        // Runtime Sensor Rotate
        try {
          const sensorReq = RuntimeSensorRotateRequest.decode(data);
          const sensorResp = this.runtimeSensorRotateHandler.process(sensorReq);
          responseData =
            RuntimeSensorRotateResponse.encode(sensorResp).finish();
        } catch (e) {
          console.error("Runtime Sensor Rotate subsystem error:", e);
        }
      } else if (subsystemIndex === this.RUNTIME_COMBO_SUBSYSTEM_INDEX) {
        // Runtime Combo
        try {
          const comboReq = RuntimeComboRequest.decode(data);
          const comboResp = this.runtimeComboHandler.process(comboReq);
          responseData = RuntimeComboResponse.encode(comboResp).finish();
        } catch (e) {
          console.error("Runtime Combo subsystem error:", e);
        }
      } else if (subsystemIndex === this.RUNTIME_MACRO_SUBSYSTEM_INDEX) {
        // Runtime Macro
        try {
          const macroReq = RuntimeMacroRequest.decode(data);
          const macroResp = this.runtimeMacroHandler.process(macroReq);
          responseData = RuntimeMacroResponse.encode(macroResp).finish();
        } catch (e) {
          console.error("Runtime Macro subsystem error:", e);
        }
      } else if (subsystemIndex === this.PHYSICAL_LAYOUTS_SUBSYSTEM_INDEX) {
        // Physical Layouts
        try {
          const physicalLayoutsReq = PhysicalLayoutsRequest.decode(data);
          const physicalLayoutsResp =
            this.physicalLayoutsHandler.process(physicalLayoutsReq);
          responseData =
            PhysicalLayoutsResponse.encode(physicalLayoutsResp).finish();
        } catch (e) {
          console.error("Physical Layouts subsystem error:", e);
        }
      } else if (subsystemIndex === this.INPUT_STREAM_SUBSYSTEM_INDEX) {
        // Input Stream
        try {
          const inputStreamReq = InputStreamRequest.decode(data);
          const inputStreamResp =
            this.inputStreamHandler.process(inputStreamReq);
          responseData = InputStreamResponse.encode(inputStreamResp).finish();
        } catch (e) {
          console.error("Input Stream subsystem error:", e);
        }
      } else if (subsystemIndex === this.CUSTOM_SETTINGS_SUBSYSTEM_INDEX) {
        // Custom Settings
        try {
          const customSettingsReq = CustomSettingsRequest.decode(data);
          const customSettingsResp =
            this.customSettingsHandler.process(customSettingsReq);
          responseData =
            CustomSettingsResponse.encode(customSettingsResp).finish();
        } catch (e) {
          console.error("Custom Settings subsystem error:", e);
        }
      } else if (subsystemIndex === this.OS_DETECTION_SUBSYSTEM_INDEX) {
        // OS Detection
        try {
          const osDetectionReq = OsDetectionRequest.decode(data);
          const osDetectionResp =
            this.osDetectionHandler.process(osDetectionReq);
          responseData = OsDetectionResponse.encode(osDetectionResp).finish();
        } catch (e) {
          console.error("OS Detection subsystem error:", e);
        }
      } else if (subsystemIndex === this.DEFAULT_LAYER_SUBSYSTEM_INDEX) {
        // Default Layer
        try {
          const defaultLayerReq = DefaultLayerRequest.decode(data);
          const defaultLayerResp =
            this.defaultLayerHandler.process(defaultLayerReq);
          responseData = DefaultLayerResponse.encode(defaultLayerResp).finish();
        } catch (e) {
          console.error("Default Layer subsystem error:", e);
        }
      } else if (subsystemIndex === this.FAST_KEYMAP_SUBSYSTEM_INDEX) {
        // Fast Keymap (read-only fast loader) — serves the same keymap /
        // behaviors / layout data as the official protocol below.
        try {
          const fastReq = FastKeymapRequest.decode(data);
          const fastResp = this.handleFastKeymap(fastReq);
          responseData = FastKeymapResponse.encode(fastResp).finish();
        } catch (e) {
          console.error("Fast Keymap subsystem error:", e);
        }
      }

      if (responseData) {
        rr.custom = {
          call: {
            subsystemIndex,
            payload: responseData,
          },
        };
      } else {
        rr.meta = {
          simpleError: ErrorConditions.GENERIC,
        };
      }
    }
    if (Object.keys(rr).length === 1) {
      rr.meta = {
        simpleError: ErrorConditions.RPC_NOT_FOUND,
      };
    }
    console.log("Demo sending response:", rr);
    return { requestResponse: rr };
  }

  /**
   * Serve the `cormoran__fast_keymap` read-only subsystem from the same demo
   * keymap/behaviors/layout data the official protocol uses. Fingerprints are
   * stable constants: the demo resets to DEMO on every reconnect, so the
   * web's fingerprint cache stays valid across loads. Behavior details are
   * always inlined (mode-agnostic) so the web resolves every behavior from the
   * device without needing a matching bundled def_fp.
   */
  private handleFastKeymap(req: FastKeymapRequest): FastKeymapResponse {
    const km = this.data.keymap;
    const behaviors = this.data.behaviors;
    const layoutsData = this.data.layouts;

    const layerFp = (id: number) => 0x1000 + id;
    const layoutFp = (i: number) => 0x2000 + i;
    // Arbitrary stable def_fp within 16 bits (def_fp_bits = 16 below), so the
    // web never has to widen. Values don't match the bundle, so the web always
    // uses the inlined details the demo serves.
    const behaviorDefFp = (id: number) => 0x5000 + id;
    // Honor the PR #2 include_alias / exclude_display_name flags so the demo
    // reflects the wire optimization (def_fp still identifies the behavior
    // regardless of which human-readable fields are inlined).
    const detailsOf = (
      b: (typeof behaviors)[number],
      includeAlias: boolean,
      excludeDisplayName: boolean,
    ) => ({
      displayName: excludeDisplayName ? "" : b.displayName,
      alias: includeAlias ? b.displayName : "",
      metadata: b.metadata,
    });
    const findLayer = (layerId: number) =>
      km.layers.find((l) => l.id === layerId);
    const layerResponse = (layerId: number) => {
      const l = findLayer(layerId);
      return {
        id: l?.id ?? layerId,
        name: l?.name ?? "",
        bindings: l?.bindings ?? [],
      };
    };

    if (req.getSnapshot) {
      return {
        snapshot: {
          definitionVersion: 2,
          behaviorsFp: 0xbeef,
          defaultKeymapFp: 0x3000,
          keymapFp: 0x3000,
          physicalLayoutFp: 0x4000,
          behaviorCount: behaviors.length,
          maxLayerNameLength: km.maxLayerNameLength,
          availableLayers: km.availableLayers,
          activeLayoutIndex: layoutsData.activeLayoutIndex,
          defFpBits: 16,
          // fp === defaultFp per layer (no edits) -> web uses get_layer(s).
          layers: km.layers.map((l) => ({
            id: l.id,
            name: l.name,
            bindingCount: l.bindings.length,
            fp: layerFp(l.id),
            defaultFp: layerFp(l.id),
            editedCount: 0,
          })),
        },
      };
    }

    if (req.listBehaviors) {
      const { includeAlias, excludeDisplayName } = req.listBehaviors;
      return {
        listBehaviors: {
          behaviors: behaviors.map((b) => ({
            localId: b.id,
            defFp: behaviorDefFp(b.id),
            details: detailsOf(b, includeAlias, excludeDisplayName),
          })),
        },
      };
    }

    if (req.getBehaviors) {
      const { behaviorIds, includeAlias, excludeDisplayName } =
        req.getBehaviors;
      return {
        getBehaviors: {
          behaviors: (behaviorIds ?? []).map((id) => {
            const b = behaviors.find((x) => x.id === id) ?? behaviors[0];
            return {
              id,
              details: detailsOf(b, includeAlias, excludeDisplayName),
            };
          }),
        },
      };
    }

    if (req.getLayer) {
      return { getLayer: layerResponse(req.getLayer.layerId) };
    }

    if (req.getLayers) {
      // Batch fetch (PR #2): return every requested layer in one response.
      return {
        getLayers: {
          layers: (req.getLayers.layerIds ?? []).map((id) => layerResponse(id)),
        },
      };
    }

    if (req.getDefaultLayer) {
      // The compiled-in (devicetree-stock) default never changes with edits, so
      // read it from the pristine DEMO baseline rather than the live keymap --
      // this is what real firmware's get_default_layer returns, and it lets the
      // "changed from default" / "reset to default" features work in demo mode.
      const l = DEMO.keymap.layers.find(
        (layer) => layer.id === req.getDefaultLayer!.layerId,
      );
      return {
        getDefaultLayer: {
          id: l?.id ?? req.getDefaultLayer.layerId,
          name: l?.name ?? "",
          bindings: l?.bindings ?? [],
        },
      };
    }

    if (req.getEditedLayer) {
      // Demo keymap has no edits vs. its compiled-in default.
      return {
        getEditedLayer: { id: req.getEditedLayer.layerId, bindings: [] },
      };
    }

    if (req.getPending) {
      // Unsaved (pending) positions = the current in-memory bindings that
      // differ from what was last saved (this.persistent), so the web can
      // restore the "pending to save" highlight after a keymap-tab remount.
      // Only layers with at least one pending position are included.
      const savedLayers = this.persistent.keymap.layers;
      const pendingLayers = km.layers
        .map((l) => {
          const saved = savedLayers.find((s: { id: number }) => s.id === l.id);
          const positions: number[] = [];
          l.bindings.forEach((b, position) => {
            const s = saved?.bindings[position];
            if (
              !s ||
              s.behaviorId !== b.behaviorId ||
              s.param1 !== b.param1 ||
              s.param2 !== b.param2
            ) {
              positions.push(position);
            }
          });
          return { id: l.id, positions };
        })
        .filter((l) => l.positions.length > 0);
      return { getPending: { layers: pendingLayers } };
    }

    if (req.getPhysicalLayouts) {
      const withKeys =
        req.getPhysicalLayouts.details ===
        FastLayoutDetailsMode.LAYOUT_DETAILS_ALL;
      return {
        getPhysicalLayouts: {
          activeLayoutIndex: layoutsData.activeLayoutIndex,
          layouts: layoutsData.layouts.map((l, i) => ({
            name: l.name,
            fp: layoutFp(i),
            keys: withKeys ? l.keys : [],
            // The demo doesn't hoist a common key size (0 = "no default"); each
            // key carries its own width/height (PR #2's optimization is opt-in).
            defaultWidth: 0,
            defaultHeight: 0,
          })),
        },
      };
    }

    if (req.getPhysicalLayout) {
      const i = req.getPhysicalLayout.layoutIndex;
      const l = layoutsData.layouts[i];
      return {
        getPhysicalLayout: {
          index: i,
          layout: {
            name: l?.name ?? "",
            fp: layoutFp(i),
            keys: l?.keys ?? [],
            defaultWidth: 0,
            defaultHeight: 0,
          },
        },
      };
    }

    return { error: { code: FastKeymapErrorCode.ERR_GENERIC } };
  }

  notify(callback: (data: Uint8Array) => void) {
    this.settingsHandler.notify((payload: Uint8Array) => {
      callback(
        Response.encode({
          notification: {
            custom: {
              customNotification: {
                subsystemIndex: this.SETTINGS_SUBSYSTEM_INDEX,
                payload: payload,
              },
            },
          },
        }).finish(),
      );
    });

    this.runtimeInputProcessorHandler.notify((payload: Uint8Array) => {
      callback(
        Response.encode({
          notification: {
            custom: {
              customNotification: {
                subsystemIndex: this.RUNTIME_INPUT_PROCESSOR_SUBSYSTEM_INDEX,
                payload: payload,
              },
            },
          },
        }).finish(),
      );
    });

    this.runtimeSensorRotateHandler.notify((payload: Uint8Array) => {
      callback(
        Response.encode({
          notification: {
            custom: {
              customNotification: {
                subsystemIndex: this.RUNTIME_SENSOR_ROTATE_SUBSYSTEM_INDEX,
                payload: payload,
              },
            },
          },
        }).finish(),
      );
    });

    this.inputStreamHandler.notify((payload: Uint8Array) => {
      callback(
        Response.encode({
          notification: {
            custom: {
              customNotification: {
                subsystemIndex: this.INPUT_STREAM_SUBSYSTEM_INDEX,
                payload: payload,
              },
            },
          },
        }).finish(),
      );
    });

    this.customSettingsHandler.notify((payload: Uint8Array) => {
      callback(
        Response.encode({
          notification: {
            custom: {
              customNotification: {
                subsystemIndex: this.CUSTOM_SETTINGS_SUBSYSTEM_INDEX,
                payload: payload,
              },
            },
          },
        }).finish(),
      );
    });

    this.pmw3610Handler.notify((payload: Uint8Array) => {
      callback(
        Response.encode({
          notification: {
            custom: {
              customNotification: {
                subsystemIndex: this.PMW3610_SUBSYSTEM_INDEX,
                payload: payload,
              },
            },
          },
        }).finish(),
      );
    });

    this.kscanDiagnosticsHandler.notify((payload: Uint8Array) => {
      callback(
        Response.encode({
          notification: {
            custom: {
              customNotification: {
                subsystemIndex: this.KSCAN_DIAGNOSTICS_SUBSYSTEM_INDEX,
                payload: payload,
              },
            },
          },
        }).finish(),
      );
    });
  }

  /** Stop any demo-side background activity (e.g. the pmw3610 frame
   * stream's interval) when the transport disconnects. */
  disconnect() {
    this.pmw3610Handler.disconnect();
  }
}

/**
 * Connect to demo keyboard
 */
export async function connect(): Promise<RpcTransport> {
  const abort = new AbortController();
  const kb = new Keyboard();
  // Stop any running demo-side interval (e.g. the pmw3610 frame stream) on
  // disconnect, so it doesn't keep firing (or leak timers in tests) after
  // the transport is torn down.
  abort.signal.addEventListener("abort", () => kb.disconnect());

  // Buffer for accumulating bytes across chunks
  let buffer: number[] = [];
  let escaped = false;
  let inFrame = false;

  const noti = new ReadableStream<Uint8Array>({
    start(controller) {
      kb.notify((data: Uint8Array) => {
        controller.enqueue(frame(data));
      });
    },
  });

  const tx = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      try {
        // Process each byte
        for (let i = 0; i < chunk.length; i++) {
          const b = chunk[i];

          if (escaped) {
            buffer.push(b);
            escaped = false;
          } else if (b === SOF) {
            // Start of frame
            buffer = [];
            inFrame = true;
          } else if (b === EOF && inFrame) {
            // End of frame - process it
            if (buffer.length > 0) {
              const frameBytes = new Uint8Array(buffer);
              const req = Request.decode(frameBytes);
              const res = kb.process(req);
              const encoded = Response.encode(res).finish();
              const framed = frame(encoded);
              ctrl.enqueue(framed);
            }
            buffer = [];
            inFrame = false;
          } else if (b === ESC) {
            escaped = true;
          } else if (inFrame) {
            buffer.push(b);
          }
        }
      } catch (e) {
        console.error("Demo error:", e);
      }
    },
  });
  const rx = new ReadableStream<Uint8Array>({
    start(controller) {
      tx.readable.pipeTo(
        new WritableStream<Uint8Array>({
          write(chunk) {
            controller.enqueue(chunk);
          },
        }),
      );
      noti.pipeTo(
        new WritableStream<Uint8Array>({
          write(chunk) {
            controller.enqueue(chunk);
          },
        }),
      );
    },
  });

  return {
    label: "Demo",
    abortController: abort,
    readable: rx,
    writable: tx.writable,
  };
}
