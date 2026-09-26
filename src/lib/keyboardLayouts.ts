/**
 * Keyboard Layout Mappings
 *
 * This file defines mappings between keyboard layouts (US, JIS, etc.)
 * for displaying keycodes according to the selected physical keyboard layout.
 *
 * The mapping is based on HID usage codes, where different physical layouts
 * may have different symbols on the same HID code.
 *
 * Example: In JIS layout, the key that produces "@" in US layout is physically
 * labeled "[" and located at a different position.
 */

import type { KeycodeDefinition } from "./keycodes";

/**
 * Supported keyboard layout types
 */
export type KeyboardLayoutType = "US" | "JIS" | "US_JP";

/**
 * Mapping from HID usage code to display name for a specific layout
 */
export type KeycodeLayoutMapping = Partial<KeycodeDefinition> & {
  code: number;
};

const LAYOUTS: {
  [key in KeyboardLayoutType]: {
    label: string;
  };
} = {
  US: {
    label: "US (ANSI)",
  },
  JIS: {
    label: "JIS (Japanese)",
  },
  US_JP: {
    label: "US (ANSI) for JP",
  },
};

/**
 * JIS layout keycode mappings (only codes that differ from US layout)
 *
 * Reference:
 * - JIS keyboard layout: https://en.wikipedia.org/wiki/Keyboard_layout#Japanese
 * - The main differences are in punctuation and symbol keys
 */
const JIS_LAYOUT_MAPPINGS: KeycodeLayoutMapping[] = [
  // Main differences in punctuation/symbol keys
  {
    code: 0x2f,
    displayName: "@`", // US: [{
    name: "At Sign",
    aliases: ["At", "grave", "backquote", "backtick"],
  },
  {
    code: 0x30,
    displayName: "[{", // US: ]}
    name: "Left Bracket",
    aliases: ["LBKT", "Left Bracket", "Open Bracket"],
  },
  {
    code: 0x32,
    displayName: "]}", // US: non-US Hash
    name: "Right Bracket",
    aliases: ["RBKT", "Right Bracket", "Close Bracket"],
  },
  {
    code: 0x33,
    displayName: ";+", // US: :;
    name: "Semicolon",
    aliases: ["Semicolon", "Plus"],
  },
  {
    code: 0x34,
    displayName: ":*", // US: '"
    name: "Colon",
    aliases: ["Colon", "Asterisk"],
  },
  {
    code: 0x35,
    displayName: "半/全", // US: `~
    name: "Hankaku/Zenkaku",
    aliases: ["Hankaku", "Zenkaku", "Halfwidth/Fullwidth"],
  },
  {
    code: 0x2d,
    displayName: "-=", // US: -_
    name: "Minus",
    aliases: ["Minus", "Equal"],
  },
  {
    code: 0x2e,
    displayName: "^~", // US: =+
    name: "Caret",
    aliases: ["Caret", "Tilde"],
  },
  {
    code: 0x87,
    displayName: "\\_", // US: None (international1)
    name: "Backslash",
    aliases: ["Backslash", "Underscore", "Yen Sign"],
  },
  /*
   * - 0x1f (2): In US shows "2", in JIS shows "2" but @ symbol position differs
   * - 0x23 (6): In US shows "6", in JIS shows "6" but ^ symbol position differs
   * - 0x24 (7): In US shows "7", in JIS shows "7" but & symbol position differs
   * - 0x25 (8): In US shows "8", in JIS shows "8" but * symbol position differs
   * - 0x26 (9): In US shows "9", in JIS shows "9" but ( symbol position differs
   * - 0x27 (0): In US shows "0", in JIS shows "0" but ) symbol position differs
   */
  {
    code: 0x1f,
    displayName: '2"', // US: 2@
    name: "2",
    aliases: ["two", "Double Quote"],
  },
  {
    code: 0x23,
    displayName: "6&", // US: 6^
    name: "6",
    aliases: ["six", "Ampersand", "and"],
  },
  {
    code: 0x24,
    displayName: "7'", // US: 7&
    name: "7",
    aliases: ["seven", "single quote", "apostrophe"],
  },
  {
    code: 0x25,
    displayName: "8(", // US: 8*
    name: "8",
    aliases: ["eight", "Left Parenthesis"],
  },
  {
    code: 0x26,
    displayName: "9)", // US: 9(
    name: "9",
    aliases: ["nine", "Right Parenthesis"],
  },
  {
    code: 0x27,
    displayName: "0", // US: 0)
    name: "0",
    aliases: ["zero"],
  },
  {
    code: 0x90,
    displayName: "かな",
  },
  {
    code: 0x91,
    displayName: "英数",
  },
  {
    code: 0x88,
    displayName: "かな/カナ",
    name: "Kana",
  },
  {
    code: 0x89,
    displayName: "￥",
    name: "Yen Sign",
  },
  {
    code: 0x8a,
    displayName: "無変換",
    name: "Muhenkan",
  },
  {
    code: 0x8b,
    displayName: "変換",
    name: "Henkan",
  },
];

