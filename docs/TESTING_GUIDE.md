# Testing Guide

Quick guide for writing tests in DYA Studio.

## Running Tests

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

## Quick Start

### Basic Test Structure

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

### Testing with ZMK Studio

```tsx
import { setupZMKMocks } from "@cormoran/zmk-studio-react-hook/testing";

describe("DeviceConnection", () => {
  let mocks: ReturnType<typeof setupZMKMocks>;

  beforeEach(() => {
    mocks = setupZMKMocks();
  });

  test("connects successfully", async () => {
    mocks.mockSuccessfulConnection({ deviceName: "My Keyboard" });

    render(<DeviceConnection />);
    await user.click(screen.getByRole("button", { name: /connect/i }));

    await waitFor(() => {
      expect(screen.getByText("My Keyboard")).toBeInTheDocument();
    });
  });

  test("handles errors", async () => {
    mocks.mockFailedConnection("Connection failed");

    render(<DeviceConnection />);
    await user.click(screen.getByRole("button", { name: /connect/i }));

    await waitFor(() => {
      expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
    });
  });
});
```

## Key Principles

1. **Use semantic queries**: `getByRole`, `getByLabelText`, `getByText` (avoid `getByTestId`)
2. **Use `userEvent`** instead of `fireEvent` for realistic interactions
3. **Wait for async updates** with `waitFor()` or `findBy*` queries
4. **Reset mocks** in `beforeEach()` using `setupZMKMocks()`
5. **Test user behavior**, not implementation details
6. **Organize tests** into logical groups: Initial State, User Interactions, Error Handling

## Common Patterns

### Testing Context

```tsx
const mockContext = { isConnected: true, deviceName: "Test" };

render(
  <ConnectionContext.Provider value={mockContext}>
    <MyComponent />
  </ConnectionContext.Provider>,
);
```

### Testing Hooks

```tsx
const { result } = renderHook(() => useMyHook());

await act(async () => {
  await result.current.doSomething();
});

expect(result.current.value).toBe(expected);
```

### Mocking Components

```tsx
jest.mock("../../hooks/useBLEProfiles");
const mockUseBLEProfiles = useBLEProfiles as jest.MockedFunction<
  typeof useBLEProfiles
>;

beforeEach(() => {
  mockUseBLEProfiles.mockReturnValue({
    profiles: [],
    loadProfiles: jest.fn(),
  });
});
```

## Test Helpers Reference

### ZMK Studio Helpers

```tsx
import {
  setupZMKMocks, // Sets up all ZMK mocks
  createMockZMKApp, // Creates mock ZMK app
  createConnectedMockZMKApp, // Pre-connected mock
  ZMKAppProvider, // Provider for tests
} from "@cormoran/zmk-studio-react-hook/testing";

// Example usage
mocks.mockSuccessfulConnection({ deviceName: "Test", subsystems: [] });
mocks.mockFailedConnection("Error message");
mocks.mockFailedDeviceInfo();
```

## File Organization

```
src/
├── components/
│   ├── MyComponent.tsx
│   └── __tests__/
│       └── MyComponent.test.tsx
```

## Resources

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [react-zmk-studio Testing](https://github.com/cormoran/react-zmk-studio#testing)
- [Jest Docs](https://jestjs.io/docs/getting-started)
