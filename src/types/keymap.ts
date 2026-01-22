/**
 * Keymap types and utilities
 */

export interface KeyPosition {
  layer: number;
  keyIndex: number;
}

export interface KeyBinding {
  behaviorId: number;
  param1: number;
  param2: number;
}

export interface KeymapLayer {
  id: number;
  name: string;
  bindings: KeyBinding[];
}

export interface KeymapState {
  layers: KeymapLayer[];
  activeLayer: number;
  availableLayers: number;
  maxLayerNameLength: number;
  unsavedChanges: boolean;
}

export interface KeycodeCategory {
  name: string;
  description: string;
  keycodes: KeycodeDefinition[];
}

export interface KeycodeDefinition {
  code: number;
  label: string;
  description?: string;
  behaviorId: number;
  param1?: number;
  param2?: number;
}

// Common keycodes organized by category
export const KEYCODE_CATEGORIES: KeycodeCategory[] = [
  {
    name: "Letters",
    description: "A-Z keys",
    keycodes: [
      { code: 0x04, label: "A", behaviorId: 0, param1: 0x04, param2: 0 },
      { code: 0x05, label: "B", behaviorId: 0, param1: 0x05, param2: 0 },
      { code: 0x06, label: "C", behaviorId: 0, param1: 0x06, param2: 0 },
      { code: 0x07, label: "D", behaviorId: 0, param1: 0x07, param2: 0 },
      { code: 0x08, label: "E", behaviorId: 0, param1: 0x08, param2: 0 },
      { code: 0x09, label: "F", behaviorId: 0, param1: 0x09, param2: 0 },
      { code: 0x0a, label: "G", behaviorId: 0, param1: 0x0a, param2: 0 },
      { code: 0x0b, label: "H", behaviorId: 0, param1: 0x0b, param2: 0 },
      { code: 0x0c, label: "I", behaviorId: 0, param1: 0x0c, param2: 0 },
      { code: 0x0d, label: "J", behaviorId: 0, param1: 0x0d, param2: 0 },
      { code: 0x0e, label: "K", behaviorId: 0, param1: 0x0e, param2: 0 },
      { code: 0x0f, label: "L", behaviorId: 0, param1: 0x0f, param2: 0 },
      { code: 0x10, label: "M", behaviorId: 0, param1: 0x10, param2: 0 },
      { code: 0x11, label: "N", behaviorId: 0, param1: 0x11, param2: 0 },
      { code: 0x12, label: "O", behaviorId: 0, param1: 0x12, param2: 0 },
      { code: 0x13, label: "P", behaviorId: 0, param1: 0x13, param2: 0 },
      { code: 0x14, label: "Q", behaviorId: 0, param1: 0x14, param2: 0 },
      { code: 0x15, label: "R", behaviorId: 0, param1: 0x15, param2: 0 },
      { code: 0x16, label: "S", behaviorId: 0, param1: 0x16, param2: 0 },
      { code: 0x17, label: "T", behaviorId: 0, param1: 0x17, param2: 0 },
      { code: 0x18, label: "U", behaviorId: 0, param1: 0x18, param2: 0 },
      { code: 0x19, label: "V", behaviorId: 0, param1: 0x19, param2: 0 },
      { code: 0x1a, label: "W", behaviorId: 0, param1: 0x1a, param2: 0 },
      { code: 0x1b, label: "X", behaviorId: 0, param1: 0x1b, param2: 0 },
      { code: 0x1c, label: "Y", behaviorId: 0, param1: 0x1c, param2: 0 },
      { code: 0x1d, label: "Z", behaviorId: 0, param1: 0x1d, param2: 0 },
    ],
  },
  {
    name: "Numbers",
    description: "Number keys",
    keycodes: [
      { code: 0x1e, label: "1", behaviorId: 0, param1: 0x1e, param2: 0 },
      { code: 0x1f, label: "2", behaviorId: 0, param1: 0x1f, param2: 0 },
      { code: 0x20, label: "3", behaviorId: 0, param1: 0x20, param2: 0 },
      { code: 0x21, label: "4", behaviorId: 0, param1: 0x21, param2: 0 },
      { code: 0x22, label: "5", behaviorId: 0, param1: 0x22, param2: 0 },
      { code: 0x23, label: "6", behaviorId: 0, param1: 0x23, param2: 0 },
      { code: 0x24, label: "7", behaviorId: 0, param1: 0x24, param2: 0 },
      { code: 0x25, label: "8", behaviorId: 0, param1: 0x25, param2: 0 },
      { code: 0x26, label: "9", behaviorId: 0, param1: 0x26, param2: 0 },
      { code: 0x27, label: "0", behaviorId: 0, param1: 0x27, param2: 0 },
    ],
  },
  {
    name: "Modifiers",
    description: "Modifier keys",
    keycodes: [
      { code: 0xe0, label: "LCtrl", behaviorId: 0, param1: 0xe0, param2: 0 },
      { code: 0xe1, label: "LShift", behaviorId: 0, param1: 0xe1, param2: 0 },
      { code: 0xe2, label: "LAlt", behaviorId: 0, param1: 0xe2, param2: 0 },
      { code: 0xe3, label: "LGui", behaviorId: 0, param1: 0xe3, param2: 0 },
      { code: 0xe4, label: "RCtrl", behaviorId: 0, param1: 0xe4, param2: 0 },
      { code: 0xe5, label: "RShift", behaviorId: 0, param1: 0xe5, param2: 0 },
      { code: 0xe6, label: "RAlt", behaviorId: 0, param1: 0xe6, param2: 0 },
      { code: 0xe7, label: "RGui", behaviorId: 0, param1: 0xe7, param2: 0 },
    ],
  },
  {
    name: "Special",
    description: "Special keys",
    keycodes: [
      { code: 0x28, label: "Enter", behaviorId: 0, param1: 0x28, param2: 0 },
      { code: 0x29, label: "Esc", behaviorId: 0, param1: 0x29, param2: 0 },
      { code: 0x2a, label: "Bksp", behaviorId: 0, param1: 0x2a, param2: 0 },
      { code: 0x2b, label: "Tab", behaviorId: 0, param1: 0x2b, param2: 0 },
      { code: 0x2c, label: "Space", behaviorId: 0, param1: 0x2c, param2: 0 },
      { code: 0x2d, label: "-", behaviorId: 0, param1: 0x2d, param2: 0 },
      { code: 0x2e, label: "=", behaviorId: 0, param1: 0x2e, param2: 0 },
      { code: 0x2f, label: "[", behaviorId: 0, param1: 0x2f, param2: 0 },
      { code: 0x30, label: "]", behaviorId: 0, param1: 0x30, param2: 0 },
      { code: 0x31, label: "\\", behaviorId: 0, param1: 0x31, param2: 0 },
      { code: 0x33, label: ";", behaviorId: 0, param1: 0x33, param2: 0 },
      { code: 0x34, label: "'", behaviorId: 0, param1: 0x34, param2: 0 },
      { code: 0x35, label: "`", behaviorId: 0, param1: 0x35, param2: 0 },
      { code: 0x36, label: ",", behaviorId: 0, param1: 0x36, param2: 0 },
      { code: 0x37, label: ".", behaviorId: 0, param1: 0x37, param2: 0 },
      { code: 0x38, label: "/", behaviorId: 0, param1: 0x38, param2: 0 },
      { code: 0x39, label: "Caps", behaviorId: 0, param1: 0x39, param2: 0 },
      { code: 0x4c, label: "Del", behaviorId: 0, param1: 0x4c, param2: 0 },
    ],
  },
  {
    name: "Function",
    description: "Function keys",
    keycodes: [
      { code: 0x3a, label: "F1", behaviorId: 0, param1: 0x3a, param2: 0 },
      { code: 0x3b, label: "F2", behaviorId: 0, param1: 0x3b, param2: 0 },
      { code: 0x3c, label: "F3", behaviorId: 0, param1: 0x3c, param2: 0 },
      { code: 0x3d, label: "F4", behaviorId: 0, param1: 0x3d, param2: 0 },
      { code: 0x3e, label: "F5", behaviorId: 0, param1: 0x3e, param2: 0 },
      { code: 0x3f, label: "F6", behaviorId: 0, param1: 0x3f, param2: 0 },
      { code: 0x40, label: "F7", behaviorId: 0, param1: 0x40, param2: 0 },
      { code: 0x41, label: "F8", behaviorId: 0, param1: 0x41, param2: 0 },
      { code: 0x42, label: "F9", behaviorId: 0, param1: 0x42, param2: 0 },
      { code: 0x43, label: "F10", behaviorId: 0, param1: 0x43, param2: 0 },
      { code: 0x44, label: "F11", behaviorId: 0, param1: 0x44, param2: 0 },
      { code: 0x45, label: "F12", behaviorId: 0, param1: 0x45, param2: 0 },
    ],
  },
  {
    name: "Navigation",
    description: "Arrow and navigation keys",
    keycodes: [
      { code: 0x4f, label: "→", behaviorId: 0, param1: 0x4f, param2: 0 },
      { code: 0x50, label: "←", behaviorId: 0, param1: 0x50, param2: 0 },
      { code: 0x51, label: "↓", behaviorId: 0, param1: 0x51, param2: 0 },
      { code: 0x52, label: "↑", behaviorId: 0, param1: 0x52, param2: 0 },
      { code: 0x49, label: "Ins", behaviorId: 0, param1: 0x49, param2: 0 },
      { code: 0x4a, label: "Home", behaviorId: 0, param1: 0x4a, param2: 0 },
      { code: 0x4b, label: "PgUp", behaviorId: 0, param1: 0x4b, param2: 0 },
      { code: 0x4d, label: "End", behaviorId: 0, param1: 0x4d, param2: 0 },
      { code: 0x4e, label: "PgDn", behaviorId: 0, param1: 0x4e, param2: 0 },
    ],
  },
  {
    name: "Layers",
    description: "Layer switching",
    keycodes: [
      { code: 1, label: "Layer 0", behaviorId: 1, param1: 0, param2: 0 },
      { code: 2, label: "Layer 1", behaviorId: 1, param1: 1, param2: 0 },
      { code: 3, label: "Layer 2", behaviorId: 1, param1: 2, param2: 0 },
      { code: 4, label: "Layer 3", behaviorId: 1, param1: 3, param2: 0 },
      { code: 5, label: "MO(1)", description: "Momentary Layer 1", behaviorId: 2, param1: 1, param2: 0 },
      { code: 6, label: "MO(2)", description: "Momentary Layer 2", behaviorId: 2, param1: 2, param2: 0 },
      { code: 7, label: "MO(3)", description: "Momentary Layer 3", behaviorId: 2, param1: 3, param2: 0 },
    ],
  },
  {
    name: "Media",
    description: "Media control keys",
    keycodes: [
      { code: 0xe9, label: "Vol+", behaviorId: 3, param1: 0x00e9, param2: 0 },
      { code: 0xea, label: "Vol-", behaviorId: 3, param1: 0x00ea, param2: 0 },
      { code: 0xe2, label: "Mute", behaviorId: 3, param1: 0x00e2, param2: 0 },
      { code: 0xcd, label: "Play", behaviorId: 3, param1: 0x00cd, param2: 0 },
      { code: 0xb5, label: "Next", behaviorId: 3, param1: 0x00b5, param2: 0 },
      { code: 0xb6, label: "Prev", behaviorId: 3, param1: 0x00b6, param2: 0 },
    ],
  },
];

/**
 * Get keycode label from binding
 */
export function getKeycodeLabel(binding: KeyBinding): string {
  // Search through all categories for matching keycode
  for (const category of KEYCODE_CATEGORIES) {
    const keycode = category.keycodes.find(
      (k) =>
        k.behaviorId === binding.behaviorId &&
        k.param1 === binding.param1 &&
        k.param2 === binding.param2
    );
    if (keycode) {
      return keycode.label;
    }
  }
  
  // Fallback to hex representation
  return `0x${binding.param1.toString(16).toUpperCase()}`;
}

/**
 * Check if two bindings are equal
 */
export function bindingsEqual(a: KeyBinding, b: KeyBinding): boolean {
  return (
    a.behaviorId === b.behaviorId &&
    a.param1 === b.param1 &&
    a.param2 === b.param2
  );
}
