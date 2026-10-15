import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { KeymapSharingMenu } from "../KeymapSharingMenu";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { EMPTY_DIFF } from "../../../lib/abyss/abyssDiff";
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
};
const record = { id: "one", name: "My layout" };
function show() {
  render(
    <LanguageProvider>
      <KeymapSharingMenu onApplied={jest.fn()} />
    </LanguageProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Keymap sharing" }));
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
});
it("shows login, search and file actions while signed out", () => {
  show();
  expect(
    screen.getByRole("button", { name: "Sign in with Abyss" }),
  ).toBeEnabled();
  expect(screen.getByRole("link", { name: /Find on Abyss/ })).toHaveAttribute(
    "href",
    expect.stringMatching(/\/keymaps$/),
  );
  expect(screen.getByRole("button", { name: "Save to file" })).toBeEnabled();
  expect(screen.queryByRole("region", { name: "Your keymaps" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Save new to Abyss" }),
  ).toBeNull();
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
  fireEvent.click(screen.getByRole("button", { name: "Save to My layout" }));
  expect(mockSharing.prepare).toHaveBeenCalledWith("save", record);
  expect(mockSharing.confirm).not.toHaveBeenCalled();
  expect(mockSharing.refresh).toHaveBeenCalledTimes(1);
});
it("shows current map actions only when it differs", () => {
  mockAuth.isAuthenticated = true;
  mockAuth.user = { username: "tester" };
  mockSharing.current = record;
  mockSharing.changed = true;
  show();
  fireEvent.click(screen.getByRole("button", { name: "Apply My layout" }));
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
it("renders a confirmation diff and cancel does not commit", () => {
  mockSharing.review = {
    kind: "save",
    record,
    before: { name: "before" },
    after: { name: "after" },
    checks: [],
    diff: { ...EMPTY_DIFF, bindingChanges: [{ keyIndex: 0 }] },
  };
  render(
    <LanguageProvider>
      <KeymapSharingMenu onApplied={jest.fn()} />
    </LanguageProvider>,
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save to Abyss" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(mockSharing.setReview).toHaveBeenCalledWith(null);
  expect(mockSharing.confirm).not.toHaveBeenCalled();
});
