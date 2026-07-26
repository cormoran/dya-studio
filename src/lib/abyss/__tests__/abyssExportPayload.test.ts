/**
 * Tests for the export payload builder.
 *
 * The behaviour that matters is what an *update* does to data the user did not
 * select: it must be left alone, and the Abyss keymap's own name must survive.
 */
import {
  ALL_SECTIONS,
  buildExportData,
  buildNewExportData,
  selectedSectionIds,
  type KeymapDocument,
} from "../abyssExportPayload";

const device: KeymapDocument = {
  keyboard: "dya2",
  name: "DYA Keyboard (Demo)",
  description: "read from the device",
  layers: [
    { name: "Base", bindings: ["d0"], modules: ["dm0"] },
    { name: "Nav", bindings: ["d1"], modules: [] },
  ],
  modules: ["device-module"],
  combos: ["device-combo"],
  macros: ["device-macro"],
};

const existing: KeymapDocument = {
  keyboard: "dya2",
  name: "My saved keymap",
  description: "kept on Abyss",
  layers: [{ name: "Old", bindings: ["a0"], modules: ["am0"] }],
  modules: ["abyss-module"],
  combos: ["abyss-combo"],
  macros: ["abyss-macro"],
};

describe("buildExportData", () => {
  it("never renames the Abyss keymap it is updating", () => {
    // applyKeyboardHubKeymapSelection upstream overwrites these from the device
    // side, which would rename the user's keymap to the device name on every
    // save. This is the reason the merge lives here.
    const result = buildExportData(device, existing, ALL_SECTIONS);

    expect(result.name).toBe("My saved keymap");
    expect(result.description).toBe("kept on Abyss");
  });

  it("takes every selected section from the device", () => {
    const result = buildExportData(device, existing, ALL_SECTIONS);

    expect(result.layers.map((layer) => layer.name)).toEqual(["Base", "Nav"]);
    expect(result.layers[0].bindings).toEqual(["d0"]);
    expect(result.combos).toEqual(["device-combo"]);
    expect(result.macros).toEqual(["device-macro"]);
    expect(result.modules).toEqual(["device-module"]);
  });

  it("leaves deselected sections exactly as Abyss had them", () => {
    const result = buildExportData(device, existing, {
      keymap: true,
      combos: false,
      macros: false,
      modules: false,
    });

    expect(result.combos).toEqual(["abyss-combo"]);
    expect(result.macros).toEqual(["abyss-macro"]);
    expect(result.modules).toEqual(["abyss-module"]);
    // Per-layer modules follow the modules selection, not the keymap one.
    expect(result.layers[0].modules).toEqual(["am0"]);
  });

  it("does not add device layers when keymap data was not selected", () => {
    const result = buildExportData(device, existing, {
      keymap: false,
      combos: true,
      macros: true,
      modules: true,
    });

    expect(result.layers).toHaveLength(1);
    expect(result.layers[0].name).toBe("Old");
    expect(result.layers[0].bindings).toEqual(["a0"]);
  });
});

describe("buildNewExportData", () => {
  it("uses the supplied name and keeps the device's keymap data", () => {
    const result = buildNewExportData(device, ALL_SECTIONS, "Exported 2026");

    expect(result.name).toBe("Exported 2026");
    expect(result.layers).toHaveLength(2);
    expect(result.combos).toEqual(["device-combo"]);
  });

  it("omits deselected collections instead of sending them empty", () => {
    // "this export did not cover combos" is different from "this keymap has no
    // combos", and only the first is true here.
    const result = buildNewExportData(
      device,
      { keymap: true, combos: false, macros: false, modules: false },
      "Keymap only",
    );

    expect(result).not.toHaveProperty("combos");
    expect(result).not.toHaveProperty("macros");
    expect(result).not.toHaveProperty("modules");
    expect(result.layers).toHaveLength(2);
  });

  it("keeps keymap data even if the caller deselects it", () => {
    const result = buildNewExportData(
      device,
      { keymap: false, combos: true, macros: true, modules: true },
      "Still has layers",
    );

    expect(result.layers).toHaveLength(2);
  });
});

describe("selectedSectionIds", () => {
  it("is stable and sorted so analytics values group", () => {
    expect(selectedSectionIds(ALL_SECTIONS)).toBe(
      "keymap,combos,macros,modules",
    );
    expect(
      selectedSectionIds({
        keymap: true,
        combos: false,
        macros: true,
        modules: false,
      }),
    ).toBe("keymap,macros");
  });
});
