/**
 * Key Layout Definition
 *
 * A static ~70% ANSI keyboard layout used by the "key layout" mode of the
 * keycode selector. Each key references an HID keyboard usage code (page 0x07)
 * from keycodes.ts so that clicking a keyswitch selects the matching keycode.
 *
 * Rows are laid out left-aligned and every row sums to ROW_UNITS (16u) so that
 * columns line up like a physical keyboard. Spacers fill the gaps (e.g. the
 * inverted-T arrow cluster).
 */

/** Total width of every row in key units. Keys align to this grid. */
export const ROW_UNITS = 16;

export interface KeyLayoutKey {
  /** HID usage code on the keyboard page (0x07) */
  code: number;
  /** Width in key units (1u = a standard key). Defaults to 1. */
  w?: number;
  /** Height in key rows. JIS Enter spans the top and home rows. */
  h?: number;
}

export interface KeyLayoutSpacer {
  spacer: true;
  /** Width in key units */
  w: number;
}

export type KeyLayoutItem = KeyLayoutKey | KeyLayoutSpacer;

export function isSpacer(item: KeyLayoutItem): item is KeyLayoutSpacer {
  return "spacer" in item;
}

// HID keyboard usage codes (page 0x07), mirroring KEYBOARD_KEYCODES in keycodes.ts
const ESC = 0x29;
const F1 = 0x3a; // F1..F12 are contiguous 0x3a..0x45
const GRAVE = 0x35;
const N1 = 0x1e; // 1..9 contiguous 0x1e..0x26
const N0 = 0x27;
const MINUS = 0x2d;
const EQUAL = 0x2e;
const BSPC = 0x2a;
const TAB = 0x2b;
const LBKT = 0x2f;
const RBKT = 0x30;
const BSLH = 0x31;
const CAPS = 0x39;
const SEMI = 0x33;
const SQT = 0x34;
const ENTER = 0x28;
const LSHIFT = 0xe1;
const COMMA = 0x36;
const DOT = 0x37;
const FSLH = 0x38;
const RSHIFT = 0xe5;
const LCTRL = 0xe0;
const LGUI = 0xe3;
const LALT = 0xe2;
const RCTRL = 0xe4;
const SPACE = 0x2c;
const RALT = 0xe6;
const RGUI = 0xe7;
const DEL = 0x4c;
const HOME = 0x4a;
const PGUP = 0x4b;
const PGDN = 0x4e;
const END = 0x4d;
const UP = 0x52;
const LEFT = 0x50;
const DOWN = 0x51;
const RIGHT = 0x4f;
const INTL1 = 0x87;
const KANA = 0x88;
const YEN = 0x89;
const MUHENKAN = 0x8a;
const HENKAN = 0x8b;

/** Letters A..Z are contiguous starting at 0x04 */
function letter(ch: string): number {
  return 0x04 + (ch.charCodeAt(0) - "A".charCodeAt(0));
}

/** Numbers 1..0 across the number row */
function num(n: number): number {
  return n === 0 ? N0 : N1 + (n - 1);
}

/** Function keys F1..F12 */
function fn(n: number): number {
  return F1 + (n - 1);
}

/**
 * ~70% ANSI layout (function row + 65% main block with nav cluster and arrows).
 */
