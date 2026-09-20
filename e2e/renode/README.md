# WebSerial ⇄ Renode end-to-end

Run the **real dya-studio** in a headless browser and have it **fully connect** to
**real ZMK firmware** running in the [Renode](https://renode.io) emulator over the
**WebSerial** API — with no hardware, in CI.

## What this proves

The built dya-studio app, in headless Chromium, using the real
`@zmkfirmware/zmk-studio-ts-client` serial transport (unchanged), completes its
full Studio connect handshake against real firmware emulated in Renode and reaches
the **connected screen** (the device's own name appears in the app header). The
DUT is the exact hardware-flashable `studio-rpc-usb-uart` image; its Studio RPC
rides the **emulated USB CDC-ACM**, so it is the same transport class the browser
uses on real hardware.

```
dya-studio (dist, headless Chromium)
   │  navigator.serial  ← injected shim: real API surface, ts-client unchanged
   ▼  WebSocket
bridge.mjs (Node)  ──raw TCP (transparent bytes)──▶  renode_serve.py relay
                                                          │  (Studio CDC bytes)
                                    DualCdcAcmBridge USB host ⇄ NRF_USBD_Full
                                                          │
                                                   real ZMK fw.elf in Renode
```

Everything except the browser↔OS serial-driver layer is real: the app, the
transport, the RPC/protobuf framing, and the firmware. Only the last-mile serial
driver is replaced by a WebSocket — there is no serial device in CI anyway.

## Why USB CDC

Renode's nRF52840 **UARTE TX-IRQ model stalls partway through any Studio reply of
~≥30 framed bytes**, and the app's full connect fetches replies far larger than
that — so a UART-based Studio transport can only round-trip a bare
`GetDeviceInfo` and never reaches the connected screen.

zmk-west-commands' **usb mode** (NRF_USBD_Full + DualCdcAcmBridge) has no such
limit — it drains large device→host bursts — so this harness boots the exact
hardware-flashable `studio-rpc-usb-uart` image and asserts the app reaches the
**fully-connected** screen. `renode_serve.py` attaches the USB CDC bridge via the
zmk-west-commands harness and relays the Studio CDC byte stream over a plain TCP
socket (`RPC_PORT`) that the Node bridge speaks to, unchanged.

## Files

| file                    | role                                                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renode_serve.py`       | boots the real DUT ELF on the zmk-west-commands USB platform, attaches the DualCdcAcmBridge, and relays the Studio USB-CDC byte stream as a TCP socket (`RPC_PORT`). Drains the console CDC + UART console so the firmware never back-pressures on an unread terminal. |
| `bridge.mjs`            | transparent WebSocket ⇄ TCP byte pipe (the browser can't open raw TCP); the single client of the relay.                                                                                                                                                                |
| `serial-shim.mjs`       | injects a `navigator.serial` shim implementing only the SerialPort surface the ts-client uses, bridged to the WebSocket.                                                                                                                                               |
| `serve.mjs`             | dependency-free static server for the built `dist/`.                                                                                                                                                                                                                   |
| `tests/connect.spec.ts` | Playwright: clicks the real "Connect via USB" button, asserts the device name round-trips **and** the app reaches the connected screen.                                                                                                                                |
| `tests/keymap.spec.ts`  | Playwright: opens the **Keymap** tab, asserts the keymap + per-key behaviors render, then does a real behavior edit round-trip (reassign a key via the behavior picker → save to device → re-read). Needs the **unlocked** DUT (see `firmware/README.md`).             |
| `firmware/README.md`    | how each DUT firmware (e.g. the `official-unlocked` image the Keymap test needs) is built — the reproducible recipes behind the CI firmware matrix.                                                                                                                    |
| `run-local.sh`          | orchestrates renode_serve → bridge → Playwright (extra args pass through to `playwright test`, so you can target one spec).                                                                                                                                            |

## Run locally

```bash
# prerequisites:
#   - Renode 1.16.1 at ~/.renode/1.16.1
#   - a checkout of cormoran/zmk-west-commands (for the Renode harness)
#   - a built dist/ (npm run build at the repo root)
#   - a real studio-rpc-usb-uart DUT ELF. Build one from zmk-west-commands:
#       west init -l . --mf scripts/west-test-standalone.yml
#       west update --narrow && west zephyr-export
#       west zmk-build tests/zmk-config --build-yaml tests/zmk-config/build-ble.yaml -af ble -d build
#     -> build/ble/zephyr/zmk.elf (advertises the name "Renode")
cd e2e/renode
npm install && npx playwright install chromium
ZMK_WC_RENODE_LIB=/path/to/zmk-west-commands/scripts/lib/renode \
DEVICE_NAME=Renode \
  bash run-local.sh /path/to/build/ble/zephyr/zmk.elf
E2E_DEBUG=1 ...   # verbose page/shim/bridge byte logging
```

CI wiring lives in `.github/workflows/renode-webserial-e2e.yml` (builds the real
DUT from zmk-west-commands' fixtures, then runs this). It runs on relevant PRs,
manual dispatch, and every day at 18:00 JST; a failure creates or updates one
open `renode-webserial-e2e` Issue with links to the failed job logs. To point at
a real dya keyboard, build its own `studio-rpc-usb-uart` firmware and set
`DEVICE_NAME` to its keyboard name.

## Toward the real flashable image over a real OS serial port (next step)

This harness drives the DUT's USB CDC through Renode's in-emulator DualCdcAcmBridge
and relays it to the browser over a WebSocket shim. The last fidelity step would be to
export that emulated USB device to the host OS as a real `/dev/ttyACM*` (e.g. via
USB/IP) so an **unshimmed** `navigator.serial` opens it — removing the shim
entirely. That is a zmk-west-commands concern and is untested here.
