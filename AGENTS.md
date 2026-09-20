# Agent instructions

## Product specifications

Before changing user-visible behavior or testing the UI, read [docs/spec/README.md](docs/spec/README.md).
For implementation and documentation changes, follow [the authoring standard](docs/spec/AUTHORING.md) and read the affected page/module specifications. Update them in the same PR when behavior changes, including errors, persistence, availability, and shared consumers. For internal-only changes, identify the reviewed spec IDs and explain why no specification update is needed in the PR.
For browser exploration, follow [the exploratory testing guide](docs/spec/EXPLORATORY_TESTING.md). Report observed evidence and untested conditions separately; never mark unsupported or unexecuted scenarios as passed. Do not infer acceptance of a defect from its presence in the current code.

For coordinating AI-agent browser exploration, use the repository [exploratory-ui-test skill](.agents/skills/exploratory-ui-test/SKILL.md) to choose change-focused versus whole-app coverage and subagent models. Large, high-regression-risk changes may justify a bounded proactive run; do not launch paid subagent tests for every small change.

## Delivery

Create a pull request to origin after finishing when origin is a cormoran repository. Commit lint/format changes as well. Monitor PR CI until it passes; resolve failures and merge conflicts.
