import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

function run(overrides = {}, extra = [], editPlan = () => {}, hash = null) {
  const dir = mkdtempSync(join(tmpdir(), "exploration-coverage-"));
  try {
    writeFileSync(join(dir, "readback.txt"), "Application Reload: key0=A\n");
    writeFileSync(join(dir, "empty.txt"), "");
    const row = {
      id: "restore-readback",
      required: true,
      specIds: ["KM-R02", "SESSION-012"],
      status: "pass",
      control: "application Reload",
      observed: "key0=A, Saved",
      evidence: ["readback.txt"],
      ...overrides,
    };
    const plan = {
      batch: "keymap",
      checks: [{ ...row }, ...extra.map((r) => ({ ...r }))],
    };
    editPlan(plan);
    const original = join(dir, "original.json");
    const planText = JSON.stringify(plan);
    writeFileSync(original, planText);
    const planHash =
      hash ?? createHash("sha256").update(planText).digest("hex");
    const path = join(dir, "coverage.json");
    writeFileSync(
      path,
      JSON.stringify({ batch: "keymap", checks: [row, ...extra] }),
    );
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL("./check-coverage.mjs", import.meta.url)),
        path,
        "--plan",
        original,
        "--plan-sha256",
        planHash,
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.error, undefined);
    return {
      code: result.status,
      report: result.stdout ? JSON.parse(result.stdout) : null,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("completed evidence is reviewable, including an observed product candidate", () => {
  assert.equal(run().code, 0);
  assert.equal(run({ status: "product-candidate" }).report.reviewable, true);
});

test("mandatory unexecuted work prevents completion despite a success narrative", () => {
  const result = run({
    status: "not-run",
    reason: "Stopped after first charter",
  });
  assert.equal(result.code, 2);
  assert.deepEqual(result.report.missing, ["restore-readback"]);
  assert.equal(result.report.reviewable, false);
  assert.equal(run({ status: "pending" }).code, 2);
});

test("concrete tool blocker is distinct from missing execution", () => {
  const result = run({
    status: "blocked",
    reason: "snapshot timeout after bounded recovery",
  });
  assert.equal(result.code, 3);
  assert.deepEqual(result.report.blocked, ["restore-readback"]);
});

test("invented prefixes and absent or empty evidence are rejected", () => {
  assert.equal(run({ specIds: ["SETTINGS-001"] }).code, 1);
  assert.equal(run({ evidence: ["absent.png"] }).code, 1);
  assert.equal(run({ evidence: ["empty.txt"] }).code, 1);
  assert.equal(run({ control: "" }).code, 1);
});

test("optional excluded combinations remain visible without blocking required work", () => {
  assert.equal(
    run({}, [
      {
        id: "hardware-persistence",
        required: false,
        specIds: ["SESSION-012"],
        status: "not-run",
        reason: "Demo only; no physical power cycle authorized",
      },
    ]).code,
    0,
  );
});

test("a checklist without required work or with duplicate checks is invalid", () => {
  assert.equal(run({ required: false }).code, 1);
  assert.equal(
    run({}, [
      {
        id: "restore-readback",
        required: true,
        specIds: ["KM-R02"],
        status: "pending",
      },
    ]).code,
    1,
  );
});

test("original rows cannot disappear, become optional, change target or be replaced", () => {
  const pending = {
    id: "variant",
    required: true,
    specIds: ["KM-R02"],
    status: "pending",
  };
  assert.equal(run({}, [], (p) => p.checks.push(pending)).code, 1);
  assert.equal(
    run({}, [], (p) => {
      p.checks[0].required = false;
    }).code,
    1,
  );
  assert.equal(
    run({}, [], (p) => {
      p.checks[0].specIds = ["KM-001"];
    }).code,
    1,
  );
  assert.equal(
    run({}, [], (p) => {
      p.checks[0].target = "Right Encoder clockwise";
    }).code,
    1,
  );
  assert.equal(
    run({}, [], (p) => {
      p.checks[0].id = "another-row";
    }).code,
    1,
  );
  assert.equal(
    run({}, [], (p) => {
      p.batch = "sensors";
    }).code,
    1,
  );
});

test("original plan must itself have valid unique checks", () => {
  assert.equal(run({}, [], (p) => p.checks.push(p.checks[0])).code, 1);
  assert.equal(
    run({}, [], (p) => {
      p.checks = [];
    }).code,
    1,
  );
  assert.equal(run({}, [], () => {}, "0".repeat(64)).code, 1);
});
