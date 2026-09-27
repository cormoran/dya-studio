---
name: pull-request
description: Create or revise DYA Studio pull requests using the repository PR template and a concise, human-readable description. Use when preparing a PR or improving its title or body.
---

# Creating and improving pull requests

Help a reviewer seeing the change for the first time quickly understand what changed, why it matters, and what was verified.

## Review the template and changes

- For both creation and editing, read the [PR template](../../../.github/pull_request_template.md) and use its headings, release notes checkbox, and CLA. Do not replace the template with a custom body.
- Read the full diff against the target base and align the title and description with the final changes. When editing an existing PR, also review its current body and CI results.
- Follow the delivery and specification requirements in [AGENTS.md](../../../AGENTS.md). Check the release notes checkbox only after verifying the actual diff; do not claim a missing entry was added.

## Lead with the important points

- Start `Description` with concise bullets covering the main changes. Usually aim for 2–4 bullets, adjusted to the size of the change.
- Make each bullet convey one point. Prioritize the user-visible outcome and why it is needed; avoid long paragraphs or bullets combining several topics.
- Use a short title describing the concrete change. Include abbreviations, internal symbols, and implementation terms only when they help the reviewer assess it.
- Make compatibility impacts, breaking changes, and important limitations clear near the top.
- Omit work chronology, trial and error, exhaustive file lists, and repeated explanations. When improving an existing PR, consolidate its content while preserving important facts and untested conditions.

## Put validation and details below the summary

- When useful, add `### Validation` below the summary bullets and briefly state the checks performed and their results. Distinguish unexecuted, failed, and skipped checks from successful ones.
- If finer detail is necessary, add a section such as `### Technical details` further down. Put formulas, model assumptions, protocol details, and detailed verification conditions there. For longer content, use `<details>` or links to existing specifications and CI results.
- Keep detail sections focused on information needed for review. Avoid dumping raw logs, every test name, long commit hashes, or environment IDs.
- Distinguish source comparisons, Demo evidence, and physical-device evidence. Passing CI does not prove hardware behavior or persistence after a power cycle.

## Publish and verify

- Before publishing, reread the body to ensure the opening explains the main change, each bullet is easy to read once, and detail sections do not repeat the summary.
- When using `gh`, write the body to a temporary file and use `gh pr create --body-file` or `gh pr edit --body-file` to preserve newlines and Markdown.
- After publishing, retrieve the body again and check its headings, bullets, and checkbox. Follow AGENTS.md for CI monitoring and failure or conflict resolution after PR creation. Do not assume a body-only edit reran CI.
