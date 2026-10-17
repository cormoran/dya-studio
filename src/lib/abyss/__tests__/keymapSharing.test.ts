import { createHash } from "crypto";
import {
  buildApplyTarget,
  selectSharingTarget,
  ALL_SHARING_PARTS,
  sharingModuleNames,
  KEYMAP_SCHEMA,
  parseSharedKeymap,
} from "../keymapSharing";
import {
  keymapIdentifier,
  keymapIdentitySource,
  rememberKeymap,
  rememberedKeymap,
} from "../keymapIdentity";
const device = {
  keyboard: "dya2",
  name: "Demo",
  layers: [
    { name: "Base", bindings: [{ type: "trans" }, { type: "none" }] },
    { name: "Extra", bindings: [{ type: "trans" }] },
  ],
  macros: [{ name: "keep" }],
};
it("validates round-trip exports and rejects invalid binding objects", () => {
  expect(
    parseSharedKeymap(
      JSON.parse(
        JSON.stringify({ $schema: KEYMAP_SCHEMA, ...device, macros: [] }),
      ),
    ),
  ).toMatchObject({ keyboard: "dya2" });
  expect(() =>
    parseSharedKeymap({
      ...device,
      layers: [{ name: "Base", bindings: [{ type: "invalid" }] }],
    }),
  ).toThrow(/valid KeyboardHub/);
});
it("previews retained extra keys and layers, retaining absent optional sections", () => {
  const target = {
    keyboard: "dya2",
    name: "Partial",
    layers: [{ name: "New", bindings: [{ type: "none" }] }],
    combos: [],
  };
  const merged = buildApplyTarget(device, target);
  expect(merged.layers[0].bindings).toEqual([
    { type: "none" },
    { type: "none" },
  ]);
  expect(merged.layers[1]).toEqual(device.layers[1]);
  expect(merged.macros).toEqual(device.macros);
  expect(merged.combos).toEqual([]);
});
it("hashes exact namespaced UTF-8 source bytes and retains their record id separately", async () => {
  const source = keymapIdentitySource("record-one");
  expect(source).toMatch(/^abyss:https?:\/\/[^/]+\/keymaps\/record-one$/);
  const identifier = await keymapIdentifier("record-one");
  expect(identifier).toBe(
    createHash("sha256").update(source, "utf8").digest("base64url").slice(0, 4),
  );
  rememberKeymap(identifier, "record-one");
  expect(rememberedKeymap(identifier)).toBe("record-one");
});

describe("partial sharing", () => {
  const module = (name: string, scaleX: number) => ({
    name,
    type: "trackball",
    scaleX,
  });
  const base = {
    ...device,
    modules: [module("ball", 1), module("wheel", 2)],
    layers: [
      {
        name: "Base",
        bindings: [{ type: "trans" }],
        modules: [module("ball", 3)],
      },
    ],
    combos: [{ name: "keep" }],
    macros: [{ name: "old" }],
  };
  const target = {
    ...base,
    modules: [module("ball", 9)],
    layers: [
      {
        name: "New",
        bindings: [{ type: "none" }],
        modules: [module("ball", 8)],
      },
      {
        name: "Extra",
        bindings: [{ type: "none" }],
        modules: [module("ball", 7)],
      },
    ],
    combos: [],
    macros: [],
  };
  it("starts with all parts and all module names selected", () => {
    expect(selectSharingTarget(base, target, ALL_SHARING_PARTS)).toEqual(
      target,
    );
    expect(sharingModuleNames(base, target)).toEqual(["ball", "wheel"]);
  });
  it("preserves excluded modules globally and per layer while allowing removals of selected ones", () => {
    const selected = selectSharingTarget(base, target, {
      ...ALL_SHARING_PARTS,
      modules: { ball: false },
    });
    expect(selected.modules).toEqual([module("ball", 1)]); // selected wheel is removed
    expect(selected.layers[0].modules).toEqual([module("ball", 3)]);
    expect(selected.layers[1].modules).toBeUndefined();
    expect(selected.layers[0].bindings).toEqual(target.layers[0].bindings);
  });
  it("transfers modules independently without renaming, adding layers or touching excluded collections", () => {
    const selected = selectSharingTarget(base, target, {
      ...ALL_SHARING_PARTS,
      keymap: false,
      combos: false,
      macros: false,
    });
    expect(selected.layers).toHaveLength(1);
    expect(selected.layers[0]).toEqual({
      ...base.layers[0],
      modules: target.layers[0].modules,
    });
    expect(selected.combos).toBe(base.combos);
    expect(selected.macros).toBe(base.macros);
  });
  it("keeps absent sections absent when all data is excluded", () => {
    const emptyBase = { ...device, modules: undefined, combos: undefined };
    const selected = selectSharingTarget(emptyBase, target, {
      ...ALL_SHARING_PARTS,
      combos: false,
      modules: { ball: false },
    });
    expect(selected.modules).toBeUndefined();
    expect(selected.combos).toBeUndefined();
  });
});

it("retains a destination-only layer containing an excluded module", () => {
  const before = {
    ...device,
    layers: [
      ...device.layers,
      {
        name: "Keep",
        bindings: [{ type: "trans" }],
        modules: [{ name: "ball", type: "trackball", scaleX: 2 }],
      },
    ],
  };
  const target = { ...device, layers: [device.layers[0]] };
  const after = selectSharingTarget(before, target, {
    ...ALL_SHARING_PARTS,
    modules: { ball: false },
  });
  expect(after.layers[2]).toEqual(before.layers[2]);
  expect(
    selectSharingTarget(before, target, ALL_SHARING_PARTS).layers,
  ).toHaveLength(1);
});
