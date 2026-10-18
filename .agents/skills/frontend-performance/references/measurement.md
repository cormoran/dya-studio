# Measurement methods

## Browser setup

When available, use Chrome DevTools MCP traces/insights for attribution; inspect live schemas and pass `pageId` on every action, snapshot, eval, and trace. Create a dedicated `isolatedContext` page and use fresh snapshot UIDs. Orca's embedded page and MCP page may be different browsers/builds.

Separate MCP client processes need separate Chrome profiles; page isolation alone does not avoid the default-profile launch lock. For the default Codex npx server, preserve configured args and add `--isolated` through a process-local override, for example `-c 'mcp_servers.chrome-devtools.args=["chrome-devtools-mcp@latest","--isolated"]'`. Confirm installed support in [official configuration](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/configuration.md). Do not edit global settings or kill another session's browser. Check startup before timing; tool failure is not a reasoning-effort failure.

For editing, start trace with `reload: false, autoStop: false`, act through real UI, then stop and inspect returned insight sets. Use `reload: true` only for a separate navigation study that may reset/reconnect. `performance_analyze_insight` takes insight-set ID and name; INPBreakdown separates processing/presentation. Trace INP is a lab observation, not field data or async completion. Lighthouse from this tool excludes performance.

The passive [probe](../scripts/browser-probe.js) installs bounded Event Timing/long-task observers. Read its source, evaluate a wrapper through the documented browser eval, call `window.__dyaPerf.reset(label)` before one action, `read()` after it settles, and `stop()` at cleanup; reinstall after navigation/reload. Prefer `waitForStableDom: false` for reads. Save raw JSON when possible. The probe observes but never replaces UI actions or measures earlier events/async RPC completion. Record browser version, throttling, and foreground state. If trace/heap export is denied, stop without `filePath` and retain inline insights; report export blocked rather than repeatedly trying paths.

## Metrics and samples

| Question           | Evidence                                                                                | Boundary                                                         |
| ------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Initial delivery   | production raw/gzip bundle and Resource/Navigation Timing                               | gzip estimate is not transfer bytes; localhost is not WAN        |
| Immediate response | Event Timing grouped by nonzero `interactionId` and trace                               | pointerdown/up/click in one interaction are not separate samples |
| Async completion   | same page-clock trigger to explicit ready/dirty/saved postcondition or diagnostic marks | spinner, DOM mutation, and rAF do not prove paint or flash       |
| CPU/render         | trace tasks/layout/paint; profiling-build React Profiler                                | render time is not total interaction latency                     |
| Idle/resources     | fixed foreground idle trace, repeated cycles, post-GC heap/retaining paths              | DOM count or one heap sample is no leak proof                    |
| Device wait        | RPC queue/send/response and UI completion                                               | separate queue, wire, flash; do not add overlapping durations    |

Use one page `performance.now()`/event time origin; shell/CLI elapsed includes tool and agent delay. MutationObserver gives a DOM completion proxy; rAF runs before paint and double-rAF is only a frame proxy. Define the exact postcondition and observer/poll overhead. For Save, arm only when dirty and Save enabled; completion requires Saved and disabled. Readback separately verifies correctness. If instrumentation cannot measure async duration, report it unmeasured.

Event Timing's 16 ms threshold/quantization means absent entries are unavailable, not zero. Long tasks exceed 50 ms; absence does not exclude jank. For each nonzero interaction ID use its maximum duration. A few local samples are not field INP or p75 Core Web Vitals. Continuous pointermove/wheel latency needs a frame/layout/paint trace, not absent Event Timing entries.

Record first use separately from warm use. Aim for one labeled first sample and at least five warm repetitions per operation; report raw values, median/range, and censored/missing values, not p95 from five. Define cold HTTP cache, module/page lifetime, storage, and device caches separately; browser reload does not clear them. Reset storage only in a disposable origin/profile.

Maintain an operation ledger **while acting**: label, real control, page-clock start/end, interaction ID/duration, observed end state. Reset immediately before one action (for example editor open); read/save the probe before closing or starting the next action. Search, apply, Save, and Reload each need separate windows. The probe's `read()` returns `label`, `windowStart`, `now`, raw `records`, and maximum-duration `interactions` within the window, but cannot identify controls. Review one valid sample before repeating. If attribution is lost or late events contaminate the next window, mark samples unusable and rerun only that operation; never guess from the slowest group or the last N events.

At least observe idle and repeated cycles for resources. Keep page sets fixed because DYA Studio retains visited tabs. If heap/CPU access fails, DOM counts are structural proxies only. Avoid concurrent timing workers, background tabs, profiler overhead, and one-sided CPU throttling. Label realistic-schema large fixtures synthetic; small Demo data cannot prove scale.

## Attribution and change guards

Measure critical-path work first. Lazy loading trades startup against first open. Caches need device/firmware/capability/layout identity, invalidation, and bounds. Virtualization must retain focus, keyboard navigation, and search. Debouncing device writes changes semantics. Deferred rendering can improve responsiveness without reducing total work. Do not move required completion outside the window to claim a win.

React Compiler is enabled: check actual hot components and compiler coverage before recommending blanket `memo`/`useMemo`. Compare profiling builds to profiling builds and final user latency on uninstrumented production.

Reference: [React Profiler](https://react.dev/reference/react/Profiler), [React Compiler](https://react.dev/learn/react-compiler/introduction), [interaction phases](https://web.dev/articles/optimize-inp), [Event Timing](https://www.w3.org/TR/event-timing/), [Chrome memory diagnosis](https://developer.chrome.com/docs/devtools/memory-problems). Recheck APIs when tooling changes.
