---
name: frontend-performance
description: Analyze DYA Studio frontend responsiveness, loading cost, and resource use; measure and validate targeted optimizations or recurring performance audits. Use for performance work, not ordinary functional UI testing or backend tuning.
---

# Frontend performance

Optimize user wait and resource consumption with reproducible evidence. Default to analysis; implement only when the task authorizes changes. A successful audit may conclude that no optimization is justified.

## Workflow

1. Read `docs/spec/README.md`, `AUTHORING.md`, the target page and affected module specs. For browser work also read `EXPLORATORY_TESTING.md` and the selected tool guide. Review the actual build/compiler configuration and installed dependency code before recommending framework changes.
2. Define the journey and separate initial load, first usable UI, fully loaded state, input feedback, device acknowledgement, and persistence. Choose a small target: one page and one complete read/edit/save/readback journey. Read [measurement.md](references/measurement.md) before measuring. For Keymap also read [keymap.md](references/keymap.md).
3. Record commit and working diff, production/dev/profiling build, actual URL, browser/hardware/viewport, foreground state, transport/capabilities, data size, cache state, and instrumentation. Build once before browsing; never generate/build/edit the application during a measured session. Production preview is the baseline; dev/HMR/StrictMode timings are diagnostic only.
4. Trace the relevant handler → hook → state/RPC path. Identify hypotheses, then measure the corresponding operation. Source complexity, bundle warnings, and render counts alone do not prove a user-visible bottleneck. Keep frontend CPU, browser paint, RPC queue/wire wait, and flash persistence separate. Before ranking a source-backed finding, re-read the exact function body and its awaited callees; do not infer a reload, bulk write or cache miss from a neighboring handler or generic lifecycle description.
5. Run the full successful journey, including application Reload readback and restoration of original values/preferences. Gather repeat samples for selected interactions, then investigate dominant work using a browser trace or React profiling build. Keep unsupported metrics and unexecuted conditions explicitly blocked/not-run.
6. Rank a few candidates by measured cost, user frequency, confidence, and correctness risk. Each needs a source symbol, mechanism, falsifiable measurement, proposed change, and regression guard. Do not invent an expected percentage improvement.
7. If implementing, change one mechanism at a time and compare the same scenario/environment against baseline. Preserve persistence, errors, accessibility, freshness, and shared consumers. Run relevant tests/lint/build/spec checks and update affected specs for observable changes. Reject apparent wins caused by skipped work or delayed correctness.
8. Report evidence, limits, next action, and cleanup. Raw traces/snapshots/trial reports belong in temporary storage or authorized CI artifacts, not HEAD. Keep only durable guidance in this skill.

## Delegation and recurring use

Use the environment's orchestration skill when delegation is requested. In Orca, use `codex --profile orca`, explicit model/effort, a dedicated page, and approved outside-sandbox CLI access. Confirm effective launch values. Separate origins isolate storage; do not run performance samples concurrently on the same host. Workers may inspect code concurrently, but serialize timed browser work and builds.

Use `gpt-5.6-luna` with `medium` reasoning for a bounded, coordinator-reviewed audit. This is a conservative pilot recommendation, not an unattended-audit qualification: both tested efforts missed required operation-specific latency samples. Read [model-selection.md](references/model-selection.md) before delegation for evidence, limitations and escalation. Never infer monetary cost from elapsed time; re-evaluate after material model/tool changes.

Worker brief: target route/specs; frozen build URL; exclusive measurement slot; exact skill path; owned temporary report; allowed Demo edits/restoration; no product edits/commit/PR; required complete journey plus repeated latency samples and source-backed ranked findings. Do not give the evaluator the expected findings.

Review acceptance independently of worker completion labels: complete journey and restoration, valid sample boundaries/counts, at least one resource observation with honest limits, exact source attribution, and no fabricated cost/speedup/persistence claims. An honest blocked report is useful but does not pass the runtime evaluation. If a report invents an awaited operation, request one focused source re-check before accepting its ranking. Separate queue wait and environment repair from model execution cost.

For scheduled audits, default to report-only with a fixed fixture/build mode and comparable retained baseline. If hardware/tool access is unavailable, complete static analysis but mark runtime coverage blocked. Do not provision an actual schedule unless requested. Escalate reproducible regression outside baseline variability; do not file repeated alerts from incomparable environments.

## Report contract

- Environment and scenario, initial/final values, spec IDs, coverage and artifact paths.
- Metric definition and boundaries, sample count/raw samples, median and range, cache/transport conditions; limitations and missing metrics.
- Findings labeled **measured**, **source-backed hypothesis**, or **not-run**. Separate UI correctness results from performance evidence.
- For each candidate: user impact, source/symbol, attribution, proposed experiment/fix, risk and verification.
- If changed: before/after under equivalent conditions, tests, spec impact, and remaining uncertainty.
- Cleanup including device state, preferences, observers, tabs and owned servers; remaining changes disclosed.
