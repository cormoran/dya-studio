import { fireEvent, render, screen, within } from "@testing-library/react";
import { getLatestRelease } from "../../i18n/releaseNotes";
import { HomePage } from "../HomePage";

describe("HomePage", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("links DYA2 to its published design, store, and documentation", () => {
    render(<HomePage />);

    const dya2Heading = screen.getByText("DYA2");
    const dya2Card = dya2Heading.closest(".group");
    expect(dya2Card).not.toBeNull();

    expect(
      within(dya2Card!).getByRole("link", { name: "Design" }),
    ).toHaveAttribute("href", "https://github.com/cormoran/dya2-keyboard");
    expect(
      within(dya2Card!).getByRole("link", { name: "Buy" }),
    ).toHaveAttribute("href", "https://cormoran707.booth.pm/items/7627440");
    expect(
      within(dya2Card!).getByRole("link", { name: "Docs" }),
    ).toHaveAttribute("href", "https://cormoran.github.io/dya2-keyboard/");
    expect(
      within(dya2Card!).queryByText("Coming Soon"),
    ).not.toBeInTheDocument();
  });

  it("links to both keyboard developer guides", () => {
    render(<HomePage />);

    const developerGuide = screen.getByRole("link", {
      name: "Developer Guide",
    });
    expect(developerGuide).toHaveAttribute("href", "/developer-guide");
    expect(
      screen.getByRole("link", { name: "Read the note article" }),
    ).toHaveAttribute("href", "https://note.com/cormoran/n/n888c547fc99b");

    fireEvent.click(developerGuide);
    expect(window.location.pathname).toBe("/developer-guide");
  });

  it("shows and deep-links to the latest published release", () => {
    const latestRelease = getLatestRelease();
    expect(latestRelease).not.toBeNull();

    render(<HomePage />);

    expect(screen.getByText(latestRelease!.version)).toBeInTheDocument();
    const releaseNotes = screen.getByRole("link", {
      name: "View all release notes",
    });
    expect(releaseNotes).toHaveAttribute(
      "href",
      `/release-notes#${encodeURIComponent(latestRelease!.version)}`,
    );

    fireEvent.click(releaseNotes);
    expect(window.location.pathname).toBe("/release-notes");
    expect(window.location.hash).toBe(`#${latestRelease!.version}`);
  });
});
