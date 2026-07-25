#!/usr/bin/env python3
"""Boot a real, hardware-flashable ZMK `studio-rpc-usb-uart` ELF under Renode and
hold the emulation running, exposing its ZMK Studio RPC endpoint -- carried over
the emulated **USB CDC-ACM** -- as a plain TCP server socket. Prints `RPC_PORT=<n>`
on stdout once ready, then blocks until killed.

Why USB CDC (not UART): this is the SAME image you flash to hardware, and its
Studio transport is USB CDC. Renode's nRF52840 UARTE TX-IRQ model stalls Studio
replies of ~>=30 framed bytes; the emulated USB CDC path (NRF_USBD_Full +
DualCdcAcmBridge, from zmk-west-commands) has no such limit, so the browser can
complete dya-studio's full connect handshake (which fetches replies far larger
than that). See e2e/renode/README.md.

How the endpoint is exposed: zmk-west-commands' harness attaches a
DualCdcAcmBridge USB host and hands us the Studio CDC channel as a Python socket
(Renode serves a ServerSocketTerminal to only its first client, so we must own
it here rather than let the browser bridge connect to Renode directly). This
process then runs a tiny transparent TCP relay -- `RPC_PORT` -- that pipes those
raw Studio bytes to/from the single Node `bridge.mjs` client, keeping the exact
`RPC_PORT=` contract the rest of the harness (bridge, shim, test) already speaks.
The console CDC channel (present on CONFIG_ZMK_USB_LOGGING images) and the UART
console are drained in the background so the firmware never back-pressures on an
unread terminal.
"""
import os
import socket
import sys
import tempfile
import threading
import time
from pathlib import Path

HARNESS = Path(
    os.environ.get(
        "ZMK_WC_RENODE_LIB",
        str(Path.home() / "zmk-west-commands" / "scripts" / "lib" / "renode"),
    )
)
sys.path.insert(0, str(HARNESS))

import renode_harness as H  # noqa: E402

USB_REPL_TEMPLATE = "xiao_nrf52840_usb.repl"
BRIDGE_NAME = "bridge"

# Self-contained (vendored) Renode platform for the dya2 DUT: the USB real-binary
# platform + a simulated PMW3610 trackball on SPIM0. Used when RENODE_PLATFORM=dya2
# (or the ELF name looks like a dya2/trackball image), so the browser connects
# over USB CDC exactly as with the harness USB platform AND pointer motion can be
# injected via the monitor (`sysbus.spi0.trackball QueueMotion <dx> <dy>`). These
# files live under e2e/renode/platforms so this repo does not depend on the shared
# harness platform dir; only the Python helpers (RenodeSession, NVS preload,
# attach_dual_cdc_bridge) are reused from the harness lib.
VENDOR_ROOT = Path(__file__).resolve().parent
VENDOR_PLATFORMS = VENDOR_ROOT / "platforms"
DYA2_REPL = "xiao_nrf52840_usb_pmw3610.repl"
DYA2_RESC = "dya2_single.resc"
# Two-machine wired-split boot (see the blocker note in boot_dya2_wired_split):
# the central on the USB+PMW3610 platform + a real peripheral half on the
# Python-stub platform, uart0s cross-connected as the half-duplex split wire.
DYA2_PERIPHERAL_REPL = "xiao_nrf52840_dya2_peripheral.repl"
DYA2_WIRED_SPLIT_RESC = "dya2_wired_split.resc"


def _want_dya2(elf: Path) -> bool:
    """True if this ELF should boot on the vendored USB+PMW3610 dya2 platform:
    explicit RENODE_PLATFORM=dya2, or an ELF path that looks like a dya2 /
    trackball image (a convenience heuristic for local runs)."""
    plat = os.environ.get("RENODE_PLATFORM", "").strip().lower()
    if plat == "dya2":
        return True
    if plat:  # any other explicit value opts out
        return False
    name = str(elf).lower()
    return "dya2" in name or "trackball" in name


def _materialize_repl(repl_name: str, prefix: str = "dya2-") -> str:
    """Write a temp copy of a vendored repl with the model
    `filename:`/`include @platforms/models/...` paths rewritten to absolute
    against e2e/renode/platforms (Renode resolves neither against the .repl dir
    nor its cwd). Returns the temp path (caller unlinks after load)."""
    template = (VENDOR_PLATFORMS / repl_name).read_text()
    abs_models = str((VENDOR_PLATFORMS / "models").resolve())
    repl = template.replace('filename: "platforms/models/', f'filename: "{abs_models}/')
    repl = repl.replace("include @platforms/models/", f"include @{abs_models}/")
    fd, path = tempfile.mkstemp(prefix=prefix, suffix=".repl")
    with os.fdopen(fd, "w") as fh:
        fh.write(repl)
    return path


