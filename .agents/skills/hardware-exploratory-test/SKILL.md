---
name: hardware-exploratory-test
description: Run supervised exploratory UI tests against a physical DYA2 keyboard, focusing on capacity, real transport, flash persistence, split devices, sensors, and firmware resource pressure that Demo and Renode cannot establish. Use for requested hardware testing, not ordinary UI regression or firmware flashing.
---

# Physical DYA2 exploratory UI testing

Use the real Studio UI and the connected keyboard's existing firmware.

- **Coordinator:** before choosing coverage, read
  [exploratory-ui-test](../exploratory-ui-test/SKILL.md), the
  [exploration guide](../../../docs/spec/EXPLORATORY_TESTING.md), specification
  [sitemap](../../../docs/spec/README.md), affected specs and
  [hardware charters](references/charters.md). Read the
  [Renode skill](../renode-exploratory-test/SKILL.md) and its harness/firmware
  guides to select actual gaps rather than repeat emulated coverage.
- **Assigned browser worker:** read the safety/execution rules here, exploration
  guide, assigned page/module specs, assigned charter sections and current tool
  documentation. The coordinator supplies the fixed scope, risk selection and
  checklist; do not reload unrelated Renode setup recipes or the entire app's
  specifications unless investigating a concrete verdict gap. Preserve context
  for actual observations and restoration.

This skill adds hardware risk selection and exclusive device ownership; normal
evidence, theme and restoration rules still apply.

## Scope and authority

A request to test the physical DYA2 authorizes bounded temporary UI edits,
Save/Discard, restoration, and normal devtool RPC unlock/reboot on that DUT.
Honor explicit read-only scopes, budgets and other caller restrictions.
Assume `zmk-module-devtool` is enabled; verify its advertised capability and
actual responses. Do not ask again for these already authorized operations.
Reboot/unlock are control-plane setup, not proof of physical key unlock or a
power cycle. Prefer Debug Tool controls; do not invent an RPC endpoint or use
direct RPC writes to substitute for UI editing.

Do not flash firmware, enter bootloader, factory reset, erase pairing slots,
clear diagnostic history, interrupt a flash write, or perform unbounded flash
wear tests under ordinary test authorization. Physical cable/power/sensor/key
actions need a human or an available authorized actuator; leave their cases
blocked when absent. Never claim an RPC reboot removed power. Do not disconnect
a live split cable without the board's safe procedure.

## Preflight and recovery

1. Coordinator owns the app server and completes generation/build before browser
   sessions; keep the tested app version fixed. For static preview build with
   `VITE_BASE=/`; use a dedicated origin. Record app/spec commit and dirty diff,
   browser/tool/version, OS, URL, language, viewport, model/effort.
2. Inventory the attached candidate devices without opening arbitrary serial
   ports. Select DYA2 through the real USB/BLE chooser and verify returned device
   name, transport, capabilities, central/peripheral topology, and available
   firmware version/provenance. Unknown firmware commit stays unknown. Do not
   install a serial shim, choose Demo, or attach a second serial reader.
   A normal connection notice is part of this requested workflow; record its
   choice without adding another approval gate. `navigator.serial` existing is
   insufficient: verify a usable real chooser or an already-authorized port and
   the completed handshake. A DOM automation click can close the notice without
   opening a picker; that alone does not prove an app defect. In the owned,
   selected browser tab, use the available native app tool for the actual USB
   and Agree clicks as the one recovery, then inspect the native chooser and
   verify the device label before selecting it. Native Chrome input reached the
   real DYA2 chooser in a pilot where DOM clicks did not; do not generalize that
   observation to every browser/tool. Preserve exact errors and check permissions
   read-only; do not loop on notice acceptance or alter its checkbox as a picker
   workaround. If a browser cannot expose the picker, the coordinator may select
   an available hardware-capable browser once, document the boundary, and start
   a new session. This is environment setup, never a bypass of denied permission.
3. Verify root and nested route rendering, a fresh snapshot, and a real screenshot
   before dispatching a browser wave. Device connection can be the first worker's
   charter; record chooser limitations separately from product failures.
