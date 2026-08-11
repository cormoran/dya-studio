import { useEffect } from "react";

export type WebMcpInput = Readonly<Record<string, unknown>>;

export interface WebMcpToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  untrustedContentHint?: boolean;
}

export interface WebMcpTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: Readonly<Record<string, unknown>>;
  annotations?: WebMcpToolAnnotations;
  execute: (input: WebMcpInput) => unknown | Promise<unknown>;
}

interface WebMcpModelContext {
  registerTool: (
    tool: WebMcpTool,
    options?: { signal?: AbortSignal },
  ) => unknown | Promise<unknown>;
}

type ModelContextOwner = { modelContext?: WebMcpModelContext };

/** Returns the current WebMCP implementation, preferring the standard API. */
export function getWebMcpModelContext(): WebMcpModelContext | null {
  const documentContext = (document as Document & ModelContextOwner)
    .modelContext;
  if (documentContext) return documentContext;

  // Chrome exposed the API on Navigator before it moved to Document. Keep the
  // old location as a compatibility fallback while clients migrate.
  return (navigator as Navigator & ModelContextOwner).modelContext ?? null;
}

/**
 * Register a set of tools for the lifetime of a component (or active tab).
 * Unsupported browsers safely do nothing. Aborting the shared signal removes
 * every tool, per the current WebMCP API.
 */
export function useWebMcpTools(
  tools: readonly WebMcpTool[],
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const modelContext = getWebMcpModelContext();
    if (!modelContext) return;

    const controller = new AbortController();
    for (const tool of tools) {
      try {
        // registerTool is async in the current draft. Explicitly observe its
        // rejection so unsupported schemas/duplicate names never become an
        // unhandled promise rejection during a React render cycle.
        void Promise.resolve(
          modelContext.registerTool(tool, { signal: controller.signal }),
        ).catch((error: unknown) => {
          if (!controller.signal.aborted) {
            console.warn(`Failed to register WebMCP tool ${tool.name}:`, error);
          }
        });
      } catch (error: unknown) {
        // Older implementations can throw synchronously.
        console.warn(`Failed to register WebMCP tool ${tool.name}:`, error);
      }
    }

    return () => controller.abort();
  }, [enabled, tools]);
}

export function requireNumber(input: WebMcpInput, property: string): number {
  const value = input[property];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${property} must be a finite number`);
  }
  return value;
}

export function requireInteger(input: WebMcpInput, property: string): number {
  const value = requireNumber(input, property);
  if (!Number.isInteger(value)) {
    throw new TypeError(`${property} must be an integer`);
  }
  return value;
}

export function requireString(input: WebMcpInput, property: string): string {
  const value = input[property];
  if (typeof value !== "string") {
    throw new TypeError(`${property} must be a string`);
  }
  return value;
}
