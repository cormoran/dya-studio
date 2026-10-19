import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";

// Execute the actual github-script body so changes to the PR gate are covered.
const yaml = readFileSync(
  new URL("../.github/workflows/renode-webserial-e2e.yml", import.meta.url),
  "utf8",
);
const script = yaml
  .match(/          script: \|\n((?:            .*\n|\n)+)/)[1]
  .replace(/^            /gm, "");

async function scope(files, eventName = "pull_request", author = "cormoran") {
  let reads = 0;
  const result = await new Function(
    "github",
    "context",
    `return (async () => {${script}})()`,
  )(
    {
      rest: { pulls: { listFiles() {} } },
      paginate: async () => {
        reads++;
        return files.map((filename) => ({ filename }));
      },
    },
    {
      eventName,
      repo: { owner: "cormoran", repo: "dya-studio" },
      issue: { number: 288 },
      payload: { pull_request: { user: { login: author } } },
    },
  );
  return { result, reads };
}

for (const path of [
  "src/pages/KeymapPage.tsx",
  "src/components/keymap/LayerTabs.tsx",
  "src/hooks/useKeymap.ts",
  "src/components/settings/PowerManagementSettings.tsx",
  "src/i18n/en.json",
  "src/index.css",
  "src/App.tsx",
  "package.json",
  "package-lock.json",
  "index.html",
  "vite.config.ts",
  "tsconfig.app.json",
  "buf.gen.yaml",
  "buf.yaml",
  "proto/custom.proto",
  "public/keycodes.json",
  ".github/workflows/renode-webserial-e2e.yml",
  "e2e/renode/tests/dya2/settings.spec.ts",
  "scripts/renode-workflow.test.mjs",
]) {
  test(`runs firmware E2E for ${path}`, async () => {
    assert.deepEqual(await scope([path]), { result: true, reads: 1 });
  });
}

test("skips documentation and Demo-only capture changes", async () => {
  assert.equal(
    (
      await scope([
        "README.md",
        "docs/spec/pages/keymap.md",
        ".agents/skills/exploratory-ui-test/SKILL.md",
        "e2e/renode/tests/developer-guide-screenshots.spec.ts",
        "e2e/renode/capture-developer-guide.sh",
      ])
    ).result,
    false,
  );
});

test("a source change still runs alongside an excluded capture", async () => {
  assert.equal(
    (
      await scope([
        "e2e/renode/capture-developer-guide.sh",
        "src/pages/KeymapPage.tsx",
      ])
    ).result,
    true,
  );
});

for (const event of ["schedule", "workflow_dispatch"]) {
  test(`${event} always runs without querying PR files`, async () => {
    assert.deepEqual(await scope([], event), { result: true, reads: 0 });
  });
}

test("Dependabot author always runs, independently of rerunner", async () => {
  assert.deepEqual(
    await scope(["README.md"], "pull_request", "dependabot[bot]"),
    {
      result: true,
      reads: 0,
    },
  );
});
