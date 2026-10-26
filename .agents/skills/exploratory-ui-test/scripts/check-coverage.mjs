import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";

// Evidence structure gate only. The coordinator still reviews observations and
// checks the original plan; this cannot establish UI truth or product success.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const definitions = ["pages", "modules"].flatMap((directory) =>
  readdirSync(resolve(root, "docs/spec", directory))
    .filter((name) => name.endsWith(".md"))
    .flatMap((name) => {
      const text = readFileSync(
        resolve(root, "docs/spec", directory, name),
        "utf8",
      );
      return [
        ...text.matchAll(/^\|\s*([A-Z][A-Z0-9-]*-(?:R\d+|\d{3}))\s*\|/gm),
        ...text.matchAll(/^(?:- )?([A-Z][A-Z0-9-]*-(?:I\d+|\d{3})):/gm),
      ].map((match) => match[1]);
    }),
);
const specIds = new Set(definitions);
const statuses = new Set([
  "pending",
  "pass",
  "product-candidate",
  "spec-gap",
  "blocked",
  "not-run",
]);
const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0;

function check(path, planPath, planHash) {
  const ledger = JSON.parse(readFileSync(path, "utf8"));
  const planBytes = readFileSync(planPath);
  if (
    !/^[a-f0-9]{64}$/.test(planHash) ||
    createHash("sha256").update(planBytes).digest("hex") !== planHash
  )
    throw new Error("original plan hash differs from pre-dispatch receipt");
  const plan = JSON.parse(planBytes);
  const errors = [];
  const missing = [];
  const blocked = [];
  if (!nonempty(ledger.batch)) errors.push("batch must have a name");
  if (ledger.batch !== plan.batch)
    errors.push("batch differs from original plan");
  if (!Array.isArray(plan.checks) || !plan.checks.length)
    throw new Error("original plan needs checks");
  const original = new Map();
  const mutable = new Set([
    "status",
    "control",
    "observed",
    "evidence",
    "reason",
  ]);
  const contract = (row) =>
    Object.fromEntries(
      Object.entries(row).filter(([key]) => !mutable.has(key)),
    );
  for (const row of plan.checks) {
    if (
      !row ||
      !nonempty(row.id) ||
      original.has(row.id) ||
      typeof row.required !== "boolean" ||
      !Array.isArray(row.specIds) ||
      !row.specIds.length ||
      row.specIds.some((id) => !specIds.has(id))
    )
      throw new Error("original plan has invalid/duplicate checks or spec IDs");
    original.set(row.id, row);
  }
  if (!Array.isArray(ledger.checks) || ledger.checks.length === 0) {
    return { errors: [...errors, "checks must be a nonempty array"] };
  }
  const seen = new Set();
  let required = 0;
  for (const row of ledger.checks) {
    if (!row || typeof row !== "object") {
      errors.push("check must be an object");
      continue;
    }
    const label = row.id || "unnamed check";
    if (!nonempty(row.id) || seen.has(row.id)) {
      errors.push(`${label}: missing or duplicate id`);
    }
    seen.add(row.id);
    if (!original.has(row.id)) {
      errors.push(
        `${label}: not in original plan; retain supplements separately`,
      );
    } else if (
      !isDeepStrictEqual(contract(row), contract(original.get(row.id)))
    ) {
      errors.push(
        `${label}: planned contract changed (required/specIds/target/stage)`,
      );
    }
    if (typeof row.required !== "boolean") {
      errors.push(`${label}: required must be boolean`);
    }
    if (!statuses.has(row.status)) errors.push(`${label}: invalid status`);
    if (!Array.isArray(row.specIds) || row.specIds.length === 0) {
      errors.push(`${label}: specIds must be a nonempty array`);
    } else {
      for (const id of row.specIds) {
        if (!specIds.has(id)) errors.push(`${label}: unknown spec ID ${id}`);
      }
    }
    if (row.required) {
      required += 1;
      if (["pending", "not-run"].includes(row.status)) missing.push(label);
      if (row.status === "blocked") blocked.push(label);
    }
    if (["blocked", "not-run"].includes(row.status) && !nonempty(row.reason)) {
      errors.push(`${label}: ${row.status} needs a concrete reason`);
    }
    if (["pass", "product-candidate", "spec-gap"].includes(row.status)) {
      if (!nonempty(row.control) || !nonempty(row.observed)) {
        errors.push(
          `${label}: executed checks need control and observed values`,
        );
      }
      if (!Array.isArray(row.evidence) || row.evidence.length === 0) {
        errors.push(`${label}: executed checks need evidence files`);
      } else {
        for (const evidence of row.evidence) {
          try {
            if (!nonempty(evidence)) throw new Error("empty path");
            const file = statSync(resolve(dirname(path), evidence));
            if (!file.isFile() || file.size === 0)
              throw new Error("empty file");
          } catch {
            errors.push(`${label}: missing/empty evidence ${evidence}`);
          }
        }
      }
    }
  }
  for (const id of original.keys()) {
    if (!seen.has(id)) errors.push(`${id}: missing original check`);
  }
  if (required === 0) errors.push("batch must include required checks");
  return { batch: ledger.batch, errors, missing, blocked };
}

try {
  if (
    process.argv.length !== 7 ||
    process.argv[3] !== "--plan" ||
    process.argv[5] !== "--plan-sha256"
  )
    throw new Error(
      "Usage: check-coverage.mjs <ledger.json> --plan <original.json> --plan-sha256 <pre-dispatch-hash>",
    );
  const result = check(
    resolve(process.argv[2]),
    resolve(process.argv[4]),
    process.argv[6],
  );
  const exitCode = result.errors.length
    ? 1
    : result.missing.length
      ? 2
      : result.blocked.length
        ? 3
        : 0;
  console.log(
    JSON.stringify({ ...result, reviewable: exitCode === 0 }, null, 2),
  );
  process.exitCode = exitCode;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
