"""Exercise install recovery with fake npm; no network or dependencies needed."""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[2] / "npm-ci.sh"


class NpmCiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copy(SCRIPT, self.root)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.command("sleep", '#!/bin/sh\necho "$*" >> sleeps\n')
        self.command("npm", """#!/bin/sh
echo "$*" >> calls
attempt=$(wc -l < calls | tr -d ' ')
if [ "$MODE" = success ] || { [ "$MODE" = recover ] && [ "$attempt" = 2 ]; }; then
  exit 0
fi
echo 'npm error git dep preparation failed'
echo "npm error npm error code $ERROR_CODE"
exit 152
""")

    def command(self, name, source):
        path = self.bin / name
        path.write_text(source)
        path.chmod(0o755)

    def run_install(self, mode, error="ECONNRESET"):
        return subprocess.run(
            ["bash", str(self.root / "npm-ci.sh")],
            cwd=self.root,
            env=dict(os.environ, PATH=f"{self.bin}:{os.environ['PATH']}",
                     MODE=mode, ERROR_CODE=error),
            capture_output=True,
            text=True,
            timeout=10,
        )

    def calls(self):
        return (self.root / "calls").read_text().splitlines()

    def failures(self):
        return sorted((self.root / "install-results").glob("*/*.log"))

    def test_success_needs_no_retry(self):
        result = self.run_install("success")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls(), ["ci"])
        self.assertFalse((self.root / "sleeps").exists())
        self.assertEqual(self.failures(), [])

    def test_nested_git_network_error_recovers_and_preserves_log(self):
        result = self.run_install("recover")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls(), ["ci", "ci"])
        self.assertEqual((self.root / "sleeps").read_text(), "5\n")
        self.assertEqual(len(self.failures()), 1)
        self.assertIn("ECONNRESET", self.failures()[0].read_text())

    def test_repeated_network_failure_propagates_status(self):
        result = self.run_install("fail")
        self.assertEqual(result.returncode, 152)
        self.assertEqual(self.calls(), ["ci", "ci"])
        self.assertEqual(len(self.failures()), 2)

    def test_deterministic_failures_are_not_retried(self):
        for code in ("EUSAGE", "ERESOLVE", "EINTEGRITY", "E404", "EACCES"):
            with self.subTest(code=code):
                result = self.run_install("fail", code)
                self.assertEqual(result.returncode, 152)
                self.assertFalse((self.root / "sleeps").exists())
        self.assertEqual(self.calls(), ["ci"] * 5)


if __name__ == "__main__":
    unittest.main()
