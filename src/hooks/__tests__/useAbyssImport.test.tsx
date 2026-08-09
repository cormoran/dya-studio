/**
 * Tests for the import/writeback flow.
 *
 * This is the only path that changes the keyboard, so what matters is when it
 * refuses to: an empty diff, a blocking pre-flight failure, or a deselected
 * section must all keep the write from happening.
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ZmkLoadedConnection } from "@keyboard-hub/adapter-zmk";
import { useAbyssImport } from "../useAbyssImport";
import type { UseAbyssDeviceReturn } from "../useAbyssDevice";
import type { KeymapDiff } from "../../lib/abyss/abyssDiff";

jest.mock("../../lib/abyss/abyssClient");
import { getAbyssClient } from "../../lib/abyss/abyssClient";
const mockGetAbyssClient = getAbyssClient as jest.MockedFunction<
  typeof getAbyssClient
>;

jest.mock("@keyboard-hub/adapter-common");
import { compareKeyboardHubKeymaps } from "@keyboard-hub/adapter-common";
const mockCompare = compareKeyboardHubKeymaps as jest.MockedFunction<
  typeof compareKeyboardHubKeymaps
>;

jest.mock("@keyboard-hub/adapter-zmk");
import { writeZmkKeymapDiff } from "@keyboard-hub/adapter-zmk";
const mockWrite = writeZmkKeymapDiff as jest.MockedFunction<
  typeof writeZmkKeymapDiff
>;

const currentKeymap = {
  keyboard: "dya2",
  layers: [
    { name: "Base", bindings: new Array(87).fill({ type: "trans" }) },
    { name: "Nav", bindings: new Array(87).fill({ type: "trans" }) },
  ],
};

const abyssKeymap = {
  keyboard: "dya2",
  name: "Saved",
  layers: [{ name: "Base", bindings: new Array(87).fill({ type: "none" }) }],
};

const diffWithChanges: KeymapDiff = {
  bindingChanges: [
    { layerIndex: 0, layerName: "Base", keyIndex: 1, to: { type: "none" } },
  ],
  layerNameChanges: [],
  comboChanges: [{ index: 0, label: "Combo 1", to: {} }],
  macroChanges: [],
  moduleChanges: [],
};

const read = jest.fn().mockResolvedValue(undefined);

/**
 * Returns a *fresh* object each call, on purpose.
 *
 * The hook must key its keymap-list effect on stable primitives rather than the
 * device object; depending on the object made the effect re-run every render
 * and cancel its own in-flight request, so the list never populated. Keep this
 * unstable — it is what catches that regression.
 */
function makeDevice(): UseAbyssDeviceReturn {
  return {
    loaded: {
      deviceName: "DYA Keyboard (Demo)",
      state: {
        currentKeymap,
        detectedLayout: { name: "DYA2 ANSI" },
        detectedModules: [],
      },
    } as unknown as ZmkLoadedConnection,
    resolved: null,
    phase: "done",
    isReading: false,
    error: null,
    read,
  };
}

function setUpAbyssClient(
  items: unknown[] = [{ id: "k1", name: "Saved", data: abyssKeymap }],
) {
  const client = {
    listMyKeymaps: jest.fn().mockResolvedValue({ items, pageCount: 1 }),
    getKeymap: jest.fn().mockResolvedValue({ data: abyssKeymap }),
    clearTokenSet: jest.fn(),
  };
  mockGetAbyssClient.mockReturnValue(
    client as unknown as ReturnType<typeof getAbyssClient>,
  );
  return client;
}

/** Renders the hook with a keymap already selected and a diff computed. */
async function renderSelected(diff: KeymapDiff = diffWithChanges) {
  setUpAbyssClient();
  mockCompare.mockReturnValue(diff as never);
  const rendered = renderHook(() => useAbyssImport(makeDevice()));
  await waitFor(() => expect(rendered.result.current.keymaps).toHaveLength(1));
  await act(async () => {
    await rendered.result.current.selectKeymap("k1");
  });
  return rendered;
}

describe("useAbyssImport", () => {
  beforeEach(() => {
    mockGetAbyssClient.mockReset();
    mockCompare.mockReset();
    mockWrite.mockReset();
    read.mockClear();
    mockWrite.mockResolvedValue(undefined as never);
  });

  it("writes the filtered diff and re-reads to confirm", async () => {
    const { result } = await renderSelected();
    expect(result.current.canWrite).toBe(true);

    await act(async () => {
      await result.current.write();
    });

    expect(mockWrite).toHaveBeenCalledTimes(1);
    // The re-read is what proves the keyboard accepted the write, rather than
    // trusting the diff we hoped to apply.
    expect(read).toHaveBeenCalledTimes(1);
    expect(result.current.didWrite).toBe(true);
  });

  it("only writes the sections the user kept ticked", async () => {
    const { result } = await renderSelected();

    act(() => {
      result.current.setSelection({
        keymap: true,
        combos: false,
        macros: false,
        modules: false,
      });
    });
    await act(async () => {
      await result.current.write();
    });

    const [, written] = mockWrite.mock.calls[0] as unknown as [
      unknown,
      KeymapDiff,
    ];
    expect(written.bindingChanges).toHaveLength(1);
    expect(written.comboChanges).toHaveLength(0);
  });

  it("refuses to write when the keymap already matches", async () => {
    const { result } = await renderSelected({
      bindingChanges: [],
      layerNameChanges: [],
      comboChanges: [],
      macroChanges: [],
      moduleChanges: [],
    });

    expect(result.current.isInSync).toBe(true);
    expect(result.current.canWrite).toBe(false);
  });

  it("refuses to write when every section is deselected", async () => {
    const { result } = await renderSelected();

    act(() => {
      result.current.setSelection({
        keymap: false,
        combos: false,
        macros: false,
        modules: false,
      });
    });

    expect(result.current.canWrite).toBe(false);
  });

  it("blocks a keymap that is wider than the keyboard", async () => {
    setUpAbyssClient([
      {
        id: "k1",
        name: "Too wide",
        data: {
          keyboard: "dya2",
          layers: [{ name: "Base", bindings: new Array(104).fill({}) }],
        },
      },
    ]);
    mockCompare.mockReturnValue(diffWithChanges as never);
    const { result } = renderHook(() => useAbyssImport(makeDevice()));
    await waitFor(() => expect(result.current.keymaps).toHaveLength(1));

    await act(async () => {
      await result.current.selectKeymap("k1");
    });

    expect(result.current.preflight.map((c) => c.id)).toContain("key-count");
    expect(result.current.canWrite).toBe(false);
  });

  it("surfaces a locked keyboard with the shared unlock message", async () => {
    const { result } = await renderSelected();
    mockWrite.mockRejectedValue(
      Object.assign(new Error("locked"), { name: "FirmwareLockedError" }),
    );

    await act(async () => {
      await result.current.write();
    });

    expect(result.current.didWrite).toBe(false);
    expect(result.current.error).toBe(
      "The operation failed because the device is locked in ZMK Studio. Unlock the keyboard and try again.",
    );
  });

  it("cannot write before a keymap is selected", async () => {
    setUpAbyssClient();
    mockCompare.mockReturnValue(diffWithChanges as never);
    const { result } = renderHook(() => useAbyssImport(makeDevice()));
    await waitFor(() => expect(result.current.keymaps).toHaveLength(1));

    expect(result.current.canWrite).toBe(false);
    expect(mockWrite).not.toHaveBeenCalled();
  });
});
