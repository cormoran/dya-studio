/**
 * Behavior Metadata Registry
 *
 * Centralizes behavior displayName handling and categorization.
 * Provides utilities for formatting behavior bindings for UI display.
 */
import type {
  BehaviorBinding,
  BehaviorDefinition,
  Layer,
} from "../hooks/useKeymap";
import {
  getKeycodeByCode,
  getHidUsageCode,
  getHidUsagePage,
  HID_USAGE_PAGE_CONSUMER,
  extractModifierFlags,
  MODIFIER_FLAGS,
  MOUSE_KEYCODES,
  MOUSE_MOVEMENTS,
  MOUSE_SCROLLS,
  dropModifierFlags,
  decodeMouseMove,
  formatKeycodeWithModifiers,
} from "./keycodes";
import { getLayoutDisplayName } from "./keyboardLayouts";
import type { BehaviorParameterValueDescription } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

/**
 * Category types for organizing behaviors
 */
export type BehaviorCategory =
  | "keypress" // Basic key input
  | "macro" // Saved runtime macros
  | "layer" // Layer switching/activation
  | "mod" // Modifiers and mod-tap
  | "transport" // Bluetooth and output management
  | "system" // Reset, bootloader
  | "miscellaneous" // Trans, none, macro, etc
  | "media" // Media controls (if supported)
  | "mouse" // Mouse controls
  | "others";

/**
 * Parameter type definitions
 */
export type ParamType =
  | "keycode" // HID usage code
  | "layer" // Layer ID
  | "macro" // Runtime macro ID
  | "number" // Generic number
  | "bt_command" // BT command (0=CLR, 1=NXT, etc)
  | "out_command" // Output command (0=TOG, 1=USB, 2=BLE)
  | "mouse_keycode" // Mouse keycode (LCK, RCLK, ...)
  | "mouse_movement" // Mouse movement (X/Y deltas)
  | "mouse_scroll"; // Mouse scroll (vertical/horizontal)

/**
 * Parameter-dependent operation mapping
 */
export interface ParamValueMapping {
  /** Maps param value to display string */
  [paramValue: number]: string;
}

/**
 * Context for formatting behavior bindings
 */
export interface FormatContext {
  /** Prefer short format for display */
  shortFormat?: boolean;
  /** Available layers for resolving layer names */
  layers?: (Omit<Layer, "bindings"> & Partial<Pick<Layer, "bindings">>)[];
  /** Keyboard layout for localized keycode display */
  keyboardLayout?: import("./keyboardLayouts").KeyboardLayoutType;
  /** Runtime macro summaries for resolving macro behavior param1 (the macro's slot) */
  runtimeMacros?: Array<{ slot: number; name?: string }>;
}

/**
 * Format a keycode (HID usage) with modifiers for display.
 * Returns a human-readable string representation.
 */
function formatKeycode(
  hidUsage: number,
  keyboardLayout?: import("./keyboardLayouts").KeyboardLayoutType,
): string {
  const modifiers = extractModifierFlags(hidUsage);
  const hidUsageWithoutModifiers = dropModifierFlags(hidUsage);
  const page = getHidUsagePage(hidUsage);
  const code =
    page === 0 ? hidUsageWithoutModifiers : getHidUsageCode(hidUsage);

  // Try keyboard page first
  let keycode = getKeycodeByCode(code);

  // Try consumer page if not found
  if (!keycode && (page === HID_USAGE_PAGE_CONSUMER || page === 0)) {
    keycode = getKeycodeByCode(hidUsageWithoutModifiers);
  }

  // Apply keyboard layout override
  let displayName =
    keycode?.displayName || `0x${code.toString(16).toUpperCase()}`;
  if (keyboardLayout) {
    const layoutDisplayName = getLayoutDisplayName(code, keyboardLayout);
    if (layoutDisplayName) {
      displayName = layoutDisplayName;
    }
  }

  // Format with modifiers
  if (modifiers === 0) {
    return displayName;
  }

  // Build modifier prefix
  const modParts: string[] = [];
  MODIFIER_FLAGS.forEach((mod) => {
    if (modifiers & mod.value) {
      modParts.push(mod.shortLabel);
    }
  });
  const modPrefix = modParts.join("+");
  return `${modPrefix}(${displayName})`;
}

