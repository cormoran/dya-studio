# Repository review knowledge

Recheck these paths before applying past findings; implementation and test contracts can change.

## Hooks and timing

- [Runtime input processor tests](../../../../src/hooks/__tests__/useRuntimeInputProcessor.test.tsx): mount may request processor and layer data. Route replies by decoded request, not call order. Assert outgoing scale/rotation without injecting the expected notification; test notification handling separately.
- [Unlock guide](../../../../src/hooks/useUnlockGuide.ts): a fresh `useZMKApp.findSubsystem()` descriptor previously retriggered `getSnapshot` after `loadFastKeymap` set state. Depend on connection-scoped primitives, while keeping session/capability changes reactive. [Lifecycle regression](../../../../src/hooks/__tests__/useUnlockGuide.test.tsx) uses real hooks/codecs and fresh descriptors; after load/rerender, assert RPCs settle, then change connection/index and verify reload. A fixed mock descriptor misses this loop. In browser checks, compare idle RPC counts and separate intentional polling.
- [Sensor tests](../../../../src/components/__tests__/SensorRotationConfig.test.tsx) and [unlock tests](../../../../src/contexts/__tests__/StudioUnlockContext.test.tsx): advance fake time inside async `act`, use `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })`, and check before/at boundaries with distinct sensor values/deadlines.
- [OAuth tests](../../../../src/lib/abyss/__tests__/abyssOAuth.test.ts): native BroadcastChannel delivery may lose a race to fake clock expiry. Retain real delivery for mismatched-state coverage; fake time can cover isolated timeout/cancellation.
- [Reconnect cancellation](../../../../src/components/__tests__/DeviceConnection.test.tsx) waits for late port closure; [macro auto-load](../../../../src/hooks/__tests__/useRuntimeMacro.test.tsx) waits for loaded settings. Assert completion, not merely request start or an already-true negative.

## False-pass patterns

- Empty arrays pass `every`; absent rows pass optional-field absence; a stream that never started passes no-further-events. Establish present/nonempty/started baselines in [custom settings](../../../../src/lib/transport/__tests__/demo-custom-settings.test.ts) and [PMW disconnect](../../../../src/lib/transport/__tests__/demo-pmw3610.test.ts).
- Persistence needs a nondefault saved value. Pagination needs item identities/order and a real nonzero offset, not just length. Recheck [OAuth return](../../../../src/lib/abyss/__tests__/abyssOAuth.test.ts), [keymap list](../../../../src/lib/abyss/__tests__/abyssKeymapList.test.ts), and [watchdog](../../../../src/lib/transport/__tests__/demo-watchdog.test.ts).
- Encoder/decoder round trips can hide paired bugs: retain independent [mouse wire vectors](../../../../src/lib/__tests__/mouseEncoding.test.ts). [Demo transport](../../../../src/lib/transport/__tests__/demo.test.ts) covers escaped bytes across real stream chunks; do not preserve a skip based on stale TransformStream comments.
- [Trackball rotation tests](../../../../src/pages/__tests__/TrackballPage.test.tsx): select controls within the labelled section and assert actual state, not existence of an unrelated ordinal switch.

## Environment and coverage

- [Application tsconfig](../../../../tsconfig.app.json) excludes test files, not every helper directory. A plain `.ts` helper with global `jest` can pass Jest and fail build; use typed async no-ops when tracking is unnecessary or explicit test types.
- An idle history fixture can isolate unrelated IndexedDB effects in page tests, but cannot prove page-to-history integration. [Version history units](../../../../src/lib/versionHistory/__tests__) cover their own logic, not all callers. Do not hide unfinished effects with global console suppression.
- [Jest coverage](../../../../jest.config.ts) excludes generated codecs and test fixtures; keep new fixture locations aligned. [ESLint](../../../../eslint.config.js) excludes generated coverage reports.
- [Renode product config](../../../../e2e/renode/playwright.config.ts) excludes developer-guide captures; [screenshot config](../../../../e2e/renode/playwright.screenshots.config.ts) is opt-in. Inspect both discovery sets after edits; do not generate images to verify listing.
- Preserve protocol/source variants, meaningful layout guards, and callback identity tests tied to observed lifecycle regressions; similar setup can protect different contracts.
