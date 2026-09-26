/**
 * ZMK Keycode Database
 *
 * This file contains comprehensive keycode definitions for ZMK keyboards.
 * The keycodes are based on HID usage tables and ZMK-specific behaviors.
 *
 * Reference:
 * - HID Usage Tables: https://usb.org/document-library/hid-usage-tables-15
 * - ZMK Keycodes: https://zmk.dev/docs/keymaps/list-of-keycodes
 *
 * Hid usage is defined as a combination of usage page, usage code and modifier bits.
 * - bits 0-15 (16bits): usage code
 * - bits 16-23 (8bits): usage page
 * - bits 24-31 (8bits): modifier flags (custom for zmk)
 */

import { mapToLayout, type KeyboardLayoutType } from "./keyboardLayouts";

// HID Usage Page definitions
export const HID_USAGE_PAGE_KEYBOARD = 0x07;
export const HID_USAGE_PAGE_CONSUMER = 0x0c;

/**
 * Create a combined HID usage value from page and code.
 * Format: upper 16 bits = page, lower 16 bits = code
 */
export function createHidUsage(page: number, code: number): number {
  return (page << 16) | code;
}

export function getHidUsagePage(usage: number): number {
  // Mask out modifier bits (bits 24-31) before extracting the page
  return ((usage & 0x00ffffff) >> 16) & 0xffff;
}

export function getHidUsageCode(usage: number): number {
  return usage & 0xffff;
}

// Keycode category for UI organization
export type KeycodeCategory =
  | "letters"
  | "numbers"
  | "modifiers"
  | "navigation"
  | "function"
  | "numpad"
  | "media"
  | "system"
  | "punctuation"
  | "international"
  | "miscellaneous";

// Keycode definition interface
export interface KeycodeDefinition {
  /** HID usage code (keyboard page) or full usage (with page) */
  code: number;
  /** Display name shown on key */
  displayName: string;
  /** Full name for search and accessibility */
  name: string;
  /** Category for grouping in selector */
  category: KeycodeCategory;
  /** Aliases for search (e.g., ["ESC"] for Escape) */
  aliases?: string[];
  /** Description for tooltip */
  description?: string;
  /** Icon name for miscellaneous keys */
  icon?: string;
}