export const KEY_LAYOUT_70: KeyLayoutItem[][] = [
  // Function row — Esc + F-keys grouped in fours, spread across the width
  [
    { code: ESC },
    { spacer: true, w: 0.5 },
    ...[1, 2, 3, 4].map((n) => ({ code: fn(n) })),
    { spacer: true, w: 0.5 },
    ...[5, 6, 7, 8].map((n) => ({ code: fn(n) })),
    { spacer: true, w: 0.5 },
    ...[9, 10, 11, 12].map((n) => ({ code: fn(n) })),
    { spacer: true, w: 0.5 },
    { code: DEL },
  ],
  // Number row
  [
    { code: GRAVE },
    ...Array.from({ length: 10 }, (_, i) => ({ code: num(i + 1) })),
    { code: MINUS },
    { code: EQUAL },
    { code: BSPC, w: 2 },
    { code: HOME },
  ],
  // Top alpha row
  [
    { code: TAB, w: 1.5 },
    ...["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((c) => ({
      code: letter(c),
    })),
    { code: LBKT },
    { code: RBKT },
    { code: BSLH, w: 1.5 },
    { code: PGUP },
  ],
  // Home row
  [
    { code: CAPS, w: 1.75 },
    ...["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((c) => ({
      code: letter(c),
    })),
    { code: SEMI },
    { code: SQT },
    { code: ENTER, w: 2.25 },
    { code: PGDN },
  ],
  // Bottom alpha row
  [
    { code: LSHIFT, w: 2.25 },
    ...["Z", "X", "C", "V", "B", "N", "M"].map((c) => ({ code: letter(c) })),
    { code: COMMA },
    { code: DOT },
    { code: FSLH },
    { code: RSHIFT, w: 1.75 },
    { code: UP },
    { code: END },
  ],
  // Modifier row
  [
    { code: LCTRL, w: 1.25 },
    { code: LGUI, w: 1.25 },
    { code: LALT, w: 1.25 },
    { code: SPACE, w: 6.25 },
    { code: RALT, w: 1.25 },
    { code: RGUI, w: 1.25 },
    { spacer: true, w: 0.5 },
    { code: LEFT },
    { code: DOWN },
    { code: RIGHT },
  ],
];

/**
 * ~70% JIS layout. It keeps the selector's function and navigation coverage,
 * while the main block follows the Japanese physical key positions. In
 * particular, Enter spans two rows like an ISO Enter key.
 */
export const KEY_LAYOUT_70_JIS: KeyLayoutItem[][] = [
  [
    { code: ESC },
    { spacer: true, w: 0.5 },
    ...[1, 2, 3, 4].map((n) => ({ code: fn(n) })),
    { spacer: true, w: 0.5 },
    ...[5, 6, 7, 8].map((n) => ({ code: fn(n) })),
    { spacer: true, w: 0.5 },
    ...[9, 10, 11, 12].map((n) => ({ code: fn(n) })),
    { spacer: true, w: 0.5 },
    { code: DEL },
  ],
  [
    { code: GRAVE },
    ...Array.from({ length: 10 }, (_, i) => ({ code: num(i + 1) })),
    { code: MINUS },
    { code: EQUAL },
    { code: YEN },
    { code: BSPC, w: 2 },
  ],
  [
    { code: TAB, w: 1.5 },
    ...["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((c) => ({
      code: letter(c),
    })),
    { code: LBKT },
    { code: RBKT },
    { code: ENTER, w: 1.5, h: 2 },
    { spacer: true, w: 1 },
  ],
  [
    { code: CAPS, w: 1.75 },
    ...["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((c) => ({
      code: letter(c),
    })),
    { code: SEMI },
    { code: SQT },
    { code: 0x32 },
    { spacer: true, w: 2.25 },
  ],
  [
    { code: LSHIFT, w: 1.25 },
    ...["Z", "X", "C", "V", "B", "N", "M"].map((c) => ({ code: letter(c) })),
    { code: COMMA },
    { code: DOT },
    { code: FSLH },
    { code: INTL1 },
    { code: RSHIFT, w: 1.25 },
    { spacer: true, w: 0.5 },
    { code: UP },
    { code: END },
  ],
  [
    { code: LCTRL, w: 1.25 },
    { code: LGUI, w: 1.25 },
    { code: LALT, w: 1.25 },
    { code: SPACE, w: 3.75 },
    { code: MUHENKAN, w: 1.25 },
    { code: HENKAN, w: 1.25 },
    { code: KANA, w: 1.25 },
    { code: RCTRL, w: 1.25 },
    { spacer: true, w: 0.5 },
    { code: LEFT },
    { code: DOWN },
    { code: RIGHT },
  ],
];
