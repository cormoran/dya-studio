#!/usr/bin/env bash
# Local (and CI) driver for the WebSerial<->Renode e2e:
#   Renode(real fw, Studio over emulated USB CDC) <- TCP - bridge - WS ->
#   shimmed navigator.serial in headless Chromium running the built dya-studio,
#   driven by Playwright.
#
# Requirements:
#   - Renode 1.16.1 at ~/.renode/1.16.1 (RENODE_BIN to override)
#   - ZMK_WC_RENODE_LIB -> a checkout of cormoran/zmk-west-commands'
#     scripts/lib/renode (the Renode harness + platforms)
#   - DIST_DIR -> a built dya-studio dist (defaults to <repo>/dist)
#   - a real studio-rpc-usb-uart DUT ELF (arg $1)
set -euo pipefail
cd "$(dirname "$0")"
REPO_ROOT="$(cd ../.. && pwd)"

ELF="${1:?usage: run-local.sh <studio-rpc-usb-uart.elf>}"
export DIST_DIR="${DIST_DIR:-$REPO_ROOT/dist}"
export ZMK_WC_RENODE_LIB="${ZMK_WC_RENODE_LIB:?set ZMK_WC_RENODE_LIB to zmk-west-commands/scripts/lib/renode}"
export WS_PORT="${WS_PORT:-8788}"
export WS_URL="ws://127.0.0.1:${WS_PORT}"
export DEVICE_NAME="${DEVICE_NAME:-Renode}"
# dya2 two-machine wired split: when a peripheral ELF is provided, renode_serve.py
# boots the central (arg $1) + this peripheral as two machines with their uart0
# split links cross-connected, so the central's wired-split link has a peer and
# stops starving USB enumeration. Forwarded via the environment.
export DYA2_PERIPHERAL_ELF="${DYA2_PERIPHERAL_ELF:-}"

pids=()
cleanup() {
  for p in "${pids[@]:-}"; do kill "$p" 2>/dev/null || true; done
  # kill only our own Renode instance (scoped to this ELF), never a broad pkill
  ps -axo pid=,command= | grep '[Rr]enode.*--disable-xwt' | grep -F "$ELF" | awk '{print $1}' |
    while IFS= read -r pid; do kill -9 "$pid" 2>/dev/null || true; done || true
}
trap cleanup EXIT

echo ">>> [1/3] booting Renode with $ELF (real image; Studio over USB CDC)"
python3 renode_serve.py "$ELF" > renode_serve.out 2> renode_serve.err &
renode_pid=$!
pids+=("$renode_pid")

# Booting the real image, enumerating USB and wiring the CDC bridge is slower
# than a bare UART boot -- and Renode's mono cold-start can take ~20s on a loaded
# box -- so allow generous time for RENODE_READY. The dya2 two-machine wired
# split is heavier still (a second machine's BLE stack + half-duplex split
# traffic slow the shared emulation), so its CDC wires only after ~90s+; wait
# much longer when a peripheral ELF is provided.
if [ -n "${DYA2_PERIPHERAL_ELF:-}" ]; then
  default_ready_timeout=320
else
  default_ready_timeout=180
fi
RPC_PORT=""
for _ in $(seq 1 "${RENODE_READY_TIMEOUT:-$default_ready_timeout}"); do
  if ! kill -0 "$renode_pid" 2>/dev/null; then
    echo "!! Renode service exited before it became ready" >&2
    cat renode_serve.err >&2
    exit 1
  fi
  RPC_PORT="$(sed -n 's/^RPC_PORT=//p' renode_serve.out | head -1)"
  [ -n "$RPC_PORT" ] && grep -q RENODE_READY renode_serve.out && break
  sleep 1
done
[ -n "$RPC_PORT" ] || { echo "!! Renode never reported RPC_PORT"; cat renode_serve.err; exit 1; }
echo ">>> Renode Studio USB CDC relayed on TCP :$RPC_PORT"

echo ">>> [2/3] starting WS bridge on $WS_URL"
RPC_PORT="$RPC_PORT" WS_PORT="$WS_PORT" node bridge.mjs > bridge.out 2>&1 &
pids+=($!)
for _ in $(seq 1 20); do grep -q BRIDGE_READY bridge.out && break; sleep 0.5; done
grep -q BRIDGE_READY bridge.out || { echo "!! bridge never ready"; cat bridge.out; exit 1; }

echo ">>> [3/3] running Playwright (DEVICE_NAME=$DEVICE_NAME)"
shift || true
npx playwright test "$@" || { echo "renode log tail:"; tail -20 renode_serve.err; exit 1; }
