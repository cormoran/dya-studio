---
name: release-notes
description: Curate DYA Studio's Upcoming notes from merged changes before a release, not during individual feature or fix PRs.
---

# Release notes

Read [the release guide](../../../docs/RELEASE_GUIDE.md), `src/i18n/releaseNotes.json`, and [its schema](../../../src/i18n/releaseNotes.ts). Curate once after candidate changes merge and before **Release DYA Studio** is dispatched. This skill prepares notes; it does not publish a release.

## Establish the range

1. Identify the latest released version and matching `v<version>` tag. Record the reviewed `origin/main` commit and inspect `git log <tag>..origin/main`.
2. Read merged PR descriptions and relevant diffs; subjects alone do not establish user outcomes. Exclude unmerged work.
3. Reconcile outcomes with existing `upcoming` entries: add omissions, combine duplicates, remove stale items, and correct wording/categories.

Fetch missing history or tags as needed within the task's authorization. If the matching tag is unavailable, use the newest dated release record and available history, and report the uncertain boundary without claiming complete coverage.

## Edit Upcoming

Preserve released entries and the schema: `upcoming` stays first with `date: null` and all three category arrays. Use one short sentence per outcome, combining related PRs. Optional `pr` numbers or arrays support traceability.

- **major:** new features, meaningful behavior improvements, or breaking changes.
- **minor:** visual refinements or small behavior changes.
- **patch:** small wording or internal corrections worth communicating.

Choose the primary user impact. Omit commit mechanics, tests, CI, documentation-only work, and refactors with no release-relevant outcome. Include `en` and `ja` for new items, plus `zh` while surrounding Upcoming entries use it; translations must describe the same scope.

## Deliver

Check schema, semantic duplicates, translations, and preservation of released entries. For JSON changes, run focused formatting and `npm run build`. Report the reviewed range, PR/commit evidence, internal-only exclusions, and missing evidence.

Submit one dedicated notes PR and have it merged after checks/review before release dispatch. If more changes merge, reconcile only the additional range into that preparation; avoid competing notes PRs. Do not dispatch the release workflow.
