#!/usr/bin/env python3
"""Read-only GitHub inventory and atomic, ignored patrol history (Python stdlib)."""
import argparse
import contextlib
import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import subprocess
import tempfile
import uuid

REPO = "cormoran/dya-studio"
STATUSES = {
    "proposed",
    "approved",
    "deferred",
    "rejected",
    "covered",
    "preparing",
    "published",
    "ci_passed",
    "blocked",
}


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix=".write-")
    try:
        with os.fdopen(fd, "w") as stream:
            json.dump(data, stream, indent=2, ensure_ascii=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


@contextlib.contextmanager
def locked_state(directory):
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / "state.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        path = directory / "state.json"
        state = (
            json.loads(path.read_text())
            if path.exists()
            else {"schema": 1, "comparisons": {}, "candidates": {}}
        )
        if state.get("schema") != 1:
            raise ValueError(
                "Unsupported state schema; preserve file and migrate explicitly"
            )
        yield state
        atomic_json(path, state)


def github(endpoint, paginate=False):
    args = ["gh", "api", endpoint]
    if paginate:
        args += ["--paginate", "--slurp"]
    result = subprocess.run(args, capture_output=True, text=True, timeout=90)
    if result.returncode:
        raise RuntimeError(result.stderr.strip()[:1500])
    value = json.loads(result.stdout)
    return value


def pages(endpoint, api):
    return [item for page in api(endpoint, paginate=True) for item in page]


def compare(base, owner, head, api):
    batches = api(
        f"repos/{REPO}/compare/{base}...{owner}:{head}?per_page=100", paginate=True
    )
    first = batches[0]
    commits = [commit for batch in batches for commit in batch["commits"]]
    if len(commits) != first["ahead_by"]:
        raise ValueError("Compare commit pagination incomplete")
    return {
        "status": first["status"],
        "ahead_by": first["ahead_by"],
        "behind_by": first["behind_by"],
        "commits": [
            {"sha": c["sha"], "url": c["html_url"], "message": c["commit"]["message"]}
            for c in commits
        ],
        "files": first.get("files", []),
        "files_may_be_truncated": len(first.get("files", [])) >= 300,
    }


def collect(state, api=github, max_comparisons=120):
    repo = api(f"repos/{REPO}")
    branch = api(f"repos/{REPO}/branches/{repo['default_branch']}")
    base = branch["commit"]["sha"]
    forks = pages(f"repos/{REPO}/forks?per_page=100", api)
    prs = pages(f"repos/{REPO}/pulls?state=all&per_page=100", api)
    run = {
        "schema": 1,
        "run_id": uuid.uuid4().hex,
        "at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "upstream_sha": base,
        "default_branch": repo["default_branch"],
        "fork_count": len(forks),
        "forks": [],
        "pull_requests": [
            {
                "number": p["number"],
                "title": p["title"],
                "state": p["state"],
                "merged_at": p["merged_at"],
                "url": p["html_url"],
                "head": p["head"],
            }
            for p in prs
        ],
        "errors": [],
        "uncached_comparisons": 0,
    }
    failed_this_run = {}
    for fork in sorted(forks, key=lambda f: f["pushed_at"], reverse=True):
        name = fork["full_name"]
        entry = {
            "repo": name,
            "url": fork["html_url"],
            "archived": fork["archived"],
            "branches": [],
        }
        run["forks"].append(entry)
        try:
            branches = pages(f"repos/{name}/branches?per_page=100", api)
        except (RuntimeError, ValueError, subprocess.TimeoutExpired) as error:
            run["errors"].append(
                {"repo": name, "stage": "branches", "error": str(error)}
            )
            continue
        for b in sorted(
            branches, key=lambda b: (b["name"] != fork["default_branch"], b["name"])
        ):
            head = b["commit"]["sha"]
            key = f"{base}:{head}"
            item = {"branch": b["name"], "head": head, "cache_key": key}
            entry["branches"].append(item)
            if key in failed_this_run:
                item["error"] = failed_this_run[key]
                run["errors"].append(
                    {"repo": name, "branch": b["name"], "error": item["error"]}
                )
                continue
            if key not in state["comparisons"]:
                if run["uncached_comparisons"] >= max_comparisons:
                    item["error"] = "comparison budget exhausted; unexamined"
                    run["errors"].append(
                        {"repo": name, "branch": b["name"], "error": item["error"]}
                    )
                    continue
                run["uncached_comparisons"] += 1
                try:
                    state["comparisons"][key] = compare(
                        base, name.split("/")[0], head, api
                    )
                except (RuntimeError, ValueError, subprocess.TimeoutExpired) as error:
                    item["error"] = str(error)
                    failed_this_run[key] = str(error)
                    run["errors"].append(
                        {"repo": name, "branch": b["name"], "error": str(error)}
                    )
                    continue
            item["comparison"] = state["comparisons"][key]
    run["complete"] = not run["errors"]
    return run


def change_index(run):
    """Compact discovery manifest; preserve mirrors, omit bulky patches."""
    groups = {}
    for fork in run["forks"]:
        for branch in fork["branches"]:
            comparison = branch.get("comparison")
            if not comparison or not comparison["ahead_by"]:
                continue
            key = branch["head"]
            if key not in groups:
                groups[key] = {
                    "head": key,
                    "sources": [],
                    "commits": comparison["commits"],
                    "files": [
                        {"path": f["filename"], "status": f.get("status", "unknown")}
                        for f in comparison["files"]
                    ],
                    "files_may_be_truncated": comparison["files_may_be_truncated"],
                }
            groups[key]["sources"].append(
                {"repo": fork["repo"], "branch": branch["branch"]}
            )
    return {
        "upstream_sha": run["upstream_sha"],
        "complete": run["complete"],
        "errors": run["errors"],
        "change_families": list(groups.values()),
    }


def record(state, candidate):
    if not isinstance(candidate.get("id"), str) or not candidate["id"]:
        raise ValueError("Candidate needs stable id")
    if candidate.get("status") not in STATUSES:
        raise ValueError("Invalid candidate status")
    for field in ("title", "sources", "upstream_sha", "reason", "revisit_when"):
        if not candidate.get(field):
            raise ValueError(f"Candidate needs {field}")
    old = state["candidates"].get(candidate["id"], {})
    if old.get("pr_url") and candidate.get("pr_url", old["pr_url"]) != old["pr_url"]:
        raise ValueError("Existing PR URL must not be replaced")
    if candidate["status"] in {"published", "ci_passed"} and not candidate.get(
        "pr_url", old.get("pr_url")
    ):
        raise ValueError("Publication needs actual PR URL")
    state["candidates"][candidate["id"]] = {
        **old,
        **candidate,
        "updated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["collect", "record", "show"])
    parser.add_argument("--state-dir", type=Path, default=Path(".fork-scout.local"))
    parser.add_argument("--candidate-file", type=Path)
    parser.add_argument("--max-comparisons", type=int, default=120)
    args = parser.parse_args()
    directory = args.state_dir.resolve()
    # Fail before data is written if the chosen local directory could be committed.
    check = subprocess.run(
        ["git", "check-ignore", "-q", str(directory / "state.json")],
        capture_output=True,
    )
    if check.returncode:
        parser.error("State directory must be ignored in the current repository")
    if args.max_comparisons < 0:
        parser.error("max-comparisons must be nonnegative")
    with locked_state(directory) as state:
        if args.command == "show":
            print(json.dumps(state["candidates"], indent=2, ensure_ascii=False))
        elif args.command == "record":
            if args.candidate_file is None:
                parser.error("record requires --candidate-file")
            record(state, json.loads(args.candidate_file.read_text()))
        else:
            try:
                run = collect(state, api=github, max_comparisons=args.max_comparisons)
            except (RuntimeError, ValueError, subprocess.TimeoutExpired) as error:
                failure = {
                    "run_id": uuid.uuid4().hex,
                    "at": dt.datetime.now(dt.timezone.utc).isoformat(),
                    "complete": False,
                    "errors": [{"stage": "discovery", "error": str(error)}],
                }
                failure_path = directory / "runs" / f"{failure['run_id']}-failed.json"
                atomic_json(failure_path, failure)
                # Do not move latest_run past the last usable inventory.
                print(
                    json.dumps(
                        {
                            "report": str(failure_path),
                            "complete": False,
                            "error": str(error),
                        }
                    )
                )
                raise SystemExit(1) from error
            path = directory / "runs" / f"{run['run_id']}.json"
            atomic_json(path, run)
            index_path = directory / "runs" / f"{run['run_id']}-changes.json"
            atomic_json(index_path, change_index(run))
            state["latest_run"] = str(path)
            if run["complete"]:
                state["latest_successful_run"] = str(path)
            print(
                json.dumps(
                    {
                        "report": str(path),
                        "change_index": str(index_path),
                        "complete": run["complete"],
                        "forks": run["fork_count"],
                        "branches": sum(len(f["branches"]) for f in run["forks"]),
                        "uncached_comparisons": run["uncached_comparisons"],
                        "errors": len(run["errors"]),
                    }
                )
            )

    if args.command == "collect" and not run["complete"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
