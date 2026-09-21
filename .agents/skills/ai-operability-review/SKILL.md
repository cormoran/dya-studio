---
name: ai-operability-review
description: Review DYA Studio pages for AI operability through actual browser tasks, distinguish product friction from tool limitations, and produce evidence-backed improvement proposals. Use for requested AI-readiness or agent-usability audits, not ordinary regression testing.
---

# AI operability review

Use the [specification sitemap](../../../docs/spec/README.md) to inventory assigned entry points, including standalone routes and capability-gated tools. Read the assigned page/module specs and [exploration guide](../../../docs/spec/EXPLORATORY_TESTING.md). Use `exploratory-ui-test` for isolation and evidence discipline; this skill adds an operability lens rather than requiring its entire functional regression suite.

## Review through tasks

Start with a coordinator-operated editing-page pilot before delegating a new whole-app audit. Complete one representative edit, applicable save, application readback, restoration, and restoration readback. Explore at least one cancellation/navigation variant. Record what required extra inference or observation, then use it to calibrate worker briefs and model choices.

For each assigned page, assess:

- **Discovery and identity:** Can an agent find the entry and uniquely identify the device, layer, row, direction, setting, and current target from names and semantic grouping? Repeated labels alone are not defects if a stable accessible group resolves them.
- **State and feedback:** Can it read selected/expanded/disabled states, draft versus applied values, pending work, success, failure, and unsupported conditions? Inspect the actual accessibility/DOM attributes before blaming the app for a snapshot omission.
- **Action semantics and recovery:** Do names communicate immediate writes, save boundaries, close/cancel behavior, and destructive scope? Can it cancel, retry, reload, and restore without guessing?
- **Efficiency:** Can ordinary tasks use semantic controls without coordinates, source-code knowledge, large repeated snapshots, or remembering hidden context? Measure concrete extra steps; do not invent a numeric usability score.
- **Alternative interfaces:** Where a structured agent interface already exists, inspect its documented scope and contracts. UI success does not verify that interface; its absence alone is not a defect. Do not introduce a new API as the automatic answer to poor labels.

Perform a representative task and one relevant variant per page. For editing pages, read back the changed value through the application's Refresh/Reload or documented equivalent before restoration. For informational pages, use real navigation/search/expand controls and verify the destination or resulting content. Directly opening a route proves rendering, not that its incoming links work. Related documentation routes may share one exercised navigation variant, but enumerate each route's actual observations. Mobile exploration is optional unless assigned; do not let it displace a required desktop task.

Record unreachable capabilities and external-auth flows explicitly; do not operate hardware or external accounts without task authorization. An unavailable page can still receive a targeted source-only review, but mark its proposals as unverified in the browser. Do not turn a missing test assertion or an ambiguous tool timeout into a product improvement issue.

For synthetic callback errors, record which guard actually rendered the result: an unconfigured OAuth build can stop before provider-error handling. An icon-only button with `title` is not automatically unnamed; check its computed accessible name before proposing an attribute-only fix.

Browse first using UI/specifications. Targeted read-only DOM observation may inspect names, roles, values, grouping, and state. Do not write DOM/React/storage to bypass the UI. Afterwards inspect the relevant source to confirm a finding and its shared consumers. Keep UI observations, source facts, proposals, tool errors, and untested conditions separate.

DYA Studio retains visited tab panels. Scope DOM counts and label checks to the active visible panel (and its visible portal dialogs); a document-wide selector can include hidden controls from another page. In forward testing, a ninth apparent Trackball switch belonged to the hidden Macro & Combo pane. Verify source symbols and control counts before publishing, and require meaningful evidence rather than a worker's blanket pass.

## Pilot lessons to carry forward