/**
 * Metadata for a behavior definition
 */
export interface BehaviorMetadata {
  /** Behavior category for organization */
  category: BehaviorCategory;

  /** All known displayName variants (for matching)
   * The first variant is considered the canonical displayName for this behavior
   */
  displayNameVariants: string[];

  /** Short code for compact UI display */
  shortCode: string;

  /** Type of param1 if used */
  param1Type?: ParamType;

  /** Type of param2 if used */
  param2Type?: ParamType;

  /**
   * Mapping for param1 values (for behaviors where param changes operation)
   * e.g., BT behavior: {0: "CLR", 1: "NXT", ...}
   */
  param1ValueMap?: ParamValueMapping;

  /** Mapping for param2 values if applicable */
  param2ValueMap?: ParamValueMapping;

  /**
   * Custom formatter for display text
   * Handles complex cases like layer names, keycode lookups, etc.
   * Returning null falls back to default formatting
   */
  getDisplayText?: (
    binding: BehaviorBinding,
    context: FormatContext,
    metadata: BehaviorMetadata,
  ) => string | null;

  /**
   * Format specified parameter value for display
   */
  formatParam?: (
    param1: number,
    param2: number,
    paramNumber: 1 | 2,
    context: FormatContext,
  ) => string;

  /** Human-readable description */
  description?: string;
  param1Description?: string;
  param2Description?: string;
}

/**
 * Behavior metadata registry
 * Maps from EXACT displayName (case-sensitive keys, but lookup is case-insensitive) to metadata
 */
