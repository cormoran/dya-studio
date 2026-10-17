# Whole-app planning and acceptance

Read this before planning a whole-app run. The [exploration guide](../../../../docs/spec/EXPLORATORY_TESTING.md) remains authoritative for UI evidence and restoration. Whole-app completion means the planned representative coverage was executed and reviewed; it does not mean all combinations passed or that Demo proved hardware behavior.

## Plan before dispatch

Create a temporary inventory covering every sitemap entry, all 11 Developer Guide routes separately, rotary encoders, Keymap sharing, and the capability-gated Debug Tool. For each entry record its batch/owner, actual specification IDs, representative baseline and distinct variation, required theme/component states, persistence/restoration checks, and capability exclusions. Copy IDs from the specification definitions; a missing test is not a specification gap.

Plan the complete sequence of batches, not just the first concurrent wave. Keep at most the user-authorized number of workers active. A practical starting split is Keymap/sensors; sharing/public routes; Macro & Combo; Trackball; Settings/Connection; Subsystems/Troubleshooting. Split further when theme or persistence evidence would overload a batch. These are planned scope, not authorization for unlimited launches: record the number of batches and each batch's 3–5 bounded charters before the first dispatch, honor user budgets, and do not enlarge the plan silently.

Give low-effort workers only 1–2 editing pages and the specifications for that batch. Include three achievable charters by default, each with its own baseline and cancellation/boundary/switch variation. Assign read-only routes explicitly rather than adding them as an unbudgeted afterthought. Give every batch a temporary report directory and a checklist of mandatory observations; distinguish optional combinations from required representative checks before execution. Theme checks are real work, not an optional appendix.

## Preflight before the independent wave

The coordinator starts isolated origins, completes generation/build, records the fixed commit and working-tree state, and verifies the browser path before launching paid browser workers. For a static web preview build with `VITE_BASE=/ npm run build`; the default relative base is intended also for Electron and is not a reliable nested web-route preflight. Alternatively use the documented dev server, generating before all browser sessions and keeping sources fixed afterwards.

In an owned preflight tab, verify root render, Demo entry, in-app navigation to an assigned editing page, application Reload, and a fresh snapshot/value readback. On a separate public-route tab verify a nested guide URL with its expected distinct H1 and active route. Save one screenshot to a real local image file and compare its route/language/theme with a fresh DOM observation. HTTP 200, runtime `ready`, successful goto, and screenshot capture alone do not prove usable UI. Fix coordinator-owned server configuration before exploration starts; never rebuild while workers are observing the app.

If preflight fails, perform the guide's bounded environment recovery before fan-out. Do not start three workers against an unverified browser setup. A global tool failure may block the run; a page/capability-specific failure should leave independent reachable batches eligible. Keep browser/environment failures separate from product candidates.

## Review while the assignment is active

1. Worker writes evidence after each charter, then sends a progress checkpoint after the first charter using the live orchestration preamble. Coordinator reads the report/checklist immediately, including baseline, distinct variation, exact controls/values, and restore readback. Correct omissions while the Dispatch remains active; this is not a new post-settlement follow-up allowance.
2. Worker continues assigned supported work until its checklist is ready for review. Elapsed time is a planning estimate, not permission to omit required checks. If a real budget/deadline or tool limitation prevents completion, report that concrete constraint, remaining operations, and residual values. Do not claim an invented time limit or mark unexecuted work succeeded.
3. Before `worker_done`, worker uses the preamble's blocking ask/reply mechanism to request coordinator review of the report and checklist. Coordinator checks evidence files and the gate below, then replies either with specific missing observations within the existing Task or acceptance. An ask timeout is not approval; resume the same ask per the orchestration contract. With an unresolved blocker, coordinator can accept failed settlement and preserve the blocked checklist.
4. Only after that reply does worker send `worker_done` once with the appropriate outcome, then idle. Never emit a second settlement or keep working under settled IDs. Save raw logs, snapshots, and images before settlement; do not depend on transcript recovery after terminal closure.

This handshake must not deadlock: the coordinator services questions/progress throughout the wave, includes `status` as well as `question`, `escalation`, and `worker_done` in inbox wait filters, replies to every review request, and respects orchestration liveness/recovery rules. Review progress before acknowledging its Delivery. A worker's unexpected early settlement still settles its lifecycle; reject its coverage, not the settlement protocol. Use only the single authorized narrow repair if necessary. Continue the remaining preplanned batches through fresh Dispatches, reusing proven idle terminals where supported.

## Coverage checklist gate

Before dispatch, coordinator creates one JSON checklist per batch in the temporary directory. Do not let workers remove mandatory rows, change `required` to false, or turn omitted tests into capability exclusions. Include a row for every mandatory baseline/variation, each persistence stage (including restored application Reload/readback), required theme/state evidence, and initial/final language/theme/editor mode. Optional combinations use `required: false`. Coordinator reviews changes against the original plan.

```json
{
  "batch": "keymap",
  "checks": [
    {
      "id": "binding-restored-reload",
      "required": true,
      "specIds": ["KM-R02", "SESSION-012"],
      "status": "pending",
      "control": "",
      "observed": "",
      "evidence": []
    }
  ]
}
```

Worker fills `status`, exact `control`, `observed`, and `evidence` paths relative to the checklist file. Statuses are `pending`, `pass`, `product-candidate`, `spec-gap`, `blocked`, `not-run`. For blocked/not-run add `reason`; `spec-gap` describes an actual ambiguous/missing contract, not an unknown prefix or omitted UI operation. Evidence must be a nonempty file (raw action/readback log, snapshot, screenshot, etc.). A filename or generated checker result is not itself proof of a UI action.

Run the gate from the checkout root:

```sh
node .agents/skills/exploratory-ui-test/scripts/check-coverage.mjs /absolute/tmp/batch-coverage.json
```

Exit 0 means required rows have structurally reviewable observations, including observed product candidates/spec gaps; it is **not a product pass**. Exit 1 is invalid structure/IDs/evidence, exit 2 is missing required execution, exit 3 is required blocked coverage. The gate reads actual IDs from `docs/spec/pages` and `modules`. It cannot verify observation truth, checklist completeness, image/DOM agreement, or whether a caller chose the right ID: coordinator must review those separately. A required blocked row prevents a complete-coverage claim even though failed settlement may be appropriate. Optional exclusions stay visible.

Before closing a terminal, retain its checklist, report, raw action/readback logs, and images. Review screenshot language/theme against fresh rendered values and explicitly resolve contradictions; a claim that base64 cannot be saved locally is not a tool blocker. The [Orca guide](../../../../docs/spec/browser-tools/orca.md) covers decoding image results and custom-terminal ownership.

## Completion and repair boundary

Inventory every planned batch at completion. Accept fully executed representative coverage separately from product pass, product candidates, actual specification gaps, and excluded hardware/service combinations. No mandatory supported `pending`/`not-run` row may disappear into a generic remaining-conditions paragraph.

Use at most one post-settlement repair Dispatch for a narrowly identified evidence gap across the run unless the user authorizes more. Do not spend it on repeating a successful baseline, adding several omitted pages, or repairing every worker in parallel. First-charter and pre-settlement reviews exist to prevent that need. If the authorized repair cannot resolve the gap, retain a truthful blocked/incomplete outcome with precise next conditions; never hide failures to satisfy a completion target.

For scheduled runs, use the [automation prompt](automation-prompt.md) as the maintained prompt source when updating the existing Orca automation. Preserve its schedule, enabled state, model settings, and workspace placement unless the user requests changes. Do not launch an extra run to validate a prompt edit.
