---
name: hardware-exploratory-test
description: Run supervised exploratory UI tests against a physical DYA2 keyboard for real transport, flash persistence, split devices, sensors, and resource pressure. Use for requested hardware testing, not ordinary UI regression or firmware flashing.
---

# Physical DYA2 exploration

Use the real Studio UI and the DUT's existing firmware. Coordinators read [exploratory-ui-test](../exploratory-ui-test/SKILL.md), the [exploration guide](../../../docs/spec/EXPLORATORY_TESTING.md), [spec sitemap](../../../docs/spec/README.md), affected specs, [charters](references/charters.md), and the [Renode skill](../renode-exploratory-test/SKILL.md) with its harness guides. Workers need this skill, their assigned specs/charters, the exploration guide, and current browser-tool documentation. The coordinator fixes scope and checklist before dispatch.

## Authority and preflight

A physical-test request permits bounded temporary UI edits, Save/Discard, restoration, and normal devtool unlock/RPC reboot unless the caller narrows scope. Assume `zmk-module-devtool` is enabled, then verify advertised capability and actual responses. Reboot/unlock are not physical power cycling or key input. Prefer Debug Tool controls; do not replace UI edits with direct RPC writes.

Never flash, enter bootloader, factory reset, erase pairing, clear diagnostics, interrupt flash writes, or run unbounded wear tests under ordinary authorization. Physical cable, power, sensor, and key actions require a human or authorized actuator; mark absent prerequisites blocked. Never disconnect a live split cable without its safe procedure.

1. Finish generation/build before browser sessions and hold the tested app version fixed. For static preview use `VITE_BASE=/` and a dedicated origin. Record app/spec commit and dirty diff, browser/tool/version, OS, URL, language, viewport, model/effort.
2. Inventory candidates without opening arbitrary serial ports. Select DYA2 through the real USB/BLE chooser; verify device label, transport, handshake, capabilities, topology, and available firmware provenance. Unknown firmware commit stays unknown. Do not use Demo, a serial shim, or a second serial reader. A connection notice is part of the authorized test. `navigator.serial` existing or a dismissed notice does not prove connection. If DOM clicks fail to open the picker, try one native click path in the owned tab, inspect the chooser, and select only the verified DYA2. Record permission failures; do not loop or bypass them. The coordinator may switch once to an available hardware-capable browser and start a new session.
3. Verify root and nested routes, fresh snapshot, and real screenshot before a browser wave. Distinguish chooser/tool failures from product findings.
4. Record a temporary lease with DUT identity, Task/Dispatch, browserPageId/session, connection state, and baseline paths. Exactly one worker owns all DUT reads and writes at a time; other workers may inspect specs/evidence or isolated public pages. Separate tabs/origins do not isolate DUT state.
5. Before any write, fresh-read/export every affected domain, including existing drafts, saved values, globals, split sources, and original sentinels. Keymap export does not back up Macro, Combo, Trackball, Settings, Connection, or peripherals. A Macro&Combo Save can persist both domains; a settings Save can fan out to split sources; reboot can discard other drafts. Do not blindly Save/Discard user drafts. If the entire affected scope cannot be restored, perform reads only and mark mutation cases blocked. Keep private exports local.
6. Use finite waits and one coordinator-led connection recovery from fresh URL, UI, chooser, permission, port-ownership and tool observations. Do not repeatedly reboot, relaunch, or treat silence as exit. Stop DUT writes on reset loop, mismatch, unexpected HID output, unresolved timeout, or failed restoration; preserve residual state and continue independent read-only coverage where possible.

## Plan and dispatch

Default to change-focused coverage. For whole-app work, inventory every sitemap route and hardware charter, including guide routes, encoders, sharing and Debug Tool, before dispatch; use the [whole-app gate](../exploratory-ui-test/references/whole-app.md). Keep public/layout and hardware verdicts separate. Required checklist rows may have planned controls and prerequisites, but observations stay empty until executed. Workers add evidence without dropping rows; unavailable capabilities and human actions remain `blocked`/`not-run`. Review scope as well as IDs. Once execution begins, report omissions honestly.

Use sequential, bounded DUT batches: 1–2 editing pages and roughly 3–5 charters per owner. Choose available model/effort for the evidence and restoration load; verify what actually launched. A small browser worker suits ordinary controls; use a workhorse for capacity, cross-domain restoration, or transport triage. Do not parallelize DUT workers. In Orca, use `orca-cli` and `orchestration`, the current worktree, and `--profile orca` for Codex workers; load runtime guides. After terminal reuse, verify model/effort and receipt of the full current Task/Dispatch brief before lease transfer. Accepted input alone is not proof of a turn. Follow orchestration recovery rather than starting a duplicate worker after timeout. For native Chrome chooser work, read [Chrome CUA notes](references/chrome-cua.md).

Each worker brief names spec IDs, app URL/commit, DUT/transport, lease, allowed/excluded actions, domain baselines and restoration order, finite record/byte/write/Save/reboot budgets, reconnect procedure, stop conditions, checklist/evidence directory, and first-live-baseline/first-charter and pre-settlement coordinator reviews. No worker-owned server, source edit, flash, or budget expansion. At charter boundaries and before cleanup, process and acknowledge inbox deliveries; a replay can hide a newer correction. Transfer the lease only after verified restoration/disconnection or an explicit residual-state handoff.

## Observe, restore, report

Use snapshot → UI action → fresh observation. Device readback requires page Reload/Refresh and reselection where needed; a DOM snapshot alone is insufficient. Record initial and accepted counts/bytes, payload, errors and timeouts. Distinguish UI validation from firmware refusal. Keep large raw evidence local; inspect visible controls and sentinels, not hidden panels. Close Debug Tool after setup unless streaming is the selected load condition.

Save only deliberate test changes. Report RAM readback, Save response, post-save fresh read, reconnect, RPC reboot, and physical cold start as distinct stages according to each page's persistence contract, including immediate settings and split fan-out. Compare changed records, unchanged neighbours, defaults, bindings, parameters, and another domain after capacity checkpoints. A surviving name/count is not sufficient. On a mismatch, stop and review exact restoration before further writes, even if the original flash baseline was incomplete.

Restore dependent bindings before deleting their macros; restore each affected source/globals, Save as needed, fresh-read against baseline, then reboot/read restored state if the charter used reboot. Check both halves if affected. Restore browser language/theme/editor mode, initial lock state, and Debug Tool streams/window; lock an originally locked DUT after final readback and Refresh its state. Do not overwrite unrelated settings with a broad import. Failed cleanup is an explicit outcome, never hidden by reset.

Report DUT/topology/firmware provenance, lease, transport/chooser, counts/bytes, write/Save/reboot totals, diagnostics, persistence stage, residual changes, and per-operation evidence. Separate UI, firmware, transport/tool, and physical-input observations; unexplained failures are candidates, not proven root causes. Review the evidence semantically and run the canonical checker:

```sh
node .agents/skills/exploratory-ui-test/scripts/check-coverage.mjs \
  /absolute/tmp/batch-coverage.json --plan /absolute/tmp/original.json \
  --plan-sha256 <hash-recorded-before-dispatch>
```

Preserve the coordinator-owned original and its pre-dispatch hash following the [evidence protocol](../exploratory-ui-test/references/evidence-protocol.md). Exit 0 means structurally reviewable, not product pass; 1 means invalid structure/IDs/evidence or changed plan, 2 required missing/not-run, 3 required blocked. Preserve its actual output. Required not-run coverage cannot settle as success. CI or one charter never proves whole-app coverage.
