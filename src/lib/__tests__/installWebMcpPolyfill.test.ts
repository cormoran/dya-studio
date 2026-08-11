import { cleanupWebMCPPolyfill } from "@mcp-b/webmcp-polyfill";
import { installWebMcpPolyfill } from "../installWebMcpPolyfill";

type ModelContextOwner = { modelContext?: unknown };
type TestingOwner = { modelContextTesting?: unknown };

function removeModelContext(owner: Document | Navigator): void {
  delete (owner as typeof owner & ModelContextOwner).modelContext;
}

describe("installWebMcpPolyfill", () => {
  beforeEach(() => {
    cleanupWebMCPPolyfill();
    removeModelContext(document);
    removeModelContext(navigator);
    delete (navigator as Navigator & TestingOwner).modelContextTesting;
  });

  afterEach(() => {
    cleanupWebMCPPolyfill();
    removeModelContext(document);
    removeModelContext(navigator);
    delete (navigator as Navigator & TestingOwner).modelContextTesting;
  });

  it("installs document.modelContext in an unsupported browser", () => {
    installWebMcpPolyfill();

    const documentContext = (document as Document & ModelContextOwner)
      .modelContext;

    expect(documentContext).toBeDefined();
  });

  it("preserves a native document.modelContext implementation", () => {
    const nativeContext = { registerTool: jest.fn() };
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: nativeContext,
    });

    installWebMcpPolyfill();

    expect((document as Document & ModelContextOwner).modelContext).toBe(
      nativeContext,
    );
  });
});
