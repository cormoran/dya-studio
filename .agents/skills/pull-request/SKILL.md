---
name: pull-request
description: Create or revise DYA Studio PRs using the repository template, concise descriptions, and verified results.
---

# Pull requests

Read the [PR template](../../../.github/pull_request_template.md), [AGENTS.md](../../../AGENTS.md), and full diff against the target base. For an existing PR, also read its body and current CI results.

## Write for the reviewer

- Use the template headings, release-notes checkbox, and CLA. Match the title and body to the final diff.
- Lead `Description` with the concrete problem and resulting behavior, usually in 2–4 short bullets. Put compatibility changes and material limitations near the top.
- Include only details needed to assess the change. Omit work chronology, exhaustive file lists, logs, and repeated explanations.
- Summarize executed checks and results under `### Validation` when useful. Keep failed, skipped, and unexecuted checks explicit; CI, source inspection, Demo, and physical-device evidence prove different things.
- For UI changes, report the themes, components, and states actually checked against [theme coverage guidance](../../../docs/spec/EXPLORATORY_TESTING.md#テーマの一貫性確認). CSS inspection does not establish a visual pass. Scale testing to the change.
- Follow AGENTS.md for specification updates. Feature/fix PRs describe user outcomes without editing `releaseNotes.json` or invoking release-note curation. Check the policy box only after inspecting the diff; dedicated pre-release notes PRs are the exception.

## Publish

Write the body to a temporary file and use `gh pr create --body-file` or `gh pr edit --body-file`. Retrieve the published body to verify Markdown and checkboxes. Follow AGENTS.md for CI monitoring and conflict resolution; a body-only edit may not rerun CI.
