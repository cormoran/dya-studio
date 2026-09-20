import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { MobileMacroComboMenu } from "../MobileMacroComboMenu";

describe("MobileMacroComboMenu", () => {
  beforeEach(() => {
    localStorage.setItem("dya-studio-language", "en");
  });

  it("groups selectable items and create actions while preserving status dots", async () => {
    const user = userEvent.setup();
    const selectMacro = jest.fn();
    const createMacro = jest.fn();
    const createCombo = jest.fn();

    render(
      <LanguageProvider>
        <MobileMacroComboMenu
          macros={[
            {
              id: "macro-1",
              label: "Copy line",
              selected: true,
              status: "unsaved",
              onSelect: selectMacro,
            },
          ]}
          combos={[
            {
              id: "combo-2",
              label: "Escape combo",
              selected: false,
              status: "modified",
              onSelect: jest.fn(),
            },
          ]}
          settings={[
            {
              id: "macro-settings",
              label: "Macro Global Settings",
              selected: false,
              onSelect: jest.fn(),
            },
          ]}
          onCreateMacro={createMacro}
          onCreateCombo={createCombo}
        />
      </LanguageProvider>,
    );

    const trigger = screen.getByRole("button", {
      name: "Select macro, combo, or settings",
    });
    expect(trigger).toHaveTextContent("Macro");
    expect(trigger).toHaveTextContent("Copy line");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Macros")).toBeInTheDocument();
    expect(screen.getByText("Combos")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Unsaved")).toHaveLength(2);
    expect(screen.getByLabelText("Changed from default")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Create macro" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "New combo" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("menuitem", { name: "Copy line Unsaved" }),
    );
    expect(selectMacro).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it.each([
    ["Combo", "combos"],
    ["Settings", "settings"],
  ] as const)("labels a selected %s item above its name", (section, prop) => {
    const item = {
      id: section.toLowerCase(),
      label: `${section} item`,
      selected: true,
      onSelect: jest.fn(),
    };

    render(
      <LanguageProvider>
        <MobileMacroComboMenu {...{ [prop]: [item] }} />
      </LanguageProvider>,
    );

    const trigger = screen.getByRole("button", {
      name: "Select macro, combo, or settings",
    });
    expect(trigger).toHaveTextContent(section);
    expect(trigger).toHaveTextContent(`${section} item`);
  });

  it("disables macro creation while a macro is being created", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <MobileMacroComboMenu
          macros={[]}
          settings={[]}
          onCreateMacro={jest.fn()}
          createMacroDisabled
        />
      </LanguageProvider>,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Select macro, combo, or settings",
      }),
    );
    expect(
      screen.getByRole("menuitem", { name: "Create macro" }),
    ).toBeDisabled();
  });
});