4. Create a device lease in the temporary run directory: DUT identity, owning
   Task/Dispatch, browserPageId/session, connection state and baseline paths.
   Exactly one worker owns all DUT operations, including diagnostic reads, at
   a time. Other workers may review specs/evidence or test isolated public pages.
   Separate browser tabs/origins do not isolate keyboard RAM/flash.
5. Before writes, capture a baseline for every affected domain through UI fresh
   reads/export and record existing dirty state. Keymap export alone is not a
   backup of macros, combos, Trackball, Settings, Connection, or peripheral values.
   Preserve existing user drafts; do not Save or Discard them blindly. If complete
   domain restoration cannot be demonstrated, limit that domain to reads and
   report the mutation cases blocked. Keep pairing data/private exports local.
   Inspect the entire persistence scope: Macro&Combo Save can save both domains,
   a custom-settings section Save can affect all split sources, and reboot can
   lose unsaved state on other pages. Capture RAM, queued drafts and known saved
   values separately. A clean selected record alone does not establish a clean
   Save/reboot scope; choose another scope or reads if that distinction cannot
   be preserved through the permitted UI.
6. Use finite waits and one coordinator-led recovery for a failed connection:
   inspect tool status, actual URL, chooser/permission state, port ownership and
   UI error, then retry once from fresh observations. Do not repeatedly reboot,
   relaunch workers, switch tools to bypass permissions, or treat silence as exit.
   Stop DUT writes on crash/reset loop, data mismatch, unexpected HID output,
   unresolved timeout, or restoration failure; preserve evidence and residual
   values. Continue independent read-only coverage when possible.

## Choose and delegate charters

Use change-focused coverage by default. Whole-app hardware testing inventories
every sitemap entry (including all guide routes, encoders, sharing, Debug Tool)
and every hardware charter before dispatch; follow the existing
[whole-app gate](../exploratory-ui-test/references/whole-app.md). Public/layout
coverage is distinct from hardware evidence. Unsupported capability and missing
human/actuator conditions remain explicit blocked/not-run rows.
The coordinator owns the pre-dispatch inventory and mandatory checklists; drafting
may be delegated, but review and fix them before device execution. Planned rows
may contain controls/expectations/prerequisites; leave observations and evidence
empty until performed. Device workers fill evidence, not remove required rows.
Check scope as well as IDs: a transport transition belongs to the DUT owner,
not a no-connection public worker. Select reachable representative variations;
record unavailable alternative content/states separately rather than making
every possible combination mandatory. Once execution starts, preserve the
approved required rows and report omissions honestly, even if planning was poor.

Use a small capable browser worker for ordinary controls (current available
`gpt-6-luna` / `medium` is a suitable default); use a workhorse such as
`gpt-6.1-sol` / `high` for capacity bookkeeping, cross-domain restoration and
firmware/transport triage. Verify availability and the model actually launched;
report unavailable defaults before choosing a supported model. Escalate reasoning
for a difficult verdict, not an inaccessible browser. Give each device owner
only 1–2 editing pages and bounded 3–5 charters. Do not launch simultaneous DUT
workers to speed up a single-keyboard run.
Keep smaller-model assignments narrow. Keymap plus file sharing, history,
connected Home and a visual matrix can overload one assignment despite sharing
a route; split that work before dispatch or use the workhorse for the combined
evidence/restoration scope. A cheap model's unsupported-tool claim or incomplete
report still requires coordinator verification against actual capabilities.

In Orca use the `orca-cli` and `orchestration` skills, current worktree, and
`--profile orca` for Codex workers. Load the runtime's guides before commands.
For explicit model/profile argv use the documented custom-terminal flow, verify
TUI readiness/model, then attach the terminal to a supervised Dispatch. Orca
commands normally require `sandbox_permissions: require_escalated`; follow
actual permission results. Pass the exact page ID on browser commands.
When an available CUA Chrome path is used for the real chooser, read the
[Chrome CUA notes](references/chrome-cua.md) for auto-reconnect, native input,
and saving actual screenshot bytes. Do not assume native-only observation is
the only available Chrome API.

