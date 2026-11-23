import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import {
  ZMKAppProvider,
  createMockZMKApp,
  createMockSubsystems,
} from "@cormoran/zmk-studio-react-hook/testing";
import {
  useCustomSettings,
  CUSTOM_SETTINGS_IDENTIFIER,
} from "../useCustomSettings";
import {
  Notification,
  Request,
  Response,
  SettingNotificationKind,
} from "../../proto/cormoran/zmk/custom_settings/custom_settings";

const mockCall = jest.fn();
jest.mock("../useCustomSubsystem", () => ({
  useCustomSubsystem: () => ({
    subsystem: { index: 9, identifier: CUSTOM_SETTINGS_IDENTIFIER },
    ready: true,
    call: (req: Request) => mockCall(req),
  }),
}));

describe("useCustomSettings subsystem index resolution", () => {
  beforeEach(() => {
    mockCall.mockReset();
  });

  it("matches device subsystem.index rather than array position when scoping and labeling sections", async () => {
    // Deliberately put a high index at position 0 so array position !== subsystem.index
    const subsystems = createMockSubsystems([
      { index: 17, identifier: "cormoran__runtime_tapdance", uiUrl: [] },
      { index: 5, identifier: "cormoran__pmw3610", uiUrl: [] },
      { index: 9, identifier: CUSTOM_SETTINGS_IDENTIFIER, uiUrl: [] },
    ]);

    let notifyCallback: ((n: { payload: Uint8Array }) => void) | null = null;
    const mockZmkApp = createMockZMKApp({
      state: {
        connection: null,
        deviceInfo: null,
        customSubsystems: subsystems,
        isLoading: false,
        error: null,
      },
      onNotification: jest.fn(
        (sub: { callback: (n: { payload: Uint8Array }) => void }) => {
          notifyCallback = sub.callback;
          return () => {
            notifyCallback = null;
          };
        },
      ),
    });

    mockCall.mockImplementation(async (req: Request) => {
      if (req.listSettings) {
        queueMicrotask(() => {
          const payload = Notification.encode(
            Notification.create({
              setting: {
                kind: SettingNotificationKind.SETTING_NOTIFICATION_KIND_LIST_ITEM,
                setting: {
                  customSubsystemIndex: 5,
                  key: "cpi",
                  value: { uint32Value: 800 },
                  hasUnsavedValue: false,
                  source: 0,
                },
              },
            }),
          ).finish();
          notifyCallback?.({ payload });
        });
        return Response.create({ listSettings: { count: 1 } });
      }
      return Response.create({});
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ZMKAppProvider value={mockZmkApp}>{children}</ZMKAppProvider>
    );

    const { result } = renderHook(
      () => useCustomSettings({ subsystemIdentifier: "cormoran__pmw3610" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.sections).toHaveLength(1));

    // Must pass device-assigned index 5 (NOT array position 1)
    expect(mockCall).toHaveBeenCalledWith(
      expect.objectContaining({
        listSettings: expect.objectContaining({
          scope: expect.objectContaining({ customSubsystemIndex: 5 }),
        }),
      }),
    );
    // Must label section using subsystem.index === 5 ("cormoran__pmw3610")
    expect(result.current.sections[0]).toMatchObject({
      customSubsystemIndex: 5,
      identifier: "cormoran__pmw3610",
    });
  });
});