const BEHAVIOR_METADATA_BASE: BehaviorMetadata[] = [
  // ============================================================================
  // Key Press Behaviors
  // ============================================================================
  {
    category: "keypress",
    displayNameVariants: ["Key Press", "kp", "key_press"],
    shortCode: "KP",
    param1Type: "keycode",
    param1Description: "Key to press",
    getDisplayText: (binding, context) => {
      return formatKeycode(binding.param1, context.keyboardLayout);
    },
    description: "Press a key",
  },

  // ============================================================================
  // Layer Behaviors
  // ============================================================================
  {
    category: "layer",
    displayNameVariants: ["Momentary Layer", "mo", "momentary"],
    shortCode: "MO",
    param1Type: "layer",
    param1Description: "Layer active while held",
    getDisplayText: (binding, context) => {
      const layerNum = binding.param1;
      if (!context.shortFormat && context.layers && context.layers[layerNum]) {
        return `MO ${context.layers[layerNum].name || layerNum}`;
      }
      return `MO ${layerNum}`;
    },
    description: "Activate layer while held",
  },

  {
    category: "layer",
    displayNameVariants: ["To Layer", "to"],
    shortCode: "TO",
    param1Type: "layer",
    param1Description: "Layer to switch to",
    getDisplayText: (binding, context) => {
      const layerNum = binding.param1;
      if (!context.shortFormat && context.layers && context.layers[layerNum]) {
        return `TO ${context.layers[layerNum].name || layerNum}`;
      }
      return `TO ${layerNum}`;
    },
    description: "Switch to layer",
  },

  {
    category: "layer",
    displayNameVariants: ["Toggle Layer", "tog", "toggle"],
    shortCode: "TG",
    param1Type: "layer",
    param1Description: "Layer to toggle",
    getDisplayText: (binding, context) => {
      const layerNum = binding.param1;
      if (!context.shortFormat && context.layers && context.layers[layerNum]) {
        return `TG ${context.layers[layerNum].name || layerNum}`;
      }
      return `TG ${layerNum}`;
    },
    description: "Toggle layer on/off",
  },

  {
    category: "layer",
    displayNameVariants: ["Layer-Tap", "lt", "layer_tap"],
    shortCode: "LT",
    param1Type: "layer",
    param2Type: "keycode",
    param1Description: "Layer active while held",
    param2Description: "Key sent on tap",
    getDisplayText: (binding, context) => {
      const layerNum = binding.param1;
      const layerName = context.shortFormat
        ? layerNum
        : context.layers?.[layerNum]?.name || layerNum;
      const keyName = formatKeycode(binding.param2, context.keyboardLayout);
      return `LT ${layerName} ${keyName}`;
    },
    description: "Layer on hold, key on tap",
  },
  // ============================================================================
  // Miscellaneous Behaviors
  // ============================================================================
  {
    category: "keypress",
    displayNameVariants: ["Trans", "Transparent"],
    shortCode: "▽",
    getDisplayText: (_binding, context) =>
      context.shortFormat ? "▽" : "Trans",
    description: "Transparent (pass-through to lower layer)",
  },

  {
    category: "keypress",
    displayNameVariants: ["None"],
    shortCode: "✕",
    getDisplayText: (_binding, context) => (context.shortFormat ? "✕" : "None"),
    description: "No operation",
  },

  // ============================================================================
  // Modifier Behaviors
  // ============================================================================
  {
    category: "mod",
    displayNameVariants: ["Mod-Tap", "mt", "mod_tap"],
    shortCode: "MT",
    param1Type: "keycode",
    param2Type: "keycode",
    param2Description: "Key sent on tap",
    getDisplayText: (binding, context) => {
      const param1 = formatKeycode(binding.param1, context.keyboardLayout);
      const param2 = formatKeycode(binding.param2, context.keyboardLayout);
      return `MT ${param1} ${param2}`;
    },
    description: "Modifier on hold, key on tap",
    param1Description: "Select a keycode, usually modifier",
  },
  // Leyer tap is defined above in Layer Behaviors
  // Mod morph does not have pre-defined behavior

  // ============================================================================
  // Macro Behavior
  // ============================================================================
  {
    category: "keypress",
    displayNameVariants: ["Runtime Macro", "rmacro", "macro", "runtime_macro"],
    shortCode: "Macro",
    param1Type: "macro",
    getDisplayText: (binding, context) => {
      const macro = context.runtimeMacros?.find(
        (item) => item.slot === binding.param1,
      );
      return `Macro ${macro?.name || binding.param1}`;
    },
    formatParam: (param1, _param2, paramNumber, context) => {
      if (paramNumber !== 1) return "";
      const macro = context.runtimeMacros?.find((item) => item.slot === param1);
      return macro?.name || param1.toString();
    },
    description: "Execute macro",
    param1Description: "Select runtime macro",
  },

  // TODO: key toggle
  {
    category: "keypress",
    displayNameVariants: ["Key Toggle", "kt", "key_toggle"],
    shortCode: "KT",
    param1Type: "keycode",
    param1Description: "Key to toggle",
    getDisplayText: (binding, context) => {
      const keyName = formatKeycode(binding.param1, context.keyboardLayout);
      return `KT ${keyName}`;
    },
    description: "Toggle key on/off with each press",
  },
  {
    category: "mod",
    displayNameVariants: ["Sticky Key", "sk", "sticky_key"],
    shortCode: "SK",
    param1Type: "keycode",
    param1Description: "Key held until the next key press",
    getDisplayText: (binding, context) => {
      const keyName = formatKeycode(binding.param1, context.keyboardLayout);
      return `SK ${keyName}`;
    },
    description: "A sticky key stays pressed until another key is pressed.",
  },
  {
    category: "layer",
    displayNameVariants: ["Sticky Layer", "sl", "sticky_layer"],
    shortCode: "SL",
    param1Type: "layer",
    param1Description: "Layer active until the next key press",
    getDisplayText: (binding, context) => {
      const layerNum = binding.param1;
      if (!context.shortFormat && context.layers && context.layers[layerNum]) {
        return `SL ${context.layers[layerNum].name || layerNum}`;
      }
      return `SL ${layerNum}`;
    },
    description: "A sticky layer stays pressed until another key is pressed",
  },
  // Tap Dance does not have pre-defined behavior
  {
    category: "keypress",
    displayNameVariants: ["Caps Word", "caps_word"],
    shortCode: "CW",
    description: "Caps lock, but automatically deactivates",
  },
  {
    category: "keypress",
    displayNameVariants: ["Key Repeat", "key_repeat"],
    shortCode: "KR",
    description: "Repeat last-pressed key while held",
  },
  // Skip sensor and sensor rotation
  {
    category: "mouse",
    displayNameVariants: ["Mouse Key Press", "mkp", "mouse key press"],
    shortCode: "MKP",
    param1Type: "mouse_keycode",
    getDisplayText: (binding, context) => {
      const mouseKey = MOUSE_KEYCODES.find((mk) => mk.value === binding.param1);
      if (mouseKey) {
        return context.shortFormat
          ? mouseKey.shortLabel || `MKP ${binding.param1}`
          : `MKP ${mouseKey.label}`;
      }
      return `MKP ${binding.param1}`;
    },
    formatParam: (param1, _param2, paramNumber) => {
      if (paramNumber === 1) {
        const mouseKey = MOUSE_KEYCODES.find((mk) => mk.value === param1);
        return mouseKey?.label || param1.toString();
      }
      return "Not used";
    },
    description: "Mouse key press",
    param1Description: "Select a mouse keycode",
  },
  {
    category: "mouse",
    displayNameVariants: ["Mouse Move", "mmv", "mouse move", "mouse_move"],
    shortCode: "MMV",
    param1Type: "mouse_movement",
    getDisplayText: (binding, context) => {
      // Check if it matches a preset
      const movement = MOUSE_MOVEMENTS.find(
        (mm) => mm.value === binding.param1,
      );
      if (movement) {
        return context.shortFormat
          ? `MMV ${movement.shortLabel}`
          : `MMV ${movement.label}`;
      }
      // Otherwise, decode and show X/Y values
      const { x, y } = decodeMouseMove(binding.param1);
      return `MMV X${x} Y${y}`;
    },
    formatParam: (param1, _param2, paramNumber) => {
      if (paramNumber === 1) {
        const { x, y } = decodeMouseMove(param1);
        return `X:${x} Y:${y}`;
      }
      return "Not used";
    },
    description: "Move mouse cursor.",
    param1Description:
      "Configure movement speed (upper 16 bits = X, lower 16 bits = Y)",
  },
  {
    category: "mouse",
    displayNameVariants: [
      "Mouse Scroll",
      "msc",
      "mouse scroll",
      "mouse_scroll",
    ],
    shortCode: "MSC",
    param1Type: "mouse_scroll",
    getDisplayText: (binding, context) => {
      // Check if it matches a preset
      const scroll = MOUSE_SCROLLS.find((ms) => ms.value === binding.param1);
      if (scroll) {
        return context.shortFormat
          ? `MSC ${scroll.shortLabel}`
          : `MSC ${scroll.label}`;
      }
      // Otherwise, decode and show X/Y values
      const { x, y } = decodeMouseMove(binding.param1);
      return `MSC X${x} Y${y}`;
    },
    formatParam: (param1, _param2, paramNumber) => {
      if (paramNumber === 1) {
        const { x, y } = decodeMouseMove(param1);
        return `X:${x} Y:${y}`;
      }
      return "Not used";
    },
    description: "Scroll mouse wheel.",
    param1Description:
      "Configure scroll amount (upper 16 bits = X, lower 16 bits = Y)",
  },
  // ============================================================================
  // System Behaviors
  // ============================================================================
  {
    category: "system",
    displayNameVariants: ["Bootloader", "bootloader"],
    shortCode: "Boot",
    getDisplayText: () => "Boot",
    description: "Enter bootloader mode",
  },
  {
    category: "system",
    displayNameVariants: ["System Reset", "sys_reset", "reset"],
    shortCode: "Reset",
    getDisplayText: () => "Reset",
    description: "System reset",
  },

  // ============================================================================
  // Bluetooth Behaviors (param1-dependent)
  // ============================================================================
  {
    category: "transport",
    displayNameVariants: ["Bluetooth", "bt"],
    shortCode: "BT",
    param1Type: "bt_command",
    param1ValueMap: {
      0: "CLR",
      1: "NXT",
      2: "PRV",
      3: "SEL",
      4: "CLR_ALL",
      5: "DISC",
    },
    getDisplayText: (binding, context, metadata) => {
      const cmd =
        metadata.param1ValueMap?.[binding.param1] || binding.param1.toString();
      if (context.shortFormat && cmd) {
        if (cmd === "SEL" || cmd === "DISC") {
          return `BT ${cmd} ${binding.param2}`;
        }
        return `BT ${cmd}`;
      }
      return null;
    },
    description: "Bluetooth profile management",
    param1Description: "Select a Bluetooth command",
  },

  // ============================================================================
  // Output Selection Behaviors (param1-dependent)
  // ============================================================================
  {
    category: "transport",
    displayNameVariants: ["Output Selection", "out", "output"],
    shortCode: "OUT",
    param1Type: "out_command",
    param1ValueMap: {
      0: "TOG",
      1: "USB",
      2: "BLE",
    },
    getDisplayText: (binding, context, metadata) => {
      const cmd =
        metadata.param1ValueMap?.[binding.param1] || binding.param1.toString();
      if (context.shortFormat && cmd) {
        return `OUT ${cmd}`;
      }
      return null;
    },
    description: "Output selection (USB/BLE)",
    param1Description: "Output to select (USB/BLE)",
  },
  // TODO: RGB Underglow
  // TODO: Backlight
  // TODO: Power management
  // TODO: Softoff
  {
    category: "system",
    displayNameVariants: ["Studio Unlock", "studio_unlock"],
    shortCode: "Studio",
    description: "Unlock keyboard for ZMK Studio and DYA Studio",
  },
  {
    category: "keypress",
    displayNameVariants: ["Grave/Escape", "grave_escape", "gresc"],
    shortCode: "`/ESC",
    getDisplayText(_binding, context, metadata) {
      return context.shortFormat ? metadata.shortCode : null;
    },
    description: "Grave(`) on shift or GUI, otherwise Escape",
  },
];

