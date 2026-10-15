---
name: release-notes
description: Curate DYA Studio's Upcoming release notes once before a release from merged PRs and git history. Use for pre-release preparation, not individual feature or fix PRs.
---

# DYA Studio Release Notes

Keep the `upcoming` entry in `src/i18n/releaseNotes.json` a concise, user-facing account of changes since the last shipped release. Read [the release guide](../../../docs/RELEASE_GUIDE.md), then inspect the current JSON and [its data contract](../../../src/i18n/releaseNotes.ts) before editing.

## Run once before a release

Do not update `src/i18n/releaseNotes.json` in individual feature or fix PRs, and do not run this skill as part of their PR creation. Describe user-visible outcomes in those PRs so the pre-release review can find them. Shared-file edits from parallel PRs cause avoidable merge conflicts.

Run this skill once for the release candidate, after its feature and fix PRs have merged and before dispatching **Release DYA Studio**:

1. Find the latest released version and its matching `v<version>` tag. Record the reviewed `origin/main` commit and use `git log <tag>..origin/main` to identify the candidate changes.
2. Review merged PR titles, descriptions, and diffs to identify user outcomes. Do not infer a release-note item from commit subjects alone, and leave out unmerged work.
3. Compare the candidates semantically with `upcoming`. Add omitted outcomes, remove duplicates or stale entries, and improve wording and category placement. Existing entries are not evidence of complete coverage.
4. Submit one dedicated release-notes PR for the release candidate. Merge it after checks and review, before dispatching the release workflow. This skill prepares notes; it does not dispatch or publish a release.

If more feature or fix PRs merge before dispatch, reconcile only the additional range into the same preparation before releasing. Avoid competing release-notes PRs for the same candidate.

When the local history or tags are incomplete, fetch only after obtaining the authorization normally required for network-changing commands. If a matching tag cannot be established, report the uncertainty and use the newest dated release record plus the available history; do not silently claim complete coverage.

## Decide what belongs

Describe the outcome rather than implementation details, commit mechanics, tests, CI, or documentation work. Combine related PRs into one entry when they deliver one outcome; use a `pr` array when useful. Do not turn every refactor or verification-only change into a note, but include a release-relevant internal change when communicating its stability, compatibility, or other outcome is useful.

Use the existing `upcoming` object (first `releases` item, `version: "upcoming"`) and preserve its schema. Every new item needs `en` and `ja`; include `zh` while the surrounding upcoming entries use it. Add the PR number once known when it materially helps trace the change, but it is optional.

Classify by user impact:

- **major:** a new feature, a behavior change or meaningful behavior improvement, or a breaking change.
- **minor:** visual refinement or a small behavior change.
- **patch:** an internal, non-visible change, a small wording improvement, or similarly small correction worth communicating.

When a change spans categories, choose the category for its primary user impact. Keep each item to one short sentence and avoid release summaries unless a multi-change release needs a useful overview.

## Verify the result

Check that `upcoming` remains first, keeps `date: null`, and contains all three category arrays; do not edit released entries. Deduplicate by the delivered user outcome rather than PR count, preserve valid optional `pr` values, and make translations describe the same scope.

Run the focused formatting check for the edited JSON and `npm run build` when the task includes a release-note data change. Report the reviewed release boundary, PR/commit evidence, entries deliberately excluded as internal-only, and any uncertainty caused by unavailable history or PR metadata.
