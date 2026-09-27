import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";

const yaml = readFileSync(
  new URL("../.github/workflows/preview.yml", import.meta.url),
  "utf8",
);
const scripts = [
  ...yaml.matchAll(/          script: \|\n((?:            .*\n|\n)+)/g),
].map((match) => match[1].replace(/^            /gm, ""));
const repo = { owner: "cormoran", repo: "dya-studio" };
const head = { sha: "abc", repo: { full_name: "cormoran/dya-studio" } };
const pr = { number: 233, state: "open", user: { login: "cormoran" }, head };

async function identify(
  candidate,
  {
    protectedEnv = true,
    actor = "cormoran",
    path = ".github/workflows/test.yml",
  } = {},
) {
  const outputs = {};
  let environmentReads = 0;
  const summary = {
    addHeading() {
      return this;
    },
    addRaw() {
      return this;
    },
    async write() {},
  };
  const run = {
    path,
    repository: { full_name: "cormoran/dya-studio" },
    head_repository: {
      owner: { login: candidate?.head.repo.full_name.split("/")[0] ?? "fork" },
      full_name: candidate?.head.repo.full_name ?? "fork/dya-studio",
    },
    head_branch: "feature",
    head_sha: "abc",
    pull_requests: [],
    html_url: "https://example.com",
  };
  const github = {
    request: async () => {
      environmentReads++;
      return {
        data: {
          protection_rules: protectedEnv
            ? [{ type: "required_reviewers", reviewers: [{}] }]
            : [],
        },
      };
    },
    rest: { pulls: { list() {} } },
    paginate: async () => (candidate ? [candidate] : []),
  };
  await new Function(
    "github",
    "context",
    "core",
    `return (async()=>{${scripts[0]}})()`,
  )(
    github,
    { repo, actor, payload: { workflow_run: run } },
    {
      setOutput: (key, value) => {
        outputs[key] = value;
      },
      notice() {},
      summary,
    },
  );
  return { outputs, environmentReads };
}

const forkPR = {
  ...pr,
  user: { login: "contributor" },
  head: { ...head, repo: { full_name: "contributor/dya-studio" } },
};

test("cormoran PR from the base repo proceeds without reviewer configuration", async () => {
  const result = await identify(pr, {
    protectedEnv: false,
    actor: "someone-else",
  });
  assert.equal(result.outputs.trusted, "true");
  assert.equal(result.environmentReads, 0);
});

test("fork PR resolves even with empty associated PRs and requires approval", async () => {
  const result = await identify(forkPR);
  assert.equal(result.outputs.number, 233);
  assert.equal(result.outputs.trusted, "false");
  assert.equal(result.environmentReads, 1);
});

test("a maintainer rerun cannot bypass fork approval", async () => {
  await assert.rejects(
    identify(forkPR, { protectedEnv: false, actor: "cormoran" }),
    /Required reviewers/,
  );
});

test("another author in the base repo still requires approval", async () => {
  await assert.rejects(
    identify(
      { ...pr, user: { login: "contributor" } },
      { protectedEnv: false },
    ),
    /Required reviewers/,
  );
});

test("cormoran author with a foreign source repo still requires approval", async () => {
  await assert.rejects(
    identify({ ...forkPR, user: pr.user }, { protectedEnv: false }),
    /Required reviewers/,
  );
});

test("obsolete or absent PR does not produce deployment outputs", async () => {
  assert.deepEqual(
    (await identify({ ...pr, head: { ...head, sha: "new" } })).outputs,
    {},
  );
  assert.deepEqual((await identify(null)).outputs, {});
});

test("unexpected build workflow is rejected", async () => {
  await assert.rejects(identify(pr, { path: "evil.yml" }), /Unexpected/);
});

test("post-approval guard rejects closed or updated PR", async () => {
  const previous = {
    number: process.env.PR_NUMBER,
    sha: process.env.BUILD_SHA,
  };
  process.env.PR_NUMBER = "233";
  process.env.BUILD_SHA = "abc";
  const check = (candidate) =>
    new Function("github", "context", `return (async()=>{${scripts[1]}})()`)(
      { rest: { pulls: { get: async () => ({ data: candidate }) } } },
      { repo },
    );
  try {
    await check(pr);
    await assert.rejects(
      check({ ...pr, state: "closed" }),
      /changed or closed/,
    );
    await assert.rejects(
      check({ ...pr, head: { ...head, sha: "new" } }),
      /changed or closed/,
    );
  } finally {
    for (const [key, value] of [
      ["PR_NUMBER", previous.number],
      ["BUILD_SHA", previous.sha],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

async function runDeploymentScript(index, environment, { id = 42 } = {}) {
  const previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  const calls = [];
  const outputs = {};
  try {
    await new Function(
      "github",
      "context",
      "core",
      `return (async()=>{${scripts[index]}})()`,
    )(
      {
        rest: {
          repos: {
            async createDeployment(params) {
              calls.push({ method: "deployment", ...params });
              return { data: { id } };
            },
            async createDeploymentStatus(params) {
              calls.push({ method: "status", ...params });
            },
          },
        },
      },
      { repo, serverUrl: "https://github.com", runId: 123 },
      { setOutput: (key, value) => (outputs[key] = value) },
    );
    return { calls, outputs };
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("deployment tracks the PR SHA rather than the workflow main SHA", async () => {
  const { calls, outputs } = await runDeploymentScript(2, {
    PR_NUMBER: "233",
    BUILD_SHA: "abc",
  });
  assert.equal(calls[0].ref, "abc");
  assert.equal(calls[0].environment, "preview-pr-233");
  assert.equal(calls[0].auto_merge, false);
  assert.deepEqual(calls[0].required_contexts, []);
  assert.equal(calls[0].transient_environment, true);
  assert.equal(calls[0].production_environment, false);
  assert.equal(outputs.id, 42);
  assert.equal(calls[1].deployment_id, 42);
  assert.equal(calls[1].state, "in_progress");
  assert.equal(calls[1].auto_inactive, false);
  const other = await runDeploymentScript(2, {
    PR_NUMBER: "234",
    BUILD_SHA: "def",
  });
  assert.notEqual(other.calls[0].environment, calls[0].environment);
});

test("successful upload records its URL without hiding other previews", async () => {
  const { calls } = await runDeploymentScript(3, {
    DEPLOYMENT_ID: "42",
    UPLOAD_OUTCOME: "success",
    JOB_STATUS: "success",
    PREVIEW_URL: "https://preview.example.com",
  });
  assert.equal(calls[0].deployment_id, 42);
  assert.equal(calls[0].state, "success");
  assert.equal(calls[0].environment_url, "https://preview.example.com");
  assert.equal(
    calls[0].log_url,
    "https://github.com/cormoran/dya-studio/actions/runs/123",
  );
  assert.equal(calls[0].auto_inactive, false);
});

test("failed, skipped, or cancelled uploads do not publish a successful preview", async () => {
  for (const [outcome, status, expected] of [
    ["failure", "failure", "failure"],
    ["skipped", "failure", "failure"],
    ["cancelled", "cancelled", "error"],
  ]) {
    const { calls } = await runDeploymentScript(3, {
      DEPLOYMENT_ID: "42",
      UPLOAD_OUTCOME: outcome,
      JOB_STATUS: status,
      PREVIEW_URL: "",
    });
    assert.equal(calls[0].state, expected);
    assert.equal(calls[0].environment_url, undefined);
    assert.equal(calls[0].auto_inactive, false);
  }
  assert.match(
    yaml,
    /if: \$\{\{ always\(\) && steps\.deployment\.outputs\.id != '' \}\}/,
  );
});
