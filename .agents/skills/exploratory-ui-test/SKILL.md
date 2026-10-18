---
name: exploratory-ui-test
description: Run specification-driven browser exploration of DYA Studio with AI subagents. Use for requested change-focused regression checks, whole-app exploration, or substantial UI/shared-logic changes with high regression risk. Do not launch for unrequested minor or documentation-only changes.
---

# Exploratory UI Testing

This skill guides the coordinator's scope and model decisions. Read the [exploration guide](../../../docs/spec/EXPLORATORY_TESTING.md) for operations, evidence, restoration, and reporting, and the [specification sitemap](../../../docs/spec/README.md) to select targets. Do not duplicate those procedures here.

## Choose the scope

- **Change-focused testing:** Select pages affected by the diff and consumers of changed shared modules. Focus on changed flows, adjacent features, and regression risks such as saving and cancellation. Default to this mode when a change-validation request does not specify coverage.
- **Whole-app exploration:** When the user requests broad or comprehensive testing, inventory every entry point in the sitemap and assign representative flows, variations, and shared features. This does not guarantee every combination of states. Track unreachable and untested entry points too.
- Before whole-app dispatch, read [whole-app planning and acceptance](references/whole-app.md). Plan all batches before starting; the first concurrent wave is not the entire run. Use its coverage gate before accepting completion.
- Honor explicit scope, budget, and model choices. Proactively launch bounded subagent testing when substantial UI changes or changes to persistence, connections, or shared editors create cross-page regression risk. First explain the reason and limited targets. Do not launch merely because a diff is large, for documentation-only changes, or after every small edit.

## Theme consistency

Include the exploration guide's [theme consistency checks](../../../docs/spec/EXPLORATORY_TESTING.md#テーマの一貫性確認) in every assigned UI charter. Exercise all available themes on affected pages/shared consumers, including opened overlays, state colors, typography after async loading, and font/style restoration when leaving Pop. Assign explicit theme coverage to workers and review the theme × page/component × state evidence matrix; screenshots and fresh rendered-style observations are required for visual verdicts. Keep unexecuted themes/states visible rather than substituting a source-only or single-theme pass. This adds a visual check within the assigned scope, not repeated device writes in every theme.

## Models and cost

| Role                                                               | Default                  | When to use                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Browser exploration                                                | `gpt-5.6-luna` / `low`   | Provide specifications and the guide; have the worker report actions and expected/observed behavior without reading application code |
| Source investigation, specification gaps, difficult verdict review | `gpt-5.6-terra` / `high` | Only when the coordinator cannot resolve a specification gap or needs help tracing persistence/error contracts across consumers      |

These are repository defaults, not instructions to launch both models every time. Verify availability and the model/effort actually launched. If unavailable, report the limitation rather than silently substituting another model. If luna struggles, first narrow the follow-up; increase effort only as needed if reasoning remains insufficient. Do not spend higher effort on environment failures.

Start change-focused testing with one luna worker. For whole-app exploration, use a small concurrent wave (typically 2–3, within environment limits), then execute the remaining preplanned batches. Assign editing pages in short batches of 1–2 pages per worker and avoid overlapping exploration. Prefer three achievable charters over five unrelated flows. Budget for theme evidence, restoration, and review before choosing batch size. Do not invent a three-minute or single-wave stopping limit.

Review progress after the first charter while the worker's Dispatch is still active. Missing observations belong to that assignment; correct them through in-task feedback before settlement. After settlement, allow one narrowly scoped evidence-repair follow-up for the run unless the user specifies otherwise. Planned, previously unstarted batches are separate from repair, but never relabel omitted work from a settled assignment as a new batch to evade this limit. Do not repeatedly rerun successful cases, redelegate failures, or retry indefinitely.

## Execute and review

- Fill the guide's worker brief with the mode, assigned pages/specifications, running URL, mandatory observations, and a temporary report path. Follow the guide for isolation, version stability, and cleanup.
- When a charter needs real firmware capability, RPC, or device-state readback that Demo cannot provide, also load the repository `renode-exploratory-test` skill and report its WebSerial-shim boundary. Do not use Renode merely for layout-only coverage.
- For explicitly requested physical DYA2 testing, use [hardware-exploratory-test](../hardware-exploratory-test/SKILL.md). It adds real transport, capacity/resource pressure, flash/reboot and split/sensor charters with exclusive device ownership and per-domain restoration.
- Select browser/delegation tools according to the user's choices and available environment. Both coordinator and workers must read the guide's environment-specific instructions and follow tool-specific permissions and target selection. Do not assume a particular tool exists.
- Review reports against specification IDs and evidence of actual actions/readback. A worker's “pass” alone is insufficient. Distinguish product candidates, specification gaps, blocked cases, and unexecuted cases; for whole-app exploration, also check the assignment inventory for omissions.
- Workers request review before `worker_done`. Accept success only after mandatory checks and restoration have evidence; an honest report with mandatory `not-run` checks is incomplete. Tool blockers can end an affected charter after bounded recovery, but do not automatically cancel independent planned batches. Preserve truthful blocked/partial outcomes when completion is impossible; never weaken coverage to produce a success label.
- Permission to run tests does not expand authority to write to hardware/external services or fix defects. Normally keep raw logs out of commits, summarize results in the PR/completion report, and integrate only durable findings into specifications/guides.
