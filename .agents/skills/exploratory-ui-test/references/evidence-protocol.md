# Evidence and review protocol

Applies to focused and whole-app workers and their coordinator. This is the
workflow correction for [#346](https://github.com/cormoran/dya-studio/issues/346),
not a change to product requirements. All files below belong in a local temporary
run directory; do not commit or publish raw browser/user evidence.

## 1. Freeze the assignment

Coordinator creates `original.json` before dispatch, copies it to `coverage.json`,
and saves the original's SHA-256 in the dispatch brief and coordinator records:

```sh
shasum -a 256 /absolute/tmp/run/original.json
```

Keep the original outside worker-owned outputs. Workers edit only result fields:
`status`, `control`, `observed`, `evidence`, `reason`. All IDs (including optional
rows), `required`, `specIds`, and any planned `target`, `stage`, `theme`, `state`,
or expected values are immutable. Plan one row per observation, not a blanket
theme pass. A baseline undo is restoration, not an independent variant.

Use exactly these statuses: `pending`, `pass`, `product-candidate`, `spec-gap`,
`blocked`, `not-run` (`passed` is invalid). Executed rows need `control`,
`observed` and nonempty `evidence`; blocked/not-run rows need a concrete `reason`.
Run the gate after updating rows, before requesting review, and retain its actual
exit/output. A pending initial gate is not validation of later filled rows.

```sh
node .agents/skills/exploratory-ui-test/scripts/check-coverage.mjs \
  /absolute/tmp/run/coverage.json --plan /absolute/tmp/run/original.json \
  --plan-sha256 <hash-recorded-before-dispatch>
```

The hash is mandatory: do not hash a replacement plan during review. A reduced
checklist, changed required flag, changed target/spec/stage, omitted optional
exclusion, or added row fails exit 1. Preserve supplemental observations in a
separate ledger; they cannot substitute for assigned work. A scope correction
requires coordinator approval and a new versioned plan/brief while retaining the
old plan and results. Never change scope just to obtain exit 0.

## 2. Capture before interpreting

For CLI operations use the receipt runner, one new directory per action. Supply
the resolved executable and individual argv, not a shell pipeline:

```sh
node .agents/skills/exploratory-ui-test/scripts/capture-command.mjs \
  /absolute/tmp/run/001-snapshot -- orca snapshot --page <page-id> --json
```

The parent run directory must exist. The runner refuses existing operation
directories, writes `command.json` with argv/cwd/time, stores unfiltered stdout
and stderr as they arrive, and writes `result.json` only after process completion.
Read the original `stdout.txt` (including Orca's `ok`/error) before drawing a
conclusion. Runner exit 0 proves CLI exit only; an inner `{ok:false}` is failure.
No result file means unfinished or interrupted capture, not a completed timeout.
Summaries belong in reports and never replace these files.

The calling tool can still yield. Preserve its **whole** result:

```js
const receipt = await tools.exec_command({
  cmd: "<capture-command invocation>",
});
text(receipt); // NOT text(receipt.output)
// If receipt.session_id exists, use write_stdin with that same ID until exit.
```

Do not issue another operation on that page, navigate, declare a blocker, or
settle while its command is running. Keep full poll receipts with the initial
receipt. If the session ID is lost, recover the tool transcript or report
receipt loss and unknown state; do not invent an outage. Read large outputs from
saved files in bounded chunks. Use current locale labels or supported selectors;
English text absent from Japanese UI is not a failed connection. Use task-specific
shell variables such as `guide_route`; never assign `path`, `PATH`, `HOME`, or
other system variables. Direct argv avoids shell expansion and zsh `path` damage.

Check successful send/reply receipts too. A failed send (e.g. missing `--subject`)
did not deliver guidance. Use version-matched help; do not infer receipt from intent.

## 3. Check mutation eligibility and restoration

Before any affected write, save an original-session baseline, including **every
source/field the operation writes**, exact units/values, dirty flags and relevant
parameters. Add browser language/theme/editor mode/options/viewport when changed.
Never turn rounded `8.33 min` into an exact millisecond baseline. If exact values
or a UI restoration path are unavailable, do not perform that mutation; continue
independent safe charters. Unequal Settings sources require separate restoration
paths; restoring only Central or using a global preset is insufficient.

Use the same value keys in baseline and observations, for example:

```json
{
  "pageId": "returned-page-id",
  "session": "original-demo-session-1",
  "values": {
    "central.idleMs": 300000,
    "peripheral1.idleMs": 300000,
    "peripheral2.idleMs": 500000,
    "language": "ja",
    "theme": "light",
    "editorMode": "modal",
    "dirty": false
  },
  "evidence": ["001-snapshot/stdout.txt"]
}
```

Coordinator retains the baseline. Worker creates a fresh observation with the
same page/session and exact `values`/`evidence`. Before mutation it additionally
needs `restoreRoutes`, keyed by **each** affected value, each containing `control`
and `evidence` for the demonstrated UI route. Coordinator must review that those
routes actually restore each original value; a repeated generic control name
or the guard's success does not establish this. With unequal sources and no
individual UI control, omit that route and record the blocked eligibility row.

```sh
node .agents/skills/exploratory-ui-test/scripts/check-state.mjs \
  before-mutation /absolute/tmp/run/baseline.json /absolute/tmp/run/eligibility.json
```

Nonzero exit forbids the mutation. After edits, perform the spec's wait/Save →
application Reload → changed target readback **before** restoring. Then restore
through UI, wait/Save, application Reload, and inspect the original target/detail
parameters. Add `"readback": "application-reload"` to the final observation:

```sh
node .agents/skills/exploratory-ui-test/scripts/check-state.mjs \
  restored /absolute/tmp/run/baseline.json /absolute/tmp/run/final.json
```

Exit 0 means equal supplied values with evidence paths, not proof of honest or
complete observations. Review raw readbacks. A clean Saved badge, default names,
fresh Demo, document navigation, or tab closure cannot repair original-session
evidence. Unknown final values remain unknown; retain exact residuals and blocker.
For browser-only/read-only routes, record fresh UI readback in the checklist;
the application-reload guard applies to device edit restoration.

## 4. Self-audit before a blocking review request

Save first-charter raw evidence and fill its rows **before** the progress checkpoint.
Before final review, save a report with:

- Original plan path/hash, dispatch ID, checklist/gate output, completed stages,
  concrete blockers and each remaining independent action. No invented deadline,
  mutation allowance, first-wave cap, or physical-persistence exclusion excuses
  an authorized Demo RAM edit/readback. Unattempted work is not-run, not blocked.
- Initial/final state files and guard outputs, exact residuals, and all pending
  command sessions. No active page command may remain at settlement.
- Per-stage raw receipt paths. Verify target-specific values (e.g. the actual
  encoder direction), not unrelated page strings. Fixtures/filenames alone are
  not executed import evidence: inspect and upload to `input[type=file]`, not
  the trigger button, then read actual preview/error/cancel state.
- For each route: same-page URL, distinct expected H1 and current navigation href.
  For each theme/component/state: locally decoded/inspected image plus fresh
  same-page route, language, selected theme, viewport, loaded-font and component
  styles after rendering stabilizes. Mixed old/new surfaces or mismatched images
  stay uncertain. One final Light image cannot pass other themes/states.
- Candidate classification against the actual spec ID/range and presentation
  (e.g. KM-032 allows 0; completed floating callbacks differ from unfinished
  drafts under BIND-005). Missing execution/capability is not a spec gap. Public
  catalog reads are distinct from authenticated writes.

Run the pinned coverage gate even if incomplete. Fix missing reachable work in
the same active Task; request failed settlement only with a concrete blocker or
explicit user budget. Report nonzero gates without hiding successful stages.

## 5. Review reply controls settlement

Keep **one** pending blocking review ask. On timeout, resume that exact ask ID
using the live orchestration preamble; never cancel it, open a duplicate, or send
failed `worker_done` just because time elapsed. Coordinator must reply to the
actual question: a status/send is not an answer to a blocking ask.

Coordinator reads original plan/hash, report, raw evidence, state and gate;
reconciles stale narrative and counts; then replies with one explicit disposition:

- `CONTINUE`: concrete missing work in the current Task. Worker records the
  received answer and completes/reports those actions before asking again.
- `ACCEPT`: permission to settle with the reviewed outcome.
- `SETTLE FAILED`: concrete blocker, remaining rows and residual state accepted
  as incomplete. It is never permission to claim complete coverage.

Save request ID, actual reply receipt/body, and the worker's acknowledgment of
that answer in the report. Review the latest inbox before `worker_done`. Only
`ACCEPT`/`SETTLE FAILED` for the current dispatch and current artifacts permits
settlement; a CONTINUE reply, timeout, cancelled question or earlier-dispatch
reply does not. Lifecycle tools do not enforce this repository evidence policy;
if a worker violates it, retain incomplete coverage and reconcile receipts.

Coordinator verifies final same-page state before closing a tab, replies to all
pending asks, and follows the normal ownership/cleanup rules even on nonzero
gates. Do not spend the single post-settlement repair on several omitted charters.

## Regression and forward acceptance

Run `node --test .agents/skills/exploratory-ui-test/scripts/*.test.mjs`. Fixtures
must reject removed/reclassified plan rows, wrong hashes/targets, unequal-source
eligibility without restoration routes, incomplete/different final state, a new
Demo session, missing evidence, delayed unfinished commands and receipt overwrite.

Independently forward-test a bounded fixture task with the default worker model,
verified actual effort and `--profile orca`: delayed command → completed receipt;
unequal-source mutation blocked before any action; original rows preserved;
review ask timeout resumed with the same ID; CONTINUE answer consumed before
an explicit settlement reply. Record actual commands/results and coordinator
review. Fixture acceptance proves this bounded protocol, not future worker
compliance, whole-app coverage, real browser paint, or hardware persistence.

For completed worker-start readiness failure despite a Ready TUI, outstanding
background sessions, same-Task retry and retained custom-profile terminal
cleanup, use the separate [bounded recovery fixture](worker-start-recovery-fixture.md).
It defines refusal/unknown/no-input branches and the required attempt/ownership
ledgers without treating synthetic receipts as live runtime acceptance. Do not
induce readiness races or start extra workers to fill its live matrix.