// Standard keyboard keycodes (HID Usage Page 0x07)
export const KEYBOARD_KEYCODES: KeycodeDefinition[] = [
  // Letters (0x04-0x1D)
  { code: 0x04, displayName: "A", name: "A", category: "letters" },
  { code: 0x05, displayName: "B", name: "B", category: "letters" },
  { code: 0x06, displayName: "C", name: "C", category: "letters" },
  { code: 0x07, displayName: "D", name: "D", category: "letters" },
  { code: 0x08, displayName: "E", name: "E", category: "letters" },
  { code: 0x09, displayName: "F", name: "F", category: "letters" },
  { code: 0x0a, displayName: "G", name: "G", category: "letters" },
  { code: 0x0b, displayName: "H", name: "H", category: "letters" },
  { code: 0x0c, displayName: "I", name: "I", category: "letters" },
  { code: 0x0d, displayName: "J", name: "J", category: "letters" },
  { code: 0x0e, displayName: "K", name: "K", category: "letters" },
  { code: 0x0f, displayName: "L", name: "L", category: "letters" },
  { code: 0x10, displayName: "M", name: "M", category: "letters" },
  { code: 0x11, displayName: "N", name: "N", category: "letters" },
  { code: 0x12, displayName: "O", name: "O", category: "letters" },
  { code: 0x13, displayName: "P", name: "P", category: "letters" },
  { code: 0x14, displayName: "Q", name: "Q", category: "letters" },
  { code: 0x15, displayName: "R", name: "R", category: "letters" },
  { code: 0x16, displayName: "S", name: "S", category: "letters" },
  { code: 0x17, displayName: "T", name: "T", category: "letters" },
  { code: 0x18, displayName: "U", name: "U", category: "letters" },
  { code: 0x19, displayName: "V", name: "V", category: "letters" },
  { code: 0x1a, displayName: "W", name: "W", category: "letters" },
  { code: 0x1b, displayName: "X", name: "X", category: "letters" },
  { code: 0x1c, displayName: "Y", name: "Y", category: "letters" },
  { code: 0x1d, displayName: "Z", name: "Z", category: "letters" },

  // Numbers (0x1E-0x27)
  {
    code: 0x1e,
    displayName: "1!",
    name: "1",
    category: "numbers",
    aliases: ["one", "exclamation"],
  },
  {
    code: 0x1f,
    displayName: "2@",
    name: "2",
    category: "numbers",
    aliases: ["two", "at"],
  },
  {
    code: 0x20,
    displayName: "3#",
    name: "3",
    category: "numbers",
    aliases: ["three", "hash"],
  },
  {
    code: 0x21,
    displayName: "4$",
    name: "4",
    category: "numbers",
    aliases: ["four", "dollar"],
  },
  {
    code: 0x22,
    displayName: "5%",
    name: "5",
    category: "numbers",
    aliases: ["five", "percent"],
  },
  {
    code: 0x23,
    displayName: "6^",
    name: "6",
    category: "numbers",
    aliases: ["six", "caret"],
  },
  {
    code: 0x24,
    displayName: "7&",
    name: "7",
    category: "numbers",
    aliases: ["seven", "ampersand", "and"],
  },
  {
    code: 0x25,
    displayName: "8*",
    name: "8",
    category: "numbers",
    aliases: ["eight", "asterisk"],
  },
  {
    code: 0x26,
    displayName: "9(",
    name: "9",
    category: "numbers",
    aliases: ["nine", "left parenthesis"],
  },
  {
    code: 0x27,
    displayName: "0)",
    name: "0",
    category: "numbers",
    aliases: ["zero", "right parenthesis"],
  },

  // Function keys (0x3A-0x45, 0x68-0x73)
  { code: 0x3a, displayName: "F1", name: "F1", category: "function" },
  { code: 0x3b, displayName: "F2", name: "F2", category: "function" },
  { code: 0x3c, displayName: "F3", name: "F3", category: "function" },
  { code: 0x3d, displayName: "F4", name: "F4", category: "function" },
  { code: 0x3e, displayName: "F5", name: "F5", category: "function" },
  { code: 0x3f, displayName: "F6", name: "F6", category: "function" },
  { code: 0x40, displayName: "F7", name: "F7", category: "function" },
  { code: 0x41, displayName: "F8", name: "F8", category: "function" },
  { code: 0x42, displayName: "F9", name: "F9", category: "function" },
  { code: 0x43, displayName: "F10", name: "F10", category: "function" },
  { code: 0x44, displayName: "F11", name: "F11", category: "function" },
  { code: 0x45, displayName: "F12", name: "F12", category: "function" },
  { code: 0x68, displayName: "F13", name: "F13", category: "function" },
  { code: 0x69, displayName: "F14", name: "F14", category: "function" },
  { code: 0x6a, displayName: "F15", name: "F15", category: "function" },
  { code: 0x6b, displayName: "F16", name: "F16", category: "function" },
  { code: 0x6c, displayName: "F17", name: "F17", category: "function" },
  { code: 0x6d, displayName: "F18", name: "F18", category: "function" },
  { code: 0x6e, displayName: "F19", name: "F19", category: "function" },
  { code: 0x6f, displayName: "F20", name: "F20", category: "function" },
  { code: 0x70, displayName: "F21", name: "F21", category: "function" },
  { code: 0x71, displayName: "F22", name: "F22", category: "function" },
  { code: 0x72, displayName: "F23", name: "F23", category: "function" },
  { code: 0x73, displayName: "F24", name: "F24", category: "function" },

  // Modifiers (0xE0-0xE7)
  {
    code: 0xe0,
    displayName: "LCtrl",
    name: "Left Control",
    category: "modifiers",
    aliases: ["LCTRL", "LC"],
  },
  {
    code: 0xe1,
    displayName: "LShift",
    name: "Left Shift",
    category: "modifiers",
    aliases: ["LSHIFT", "LS"],
  },
  {
    code: 0xe2,
    displayName: "LAlt",
    name: "Left Alt",
    category: "modifiers",
    aliases: ["LALT", "LA", "Option"],
  },
  {
    code: 0xe3,
    displayName: "LGui",
    name: "Left GUI",
    category: "modifiers",
    aliases: ["LGUI", "LG", "LCMD", "LWIN", "Cmd", "Win"],
  },
  {
    code: 0xe4,
    displayName: "RCtrl",
    name: "Right Control",
    category: "modifiers",
    aliases: ["RCTRL", "RC"],
  },
  {
    code: 0xe5,
    displayName: "RShift",
    name: "Right Shift",
    category: "modifiers",
    aliases: ["RSHIFT", "RS"],
  },
  {
    code: 0xe6,
    displayName: "RAlt",
    name: "Right Alt",
    category: "modifiers",
    aliases: ["RALT", "RA", "AltGr"],
  },
  {
    code: 0xe7,
    displayName: "RGui",
    name: "Right GUI",
    category: "modifiers",
    aliases: ["RGUI", "RG", "RCMD", "RWIN"],
  },

  // Navigation keys
  {
    code: 0x28,
    displayName: "Enter",
    name: "Enter",
    category: "navigation",
    aliases: ["Return", "RET"],
  },
  {
    code: 0x29,
    displayName: "Esc",
    name: "Escape",
    category: "navigation",
    aliases: ["ESC"],
  },
  {
    code: 0x2a,
    displayName: "Bksp",
    name: "Backspace",
    category: "navigation",
    aliases: ["BSPC", "BS"],
  },
  {
    code: 0x2b,
    displayName: "Tab",
    name: "Tab",
    category: "navigation",
    aliases: ["TAB"],
  },
  {
    code: 0x2c,
    displayName: "Space",
    name: "Space",
    category: "navigation",
    aliases: ["SPC"],
  },
  {
    code: 0x39,
    displayName: "Caps",
    name: "Caps Lock",
    category: "navigation",
    aliases: ["CAPS", "CAPSLOCK"],
  },
  {
    code: 0x46,
    displayName: "PrtSc",
    name: "Print Screen",
    category: "navigation",
    aliases: ["PSCRN", "PrintScreen"],
  },
  {
    code: 0x47,
    displayName: "ScrLk",
    name: "Scroll Lock",
    category: "navigation",
    aliases: ["SLCK", "ScrollLock"],
  },
  {
    code: 0x48,
    displayName: "Pause",
    name: "Pause",
    category: "navigation",
    aliases: ["PAUSE", "Break"],
  },
  {
    code: 0x49,
    displayName: "Ins",
    name: "Insert",
    category: "navigation",
    aliases: ["INS"],
  },
  {
    code: 0x4a,
    displayName: "Home",
    name: "Home",
    category: "navigation",
    aliases: ["HOME"],
  },
  {
    code: 0x4b,
    displayName: "PgUp",
    name: "Page Up",
    category: "navigation",
    aliases: ["PGUP", "PageUp"],
  },
  {
    code: 0x4c,
    displayName: "Del",
    name: "Delete",
    category: "navigation",
    aliases: ["DEL"],
  },
  {
    code: 0x4d,
    displayName: "End",
    name: "End",
    category: "navigation",
    aliases: ["END"],
  },
  {
    code: 0x4e,
    displayName: "PgDn",
    name: "Page Down",
    category: "navigation",
    aliases: ["PGDN", "PageDown"],
  },
  {
    code: 0x4f,
    displayName: "→",
    name: "Right Arrow",
    category: "navigation",
    aliases: ["RIGHT", "→"],
  },
  {
    code: 0x50,
    displayName: "←",
    name: "Left Arrow",
    category: "navigation",
    aliases: ["LEFT", "←"],
  },
  {
    code: 0x51,
    displayName: "↓",
    name: "Down Arrow",
    category: "navigation",
    aliases: ["DOWN", "↓"],
  },
  {
    code: 0x52,
    displayName: "↑",
    name: "Up Arrow",
    category: "navigation",
    aliases: ["UP", "↑"],
  },

  // Punctuation
  {
    code: 0x2d,
    displayName: "-_",
    name: "Minus",
    category: "punctuation",
    aliases: ["MINUS", "underscore"],
  },
  {
    code: 0x2e,
    displayName: "=+",
    name: "Equal",
    category: "punctuation",
    aliases: ["EQUAL", "plus"],
  },
  {
    code: 0x2f,
    displayName: "[{",
    name: "Left Bracket",
    category: "punctuation",
    aliases: ["LBKT", "left bracket", "open bracket"],
  },
  {
    code: 0x30,
    displayName: "]}",
    name: "Right Bracket",
    category: "punctuation",
    aliases: ["RBKT", "right bracket", "close bracket"],
  },
  {
    code: 0x31,
    displayName: "\\|",
    name: "Backslash",
    category: "punctuation",
    aliases: ["BSLH", "backslash", "pipe"],
  },
  {
    code: 0x33,
    displayName: ";:",
    name: "Semicolon",
    category: "punctuation",
    aliases: ["SEMI", "semicolon", "colon"],
  },
  {
    code: 0x34,
    displayName: "'\"",
    name: "Single Quote",
    category: "punctuation",
    aliases: ["SQT", "APOS", "single quote", "double quote", "apostrophe"],
  },
  {
    code: 0x35,
    displayName: "`~",
    name: "Grave",
    category: "punctuation",
    aliases: ["GRAVE", "tilde"],
  },
  {
    code: 0x36,
    displayName: ",<",
    name: "Comma",
    category: "punctuation",
    aliases: ["COMMA", "left angle bracket"],
  },
  {
    code: 0x37,
    displayName: ".>",
    name: "Period",
    category: "punctuation",
    aliases: ["DOT", "right angle bracket"],
  },
  {
    code: 0x38,
    displayName: "/?",
    name: "Forward Slash",
    category: "punctuation",
    aliases: ["FSLH", "SLASH", "question mark"],
  },
  {
    code: 0x32,
    displayName: "#",
    name: "Non-US Hash",
    category: "punctuation",
    aliases: ["NUHS", "NON_US_HASH"],
  },
  {
    code: 0x64,
    displayName: "\\",
    name: "Non-US Backslash",
    category: "punctuation",
    aliases: ["NUBS", "NON_US_BSLH"],
  },

  // Numpad
  {
    code: 0x53,
    displayName: "Num",
    name: "Num Lock",
    category: "numpad",
    aliases: ["NLCK", "NumLock"],
  },
  {
    code: 0x54,
    displayName: "KP/",
    name: "Keypad Divide",
    category: "numpad",
    aliases: ["KP_SLASH"],
  },
  {
    code: 0x55,
    displayName: "KP*",
    name: "Keypad Multiply",
    category: "numpad",
    aliases: ["KP_MULTIPLY"],
  },
  {
    code: 0x56,
    displayName: "KP-",
    name: "Keypad Minus",
    category: "numpad",
    aliases: ["KP_MINUS"],
  },
  {
    code: 0x57,
    displayName: "KP+",
    name: "Keypad Plus",
    category: "numpad",
    aliases: ["KP_PLUS"],
  },
  {
    code: 0x58,
    displayName: "KPEnt",
    name: "Keypad Enter",
    category: "numpad",
    aliases: ["KP_ENTER"],
  },
  {
    code: 0x59,
    displayName: "KP1",
    name: "Keypad 1",
    category: "numpad",
    aliases: ["KP_N1"],
  },
  {
    code: 0x5a,
    displayName: "KP2",
    name: "Keypad 2",
    category: "numpad",
    aliases: ["KP_N2"],
  },
  {
    code: 0x5b,
    displayName: "KP3",
    name: "Keypad 3",
    category: "numpad",
    aliases: ["KP_N3"],
  },
  {
    code: 0x5c,
    displayName: "KP4",
    name: "Keypad 4",
    category: "numpad",
    aliases: ["KP_N4"],
  },
  {
    code: 0x5d,
    displayName: "KP5",
    name: "Keypad 5",
    category: "numpad",
    aliases: ["KP_N5"],
  },
  {
    code: 0x5e,
    displayName: "KP6",
    name: "Keypad 6",
    category: "numpad",
    aliases: ["KP_N6"],
  },
  {
    code: 0x5f,
    displayName: "KP7",
    name: "Keypad 7",
    category: "numpad",
    aliases: ["KP_N7"],
  },
  {
    code: 0x60,
    displayName: "KP8",
    name: "Keypad 8",
    category: "numpad",
    aliases: ["KP_N8"],
  },
  {
    code: 0x61,
    displayName: "KP9",
    name: "Keypad 9",
    category: "numpad",
    aliases: ["KP_N9"],
  },
  {
    code: 0x62,
    displayName: "KP0",
    name: "Keypad 0",
    category: "numpad",
    aliases: ["KP_N0"],
  },
  {
    code: 0x63,
    displayName: "KP.",
    name: "Keypad Dot",
    category: "numpad",
    aliases: ["KP_DOT"],
  },
  {
    code: 0x67,
    displayName: "KP=",
    name: "Keypad Equal",
    category: "numpad",
    aliases: ["KP_EQUAL"],
  },

  // Application/Context key
  {
    code: 0x65,
    displayName: "App",
    name: "Application",
    category: "miscellaneous",
    aliases: ["K_APP", "Menu", "Context"],
  },

  // Power key
  {
    code: 0x66,
    displayName: "Pwr",
    name: "Power",
    category: "system",
    aliases: ["K_PWR", "POWER"],
  },

  // International keys
  {
    code: 0x87,
    displayName: "INT1",
    name: "International1",
    category: "international",
    aliases: ["INT1", "INT_RO"],
  },
  {
    code: 0x88,
    displayName: "INT2",
    name: "International2",
    category: "international",
    aliases: ["INT2", "INT_KANA"],
  },
  {
    code: 0x89,
    displayName: "INT3",
    name: "International3",
    category: "international",
    aliases: ["INT3", "INT_YEN", "￥"],
  },
  {
    code: 0x8a,
    displayName: "INT4",
    name: "International4",
    category: "international",
    aliases: ["INT4", "INT_HENKAN"],
  },
  {
    code: 0x8b,
    displayName: "INT5",
    name: "International5",
    category: "international",
    aliases: ["INT5", "INT_MUHENKAN"],
  },
  {
    code: 0x90,
    displayName: "Lang1",
    name: "Language1",
    category: "international",
    aliases: ["LANG1", "HAEJ", "JA", "KANA"],
  },
  {
    code: 0x91,
    displayName: "Lang2",
    name: "Language2",
    category: "international",
    aliases: ["LANG2", "HAEN", "EN", "EISU"],
  },
];

