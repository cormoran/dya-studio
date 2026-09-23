import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import type { UseKeymapReturn } from "../../../hooks/useKeymap";
import type { UseRuntimeMacroReturn } from "../../../hooks/useRuntimeMacro";
import type { MacroEditorController } from "../useMacroEditor";
import { MacroEditorDialog } from "../MacroEditorDialog";

jest.mock("../MacroEditorCard", () => ({
  MacroEditorCard: () => null,
}));

describe("MacroEditorDialog", () => {
  it("closes immediately after starting macro creation", async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    let completeCreate: (created: boolean) => void;
    const handleCreateMacro = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          completeCreate = resolve;
        }),
    );

    render(
      <LanguageProvider>
        <MacroEditorDialog
          open
          mode="create"
          onOpenChange={onOpenChange}
          macro={
            {
              isCreating: false,
              handleCreateMacro,
            } as MacroEditorController
          }
          runtimeMacro={{ isLoading: false } as UseRuntimeMacroReturn}
          keymap={{} as UseKeymapReturn}
          layers={[]}
          keyboardLayout="us"
        />
      </LanguageProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Create macro" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    completeCreate!(true);
  });

  it("shows memory write progress in the header", () => {
    render(
      <LanguageProvider>
        <MacroEditorDialog
          open
          mode="edit"
          onOpenChange={jest.fn()}
          macro={
            {
              isCreating: false,
              isMemoryWritePending: true,
              handleCreateMacro: jest.fn(),
            } as MacroEditorController
          }
          runtimeMacro={{ isLoading: false } as UseRuntimeMacroReturn}
          keymap={{} as UseKeymapReturn}
          layers={[]}
          keyboardLayout="us"
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Memory...");
    expect(
      screen.queryByRole("button", { name: "Create macro" }),
    ).not.toBeInTheDocument();
  });
});
