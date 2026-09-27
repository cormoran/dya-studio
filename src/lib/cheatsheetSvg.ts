/**
 * Adapted from bakajaan/dya-studio's printable keymap SVG generator (AGPL-3.0).
 * Source: https://github.com/bakajaan/dya-studio/blob/24062d574a11bf8da6f54213830bc609480fe7c8/src/lib/cheatsheetSvg.ts
 * Changes: rotated bounds, XML-safe text, full labels and current ZMK data adapter.
 */
import type {
  BehaviorDefinition,
  Layer,
  PhysicalLayout,
} from "../hooks/useKeymap";
import { formatBehaviorBinding } from "./behaviorMetadata";
import type { KeyboardLayoutType } from "./keyboardLayouts";

export interface CheatsheetKey {
  /** Geometry in key units; rotation in degrees around (rx, ry). */
  x: number;
  y: number;
  width: number;
  height: number;
  r?: number;
  rx?: number;
  ry?: number;
  label: string;
}

export interface CheatsheetLayer {
  name: string;
  keys: CheatsheetKey[];
}

function escapeXml(text: string): string {
  // XML 1.0 excludes these control characters, even inside escaped text.
  return Array.from(text)
    .filter((character) => {
      const code = character.codePointAt(0)!;
      return (
        code === 9 ||
        code === 10 ||
        code === 13 ||
        (code >= 0x20 && code <= 0xd7ff) ||
        (code >= 0xe000 && code <= 0xfffd) ||
        code >= 0x10000
      );
    })
    .join("")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rotatedCorners(key: CheatsheetKey) {
  const radians = ((key.r ?? 0) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const rx = key.rx ?? key.x;
  const ry = key.ry ?? key.y;
  return [
    [key.x, key.y],
    [key.x + key.width, key.y],
    [key.x + key.width, key.y + key.height],
    [key.x, key.y + key.height],
  ].map(([x, y]) => ({
    x: rx + (x - rx) * cos - (y - ry) * sin,
    y: ry + (x - rx) * sin + (y - ry) * cos,
  }));
}

/** Pure standalone SVG, with no device, DOM, stylesheet or network access. */
export function buildCheatsheetSvg(
  layers: CheatsheetLayer[],
  title: string,
): string {
  const keys = layers.flatMap((layer) => layer.keys);
  if (!layers.length || !keys.length) throw new Error("Empty keymap");
  for (const key of keys) {
    if (
      ![
        key.x,
        key.y,
        key.width,
        key.height,
        key.r ?? 0,
        key.rx ?? key.x,
        key.ry ?? key.y,
      ].every(Number.isFinite) ||
      key.width <= 0 ||
      key.height <= 0
    )
      throw new Error("Invalid key geometry");
  }
  const corners = keys.flatMap(rotatedCorners);
  const minX = Math.min(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxX = Math.max(...corners.map((point) => point.x));
  const maxY = Math.max(...corners.map((point) => point.y));
  const unit = 64;
  const padding = 32;
  const header = 48;
  const boardWidth = (maxX - minX) * unit;
  const boardHeight = (maxY - minY) * unit;
  const blockHeight = header + boardHeight + padding;
  const width = Math.ceil(boardWidth + padding * 2);
  const height = Math.ceil(padding * 2 + header + blockHeight * layers.length);
  // Keep full labels in both the visible text and title; compress only when
  // necessary to keep long custom behavior/layer names inside their area.
  const text = (
    label: string,
    x: number,
    y: number,
    size: number,
    available: number,
    centered = false,
  ) => {
    const fit =
      Array.from(label).length * size > available
        ? ` textLength="${available}" lengthAdjust="spacingAndGlyphs"`
        : "";
    return `<text x="${x}" y="${y}" font-size="${size}"${centered ? ' text-anchor="middle" dominant-baseline="central"' : ""}${fit}>${escapeXml(label)}</text>`;
  };
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="sans-serif" fill="#111111">`,
    `<title>${escapeXml(title)}</title>`,
    '<rect width="100%" height="100%" fill="#ffffff"/>',
    text(title, padding, padding + 24, 20, boardWidth),
  ];
  layers.forEach((layer, index) => {
    const cursorY = padding + header + index * blockHeight;
    parts.push(text(layer.name, padding, cursorY + 24, 16, boardWidth));
    const originY = cursorY + header;
    layer.keys.forEach((key) => {
      const x = padding + (key.x - minX) * unit;
      const y = originY + (key.y - minY) * unit;
      const w = key.width * unit;
      const h = key.height * unit;
      const inset = Math.min(2, w / 8, h / 8);
      const rotation = key.r
        ? ` transform="rotate(${key.r} ${padding + ((key.rx ?? key.x) - minX) * unit} ${originY + ((key.ry ?? key.y) - minY) * unit})"`
        : "";
      parts.push(
        `<g${rotation}><title>${escapeXml(key.label)}</title>`,
        `<rect x="${x + inset}" y="${y + inset}" width="${w - inset * 2}" height="${h - inset * 2}" rx="4" fill="#f4f4f5" stroke="#52525b"/>`,
        text(
          key.label,
          x + w / 2,
          y + h / 2,
          Math.min(13, h / 3),
          w - inset * 4,
          true,
        ),
        "</g>",
      );
    });
  });
  parts.push("</svg>");
  return parts.join("");
}

/** ZMK geometry uses hundredths of a key unit and hundredths of a degree. */
export function buildKeymapCheatsheetSvg({
  layout,
  layers,
  behaviors,
  keyboardLayout,
  runtimeMacros,
  title,
  layerName,
}: {
  layout: PhysicalLayout;
  layers: Layer[];
  behaviors: Map<number, BehaviorDefinition>;
  keyboardLayout: KeyboardLayoutType;
  runtimeMacros: Array<{ slot: number; name?: string }>;
  title: string;
  layerName: (layer: Layer) => string;
}): string {
  return buildCheatsheetSvg(
    layers.map((layer) => ({
      name: layerName(layer),
      keys: layout.keys.map((key, position) => {
        const binding = layer.bindings[position];
        return {
          x: key.x / 100,
          y: key.y / 100,
          width: key.width / 100,
          height: key.height / 100,
          r: key.r / 100,
          rx: key.rx / 100,
          ry: key.ry / 100,
          label: formatBehaviorBinding(
            binding,
            binding ? (behaviors.get(binding.behaviorId) ?? null) : null,
            { layers, keyboardLayout, runtimeMacros },
          ),
        };
      }),
    })),
    title,
  );
}
