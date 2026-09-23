import { render, screen, waitFor } from "@testing-library/react";
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
  it("closes after creating a macro successfully", async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    const handleCreateMacro = jest.fn().mockResolvedValue(true);

    render(
      <LanguageProvider>
        <MacroEditorDialog
          open
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

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
