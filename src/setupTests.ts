// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";
import { ReadableStream, WritableStream, TransformStream } from "stream/web";
import { BroadcastChannel } from "worker_threads";

// Polyfill TextEncoder and TextDecoder for protobuf support
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock Web Serial API for testing with configurable property
Object.defineProperty(navigator, "serial", {
  writable: true,
  configurable: true,
  value: undefined,
});

// Provide the WHATWG stream implementations for the Web Serial API and for the
// zmk-studio-react-hook connect flow, which pipes `transport.readable` through
// a `TransformStream` to track packet activity. jsdom does not expose these
// globals (and lacks `TransformStream` entirely), so pull the real ones from
// Node's `stream/web` to get proper `pipeThrough` support.
global.ReadableStream =
  ReadableStream as unknown as typeof global.ReadableStream;
global.WritableStream =
  WritableStream as unknown as typeof global.WritableStream;
global.TransformStream =
  TransformStream as unknown as typeof global.TransformStream;

// jsdom does not implement BroadcastChannel, which the Abyss OAuth popup uses
// to hand the callback URL back to the tab that started the login. Node's
// implementation delivers between channels in the same process, which is
// exactly the opener/popup relationship the tests exercise. Production code
// still guards on `typeof BroadcastChannel` for browsers without it.
global.BroadcastChannel =
  BroadcastChannel as unknown as typeof global.BroadcastChannel;

// jsdom implements no layout, so it has no ResizeObserver. Radix's floating
// primitives (Popover, and anything else positioned against a trigger) construct
// one unconditionally, and the keymap preview measures its own container with
// one. A stub that never fires is enough: nothing under test depends on being
// notified of a resize, only on the constructor existing.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver =
  ResizeObserverStub as unknown as typeof global.ResizeObserver;

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
