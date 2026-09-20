---
name: test-code-review
description: Review and improve DYA Studio test code for redundancy, false positives, unreliable timing, and maintenance cost. Run only when the user explicitly requests this skill or a test-code quality review; never as an automatic step of feature work, bug fixing, or UI exploration. Update the skill with verified reusable findings after each requested review.
---

# Test Code Review

Review the requested test scope and preserve the distinct contracts it protects.
Use this skill only on explicit request. Ordinary test additions, CI failures,
product code reviews, and browser regression checks do not activate it.

## Scope and evidence

Read the repository [AGENTS.md](../../../AGENTS.md),
[specification index](../../../docs/spec/README.md),
[authoring standard](../../../docs/spec/AUTHORING.md), and affected specifications.
Use [the testing guide](../../../docs/TESTING_GUIDE.md) for local conventions.
Before reviewing the relevant test layers, read the matching entries in
[review knowledge](references/review-knowledge.md); verify them against the current
checkout rather than assuming the same implementation still exists.

- Distinguish review-only from an instruction to improve/fix tests. Report findings
  without editing application/tests in review-only mode. The learning update below
  is part of this skill unless the user explicitly requests no writes.
- For a broad review, inventory Jest suites, E2E specs, helpers/mocks, discovery,
  and coverage configuration. For a targeted request, stay within its scope.
- Establish the relevant baseline, including failures, skips, warnings and dirty
  files. Keep an account of areas examined versus merely inventoried or untested.
- If useful and authorized, divide independent layers among agents with disjoint
  file ownership. Keep shared configuration and final integration with one owner.
  Follow the available coordination skill; do not prescribe a model or launch
  extra agents merely because this skill was invoked.

## Review decisions

For each candidate, identify the contract, a concrete regression it should catch,
and the assertion that catches it. Prioritize false passes and test isolation,
then unreliable timing, duplicated setup, and maintenance-only simplifications.

- Delete or merge a case only when another retained assertion protects the same
  contract. Preserve failure, cancellation, persistence, boundary, capability,
  source/device, and protocol differences even when their setup looks similar.
- Prefer actual request payloads, readback and state transitions to existence/count
  checks, expected data injected by the test, or two implementations validating
  each other. Require a positive baseline before absence or stop assertions.
- Share repeated fixtures locally and parameterize true input/output variants.
  Keep unusual setup and the action under test visible; avoid a new abstraction
  whose complexity exceeds the duplication it removes.
- Treat sleeps, conditional assertions, swallowed errors, vacuous array checks,
  skipped cases and implementation-copying helpers as investigation leads, not
  automatic deletion rules. Verify whether timing or internal identity is itself
  a published contract.
- Preserve meaningful accessibility, selected/changed state, viewport and lifecycle
  checks. A class assertion is not browser geometry evidence, but removing it
  without replacement may discard an existing regression guard.
- Fix the source of test warnings where practical. Do not globally suppress logs,
  loosen expectations to current behavior, or claim unexecuted paths passed.

## Implement and verify

When improvements are requested, make bounded changes with an explicit coverage
mapping: removed/merged case → retained or stronger assertion. Investigate product
defects separately; a test-quality request does not justify silently changing a
product contract or accepting a known defect.

Run affected suites, then the appropriate aggregate tests and repository checks.
New helpers can enter the application typecheck even when test files do not.
For discovery/coverage edits, inspect the resulting file sets. Listing E2E tests
does not execute them; keep asset generation separate from product assertions.
Use the relevant browser/firmware skill only if that validation is actually needed
and in scope. Do not repeatedly rerun passing checks without a new change or concern.

Follow current repository delivery instructions for commits, PRs and CI monitoring.
Include reviewed spec IDs and why no spec change is needed for test-only work.
Report substantive findings, changes, retained coverage, verification and remaining
gaps. Test counts and coverage percentages are supporting facts, not quality goals.

## Update this skill after the review

Before finishing each requested run, review what was learned and update this
repository skill in the same change when there is durable new knowledge:

- Put reusable decision/workflow corrections here; put repository-specific traps
  and useful source pointers in `references/review-knowledge.md`.
- Record the observed mechanism, why it matters, and where to recheck it. Distinguish
  verified findings from hypotheses and remove superseded or duplicate guidance.
- Preserve the explicit-only invocation policy in `agents/openai.yaml`. Review
  findings do not authorize broader scope, automatic future runs, or weakened checks.
- Keep raw logs, run counts, PR status, machine paths and temporary failures out of
  the skill. Do not update personal memory or other repository skills as a side effect.
- If nothing reusable changed, say so rather than adding filler. If the user forbids
  writes or permissions block the update, report that limitation without claiming
  the learning was saved.

Validate skill frontmatter, links, formatting and invocation policy after an update.
In the completion report, state what knowledge changed and distinguish that from
the test-code changes.
