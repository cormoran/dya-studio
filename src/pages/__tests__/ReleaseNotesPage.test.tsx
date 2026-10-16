import { render, screen } from "@testing-library/react";
import { getReleases } from "../../i18n/releaseNotes";
import { ReleaseNotesPage } from "../ReleaseNotesPage";

describe("ReleaseNotesPage hash deep links", () => {
  const scrollIntoView = jest.fn();
  const initialUrl = window.location.href;
  const originalScrollIntoView = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "scrollIntoView",
  );

  beforeEach(() => {
    window.history.replaceState(null, "", "/release-notes");
    scrollIntoView.mockClear();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
  });

  afterEach(() => {
    window.history.replaceState(null, "", initialUrl);
    if (originalScrollIntoView) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollIntoView",
        originalScrollIntoView,
      );
    } else {
      delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
    }
  });

  it.each(["%ZZ", "%C3%28"])(
    "keeps the release list rendered for malformed hash %s",
    (hash) => {
      window.history.replaceState(null, "", `/release-notes#${hash}`);

      render(<ReleaseNotesPage onBack={() => {}} />);

      expect(
        screen.getByRole("heading", { name: "Release Notes" }),
      ).toBeInTheDocument();
      expect(document.querySelectorAll("section[id]").length).toBe(
        getReleases().length,
      );
      expect(scrollIntoView).not.toHaveBeenCalled();
    },
  );

  it("ignores a valid hash with no matching release", () => {
    window.history.replaceState(null, "", "/release-notes#missing-release");

    render(<ReleaseNotesPage onBack={() => {}} />);

    expect(
      screen.getByRole("heading", { name: "Release Notes" }),
    ).toBeInTheDocument();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it.each([
    { label: "ordinary", encoded: false },
    { label: "encoded", encoded: true },
  ])("scrolls to an existing release with an $label hash", ({ encoded }) => {
    const version = getReleases().find(
      (release) => release.version !== "upcoming",
    )!.version;
    const hash = encoded ? version.replaceAll(".", "%2E") : version;
    window.history.replaceState(null, "", `/release-notes#${hash}`);

    render(<ReleaseNotesPage onBack={() => {}} />);

    const target = document.getElementById(version);
    expect(target).not.toBeNull();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(scrollIntoView.mock.contexts[0]).toBe(target);
  });
});
