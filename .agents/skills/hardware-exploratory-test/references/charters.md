# Hardware risk selection and bounded charters

These are test design priorities, not new product requirements. Use actual IDs
from current page/module specifications for expected results; label undocumented
firmware limits/behaviour as spec gaps. Inspect capabilities before selecting
charters and do not assume every DYA2 build has identical capacities or topology.

## What Renode already covers and what remains

Read [harness boundaries](../../../../e2e/renode/README.md) and
[DUT recipes](../../../../e2e/renode/firmware/README.md), including
[non-split overlay](../../../../e2e/renode/firmware/dya2_nonsplit.conf).

| Area                | Existing Renode evidence boundary                                                                                        | Physical target                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| RPC and data limits | Real firmware handlers, protobuf/framing and capacity logic can be exercised; large data is not inherently hardware-only | Same limits under real USB/BLE buffering, memory, logging and event load; rejected writes must leave prior data intact  |
| USB lifecycle       | Browser serial API is shimmed through WebSocket/TCP; DYA2 harness uses one connection per boot                           | Actual chooser/permission, CDC interface ownership, OS enumeration after reboot, repeated open/close and real reconnect |
| Persistence         | Fresh harness boot starts with erased emulated NVS                                                                       | Existing physical flash content, save/delete/reuse, reboot retention; cold-start is separate and requires power action  |
| Split               | Two-machine UART hub exists but half-duplex turnaround is imperfect; non-split disables relay                            | Actual central/peripheral firmware pair, forwarded writes/readback, link delays and resource contention                 |
| Sensors/HID         | PMW3610 accepts synthetic QueueMotion; this is not physical sensor/host HID evidence                                     | Real motion, keys/encoders, output destination, event processing while RPC/log streaming is busy                        |
| Scheduling/power    | Non-split disables animation, LED strip, transient external power and watchdog freeze detection                          | Production watchdog, animation/sensor threads, flash latency, battery/sleep/wake and BLE RF behaviour                   |

Do not transfer emulator-specific second-connection failures or watchdog workarounds
into accepted hardware defects. Conversely, an emulated success does not prove
physical timing, flash endurance, electrical integrity or radio robustness.

### Current high-value comparisons

Review these linked gaps on each run; their presence is not executed coverage:

- [Macro/Combo Renode spec](../../../../e2e/renode/tests/dya2/macro-combo.spec.ts)
  uses a nonempty 25 ms delay to avoid unresolved empty/0 ms macro slot/name
  retention. Compare the normal control, empty body and zero-delay body separately
  when the actual UI permits them (MAC-002/003, MC-002 and the macro spec's
  unresolved section). Fresh-read the body/name/slot before and after Save;
  stop on mismatch instead of repeatedly creating new records.
  If the UI does not expose a numeric macro slot, record that as unknown and
  track the unique name plus actual body; slot-specific retention remains
  unverified. Never infer numeric slot identity from list order.
- That file's combo round trip is `test.fixme`; historical ENODEV/timeout comments
  are hypotheses to compare, not a proven cause on current hardware. Exercise
  create → disabled-state readback → Save → Refresh → detail → delete/restore.
- [Trackball Renode spec](../../../../e2e/renode/tests/dya2/trackball.spec.ts)
  is `test.fixme` around processor notification delivery. Read current
  [workflow selection](../../../../.github/workflows/renode-webserial-e2e.yml):
  a skipped or omitted file never establishes that path passed. Prioritize
  actual processor IDs/count, completed Reload and a reversible setting round trip.
- Non-split overlays disable relay and other production work; split E2E is
  experimental/manual. Explicitly select physical split-source readback instead
  of treating a non-split result as proof for the other half.

## Capacity and allocation pressure

For Macro & Combo and Keymap layers use the actual
available count/byte limits. Record initial occupancy and identifiers, per-item
encoded bytes, shared pool bytes if exposed, and which resources are shared.
If a limit is unknown, report it unknown and use a finite exploratory cap;
do not discover a limit through an unbounded create loop.

Default per-domain exploratory budget: at most 8 new records and at most 4
flash Save operations including cleanup, plus at most 2 normal RPC reboots for
the entire run. These are safety bounds, not required test volume. Use RAM-only
checkpoints when the domain permits. A coordinator may set a larger finite
budget under the user's explicit stress-test request, recording why restoration
is reliable. Account for immediate-persist creates/deletes/settings too; reducing
the number of Save clicks does not bound those writes. Reserve cleanup writes
before consuming the mutation budget. Never consume slots needed by user data.

Keep separate counters for UI mutations, Save clicks, known persistence requests
and run-wide reboots. Actual flash program/erase counts remain unknown without
firmware instrumentation. For example, one settled inertia numeric edit plus
one settled restoration is two PERSIST requests (INPUT-006/TRACK-012) despite
zero Save clicks; do not generate intermediate settled values. A scaling action
may issue multiple requests. Allocate the two reboot stages before all batches:
one changed-state reboot and one restored-state reboot consume the default
run-wide budget; they are not available anew for every page.

Choose distinct payload shapes within the budget: a macro near its reported
encoded-byte limit, several mixed-size macros to pressure a shared pool and
reclaim/reuse space, or combo slot/position/name boundaries. Tiny-item counts
alone do not cover byte pressure. Record aggregate pool deltas when exposed,
otherwise unknown; undocumented counter semantics alone do not prove a leak.
Trackball currently edits existing processors, without UI chain create/delete.
For that page use fixed-list notification/read stress: e.g. ten serially awaited
Reload processors operations over a bounded two-minute window with explicit
per-read timeout, Debug Tool streaming, count/ID comparisons and diagnostics.
Report unavailable chain growth, rather than searching for nonexistent controls.

