---
name: ai-operability-review
description: Review DYA Studio pages through real browser tasks for agent usability and evidence-backed improvements. Use for requested AI operability audits, not ordinary regression testing.
---

# AI operability review

Read the [sitemap](../../../docs/spec/README.md), assigned specs, and [exploration guide](../../../docs/spec/EXPLORATORY_TESTING.md). Follow `exploratory-ui-test` isolation, evidence, and restoration rules without running its full regression suite.

## Observe real tasks

For a new whole-app audit, first complete a coordinator-run editing pilot: edit, save if applicable, application readback, restore, restoration readback, and one cancellation/navigation variant. Use its actual difficulties to scope workers.

For each assigned page, perform a representative task and a distinct variant. Check:

- **Target identity:** Can names and groups distinguish device, layer, row, direction, setting, and current selection? Inspect computed accessible names and active visible panels; hidden retained tabs can inflate document-wide counts.
- **State and recovery:** Can an agent read selection, draft/applied values, pending work, success/failure, and unsupported states, then cancel, retry, reload, and restore without guessing? Compare modal versus floating Close/Escape behavior and write-through versus Save boundaries.
- **Cost of operation:** Record concrete extra steps, source knowledge, coordinates, or repeated snapshots needed. Do not invent a usability score.
- **Visuals:** Apply the guide's all-theme checks to assigned pages and overlays. Capture screenshots and fresh rendered styles after fonts settle, including focus/selection/disabled states and restoration after Pop. Report the theme × page/component × state matrix; separate design suggestions from spec violations.
- **Other interfaces:** Inspect existing structured interfaces when relevant. UI success does not test them, and absence alone is not a defect.

For edits, read the changed value through the application's Refresh/Reload before and after restoration; first record every affected source/device value. For informational pages, exercise a real link, search, or expansion and verify the resulting route/content. Direct URL rendering does not verify navigation. Enumerate observations for each route even when related routes share a variant. Mark capability-gated and external-auth flows blocked when unavailable; do not operate hardware/accounts without authorization.

Browse before reading source. Read-only DOM inspection may clarify roles, names, state, and grouping; never write DOM, React, or storage to bypass controls. Then inspect exact source and shared consumers. Separate UI observations, source facts, proposals, tool errors, and untested conditions. A missing assertion or tool timeout is not a product defect. Check the DOM before blaming the app for snapshot omissions such as `aria-pressed`; a `title` may already name an icon button. Synthetic OAuth errors may stop at build configuration before callback handling.

## Delegation

Use available models and user preferences. Starting choices: `gpt-5.6-terra` / `high` for complex editing pages; `gpt-5.6-luna` / `medium` for bounded informational routes. These are judgments, not a model benchmark. Escalate unresolved adjudication to the coordinator. In Orca, read `orca-cli` and `orchestration`, launch Codex workers with `--profile orca`, and verify the effective model/effort. If `worker-start` cannot set the profile, use the documented custom-argv terminal route and attach it; inspect ownership before release.

Give each editing worker 1–2 pages, separate origins and dedicated browser pages; run at most 2–3 concurrently. Enumerate informational routes, keep a page-to-worker inventory, settle every dispatch, and follow up once with exact missing evidence. Runtime failures do not justify increasing reasoning effort. Workers must not redelegate.

Worker brief: assigned routes/specs and isolated URL; exclusive temporary report; representative task/variant; exact targets and initial/changed/restored values; applicable save/Refresh/readback; all-theme matrix; extra inference, useful affordances, candidates, blocked/not-run; environment and effective model/effort. Review only: no app edits, commits, GitHub writes, hardware/account operations. Require UI evidence before source corroboration.

## Findings

Each proposal needs observed reproduction, current and proposed behavior, agent impact, evidence class, spec IDs/source symbols and shared consumers, priority rationale, and testable acceptance criteria. Prioritize wrong-target writes and misleading save/cancel feedback. Group duplicate symptoms by root cause and include existing strengths. Never call untested paths reproduced or proposals approved requirements.

Keep raw reports in temporary storage. When issue creation is authorized, check existing issues; use a parent coverage/limitations report and independently implementable children with sub-issue links where supported. Follow repository PR/CI rules only when publication is authorized. For skill revisions, validate metadata and links and run a bounded forward test when warranted; change guidance only for observed ambiguity.
