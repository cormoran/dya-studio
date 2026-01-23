// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Mock Web Serial API for testing with configurable property
Object.defineProperty(navigator, "serial", {
  writable: true,
  configurable: true,
  value: undefined,
});

// Mock ReadableStream and WritableStream for Web Serial API
if (typeof global.ReadableStream === "undefined") {
  global.ReadableStream = class ReadableStream {
    getReader() {
      return {
        read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };
    }
    cancel() {
      return Promise.resolve();
    }
  } as unknown as ReadableStream;
}

if (typeof global.WritableStream === "undefined") {
  global.WritableStream = class WritableStream {
    getWriter() {
      return {
        write: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        releaseLock: jest.fn(),
        abort: jest.fn(),
      };
    }
    abort() {
      return Promise.resolve();
    }
  } as unknown as WritableStream;
}

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