/**
 * Expanded metadata registry with all variants as keys
 * This allows O(1) lookup by any displayName variant
 */
const BEHAVIOR_METADATA: Record<string, BehaviorMetadata> = {};

// Populate the registry with all variants pointing to the same metadata
BEHAVIOR_METADATA_BASE.forEach((metadata) => {
  metadata.displayNameVariants.forEach((variant) => {
    BEHAVIOR_METADATA[variant.toLowerCase()] = metadata;
  });
});

/**
 * Get behavior metadata by displayName (case-insensitive)
 */
export function getBehaviorMetadata(
  displayName: string,
): BehaviorMetadata | null {
  const normalized = displayName.toLowerCase();
  return BEHAVIOR_METADATA[normalized] || null;
}

/**
 * Check if a behavior has param1 based on BehaviorDefinition metadata
 * Falls back to checking BehaviorDefinition.metadata if getBehaviorMetadata returns null
 */
export function hasParam1(behavior: BehaviorDefinition): boolean {
  const metadata = getBehaviorMetadata(behavior.displayName);
  if (metadata) {
    return !!metadata.param1Type;
  }
  // Fallback: check BehaviorDefinition.metadata
  return (
    behavior.metadata.filter((m) =>
      // filter with param1=null to collect all possible param1 values
      m.param1.find((desc) =>
        filterMatchingBehaviorValueDescriptions(desc, null),
      ),
    ).length > 0
  );
}

