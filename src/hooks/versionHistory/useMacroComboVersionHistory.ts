/**
 * Macro & Combo tab version history.
 *
 * Collecting a snapshot here costs one `getMacro` RPC per macro — the macro
 * list only carries names and sizes, not steps — so capture is driven by the
 * page at explicit points (initial load, Refresh, Save, Discard) rather than
 * on every state change.
 *
 * Restoring writes through the same `persist: false` RPCs the editors use, so
 * everything lands in keyboard RAM and the page's Save button is what makes it
 * permanent.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTabVersionHistory } from "../useTabVersionHistory";
import type { UseTabVersionHistoryReturn } from "../useTabVersionHistory";
import type { UseRuntimeMacroReturn } from "../useRuntimeMacro";
import type {
  SlowReleaseOverride,
  UseRuntimeComboReturn,
} from "../useRuntimeCombo";
import type { BehaviorDefinition } from "../useKeymap";
import {
  MACRO_COMBO_SNAPSHOT_SCHEMA_VERSION,
  MACRO_COMBO_TAB_ID,
  buildComboSnapshot,
  buildMacroSnapshot,
  comboSnapshotsEqual,
  decodeBehavior,
  decodeKeyPositions,
  decodeMacroStep,
  encodeMacroStep,
  type MacroComboSnapshot,
  type MacroSnapshot,
} from "../../lib/versionHistory/tabs/macroCombo";
import { formatDiffValue } from "../../lib/versionHistory";
import type { DiffLabeler, JsonValue } from "../../lib/versionHistory";

/** How long a post-write list refresh may take before we give up on it. */
const LIST_REFRESH_TIMEOUT_MS = 5000;

