---
name: exploratory-ui-test
description: Run specification-driven DYA Studio browser exploration with AI subagents for requested focused regression checks, whole-app exploration, or substantial UI/shared-logic risk. Skip minor and documentation-only changes.
---

# Exploratory UI testing

Read the [exploration guide](../../../docs/spec/EXPLORATORY_TESTING.md) for UI actions, evidence, restoration, and reporting; use the [sitemap](../../../docs/spec/README.md) and affected specs to select targets.

## Scope

- **Change-focused (default):** Cover changed flows, affected pages, shared consumers, save/cancel boundaries, and nearby regression risks.
- **Whole-app:** Inventory every sitemap entry and representative flows/variations, including unreachable and untested items. Read [whole-app planning and acceptance](references/whole-app.md), plan all batches before dispatch, and run its coverage gate. A concurrent first wave is not the full run.
- Honor user scope, budget, and model choices. Proactively run bounded testing only for substantial UI, persistence, connection, or shared-editor changes with cross-page risk; explain targets first. Do not launch for size alone or minor/docs-only edits.

Include the guide's all-theme checks on assigned pages and shared consumers. For visual verdicts collect screenshots and fresh rendered-style observations after fonts load, including overlays, relevant control states, and restoration after Pop. Review a theme × page/component × state matrix; mark untested cells. This does not require repeated device writes per theme.

## Workers and review

Default browser worker: `gpt-5.6-luna` / `low`, starting with one worker for focused testing. Use `gpt-5.6-terra` / `high` only for unresolved spec/source reasoning. Verify availability and actual model/effort; report unavailable defaults instead of silently substituting. Narrow a struggling charter before raising effort, and do not spend higher effort on environment failures.

For whole-app work, run small waves of 2–3 within environment limits, then finish the preplanned batches. Assign 1–2 editing pages and about three achievable charters per worker; reserve time for theme evidence, restoration, and review. Do not invent a single-wave or three-minute stopping rule.

After the first charter, review progress while the Dispatch remains active and correct missing evidence in-task. Before `worker_done`, review the report, checklist, mandatory actions, and restoration. Permit at most one narrow post-settlement evidence repair across the run unless the user says otherwise. Planned batches are separate; omitted settled work cannot be relabeled as new scope. Avoid repeat successful baselines and indefinite retries.

Give each worker the guide's brief: mode, routes/spec IDs, isolated running URL, required observations, and temporary report path. Follow environment-specific browser/delegation instructions and version stability. Use the `renode-exploratory-test` skill for needed firmware/RPC/device-state behavior beyond Demo; use [hardware-exploratory-test](../hardware-exploratory-test/SKILL.md) for explicitly requested physical DYA2 work. Neither is needed for layout-only checks.

Accept findings only with actual actions/readback against spec IDs. Compare exposed parameters as well as labels during restoration; disclose normalized values. Separate product candidates, spec gaps, blocked, and not-run cases. A worker's `pass` or `worker_done` is not evidence acceptance; required unexecuted or blocked checks keep coverage incomplete, while independent reachable batches can continue. Testing permission does not authorize hardware/external writes or defect fixes. Keep raw logs out of commits; summarize results in the PR/report and retain durable corrections in specs/guides only.

## Findings and finalization

When GitHub reporting is authorized (including the scheduled automation), follow [issue reporting](references/issue-reporting.md): the coordinator searches for duplicates, creates an issue or comments on the matching issue, and verifies the published result. GitHub reporting authorization is separate from hardware/cloud testing permission. Workers return evidence and never publish independently.

Publish reviewed findings as they become actionable; do not wait for complete whole-app coverage. Coverage gate exits 1–3, failed workers, or browser outages must still lead to evidence reconciliation, issue reporting, owned-resource cleanup, and a final report. Capture gate status instead of chaining finalization behind a success-only shell command. Preserve incomplete coverage; do not turn an execution failure into a product defect or omit it because no product defect was confirmed.
