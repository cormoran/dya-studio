---
name: frontend-performance
description: Measure and improve DYA Studio frontend responsiveness, loading cost, and resource use. Use for performance audits or optimizations, not ordinary UI regression or backend tuning.
---

# Frontend performance

Default to analysis; implement only when the task authorizes changes. “No justified optimization” is a valid result.

1. Read `docs/spec/README.md`, `AUTHORING.md`, target specs, and for browser work `EXPLORATORY_TESTING.md` and the tool guide. Check actual build/compiler configuration and dependency versions before framework advice.
2. Choose one page and a complete journey. Separate initial delivery, first usable UI, full readiness, immediate feedback, device acknowledgement, and persistence. Read [measurement methods](references/measurement.md); for Keymap read its [investigation map](references/keymap.md).
3. Record commit/diff, build mode, URL, browser/hardware/viewport, foreground state, transport/capabilities, data size, cache and instrumentation. Build once before measurement; freeze sources during the session. Use production preview for baseline; dev/HMR/StrictMode only for diagnosis.
4. Trace the exact handler → hook → state/RPC path, including awaited callees, then test falsifiable hypotheses. Source complexity, render counts, or bundle warnings alone do not prove user-visible delay. Keep frontend CPU/paint, RPC queue/wire, and flash wait separate.
5. Complete the journey with application Reload readback and restoration of values/preferences. Collect repeated operation-specific samples, plus trace/profiling and resource evidence as relevant. Mark unavailable metrics and unexecuted conditions blocked/not-run.
6. Rank a few candidates by measured cost, frequency, confidence, and correctness risk. State source symbol, mechanism, measurement, experiment/change, and regression guard; avoid invented percentage gains.
7. If authorized to implement, change one mechanism at a time and compare equivalent conditions. Preserve persistence, errors, accessibility, freshness, and shared consumers. Run relevant tests/lint/build/spec checks; update specs for observable changes. Reject wins caused by skipped or delayed work.
8. Report evidence, limits, next action, and cleanup. Store raw traces/trial reports temporarily or in authorized CI artifacts, not HEAD.

## Delegation and recurring audits

Use the environment's orchestration skill when delegation is requested. In Orca, launch Codex with `--profile orca` and explicit model/effort, verify the launch, use dedicated pages, and obtain approved outside-sandbox CLI access. Isolated origins separate storage; serialize timed browser work and builds on a host, though workers can inspect source concurrently.

Default to `gpt-5.6-luna` / `medium` with coordinator review. Read [model selection and acceptance](references/model-selection.md) when delegating; this pilot guidance does not qualify unattended audits. Give workers a frozen build URL, route/specs, exclusive timing slot, temporary report, allowed Demo edits/restoration, and required journey/samples. Do not give expected findings. Review worker evidence, not completion labels: require complete readback/restoration, valid sample boundaries, honest resource limits, and exact source attribution. One focused source re-check can correct a misread awaited operation.

Scheduled audits are report-only by default with fixed fixture/build and comparable retained baseline; create a schedule only when requested. If runtime access fails, complete static analysis and mark measurements blocked. Escalate reproducible regressions beyond baseline variation; do not alert from incomparable conditions.

## Report

Include environment and scenario; spec IDs; initial/final values; coverage and artifacts; metric definitions/boundaries, raw samples/count, median/range, cache/transport, and missing metrics. Label each finding **measured**, **source-backed hypothesis**, or **not-run**; separate correctness from speed. For each candidate include impact, attribution, proposed test/change, risk, and verification. If changed, include comparable before/after and tests/spec impact. Disclose observer, tab, server, device/preference cleanup and remaining changes.