// Consumer keycodes (HID Usage Page 0x0C)
// These are used for media controls, brightness, etc.
export const CONSUMER_KEYCODES: KeycodeDefinition[] = [
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xe9),
    displayName: "Vol+",
    name: "Volume Up",
    category: "media",
    aliases: ["C_VOL_UP", "VOLUME_UP"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xea),
    displayName: "Vol-",
    name: "Volume Down",
    category: "media",
    aliases: ["C_VOL_DN", "VOLUME_DOWN"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xe2),
    displayName: "Mute",
    name: "Mute",
    category: "media",
    aliases: ["C_MUTE"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xcd),
    displayName: "⏯",
    name: "Play/Pause",
    category: "media",
    aliases: ["C_PP", "C_PLAY_PAUSE"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xb5),
    displayName: "⏭",
    name: "Next Track",
    category: "media",
    aliases: ["C_NEXT"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xb6),
    displayName: "⏮",
    name: "Previous Track",
    category: "media",
    aliases: ["C_PREV"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xb7),
    displayName: "⏹",
    name: "Stop",
    category: "media",
    aliases: ["C_STOP"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xb8),
    displayName: "⏏",
    name: "Eject",
    category: "media",
    aliases: ["C_EJECT"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x6f),
    displayName: "☀+",
    name: "Brightness Up",
    category: "media",
    aliases: ["C_BRI_UP", "C_BRIGHTNESS_INC"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x70),
    displayName: "☀-",
    name: "Brightness Down",
    category: "media",
    aliases: ["C_BRI_DN", "C_BRIGHTNESS_DEC"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xb0),
    displayName: "⏯M",
    name: "Media Play",
    category: "media",
    aliases: ["C_PLAY"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xb1),
    displayName: "⏸",
    name: "Media Pause",
    category: "media",
    aliases: ["C_PAUSE"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xb2),
    displayName: "●",
    name: "Record",
    category: "media",
    aliases: ["C_REC", "C_RECORD"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xb3),
    displayName: "⏩",
    name: "Fast Forward",
    category: "media",
    aliases: ["C_FF", "C_FAST_FORWARD"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0xb4),
    displayName: "⏪",
    name: "Rewind",
    category: "media",
    aliases: ["C_RW", "C_REWIND"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x183),
    displayName: "🎵",
    name: "Media Select",
    category: "media",
    aliases: ["C_MEDIA", "C_MEDIA_SELECT"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x194),
    displayName: "📁",
    name: "My Computer",
    category: "system",
    aliases: ["C_AL_MY_COMPUTER"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x196),
    displayName: "🌐",
    name: "WWW Browser",
    category: "system",
    aliases: ["C_AL_WWW"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x192),
    displayName: "🧮",
    name: "Calculator",
    category: "system",
    aliases: ["C_AL_CALC"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x18a),
    displayName: "📧",
    name: "Email",
    category: "system",
    aliases: ["C_AL_EMAIL"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x221),
    displayName: "🔍",
    name: "Search",
    category: "system",
    aliases: ["C_AC_SEARCH"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x223),
    displayName: "🏠",
    name: "Browser Home",
    category: "system",
    aliases: ["C_AC_HOME"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x224),
    displayName: "←",
    name: "Browser Back",
    category: "system",
    aliases: ["C_AC_BACK"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x225),
    displayName: "→",
    name: "Browser Forward",
    category: "system",
    aliases: ["C_AC_FORWARD"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x226),
    displayName: "⏹",
    name: "Browser Stop",
    category: "system",
    aliases: ["C_AC_STOP"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x227),
    displayName: "🔄",
    name: "Browser Refresh",
    category: "system",
    aliases: ["C_AC_REFRESH"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x22a),
    displayName: "⭐",
    name: "Browser Bookmarks",
    category: "system",
    aliases: ["C_AC_BOOKMARKS"],
  },
  {
    code: createHidUsage(HID_USAGE_PAGE_CONSUMER, 0x19e),
    displayName: "🔒",
    name: "Screen Lock",
    category: "system",
    aliases: ["C_AL_LOCK"],
  },
];

