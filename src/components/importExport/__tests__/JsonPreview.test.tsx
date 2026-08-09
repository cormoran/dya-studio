/**
 * Tests for the collapsed JSON preview.
 *
 * These pin a bug that only showed up in a browser: gating the body on an
 * `onToggle` state handler meant the element opened while React never mounted
 * its contents, so the pane expanded to nothing.
 */
import { render, screen } from "@testing-library/react";
import { JsonPreview } from "../JsonPreview";

describe("JsonPreview", () => {
  it("starts collapsed", () => {
    render(<JsonPreview title="Keymap JSON" value={{ a: 1 }} />);

    const details = screen.getByText("Keymap JSON").closest("details");
    expect(details).not.toHaveAttribute("open");
  });

  it("renders the JSON body even while collapsed", () => {
    // The body must exist in the DOM regardless of open state — <details> does
    // the hiding. Mounting it on toggle is what produced an empty pane.
    render(<JsonPreview title="Keymap JSON" value={{ keyboard: "dya2" }} />);

    expect(screen.getByText(/"keyboard": "dya2"/)).toBeInTheDocument();
  });

  it("pretty-prints so the document is readable", () => {
    render(
      <JsonPreview
        title="Layout JSON"
        value={{ name: "DYA2", positions: [] }}
      />,
    );

    const body = screen.getByText(/"name": "DYA2"/);
    expect(body.textContent).toContain("\n");
  });

  it("says so when there is nothing to show", () => {
    render(<JsonPreview title="Layout JSON" value={null} />);
    expect(screen.getByText("Not available.")).toBeInTheDocument();
  });
});