def _materialize_dya2_repl() -> str:
    """Materialize the vendored combined USB+PMW3610 repl (single-machine dya2)."""
    return _materialize_repl(DYA2_REPL, prefix="dya2-usb-pmw3610-")


def boot_dya2_real(renode_path, elf, port_base, boot_wait):
    """Boot the real dya2 studio-rpc-usb-uart ELF (central-only) on the vendored
    USB+PMW3610 platform. Mirrors H.boot_single_real (VectorTableOffset at the UF2
    load offset, erased-0xFF NVS preload, `start` after the UART sockets connect)
    but loads the vendored dya2_single.resc + combined repl so the PMW3610
    trackball model is present. Returns (session, console, rpc)."""
    repl_path = _materialize_dya2_repl()
    ff_path = H._write_ff_binary(H.STORAGE_SIZE_DEFAULT)
    session = H.RenodeSession(
        renode_path,
        VENDOR_PLATFORMS / DYA2_RESC,
        monitor_port=port_base,
        variables={
            "bin": f"@{elf}",
            "console_port": port_base + 1,
            "rpc_port": port_base + 2,
            "platform": f"@{repl_path}",
        },
        cwd=VENDOR_ROOT,
    )
    session.rtt_socket = None
    try:
        session.start(boot_wait=boot_wait)
        console = session.connect_uart(port_base + 1)
        rpc = session.connect_uart(port_base + 2)
        assert session.mon is not None
        session.mon.execute(
            f"sysbus LoadBinary @{ff_path} {hex(H.STORAGE_ADDR_DEFAULT)}"
        )
        session.go()
    except Exception:
        session.stop()
        raise
    finally:
        for tmp in (repl_path, ff_path):
            try:
                os.unlink(tmp)
            except OSError:
                pass
    return session, console, rpc


def boot_dya2_wired_split(renode_path, central_elf, peripheral_elf, port_base, boot_wait):
    """Boot the dya2 wired split as TWO machines -- central (dya2_right, the real
    studio-rpc-usb-uart image on the USB+PMW3610 platform) + peripheral
    (dya2_left, the real wired-split half on the Python-stub platform) -- with
    their uart0 split links cross-connected through one UART hub (half-duplex).

    THE BLOCKER THIS FIXES: booted alone (no peer), the dya2 central's
    zmk,wired-split machinery (uart0, half-duplex, INTERRUPT mode) starves the
    Zephyr USB device work-queue thread, so USB enumeration stalls after
    SET_ADDRESS and dya-studio can never connect. Giving the wired link a real
    peripheral peer lets the split handshake complete and frees the USB WQ.

    Mirrors H.boot_usb_wired_split (two machines, NVS-0xFF preload per ZMK half,
    central left selected so the caller's attach_dual_cdc_bridge targets it) but
    (a) cross-connects uart0, not uart1 (dya2's wired-split device is &uart0),
    and (b) loads the vendored dya2 repls. Returns (session, console, rpc) where
    console = the central's idle uart1 terminal and rpc = the peripheral's idle
    uart1 terminal (both real images are CONSOLE=n silent; kept only so this
    process owns one terminal per machine, matching the single-machine path)."""
    central_repl = _materialize_repl(DYA2_REPL, prefix="dya2-central-")
    peripheral_repl = _materialize_repl(DYA2_PERIPHERAL_REPL, prefix="dya2-peripheral-")
    ff_path = H._write_ff_binary(H.STORAGE_SIZE_DEFAULT)
    central_diag_port = port_base + 1
    peripheral_diag_port = port_base + 2
    session = H.RenodeSession(
        renode_path,
        VENDOR_PLATFORMS / DYA2_WIRED_SPLIT_RESC,
        monitor_port=port_base,
        variables={
            "central_bin": f"@{central_elf}",
            "peripheral_bin": f"@{peripheral_elf}",
            "central_platform": f"@{central_repl}",
            "peripheral_platform": f"@{peripheral_repl}",
            "central_diag_port": central_diag_port,
            "peripheral_diag_port": peripheral_diag_port,
        },
        cwd=VENDOR_ROOT,
    )
    session.rtt_socket = None
    try:
        session.start(boot_wait=boot_wait)
        # connect_uart blocks until the resc's CreateServerSocketTerminal lines
        # have run, so both temp repls have been consumed by here.
        console = session.connect_uart(central_diag_port)  # central uart1 (idle)
        rpc = session.connect_uart(peripheral_diag_port)  # peripheral uart1 (idle)
        assert session.mon is not None
        # Preload each ZMK half's erased NVS sectors before the CPUs run.
        # LoadBinary is machine-scoped; select each half, then leave the CENTRAL
        # selected so attach_dual_cdc_bridge (sysbus.usbd ...) targets it.
        for mach in ("dya2_left", "dya2_right"):
            session.mon.execute(f'mach set "{mach}"')
            session.mon.execute(
                f"sysbus LoadBinary @{ff_path} {hex(H.STORAGE_ADDR_DEFAULT)}"
            )
        session.go()
    except Exception:
        session.stop()
        raise
    finally:
        for tmp in (central_repl, peripheral_repl, ff_path):
            try:
                os.unlink(tmp)
            except OSError:
                pass
    return session, console, rpc