// All keycodes combined
export const ALL_KEYCODES: KeycodeDefinition[] = [
  ...KEYBOARD_KEYCODES,
  ...CONSUMER_KEYCODES,
];

// Lookup maps for efficient access
const keycodeByCode = new Map<number, KeycodeDefinition>();
const keycodeByName = new Map<string, KeycodeDefinition>();

// Build lookup maps
ALL_KEYCODES.forEach((kc) => {
  keycodeByCode.set(kc.code, kc);
  keycodeByName.set(kc.name.toLowerCase(), kc);
  kc.aliases?.forEach((alias) => {
    keycodeByName.set(alias.toLowerCase(), kc);
  });
});

/**
 * Get keycode definition by HID code
 */
export function getKeycodeByCode(code: number): KeycodeDefinition | undefined {
  return keycodeByCode.get(code);
}

/**
 * Get keycode definition by name or alias
 */
export function getKeycodeByName(name: string): KeycodeDefinition | undefined {
  return keycodeByName.get(name.toLowerCase());
}

/**
 * Search keycodes by query string
 * Matches against name, displayName, and aliases
 */
export function searchKeycodes(
  query: string,
  keyboardLayout?: KeyboardLayoutType,
): KeycodeDefinition[] {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();

  return ALL_KEYCODES.map((kc) => mapToLayout(kc, keyboardLayout)).filter(
    (kc) => {
      if (kc.name.toLowerCase().includes(lowerQuery)) return true;
      if (kc.displayName.toLowerCase().includes(lowerQuery)) return true;
      if (kc.aliases?.some((a) => a.toLowerCase().includes(lowerQuery)))
        return true;
      return false;
    },
  );
}

