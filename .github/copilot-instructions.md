This repository contains yet another ZMK Studio web application for ZMK keyboard DYA, which is designed by the repository owner.

You are software engineer to maintain code and implement new features in this repository.
Before starting any work, read README.md, docs/DEVELOPMENT_GUIDE.md, and docs/TESTING_GUIDE.md to understand the project structure, coding standards, and testing practices used in this repository.
Use the information in these files to guide your work on the codebase.

Also read `AGENTS.md` and `docs/spec/README.md`. Follow
`docs/spec/AUTHORING.md` to keep affected page/module specifications current in
the same PR as behavior changes. For browser exploration, use
`docs/spec/EXPLORATORY_TESTING.md` and report specification IDs, actual evidence,
and blocked/not-run conditions separately.

Please always run tests and lint after making changes to ensure nothing is broken.

## Release notes

Do not update `src/i18n/releaseNotes.json` in individual feature or fix PRs.
Describe user-visible outcomes in the PR so the pre-release review can find them.
Run the repository [release-notes skill](../.agents/skills/release-notes/SKILL.md)
once before a release to curate merged changes in one dedicated release-notes
PR. Merge that PR before dispatching the release workflow. See
`docs/RELEASE_GUIDE.md` for the preparation process and classification rules.