def _mon_is_wired(mon, channel: str) -> bool:
    """True/False for a `sysbus.<channel> IsWired` monitor query (parses the
    ANSI-colored, echo-prefixed reply); False when nothing parseable is found."""
    import re

    text = re.sub(r"\x1b\[[0-9;]*m", "", mon.execute(f"sysbus.{channel} IsWired", settle=0.3))
    for line in text.splitlines():
        if line.strip() in ("True", "False"):
            return line.strip() == "True"
    return False


def _drain_forever(sock, label: str) -> None:
    """Continuously read + discard (echo to stderr) a console socket so the
    firmware never back-pressures on an unread terminal."""
    sock.settimeout(1.0)
    while True:
        try:
            chunk = sock.recv(4096)
            if not chunk:
                time.sleep(0.2)
                continue
            sys.stderr.buffer.write(f"[{label}] ".encode() + chunk)
            sys.stderr.flush()
        except socket.timeout:
            continue
        except OSError:
            return


def _pump(src: socket.socket, dst: socket.socket) -> None:
    """Copy bytes from `src` to `dst` until either side closes. Never closes the
    Renode-facing socket -- the caller keeps it for the process lifetime."""
    src.settimeout(0.5)
    while True:
        try:
            data = src.recv(4096)
        except socket.timeout:
            continue
        except OSError:
            return
        if not data:
            return
        try:
            dst.sendall(data)
        except OSError:
            return


def _serve_relay(srv: socket.socket, studio_sock: socket.socket) -> None:
    """Accept the single Node bridge client and transparently pipe its bytes
    to/from the Studio CDC socket. Loops so a bridge restart re-attaches; the
    Renode-facing `studio_sock` is never closed here (it lives for the session)."""
    while True:
        try:
            conn, _ = srv.accept()
        except OSError:
            return
        print("relay: bridge client attached", file=sys.stderr, flush=True)
        threading.Thread(target=_pump, args=(conn, studio_sock), daemon=True).start()
        _pump(studio_sock, conn)  # returns when the bridge disconnects
        print("relay: bridge client detached", file=sys.stderr, flush=True)
        try:
            conn.close()
        except OSError:
            pass