Suggested sequence:

1. Fresh-read baseline and diagnostics. Create one identifiable inert test item
   through UI, verify contents after page Refresh; do not attach output-generating
   bindings to physical keys. Include a non-ASCII label/string only if the spec
   supports it; record byte size rather than assuming character count equals bytes.
   **Combo exception:** `New combo` creates an enabled default on positions 0/1
   with HID A (COMBO-001), before Save. Arrange a brief pause of physical key
   input for each creation, disable the new combo through UI, wait for the RAM
   write and fresh-read `Enabled=false` before continuing. If the pause cannot
   be arranged, combo creation is blocked; existing combo reads remain available.
   Do not invent a disabled-create RPC. An intentional enabled-combo input trial
   needs the human/actuator and safe sink described below.
2. Grow in finite checkpoints (for example 1, 4, 8 records, or 25/50/90% of
   available reported capacity within budget). Read back all test items and sample
   original sentinels at each checkpoint. Capture responsiveness/errors and
   diagnostics. Reaching the configured cap below capacity is partial stress
   coverage, not a capacity-boundary pass.
3. If the advertised boundary is reachable within budget and baseline safety,
   exercise the last valid state and one UI-supported overflow attempt. Otherwise
   mark exact-full/overflow not-run with remaining counts/bytes. Never bypass
   validation or forge RPC payloads to force allocation failure.
4. Delete only a test item, refill the released slot/bytes, and verify no duplicate
   ID, stale selection, lost neighbour, or unexpected pool leak. Save the deliberate
   state once, fresh-read, RPC reboot/reconnect/unlock, re-read; retain final cleanup
   budget. Include immediate Save after input to exercise debounce when applicable.
5. Remove test records and restore baseline with fresh-read and saved-state checks.
   A firmware or transport refusal must not cause a success banner for unsaved
   data; inspect accepted state before retrying any non-idempotent create.

## Transport, lock and firmware resources

- Real USB connect → capability inventory → devtool lock refresh → authorized
  unlock → page readback. Distinguish direct devtool unlock from physical key
  unlock. Test cancel/retry of the normal unlock UI only when restoration is possible.
- Use up to three orderly disconnect/reconnect cycles by default, keeping actual
  connection/reboot counts. Count reboot-driven re-enumeration/reconnect events
  within this total, not as three additional cycles. Observe chooser re-use, stale data, duplicated streams
  and ability to edit/read after reconnect. A second OS client is optional and
  requires separate explicit port ownership; never steal another session's port.
- Capture Troubleshooting health/watchdog/stack diagnostics before and after
  bounded page switching, fresh reads, one edit/Save and Debug Tool streaming.
  Compare resets, stack high-water marks, errors/dropped records and UI response.
  Zero observed incidents is not proof that no incident occurred if the counter
  resets on reboot or history is unavailable. Do not Clear historical diagnostics.
- Open Debug Tool, observe normal streaming, change filters/cap, close/reopen and
  compare stream behaviour while reading an editing page. Browser cache cap and
  firmware droppedCount are different. Do not manufacture unlimited log traffic.
- Reboot after completed Save, then wait for actual re-enumeration/reconnect,
  verify device identity/capabilities, unlock, fresh-read all changed domains.
  Reboot during Save, unplug during write and bootloader are excluded fault injection.

## Split, physical events and power

- Record each half's identity/firmware if available and both initial values for
  settings that fan out. Change one safe reversible shared setting, wait, fresh-read
  central and peripheral. If UI does not expose independent readback, report that
  limit rather than treating the central form as proof of peripheral persistence.
- With an available human/actuator, observe safe key/encoder/motion events and host
  output while UI RPC reads/logging occur. Use a dedicated non-executing input
  sink; never emit shortcuts into the user's terminal or applications. Record
  input stimulus and host observation separately from UI configuration readback.
- BLE needs a real browser/OS radio path and the firmware's Studio advertisement,
  but does not inherently need a human: use authorized USB devtool unlock first
  when that firmware makes Studio discoverable, disconnect the serial session,
  then use the real BLE chooser for the same DUT and fresh-read capabilities/data.
  Record actual GATT connection separately from ordinary keyboard HID output.
  Disconnect BLE, reconnect USB and restore the initial lock/session state. Plan
  both transport transitions in the finite reconnect budget before dispatch;
  never clear pairing profiles or change the keyboard output route to force it.
  An absent advertisement/API/chooser remains blocked, not a Renode-equivalent pass.
- Battery, idle/sleep/wake, powered-off peripheral recovery and cold-start need
  their corresponding safe physical control and human/actuator when not available
  through the authorized rig.
  Never remove the user's sole control path by changing output/sleep/pairing
  settings without a recovery channel. A software reboot does not cover these.

## Whole-app assignment inventory

Preplan sequential DUT batches: connection/lock/keymap/sensors; macros/combos
capacity; Trackball/processors/split; Settings/Connection; Troubleshooting/Debug
Tool/Subsystems. Include sharing/export/history and all public routes separately.
Public pages can use an isolated parallel worker without a DUT connection.
Use actual specification IDs and the existing coverage checklist format. Add
hardware-specific rows for baseline backup, occupancy/budgets, fresh reads,
reboot/reconnect, restore per source, and each unavailable physical condition.
Do not drop those rows when a preflight blocks the device; independent reachable
public/UI batches can still run, with their own non-hardware verdicts.
