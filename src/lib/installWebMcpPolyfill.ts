import { initializeWebMCPPolyfill } from "@mcp-b/webmcp-polyfill";

/**
 * Install the strict WebMCP core API when the browser does not provide it.
 * The package preserves a native document.modelContext implementation and is
 * safe to initialize more than once.
 */
export function installWebMcpPolyfill(): void {
  initializeWebMCPPolyfill();
}
