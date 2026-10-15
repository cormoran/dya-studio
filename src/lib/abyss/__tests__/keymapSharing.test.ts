import { createHash } from "crypto";
import {
  buildApplyTarget,
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
