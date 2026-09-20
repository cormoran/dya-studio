---
name: release-notes
description: Curate DYA Studio's Upcoming release notes from merged pull requests, a pending PR, or a pre-release git-log review. Use when adding, revising, or validating the in-app release notes.
---

# DYA Studio Release Notes

Keep the `upcoming` entry in `src/i18n/releaseNotes.json` a concise, user-facing account of changes since the last shipped release. Read [the release guide](../../../docs/RELEASE_GUIDE.md), then inspect the current JSON and [its data contract](../../../src/i18n/releaseNotes.ts) before editing.

## Select the mode

- **Merged-change update:** Find the latest released version and its matching `v<version>` tag. Review only commits and merged PRs in `<tag>..origin/main`; use PR titles, descriptions, and diffs to identify the user outcome. Do not infer a release-note item from commit subjects alone.
- **Before creating a PR:** Review the proposed PR's committed range and working-tree diff against its target base. Add the user-visible outcome to `upcoming` even though the PR has not been created. Do not invent a PR number; a later run may add the known `pr` field.
- **Pre-release validation:** Rebuild the candidate list from the latest release tag through `origin/main` with `git log`, and compare it semantically with `upcoming`. Add omitted user-visible outcomes, remove duplicates or stale entries, improve wording and category placement, and leave out unmerged work.

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