/**
 * Check if a behavior has param2 based on BehaviorDefinition metadata
 * Falls back to checking BehaviorDefinition.metadata if getBehaviorMetadata returns null
 */
export function hasParam2(
  behavior: BehaviorDefinition,
  param1: number,
): boolean {
  const metadata = getBehaviorMetadata(behavior.displayName);
  if (metadata) {
    return !!metadata.param2Type;
  }
  // Fallback: check BehaviorDefinition.metadata
  return (
    behavior.metadata
      // extract param sets that match the given param1 value
      .filter((m) =>
        m.param1.find((desc) =>
          filterMatchingBehaviorValueDescriptions(desc, param1),
        ),
      )
      .filter((m) =>
        m.param2.find(
          // filter with param2=0 to collect all possible param2 values for this param1
          (desc) => filterMatchingBehaviorValueDescriptions(desc, null),
        ),
      ).length > 0
  );
}

/**
 * Find a behavior by category
 * Returns the first matching behavior definition
 */
export function findBehaviorByCategory(
  behaviors: Map<number, BehaviorDefinition>,
  category: BehaviorCategory,
): BehaviorDefinition | null {
  for (const behavior of behaviors.values()) {
    const metadata = getBehaviorMetadata(behavior.displayName);
    if (metadata && metadata.category === category) {
      return behavior;
    }
  }
  return null;
}