const US_FOR_JP_LAYOUT_MAPPINGS: KeycodeLayoutMapping[] = [
  {
    code: 0x90,
    displayName: "かな",
  },
  {
    code: 0x91,
    displayName: "英数",
  },
  {
    code: 0x88,
    displayName: "かな/カナ",
    name: "Kana",
  },
  {
    code: 0x89,
    displayName: "￥",
    name: "Yen Sign",
  },
  {
    code: 0x8a,
    displayName: "無変換",
    name: "Muhenkan",
  },
  {
    code: 0x8b,
    displayName: "変換",
    name: "Henkan",
  },
];

/**
 * Layout mapping registry
 * Maps layout type to a Map of code -> mapping
 */
const layoutMappings = new Map<
  KeyboardLayoutType,
  Map<number, KeycodeLayoutMapping>
>();

// Build JIS layout mapping
const jisMap = new Map<number, KeycodeLayoutMapping>();
JIS_LAYOUT_MAPPINGS.forEach((mapping) => {
  jisMap.set(mapping.code, mapping);
});
layoutMappings.set("JIS", jisMap);
const usJpMap = new Map<number, KeycodeLayoutMapping>();
US_FOR_JP_LAYOUT_MAPPINGS.forEach((mapping) => {
  usJpMap.set(mapping.code, mapping);
});
layoutMappings.set("US_JP", usJpMap);

// US layout uses default mappings from keycodes.ts (no overrides needed)
layoutMappings.set("US", new Map());

/**
 * Map a keycode definition to the appropriate display name and name based on the selected layout.
 * If no mapping exists for the code in the selected layout, returns the original definition.
 * @param code - The original keycode definition (based on US layout)
 * @param layout - The selected keyboard layout
 * @returns A new keycode definition with displayName and name overridden if a mapping exists for the layout
 */
export function mapToLayout(
  code: KeycodeDefinition,
  layout?: KeyboardLayoutType,
): KeycodeDefinition {
  if (!layout) {
    return code;
  }
  const mapping = layoutMappings.get(layout)?.get(code.code);
  if (mapping) {
    return {
      ...code,
      ...mapping,
    };
  }
  return code;
}

/**
 * Get the display name for a keycode in a specific layout.
 * Returns undefined if no override exists for this layout.
 *
 * @param code - HID usage code
 * @param layout - Keyboard layout type
 * @returns Display name override, or undefined if using default
 */
export function getLayoutDisplayName(
  code: number,
  layout?: KeyboardLayoutType,
): string | undefined {
  if (!layout) {
    return undefined;
  }
  const mapping = layoutMappings.get(layout)?.get(code);
  return mapping?.displayName;
}

/**
 * Get the full name for a keycode in a specific layout.
 * Returns undefined if no override exists for this layout.
 *
 * @param code - HID usage code
 * @param layout - Keyboard layout type
 * @returns Full name override, or undefined if using default
 */
export function getLayoutName(
  code: number,
  layout?: KeyboardLayoutType,
): string | undefined {
  if (!layout) {
    return undefined;
  }
  const mapping = layoutMappings.get(layout)?.get(code);
  return mapping?.name;
}

/**
 * Get all available keyboard layout types
 */
export function getAvailableLayouts(): KeyboardLayoutType[] {
  return Object.keys(LAYOUTS) as KeyboardLayoutType[];
}

/**
 * Get display label for a layout type
 */
export function getLayoutLabel(layout: KeyboardLayoutType): string {
  return LAYOUTS[layout]?.label ?? layout;
}

/**
 * Default keyboard layout
 */
export const DEFAULT_KEYBOARD_LAYOUT: KeyboardLayoutType = "US";

/**
 * LocalStorage key for storing keyboard layout preference
 */
export const KEYBOARD_LAYOUT_STORAGE_KEY = "keyboardLayout";

/**
 * Get keyboard layout from localStorage, or return default
 */
export function getSavedKeyboardLayout(): KeyboardLayoutType {
  try {
    const saved = localStorage.getItem(KEYBOARD_LAYOUT_STORAGE_KEY);
    if (LAYOUTS[saved as KeyboardLayoutType]) {
      return saved as KeyboardLayoutType;
    }
  } catch (error) {
    // localStorage might not be available in some environments
    console.warn("Failed to read keyboard layout from localStorage:", error);
  }
  return DEFAULT_KEYBOARD_LAYOUT;
}

/**
 * Save keyboard layout to localStorage
 */
export function saveKeyboardLayout(layout: KeyboardLayoutType): void {
  try {
    localStorage.setItem(KEYBOARD_LAYOUT_STORAGE_KEY, layout);
  } catch (error) {
    // localStorage might be disabled or quota exceeded
    console.warn("Failed to save keyboard layout to localStorage:", error);
  }
}
