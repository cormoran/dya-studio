import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "../../contexts/LanguageContext";
import { LanguageToggle } from "../LanguageToggle";

function renderToggle() {
  return render(
    <LanguageProvider>
      <LanguageToggle />
    </LanguageProvider>,
  );
}

beforeEach(() => localStorage.setItem("dya-studio-language", "en"));
afterEach(() => localStorage.clear());

test("shows an icon-only trigger and persists a direct selection", async () => {
  const user = userEvent.setup();
  const view = renderToggle();
  const trigger = screen.getByRole("button", { name: "Language: English" });
  expect(trigger).toHaveTextContent("");
  expect(trigger.querySelectorAll("svg")).toHaveLength(1);
  await user.click(trigger);
  expect(
    screen.getByRole("menuitemradio", { name: "English" }),
  ).toHaveAttribute("aria-checked", "true");
  await user.click(screen.getByRole("menuitemradio", { name: "中文" }));
  await waitFor(() =>
    expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
  );
  expect(document.documentElement.lang).toBe("zh");
  expect(localStorage.getItem("dya-studio-language")).toBe("zh");
  await waitFor(() => expect(trigger).toHaveFocus());
  view.unmount();
  renderToggle();
  expect(
    screen.getByRole("button", { name: "语言: 中文" }),
  ).toBeInTheDocument();
});

test("moves keyboard focus without committing and supports Escape and Enter", async () => {
  const user = userEvent.setup();
  renderToggle();
  const trigger = screen.getByRole("button", { name: "Language: English" });
  trigger.focus();
  await user.keyboard("{ArrowDown}");
  expect(screen.getByRole("menuitemradio", { name: "English" })).toHaveFocus();
  await user.keyboard("{ArrowUp}");
  expect(screen.getByRole("menuitemradio", { name: "中文" })).toHaveFocus();
  await user.keyboard("{Home}{ArrowDown}");
  expect(screen.getByRole("menuitemradio", { name: "日本語" })).toHaveFocus();
  expect(localStorage.getItem("dya-studio-language")).toBe("en");
  await user.keyboard("{Escape}");
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  await user.keyboard("{Enter}{End}{Enter}");
  expect(localStorage.getItem("dya-studio-language")).toBe("zh");
});

test("outside click closes without changing language", async () => {
  const user = userEvent.setup();
  renderToggle();
  await user.click(screen.getByRole("button", { name: "Language: English" }));
  expect(screen.getByRole("menu")).toBeVisible();
  await user.click(document.body);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(localStorage.getItem("dya-studio-language")).toBe("en");
});
