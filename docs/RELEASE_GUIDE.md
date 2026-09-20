# Release & Release Notes Guide

DYA Studio ships from `main` via a manually triggered release, and every release
is recorded in the in-app **Release Notes** page
(`https://studio.dya.cormoran.works/release-notes`).

## Versioning

Versions are date based: `YYYY.MM.DD.N`, where `N` starts at `0` and increments
for each additional release on the same day (e.g. `2026.04.01.0`,
`2026.04.01.1`). The version is decided by the release CI at dispatch time — you
never set it by hand.

## How a release happens

Start the **Release DYA Studio** workflow (`.github/workflows/release.yml`)
manually (`workflow_dispatch`). It:

1. Runs `node scripts/release.ts`, which resolves the next `YYYY.MM.DD.N` from
   today's date and existing git tags, then rewrites
   `src/i18n/releaseNotes.json`: the `upcoming` section becomes that version
   (dated today) and a fresh empty `upcoming` is prepended.
2. Pushes the change to a temporary `release/run-<workflow run id>` branch and
   opens a draft pull request to `main`. Repository Actions settings must allow
   GitHub Actions to create pull requests.
3. A maintainer marks the pull request ready for review. This human action
   starts the normal pull-request `Test and Build Web UI` workflow; wait for the
   required `build` check, review the promoted notes, and merge the pull
   request. This keeps the release subject to the same branch rules as every
   other change to `main`.
4. The merged release pull request starts the publish job, which builds and
   deploys the merged commit to Cloudflare Pages, then tags it
   `vYYYY.MM.DD.N`.
5. Creates a GitHub Release whose body links to the matching section of the
   release notes page (`/release-notes#YYYY.MM.DD.N`).

The temporary branch is retained until publishing succeeds. Before the pull
request is merged, rerun the original preparation run rather than starting a
new dispatch to resume the same version and pull request. If publishing fails,
rerun its failed job from the merged pull request's workflow run.

The version-resolution and JSON-rewrite logic lives in
`src/lib/releaseVersioning.ts` and is unit-tested
(`src/lib/__tests__/releaseVersioning.test.ts`).

## Editing release notes in a PR

**When your PR adds or changes something a user would notice, add an entry to
the `upcoming` section of `src/i18n/releaseNotes.json`.**

- The `upcoming` section is the first entry in `releases`, with
  `"version": "upcoming"`. **If it is missing, create it** at the top of
  `releases`:

  ```json
  {
    "version": "upcoming",
    "date": null,
    "changes": { "major": [], "minor": [], "patch": [] }
  }
  ```

- Add each change as an object under the right category with **both English and
  Japanese** text:

  ```json
  { "en": "Short user-facing description.", "ja": "利用者向けの短い説明。" }
  ```

- Optionally reference the pull request(s) with a `pr` field — a single number
  or an array. It renders as a `#123` link to GitHub on the release notes page:

  ```json
  { "en": "Added X.", "ja": "X を追加しました。", "pr": 153 }
  { "en": "Reworked Y.", "ja": "Y を刷新しました。", "pr": [150, 128] }
  ```

- Write from the user's perspective (what changed for them), not the
  implementation. Keep each entry to one sentence.

### Optional release summary

A release can carry an optional `summary` above the categorized changes — a
`lead` sentence and a few `highlights` — for a human overview of a big release.
Both are bilingual `{ "en": ..., "ja": ... }`. Add it to the `upcoming` section
(it carries into the release), and only when it adds value:

```json
{
  "version": "upcoming",
  "date": null,
  "summary": {
    "lead": {
      "en": "A big update across the board.",
      "ja": "全体的に大規模にアップデートしました。"
    },
    "highlights": [{ "en": "Added X.", "ja": "X を追加しました。" }]
  },
  "changes": { "major": [], "minor": [], "patch": [] }
}
```

Purely internal changes (refactors, test-only changes, CI tweaks, dependency
bumps with no user-visible effect) do **not** need an entry.

## Classifying a change: major / minor / patch

Put each entry under the category that matches its primary user impact:

- **major** — a new feature, a behavior change or meaningful behavior
  improvement, or a breaking change.
- **minor** — visual refinement or a small behavior change.
- **patch** — an internal, non-visible change, a small wording improvement, or
  another similarly small correction worth communicating.

When a change spans categories, use the category that best represents the
outcome users experience rather than the implementation's size.
