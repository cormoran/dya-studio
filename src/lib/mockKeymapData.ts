/**
 * Mock Keymap Data for Demo Mode
 *
 * Provides realistic sample keymap data for users to explore
 * the keymap editor without connecting a real keyboard.
 */
import type {
  Keymap,
  PhysicalLayouts,
  BehaviorBinding,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { BehaviorDefinition } from "../hooks/useKeymap";

/**
 * Mock physical layout representing a simplified split keyboard
 */
export const mockPhysicalLayouts: PhysicalLayouts = {
  activeLayoutIndex: 0,
  layouts: [
    {
      name: "DYA Demo Layout",
      keys: [
        // Left half - Row 1
        { width: 100, height: 100, x: 0, y: 0, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 110, y: 0, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 220, y: 0, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 330, y: 0, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 440, y: 0, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 550, y: 0, r: 0, rx: 0, ry: 0 },

        // Right half - Row 1
        { width: 100, height: 100, x: 750, y: 0, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 860, y: 0, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 970, y: 0, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 1080, y: 0, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 1190, y: 0, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 1300, y: 0, r: 0, rx: 0, ry: 0 },

        // Left half - Row 2
        { width: 100, height: 100, x: 0, y: 110, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 110, y: 110, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 220, y: 110, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 330, y: 110, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 440, y: 110, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 550, y: 110, r: 0, rx: 0, ry: 0 },

        // Right half - Row 2
        { width: 100, height: 100, x: 750, y: 110, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 860, y: 110, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 970, y: 110, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 1080, y: 110, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 1190, y: 110, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 1300, y: 110, r: 0, rx: 0, ry: 0 },

        // Left half - Row 3
        { width: 100, height: 100, x: 0, y: 220, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 110, y: 220, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 220, y: 220, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 330, y: 220, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 440, y: 220, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 550, y: 220, r: 0, rx: 0, ry: 0 },

        // Right half - Row 3
        { width: 100, height: 100, x: 750, y: 220, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 860, y: 220, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 970, y: 220, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 1080, y: 220, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 1190, y: 220, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 1300, y: 220, r: 0, rx: 0, ry: 0 },

        // Thumb clusters (left)
        { width: 100, height: 100, x: 220, y: 340, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 330, y: 340, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 440, y: 340, r: 0, rx: 0, ry: 0 },

        // Thumb clusters (right)
        { width: 100, height: 100, x: 860, y: 340, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 970, y: 340, r: 0, rx: 0, ry: 0 },
        { width: 100, height: 100, x: 1080, y: 340, r: 0, rx: 0, ry: 0 },
      ],
    },
  ],
};

// Common HID keycodes for the demo
const HID_A = 0x04;
const HID_B = 0x05;
const HID_C = 0x06;
const HID_D = 0x07;
const HID_E = 0x08;
const HID_F = 0x09;
const HID_G = 0x0a;
const HID_H = 0x0b;
const HID_I = 0x0c;
const HID_J = 0x0d;
const HID_K = 0x0e;
const HID_L = 0x0f;
const HID_M = 0x10;
const HID_N = 0x11;
const HID_O = 0x12;
const HID_P = 0x13;
const HID_Q = 0x14;
const HID_R = 0x15;
const HID_S = 0x16;
const HID_T = 0x17;
const HID_U = 0x18;
const HID_V = 0x19;
const HID_W = 0x1a;
const HID_X = 0x1b;
const HID_Y = 0x1c;
const HID_Z = 0x1d;
const HID_1 = 0x1e;
const HID_2 = 0x1f;
const HID_3 = 0x20;
const HID_4 = 0x21;
const HID_5 = 0x22;
const HID_6 = 0x23;
const HID_7 = 0x24;
const HID_8 = 0x25;
const HID_9 = 0x26;
const HID_0 = 0x27;
const HID_ENTER = 0x28;
const HID_ESC = 0x29;
const HID_BACKSPACE = 0x2a;
const HID_TAB = 0x2b;
const HID_SPACE = 0x2c;
const HID_LCTRL = 0xe0;
const HID_LSHIFT = 0xe1;

// Behavior IDs (typical ZMK behavior IDs)
export const BEHAVIOR_KP = 1; // Key press
export const BEHAVIOR_TRANS = 2; // Transparent
export const BEHAVIOR_MO = 3; // Momentary layer
export const BEHAVIOR_TO = 4; // To layer

/**
 * Create bindings for a QWERTY base layer
 */
function createBaseLayerBindings(): BehaviorBinding[] {
  return [
    // Row 1: Q W E R T Y | U I O P [ ]
    { behaviorId: BEHAVIOR_KP, param1: HID_Q, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_W, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_E, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_R, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_T, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_Y, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_U, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_I, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_O, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_P, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: 0x2f, param2: 0 }, // [
    { behaviorId: BEHAVIOR_KP, param1: 0x30, param2: 0 }, // ]

    // Row 2: A S D F G H | J K L ; ' Enter
    { behaviorId: BEHAVIOR_KP, param1: HID_A, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_S, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_D, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_F, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_G, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_H, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_J, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_K, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_L, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: 0x33, param2: 0 }, // ;
    { behaviorId: BEHAVIOR_KP, param1: 0x34, param2: 0 }, // '
    { behaviorId: BEHAVIOR_KP, param1: HID_ENTER, param2: 0 },

    // Row 3: Z X C V B N | M , . / Shift Esc
    { behaviorId: BEHAVIOR_KP, param1: HID_Z, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_X, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_C, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_V, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_B, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_N, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_M, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: 0x36, param2: 0 }, // ,
    { behaviorId: BEHAVIOR_KP, param1: 0x37, param2: 0 }, // .
    { behaviorId: BEHAVIOR_KP, param1: 0x38, param2: 0 }, // /
    { behaviorId: BEHAVIOR_KP, param1: HID_LSHIFT, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_ESC, param2: 0 },

    // Thumb clusters (left): Tab, Layer1, Space
    { behaviorId: BEHAVIOR_KP, param1: HID_TAB, param2: 0 },
    { behaviorId: BEHAVIOR_MO, param1: 1, param2: 0 }, // MO(1)
    { behaviorId: BEHAVIOR_KP, param1: HID_SPACE, param2: 0 },

    // Thumb clusters (right): Backspace, Layer2, Ctrl
    { behaviorId: BEHAVIOR_KP, param1: HID_BACKSPACE, param2: 0 },
    { behaviorId: BEHAVIOR_MO, param1: 2, param2: 0 }, // MO(2)
    { behaviorId: BEHAVIOR_KP, param1: HID_LCTRL, param2: 0 },
  ];
}

/**
 * Create bindings for a numbers/symbols layer
 */
function createNumbersLayerBindings(): BehaviorBinding[] {
  return [
    // Row 1: 1 2 3 4 5 6 | 7 8 9 0 - =
    { behaviorId: BEHAVIOR_KP, param1: HID_1, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_2, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_3, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_4, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_5, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_6, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_7, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_8, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_9, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: HID_0, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: 0x2d, param2: 0 }, // -
    { behaviorId: BEHAVIOR_KP, param1: 0x2e, param2: 0 }, // =

    // Row 2: transparent for others
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_KP, param1: 0x4f, param2: 0 }, // Right arrow
    { behaviorId: BEHAVIOR_KP, param1: 0x50, param2: 0 }, // Left arrow
    { behaviorId: BEHAVIOR_KP, param1: 0x51, param2: 0 }, // Down arrow
    { behaviorId: BEHAVIOR_KP, param1: 0x52, param2: 0 }, // Up arrow
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },

    // Row 3: transparent
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },

    // Thumb clusters: transparent
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
    { behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 },
  ];
}

