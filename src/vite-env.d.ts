/// <reference types="vite/client" />

interface WebMCPRegisteredTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
  };
  execute: (input: unknown) => Promise<Record<string, unknown>>;
}

interface ModelContext {
  registerTool(tool: WebMCPRegisteredTool): Promise<void>;
  unregisterTool?(name: string): Promise<void>;
}

interface Document {
  modelContext?: ModelContext;
}

declare module "*.svg?react" {
  import React from "react";
  const SVGComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}
