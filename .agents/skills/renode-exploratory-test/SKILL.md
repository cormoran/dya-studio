---
name: renode-exploratory-test
description: Run local firmware-backed exploratory UI tests of DYA Studio with a real ZMK ELF in Renode when Demo cannot cover connection, capabilities, RPC, persistence, or device state. Skip ordinary layout-only checks.
---

# Renode-backed UI exploration

The built app, Studio client, framing, RPC handlers and ZMK firmware run through the existing harness; WebSerial is a WebSocket-backed `navigator.serial` shim. Report that boundary. For real transport, flash, split timing, sensors or power, use [hardware-exploratory-test](../hardware-exploratory-test/SKILL.md) and its [risk matrix](../hardware-exploratory-test/references/charters.md).

Read the [exploration guide](../../../docs/spec/EXPLORATORY_TESTING.md), [spec sitemap](../../../docs/spec/README.md), affected specs, browser-tool guide, [harness guide](../../../e2e/renode/README.md), and [firmware recipes](../../../e2e/renode/firmware/README.md). Keep ordinary specification, evidence and restoration rules.

## DUT and preflight

- Default to the unlocked official `renode_tester` ELF for generic connection, keymap, layer and Save/Reload/reset. Use unlocked dya2 non-split for custom capabilities/RPC without split timing. Use the two-machine dya2 central/peripheral only for split behavior; set `RENODE_PLATFORM=dya2` and `DYA2_PERIPHERAL_ELF` per the firmware guide. Record topology and limitations.
- Record ELF source/build commit, overlay, lock state, Renode version, app commit/dirty spec diff, language, viewport and browser tool/version. Do not silently use stale CI artifacts. Missing inputs remain prerequisites; Demo does not pass the firmware charter. Do not install/download/clone/build a different DUT without the authorization those actions require.
- Confirm the ELF exists and is an unlocked `studio-rpc-usb-uart` build. Point `ZMK_WC_RENODE_LIB` at `zmk-west-commands/scripts/lib/renode`. Use Renode 1.16.1 as CI does. On macOS, set `RENODE_BIN` to the Apple Silicon 1.16.1 launcher; harness auto-install is Linux-only and the USB model does not compile against 1.17.0. Install missing `e2e/renode` dependencies/Chromium only when normally authorized.
- Run `npm run build` before the fixed browser session; do not rebuild, generate, format or edit source during it.

## Start and explore

The coordinator owns the harness:

```sh
ZMK_WC_RENODE_LIB=/path/to/zmk-west-commands/scripts/lib/renode \
DEVICE_NAME=Renode \
  bash e2e/renode/run-exploratory.sh /absolute/path/to/zmk.elf
```

Wait for `RENODE_EXPLORATORY_READY`; use its exact `APP_URL` and `SERIAL_SHIM_URL`. For `playwright-cli`, start a new non-persistent `about:blank` session, show it, and inject before first app navigation:

```sh
playwright-cli -s=<session> open about:blank
playwright-cli -s=<session> show
playwright-cli -s=<session> run-code 'async page => { const response = await page.request.get("<SERIAL_SHIM_URL>"); const shim = await response.text(); await page.addInitScript(shim); await page.goto("<APP_URL>"); }'
```

Another browser tool must support pre-navigation init scripts plus required observations/dialogs. Never inject after app navigation or replace UI actions with direct RPC, DOM or app-state mutations.

Use one browser context and one Studio connection per Renode boot; restart the harness for a clean boot, especially for dya2. Page Reload/Refresh re-reads the DUT; a browser snapshot does not. Record initial values and restore through UI where the charter requires it. A new boot starts from erased emulated NVS, not retained physical flash. Isolate destructive/factory-reset charters in their own boot. Close only the assigned session, stop the harness, and confirm Renode, bridge and app-server exit; keep raw logs out of commits unless requested.

Report with the exploration-guide template: DUT/ELF provenance, Renode version, shim boundary, boot/connection count and topology match. Separate UI action plus DUT readback, emulator/transport limits, physical-only scenarios and unexecuted cases. CI or an existing Playwright test is not an exploratory pass.