/**
 * Get keycodes by category
 */
export function getKeycodesByCategory(
  category: KeycodeCategory,
  keyboardLayout?: KeyboardLayoutType,
): KeycodeDefinition[] {
  return ALL_KEYCODES.map((kc) => mapToLayout(kc, keyboardLayout)).filter(
    (kc) => kc.category === category,
  );
}

/**
 * Get all unique categories
 */
export function getAllCategories(): KeycodeCategory[] {
  const categories = new Set<KeycodeCategory>();
  ALL_KEYCODES.forEach((kc) => categories.add(kc.category));
  return Array.from(categories);
}

// Category display names for UI
export const CATEGORY_DISPLAY_NAMES: Record<KeycodeCategory, string> = {
  letters: "Letters",
  numbers: "Numbers",
  modifiers: "Modifiers",
  navigation: "Navigation",
  function: "Function Keys",
  numpad: "Numpad",
  media: "Media",
  system: "System",
  punctuation: "Punctuation",
  international: "International",
  miscellaneous: "Miscellaneous",
};

// =============================================================================
// Modifier Flags
// =============================================================================

/**
 * Modifier flags for combining with keycodes.
 * These are stored in bits 24-31 of the HID usage value.
 * ref: https://github.com/zmkfirmware/zmk/blob/main/app/include/dt-bindings/zmk/modifiers.h
 */
