import { useEffect, useRef } from "react";

export interface WebMCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
  };
  execute: (input: unknown) => Promise<Record<string, unknown>>;
}

/**
 * Registers page capabilities with browsers that implement WebMCP.
 *
 * The registered callback always reads the latest React callback from a ref.
 * This keeps tools in sync with the connected keyboard and the current page
 * state without repeatedly registering the same tool on every render.
 */
export function useWebMCPTools(tools: readonly WebMCPToolDefinition[]): void {
  const toolsRef = useRef(tools);
  toolsRef.current = tools;

  const toolNames = tools.map((tool) => tool.name);
  const toolKey = toolNames.join("\u0000");

  useEffect(() => {
    const modelContext = document.modelContext;
    if (!modelContext?.registerTool) {
      return;
    }

    let disposed = false;

    void Promise.all(
      tools.map(async (tool) => {
        try {
          await modelContext.registerTool({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            annotations: tool.annotations,
            execute: async (input) => {
              const currentTool = toolsRef.current.find(
                (candidate) => candidate.name === tool.name,
              );
              if (!currentTool) {
                return {
                  success: false,
                  error: "This page capability is no longer available.",
                };
              }
              return currentTool.execute(input);
            },
          });
        } catch (error) {
          // Unsupported browsers and duplicate registrations must leave the
          // normal application UI fully functional.
          if (!disposed) {
            console.warn(`Could not register WebMCP tool ${tool.name}:`, error);
          }
        }
      }),
    );

    return () => {
      disposed = true;
      if (!modelContext.unregisterTool) {
        return;
      }
      void Promise.all(
        toolNames.map(async (name) => {
          try {
            await modelContext.unregisterTool?.(name);
          } catch (error) {
            console.warn(`Could not unregister WebMCP tool ${name}:`, error);
          }
        }),
      );
    };
    // Tool callbacks are intentionally read from toolsRef, so changing their
    // closures doesn't cause duplicate registrations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolKey]);
}
