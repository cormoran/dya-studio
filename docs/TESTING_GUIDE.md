# Testing Guide

This guide explains how to write and run tests for DYA Studio.

## Table of Contents

1. [Overview](#overview)
2. [Running Tests](#running-tests)
3. [Test Structure](#test-structure)
4. [Testing Best Practices](#testing-best-practices)
5. [Testing React Components](#testing-react-components)
6. [Mocking Web APIs](#mocking-web-apis)
7. [Testing with ZMK Studio](#testing-with-zmk-studio)
8. [Coverage](#coverage)
9. [Common Testing Patterns](#common-testing-patterns)

---

## Overview

DYA Studio uses **Jest** as the test framework along with **React Testing Library** for component testing. This combination provides a robust testing environment that follows best practices for testing React applications.

### Tech Stack

| Tool                          | Purpose                                   |
| ----------------------------- | ----------------------------------------- |
| Jest                          | Test runner and assertion library         |
| React Testing Library         | Component testing utilities               |
| @testing-library/jest-dom     | Custom DOM matchers                       |
| @testing-library/user-event   | User interaction simulation               |
| ts-jest                       | TypeScript support for Jest               |

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (reruns tests on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test File Locations

Tests should be placed in `__tests__` directories next to the components they test:

```
src/
├── components/
│   ├── DeviceConnection.tsx
│   └── __tests__/
│       └── DeviceConnection.test.tsx
├── hooks/
│   ├── useConnection.ts
│   └── __tests__/
│       └── useConnection.test.ts
└── pages/
    ├── BatteryPage.tsx
    └── __tests__/
        └── BatteryPage.test.tsx
```

Alternatively, you can place test files next to the source files with `.test.ts` or `.spec.ts` suffixes:

```
src/
├── components/
│   ├── DeviceConnection.tsx
│   └── DeviceConnection.test.tsx
```

---

## Test Structure

### File Naming

- Use `.test.tsx` or `.test.ts` for test files
- Or use `.spec.tsx` or `.spec.ts` for specification-style tests
- Place tests in `__tests__` directories or alongside source files

### Basic Test Structure

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "../MyComponent";

describe("MyComponent", () => {
  // Setup runs before each test
  beforeEach(() => {
    // Reset mocks, clear state, etc.
  });

  // Cleanup runs after each test
  afterEach(() => {
    // Clean up side effects
  });

  test("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  test("handles user interaction", async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    const button = screen.getByRole("button", { name: /click me/i });
    await user.click(button);
    
    expect(screen.getByText("Clicked!")).toBeInTheDocument();
  });
});
```

---

## Testing Best Practices

### 1. Test User Behavior, Not Implementation

**Good:**
```tsx
test("shows success message after connecting", async () => {
  render(<DeviceConnection />);
  
  const connectButton = screen.getByRole("button", { name: /connect/i });
  await user.click(connectButton);
  
  expect(await screen.findByText(/connected/i)).toBeInTheDocument();
});
```

**Bad:**
```tsx
test("sets isConnected to true", () => {
  const { result } = renderHook(() => useConnection());
  
  act(() => {
    result.current.setIsConnected(true);
  });
  
  expect(result.current.isConnected).toBe(true);
});
```

### 2. Use Semantic Queries

Prefer queries that reflect how users interact with your app:

```tsx
// ✅ Good - accessible and user-centric
screen.getByRole("button", { name: /connect/i });
screen.getByLabelText(/device name/i);
screen.getByText(/connected/i);

// ❌ Avoid - implementation details
screen.getByTestId("connect-btn");
screen.getByClassName("connection-status");
```

Use `data-testid` only when semantic queries are not possible.

### 3. Use `userEvent` Over `fireEvent`

`userEvent` more closely simulates real user interactions:

```tsx
import userEvent from "@testing-library/user-event";

test("handles click", async () => {
  const user = userEvent.setup();
  render(<Button onClick={handleClick} />);
  
  await user.click(screen.getByRole("button"));
  // assertions...
});
```

### 4. Wait for Async Updates

Always wait for asynchronous operations:

```tsx
// ✅ Good - wait for element to appear
await waitFor(() => {
  expect(screen.getByText("Loaded")).toBeInTheDocument();
});

// Or use findBy queries (which have built-in waiting)
expect(await screen.findByText("Loaded")).toBeInTheDocument();

// ❌ Bad - might fail if element hasn't appeared yet
expect(screen.getByText("Loaded")).toBeInTheDocument();
```

### 5. Keep Tests Isolated

Each test should be independent and not rely on others:

```tsx
describe("MyComponent", () => {
  beforeEach(() => {
    // Reset state before each test
    jest.clearAllMocks();
  });

  test("test 1", () => {
    // This test doesn't depend on test 2
  });

  test("test 2", () => {
    // This test doesn't depend on test 1
  });
});
```

---

## Testing React Components

### Rendering Components

```tsx
import { render, screen } from "@testing-library/react";

test("renders component", () => {
  render(<MyComponent prop="value" />);
  expect(screen.getByText("Hello")).toBeInTheDocument();
});
```

### Testing with Context

When testing components that use context, wrap them in the provider:

```tsx
import { render } from "@testing-library/react";
import { ConnectionContext } from "../components/DeviceConnection";

test("displays connection status", () => {
  const mockContext = {
    isConnected: true,
    deviceName: "Test Device",
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    isLoading: false,
    error: null,
  };

  render(
    <ConnectionContext.Provider value={mockContext}>
      <MyComponent />
    </ConnectionContext.Provider>
  );

  expect(screen.getByText("Test Device")).toBeInTheDocument();
});
```

### Testing User Interactions

```tsx
import userEvent from "@testing-library/user-event";

test("handles form submission", async () => {
  const user = userEvent.setup();
  const onSubmit = jest.fn();
  
  render(<MyForm onSubmit={onSubmit} />);
  
  const input = screen.getByLabelText(/name/i);
  await user.type(input, "John Doe");
  
  const submitButton = screen.getByRole("button", { name: /submit/i });
  await user.click(submitButton);
  
  expect(onSubmit).toHaveBeenCalledWith({ name: "John Doe" });
});
```

---

## Mocking Web APIs

### Mocking Web Serial API

The Web Serial API is automatically mocked in `setupTests.ts`. To customize the mock in tests:

```tsx
test("successfully connects to keyboard", async () => {
  const user = userEvent.setup();

  // Mock successful connection
  const mockPort = {
    open: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const mockSerial = {
    requestPort: jest.fn().mockResolvedValue(mockPort),
  };

  (navigator as any).serial = mockSerial;

  render(<DeviceConnection />);

  const connectButton = screen.getByRole("button", { name: /connect/i });
  await user.click(connectButton);

  await waitFor(() => {
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });
});
```

### Mocking Errors

```tsx
test("handles connection errors", async () => {
  const mockSerial = {
    requestPort: jest.fn().mockRejectedValue(new Error("Connection failed")),
  };

  (navigator as any).serial = mockSerial;

  render(<DeviceConnection />);

  const connectButton = screen.getByRole("button", { name: /connect/i });
  await user.click(connectButton);

  await waitFor(() => {
    expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
  });
});
```

### Resetting Mocks

Always reset mocks in `beforeEach` or `afterEach`:

```tsx
describe("DeviceConnection", () => {
  beforeEach(() => {
    // Reset Web Serial API mock
    (navigator as any).serial = undefined;
  });

  // Tests...
});
```

---

## Testing with ZMK Studio

When the ZMK Studio library integration is complete, use the testing helpers provided by `@cormoran/zmk-studio-react-hook/testing`.

### Example: Testing with ZMK Mocks

```tsx
import {
  setupZMKMocks,
  createMockZMKApp,
  createConnectedMockZMKApp,
  ZMKAppProvider,
} from "@cormoran/zmk-studio-react-hook/testing";

test("displays device information", () => {
  const mockZMKApp = createConnectedMockZMKApp({
    deviceName: "DYA Keyboard",
    subsystems: ["battery", "ble"],
  });

  render(
    <ZMKAppProvider value={mockZMKApp}>
      <DeviceInfo />
    </ZMKAppProvider>
  );

  expect(screen.getByText("DYA Keyboard")).toBeInTheDocument();
});
```

### Testing Connection Flow

```tsx
test("connects to device", async () => {
  const mocks = setupZMKMocks();
  
  mocks.mockSuccessfulConnection({
    deviceName: "DYA Keyboard",
    subsystems: ["battery"],
  });

  const { result } = renderHook(() => useZMKApp());

  const connectFn = jest.fn().mockResolvedValue(mocks.mockTransport);

  await act(async () => {
    await result.current.connect(connectFn);
  });

  expect(result.current.isConnected).toBe(true);
  expect(result.current.state.deviceInfo?.name).toBe("DYA Keyboard");
});
```

For more details, refer to the [react-zmk-studio testing documentation](https://github.com/cormoran/react-zmk-studio#testing).

---

## Coverage

### Running Coverage Reports

```bash
npm run test:coverage
```

This generates a coverage report in the `coverage/` directory and displays a summary in the terminal.

### Coverage Thresholds

Currently, we don't enforce coverage thresholds, but aim for:

- **Statements:** 80%+
- **Branches:** 70%+
- **Functions:** 80%+
- **Lines:** 80%+

### What to Test

Focus coverage on:

- ✅ Business logic and state management
- ✅ User interactions and workflows
- ✅ Error handling
- ✅ Component integration with contexts

Don't worry about:

- ❌ Trivial getters/setters
- ❌ Type definitions
- ❌ Pure UI components with no logic

---

## Common Testing Patterns

### Pattern 1: Testing Loading States

```tsx
test("shows loading state while connecting", async () => {
  const mockPort = {
    open: jest.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    ),
  };

  (navigator as any).serial = {
    requestPort: jest.fn().mockResolvedValue(mockPort),
  };

  render(<DeviceConnection />);

  const connectButton = screen.getByRole("button", { name: /connect/i });
  await user.click(connectButton);

  expect(screen.getByText(/connecting/i)).toBeInTheDocument();
});
```

### Pattern 2: Testing Error States

```tsx
test("displays error message", async () => {
  const mockSerial = {
    requestPort: jest.fn().mockRejectedValue(new Error("USB error")),
  };

  (navigator as any).serial = mockSerial;

  render(<DeviceConnection />);

  await user.click(screen.getByRole("button", { name: /connect/i }));

  await waitFor(() => {
    expect(screen.getByText(/usb error/i)).toBeInTheDocument();
  });
});
```

### Pattern 3: Testing Conditional Rendering

```tsx
test("shows content only when connected", () => {
  const mockContext = {
    isConnected: false,
    deviceName: undefined,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
    isLoading: false,
    error: null,
  };

  const { rerender } = render(
    <ConnectionContext.Provider value={mockContext}>
      <ProtectedContent />
    </ConnectionContext.Provider>
  );

  expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();

  mockContext.isConnected = true;
  mockContext.deviceName = "DYA Keyboard";

  rerender(
    <ConnectionContext.Provider value={mockContext}>
      <ProtectedContent />
    </ConnectionContext.Provider>
  );

  expect(screen.getByText("Secret Content")).toBeInTheDocument();
});
```

### Pattern 4: Testing Custom Hooks

```tsx
import { renderHook, act } from "@testing-library/react";

test("custom hook updates state", () => {
  const { result } = renderHook(() => useCounter());

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

---

## Before Submitting Code

Always run the following commands before submitting your code:

```bash
# 1. Run linter
npm run lint

# 2. Run all tests
npm test

# 3. Check test coverage
npm run test:coverage
```

Make sure:
- ✅ All tests pass
- ✅ No linting errors
- ✅ New features have corresponding tests
- ✅ Coverage doesn't decrease significantly

---

## Tips & Tricks

### Debugging Tests

```tsx
import { screen } from "@testing-library/react";

test("debugging example", () => {
  render(<MyComponent />);
  
  // Print the DOM structure
  screen.debug();
  
  // Print a specific element
  screen.debug(screen.getByRole("button"));
});
```

### Finding Elements

When you're not sure what query to use:

```tsx
render(<MyComponent />);

// This will list all available roles and accessible names
screen.getByRole(""); // Intentional error to see available options
```

### Testing Accessibility

```tsx
test("is accessible", async () => {
  const { container } = render(<MyComponent />);
  
  // Check for proper ARIA attributes
  expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Connect");
  
  // Check for keyboard navigation
  const button = screen.getByRole("button");
  expect(button).toHaveAttribute("tabIndex", "0");
});
```

---

## Questions?

If you encounter testing scenarios not covered by this guide:

1. Check the [React Testing Library documentation](https://testing-library.com/docs/react-testing-library/intro/)
2. Review existing tests in the codebase
3. Refer to the [Jest documentation](https://jestjs.io/docs/getting-started)
4. Check the [react-zmk-studio testing guide](https://github.com/cormoran/react-zmk-studio#testing)

When in doubt, prefer:
1. Testing user behavior over implementation details
2. Semantic queries over test IDs
3. Integration tests over unit tests
4. Simple, readable tests over complex ones