/**
 * Create bindings for a function keys layer
 */
function createFunctionLayerBindings(): BehaviorBinding[] {
  return [
    // Row 1: F1-F12
    { behaviorId: BEHAVIOR_KP, param1: 0x3a, param2: 0 }, // F1
    { behaviorId: BEHAVIOR_KP, param1: 0x3b, param2: 0 }, // F2
    { behaviorId: BEHAVIOR_KP, param1: 0x3c, param2: 0 }, // F3
    { behaviorId: BEHAVIOR_KP, param1: 0x3d, param2: 0 }, // F4
    { behaviorId: BEHAVIOR_KP, param1: 0x3e, param2: 0 }, // F5
    { behaviorId: BEHAVIOR_KP, param1: 0x3f, param2: 0 }, // F6
    { behaviorId: BEHAVIOR_KP, param1: 0x40, param2: 0 }, // F7
    { behaviorId: BEHAVIOR_KP, param1: 0x41, param2: 0 }, // F8
    { behaviorId: BEHAVIOR_KP, param1: 0x42, param2: 0 }, // F9
    { behaviorId: BEHAVIOR_KP, param1: 0x43, param2: 0 }, // F10
    { behaviorId: BEHAVIOR_KP, param1: 0x44, param2: 0 }, // F11
    { behaviorId: BEHAVIOR_KP, param1: 0x45, param2: 0 }, // F12

    // Rest are transparent
    ...Array(30).fill({ behaviorId: BEHAVIOR_TRANS, param1: 0, param2: 0 }),
  ];
}

/**
 * Mock keymap with three layers
 */
export const mockKeymap: Keymap = {
  layers: [
    {
      id: 0,
      name: "Base",
      bindings: createBaseLayerBindings(),
    },
    {
      id: 1,
      name: "Numbers",
      bindings: createNumbersLayerBindings(),
    },
    {
      id: 2,
      name: "Function",
      bindings: createFunctionLayerBindings(),
    },
  ],
  availableLayers: 8,
  maxLayerNameLength: 32,
};

/**
 * Mock behavior definitions
 */
export const mockBehaviors: Map<number, BehaviorDefinition> = new Map([
  [
    BEHAVIOR_KP,
    {
      id: BEHAVIOR_KP,
      displayName: "kp",
      metadata: [],
    },
  ],
  [
    BEHAVIOR_TRANS,
    {
      id: BEHAVIOR_TRANS,
      displayName: "trans",
      metadata: [],
    },
  ],
  [
    BEHAVIOR_MO,
    {
      id: BEHAVIOR_MO,
      displayName: "mo",
      metadata: [],
    },
  ],
  [
    BEHAVIOR_TO,
    {
      id: BEHAVIOR_TO,
      displayName: "to",
      metadata: [],
    },
  ],
]);
