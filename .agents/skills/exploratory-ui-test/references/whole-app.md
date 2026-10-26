# Whole-app planning and acceptance

The [exploration guide](../../../../docs/spec/EXPLORATORY_TESTING.md) governs UI evidence and restoration. “Complete” means planned representative checks were executed and reviewed, not every state combination or real-device behavior.

## Plan and preflight

Before dispatch, make a temporary inventory of every sitemap entry, all 11 Developer Guide routes, rotary encoders, Keymap sharing, and capability-gated Debug Tool. Record batch/owner, defined spec IDs, representative baseline and distinct variant, theme/component states, persistence/restoration, and capability exclusions. A missing test is not a spec gap.

Plan all batches, not just the first wave; honor the worker cap and user budget. A practical split is Keymap/sensors, sharing/public routes, Macro & Combo, Trackball, Settings/Connection, and Subsystems/Troubleshooting. Split overloaded batches; record each batch's 3–5 bounded charters before launch. Give low-effort workers 1–2 editing pages, assigned specs, and explicit read-only routes. Mark required versus optional observations in a temporary checklist.

Coordinator: generate/build once, record fixed commit and working diff, and keep sources unchanged during browser work. For a static preview use `VITE_BASE=/ npm run build`; the default relative base also serves Electron and can break nested web routes. A documented dev server is an alternative. In an owned tab, verify root, Demo, in-app editing navigation, application Reload, and fresh value readback. In another tab, verify a deep guide route's distinct H1 and active route. Save a local screenshot and reconcile route/language/theme with fresh DOM. HTTP 200, `ready`, `goto`, and screenshot capture alone are insufficient. Apply bounded environment recovery before fan-out; do not rebuild mid-session. Global tool failure may block the run, while page-specific failure need not stop other batches.

## Live review and settlement

Worker saves evidence after each charter and sends a checkpoint after the first. Coordinator reviews baseline, distinct variant, exact controls/values, and restoration readback while the Dispatch is active; give specific corrections then. Time estimates do not excuse missing mandatory actions. A real budget/tool blocker requires remaining operations and residual values in the report.

Before `worker_done`, worker uses the current orchestration preamble's blocking ask/reply to request report/checklist review. Coordinator checks artifacts and gate, then replies acceptance, specific missing work, or permission to settle failed with a concrete blocker. Timeout is not approval. Service `status`, `question`, `escalation`, and `worker_done` during the wave and review progress before acknowledging Delivery. An early `worker_done` settles lifecycle but does not establish coverage. Keep raw evidence before terminal closure; continue remaining preplanned batches in fresh Dispatches.

## Checklist gate

Coordinator creates a JSON checklist per batch before dispatch, with mandatory rows for baseline, distinct variant, each edit/save/readback/restoration stage, themes/states, and initial/final language/theme/editor mode. Optional combinations use `required: false`. Preserve `original.json` and its pre-dispatch SHA-256 in coordinator records, then give the worker a result copy. Follow the [evidence protocol](evidence-protocol.md) for immutable contracts, receipt capture, mutation guards and review replies. Workers fill result fields; no original row may vanish or become an exclusion.

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

Statuses: `pending`, `pass`, `product-candidate`, `spec-gap`, `blocked`, `not-run`. Fill exact `control`, `observed`, and nonempty evidence file paths relative to the checklist; add `reason` for blocked/not-run. `spec-gap` means an ambiguous/missing contract, not an omitted action or unknown prefix. An evidence filename or checker result alone does not prove UI behavior.

Run from the checkout root:

```sh
node .agents/skills/exploratory-ui-test/scripts/check-coverage.mjs \
  /absolute/tmp/batch-coverage.json --plan /absolute/tmp/original.json \
  --plan-sha256 <hash-recorded-before-dispatch>
```

Exit 0: structurally reviewable required observations, including product candidates/spec gaps; **not** product pass. Exit 1: invalid structure/IDs/evidence or changed original plan/row contracts; exit 2: required execution missing; exit 3: required blocked. The checker reads defined IDs under `docs/spec/pages` and `modules`, and compares every row to the pinned plan. It cannot verify observation truth, completeness of the initial plan, screenshot/DOM agreement, or correct ID selection; coordinator must. Retain checklist, report, raw action/readback logs and images, and resolve screenshot versus DOM language/theme contradictions. See the [Orca guide](../../../../docs/spec/browser-tools/orca.md) for image saving and terminal ownership.

## Completion

Reconcile every planned batch and report executed coverage, product findings, actual spec gaps, blocked/not-run rows, and excluded hardware/service combinations separately. Required `pending`/`not-run`/`blocked` prevents complete coverage. Allow at most one narrow post-settlement repair Dispatch per run unless authorized otherwise; do not use it to repeat passes or cover several omitted pages. If it fails, preserve the incomplete result.

Coverage failure does not skip delivery. When authorized, follow [issue reporting](issue-reporting.md) for every actionable finding, including recurring workflow/restoration failures. Finish GitHub disposition/readback and cleanup even if the gate is nonzero or the browser is unavailable. Before closing an editing tab, verify restoration or record exact residual values and the blocker; tab closure or a fresh Demo is not restoration.

For scheduled work, use the maintained [automation prompt](automation-prompt.md). Preserve schedule, enabled state, model settings, and workspace placement unless requested; do not launch an extra run merely to test a prompt edit.
