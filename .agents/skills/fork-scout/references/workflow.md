# Worker and local-state contracts

## Research task

Provide target forks/change families, snapshot path, upstream SHA/checkout, ledger, output path, mode and resource bound. Example:

> Use fork-scout in evaluate mode. Independently scout the supplied raw snapshot against current cormoran/dya-studio and PR history. Read the skill and required specs. Own only `<report>`; no product/skill edits, pushes, PRs, issues, comments, installs or executing fork scripts. Return a ranked candidate list and excluded/unknown families with exact fork/branch/commit URLs, diff symbols, current upstream evidence, equivalent PR links, compatibility and validation plan. Cite source evidence; do not claim tests ran. Bound deep inspection to six promising families; report the rest as unexamined.

Research should first enumerate reusable leaf features in large bundles (new helper/test/page names), rather than dismissing a whole fork rewrite before finding its independently transplantable parts. Preserve triaged versus deeply inspected coverage; include a ranked unexamined queue so another bounded run continues rather than re-reviewing the same six families.

Read-only raw GitHub data and `gh api` are preferred to cloning every fork. The collector covers visible direct forks and all their advertised branches, not inaccessible/private forks, nested forks, deleted branches or unadvertised refs. Comparisons return first-page files (GitHub limits to 300); `files_may_be_truncated` requires targeted commit/file reads or an isolated fetch/diff before claiming full review. Missing patches/binary files similarly require inspection. Cached comparisons are discovery evidence, not proof that upstream lacks a feature.

## Candidate ledger

`state.json` schema 1 contains comparison cache and `candidates` keyed by a stable, human-chosen feature identity (e.g. `analog-live-monitor`), not branch name. SHA deduplication happens in collection; patch-equivalent/semantic deduplication is the coordinator's responsibility. Candidate fields:

- `id`, `status`: proposed, approved, deferred, rejected, covered, preparing, published, ci_passed, blocked.
- `title`, `sources`: repository, branch, commit SHA and URL; include mirrored provenance when useful.
- `upstream_sha`, `reason`, `revisit_when`, `validation`, `spec_ids`, `risks`.
- `branch`, `pr_url`, `implementation_report` when applicable.

Prepare a JSON object and run `patrol.py record --state-dir <stable-dir> --candidate-file <file>`. This merges one candidate atomically; only the coordinator writes decisions. `patrol.py show --state-dir <dir>` exposes the ledger. Keep published URLs on updates. Raw snapshots and reports remain local; do not put credentials, whole environments or secrets in them.

Concurrent collection is locked. Publish runs additionally need one coordinator reservation spanning the entire implementation/publish window (e.g. mkdir `<state-dir>/publish.lock` and an owner/run ID inside). If held, stop publication; never automatically steal a stale lock without proving its owner has exited and reconciling remote branches/PRs. Release only your own reservation. The collector's short write lock is not a publication reservation. Persist preparing + deterministic branch before delegation, then reconcile an interrupted preparation against that branch/PR instead of redispatching blindly.

An API error never means no changes. Retain prior successful comparison; mark current coverage incomplete and retry on another run. Invalidate decisions separately from cached network facts when upstream moves. A removed fork/branch should disappear from current coverage, but its prior decision/provenance remains available in run history and ledger.

## Implementation task

> Use fork-scout in `<evaluate|publish>` mode. Main coordinator approved `<candidate-id>` at upstream `<sha>`. Implement only `<accepted scope>` using `<source URLs/SHAs>` as reference; preserve `<contracts>`. Own this isolated checkout and `<report directory>`. Read affected specs and update them for user-visible behavior; record spec IDs for internal changes. Include attribution/license, meaningful focused validation, lint/build/spec:check and diff checks as appropriate. Evaluate: write patch and PR draft locally, never push or create any external object, overriding normal delivery instructions. Publish: coordinator must review and explicitly release the publication gate; then create/recover one PR and monitor CI, fixing failures/conflicts. Return exact changed files, validation actually run, limitations, draft/PR URL and next action.

Evaluation-only behavior is a proposed candidate, not an accepted user product requirement: retain that distinction in specification provenance and PR drafts even when the coordinator approved local implementation. Do not imply a bugfix to a fork-only module fixes upstream. A native-shell-only startup patch, new firmware RPC, or dtsi-export serialization fix may need an absent prerequisite feature. Keep prerequisite and optional product decisions explicit. Demo cannot establish hardware persistence, firmware protocol compatibility or macOS serial behavior.
