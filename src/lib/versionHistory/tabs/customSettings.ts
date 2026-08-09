/**
 * Custom-settings snapshot, shared by every tab that surfaces settings from
 * the `cormoran_custom_settings` subsystem (Settings, Subsystems, and the
 * PMW3610 cards on the Trackball tab).
 *
 * A snapshot is `identifier -> settingKey -> encoded value`. Keys carry the
 * source (a split keyboard reports the same setting per half) and, for array
 * settings, the element index — the same identity `useCustomSettings` uses.
 * Values are encoded as one string each so a changed setting is one diff row.
 *
 * Array elements are stored as their *inner scalar* only: `writeSettingToMemory`
 * re-wraps a scalar with the live setting's index/size, so the array metadata
 * never needs to survive a round-trip.
 */
import type {
  Setting,
  SettingValue,
} from "../../../proto/cormoran/zmk/custom_settings/custom_settings";
import type { CustomSettingsSection } from "../../../hooks/useCustomSettings";
import type { JsonValue } from "../types";

/** Bump when the payload shape below changes. */
export const CUSTOM_SETTINGS_SNAPSHOT_SCHEMA_VERSION = 1;

export type CustomSettingsSnapshot = {
  /** Subsystem identifier → setting identity → encoded value. */
  sections: Record<string, Record<string, string>>;
};

/** Encoded marker for a setting the device didn't report a value for. */
export const UNSET_VALUE = "unset";

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Stable identity of one setting row within its section. */
export function settingKey(setting: Setting): string {
  const index = setting.value?.arrayValue?.index;
  const element = index === undefined ? "" : `[${index}]`;
  return `${setting.key}#${setting.source}${element}`;
}

export function encodeSettingValue(value: SettingValue | undefined): string {
  if (!value) return UNSET_VALUE;
  // Array elements are stored as the scalar they wrap.
  const scalar = value.arrayValue?.value ?? value;
  if (scalar.int32Value !== undefined) return `int:${scalar.int32Value}`;
  if (scalar.boolValue !== undefined) return `bool:${scalar.boolValue}`;
  if (scalar.stringValue !== undefined) return `str:${scalar.stringValue}`;
  if (scalar.bytesValue !== undefined)
    return `bytes:${toHex(scalar.bytesValue)}`;
  if (scalar.behaviorValue !== undefined) {
    const { behaviorId, param1, param2 } = scalar.behaviorValue;
    return `beh:${behaviorId}:${param1}:${param2}`;
  }
  return UNSET_VALUE;
}

/** Inverse of {@link encodeSettingValue}; null when the value can't be written. */
export function decodeSettingValue(encoded: string): SettingValue | null {
  const separator = encoded.indexOf(":");
  if (separator < 0) return null;
  const kind = encoded.slice(0, separator);
  const rest = encoded.slice(separator + 1);

  switch (kind) {
    case "int": {
      const int32Value = Number(rest);
      return Number.isFinite(int32Value) ? { int32Value } : null;
    }
    case "bool":
      return { boolValue: rest === "true" };
    case "str":
      return { stringValue: rest };
    case "bytes":
      return { bytesValue: fromHex(rest) };
    case "beh": {
      const parts = rest.split(":").map(Number);
      if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
        return null;
      }
      return {
        behaviorValue: {
          behaviorId: parts[0],
          param1: parts[1],
          param2: parts[2],
        },
      };
    }
    default:
      return null;
  }
}

export function buildCustomSettingsSnapshot(
  sections: CustomSettingsSection[],
  /** Optional filter, e.g. the Trackball tab's PMW3610 sections only. */
  includeSection: (section: CustomSettingsSection) => boolean = () => true,
): CustomSettingsSnapshot {
  const snapshot: CustomSettingsSnapshot = { sections: {} };
  for (const section of sections) {
    if (!includeSection(section)) continue;
    const values: Record<string, string> = {};
    for (const setting of section.settings) {
      values[settingKey(setting)] = encodeSettingValue(setting.value);
    }
    snapshot.sections[section.identifier] = values;
  }
  return snapshot;
}

export function isCustomSettingsSnapshot(
  value: JsonValue,
): value is CustomSettingsSnapshot {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.sections === "object"
  );
}
