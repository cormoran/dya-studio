# Fork patrol contracts

## Research and coverage

Give each worker a snapshot path, distinct change families, upstream SHA/checkout, ledger, report path, mode, and inspection bound. Research is read-only: no product/skill edits, external writes, installs, or fork scripts. Require ranked candidates and excluded/unknown/unexamined families with fork/branch/full SHA URLs, diff symbols, upstream and PR evidence, compatibility, and validation plan. Do not claim tests ran. Inspect reusable leaf features within large bundles before dismissing them. Report inventory and deep-review coverage separately, with an unexamined queue.

The collector covers visible direct forks and advertised branches only. GitHub compare files may stop at 300; `files_may_be_truncated`, missing patches, and binary files require targeted reads or isolated fetch/diff before claiming full review. API failure retains prior comparisons but makes current coverage incomplete. Cached comparisons are discovery evidence, not proof of upstream absence.

## Candidate ledger

`state.json` schema 1 stores comparisons and candidates keyed by stable feature ID, not branch. Collection groups identical SHAs; coordinator resolves patch and semantic equivalents. Candidate fields: `id`, `status` (`proposed`, `approved`, `deferred`, `rejected`, `covered`, `preparing`, `published`, `ci_passed`, `blocked`), `title`, `sources` (repository, branch, full SHA, URL), `upstream_sha`, `reason`, `revisit_when`, `validation`, `spec_ids`, `risks`, and when relevant `branch`, `pr_url`, `implementation_report`.

Only coordinator writes decisions: prepare one JSON object, then run `patrol.py record --state-dir <dir> --candidate-file <file>`; inspect with `patrol.py show --state-dir <dir>`. Preserve published URLs and prior provenance. Keep state and reports ignored and credential-free. Retain referenced runs and unresolved decisions; compact obsolete comparisons and raw snapshots older than 90 days only after a successful replacement snapshot, atomically under the state lock.

Publication also needs a coordinator reservation across implementation and PR creation, separate from the collector's brief write lock (for example, `mkdir <state-dir>/publish.lock` with owner/Run ID). Stop if held; never steal by age without proving owner exit and reconciling remote branch/PR. Record `preparing` and deterministic branch before delegation. After interruption reconcile that branch/PR before redispatch; release only your own reservation. Removed branches leave historical provenance, but not current coverage.

## Implementation brief

Give each worker the approved feature ID, source URLs/full SHAs, pinned upstream SHA, accepted scope, preserved contracts, owned isolated checkout/report path, and evaluate or publish permission. Require affected specs, attribution/license, focused validation, lint/build/spec checks as appropriate, exact changed files, and limitations. User-visible behavior needs spec updates; internal changes cite reviewed IDs. Evaluation produces a local patch and PR draft without external writes, overriding normal repository PR delivery. Publication waits for coordinator diff review and gate, then creates or recovers one PR and monitors CI. Never imply a fork-only fix already fixes upstream or that Demo establishes hardware, firmware, or macOS serial behavior. Keep missing prerequisites and optional product choices explicit.

For custom model/profile arguments, use the installed Orca guide's terminal launch and adoption flow with `--profile orca`. Follow its current recovery and cleanup receipts; do not retry an unknown launch or assume release closes an externally owned process.