/**
 * Find a behavior by predicate function
 */
export function findBehaviorByPredicate(
  behaviors: Map<number, BehaviorDefinition>,
  predicate: (
    metadata: BehaviorMetadata | null,
    behavior: BehaviorDefinition,
  ) => boolean,
): BehaviorDefinition | null {
  for (const behavior of behaviors.values()) {
    const metadata = getBehaviorMetadata(behavior.displayName);
    if (predicate(metadata, behavior)) {
      return behavior;
    }
  }
  return null;
}

/**
 * Format a behavior binding for display
 * Returns a human-readable string representation
 */
export function formatBehaviorBinding(
  binding: BehaviorBinding | undefined,
  behavior: BehaviorDefinition | null,
  context: FormatContext = {},
): string {
  if (!binding || !behavior) {
    return "—";
  }

  const metadata = getBehaviorMetadata(behavior.displayName);

  if (metadata?.getDisplayText) {
    const customText = metadata.getDisplayText(binding, context, metadata);
    if (customText) {
      return customText;
    }
  }

  // Fallback: use behavior display name with params if present
  if (binding.param1 !== 0) {
    const param1 = formatBehaviorParam(
      behavior,
      binding.param1,
      binding.param2,
      1,
      context,
    );
    if (binding.param2 !== 0) {
      const param2 = formatBehaviorParam(
        behavior,
        binding.param1,
        binding.param2,
        2,
        context,
      );
      return `${behavior.displayName} ${param1} ${param2}`;
    }
    return `${behavior.displayName} ${param1}`;
  } else if (binding.param2 !== 0) {
    const param2 = formatBehaviorParam(
      behavior,
      binding.param1,
      binding.param2,
      2,
      context,
    );
    return `${behavior.displayName} ${param2}`;
  }

  return behavior.displayName;
}

export function filterMatchingBehaviorValueDescriptions(
  desc: BehaviorParameterValueDescription,
  value: number | null,
): boolean {
  if (desc.constant !== undefined) {
    return value === null || desc.constant === value;
  } else if (desc.range) {
    return (
      value === null || (desc.range.min <= value && value <= desc.range.max)
    );
  } else if (desc.hidUsage) {
    return true;
  } else if (desc.layerId) {
    return true;
  } else if (desc.nil) {
    return false;
  }
  // fallback to handle newly defined types without breaking
  return true;
}