def main() -> None:
    elf = Path(sys.argv[1]).resolve()
    if not elf.exists():
        raise SystemExit(f"ELF not found: {elf}")

    renode = os.environ.get("RENODE_BIN") or H.find_or_install_renode(
        version=os.environ.get("RENODE_VERSION", "1.16.1")
    )
    if not renode:
        raise SystemExit("Renode is not installed and could not be auto-installed")

    import random

    port_base = int(os.environ.get("RENODE_PORT_BASE", "0")) or random.randint(26000, 40000)
    console_port = port_base + 1
    relay_port = port_base + 6

    # Two machines (dya2 central + wired peripheral) is much heavier than a
    # single machine: the peripheral's BLE stack and the half-duplex wired-split
    # traffic burn host CPU, so the shared emulation runs well under realtime and
    # the CENTRAL's USB enumeration + CDC wiring completes only after ~90s of wall
    # clock (measured), far beyond the single-machine 30s default. Use much longer
    # settle/wiring defaults for that path (still overridable via env).
    # A SINGLE-machine dya2 image (the non-split DUT: RENODE_PLATFORM=dya2, no
    # peripheral) is heavier than the minimal official image -- it brings up the
    # full fork feature set (custom-settings load, default installers, PMW3610)
    # before USB enumerates -- so on a CPU-starved stock CI runner its CDC wires
    # noticeably slower than the official 30s default. Give it middle-ground
    # defaults (between the plain single and the two-machine values).
    two_machine_dya2 = bool(_want_dya2(elf) and os.environ.get("DYA2_PERIPHERAL_ELF", "").strip())
    single_dya2 = bool(_want_dya2(elf)) and not two_machine_dya2

    def _tiered(two: str, single: str, plain: str) -> str:
        return two if two_machine_dya2 else (single if single_dya2 else plain)

    boot_settle = float(os.environ.get("RENODE_BOOT_SETTLE", _tiered("20", "12", "8")))
    wiring_timeout = float(
        os.environ.get("RENODE_WIRING_TIMEOUT", _tiered("150", "120", "30"))
    )
    # Renode's mono cold-start can take ~15-20s on a loaded box; boot_single_real
    # waits boot_wait + 10s for the monitor, so give margin.
    boot_wait = float(os.environ.get("RENODE_BOOT_WAIT", _tiered("45", "30", "20")))

    # Boot the real flashable image on the NRF_USBD_Full usb platform. console =
    # uart0 (silent on a real image), rpc = idle uart1 -- both owned for symmetry.
    # A dya2 DUT boots on the vendored USB+PMW3610 platform instead, so the
    # trackball model is present (Studio still rides USB CDC exactly the same).
    peripheral_elf_env = os.environ.get("DYA2_PERIPHERAL_ELF", "").strip()
    if _want_dya2(elf) and peripheral_elf_env:
        peripheral_elf = Path(peripheral_elf_env).resolve()
        if not peripheral_elf.exists():
            raise SystemExit(f"DYA2_PERIPHERAL_ELF not found: {peripheral_elf}")
        print(
            "dya2 platform: TWO machines (central USB CDC + PMW3610, peripheral "
            f"wired-split); split link on uart0; peripheral={peripheral_elf}",
            file=sys.stderr,
        )
        session, console, rpc = boot_dya2_wired_split(
            renode, elf, peripheral_elf, port_base, boot_wait
        )
    elif _want_dya2(elf):
        print("dya2 platform: USB CDC + simulated PMW3610 trackball", file=sys.stderr)
        session, console, rpc = boot_dya2_real(renode, elf, port_base, boot_wait)
    else:
        session, console, rpc = H.boot_single_real(
            renode,
            elf,
            port_base=port_base,
            repl_template=USB_REPL_TEMPLATE,
            boot_wait=boot_wait,
        )
    assert session.mon is not None
    mon = session.mon
    cdc: list = []
    try:
        # Let the guest finish USB bring-up (ENABLE + USBPULLUP) before the host
        # attaches -- a SETUP fired before the guest's INTEN is set is lost.
        t0 = time.monotonic()
        while time.monotonic() - t0 < boot_settle:
            H.drain_text(console._sock, timeout=0.5)

        # Attach the USB host + expose both CDC channels as sockets (Python owns
        # them, as the harness requires: one client per Renode terminal).
        cdc = list(H.attach_dual_cdc_bridge(session, port_base + 4, port_base + 5))

        deadline = time.monotonic() + wiring_timeout
        while time.monotonic() < deadline:
            if _mon_is_wired(mon, f"{BRIDGE_NAME}_cdc0"):
                break
        else:
            raise SystemExit(
                "USB enumeration never wired the first CDC channel -- is the ELF a "
                "studio-rpc-usb-uart (USB-CDC) image?"
            )
        dual = _mon_is_wired(mon, f"{BRIDGE_NAME}_cdc1")
        # Let the bridge finish its post-wiring control sequence (SET_LINE_CODING /
        # DTR) and arm the device->host pumps.
        time.sleep(2.0)

        # Single-CDC studio-rpc-usb-uart image: cdc0 IS Studio, no console CDC.
        # CONFIG_ZMK_USB_LOGGING image: console CDC enumerates first (cdc0),
        # Studio second (cdc1) -- drain the console CDC so it can't back-pressure.
        if dual:
            studio = cdc[1]
            threading.Thread(
                target=_drain_forever, args=(cdc[0]._sock, "usb-console"), daemon=True
            ).start()
            print("two CDC functions (console + Studio); Studio = cdc1", file=sys.stderr)
        else:
            studio = cdc[0]
            print("single CDC function (Studio only); Studio = cdc0", file=sys.stderr)

        # Drain the (usually silent) UART console too.
        threading.Thread(
            target=_drain_forever, args=(console._sock, "uart0"), daemon=True
        ).start()

        # Transparent TCP relay carrying the raw Studio byte stream -- the exact
        # RPC_PORT= contract bridge.mjs already connects to.
        srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind(("127.0.0.1", relay_port))
        srv.listen(1)
        threading.Thread(target=_serve_relay, args=(srv, studio._sock), daemon=True).start()

        print(f"RPC_PORT={relay_port}", flush=True)
        print(f"CONSOLE_PORT={console_port}", flush=True)
        print("RENODE_READY", flush=True)

        try:
            while True:
                time.sleep(3600)
        except KeyboardInterrupt:
            pass
    finally:
        for sock in cdc:
            sock.close()
        rpc.close()
        console.close()
        session.stop()


if __name__ == "__main__":
    main()
