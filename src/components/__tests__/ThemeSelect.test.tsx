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
  for (const theme of ["pop", "neutral", "light", "dark", "pop"]) {
    await user.click(screen.getByRole("button", { name: "Theme" }));
    await user.click(
      screen.getByRole("menuitemradio", {
        name: theme[0].toUpperCase() + theme.slice(1),
      }),
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
  expect(screen.getByRole("button", { name: "Theme" })).toHaveAttribute(
    "title",
    "Theme: Pop",
  );
});

it.each(["unknown", "pastel"])(
  "falls back to system preference for unsupported saved theme %s",
  (stored) => {
    localStorage.setItem("dya-studio-theme", stored);
    renderSelector();
    expect(
      screen.queryByRole("menuitemradio", { name: "Pastel" }),
    ).not.toBeInTheDocument();
    const expected = window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
    expect(screen.getByRole("button", { name: "Theme" })).toHaveAttribute(
      "title",
      `Theme: ${expected[0].toUpperCase() + expected.slice(1)}`,
    );
  },
);

it("opens on the selected theme, navigates without saving, and closes with focus restored", async () => {
  localStorage.setItem("dya-studio-theme", "light");
  const user = userEvent.setup();
  renderSelector();
  const trigger = screen.getByRole("button", { name: "Theme" });
  expect(trigger).toHaveTextContent("");
  await user.click(trigger);
  expect(screen.getByRole("menuitemradio", { name: "Light" })).toHaveFocus();
  await user.keyboard("{End}");
  expect(screen.getByRole("menuitemradio", { name: "Neutral" })).toHaveFocus();
  expect(localStorage.getItem("dya-studio-theme")).toBe("light");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  await user.keyboard("{ArrowDown}{Enter}");
  expect(localStorage.getItem("dya-studio-theme")).toBe("dark");
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("dismisses on an outside click without changing the selection", async () => {
  localStorage.setItem("dya-studio-theme", "light");
  const user = userEvent.setup();
  renderSelector();
  await user.click(screen.getByRole("button", { name: "Theme" }));
  await user.click(document.body);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(localStorage.getItem("dya-studio-theme")).toBe("light");
});
