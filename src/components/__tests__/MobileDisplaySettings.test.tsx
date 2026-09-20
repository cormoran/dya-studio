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
    await user.selectOptions(screen.getByLabelText("Theme"), "dark");
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
    expect(screen.getByLabelText("テーマ")).toHaveValue("dark");
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
    await user.selectOptions(screen.getByLabelText("Theme"), "dark");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(localStorage.getItem("dya-studio-theme")).toBe("dark");
  });
});
