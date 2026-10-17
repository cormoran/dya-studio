import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeSelect } from "../ThemeSelect";
import { ThemeProvider } from "../../contexts/ThemeContext";

function renderSelector() {
  return render(
    <ThemeProvider>
      <ThemeSelect />
    </ThemeProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

it("switches all themes without leaving stale classes and restores the saved choice", async () => {
  localStorage.setItem("dya-studio-theme", "dark");
  document.documentElement.classList.add("unrelated");
  const user = userEvent.setup();
  const view = renderSelector();
  for (const theme of ["pop", "neutral", "pastel", "light", "dark", "pastel"]) {
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Theme" }),
      theme,
    );
    expect(document.documentElement.className.split(" ").sort()).toEqual(
      [theme, "unrelated"].sort(),
    );
    expect(localStorage.getItem("dya-studio-theme")).toBe(theme);
    expect(document.documentElement.style.colorScheme).toBe(
      theme === "dark" ? "dark" : "light",
    );
  }
  view.unmount();
  renderSelector();
  expect(screen.getByRole("combobox", { name: "Theme" })).toHaveValue("pastel");
});

it("falls back to system preference for an unknown saved theme", () => {
  localStorage.setItem("dya-studio-theme", "unknown");
  renderSelector();
  const expected = window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
  expect(screen.getByRole("combobox", { name: "Theme" })).toHaveValue(expected);
});
