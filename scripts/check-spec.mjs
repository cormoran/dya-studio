import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// Structural checks complement human/source review; they do not prove accuracy.
const root = resolve(import.meta.dirname, "..");
const specRoot = join(root, "docs/spec");
const required = [
  "範囲・根拠",
  "機能要求",
  "前提・状態",
  "現行の機能仕様",
  "代表ユーザーフロー",
  "不変条件",
  "エラーと復帰",
  "探索の観点",
  "既知の受け入れ済み不具合",
  "未解決・未検証",
];
function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? markdownFiles(path)
      : entry.name.endsWith(".md")
        ? [path]
        : [];
  });
}
const errors = [];
const ids = new Map();
const files = [join(root, "AGENTS.md"), ...markdownFiles(specRoot)];
for (const file of files) {
  const content = readFileSync(file, "utf8");
  const relative = file.slice(root.length + 1);
  for (const match of content.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    if (!existsSync(resolve(dirname(file), decodeURIComponent(target)))) {
      errors.push(`${relative}: broken local link ${target}`);
    }
  }
  if (!/^docs\/spec\/(pages|modules)\//.test(relative)) continue;
  for (const heading of required) {
    if (!content.split("\n").includes(`## ${heading}`)) {
      errors.push(`${relative}: missing section ${heading}`);
    }
  }
  const definitions = [
    ...content.matchAll(/^\|\s*([A-Z][A-Z0-9-]*-(?:R\d+|\d{3}))\s*\|/gm),
    ...content.matchAll(/^- ([A-Z][A-Z0-9-]*-I\d+):/gm),
  ];
  if (!definitions.length) errors.push(`${relative}: no specification IDs`);
  for (const [, id] of definitions) {
    if (ids.has(id))
      errors.push(`${relative}: duplicate ${id} in ${ids.get(id)}`);
    else ids.set(id, relative);
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked ${files.length} documents and ${ids.size} spec IDs.`);
}