export const MODIFIER_FLAGS = [
  { value: 0x01, label: "LCtrl", shortLabel: "LC" },
  { value: 0x02, label: "LShift", shortLabel: "LS" },
  { value: 0x04, label: "LAlt", shortLabel: "LA" },
  { value: 0x08, label: "LGui", shortLabel: "LG" },
  { value: 0x10, label: "RCtrl", shortLabel: "RC" },
  { value: 0x20, label: "RShift", shortLabel: "RS" },
  { value: 0x40, label: "RAlt", shortLabel: "RA" },
  { value: 0x80, label: "RGui", shortLabel: "RG" },
] as const;

// HID usage constants for modifier handling
/** A basic keycode fits in 16 bits (page << 16 | code), anything larger has additional info */
export const MAX_BASIC_KEYCODE = 0xffff;
/** Modifier flags mask - only 8 bits for the 8 modifier keys */
export const MODIFIER_FLAGS_MASK = 0xff;
/** Value indicating no keycode/parameter has been set */
export const NO_PARAM_VALUE = 0;

/**
 * Extract modifier flags from HID usage value.
 * Modifier flags are stored in bits 24-31 (8 bits for 8 modifier keys).
 */
export function extractModifierFlags(hidUsage: number): number {
  return (hidUsage >> 24) & MODIFIER_FLAGS_MASK;
}

