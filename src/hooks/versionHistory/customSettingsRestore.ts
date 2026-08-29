/**
 * Shared restore + labelling for custom-settings snapshots.
 *
 * Three tabs surface `cormoran_custom_settings` rows (Settings, Subsystems and
 * the PMW3610 cards on Trackball), so the write-back and the diff naming live
 * here once. Writes go through `writeSettingToMemory`, which is the app's
 * memory-write tier — the section's own Save is still what persists them.
 */
import type { CustomSettingsSection } from "../useCustomSettings";
import type {
  Setting,
  SettingValue,
} from "../../proto/cormoran/zmk/custom_settings/custom_settings";
import {
  UNSET_VALUE,
  decodeSettingValue,
  encodeSettingValue,
  settingKey,
  type CustomSettingsSnapshot,
} from "../../lib/versionHistory/tabs/customSettings";
import type { DiffLabeler, JsonValue } from "../../lib/versionHistory";

/**
 * Write every setting whose stored value differs from the live one. Settings a
 * snapshot mentions but the device no longer reports are skipped: the firmware
 * decides which keys exist, and inventing them here would fail anyway.
 */
export async function applyCustomSettingsSnapshot(
  readSections: () => CustomSettingsSection[],
  write: (setting: Setting, value: SettingValue) => Promise<unknown>,
  snapshot: CustomSettingsSnapshot,
): Promise<void> {
  for (const [identifier, values] of Object.entries(snapshot.sections)) {
    const section = readSections().find(
      (candidate) => candidate.identifier === identifier,
    );
    if (!section) continue;

    for (const setting of section.settings) {
      const wanted = values[settingKey(setting)];
      if (wanted === undefined || wanted === UNSET_VALUE) continue;
      if (wanted === encodeSettingValue(setting.value)) continue;
      const value = decodeSettingValue(wanted);
      if (!value) continue;
      await write(setting, value);
    }
  }
}

/**
 * Names/values for snapshot paths of the form
 * `[...prefix, "sections", <identifier>, "<key>#<source>[<index>]"]`.
 */
export function customSettingsLabeler(
  prefix: string[],
  t: (key: string, params?: Record<string, string | number>) => string,
): DiffLabeler {
  const matchesPrefix = (path: string[]) =>
    prefix.every((segment, index) => path[index] === segment) &&
    path[prefix.length] === "sections";

  return {
    label(path) {
      if (!matchesPrefix(path)) return null;
      const identifier = path[prefix.length + 1];
      const identity = path[prefix.length + 2];
      if (identity === undefined) return identifier ?? null;
      // `key#source[index]` → `key [index] (source N)`
      const [key, tail] = identity.split("#");
      const source = tail?.match(/^(\d+)/)?.[1];
      const element = tail?.match(/\[(\d+)\]$/)?.[1];
      const parts = [`${identifier} › ${key}`];
      if (element !== undefined) parts.push(`[${element}]`);
      if (source !== undefined && source !== "0") {
        parts.push(t("(source {{source}})", { source }));
      }
      return parts.join(" ");
    },
    formatValue(path, value) {
      if (!matchesPrefix(path) || typeof value !== "string") return null;
      if (value === UNSET_VALUE) return t("Not set");
      const separator = value.indexOf(":");
      const rest = separator < 0 ? value : value.slice(separator + 1);
      const kind = separator < 0 ? value : value.slice(0, separator);
      if (kind === "beh") return `behavior ${rest}`;
      return rest;
    },
  };
}

/** Combine labelers: the first one that names a path wins. */
export function combineLabelers(...labelers: DiffLabeler[]): DiffLabeler {
  return {
    label(path) {
      for (const labeler of labelers) {
        const label = labeler.label(path);
        if (label !== null) return label;
      }
      return null;
    },
    formatValue(path: string[], value: JsonValue | undefined) {
      for (const labeler of labelers) {
        const formatted = labeler.formatValue?.(path, value);
        if (formatted != null) return formatted;
      }
      return null;
    },
  };
}
