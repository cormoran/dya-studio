---
name: test-code-review
description: Review DYA Studio test quality for false passes, timing, duplication, and cost. Use only on explicit test-code review requests, never as routine feature or UI work; retain verified reusable findings.
---

# Test code review

Use only on explicit request for test-code quality. Review-only means findings without application/test edits; improve/fix requests permit bounded changes. A learning update belongs in this skill only when verified reusable knowledge exists, unless the user forbids writes. Preserve `agents/openai.yaml` explicit-only policy.

## Scope and baseline

Read AGENTS.md, docs/spec/README.md, AUTHORING.md, affected specs, and docs/TESTING_GUIDE.md. Read relevant [review knowledge](references/review-knowledge.md), verifying pointers against the current checkout. For broad work inventory Jest, E2E, helpers/mocks, discovery, and coverage configuration; otherwise stay targeted. Establish failures, skips, warnings, and dirty files before changes. Distinguish examined, inventoried, and untested areas. Delegate independent layers only if useful and authorized; keep shared config with one owner.

## Review contracts

For each candidate, name the contract, a regression it should catch, and the assertion that catches it. Prioritize false passes and isolation, then timing, duplicated setup, and maintenance. Remove/merge a case only when a retained assertion protects the same contract; preserve distinct failure, cancellation, persistence, boundary, capability, source/device, and protocol paths. Prefer outgoing payloads, readback, and transitions over existence/count checks, injected expected answers, or encoder/decoder self-validation. Require a positive baseline before absence/stop assertions.

Share fixtures locally and parameterize true variants while keeping unusual setup and the tested action visible. Investigate sleeps, conditional assertions, swallowed errors, vacuous arrays, skips, and copied implementations rather than deleting them by rule. Preserve meaningful accessibility, selected/changed state, viewport, and lifecycle guards; class checks alone do not prove geometry.

For hooks/providers, trace render → dependency → effect → state update. Unstable objects, arrays, codecs/options, or callbacks can cause repeated loads even behind a memoized wrapper. Check actual RPC/subscription/timer activity after baseline and unrelated rerenders, with fixtures preserving real identity behavior. Verify intended reload/reconnect still works; separate polling and bounded StrictMode setup/cleanup from loops. See the [lifecycle example](references/review-knowledge.md). Fix warning sources where practical rather than suppressing logs or loosening expectations.

## Verify changes

When editing, map removed/merged cases to retained or stronger assertions; investigate product defects separately. Run affected suites and appropriate aggregate/typecheck/build checks. Inspect discovery/coverage sets when changing them; listing E2E tests is not executing them. Use browser/firmware validation only when needed and in scope; report unexecuted paths. Follow repository delivery/PR/CI rules and cite reviewed spec IDs with no-change rationale for test-only work.

## Retain useful findings

After each requested review, add only verified durable guidance: decision/workflow rules here, repository traps and source pointers in the reference. Record mechanism, consequence, and where to recheck; remove superseded advice. Keep run logs, counts, PR status, temporary failures, and machine paths out. Do not update personal memory or other skills. If nothing reusable changed, say so. Validate frontmatter, links, formatting, and invocation policy; report findings, edits, retained coverage, checks, gaps, and any skill knowledge change.
