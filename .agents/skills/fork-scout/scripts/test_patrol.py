"""Behavioral checks without network or external writes: python3 -m unittest discover."""
import contextlib
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace
from patrol import atomic_json, change_index, collect, locked_state, main, record


class FakeGitHub:
    def __init__(self):
        self.base = "upstream1"
        self.head = "head1"
        self.failed = False
        self.calls = []
        self.forks = [
            {
                "full_name": f"{owner}/fork",
                "html_url": f"https://github.com/{owner}/fork",
                "default_branch": "main",
                "pushed_at": "2026-09-27",
                "archived": False,
            }
            for owner in ["alice", "bob"]
        ]

    def __call__(self, endpoint, paginate=False):
        self.calls.append(endpoint)
        if endpoint == "repos/cormoran/dya-studio":
            return {"default_branch": "main"}
        if endpoint == "repos/cormoran/dya-studio/branches/main":
            return {"commit": {"sha": self.base}}
        if "/forks?" in endpoint:
            return [[self.forks[0]], self.forks[1:]] if self.forks else [[]]
        if "/pulls?" in endpoint:
            return [[]]
        if "/branches?" in endpoint:
            # Non-default branch in a second page must be included.
            return [
                [{"name": "main", "commit": {"sha": self.head}}],
                [{"name": "feature/a", "commit": {"sha": self.head}}],
            ]
        if "/compare/" in endpoint:
            if self.failed:
                raise RuntimeError("temporary API failure")
            return [
                {
                    "status": "ahead",
                    "ahead_by": 2,
                    "behind_by": 0,
                    "commits": [
                        {
                            "sha": "c1",
                            "html_url": "https://github.com/a/c1",
                            "commit": {"message": "feature"},
                        }
                    ],
                    "files": [{"filename": "src/new.ts"}],
                },
                {
                    "commits": [
                        {
                            "sha": "c2",
                            "html_url": "https://github.com/a/c2",
                            "commit": {"message": "fix"},
                        }
                    ]
                },
            ]
        raise AssertionError(endpoint)


