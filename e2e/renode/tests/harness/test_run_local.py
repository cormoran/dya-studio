"""Exercise the real shell orchestration with fake services, without Renode."""

import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


RUN_LOCAL = Path(__file__).resolve().parents[2] / "run-local.sh"


class RunLocalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.work = self.root / "e2e" / "renode"
        self.work.mkdir(parents=True)
        shutil.copy(RUN_LOCAL, self.work)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.command("python3", f"#!/bin/sh\nexec '{sys.executable}' \"$@\"\n")
        self.command(
            "node",
            '#!/bin/sh\necho "$RPC_PORT" > bridge-port\necho BRIDGE_READY\nexec sleep 60\n',
        )
        self.command(
            "npx",
            '#!/bin/sh\necho "$*" >> playwright-calls\nexit "${TEST_EXIT_CODE:-0}"\n',
        )
        (self.work / "renode_serve.py").write_text(
            """import os
from pathlib import Path
import sys
import time

counter = Path('boot-count')
attempt = int(counter.read_text()) + 1 if counter.exists() else 1
counter.write_text(str(attempt))
mode = os.environ['BOOT_MODE']
if mode == 'fail' or (mode == 'fail-once' and attempt == 1):
    print('boot diagnostic stdout', flush=True)
    print('TimeoutError: could not connect to Renode UART', file=sys.stderr, flush=True)
    sys.exit(1)
if mode != 'silent':
    print('RPC_PORT=26406', flush=True)
if mode not in ('silent', 'port-only'):
    print('RENODE_READY', flush=True)
while True:
    time.sleep(1)
"""
        )

    def command(self, name, source):
        path = self.bin / name
        path.write_text(source)
        path.chmod(0o755)

    def run_harness(self, mode, test_exit=0):
        env = dict(os.environ)
        env.update(
            PATH=f"{self.bin}:{env['PATH']}",
            ZMK_WC_RENODE_LIB=str(self.root),
            RENODE_READY_TIMEOUT="3",
            DYA2_PERIPHERAL_ELF="",
            BOOT_MODE=mode,
            TEST_EXIT_CODE=str(test_exit),
        )
        result = subprocess.run(
            [
                "bash",
                str(self.work / "run-local.sh"),
                str(self.root / "test.elf"),
                "tests/common",
            ],
            env=env,
            capture_output=True,
            text=True,
            timeout=20,
        )
        self.assertEqual(
            int((self.work / "boot-count").read_text()),
            2 if mode in ("fail", "fail-once") else 1,
        )
        return result

    def assert_browser_not_started(self):
        self.assertFalse((self.work / "bridge-port").exists())
        self.assertFalse((self.work / "playwright-calls").exists())

    def test_success_starts_browser_once_and_forwards_args(self):
        result = self.run_harness("ready")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.work / "bridge-port").read_text().strip(), "26406")
        self.assertEqual(
            (self.work / "playwright-calls").read_text(),
            "playwright test tests/common\n",
        )
        self.assertFalse((self.work / "startup-results").exists())

    def test_early_exit_retries_and_preserves_failure_evidence(self):
        result = self.run_harness("fail-once")
        self.assertEqual(result.returncode, 0, result.stderr)
        errors = list((self.work / "startup-results").glob("*/renode_serve.err"))
        self.assertEqual(len(errors), 1)
        self.assertIn("could not connect to Renode UART", errors[0].read_text())
        self.assertIn(
            "boot diagnostic stdout", errors[0].with_suffix(".out").read_text()
        )
        self.assertEqual(
            len((self.work / "playwright-calls").read_text().splitlines()), 1
        )

    def test_repeated_early_exit_fails_without_browser(self):
        result = self.run_harness("fail")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(
            len(list((self.work / "startup-results").glob("*/renode_serve.err"))), 2
        )
        self.assert_browser_not_started()

    def test_port_without_readiness_fails_without_retry_or_browser(self):
        result = self.run_harness("port-only")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("never reported both RPC_PORT and RENODE_READY", result.stderr)
        self.assert_browser_not_started()

    def test_silent_service_fails_without_retry_or_browser(self):
        result = self.run_harness("silent")
        self.assertNotEqual(result.returncode, 0)
        self.assert_browser_not_started()

    def test_browser_failure_is_not_retried(self):
        result = self.run_harness("ready", test_exit=1)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(
            len((self.work / "playwright-calls").read_text().splitlines()), 1
        )


if __name__ == "__main__":
    unittest.main()
