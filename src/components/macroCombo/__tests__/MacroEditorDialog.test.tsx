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
  const idle = { state: "idle" as const };
  const memoryFields = {
    renameDebounce: idle,
    delayDebounce: idle,
    stringDebounce: idle,
    tapMsDebounce: idle,
  };

  it("closes after successful macro creation", async () => {
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
              ...memoryFields,
              isCreating: false,
              renameDraft: "Macro 1",
              handleCreateMacro,
            } as MacroEditorController
          }
          runtimeMacro={
            { isLoading: false, macros: [] } as UseRuntimeMacroReturn
          }
          keymap={{} as UseKeymapReturn}
          layers={[]}
          keyboardLayout="us"
        />
      </LanguageProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Create macro" }));

    expect(onOpenChange).not.toHaveBeenCalled();
    completeCreate!(true);
    await screen.findByRole("button", { name: "Create macro" });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
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
              ...memoryFields,
              renameDebounce: { state: "queued" },
              isCreating: false,
              isMemoryWritePending: true,
              handleCreateMacro: jest.fn(),
            } as MacroEditorController
          }
          runtimeMacro={
            { isLoading: false, macros: [] } as UseRuntimeMacroReturn
          }
          keymap={{} as UseKeymapReturn}
          layers={[]}
          keyboardLayout="us"
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Waiting to apply...");
    expect(
      screen.queryByRole("button", { name: "Create macro" }),
    ).not.toBeInTheDocument();
  });

  it("flushes pending edits before flash save and closes only on success", async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    const flushPendingWrites = jest.fn().mockResolvedValue(undefined);
    const saveMacros = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    render(
      <LanguageProvider>
        <MacroEditorDialog
          open
          mode="edit"
          onOpenChange={onOpenChange}
          macro={
            { ...memoryFields, flushPendingWrites } as MacroEditorController
          }
          runtimeMacro={
            {
              isLoading: false,
              macros: [],
              saveMacros,
            } as unknown as UseRuntimeMacroReturn
          }
          keymap={{} as UseKeymapReturn}
          layers={[]}
          keyboardLayout="us"
        />
      </LanguageProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Save and close" }));
    expect(onOpenChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Save and close" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(flushPendingWrites).toHaveBeenCalledTimes(2);
    expect(saveMacros).toHaveBeenCalledTimes(2);
    expect(flushPendingWrites.mock.invocationCallOrder[0]).toBeLessThan(
      saveMacros.mock.invocationCallOrder[0],
    );
  });
});
