#!/usr/bin/env bash
# Keep a real ZMK firmware image running in Renode while an interactive browser
# session explores the built DYA Studio app. The browser must install the shim
# URL printed below before its first app navigation.
set -euo pipefail
cd "$(dirname "$0")"
REPO_ROOT="$(cd ../.. && pwd)"

ELF="${1:?usage: run-exploratory.sh <studio-rpc-usb-uart.elf>}"
export DIST_DIR="${DIST_DIR:-$REPO_ROOT/dist}"
export ZMK_WC_RENODE_LIB="${ZMK_WC_RENODE_LIB:?set ZMK_WC_RENODE_LIB to zmk-west-commands/scripts/lib/renode}"
export WS_PORT="${WS_PORT:-8788}"
export WS_URL="ws://127.0.0.1:${WS_PORT}"
export SERVE_PORT="${SERVE_PORT:-4173}"
export DEVICE_NAME="${DEVICE_NAME:-Renode}"
export DYA2_PERIPHERAL_ELF="${DYA2_PERIPHERAL_ELF:-}"

if [ ! -f "$ELF" ]; then
  echo "!! DUT ELF not found: $ELF" >&2
  exit 1
fi
if [ ! -f "$DIST_DIR/index.html" ]; then
  echo "!! built app not found at $DIST_DIR/index.html; run npm run build first" >&2
  exit 1
fi
if [ "$(uname -s)" = "Darwin" ] && [ -z "${RENODE_BIN:-}" ]; then
  if command -v renode >/dev/null 2>&1; then
    export RENODE_BIN="$(command -v renode)"
  else
    echo "!! macOS needs RENODE_BIN or a renode command on PATH" >&2
    echo "   The harness auto-installer downloads a Linux build and cannot be used on macOS." >&2
    exit 1
  fi
fi
if [ -n "${RENODE_BIN:-}" ]; then
  renode_version="$("$RENODE_BIN" --version 2>&1 | head -1)"
  if [[ "$renode_version" != *"v1.16.1"* ]]; then
    echo "!! unsupported Renode for this harness: $renode_version" >&2
    echo "   Use Renode 1.16.1 (the version pinned by CI)." >&2
    exit 1
  fi
fi

pids=()
cleanup() {
  for p in "${pids[@]:-}"; do kill "$p" 2>/dev/null || true; done
  # Scope the fallback to this ELF; never stop unrelated Renode sessions.
  ps -axo pid=,command= | grep '[Rr]enode.*--disable-xwt' | grep -F "$ELF" | awk '{print $1}' |
    while IFS= read -r pid; do kill -9 "$pid" 2>/dev/null || true; done || true
}
trap cleanup EXIT INT TERM

echo ">>> [1/3] booting Renode with $ELF"
python3 renode_serve.py "$ELF" > renode_serve.out 2> renode_serve.err &
renode_pid=$!
pids+=("$renode_pid")

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

echo ">>> [2/3] starting WebSocket bridge on $WS_URL"
RPC_PORT="$RPC_PORT" WS_PORT="$WS_PORT" node bridge.mjs > bridge.out 2>&1 &
pids+=($!)
for _ in $(seq 1 20); do grep -q BRIDGE_READY bridge.out && break; sleep 0.5; done
grep -q BRIDGE_READY bridge.out || { echo "!! bridge never became ready"; cat bridge.out; exit 1; }

echo ">>> [3/3] serving the fixed app build"
node serve.mjs > exploratory_serve.out 2>&1 &
pids+=($!)
for _ in $(seq 1 20); do grep -q '^serve:' exploratory_serve.out && break; sleep 0.25; done
grep -q '^serve:' exploratory_serve.out || { echo "!! app server never became ready"; cat exploratory_serve.out; exit 1; }

echo "RENODE_EXPLORATORY_READY"
echo "APP_URL=http://127.0.0.1:${SERVE_PORT}"
echo "SERIAL_SHIM_URL=http://127.0.0.1:${SERVE_PORT}/__renode__/serial-shim.js"
echo "DEVICE_NAME=$DEVICE_NAME"
echo ">>> Keep this process running; press Ctrl-C after closing the browser session."

while true; do
  for p in "${pids[@]}"; do
    if ! kill -0 "$p" 2>/dev/null; then
      echo "!! Renode exploratory service exited unexpectedly (pid $p)" >&2
      exit 1
    fi
  done
  sleep 1
done
