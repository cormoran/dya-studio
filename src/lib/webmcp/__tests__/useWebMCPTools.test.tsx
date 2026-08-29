import { act, render, waitFor } from "@testing-library/react";
import { useWebMCPTools } from "../useWebMCPTools";

function ToolHarness({ answer }: { answer: number }) {
  useWebMCPTools([
    {
      name: "test_tool",
      description: "A test tool.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: async () => ({ answer }),
    },
  ]);
  return null;
}

describe("useWebMCPTools", () => {
  afterEach(() => {
    delete document.modelContext;
  });

  it("registers a tool once and uses its latest React callback", async () => {
    let registeredTool: WebMCPRegisteredTool | undefined;
    const registerTool = jest.fn(async (tool: WebMCPRegisteredTool) => {
      registeredTool = tool;
    });
    const unregisterTool = jest.fn(async () => {});
    document.modelContext = { registerTool, unregisterTool };

    const { rerender, unmount } = render(<ToolHarness answer={1} />);

    await waitFor(() => expect(registeredTool).toBeDefined());
    expect(registerTool).toHaveBeenCalledTimes(1);
    await expect(registeredTool!.execute({})).resolves.toEqual({ answer: 1 });

    rerender(<ToolHarness answer={2} />);

    await act(async () => {});
    expect(registerTool).toHaveBeenCalledTimes(1);
    await expect(registeredTool!.execute({})).resolves.toEqual({ answer: 2 });

    unmount();
    await waitFor(() =>
      expect(unregisterTool).toHaveBeenCalledWith("test_tool"),
    );
  });
});
