import {
  buildCheatsheetSvg,
  buildKeymapCheatsheetSvg,
  type CheatsheetKey,
} from "./cheatsheetSvg";
import type { BehaviorDefinition, Layer } from "../hooks/useKeymap";

const key: CheatsheetKey = { x: 0, y: 0, width: 1, height: 1, label: "A" };
const parse = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml");

describe("printable SVG", () => {
  it("escapes every text source and strips invalid XML without losing Unicode or full labels", () => {
    const label = `日本語 😀 & <script>alert('x')</script> " long label`;
    const doc = parse(
      buildCheatsheetSvg(
        [{ name: label, keys: [{ ...key, label: label + "\u0000\ud800" }] }],
        label,
      ),
    );
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.querySelector("script")).toBeNull();
    expect(
      Array.from(doc.querySelectorAll("text"), (node) => node.textContent),
    ).toEqual([label, label, label]);
    expect(doc.querySelector("g title")?.textContent).toBe(label);
    expect(doc.querySelector("g text")?.getAttribute("lengthAdjust")).toBe(
      "spacingAndGlyphs",
    );
  });

  it("accounts for all corners rotated around an external pivot, including negative coordinates", () => {
    const doc = parse(
      buildCheatsheetSvg(
        [
          {
            name: "Rotated",
            keys: [{ ...key, x: 2, y: -1, width: 2, r: 90, rx: 0, ry: 0 }],
          },
        ],
        "Keymap",
      ),
    );
    // (2,-1)..(4,0) rotated 90 degrees gives bounds (0,2)..(1,4).
    expect(doc.documentElement.getAttribute("viewBox")).toBe("0 0 128 320");
    const transform = doc
      .querySelector("g")!
      .getAttribute("transform")!
      .match(/\(([^)]+)\)/)![1]
      .split(/\s+/)
      .map(Number);
    expect(transform[0]).toBe(90);
    expect(transform[1]).toBeCloseTo(32);
    expect(transform[2]).toBeCloseTo(0);
  });

  it.each([45, -45])(
    "keeps diagonal rotation %s inside a non-clipping viewBox",
    (r) => {
      const doc = parse(
        buildCheatsheetSvg(
          [{ name: "Diagonal", keys: [{ ...key, width: 2, r, rx: 0, ry: 0 }] }],
          "Keymap",
        ),
      );
      // Both axes span 3/sqrt(2) units, rather than the unrotated 2 by 1.
      expect(doc.documentElement.getAttribute("viewBox")).toBe("0 0 200 328");
    },
  );

  it("stacks layers with headers and white background, with positive tiny key rectangles", () => {
    const doc = parse(
      buildCheatsheetSvg(
        [
          { name: "Base", keys: [key] },
          { name: "Lower", keys: [{ ...key, width: 0.01, height: 0.01 }] },
        ],
        "Keymap",
      ),
    );
    const texts = Array.from(doc.querySelectorAll("g text"));
    expect(Number(texts[1].getAttribute("y"))).toBeGreaterThan(
      Number(texts[0].getAttribute("y")) + 64,
    );
    expect(doc.querySelector("rect")?.getAttribute("fill")).toBe("#ffffff");
    for (const rect of doc.querySelectorAll("g rect")) {
      expect(Number(rect.getAttribute("width"))).toBeGreaterThan(0);
      expect(Number(rect.getAttribute("height"))).toBeGreaterThan(0);
    }
  });

  it.each([NaN, Infinity, 0, -1])(
    "rejects invalid geometry %s instead of generating corrupt downloads",
    (width) => {
      expect(() =>
        buildCheatsheetSvg(
          [{ name: "Base", keys: [{ ...key, width }] }],
          "Keymap",
        ),
      ).toThrow("Invalid key geometry");
    },
  );
  it("rejects empty layouts", () => {
    expect(() => buildCheatsheetSvg([], "Keymap")).toThrow("Empty keymap");
    expect(() =>
      buildCheatsheetSvg([{ name: "Empty", keys: [] }], "Keymap"),
    ).toThrow("Empty keymap");
  });
});

describe("current Keymap adapter", () => {
  it.each([
    ["US", "[{"],
    ["JIS", "@`"],
  ] as const)(
    "uses the selected %s keycode display and tolerates a missing binding",
    (keyboardLayout, label) => {
      const doc = parse(
        buildKeymapCheatsheetSvg({
          layout: {
            name: "Current",
            keys: [
              { x: 0, y: 0, width: 100, height: 100, r: 0, rx: 0, ry: 0 },
              { x: 100, y: 0, width: 100, height: 100, r: 0, rx: 0, ry: 0 },
            ],
          },
          layers: [
            {
              id: 0,
              name: "Base",
              bindings: [{ behaviorId: 1, param1: 0x7002f, param2: 0 }],
            },
          ],
          behaviors: new Map([
            [1, { id: 1, displayName: "Key Press", metadata: [] }],
          ]),
          keyboardLayout,
          runtimeMacros: [],
          title: "Current",
          layerName: (layer) => layer.name,
        }),
      );
      expect(
        Array.from(doc.querySelectorAll("g text"), (node) => node.textContent),
      ).toEqual([label, "—"]);
    },
  );

  it("uses hundredths geometry, active layer order/IDs, current bindings and shared display context", () => {
    const layers: Layer[] = [
      {
        id: 9,
        name: "",
        bindings: [
          { behaviorId: 1, param1: 0x70004, param2: 0 },
          { behaviorId: 2, param1: 3, param2: 0 },
        ],
      },
      {
        id: 3,
        name: "Symbols",
        bindings: [
          { behaviorId: 3, param1: 9, param2: 0 },
          { behaviorId: 99, param1: 1, param2: 2 },
        ],
      },
    ];
    const behaviors = new Map<number, BehaviorDefinition>([
      [1, { id: 1, displayName: "Key Press", metadata: [] }],
      [2, { id: 2, displayName: "Runtime Macro", metadata: [] }],
      [3, { id: 3, displayName: "Momentary Layer", metadata: [] }],
    ]);
    const svg = buildKeymapCheatsheetSvg({
      layout: {
        name: "Active",
        keys: [
          { x: 100, y: -200, width: 200, height: 100, r: 9000, rx: 0, ry: 0 },
          { x: 0, y: 0, width: 100, height: 100, r: 0, rx: 0, ry: 0 },
        ],
      },
      layers,
      behaviors,
      keyboardLayout: "US",
      runtimeMacros: [{ slot: 3, name: "Greeting" }],
      title: "Current",
      layerName: (layer) => layer.name || `Layer ${layer.id}`,
    });
    const doc = parse(svg);
    expect(
      Array.from(doc.querySelectorAll("text"), (node) => node.textContent),
    ).toEqual([
      "Current",
      "Layer 9",
      "A",
      "Macro Greeting",
      "Symbols",
      "MO 9",
      "—",
    ]);
    expect(doc.querySelector("g")?.getAttribute("transform")).toContain(
      "rotate(90 ",
    );
    expect(Number(doc.querySelector("g rect")?.getAttribute("width"))).toBe(
      124,
    );
    expect(layers[0].bindings[0].param1).toBe(0x70004);
  });
});
