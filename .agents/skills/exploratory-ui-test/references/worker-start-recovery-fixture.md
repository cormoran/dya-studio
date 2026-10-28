# Bounded worker-start recovery fixture

This is the forward-test charter for [#357](https://github.com/cormoran/dya-studio/issues/357),
an Orca integration workflow finding. It changes no DYA Studio requirement and
defines no app spec IDs. Read the [integration guide](../../../../docs/spec/browser-tools/orca.md#worker-start-が-ready-表示と異なる結果を返す場合)
and [evidence protocol](evidence-protocol.md) first. The installed CLI's recovery
guide, runtime Task/Dispatch state, effects and residual resources are authoritative;
this document is not an implementation of Orca's state machine.

## Boundary and execution modes

Do not induce a readiness race, restart Orca, cancel unknown work, or create
another worker to reproduce the issue. A displayed Ready TUI and outstanding
background sessions can coexist with readiness timeout; they do not establish
its cause. A recovered worker's UI coverage/restoration needs a separate audit.

- **Local executable regression:** run
  `node --test .agents/skills/exploratory-ui-test/scripts/*.test.mjs`.
  The capture tests exercise the real receipt runner with ordinary subprocesses:
  delayed output, completion, exit codes, unfiltered streams, stdin isolation and
  overwrite refusal. Any failed-start JSON in that test is explicitly synthetic,
  not a runtime receipt or a readiness/retry/cleanup implementation test.
- **Recorded-receipt rehearsal:** a reviewer applies every decision row below
  to retained raw receipts from an authorized run, without executing their
  commands. Label this rehearsal and any synthetic/missing branch separately;
  it proves review of those artifacts, not a new live run.
- **Live forward acceptance:** coordinator authorization and existing terminals
  are required. Observe an incidental completed failure in an already authorized
  bounded Task, then recover that same Task only as permitted below. Do not
  manufacture refusals, unknown outcomes or timeouts. Branches that do not occur
  remain not-run; the complete live matrix cannot be claimed from a happy path.

## Freeze evidence before deciding

Keep a local temporary run directory; never commit raw runtime/user receipts.
Save CLI version, selected executable, version-matched `orca-cli`/`orchestration`
recovery guides and `worker-start --help`. Use `capture-command.mjs` with one new
directory per real command; retain complete caller results and every same-session
poll. A capture `result.json` proves subprocess completion only. Read inner
`ok`, state/error, effects and recovery before deciding what happened.

Maintain these ledgers with raw evidence paths, never guessed IDs or fields:

| Ledger             | Required facts                                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assignment         | Run ID, original Task ID/spec, exact workspace/host, coordinator authorization and original failed Dispatch ID (if issued)                                                                                     |
| Attempts           | Each request ID, Dispatch ID, `--retry-of` predecessor, caller session/exit, state/stage/failedStage/lastError, input effect, residual resources and recovery text; explicit absent/unknown for missing fields |
| Terminal ownership | Exact handle/workspace/host, creation receipt or pre-existing owner, actual model/effort and `--profile orca` provenance, active Dispatch, last fresh read/wait, retain/reuse/release decision                 |
| Pending sessions   | Each background caller `session_id`, command/request/ask ID, owner, running/completed/unknown, last complete receipt and next recovery action; keep ask timeout/resume on the same message ID                  |
| Settlement/cleanup | Current Dispatch, report/review request, actual ACCEPT or SETTLE FAILED reply, valid worker_done (where applicable), release result/processAction, close result and fresh list readback, remaining resources   |

Do not copy a terminal's Ready banner into a runtime readiness field. Record the
banner, runtime wait timeout and background count independently. No observed
`dispatch_input` effect must be distinguished from an explicitly unperformed
effect; missing data cannot prove no input.

## Required decision rows

Copy all rows into the run report before review. For each record mode
(`local-synthetic`, `recorded-rehearsal`, `live`), status (`pending`, `pass`,
`blocked`, `not-run`), raw paths, observed result and reviewer disposition.
These are workflow rows, not app coverage/spec IDs. Unsupported or unexecuted
branches never pass, and no aggregate live pass is allowed while a row is pending,
blocked or not-run.

| Case                                   | Exact evidence and acceptance                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Early empty output                     | Original caller receipt has a running session and no completed result. Poll that exact session to its exit; retain every poll and final inner receipt. No duplicate start, input or failure declaration occurs while running. The local subprocess regression covers capture mechanics only.                                                                                                                                                                                                      |
| Refusal                                | Retain completed error code/nextSteps and read-only Task/Dispatch state. Distinguish preflight refusal without a Dispatch from a recorded failed attempt. Do not create a fresh Task, pretend input was delivered, or retry unchanged. If absent in the run, review recorded evidence or mark not-run.                                                                                                                                                                                            |
| Unknown or undelivered not proven      | Retain outcome_unknown, lost receipt or accepted-but-unconfirmed input and runtime inspection. With a request ID, inspect `request-show`; pending replay uses only the original command and same `--retry-request` under the installed contract. Completed requests are read, not rerun; absent receipt is not no-effect proof. Without positive failed/stopped authority, there is no replacement/input/cleanup. No new Task or blind resend is allowed.                                         |
| Completed readiness failure, no input  | Full caller completion plus original stdout and runtime state identify the same Task/failed Dispatch, agent_readiness/timeout, effects explicitly showing no dispatch_input, residualResources and recovery. Retain terminal Ready/model/effort readback, actual wait timeout and pending-session inventory separately. No product failure or UI pass is assigned. Missing no-input proof moves to the unknown row.                                                                               |
| Liveness                               | Run-scoped fleet projection, relevant execution-host worker-show observation, terminal read and their source/reason are recorded separately. Apply installed precedence when they disagree. Unverifiable, null agentWait, elapsed time, or unchanged tail never becomes exited and never authorizes retry/stop/abandon/release. Only the runtime's proven failed/stopped attempt permits the retry row.                                                                                           |
| Same Task, another existing terminal   | Target's previous Dispatch has accepted settlement and no active work; ownership, workspace/host, actual model/effort and runtime readiness are verified. Original failure permits retry. Capture argv with original `--task`, latest failed `--retry-of`, explicit `--worktree` and `--terminal`; no --spec, new agent, new Run or fourth browser worker. Retain all failed predecessor IDs and the successor Dispatch; read back runtime Task identity and input receipt/worker acknowledgment. |
| Retry refused or failed again          | Preserve new completed refusal/failure and inspect the same Task. No blind additional start: use installed recovery/nextAction only. After three consecutive start failures/circuit-break, report failure without a fresh Task/Run or unrelated Dispatch. This is a review branch, not a request to generate three real failures.                                                                                                                                                                 |
| Accepted settlement                    | Same-task recovery does not complete the original browser charter. Collect report/raw receipts, pending sessions, coverage/restoration result and current-dispatch review. CONTINUE, an old reply, timeout or successful send is not acceptance. Only actual ACCEPT/SETTLE FAILED plus valid settlement allows the terminal's next-owner/release decision.                                                                                                                                        |
| Owned retained custom-profile terminal | Creation receipt positively ties this run to the exact handle. Accepted settlement and completed release show retained external terminal with processAction none. Fresh runtime/read proves idle, no active Dispatch, no owner takeover and no outstanding sessions. Under the installed contract, close that single handle; require positive ptyKilled true and absence from a fresh same-workspace terminal list. No bulk close; record remaining handles untouched.                            |
| Cleanup refused/uncertain or not owned | A pre-existing, setup, coordinator, taken-over, active or ownership-unknown terminal stays untouched. Pending/unknown release follows its exact recovery; no terminal-close substitution. Missing close success or fresh absence is incomplete cleanup, even if the terminal looks gone. Preserve exact residuals and escalate.                                                                                                                                                                   |

## Safe retry and acceptance record

Only after the completed-failure and liveness rows authorize it, the coordinator
may capture this version-checked form (substitute runtime-issued values):

```sh
orca orchestration worker-start \
  --task <original-task-id> --retry-of <failed-dispatch-id> \
  --worktree <target-terminal-workspace> --terminal <other-existing-handle> \
  --json
```

Record the returned Task/Dispatch and actual `state: ready`,
`stage: input_accepted`, `turnStart: observed` evidence if supplied by that runtime;
older/missing fields stay unknown until supported inspection establishes the
fact. Never send terminal input merely to test delivery. Failed starts that
created an owned supervised terminal use the runtime's worker-release recovery;
the manual external-terminal close row cannot override it.

The reviewer reads the raw evidence and every row, verifies one Task across the
attempt chain and reconciles pending sessions/owned terminals before replying to
the current review ask. Record the actual request ID, reply and acknowledgment.
Report separately: local tests executed; receipt rehearsal executed; live cases
executed; cases not-run; retained resources and next owner. A synthetic-only run
must say **live readiness failure, same-Task retry and terminal cleanup not
executed**. It cannot establish an Orca fix, future worker compliance, app UI
coverage, browser paint, hardware or cloud persistence.
