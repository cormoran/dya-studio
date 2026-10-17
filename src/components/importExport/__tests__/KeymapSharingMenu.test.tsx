import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { KeymapSharingMenu } from "../KeymapSharingMenu";
import { LanguageProvider } from "../../../contexts/LanguageContext";
jest.mock("../../../hooks/useAbyssAuth", () => ({
  useAbyssAuth: () => mockAuth,
}));
jest.mock("../../../hooks/useKeymapSharing", () => ({
  useKeymapSharing: () => mockSharing,
}));
const mockAuth = {
  isAuthenticated: false,
  isConfigured: true,
  isLoading: false,
  user: null as unknown,
  login: jest.fn(),
  logout: jest.fn(),
  error: null,
};
const mockSharing = {
  busy: false,
  error: null,
  message: null,
  savedKeymapUrl: null as string | null,
  current: null as unknown,
  keymaps: [] as unknown[],
  changed: false,
  identity: "unsupported",
  review: null as unknown,
  refresh: jest.fn(),
  prepare: jest.fn(),
  confirm: jest.fn(),
  create: jest.fn().mockResolvedValue(true),
  saveFile: jest.fn(),
  fileError: jest.fn(),
  setReview: jest.fn(),
  selectDirection: jest.fn(),
};
const record = { id: "one", name: "My layout" };
function show() {
  render(
    <LanguageProvider>
      <KeymapSharingMenu onApplied={jest.fn()} />
    </LanguageProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Save/share keymap" }));
}
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem("dya-studio-language", "en");
  mockAuth.isAuthenticated = false;
  mockAuth.user = null;
  mockSharing.current = null;
  mockSharing.keymaps = [];
  mockSharing.changed = false;
  mockSharing.review = null;
  mockSharing.savedKeymapUrl = null;
});
it("shows login, search and file actions while signed out", () => {
  show();
  expect(
    screen.getByRole("button", { name: "Sign in with Abyss" }),
  ).toBeEnabled();
  expect(screen.getByRole("link", { name: /Find on Abyss/ })).toHaveAttribute(
    "href",
    expect.stringMatching(/\/discover$/),
  );
  expect(screen.getByRole("button", { name: "Save to file" })).toBeEnabled();
  expect(screen.queryByRole("region", { name: "Your keymaps" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Save new to Abyss" }),
  ).toBeNull();
  expect(
    screen.getByText(/Keyboard Abyss is a keymap sharing service/),
  ).toBeInTheDocument();
  expect(
    screen
      .getByRole("button", { name: "Sign in with Abyss" })
      .querySelector("img"),
  ).toBeTruthy();
  expect(mockSharing.refresh).not.toHaveBeenCalled();
});
it("shows the account and unsupported notice without hiding owned maps", () => {
  mockAuth.isAuthenticated = true;
  mockAuth.user = {
    username: "tester",
    avatarUrl: "https://example.com/avatar.png",
  };
  mockSharing.keymaps = [record];
  show();
  expect(screen.getByText("@tester")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  expect(
    screen.getByText(/Keymap identity RPC is not supported/),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /My layout/ }));
  expect(mockSharing.prepare).toHaveBeenCalledWith("apply", record);
  expect(mockSharing.confirm).not.toHaveBeenCalled();
  expect(mockSharing.refresh).toHaveBeenCalledTimes(1);
});
it("opens the current map by selecting its row", () => {
  mockAuth.isAuthenticated = true;
  mockAuth.user = { username: "tester" };
  mockSharing.current = record;
  mockSharing.changed = true;
  show();
  fireEvent.click(screen.getByRole("button", { name: /My layout/ }));
  expect(mockSharing.prepare).toHaveBeenCalledWith("apply", record);
});
it("new keymaps default to private and require a nonempty name", async () => {
  mockAuth.isAuthenticated = true;
  mockAuth.user = { username: "tester" };
  show();
  fireEvent.click(screen.getByRole("button", { name: "Save new to Abyss" }));
  expect(screen.getByRole("combobox", { name: "Visibility" })).toHaveValue(
    "private",
  );
  expect(screen.getByRole("button", { name: "Save to Abyss" })).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", { name: "Keymap name" }), {
    target: { value: "New layout" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Visibility" }), {
    target: { value: "public" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save to Abyss" }));
  await waitFor(() =>
    expect(mockSharing.create).toHaveBeenCalledWith("New layout", "public"),
  );
});
it("shows a preview for the current map even when it is in sync", () => {
  mockAuth.isAuthenticated = true;
  mockAuth.user = { username: "tester" };
  mockSharing.current = record;
  show();
  expect(screen.getByText("In sync")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /My layout/ })).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Refresh your keymaps" }),
  ).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
});

it("opens an owned map from the full row without a Preview button", () => {
  mockAuth.isAuthenticated = true;
  mockSharing.keymaps = [record];
  show();
  expect(screen.queryByRole("button", { name: /Preview/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "My layout" }));
  expect(mockSharing.prepare).toHaveBeenCalledWith("apply", record);
  expect(mockSharing.confirm).not.toHaveBeenCalled();
});

it("keeps the last saved record accessible if automatic opening was blocked", () => {
  mockAuth.isAuthenticated = true;
  mockSharing.savedKeymapUrl =
    "https://abyss.keyboard-hub.com/keymap/saved-one";
  show();
  const link = screen.getByRole("link", { name: "Open on Abyss" });
  expect(link).toHaveAttribute("href", mockSharing.savedKeymapUrl);
  expect(link).toHaveAttribute("target", "_blank");
});
