import { renderHook } from "@testing-library/react";
import {
  getWebMcpModelContext,
  useWebMcpTools,
  type WebMcpTool,
} from "../webMcp";

const tool: WebMcpTool = {
  name: "dya_test",
  description: "Test tool",
  inputSchema: { type: "object", properties: {} },
  execute: () => ({ ok: true }),
};

function setModelContext(owner: Document | Navigator, value: unknown) {
  Object.defineProperty(owner, "modelContext", {
    configurable: true,
    value,
  });
}

describe("WebMCP registration", () => {
  afterEach(() => {
    setModelContext(document, undefined);
    setModelContext(navigator, undefined);
    jest.restoreAllMocks();
  });

  it("prefers document.modelContext and aborts registrations on cleanup", () => {
    const documentRegister = jest.fn();
    const navigatorRegister = jest.fn();
    setModelContext(document, { registerTool: documentRegister });
    setModelContext(navigator, { registerTool: navigatorRegister });

    const { unmount } = renderHook(() => useWebMcpTools([tool]));

    expect(getWebMcpModelContext()).not.toBeNull();
    expect(documentRegister).toHaveBeenCalledWith(
      tool,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(navigatorRegister).not.toHaveBeenCalled();
    const signal = documentRegister.mock.calls[0][1].signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it("falls back to navigator.modelContext", () => {
    const registerTool = jest.fn();
    setModelContext(document, undefined);
    setModelContext(navigator, { registerTool });

    renderHook(() => useWebMcpTools([tool]));

    expect(registerTool).toHaveBeenCalledTimes(1);
  });

  it("is a safe no-op when WebMCP is unavailable or disabled", () => {
    setModelContext(document, undefined);
    setModelContext(navigator, undefined);

    expect(() => renderHook(() => useWebMcpTools([tool]))).not.toThrow();

    const registerTool = jest.fn();
    setModelContext(document, { registerTool });
    renderHook(() => useWebMcpTools([tool], false));
    expect(registerTool).not.toHaveBeenCalled();
  });

  it("observes asynchronous registration failures", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
    setModelContext(document, {
      registerTool: () => Promise.reject(new Error("duplicate")),
    });

    renderHook(() => useWebMcpTools([tool]));
    await Promise.resolve();
    await Promise.resolve();

    expect(warning).toHaveBeenCalledWith(
      "Failed to register WebMCP tool dya_test:",
      expect.any(Error),
    );
  });
});