Worker brief must include:

- Skill/spec paths and exact spec IDs, app URL/commit, real DUT identity and
  transport; allowed operations, excluded operations, and exclusive lease.
- Baseline/export paths for every affected source, restoration order and checks;
  authorized reboot budget and reconnect procedure. No worker-owned servers,
  source edits, flashing, or expansion of write budgets.
- Mandatory baseline/variation rows, finite data/count/byte/write bounds,
  checkpoints, timeout/stop conditions and evidence directory/checklist.
- First-charter progress and pre-settlement coordinator review via ask/reply.
  Worker reports actual values and stage-specific verdicts; required not-run
  coverage cannot settle as success. Release/transfer the lease only after
  verified restoration/disconnection or an explicit blocked residual-state handoff.
  At charter boundaries and before cleanup/closing, process and acknowledge inbox
  deliveries, then check for queued follow-ups. An old replayed delivery can hide
  a newer lease/budget correction until acknowledged. A request for corrections
  is not acceptance to settle the original assignment.

## Execute, restore, report

Use snapshot → UI action → fresh observation. Device state requires a real
page Reload/Refresh (and reselection when needed), not another DOM snapshot.
Capacity scenarios require initial count/bytes, attempted payload, actual accepted
count/bytes, errors and timeouts; timing measurements are observations rather
than invented performance SLAs. Distinguish firmware refusal from UI validation.
For large keymaps/lists, retain full raw evidence locally at checkpoints and keep
model-facing observations scoped to visible controls, changed values, counts and
sentinels. Hidden retained panels are not visual coverage. After setup unlock,
close Debug Tool for ordinary baselines unless streaming is part of the selected
load charter; compare stream-off and stream-on conditions deliberately instead
of flooding every observation with logs.

Save only deliberate test changes. Record RAM readback, flash Save response,
post-save fresh read, reconnect read, RPC reboot read, and physical cold-start
read as separate stages. Match each to the page's persistence contract, including
immediate-save settings and split RPC fan-out. Do not apply keymap Save semantics
to every domain. Verify unchanged neighbouring records and another domain at
capacity checkpoints to expose corruption rather than only counting new rows.

Restore in dependency order: remove test bindings before deleting their macros,
then restore each affected source and its globals, Save as required, fresh-read
and compare to the baseline. Reboot and read the restored saved state if reboot
was part of the charter; include both halves when their values were affected.
Restore browser language/theme/editor mode. Avoid overwriting unrelated settings
with a broad import. Failed cleanup is a test outcome, never hidden by reset.
Record initial/final Studio lock state and Debug Tool streaming/window state too.
At final cleanup restore an originally locked DUT through the authorized Lock
control and Refresh its state after all configuration readbacks. Between batches,
an explicit lease handoff may keep it unlocked; do not silently leave it unlocked
at the end of a run or close the only recovery UI before a needed readback.

Report the guide's per-operation evidence plus DUT/topology/firmware provenance,
lease ownership, transport/chooser, counts/bytes, write and reboot totals,
diagnostics before/after, stage-specific persistence and all residual changes.
Classify UI, firmware, transport/tool and physical-input observations separately;
an unexplained failure is a candidate, not a proven firmware root cause.
Run the existing coverage checker and review evidence semantically. Keep raw
logs/backups in temporary storage; summarize in the requested PR/completion
report. Never infer whole-app completion from a single successful charter or CI.

From the checkout root, the canonical checker is:

```sh
node .agents/skills/exploratory-ui-test/scripts/check-coverage.mjs /absolute/tmp/batch-coverage.json
```

Exit 0 means structurally reviewable evidence, not a product pass; 1 is invalid
structure/IDs/evidence, 2 is required missing/not-run, 3 is required blocked.
Do not replace it with a homemade gate or claim it is unavailable without
checking that exact repository path and preserving its actual failure output.