/**
 * Drop modifier flags from HID usage value.
 */
export function dropModifierFlags(hidUsage: number): number {
  return hidUsage & 0x00ffffff;
}

/**
 * Extract base keycode from HID usage value (without modifiers)
 */
export function extractBaseKeycode(hidUsage: number): number {
  const page = getHidUsagePage(hidUsage);
  const code = getHidUsageCode(hidUsage);
  // If page is keyboard page, return just the code
  // Otherwise return the full usage (for consumer page, etc.)
  return page === HID_USAGE_PAGE_KEYBOARD ? code : dropModifierFlags(hidUsage);
}

/**
 * Combine keycode with modifier flags
 */
export function combineWithModifiers(
  keycode: number,
  modifiers: number,
): number {
  // If keycode already has page info (> MAX_BASIC_KEYCODE), just add modifiers
  if (keycode > MAX_BASIC_KEYCODE) {
    return keycode | (modifiers << 24);
  }
  // Otherwise, create full HID usage with keyboard page and modifiers
  return createHidUsage(HID_USAGE_PAGE_KEYBOARD, keycode) | (modifiers << 24);
}

// =============================================================================
// Mouse Keycodes
// =============================================================================

/**
 * Mouse button keycodes
 */
export const MOUSE_KEYCODES = [
  { value: 1, label: "Left Click", shortLabel: "LCLK" },
  { value: 2, label: "Right Click", shortLabel: "RCLK" },
  { value: 4, label: "Middle Click", shortLabel: "MCLK" },
  { value: 8, label: "Button 4", shortLabel: "BTN4" },
  { value: 16, label: "Button 5", shortLabel: "BTN5" },
] as const;