export function formatBehaviorParam(
  behavior: BehaviorDefinition | null,
  param1: number,
  param2: number,
  forParam: 1 | 2,
  context: FormatContext,
): string {
  if (!behavior || behavior.metadata.length === 0) {
    return forParam === 1 ? param1.toString() : param2.toString();
  }
  const paramSetValidForParam1 = behavior.metadata.filter(
    (m) =>
      m.param1.find((desc) =>
        filterMatchingBehaviorValueDescriptions(desc, param1),
      ) !== undefined,
  );

  if (forParam === 1) {
    const firstMatch = paramSetValidForParam1
      .flatMap((m) => m.param1)
      .find((desc) => filterMatchingBehaviorValueDescriptions(desc, param1));
    if (firstMatch?.constant !== undefined) {
      return firstMatch?.name || param1.toString();
    } else if (firstMatch?.range != undefined) {
      return param1.toString();
    } else if (firstMatch?.hidUsage != undefined) {
      return formatKeycodeWithModifiers(param1, context.keyboardLayout).display;
    } else if (firstMatch?.layerId != undefined) {
      const layerNum = param1;
      if (context.layers && context.layers[layerNum]) {
        return context.layers[layerNum].name || `Layer ${layerNum}`;
      }
      return `Layer ${layerNum}`;
    }
    return param1.toString();
  }
  const paramSetValidForParam2 = paramSetValidForParam1.filter(
    (m) =>
      m.param2.find((desc) =>
        filterMatchingBehaviorValueDescriptions(desc, param2),
      ) !== undefined,
  );
  const firstMatch = paramSetValidForParam2
    .flatMap((m) => m.param2)
    .find((desc) => filterMatchingBehaviorValueDescriptions(desc, param2));
  if (firstMatch?.constant) {
    return firstMatch?.name || param2.toString();
  } else if (firstMatch?.range) {
    return param2.toString();
  } else if (firstMatch?.hidUsage) {
    return formatKeycode(param2, context.keyboardLayout);
  } else if (firstMatch?.layerId) {
    const layerNum = param2;
    if (context.layers && context.layers[layerNum]) {
      return context.layers[layerNum].name || layerNum.toString();
    }
    return layerNum.toString();
  }
  return param2.toString();
}

/**
 * Get parameter options for a behavior metadata
 * Used to generate dropdown options for param1/param2 selection
 */
export function getBehaviorParamOptions(
  metadata: BehaviorMetadata,
  paramNumber: 1 | 2,
): Array<{ value: number; label: string }> | null {
  const valueMap =
    paramNumber === 1 ? metadata.param1ValueMap : metadata.param2ValueMap;

  if (!valueMap) {
    return null;
  }

  return Object.entries(valueMap).map(([value, label]) => ({
    value: Number(value),
    label,
  }));
}

/**
 * Get all behaviors grouped by category
 */
export function groupBehaviorsByCategory(
  behaviors: Map<number, BehaviorDefinition>,
): Map<BehaviorCategory, BehaviorDefinition[]> {
  const grouped = new Map<BehaviorCategory, BehaviorDefinition[]>();

  behaviors.forEach((behavior) => {
    const metadata = getBehaviorMetadata(behavior.displayName);
    const category = metadata?.category || "others";

    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(behavior);
  });

  return grouped;
}

/**
 * Parameter type from BehaviorDefinition metadata
 */
export type BehaviorParameterInfo =
  | { type: "nil" }
  | { type: "constant"; value: number }
  | { type: "range"; min: number; max: number }
  | { type: "hidUsage"; keyboardMax: number; consumerMax: number }
  | { type: "layerId" };

/**
 * Get parameter information from BehaviorDefinition
 * Returns the parameter type and constraints for a specific parameter
 */
export function getBehaviorParamInfo(
  behavior: BehaviorDefinition,
  paramNumber: 1 | 2,
): BehaviorParameterInfo | null {
  if (behavior.metadata.length === 0) {
    return null;
  }

  const paramSet = behavior.metadata[0];
  const params = paramNumber === 1 ? paramSet.param1 : paramSet.param2;

  if (!params || params.length === 0) {
    return null;
  }

  // Use the first parameter description
  const param = params[0];

  if (param.nil) {
    return { type: "nil" };
  }
  if (param.constant !== undefined) {
    return { type: "constant", value: param.constant };
  }
  if (param.range) {
    return {
      type: "range",
      min: param.range.min,
      max: param.range.max,
    };
  }
  if (param.hidUsage) {
    return {
      type: "hidUsage",
      keyboardMax: param.hidUsage.keyboardMax,
      consumerMax: param.hidUsage.consumerMax,
    };
  }
  if (param.layerId !== undefined) {
    return { type: "layerId" };
  }

  return null;
}
