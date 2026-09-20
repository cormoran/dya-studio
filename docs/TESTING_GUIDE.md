# Testing Guide for Coding Agents

For browser-based exploratory testing, start with the [product specifications](spec/README.md) and [exploratory UI testing guide](spec/EXPLORATORY_TESTING.md). Unit tests below complement browser observations; neither should be reported as the other. Run `npm run spec:check` when editing specifications.

```bash
npm test                  # Run tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage
```

## Basic Pattern

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("MyComponent", () => {
  test("does something", async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Result")).toBeInTheDocument();
  });
});
```

## ZMK Mocking

```tsx
import { setupZMKMocks } from "@cormoran/zmk-studio-react-hook/testing";

let mocks: ReturnType<typeof setupZMKMocks>;
beforeEach(() => {
  mocks = setupZMKMocks();
});

// Success
mocks.mockSuccessfulConnection({ deviceName: "Test" });

// Error
mocks.mockFailedConnection("Error message");
```

## Rules

- Use semantic queries: `getByRole`, `getByLabelText`, `getByText`
- Use `userEvent`, not `fireEvent`
- Wait with `waitFor()` or `findBy*`
- Reset mocks in `beforeEach()`
- Test behavior, not implementation

## Keeping tests useful

- Keep distinct success, failure, cancellation, persistence, and boundary cases.
  Remove a case only when another assertion covers the same contract; a lower
  test count alone is not an improvement.
- Prefer assertions on observable values and effects over existence checks,
  copied implementation logic, or decorative CSS classes. Keep accessibility
  and functional layout contracts explicit.
- Share repeated setup within a suite; use `it.each` when only inputs and
  expected outputs differ. Avoid helpers that hide the action being tested.
- Wait for an observable completion signal. For debounce/timeout contracts,
  advance fake timers within `act` rather than sleeping for wall-clock time.
- Restore spies and global overrides after each test. Do not silence all console
  errors to hide missing environment mocks or unfinished React updates.

Coverage includes application code and excludes generated protobuf codecs,
mock modules, setup, and test helpers. A coverage percentage is not evidence of
assertion quality or browser/firmware behavior.

Renode product tests use `e2e/renode/playwright.config.ts`. Developer-guide image
generation is excluded from that suite and has a separate configuration. Run it
only with `npm run screenshots:developer-guide` in `e2e/renode`; existing assets
must be deliberately moved before recapturing. `playwright test --list` checks
discovery only and does not verify a firmware-backed flow.

## Patterns

**Context:**

```tsx
const mock = { isConnected: true };
render(
  <Ctx.Provider value={mock}>
    <Component />
  </Ctx.Provider>,
);
```

**Hooks:**

```tsx
const { result } = renderHook(() => useHook());
await act(async () => {
  await result.current.fn();
});
```

**Mock Components:**

```tsx
jest.mock("../../hooks/useHook");
const mockHook = useHook as jest.MockedFunction<typeof useHook>;
mockHook.mockReturnValue({ data: [] });
```

## ZMK Helpers

```tsx
import {
  setupZMKMocks,
  createMockZMKApp,
  ZMKAppProvider,
} from "@cormoran/zmk-studio-react-hook/testing";
```

## Files

```
components/
  Component.tsx
  __tests__/Component.test.tsx
```