// =============================================================================
// Mouse Movement and Scroll
// =============================================================================

/**
 * Default mouse movement value (pixels per update)
 * ref: ZMK's app/include/dt-bindings/zmk/pointing.h
 */
export const ZMK_POINTING_DEFAULT_MOVE_VAL = 600;

/**
 * Default mouse scroll value (units per update)
 * ref: ZMK's app/include/dt-bindings/zmk/pointing.h
 */
export const ZMK_POINTING_DEFAULT_SCRL_VAL = 100;

/**
 * Mouse movement/scroll parameter encoding/decoding utilities
 *
 * ZMK uses a 32-bit packed format for mouse movement and scroll:
 * - Bits 0-15 (lower 16 bits): Y-axis delta (vertical movement)
 * - Bits 16-31 (upper 16 bits): X-axis delta (horizontal movement)
 *
 * Encoding macros from pointing.h:
 * - MOVE_Y(vert) = (vert) & 0xFFFF
 * - MOVE_X(hor) = ((hor) & 0xFFFF) << 16
 * - MOVE(hor, vert) = MOVE_X(hor) + MOVE_Y(vert)
 *
 * ref: https://github.com/zmkfirmware/zmk/blob/main/app/include/dt-bindings/zmk/pointing.h
 */

/**
 * Encode both X and Y deltas into a single 32-bit value
 */
export function encodeMouseMove(x: number, y: number): number {
  const buffer = new ArrayBuffer(4);
  const uint32View = new Uint32Array(buffer);
  const int16View = new Int16Array(buffer);

  int16View[1] = x;
  int16View[0] = y;
  return uint32View[0];
}

/**
 * Decode both X and Y deltas from a single 32-bit value
 */
export function decodeMouseMove(encoded: number): { x: number; y: number } {
  const buffer = new ArrayBuffer(4);
  const uint32View = new Uint32Array(buffer);
  const int16View = new Int16Array(buffer);

  uint32View[0] = encoded;

  return { x: int16View[1], y: int16View[0] };
}

/**
 * Preset mouse movement values matching ZMK's defines
 */
export const MOUSE_MOVEMENTS = [
  {
    value: encodeMouseMove(0, -ZMK_POINTING_DEFAULT_MOVE_VAL),
    label: "Move Up",
    shortLabel: "↑",
  },
  {
    value: encodeMouseMove(0, ZMK_POINTING_DEFAULT_MOVE_VAL),
    label: "Move Down",
    shortLabel: "↓",
  },
  {
    value: encodeMouseMove(-ZMK_POINTING_DEFAULT_MOVE_VAL, 0),
    label: "Move Left",
    shortLabel: "←",
  },
  {
    value: encodeMouseMove(ZMK_POINTING_DEFAULT_MOVE_VAL, 0),
    label: "Move Right",
    shortLabel: "→",
  },
] as const;

/**
 * Preset mouse scroll values matching ZMK's defines
 * Note: In ZMK, scroll Y is inverted (positive = up, negative = down)
 */
export const MOUSE_SCROLLS = [
  {
    value: encodeMouseMove(0, ZMK_POINTING_DEFAULT_SCRL_VAL),
    label: "Scroll Up",
    shortLabel: "↑",
  },
  {
    value: encodeMouseMove(0, -ZMK_POINTING_DEFAULT_SCRL_VAL),
    label: "Scroll Down",
    shortLabel: "↓",
  },
  {
    value: encodeMouseMove(-ZMK_POINTING_DEFAULT_SCRL_VAL, 0),
    label: "Scroll Left",
    shortLabel: "←",
  },
  {
    value: encodeMouseMove(ZMK_POINTING_DEFAULT_SCRL_VAL, 0),
    label: "Scroll Right",
    shortLabel: "→",
  },
] as const;