- Keymap position names distinguish identical bindings. Preserve this strength; check that opening an editor retains the same layer/position context. The preview's zero-based position and floating toolbar's one-based count require explicit mapping.
- Orca snapshots can omit `aria-pressed` even when the DOM exposes it correctly. In the Keymap pilot, layer buttons and Close on select had valid attributes. This is tool friction, not evidence for adding attributes already present.
- A modal's Close/Escape can apply a draft while floating Close/Escape discards unfinished edits. Compare observable effects with the accessible action name and available explanation. Spec compliance can still leave a usability improvement.
- Repeated encoder Tap time inputs need sensor/layer context, and binding buttons need direction context. Compare full-tree grouping with the interactive control names before proposing labels.
- A closed editor or cleared pending indicator does not prove persistence. Keymap Save and encoder writes have different boundaries.
- Use the actual localized reread control in reports (for example, Macro & Combo `更新`, Trackball `プロセッサーを再読み込み`). For write-through fields, wait beyond the documented debounce and use that control; do not look for another section's Save.
- Record all affected device/source values before editing. Restoring the central timeout can overwrite different peripheral values; fresh Demo reconnection restores the simulation defaults but is not proof of restoring a physical device.

## Delegation and model selection

Use the user's available models and preferences. The following starting choices are judgments from the Keymap pilot's ambiguity and source/tool triangulation, **not a benchmark of relative model quality or cost**:

| Work                                                                           | Starting model / effort   | Reason                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------ |
| Editing pages with multiple targets, shared selectors, or mixed save semantics | `gpt-5.6-terra` / `high`  | Needs causal reasoning about target identity, asynchronous writes, recovery, and source evidence |
| Informational pages and bounded read-only diagnosis                            | `gpt-5.6-luna` / `medium` | Mostly navigation and naming; medium leaves room to distinguish tooling gaps from product issues |
| Adjudication                                                                   | Coordinator first         | Escalate a narrowly specified unresolved question only when existing evidence is insufficient    |

Give an editing worker 1–2 pages per dispatch. Group related informational routes, but enumerate every route and require individual coverage rows. Run at most 2–3 workers concurrently, each on a coordinator-provided separate origin and dedicated browser page. No worker redelegation or duplicate successful baseline runs. Follow up once with the exact missing evidence, then reassess the cause; higher reasoning effort does not fix runtime errors.

In Orca, read `orca-cli` and `orchestration`, use outside-sandbox CLI calls when required by the environment, and launch every Codex worker with `--profile orca`. Verify the effective model/effort from the launch receipt or startup screen. If worker-start cannot express the profile, use the documented custom-argv terminal path and attach the task with `worker-start --terminal`; do not silently omit the profile. A reused terminal can remain externally owned: inspect the receipt rather than assuming release will close it. Keep a page-to-worker inventory, settle every dispatch, and follow the orchestration guide for release or ownership transfer and any caller-owned cleanup.

Worker brief:

```text
Use .agents/skills/ai-operability-review/SKILL.md.
Target: <enumerated pages/routes/specs>; URL: <isolated running origin>.
Result: <exclusive temporary report path>; review only, no application edits,
commits, GitHub writes, hardware/account operations, or redelegation.
Record environment and actual model/effort. Use your own browser page ID.
For each page: representative task + variant; applicable edit/save/readback/
restoration/readback; concrete target names and values, extra inference needed,
positive affordances, improvement candidates, and blocked/not-run conditions.
Inspect source only after UI evidence; distinguish DOM/tool omissions.
Finish with exact remaining changes and skill ambiguities encountered.
```

## Findings and delivery

Each proposal needs a reproduction from an observed state, current versus proposed behavior, concrete agent impact, evidence class, related spec IDs/source symbols, affected consumers, priority rationale, and testable acceptance criteria. Do not call a proposal an approved requirement or label an unexecuted failure path reproduced.

Prioritize wrong-target writes and misleading apply/save/cancel feedback ahead of extra navigation or verbosity. Merge findings with one shared root cause; avoid one issue per duplicate control. List useful existing affordances as well as problems.

Keep raw snapshots and trial reports in temporary files. When issue creation is authorized, check existing issues, create one parent with the complete coverage/limitations matrix, and split children by independently implementable root cause when the findings are numerous. Use actual GitHub sub-issue relationships where supported, with reciprocal links as a documented fallback. Do not close the improvement parent merely because the review skill is merged. Publish a skill PR only when authorized by the task/repository delivery instructions, then follow their CI requirements.

Validate skill metadata and links, and forward-test the instructions with the assigned workers. Improve only guidance that their observed execution shows is missing or misleading; do not accumulate raw audit logs in the skill.