class PatrolTests(unittest.TestCase):
    def setUp(self):
        self.api = FakeGitHub()
        self.state = {
            "schema": 1,
            "comparisons": {},
            "candidates": {"terminal": {"status": "rejected"}},
        }

    def test_pages_mirrors_cache_and_upstream_movement(self):
        run = collect(self.state, self.api)
        self.assertTrue(run["complete"])
        index = change_index(run)
        self.assertEqual(len(index["change_families"]), 1)
        self.assertEqual(len(index["change_families"][0]["sources"]), 4)
        self.assertEqual(index["change_families"][0]["files"][0]["path"], "src/new.ts")
        self.assertEqual(sum(len(f["branches"]) for f in run["forks"]), 4)
        self.assertEqual(run["uncached_comparisons"], 1)
        comparison = run["forks"][0]["branches"][0]["comparison"]
        self.assertEqual([c["sha"] for c in comparison["commits"]], ["c1", "c2"])
        self.assertEqual(collect(self.state, self.api)["uncached_comparisons"], 0)
        self.api.base = "upstream2"
        self.assertEqual(collect(self.state, self.api)["uncached_comparisons"], 1)
        self.assertIn("upstream1:head1", self.state["comparisons"])
        self.assertEqual(self.state["candidates"]["terminal"]["status"], "rejected")
        self.api.head = "force-pushed"
        self.assertEqual(collect(self.state, self.api)["uncached_comparisons"], 1)

    def test_failure_is_not_cached_and_prior_state_survives(self):
        collect(self.state, self.api)
        previous = copy.deepcopy(self.state["comparisons"])
        self.api.base = "upstream2"
        self.api.failed = True
        failed = collect(self.state, self.api)
        self.assertFalse(failed["complete"])
        self.assertTrue(failed["errors"])
        self.assertEqual(failed["uncached_comparisons"], 1)
        self.assertEqual(self.state["comparisons"], previous)
        self.api.failed = False
        self.assertTrue(collect(self.state, self.api)["complete"])

    def test_budget_and_removed_forks_preserve_decisions(self):
        run = collect(self.state, self.api, max_comparisons=0)
        self.assertFalse(run["complete"])
        self.assertEqual(run["uncached_comparisons"], 0)
        self.api.forks = []
        self.assertEqual(collect(self.state, self.api)["forks"], [])
        self.assertIn("terminal", self.state["candidates"])

    def test_atomic_update_failed_write_and_schema(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            with locked_state(directory) as state:
                state["candidates"]["existing"] = {"status": "rejected"}
            before = (directory / "state.json").read_bytes()
            with self.assertRaises(RuntimeError):
                with locked_state(directory) as state:
                    state["candidates"].clear()
                    raise RuntimeError("interruption")
            self.assertEqual((directory / "state.json").read_bytes(), before)
            with locked_state(directory) as state:
                state["latest_run"] = "some snapshot"
            self.assertIn(
                "existing",
                json.loads((directory / "state.json").read_text())["candidates"],
            )
            atomic_json(directory / "state.json", {"schema": 2})
            with self.assertRaises(ValueError):
                with locked_state(directory):
                    pass

    def test_cli_incomplete_coverage_exits_nonzero_and_persists(self):
        with tempfile.TemporaryDirectory() as tmp:
            argv = [
                "patrol.py",
                "collect",
                "--state-dir",
                tmp,
                "--max-comparisons",
                "0",
            ]
            with patch("sys.argv", argv), patch("patrol.github", self.api), patch(
                "patrol.subprocess.run", return_value=SimpleNamespace(returncode=0)
            ), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(main(), 1)
            state = json.loads((Path(tmp) / "state.json").read_text())
            self.assertFalse(
                json.loads(Path(state["latest_run"]).read_text())["complete"]
            )
            self.assertNotIn("latest_successful_run", state)

    def test_cli_discovery_failure_preserves_latest_success_and_records_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            prior = {**self.state, "latest_run": "last-success"}
            atomic_json(directory / "state.json", prior)
            argv = ["patrol.py", "collect", "--state-dir", tmp]
            with patch("sys.argv", argv), patch(
                "patrol.github", side_effect=RuntimeError("API unavailable")
            ), patch(
                "patrol.subprocess.run", return_value=SimpleNamespace(returncode=0)
            ), contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaises(SystemExit) as result:
                    main()
            self.assertEqual(result.exception.code, 1)
            self.assertEqual(json.loads((directory / "state.json").read_text()), prior)
            failures = list((directory / "runs").glob("*-failed.json"))
            self.assertEqual(len(failures), 1)
            self.assertFalse(json.loads(failures[0].read_text())["complete"])

    def test_cli_rejects_nonignored_state_before_writing(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp) / "must-not-create"
            with patch(
                "sys.argv", ["patrol.py", "show", "--state-dir", str(directory)]
            ), patch(
                "patrol.subprocess.run", return_value=SimpleNamespace(returncode=1)
            ), contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit):
                    main()
            self.assertFalse(directory.exists())

    def test_record_publication_requires_url_and_retains_provenance(self):
        candidate = {
            "id": "feature",
            "status": "approved",
            "title": "Feature",
            "sources": ["pinned URL"],
            "upstream_sha": "sha",
            "reason": "benefit",
            "revisit_when": "upstream changes",
        }
        record(self.state, candidate)
        with self.assertRaises(ValueError):
            record(self.state, {**candidate, "status": "published"})
        record(
            self.state,
            {
                **candidate,
                "status": "published",
                "pr_url": "https://github.com/cormoran/dya-studio/pull/1",
            },
        )
        record(self.state, {**candidate, "status": "ci_passed"})
        self.assertEqual(
            self.state["candidates"]["feature"]["pr_url"],
            "https://github.com/cormoran/dya-studio/pull/1",
        )
        with self.assertRaises(ValueError):
            record(self.state, {**candidate, "pr_url": "different"})


if __name__ == "__main__":
    unittest.main()
