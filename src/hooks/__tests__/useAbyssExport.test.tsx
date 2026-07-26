/**
 * Tests for which Abyss API call an export makes.
 *
 * The choice depends on how the connected layout resolved, and getting it wrong
 * either fails outright or quietly creates catalog records the user did not ask
 * for — so each branch is pinned here.
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import type { AbyssLayoutResolveResult } from "@keyboard-hub/abyss-client";
import type { ZmkLoadedConnection } from "@keyboard-hub/adapter-zmk";
import { useAbyssExport } from "../useAbyssExport";

jest.mock("../../lib/abyss/abyssClient");
import { getAbyssClient } from "../../lib/abyss/abyssClient";
const mockGetAbyssClient = getAbyssClient as jest.MockedFunction<
  typeof getAbyssClient
>;

const deviceKeymap = {
  keyboard: "dya2",
  name: "DYA Keyboard (Demo)",
  layers: [{ name: "Base", bindings: ["d0"] }],
  combos: ["device-combo"],
  macros: ["device-macro"],
  modules: ["device-module"],
};

const loaded = {
  deviceName: "DYA Keyboard (Demo)",
  state: {
    currentKeymap: deviceKeymap,
    detectedLayout: { name: "default", positions: [] },
  },
} as unknown as ZmkLoadedConnection;

const exactMatch = {
  keyboardExists: true,
  exists: true,
  layout: {
    id: "layout-1",
    name: "Default",
    variation: { id: "variation-1", positions: [] },
    latestVersion: { id: "version-1" },
  },
} as unknown as AbyssLayoutResolveResult;

const unregistered = {
  keyboardExists: false,
  exists: false,
  layout: null,
} as unknown as AbyssLayoutResolveResult;

type FakeClient = {
  listMyKeymaps: jest.Mock;
  getKeymap: jest.Mock;
  createKeymap: jest.Mock;
  updateKeymap: jest.Mock;
  importKeymap: jest.Mock;
  clearTokenSet: jest.Mock;
};

function useFakeClient(overrides: Partial<FakeClient> = {}): FakeClient {
  const client: FakeClient = {
    listMyKeymaps: jest.fn().mockResolvedValue({ items: [] }),
    getKeymap: jest.fn(),
    createKeymap: jest.fn().mockResolvedValue({ id: "k1", version: 1 }),
    updateKeymap: jest.fn().mockResolvedValue({ id: "k1", version: 2 }),
    importKeymap: jest.fn().mockResolvedValue({ id: "k2", version: 1 }),
    clearTokenSet: jest.fn(),
    ...overrides,
  };
  mockGetAbyssClient.mockReturnValue(
    client as unknown as ReturnType<typeof getAbyssClient>,
  );
  return client;
}

describe("useAbyssExport", () => {
  beforeEach(() => {
    mockGetAbyssClient.mockReset();
  });

  it("creates against the resolved variation when the layout matched exactly", async () => {
    const client = useFakeClient();
    const { result } = renderHook(() => useAbyssExport(loaded, exactMatch));
    await waitFor(() => expect(result.current.canExport).toBe(true));

    await act(async () => {
      await result.current.exportNow();
    });

    expect(client.createKeymap).toHaveBeenCalledWith(
      "variation-1",
      expect.objectContaining({ visibility: "private" }),
    );
    expect(client.importKeymap).not.toHaveBeenCalled();
    expect(result.current.result).toEqual({ id: "k1", version: 1 });
  });

  it("imports when the keyboard is not in the Abyss catalog", async () => {
    // importKeymap is the only call that may create the catalog records, so an
    // unregistered keyboard must not go through createKeymap.
    const client = useFakeClient();
    const { result } = renderHook(() => useAbyssExport(loaded, unregistered));
    await waitFor(() => expect(result.current.canExport).toBe(true));

    await act(async () => {
      await result.current.exportNow();
    });

    expect(client.importKeymap).toHaveBeenCalled();
    expect(client.createKeymap).not.toHaveBeenCalled();
  });

  it("appends a version and preserves the existing keymap's name", async () => {
    const client = useFakeClient({
      listMyKeymaps: jest.fn().mockResolvedValue({
        items: [
          {
            id: "existing-1",
            name: "My saved keymap",
            data: {
              keyboard: "dya2",
              name: "My saved keymap",
              description: "kept",
              layers: [{ name: "Old", bindings: ["a0"] }],
            },
          },
        ],
      }),
    });
    const { result } = renderHook(() => useAbyssExport(loaded, exactMatch));
    await waitFor(() => expect(result.current.keymaps).toHaveLength(1));

    act(() => {
      result.current.setMode("update");
      result.current.setSelectedKeymapId("existing-1");
    });
    await act(async () => {
      await result.current.exportNow();
    });

    expect(client.updateKeymap).toHaveBeenCalledWith(
      "existing-1",
      expect.objectContaining({
        layoutVariationId: "variation-1",
        layoutVersionId: "version-1",
      }),
    );
    const [, input] = client.updateKeymap.mock.calls[0];
    expect(input.data.name).toBe("My saved keymap");
    expect(input.data.layers[0].bindings).toEqual(["d0"]);
  });

  it("omits deselected sections from a new keymap", async () => {
    const client = useFakeClient();
    const { result } = renderHook(() => useAbyssExport(loaded, exactMatch));
    await waitFor(() => expect(result.current.canExport).toBe(true));

    act(() => {
      result.current.setSelection({
        keymap: true,
        combos: false,
        macros: false,
        modules: true,
      });
    });
    await act(async () => {
      await result.current.exportNow();
    });

    const [, input] = client.createKeymap.mock.calls[0];
    expect(input.data).not.toHaveProperty("combos");
    expect(input.data).not.toHaveProperty("macros");
    expect(input.data.modules).toEqual(["device-module"]);
  });

  it("surfaces a failure without a result", async () => {
    const client = useFakeClient({
      createKeymap: jest.fn().mockRejectedValue(new TypeError("offline")),
    });
    const { result } = renderHook(() => useAbyssExport(loaded, exactMatch));
    await waitFor(() => expect(result.current.canExport).toBe(true));

    await act(async () => {
      await result.current.exportNow();
    });

    expect(client.createKeymap).toHaveBeenCalled();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe(
      "Could not reach Abyss. Check your network connection.",
    );
  });

  it("cannot export before a device has been read", () => {
    useFakeClient();
    const { result } = renderHook(() => useAbyssExport(null, null));
    expect(result.current.canExport).toBe(false);
  });
});
