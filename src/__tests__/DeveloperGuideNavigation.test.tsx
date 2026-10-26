import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

// Exercise the real router, guide definitions and language provider together.
// A link's href or a successful input receipt alone cannot prove navigation
// (#347). Native browser activation is checked separately from these DOM tests.
function expectPage(pathname: string, title: string) {
  expect(window.location.pathname).toBe(pathname);
  expect(screen.getByRole("heading", { level: 1, name: title })).toBeVisible();
  const currentLinks = document.querySelectorAll('a[aria-current="page"]');
  expect(currentLinks.length).toBeGreaterThan(0);
  for (const link of currentLinks) {
    expect(link).toHaveAttribute("href", pathname);
  }
}

describe("Developer Guide input through the App router", () => {
  beforeEach(() => {
    localStorage.setItem("dya-studio-language", "ja");
    localStorage.setItem("dya-studio-theme", "light");
    window.history.replaceState(null, "", "/developer-guide/modules/keymap");
    jest.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it("changes the URL, heading and current route after Next and Related clicks", async () => {
    const user = userEvent.setup();
    render(<App />);
    expectPage("/developer-guide/modules/keymap", "キーマップ、Macro、Combo");

    // Click the nested label, as ordinary pointer input does, so delegation is
    // tested as well as clicking the anchor element itself.
    await user.click(screen.getByText("Next: トラックボール"));
    expectPage("/developer-guide/modules/trackball", "トラックボール");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);

    await user.click(screen.getByText("Related: 設定"));
    expectPage("/developer-guide/modules/settings", "設定");
  });

  it("activates Next with Enter and responds to browser history notifications", async () => {
    const user = userEvent.setup();
    render(<App />);
    const next = screen.getByRole("link", { name: "Next: トラックボール" });
    next.focus();
    expect(next).toHaveFocus();
    await user.keyboard("{Enter}");
    expectPage("/developer-guide/modules/trackball", "トラックボール");

    act(() => {
      window.history.replaceState(null, "", "/developer-guide/modules/keymap");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expectPage("/developer-guide/modules/keymap", "キーマップ、Macro、Combo");
  });

  it("updates language, content and storage without losing the selected route", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: "English", exact: true }),
    );
    expectPage("/developer-guide/modules/keymap", "Keymap, Macro, and Combo");
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(localStorage.getItem("dya-studio-language")).toBe("en");

    const japanese = screen.getByRole("button", {
      name: "日本語",
      exact: true,
    });
    japanese.focus();
    await user.keyboard("{Enter}");
    expectPage("/developer-guide/modules/keymap", "キーマップ、Macro、Combo");
    expect(document.documentElement).toHaveAttribute("lang", "ja");
    expect(localStorage.getItem("dya-studio-language")).toBe("ja");
  });

  it("closes an open mobile menu and renders the chosen page", async () => {
    const user = userEvent.setup();
    render(<App />);
    const menu = screen.getByText("メニュー").closest("details")!;
    // jsdom does not implement summary's native disclosure activation. This
    // setup checks the close-on-navigation contract, not menu-opening input.
    menu.open = true;
    await user.click(
      within(menu).getByRole("link", { name: "設定", exact: true }),
    );
    expect(menu.open).toBe(false);
    expectPage("/developer-guide/modules/settings", "設定");
  });
});
