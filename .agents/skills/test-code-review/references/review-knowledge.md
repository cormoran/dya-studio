# Repository review knowledge

These are decision aids learned from test-code review. Recheck the linked code
before applying them; they are not permanent assertions about implementation.

## Hooks, notifications and timing

- In [useRuntimeInputProcessor tests](../../../../src/hooks/__tests__/useRuntimeInputProcessor.test.tsx),
  mount can issue both processor and layer requests. Route mock replies by decoded
  request rather than assuming a fixed call order. Assert outgoing scaling/rotation
  values without injecting a notification containing the desired answer; otherwise
  the notification can hide a broken write. Keep notification handling as separate
  behavior coverage.
- React debounce/cooldown tests should advance virtual time inside asynchronous
  `act`, with `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })`.
  Check just before and at the boundary, and use distinct values/deadlines for
  independent sensors. See [sensor tests](../../../../src/components/__tests__/SensorRotationConfig.test.tsx)
  and [unlock tests](../../../../src/contexts/__tests__/StudioUnlockContext.test.tsx).
- Do not replace every real wait with fake timers. [OAuth tests](../../../../src/lib/abyss/__tests__/abyssOAuth.test.ts)
  use Node's native BroadcastChannel; advancing a fake clock can expire the callback
  before real message delivery. Retain real delivery for the mismatched-state
  scenario, while isolated timeout/cancellation boundaries can use fake time.
- Wait for completion, not merely request start or an already-true negative state.
  [Reconnect cancellation](../../../../src/components/__tests__/DeviceConnection.test.tsx)
  waits for late port closure before asserting no connection was created;
  [macro auto-load](../../../../src/hooks/__tests__/useRuntimeMacro.test.tsx) waits
  for loaded settings. Recheck effects before keeping comments about old timers.

## Assertions that can pass without the promised behavior

- An empty array passes `every`, an absent row passes an optional-field absence
  assertion, and a stream that never started passes a no-further-notifications
  check. Require a nonempty/present/started baseline. Examples:
  [custom settings](../../../../src/lib/transport/__tests__/demo-custom-settings.test.ts),
  [PMW disconnect](../../../../src/lib/transport/__tests__/demo-pmw3610.test.ts).
- Save a nondefault value when testing persistence/consumption. Returning the
  default cannot establish that a save occurred. Compare paginated item identities
  and order, not just length; an offset test must actually request a nonzero offset.
  See [OAuth return path](../../../../src/lib/abyss/__tests__/abyssOAuth.test.ts),
  [keymap listing](../../../../src/lib/abyss/__tests__/abyssKeymapList.test.ts), and
  [watchdog pagination](../../../../src/lib/transport/__tests__/demo-watchdog.test.ts).
- Encoder/decoder round trips can hide matching bugs. Keep independently specified
  wire vectors, as in [mouse encoding](../../../../src/lib/__tests__/mouseEncoding.test.ts).
  [Demo transport](../../../../src/lib/transport/__tests__/demo.test.ts) also exercises
  escaped bytes split across chunks using the real streams from setupTests. A stale
  comment claiming TransformStream is unavailable is not a reason to keep a skip.
- Scope controls by their labelled section and assert their actual state.
  [Trackball rotation tests](../../../../src/pages/__tests__/TrackballPage.test.tsx)
  formerly found an unrelated ordinal switch and checked only its existence.

## Environment, coverage and validation limits

- [Application tsconfig](../../../../tsconfig.app.json) excludes test filenames but
  not every helper directory. A new plain `.ts` test helper using a global `jest`
  can pass Jest while failing the production build. Prefer simple typed async
  no-ops when call tracking is unused; otherwise provide explicit test types.
- Page tests that do not assert history can use an idle history fixture to isolate
  incidental IndexedDB effects. This does not establish page-to-history integration
  coverage. [Version store/diff tests](../../../../src/lib/versionHistory/__tests__)
  cover their own units, not every hook/caller interaction. Do not claim otherwise
  or silence all console errors to hide unfinished effects.
- [Jest coverage](../../../../jest.config.ts) excludes generated protobuf codecs,
  mocks, setup and test helpers. Keep those exclusions aligned with new fixture
  locations; [ESLint](../../../../eslint.config.js) excludes generated coverage reports.
- [Renode product configuration](../../../../e2e/renode/playwright.config.ts) excludes
  developer-guide captures. [Screenshot configuration](../../../../e2e/renode/playwright.screenshots.config.ts)
  is opt-in through the guarded capture script. Verify both discovery sets when
  changing them. Do not run image generation merely to validate discovery.
- Preserve protocol/source variants, meaningful layout guards, and stable callback
  identity tests tied to a demonstrated lifecycle regression. Superficially similar
  tests can cover different firmware, persistence, or unlock behavior.
