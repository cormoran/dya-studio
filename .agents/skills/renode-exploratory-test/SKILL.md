---
name: renode-exploratory-test
description: Run local firmware-backed exploratory UI testing of DYA Studio with a real ZMK ELF in Renode. Use when Demo mode is insufficient for connection, capability, RPC, persistence, or device-state behavior; do not use for ordinary layout-only checks.
---

# Renode-backed exploratory UI testing

Use the existing WebSerial-to-Renode harness to explore the built app against
real ZMK firmware without physical hardware. The app, Studio client, framing,
RPC handlers, and firmware are real; only the browser-to-OS serial layer is a
WebSocket-backed `navigator.serial` shim. Report that boundary explicitly.

Before starting, read the repository [exploration guide](../../../docs/spec/EXPLORATORY_TESTING.md), [specification sitemap](../../../docs/spec/README.md), affected page/module specifications, the relevant browser-tool guide, and the [Renode harness guide](../../../e2e/renode/README.md). These rules extend rather than replace the normal specification, evidence, and restoration requirements.

## Select the DUT

- Default to the unlocked official `renode_tester` ELF for generic connection,
  keymap, layer, Save/Reload, and factory-reset behavior.
- Use the dya2 non-split unlocked ELF when the charter needs dya2 capabilities
  or custom RPCs without wired-split timing. Record that its feature set is real
  but its topology differs from the physical split keyboard.
- Use the two-machine dya2 central + peripheral only for split-dependent
  behavior. It is slower and can be flaky; set `RENODE_PLATFORM=dya2` and
  `DYA2_PERIPHERAL_ELF` as documented in the firmware guide.
- Treat the ELF source, build commit, keymap overlay, locking state, and Renode
  version as test inputs. Do not silently substitute a stale CI artifact.

Do not install Renode, download CI artifacts, clone firmware repositories, or
build a different DUT without the authorization normally required for those
actions. If an input is missing, report the exact prerequisite rather than
falling back to Demo and calling the firmware scenario passed.

## Preflight

1. Confirm the selected ELF exists and is a `studio-rpc-usb-uart` unlocked
   build suitable for the target specifications.
2. Confirm `ZMK_WC_RENODE_LIB` points to
   `zmk-west-commands/scripts/lib/renode`. Use Renode 1.16.1, matching CI. On
   macOS, set `RENODE_BIN` to the Apple Silicon 1.16.1 launcher; the harness
   auto-installer is Linux-only, and the custom USB model does not compile
   against Renode 1.17.0.
3. Record `git rev-parse HEAD`, working-tree specification changes, the ELF
   provenance, Renode version, language, viewport, and browser tool/version.
4. Run `npm run build` before the session. Do not rebuild, generate, format, or
   edit source while the fixed browser session is running.
5. Install `e2e/renode` dependencies and the Chromium browser only when they
   are absent and the normal authorization permits it.

## Start and attach

The coordinator owns the harness process:

```sh
ZMK_WC_RENODE_LIB=/path/to/zmk-west-commands/scripts/lib/renode \
DEVICE_NAME=Renode \
  bash e2e/renode/run-exploratory.sh /absolute/path/to/zmk.elf
```

Wait for `RENODE_EXPLORATORY_READY` and use the exact printed `APP_URL` and
`SERIAL_SHIM_URL`. Keep the process running. For `playwright-cli`, create a new
non-persistent session at `about:blank`, display its dashboard, and install the
shim before the first app navigation:

```sh
playwright-cli -s=<session> open about:blank
playwright-cli -s=<session> show
playwright-cli -s=<session> run-code 'async page => { const response = await page.request.get("<SERIAL_SHIM_URL>"); const shim = await response.text(); await page.addInitScript(shim); await page.goto("<APP_URL>"); }'
```

Do not navigate to the app first and inject afterward. Do not replace UI actions
with direct RPC, DOM, or application-state mutations. Other browser tools are
valid only if they can install the init script before navigation and provide
the observation/dialog controls required by the exploration guide.

## Explore and restore

- Use one browser context and one Studio connection per Renode boot. Avoid
  browser reload/reconnect as a reset mechanism; restart the harness for a
  clean boot. This is mandatory for dya2.
- Prefer page-level Reload/Refresh controls when verifying device readback.
  Browser snapshots do not re-read firmware state.
- Save/Discard operations write only the emulated DUT, but still record initial
  values and restore them through the UI when the charter requires restoration.
  A fresh Renode boot starts from erased emulated NVS; state does not prove
  persistence across a physical power cycle.
- Run factory reset/destructive charters in their own boot and never reuse that
  boot as evidence for later charters.
- Close only the assigned browser session, then stop `run-exploratory.sh` and
  confirm its Renode, bridge, and app-server processes exited. Keep raw logs out
  of commits unless they are deliberately requested as durable evidence.

## Report

Use the exploration guide's report template. In addition, name the DUT and ELF
provenance, Renode version, shim boundary, boot/connection count, and whether
the observed capability/topology matches the physical target. Separate:

- product observations supported by UI action plus device readback;
- transport or emulator limitations;
- scenarios that still require physical WebSerial, BLE, timing, sensors, or
  hardware topology;
- unexecuted cases. Do not promote CI coverage or an existing Playwright spec
  to an exploratory pass without performing and observing the charter.
