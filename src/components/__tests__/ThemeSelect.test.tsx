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
  document.getElementById("pop-theme-font")?.remove();
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

it("requests fonts only for Pop and reuses the request across theme changes", async () => {
  localStorage.setItem("dya-studio-theme", "light");
  const user = userEvent.setup();
  const view = renderSelector();
  const select = async (name: string) => {
    await user.click(screen.getByRole("button", { name: "Theme" }));
    await user.click(screen.getByRole("menuitemradio", { name }));
  };
  expect(document.getElementById("pop-theme-font")).toBeNull();
  await select("Neutral");
  await select("Dark");
  expect(document.getElementById("pop-theme-font")).toBeNull();
  await select("Pop");
  const link = document.getElementById("pop-theme-font");
  expect(link).toHaveAttribute("rel", "stylesheet");
  expect(link).toHaveAttribute(
    "href",
    "https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700&display=swap",
  );
  await select("Light");
  expect((link as HTMLLinkElement).disabled).toBe(true);
  link?.dispatchEvent(new Event("load"));
  expect(document.documentElement).toHaveClass("light");
  expect(document.documentElement).not.toHaveClass("pop");
  await select("Pop");
  expect(document.getElementById("pop-theme-font")).toBe(link);
  expect((link as HTMLLinkElement).disabled).toBe(false);
  view.unmount();
  renderSelector();
  expect(document.querySelectorAll("#pop-theme-font")).toHaveLength(1);
});

it("loads saved Pop and retries a failed stylesheet on the next selection", async () => {
  localStorage.setItem("dya-studio-theme", "pop");
  const user = userEvent.setup();
  renderSelector();
  const link = document.getElementById("pop-theme-font");
  expect(link).not.toBeNull();
  link?.dispatchEvent(new Event("error"));
  expect(document.getElementById("pop-theme-font")).toBeNull();
  expect(document.documentElement).toHaveClass("pop");
  await user.click(screen.getByRole("button", { name: "Theme" }));
  await user.click(screen.getByRole("menuitemradio", { name: "Neutral" }));
  await user.click(screen.getByRole("button", { name: "Theme" }));
  await user.click(screen.getByRole("menuitemradio", { name: "Pop" }));
  expect(document.getElementById("pop-theme-font")).not.toBeNull();
  expect(document.getElementById("pop-theme-font")).not.toBe(link);
});
