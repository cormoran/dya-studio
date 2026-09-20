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
