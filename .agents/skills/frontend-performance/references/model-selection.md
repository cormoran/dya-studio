# Model selection and acceptance

Default: `gpt-5.6-luna`, reasoning `medium`, with coordinator review. Use `low` only for mechanical collection from an already validated, explicit operation ledger. Do not run either unattended and treat a completion message as performance acceptance. If exact async/cache behavior or trace attribution remains unresolved after one focused correction, have the coordinator investigate; `gpt-5.6-terra` / `medium` is an optional escalation candidate, **not tested in this pilot**.

## Evidence behind the recommendation

A September 2026 Keymap pilot used the same frozen production preview at application commit `8c9ee5ca20a6f895a6daed9bb41d90148262d32f`, isolated Chrome DevTools MCP browsers, sequential timing slots, and Demo connect → edit → Save → application Reload → restore → Save → Reload. Both Luna efforts completed this functional journey. Neither passed the full performance acceptance gate:

- **Low:** initially claimed Save reloaded bindings, contrary to the exact function body; corrected after source re-review. Its runtime report mixed interaction groups across operations, so five warm-open durations could not be recovered. Explicit observer/tab cleanup was not established before its worker process closed.
- **Medium:** correctly distinguished Save's local state update from Reload, used a trace with input/processing/presentation breakdown, and added a fixed-duration idle/resource observation. However, its five reported cycle durations were tool wall-clock measurements, correctly disclaimed as not app latency; operation-specific Event Timing and async completion durations remained unmeasured. The reported longest pointerdown was not mapped to an exact control, so it cannot prove selector cost.

Medium is preferred for source correctness and broader diagnostic coverage in this small trial, not because it demonstrated a complete autonomous audit or lower total cost. There was one worker per effort, environment repair, queueing and review guidance; medium also received the revised operation-ledger instructions during its run. This is a qualitative development pilot, not a controlled model benchmark. Actual token consumption was unavailable. Do not quote elapsed time as monetary savings or claim an effort-level cost winner. Check current [official pricing](https://developers.openai.com/codex/pricing) before budget-sensitive selection.

## Applying the findings

Require a single valid operation sample before collecting the remaining repetitions: label, trigger, page-clock window, nonzero interaction ID, duration, and observed end state. Review it immediately. If the worker supplies tool elapsed time or a combined session stream instead, stop expansion and correct the collection method. Use the probe's labeled reset and derived interaction summary to reduce manual grouping errors; retain raw evidence.

Source claims need exact handler/callee verification. A trace's longest interaction needs a control/window mapping before assigning it to a component. Functional readback, immediate responsiveness, async completion and memory evidence receive separate acceptance statuses. Missing one does not invalidate the others, but does prevent declaring the whole audit passed.

For a future model comparison, freeze skill version, prompt, fixture, browser/build and metric requirements; use isolated processes and serialized timing. Record queue time, active time, retries, reviewer interventions, valid samples, cleanup and actual tokens if available. Repeat trials before making a general reliability or cost claim. Requalify a model before unattended recurring use.
