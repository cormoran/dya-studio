import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const script = (name) => fileURLToPath(new URL(name, import.meta.url));
const write = (path, value) => writeFileSync(path, JSON.stringify(value));
const read = (path) => JSON.parse(readFileSync(path, "utf8"));

test("delayed output stays pending, raw output is preserved, and receipts cannot be overwritten", async () => {
  const dir = mkdtempSync(join(tmpdir(), "exploration-command-"));
  try {
    const receipt = join(dir, "operation-001");
    const release = join(dir, "release");
    const child = spawn(
      process.execPath,
      [
        script("capture-command.mjs"),
        receipt,
        "--",
        process.execPath,
        "-e",
        'const fs = require("node:fs"); process.stdout.write("first\\n"); const timer = setInterval(() => { if (fs.existsSync(process.argv[1])) { clearInterval(timer); process.stdout.write("last\\n"); process.stderr.write("warning\\n"); } }, 10);',
        release,
      ],
      { stdio: "ignore" },
    );
    // Wait for actual output, rather than assuming process startup latency.
    for (let i = 0; i < 200 && !existsSync(join(receipt, "command.json")); i++)
      await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(existsSync(join(receipt, "command.json")), true);
    assert.equal(existsSync(join(receipt, "result.json")), false);
    writeFileSync(release, "continue");
    assert.deepEqual(await once(child, "exit"), [0, null]);
    assert.equal(
      readFileSync(join(receipt, "stdout.txt"), "utf8"),
      "first\nlast\n",
    );
    assert.equal(
      readFileSync(join(receipt, "stderr.txt"), "utf8"),
      "warning\n",
    );
    assert.equal(read(join(receipt, "result.json")).code, 0);
    const retry = spawnSync(process.execPath, [
      script("capture-command.mjs"),
      receipt,
      "--",
      process.execPath,
      "-e",
      'throw Error("must not execute")',
    ]);
    assert.equal(retry.status, 1);
    assert.equal(
      readFileSync(join(receipt, "stdout.txt"), "utf8"),
      "first\nlast\n",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("command failure and spawn failure have completed error receipts", () => {
  const dir = mkdtempSync(join(tmpdir(), "exploration-errors-"));
  try {
    for (const [id, argv] of [
      ["exit", [process.execPath, "-e", "process.exit(7)"]],
      ["spawn", [join(dir, "absent")]],
    ]) {
      const receipt = join(dir, id);
      assert.equal(
        spawnSync(process.execPath, [
          script("capture-command.mjs"),
          receipt,
          "--",
          ...argv,
        ]).status,
        1,
      );
      const result = read(join(receipt, "result.json"));
      if (id === "exit") assert.equal(result.code, 7);
      else assert.match(result.error, /ENOENT/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function state(phase, change = () => {}) {
  const dir = mkdtempSync(join(tmpdir(), "exploration-state-"));
  try {
    writeFileSync(
      join(dir, "raw.txt"),
      "Fixture UI readback: values per source\n",
    );
    const baseline = {
      pageId: "page-1",
      session: "demo-1",
      values: {
        "central.idleMs": 300000,
        "peripheral1.idleMs": 300000,
        "peripheral2.idleMs": 500000,
        language: "ja",
        theme: "light",
        editorMode: "modal",
        dirty: false,
      },
      evidence: ["raw.txt"],
    };
    const observation = {
      ...baseline,
      values: { ...baseline.values },
      readback: "application-reload",
      restoreRoutes: Object.fromEntries(
        Object.keys(baseline.values).map((key) => [
          key,
          {
            control: `fixture source-specific UI control ${key}`,
            evidence: ["raw.txt"],
          },
        ]),
      ),
    };
    change(observation, baseline);
    write(join(dir, "baseline.json"), baseline);
    write(join(dir, "observation.json"), observation);
    const result = spawnSync(
      process.execPath,
      [
        script("check-state.mjs"),
        phase,
        join(dir, "baseline.json"),
        join(dir, "observation.json"),
      ],
      { encoding: "utf8" },
    );
    return { code: result.status, report: JSON.parse(result.stdout) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("unequal sources without individual UI restoration are blocked before mutation", () => {
  const result = state("before-mutation", (o) => {
    delete o.restoreRoutes["peripheral2.idleMs"];
  });
  assert.equal(result.code, 1);
  assert.match(result.report.errors.join(" "), /peripheral2.*do not mutate/);
  assert.equal(state("before-mutation").code, 0);
});

test("restoration compares all original values, preferences and session, not just Saved", () => {
  assert.equal(state("restored").code, 0);
  for (const change of [
    (o) => {
      o.values["peripheral2.idleMs"] = 300000;
    },
    (o) => {
      delete o.values["peripheral2.idleMs"];
    },
    (o) => {
      o.values.theme = "pop";
    },
    (o) => {
      o.values.language = "en";
    },
    (o) => {
      o.values.editorMode = "floating";
    },
    (o) => {
      o.values.dirty = true;
    },
    (o) => {
      o.session = "fresh-demo";
    },
    (o) => {
      o.readback = "document-reload";
    },
    (o) => {
      o.evidence = ["missing.txt"];
    },
  ])
    assert.equal(state("restored", change).code, 1);
});