export interface UseMacroComboVersionHistoryOptions {
  runtimeMacro: UseRuntimeMacroReturn;
  runtimeCombo: UseRuntimeComboReturn;
  /** Keymap behaviors, used to name bindings in the diff. */
  behaviors: Map<number, BehaviorDefinition>;
  /**
   * Flips to true once the tab's first full load has settled. The page owns
   * this because macro/combo edits also toggle the hooks' `isLoading`.
   */
  isLoaded: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export interface UseMacroComboVersionHistoryReturn extends UseTabVersionHistoryReturn<MacroComboSnapshot> {
  labeler: DiffLabeler;
}

export function useMacroComboVersionHistory({
  runtimeMacro,
  runtimeCombo,
  behaviors,
  isLoaded,
  t,
}: UseMacroComboVersionHistoryOptions): UseMacroComboVersionHistoryReturn {
  // Both hooks rebuild their callbacks on every render; refs keep collect/apply
  // stable while always reaching the newest state.
  // Behaviors are only needed to pick a fallback binding when a stored combo
  // has none. The sync effect is declared here, ahead of useTabVersionHistory,
  // so the refs are current before its capture effect runs.
  const macroRef = useRef(runtimeMacro);
  const comboRef = useRef(runtimeCombo);
  const behaviorsRef = useRef(behaviors);
  useEffect(() => {
    macroRef.current = runtimeMacro;
    comboRef.current = runtimeCombo;
    behaviorsRef.current = behaviors;
  });

  const collect = useCallback(async (): Promise<MacroComboSnapshot | null> => {
    const macro = macroRef.current;
    const combo = comboRef.current;
    if (!macro.isAvailable && !combo.isAvailable) return null;

    let macros: MacroSnapshot[] | null = null;
    let macroTapMs: number | null = null;
    if (macro.isAvailable) {
      // A half-read snapshot would look like "macros were deleted" on restore,
      // so bail out instead of storing one.
      if (!macro.globalSettings) return null;
      macroTapMs = macro.globalSettings.tapMs;
      macros = [];
      for (const summary of macro.macros) {
        const detail = await macroRef.current.getMacro(summary.slot);
        if (!detail) return null;
        macros.push(buildMacroSnapshot(summary, detail.steps));
      }
      // Keyed by name, so keep a name order: slots shuffle as macros come and go.
      macros.sort((a, b) => a.name.localeCompare(b.name));
    }

    let combos = null;
    let comboSettings = null;
    if (combo.isAvailable) {
      if (!combo.globalSettings) return null;
      combos = [...combo.combos]
        .sort((a, b) => a.index - b.index)
        .map(buildComboSnapshot);
      comboSettings = {
        timeoutMs: combo.globalSettings.timeoutMs,
        slowRelease: combo.globalSettings.slowRelease,
        requirePriorIdleMs: combo.globalSettings.requirePriorIdleMs,
      };
    }

    return { macros, macroTapMs, combos, comboSettings };
  }, []);

  const apply = useCallback(async (snapshot: MacroComboSnapshot) => {
    await applyMacros(() => macroRef.current, snapshot);
    await applyCombos(() => comboRef.current, snapshot, behaviorsRef.current);
  }, []);

  const history = useTabVersionHistory<MacroComboSnapshot>({
    tabId: MACRO_COMBO_TAB_ID,
    schemaVersion: MACRO_COMBO_SNAPSHOT_SCHEMA_VERSION,
    collect,
    apply,
    isLoaded,
    enabled: runtimeMacro.isAvailable || runtimeCombo.isAvailable,
  });

  const macroNames = useMemo(
    () => [...runtimeMacro.macros].map((macro) => macro.name).sort(),
    [runtimeMacro.macros],
  );

  const labeler = useMemo<DiffLabeler>(
    () => buildLabeler(macroNames, behaviors, t),
    [behaviors, macroNames, t],
  );

  return { ...history, labeler };
}

/** Poll until `ok(read())` holds — used to wait for a list refresh to land in
 * React state after an RPC that rewrites it. */
async function waitFor<T>(
  read: () => T,
  ok: (value: T) => boolean,
  message: string,
): Promise<T> {
  const deadline = Date.now() + LIST_REFRESH_TIMEOUT_MS;
  for (;;) {
    const value = read();
    if (ok(value)) return value;
    if (Date.now() > deadline) throw new Error(message);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

async function applyMacros(
  /** Reads the freshest hook state — it changes between awaits. */
  readMacro: () => UseRuntimeMacroReturn,
  snapshot: MacroComboSnapshot,
): Promise<void> {
  const want = snapshot.macros;
  if (!want || !readMacro().isAvailable) return;

  const wantedNames = new Set(want.map((macro) => macro.name));
  for (const existing of [...readMacro().macros]) {
    if (wantedNames.has(existing.name)) continue;
    if (!(await readMacro().deleteMacro(existing.name))) {
      throw new Error(`Failed to delete macro "${existing.name}"`);
    }
  }

  const presentNames = new Set(readMacro().macros.map((macro) => macro.name));
  let created = false;
  for (const macro of want) {
    if (presentNames.has(macro.name)) continue;
    if (!(await readMacro().createMacro(macro.name))) {
      throw new Error(`Failed to create macro "${macro.name}"`);
    }
    created = true;
  }

  if (created) {
    // Slots are assigned by the device; re-read the list to learn them.
    await readMacro().loadMacros();
    await waitFor(
      () => readMacro().macros,
      (macros) =>
        want.every((macro) => macros.some((row) => row.name === macro.name)),
      "The macro list did not refresh after creating macros",
    );
  }

  for (const wanted of want) {
    const summary = readMacro().macros.find((row) => row.name === wanted.name);
    if (!summary) continue;
    const detail = await readMacro().getMacro(summary.slot);
    const currentSteps = detail?.steps.map(encodeMacroStep) ?? [];
    const countChanged = currentSteps.length !== wanted.steps.length;
    if (countChanged) {
      await readMacro().setMacroStepCount(
        summary.slot,
        wanted.steps.length,
        false,
      );
    }
    for (let index = 0; index < wanted.steps.length; index++) {
      // A resized macro has unknown contents past the change, so rewrite all.
      if (!countChanged && currentSteps[index] === wanted.steps[index])
        continue;
      const step = decodeMacroStep(wanted.steps[index]);
      if (!step) continue;
      await readMacro().setMacroStep(summary.slot, index, step, false);
    }
  }

  if (
    snapshot.macroTapMs !== null &&
    snapshot.macroTapMs !== readMacro().globalSettings?.tapMs
  ) {
    await readMacro().setTapMs(snapshot.macroTapMs, false);
  }
}

async function applyCombos(
  /** Reads the freshest hook state — it changes between awaits. */
  readCombo: () => UseRuntimeComboReturn,
  snapshot: MacroComboSnapshot,
  behaviors: Map<number, BehaviorDefinition>,
): Promise<void> {
  const want = snapshot.combos;
  if (!want || !readCombo().isAvailable) return;

  const current = new Map(
    readCombo().combos.map((combo) => [combo.index, buildComboSnapshot(combo)]),
  );
  const wantedIndexes = new Set(want.map((combo) => combo.index));
  for (const index of current.keys()) {
    if (wantedIndexes.has(index)) continue;
    if (!(await readCombo().deleteCombo(index, false))) {
      throw new Error(`Failed to delete combo ${index}`);
    }
  }

  const fallbackBehavior = {
    behaviorId: [...behaviors.values()].at(0)?.id ?? 0,
    param1: 0,
    param2: 0,
  };

  for (const wanted of want) {
    const have = current.get(wanted.index);
    if (!have || !comboSnapshotsEqual(have, wanted)) {
      const ok = await readCombo().setCombo(
        {
          index: wanted.index,
          keyPositions: decodeKeyPositions(wanted.keyPositions),
          behavior: decodeBehavior(wanted.behavior) ?? fallbackBehavior,
          layerMask: wanted.layerMask,
          enabled: wanted.enabled,
          timeoutMs: wanted.timeoutMs,
          requirePriorIdleMs: wanted.requirePriorIdleMs,
          // Stored as a plain number in the snapshot; the device validates it.
          slowReleaseOverride:
            wanted.slowReleaseOverride as SlowReleaseOverride,
        },
        false,
      );
      if (!ok) throw new Error(`Failed to restore combo ${wanted.index}`);
    }
    if (!have || have.name !== wanted.name) {
      await readCombo().setComboName(wanted.index, wanted.name, false);
    }
  }

  const settings = snapshot.comboSettings;
  const currentSettings = readCombo().globalSettings;
  if (settings) {
    if (settings.timeoutMs !== currentSettings?.timeoutMs) {
      await readCombo().setTimeoutMs(settings.timeoutMs, false);
    }
    if (settings.slowRelease !== currentSettings?.slowRelease) {
      await readCombo().setSlowRelease(settings.slowRelease, false);
    }
    if (settings.requirePriorIdleMs !== currentSettings?.requirePriorIdleMs) {
      await readCombo().setRequirePriorIdleMs(
        settings.requirePriorIdleMs,
        false,
      );
    }
  }
}

/**
 * Names for snapshot paths. Macro rows are labelled from the *current* macro
 * list at the same position, which lines up unless the version added or
 * removed macros; the `name` row alongside makes any mismatch obvious.
 */
function buildLabeler(
  macroNames: string[],
  behaviors: Map<number, BehaviorDefinition>,
  t: (key: string, params?: Record<string, string | number>) => string,
): DiffLabeler {
  const comboField: Record<string, string> = {
    name: "Name",
    keyPositions: "Key positions",
    behavior: "Behavior",
    layerMask: "Layers",
    enabled: "Enabled",
    timeoutMs: "Timeout (ms)",
    requirePriorIdleMs: "Require prior idle (ms)",
    slowReleaseOverride: "Slow release",
  };
  const comboSetting: Record<string, string> = {
    timeoutMs: "Combo timeout (ms)",
    slowRelease: "Combo slow release",
    requirePriorIdleMs: "Combo require prior idle (ms)",
  };

  const describeBehavior = (encoded: string): string => {
    const binding = decodeBehavior(encoded);
    if (!binding) return t("None");
    const behavior = behaviors.get(binding.behaviorId);
    const params = [binding.param1, binding.param2].join(", ");
    return behavior ? `${behavior.displayName}(${params})` : encoded;
  };

  return {
    label(path) {
      if (path[0] === "macroTapMs") return t("Macro tap duration (ms)");
      if (path[0] === "macros") {
        const macro =
          macroNames[Number(path[1])] ??
          t("Macro {{index}}", { index: Number(path[1]) + 1 });
        if (path[2] === "name") return t("{{macro}} › Name", { macro });
        if (path[2] === "steps") {
          return t("{{macro}} › Step {{step}}", {
            macro,
            step: Number(path[3]) + 1,
          });
        }
        return t("{{macro}}", { macro });
      }
      if (path[0] === "combos") {
        const combo = t("Combo {{index}}", { index: Number(path[1]) + 1 });
        const field = comboField[path[2]];
        return field ? `${combo} › ${t(field)}` : combo;
      }
      if (path[0] === "comboSettings" && comboSetting[path[1]]) {
        return t(comboSetting[path[1]]);
      }
      return null;
    },
    formatValue(path, value) {
      if (typeof value !== "string") return null;
      if (path[0] === "combos" && path[2] === "behavior") {
        return describeBehavior(value);
      }
      if (path[0] === "macros" && path[2] === "steps") {
        const separator = value.indexOf(":");
        const kind = separator < 0 ? value : value.slice(0, separator);
        const rest = separator < 0 ? "" : value.slice(separator + 1);
        if (kind === "delay") return t("Delay {{ms}} ms", { ms: rest });
        if (kind === "keys") return t("Type text");
        if (kind === "down" || kind === "up" || kind === "tap") {
          return `${t(kind === "down" ? "Press" : kind === "up" ? "Release" : "Tap")} ${describeBehavior(rest)}`;
        }
        return formatDiffValue(value as JsonValue);
      }
      return null;
    },
  };
}
