import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileDisplaySettings } from "../MobileDisplaySettings";
import { LanguageProvider } from "../../contexts/LanguageContext";
import { ThemeProvider } from "../../contexts/ThemeContext";

function renderSettings() {
  return render(
    <LanguageProvider>
      <ThemeProvider>
        <MobileDisplaySettings />
      </ThemeProvider>
    </LanguageProvider>,
  );
}

describe("MobileDisplaySettings", () => {
  beforeEach(() => {
    localStorage.setItem("dya-studio-language", "en");
    localStorage.setItem("dya-studio-theme", "light");
  });

  afterEach(() => localStorage.clear());

  it("opens a labelled modal and immediately persists language and theme", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: "Display settings" }));
    expect(
      screen.getByRole("dialog", { name: "Display settings" }),
    ).toBeVisible();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Theme" }),
      "dark",
    );
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("dya-studio-theme")).toBe("dark");
    await user.selectOptions(screen.getByLabelText("Language"), "ja");
    expect(screen.getByRole("dialog", { name: "表示設定" })).toBeVisible();
    expect(document.documentElement.lang).toBe("ja");
    expect(localStorage.getItem("dya-studio-language")).toBe("ja");
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "表示設定" }));
    expect(screen.getByLabelText("言語")).toHaveValue("ja");
    expect(screen.getByRole("combobox", { name: "テーマ" })).toHaveValue(
      "dark",
    );
  });

  it("offers all themes in a native select and persists each selection", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: "Display settings" }));
    const select = screen.getByRole("combobox", { name: "Theme" });
    expect(select.tagName).toBe("SELECT");
    expect(
      Array.from((select as HTMLSelectElement).options, ({ value }) => value),
    ).toEqual(["light", "dark", "pop", "neutral"]);
    for (const theme of ["dark", "pop", "neutral", "light"]) {
      await user.selectOptions(select, theme);
      expect(select).toHaveValue(theme);
      expect(document.documentElement).toHaveClass(theme);
      expect(localStorage.getItem("dya-studio-theme")).toBe(theme);
      expect(
        screen.getByRole("dialog", { name: "Display settings" }),
      ).toBeVisible();
    }
  });

  it("closes on an outside tap", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: "Display settings" }));
    const overlay = screen.getByRole("dialog").previousElementSibling;
    expect(overlay).not.toBeNull();
    await user.click(overlay as Element);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Escape closes the modal and returns focus without reverting changes", async () => {
    const user = userEvent.setup();
    renderSettings();
    const trigger = screen.getByRole("button", { name: "Display settings" });
    await user.click(trigger);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Theme" }),
      "dark",
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(localStorage.getItem("dya-studio-theme")).toBe("dark");
  });
});
