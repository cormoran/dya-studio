import { act, renderHook } from "@testing-library/react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { useKeymapSharing } from "../useKeymapSharing";
// Use the pure production comparator (type-only dependencies) to assert exact payloads.
import { compareKeyboardHubKeymaps as compareActual } from "../../../node_modules/@keyboard-hub/adapter-common/src/schema/diff";
import { ALL_SHARING_PARTS } from "../../lib/abyss/keymapSharing";
import {
  loadZmkConnection,
  writeZmkKeymapDiff,
} from "@keyboard-hub/adapter-zmk";
import { compareKeyboardHubKeymaps } from "@keyboard-hub/adapter-common";
import { getAbyssClient } from "../../lib/abyss/abyssClient";

jest.mock("@keyboard-hub/adapter-zmk");
jest.mock("@keyboard-hub/adapter-common");
jest.mock("../../lib/abyss/abyssClient");
jest.mock("../useStudioUnlock", () => ({
  useStudioUnlock: () => ({ runWithUnlock: (fn: () => unknown) => fn() }),
}));
const mockCall = jest.fn();
jest.mock("../useCustomSubsystem", () => ({
  useCustomSubsystem: () => ({ ready: true, call: mockCall }),
}));
const mockLoad = loadZmkConnection as jest.Mock;
const mockWrite = writeZmkKeymapDiff as jest.Mock;
const mockCompare = compareKeyboardHubKeymaps as jest.Mock;
const device = {
  keyboard: "dya2",
  name: "Demo",
  layers: [{ name: "Base", bindings: [{ type: "trans" }] }],
};
const target = {
  ...device,
  layers: [{ name: "Base", bindings: [{ type: "none" }] }],
};
const record = { id: "one", name: "Saved", data: target };
const client = {
  getKeymap: jest.fn(),
  updateKeymap: jest.fn(),
  createKeymap: jest.fn(),
  importKeymap: jest.fn(),
  resolveLayout: jest.fn(),
  listMyKeymaps: jest.fn(),
  clearTokenSet: jest.fn(),
};
const app = {
  state: {
    connection: {},
    deviceInfo: { name: "Demo" },
    customSubsystems: { subsystems: [] },
  },
};
function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ZMKAppContext.Provider value={app as never}>
      {children}
    </ZMKAppContext.Provider>
  );
}
const mockTab = {
  opener: null,
  closed: false,
  close: jest.fn(),
  location: { replace: jest.fn() },
};
let openTab: jest.SpyInstance;
afterEach(() => openTab.mockRestore());
const applied = jest.fn().mockResolvedValue(undefined);
beforeEach(() => {
  jest.clearAllMocks();
  openTab = jest
    .spyOn(window, "open")
    .mockReturnValue(mockTab as unknown as Window);
  mockLoad.mockResolvedValue({ state: { currentKeymap: device } });
  mockCall.mockResolvedValue({ error: { code: 0 } }); // older firmware
  mockWrite.mockResolvedValue(undefined);
  client.getKeymap.mockResolvedValue(record);
  client.updateKeymap.mockResolvedValue({ id: "one", version: 2 });
  (getAbyssClient as jest.Mock).mockReturnValue(client);
  mockCompare.mockImplementation(compareActual);
});
it("previews a file without authentication and never writes on prepare or cancel", async () => {
  const { result } = renderHook(() => useKeymapSharing(false, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("apply", undefined, target);
  });
  expect(result.current.review?.after).toEqual(target);
  expect(mockWrite).not.toHaveBeenCalled();
  act(() => result.current.setReview(null));
  expect(mockWrite).not.toHaveBeenCalled();
});
it("rejects malformed JSON before a write", async () => {
  const { result } = renderHook(() => useKeymapSharing(false, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("apply", undefined, { layers: "bad" });
  });
  expect(result.current.error).toMatch(/valid KeyboardHub/);
  expect(result.current.review).toBeNull();
  expect(mockWrite).not.toHaveBeenCalled();
});
it("blocks oversized layouts at confirm even if called directly", async () => {
  const { result } = renderHook(() => useKeymapSharing(false, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("apply", undefined, {
      ...target,
      layers: [
        { name: "Base", bindings: [{ type: "none" }, { type: "none" }] },
      ],
    });
  });
  await act(async () => {
    await result.current.confirm();
  });
  expect(mockWrite).not.toHaveBeenCalled();
});
it("revalidates keyboard state before applying and reports conflicts in the result", async () => {
  const { result } = renderHook(() => useKeymapSharing(false, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("apply", undefined, target);
  });
  mockLoad.mockResolvedValue({ state: { currentKeymap: target } });
  await act(async () => {
    await result.current.confirm();
  });
  expect(result.current.error).toMatch(/keyboard changed/);
  expect(result.current.review).toBeNull();
  expect(result.current.applyResult?.error).toMatch(/keyboard changed/);
  expect(result.current.applyResult?.attempted).toBe(false);
  expect(mockWrite).not.toHaveBeenCalled();
});
it("requires matching readback before reporting success on old firmware", async () => {
  const { result } = renderHook(() => useKeymapSharing(false, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("apply", undefined, target);
  });
  await act(async () => {
    await result.current.confirm();
  });
  expect(mockWrite).toHaveBeenCalledTimes(1);
  expect(result.current.error).toMatch(/does not yet match/);
  expect(applied).toHaveBeenCalledTimes(1);
  expect(result.current.review).toBeNull();
  expect(result.current.applyResult?.verified).toBe(false);
  expect(result.current.applyResult?.remaining?.bindingChanges).toHaveLength(1);
  await act(async () => {
    await result.current.prepare("apply", undefined, target);
  });
  mockLoad
    .mockResolvedValueOnce({ state: { currentKeymap: device } })
    .mockResolvedValueOnce({ state: { currentKeymap: target } });
  await act(async () => {
    await result.current.confirm();
  });
  expect(result.current.message).toBe("Applied to keyboard.");
  expect(result.current.review).toBeNull();
});
it("requires a review before cloud updates and refuses a changed remote base", async () => {
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("save", record as never);
  });
  expect(client.updateKeymap).not.toHaveBeenCalled();
  client.getKeymap.mockResolvedValue({ ...record, data: device });
  await act(async () => {
    await result.current.confirm();
  });
  expect(client.updateKeymap).not.toHaveBeenCalled();
  expect(result.current.error).toMatch(/Abyss keymap changed/);
});
it("discards an in-flight capture after the connection changes", async () => {
  let complete!: (data: unknown) => void;
  mockLoad.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const { result, rerender } = renderHook(
    () => useKeymapSharing(false, applied),
    { wrapper },
  );
  let pending!: Promise<unknown>;
  await act(async () => {
    pending = result.current.prepare("apply", undefined, target);
    await Promise.resolve();
  });
  app.state.connection = {};
  rerender();
  await act(async () => {
    complete({ state: { currentKeymap: device } });
    await pending;
  });
  expect(result.current.review).toBeNull();
  expect(mockWrite).not.toHaveBeenCalled();
});

it("clears a supported identity only after file application and readback succeed", async () => {
  let identifier = "aB_9";
  mockCall.mockImplementation(async (request) => {
    if (request.setKeymapIdentifier) {
      identifier = request.setKeymapIdentifier.identifier;
      return { setKeymapIdentifier: {} };
    }
    return { keymapIdentifier: { identifier } };
  });
  const { result } = renderHook(() => useKeymapSharing(false, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("apply", undefined, target);
  });
  expect(identifier).toBe("aB_9");
  mockLoad
    .mockResolvedValueOnce({ state: { currentKeymap: device } })
    .mockResolvedValueOnce({ state: { currentKeymap: target } });
  await act(async () => {
    await result.current.confirm();
  });
  expect(identifier).toBe("");
  expect(mockCall).toHaveBeenCalledWith({
    setKeymapIdentifier: { identifier: "" },
  });
  expect(result.current.message).toBe("Applied to keyboard.");
});

it("does not invite a duplicate record creation when identity persistence fails", async () => {
  mockCall.mockImplementation(async (request) =>
    request.setKeymapIdentifier
      ? { error: { code: 0 } }
      : { keymapIdentifier: { identifier: "" } },
  );
  client.importKeymap.mockResolvedValue({ id: "new-record", version: 1 });
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  let success = false;
  await act(async () => {
    success = await result.current.create("My new map", "private");
  });
  expect(success).toBe(true);
  expect(client.importKeymap).toHaveBeenCalledTimes(1);
  expect(result.current.message).toBe("Saved to Abyss.");
  expect(result.current.error).toMatch(/identity could not be stored/);
});

it("resolves the stored identifier to an owned map even when its bindings differ", async () => {
  const { keymapIdentifier } = await import("../../lib/abyss/keymapIdentity");
  const identifier = await keymapIdentifier("one");
  mockLoad.mockResolvedValue({
    state: { currentKeymap: device, detectedLayout: { name: "DYA2" } },
  });
  client.resolveLayout.mockResolvedValue({ layout: { id: "layout-one" } });
  client.listMyKeymaps.mockResolvedValue({ items: [record], pageCount: 1 });
  mockCall.mockResolvedValue({ keymapIdentifier: { identifier } });
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.refresh();
  });
  expect(result.current.current?.id).toBe("one");
  expect(result.current.changed).toBe(true);
  expect(result.current.identity).toBe("known");
  expect(client.listMyKeymaps).toHaveBeenCalledWith(
    expect.objectContaining({ layoutId: "layout-one", visibility: "all" }),
  );
});

it("previews both write directions from one captured snapshot without writing or rereading", async () => {
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("apply", record as never);
  });
  const captures = mockLoad.mock.calls.length;
  const reads = client.getKeymap.mock.calls.length;
  act(() => result.current.selectDirection("save"));
  expect(result.current.review?.kind).toBe("save");
  expect(result.current.review?.before).toEqual(target);
  expect(result.current.review?.after.layers).toEqual(device.layers);
  act(() => result.current.selectDirection("apply"));
  expect(result.current.review?.before).toEqual(device);
  expect(mockLoad).toHaveBeenCalledTimes(captures);
  expect(client.getKeymap).toHaveBeenCalledTimes(reads);
  expect(mockWrite).not.toHaveBeenCalled();
  expect(client.updateKeymap).not.toHaveBeenCalled();
});

it("opens the updated keymap only after the cloud write succeeds", async () => {
  let finish!: () => void;
  client.updateKeymap.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("save", record as never);
  });
  expect(openTab).not.toHaveBeenCalled();
  let pending!: Promise<boolean>;
  await act(async () => {
    pending = result.current.confirm();
    // Wait until the revalidation reads have reached the write.
    for (let i = 0; i < 10 && !finish; i++) await Promise.resolve();
  });
  expect(openTab).toHaveBeenCalledWith("about:blank", "_blank");
  expect(mockTab.location.replace).not.toHaveBeenCalled();
  await act(async () => {
    finish();
    await pending;
  });
  expect(mockTab.location.replace).toHaveBeenCalledWith(
    "https://abyss.keyboard-hub.com/keymap/one",
  );
  expect(mockTab.close).not.toHaveBeenCalled();
  expect(result.current.savedKeymapUrl).toBe(
    "https://abyss.keyboard-hub.com/keymap/one",
  );
});

it("closes the reserved tab when a cloud update fails", async () => {
  client.updateKeymap.mockRejectedValueOnce(new Error("Upload failed"));
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("save", record as never);
  });
  await act(async () => {
    await result.current.confirm();
  });
  expect(mockTab.close).toHaveBeenCalledTimes(1);
  expect(mockTab.location.replace).not.toHaveBeenCalled();
  expect(result.current.savedKeymapUrl).toBeNull();
  expect(result.current.error).toBe("Upload failed");
});

it("opens the newly created record even if later identity persistence fails", async () => {
  mockCall.mockImplementation(async (request) =>
    request.setKeymapIdentifier
      ? { error: { code: 0 } }
      : { keymapIdentifier: { identifier: "" } },
  );
  client.importKeymap.mockResolvedValueOnce({ id: "new-record", version: 1 });
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.create("New map", "private");
  });
  expect(mockTab.location.replace).toHaveBeenCalledWith(
    "https://abyss.keyboard-hub.com/keymap/new-record",
  );
  expect(mockTab.close).not.toHaveBeenCalled();
  expect(result.current.error).toMatch(/identity could not be stored/);
});

it("keeps a direct link and completes creation when the browser blocks the tab", async () => {
  openTab.mockReturnValueOnce(null);
  client.importKeymap.mockResolvedValueOnce({ id: "new-record", version: 1 });
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.create("New map", "private");
  });
  expect(result.current.message).toBe("Saved to Abyss.");
  expect(result.current.savedKeymapUrl).toBe(
    "https://abyss.keyboard-hub.com/keymap/new-record",
  );
  expect(mockTab.location.replace).not.toHaveBeenCalled();
});

it("reuses remote layouts, lists, and full records on menu reopen, but refresh forces requests", async () => {
  const { keymapIdentifier } = await import("../../lib/abyss/keymapIdentity");
  mockCall.mockResolvedValue({
    keymapIdentifier: { identifier: await keymapIdentifier("one") },
  });
  mockLoad.mockResolvedValue({
    state: { currentKeymap: device, detectedLayout: { name: "DYA2" } },
  });
  client.resolveLayout.mockResolvedValue({ layout: { id: "layout-one" } });
  client.listMyKeymaps.mockResolvedValue({ items: [record], pageCount: 1 });
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.refresh(false);
  });
  expect(result.current.current?.id).toBe("one");
  const captures = mockLoad.mock.calls.length;
  await act(async () => {
    await result.current.refresh(false);
  });
  expect(mockLoad.mock.calls.length).toBe(captures + 1); // device stays fresh
  expect(client.resolveLayout).toHaveBeenCalledTimes(1);
  expect(client.listMyKeymaps).toHaveBeenCalledTimes(1);
  expect(client.getKeymap).toHaveBeenCalledTimes(1);
  await act(async () => {
    await result.current.prepare("apply", record as never);
  });
  expect(client.getKeymap).toHaveBeenCalledTimes(1);
  await act(async () => {
    await result.current.refresh();
  });
  expect(client.resolveLayout).toHaveBeenCalledTimes(2);
  expect(client.listMyKeymaps).toHaveBeenCalledTimes(2);
  expect(client.getKeymap).toHaveBeenCalledTimes(2);
});

it("does not reuse another account's cached record", async () => {
  const { result, rerender } = renderHook(
    ({ account }) =>
      useKeymapSharing(true, applied, undefined, undefined, account),
    { wrapper, initialProps: { account: "a" } },
  );
  await act(async () => {
    await result.current.prepare("apply", record as never);
  });
  act(() => result.current.setReview(null));
  await act(async () => {
    await result.current.prepare("apply", record as never);
  });
  expect(client.getKeymap).toHaveBeenCalledTimes(1);
  rerender({ account: "b" });
  await act(async () => {
    await result.current.prepare("apply", record as never);
  });
  expect(client.getKeymap).toHaveBeenCalledTimes(2);
});

it("uploads only selected modules and preserves exclusions in the actual API payload", async () => {
  const ball = (scaleX: number) => ({
    name: "ball",
    type: "trackball",
    scaleX,
  });
  const remote = {
    ...record,
    data: {
      ...target,
      modules: [ball(1)],
      layers: [{ ...target.layers[0], modules: [ball(2)] }],
    },
  };
  const local = {
    ...device,
    modules: [ball(9)],
    layers: [{ ...device.layers[0], modules: [ball(8)] }],
  };
  client.getKeymap.mockResolvedValue(remote);
  mockLoad.mockResolvedValue({ state: { currentKeymap: local } });
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("save", record as never);
  });
  act(() =>
    result.current.selectParts({ ...ALL_SHARING_PARTS, keymap: false }),
  );
  expect(result.current.review?.diff.bindingChanges).toHaveLength(0);
  expect(result.current.review?.diff.moduleChanges).toHaveLength(2);
  act(() => result.current.selectDirection("apply"));
  expect(result.current.review?.selection.keymap).toBe(false);
  act(() => result.current.selectDirection("save"));
  await act(async () => {
    await result.current.confirm();
  });
  expect(client.updateKeymap).toHaveBeenCalledWith(
    "one",
    expect.objectContaining({
      data: expect.objectContaining({
        layers: [{ ...target.layers[0], modules: [ball(8)] }],
        modules: [ball(9)],
      }),
    }),
  );
});

it("applies the selected keymap without excluded global/layer modules and clears full-map identity", async () => {
  const ball = (scaleX: number) => ({
    name: "ball",
    type: "trackball",
    scaleX,
  });
  const local = {
    ...device,
    modules: [ball(1)],
    layers: [{ ...device.layers[0], modules: [ball(2)] }],
  };
  const remote = {
    ...target,
    modules: [ball(9)],
    layers: [{ ...target.layers[0], modules: [ball(8)] }],
  };
  mockLoad.mockResolvedValue({ state: { currentKeymap: local } });
  let identifier = "aB_9";
  mockCall.mockImplementation(async (request) => {
    if (request.setKeymapIdentifier) {
      identifier = request.setKeymapIdentifier.identifier;
      return { setKeymapIdentifier: {} };
    }
    return { keymapIdentifier: { identifier } };
  });
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  client.getKeymap.mockResolvedValue({ ...record, data: remote });
  await act(async () => {
    await result.current.prepare("apply", record as never);
  });
  act(() =>
    result.current.selectParts({
      ...ALL_SHARING_PARTS,
      modules: { ball: false },
    }),
  );
  expect(result.current.review?.diff.moduleChanges).toHaveLength(0);
  mockLoad
    .mockResolvedValueOnce({ state: { currentKeymap: local } })
    .mockResolvedValueOnce({
      state: {
        currentKeymap: {
          ...local,
          layers: [{ ...local.layers[0], bindings: remote.layers[0].bindings }],
        },
      },
    });
  await act(async () => {
    await result.current.confirm();
  });
  expect(mockWrite).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      moduleChanges: [],
      bindingChanges: expect.any(Array),
    }),
  );
  expect(result.current.error).toBeNull();
  expect(identifier).toBe("");
});

it("does not write or open a tab with every part excluded", async () => {
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("save", record as never);
  });
  act(() =>
    result.current.selectParts({
      keymap: false,
      combos: false,
      macros: false,
      modules: {},
    }),
  );
  expect(result.current.review?.diff.bindingChanges).toHaveLength(0);
  await act(async () => {
    expect(await result.current.confirm()).toBe(false);
  });
  expect(client.updateKeymap).not.toHaveBeenCalled();
  expect(openTab).not.toHaveBeenCalled();
});

it("keeps the Abyss preview busy during writing and closes it only after verified application", async () => {
  const { result } = renderHook(() => useKeymapSharing(false, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("apply", record as never);
  });
  let finishWrite!: () => void;
  mockWrite.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishWrite = resolve;
      }),
  );
  mockLoad
    .mockResolvedValueOnce({ state: { currentKeymap: device } })
    .mockResolvedValueOnce({ state: { currentKeymap: target } });
  let pending!: Promise<boolean>;
  await act(async () => {
    pending = result.current.confirm();
  });
  expect(result.current.busy).toBe(true);
  expect(result.current.review?.record?.id).toBe("one");
  expect(applied).not.toHaveBeenCalled();
  await act(async () => {
    finishWrite();
    expect(await pending).toBe(true);
  });
  expect(applied).toHaveBeenCalledTimes(1);
  expect(result.current.busy).toBe(false);
  expect(result.current.review).toBeNull();
  expect(result.current.message).toBe("Applied to keyboard.");
});

it.each(["success", "rejected", "mismatched"] as const)(
  "stores the Abyss identifier after verified application: %s",
  async (outcome) => {
    const { keymapIdentifier } = await import("../../lib/abyss/keymapIdentity");
    const expected = await keymapIdentifier(record.id);
    let identifier = "";
    mockCall.mockImplementation(async (request) => {
      if (request.setKeymapIdentifier) {
        if (outcome === "rejected") return { error: { code: 0 } };
        if (outcome === "success")
          identifier = request.setKeymapIdentifier.identifier;
        return { setKeymapIdentifier: {} };
      }
      return { keymapIdentifier: { identifier } };
    });
    const { result } = renderHook(() => useKeymapSharing(false, applied), {
      wrapper,
    });
    await act(async () => {
      await result.current.prepare("apply", record as never);
    });
    expect(mockCall).not.toHaveBeenCalledWith(
      expect.objectContaining({ setKeymapIdentifier: expect.anything() }),
    );
    mockLoad
      .mockResolvedValueOnce({ state: { currentKeymap: device } })
      .mockResolvedValueOnce({ state: { currentKeymap: target } });
    await act(async () => {
      await result.current.confirm();
    });
    expect(mockCall).toHaveBeenCalledWith({
      setKeymapIdentifier: { identifier: expected },
    });
    if (outcome === "success") {
      expect(identifier).toBe(expected);
      expect(result.current.review).toBeNull();
      expect(result.current.error).toBeNull();
      expect(applied).toHaveBeenCalledTimes(1);
    } else {
      expect(result.current.review).toBeNull();
      expect(result.current.applyResult?.verified).toBe(true);
      expect(result.current.applyResult?.error).toMatch(
        /identity could not be/,
      );
      expect(result.current.error).toMatch(/identity could not be/);
      expect(result.current.message).toBeNull();
      expect(applied).toHaveBeenCalledTimes(1);
    }
  },
);

it("updates only the supported Abyss identifier when keyboard settings already match", async () => {
  const { keymapIdentifier } = await import("../../lib/abyss/keymapIdentity");
  const expected = await keymapIdentifier(record.id);
  let identifier = "old_";
  mockLoad.mockResolvedValue({ state: { currentKeymap: target } });
  mockCall.mockImplementation(async (request) => {
    if (request.setKeymapIdentifier) {
      identifier = request.setKeymapIdentifier.identifier;
      return { setKeymapIdentifier: {} };
    }
    return { keymapIdentifier: { identifier } };
  });
  const { result } = renderHook(() => useKeymapSharing(false, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("apply", record as never);
  });
  expect(result.current.review?.diff.bindingChanges).toHaveLength(0);
  expect(result.current.review?.identityMismatch).toBe(true);
  await act(async () => {
    expect(await result.current.confirm()).toBe(true);
  });
  expect(mockWrite).not.toHaveBeenCalled();
  expect(identifier).toBe(expected);
  expect(result.current.review).toBeNull();
});

it("lists keymaps for an Abyss compatible layout when there is no exact variation", async () => {
  mockLoad.mockResolvedValue({
    state: { currentKeymap: device, detectedLayout: { name: "DYA2" } },
  });
  client.resolveLayout.mockResolvedValueOnce({
    layout: null,
    compatibleLayout: { id: "layout-one" },
  });
  client.listMyKeymaps.mockResolvedValueOnce({ items: [record], pageCount: 1 });
  const { result } = renderHook(() => useKeymapSharing(true, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.refresh();
  });
  expect(result.current.keymaps).toEqual([record]);
  expect(client.listMyKeymaps).toHaveBeenCalledWith(
    expect.objectContaining({ layoutId: "layout-one" }),
  );
});

it("restores exact pointer scale fractions before readback and identifier storage", async () => {
  const pointer = (scaleX: number) => ({
    name: "scroll",
    type: "trackball",
    scaleX,
    scaleY: scaleX,
    firmwareDialect: { zmk: { cormoran_rip: { processorId: 1 } } },
  });
  const local = { ...device, modules: [pointer(0.017)] };
  const remote = { ...target, modules: [pointer(1 / 60)] };
  mockLoad.mockResolvedValue({ state: { currentKeymap: local } });
  client.getKeymap.mockResolvedValueOnce({ ...record, data: remote });
  mockCall.mockImplementation(async (request) => {
    if (request.setScaleMultiplier) return { setScaleMultiplier: {} };
    if (request.setScaleDivisor) return { setScaleDivisor: {} };
    return { error: { code: 0 } }; // old identity firmware
  });
  const { result } = renderHook(() => useKeymapSharing(false, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("apply", record as never);
  });
  mockLoad
    .mockResolvedValueOnce({ state: { currentKeymap: local } })
    .mockResolvedValueOnce({ state: { currentKeymap: remote } });
  await act(async () => {
    expect(await result.current.confirm()).toBe(true);
  });
  expect(mockCall).toHaveBeenCalledWith(
    expect.objectContaining({ setScaleMultiplier: { id: 1, value: 1 } }),
  );
  expect(mockCall).toHaveBeenCalledWith(
    expect.objectContaining({ setScaleDivisor: { id: 1, value: 60 } }),
  );
  expect(result.current.review).toBeNull();
  expect(result.current.error).toBeNull();
});

it("skips raw changes, applies supported bindings, and stores the selected Abyss identity", async () => {
  const local = {
    ...device,
    layers: [
      { name: "Base", bindings: [{ type: "trans" }, { type: "trans" }] },
    ],
  };
  const remote = {
    ...target,
    layers: [
      {
        name: "Base",
        bindings: [
          { type: "raw", label: "Custom", zmk: "&custom" },
          { type: "key", usage: 4 },
        ],
      },
    ],
  };
  const actual = {
    ...remote,
    layers: [
      {
        ...remote.layers[0],
        bindings: [local.layers[0].bindings[0], remote.layers[0].bindings[1]],
      },
    ],
  };
  mockLoad.mockResolvedValue({ state: { currentKeymap: local } });
  client.getKeymap.mockResolvedValueOnce({ ...record, data: remote });
  let identifier = "old_";
  mockCall.mockImplementation(async (request) => {
    if (request.setKeymapIdentifier) {
      identifier = request.setKeymapIdentifier.identifier;
      return { setKeymapIdentifier: {} };
    }
    return { keymapIdentifier: { identifier } };
  });
  const { result } = renderHook(() => useKeymapSharing(false, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("apply", record as never);
  });
  mockLoad
    .mockResolvedValueOnce({ state: { currentKeymap: local } })
    .mockResolvedValueOnce({ state: { currentKeymap: actual } });
  await act(async () => {
    expect(await result.current.confirm()).toBe(true);
  });
  expect(mockWrite).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      bindingChanges: [expect.objectContaining({ keyIndex: 1 })],
    }),
  );
  expect(result.current.applyResult).toMatchObject({
    verified: true,
    error: null,
    skipped: { bindingChanges: [expect.objectContaining({ keyIndex: 0 })] },
  });
  const { keymapIdentifier } = await import("../../lib/abyss/keymapIdentity");
  expect(identifier).toBe(await keymapIdentifier(record.id));
  expect(result.current.review).toBeNull();
  expect(result.current.message).toBe("Finished with skipped changes.");
});

it("closes the preview and reports write errors without claiming verification", async () => {
  const { result } = renderHook(() => useKeymapSharing(false, applied), {
    wrapper,
  });
  await act(async () => {
    await result.current.prepare("apply", undefined, target);
  });
  mockWrite.mockRejectedValueOnce(new Error("RPC write failed"));
  await act(async () => {
    expect(await result.current.confirm()).toBe(false);
  });
  expect(result.current.review).toBeNull();
  expect(result.current.applyResult).toMatchObject({
    verified: false,
    attempted: true,
    error: "RPC write failed",
    remaining: null,
  });
  expect(applied).toHaveBeenCalledTimes(1);
});

it("stores the selected Abyss identity even when all raw changes are skipped", async () => {
  const { keymapIdentifier } = await import("../../lib/abyss/keymapIdentity");
  const expected = await keymapIdentifier(record.id);
  let identifier = "old_";
  mockCall.mockImplementation(async (request) => {
    if (request.setKeymapIdentifier) {
      identifier = request.setKeymapIdentifier.identifier;
      return { setKeymapIdentifier: {} };
    }
    return { keymapIdentifier: { identifier } };
  });
  const rawTarget = {
    ...target,
    layers: [
      {
        name: "Base",
        bindings: [{ type: "raw", label: "Custom", zmk: "&custom" }],
      },
    ],
  };
  const { result } = renderHook(() => useKeymapSharing(false, applied), {
    wrapper,
  });
  await act(async () => {
    client.getKeymap.mockResolvedValueOnce({ ...record, data: rawTarget });
    await result.current.prepare("apply", record as never);
  });
  await act(async () => {
    expect(await result.current.confirm()).toBe(true);
  });
  expect(mockWrite).not.toHaveBeenCalled();
  expect(identifier).toBe(expected);
  expect(mockCall).toHaveBeenCalledWith({
    setKeymapIdentifier: { identifier: expected },
  });
  expect(result.current.review).toBeNull();
  expect(result.current.applyResult).toMatchObject({
    verified: true,
    attempted: false,
    error: null,
    skipped: { bindingChanges: [expect.objectContaining({ keyIndex: 0 })] },
  });
});

it.each(["write", "readback", "write-and-identity"] as const)(
  "stores and refreshes the selected source independently of a %s failure",
  async (failure) => {
    const { keymapIdentifier } = await import("../../lib/abyss/keymapIdentity");
    const expected = await keymapIdentifier(record.id);
    let identifier = "old_";
    mockCall.mockImplementation(async (request) => {
      if (request.setKeymapIdentifier) {
        if (failure === "write-and-identity") return { error: { code: 0 } };
        identifier = request.setKeymapIdentifier.identifier;
        return { setKeymapIdentifier: {} };
      }
      return { keymapIdentifier: { identifier } };
    });
    mockLoad.mockResolvedValue({
      state: { currentKeymap: device, detectedLayout: { name: "DYA2" } },
    });
    client.resolveLayout.mockResolvedValue({ layout: { id: "layout-one" } });
    client.listMyKeymaps.mockResolvedValue({ items: [record], pageCount: 1 });
    if (failure !== "readback")
      mockWrite.mockRejectedValueOnce(
        new Error(
          "ZMK behavior is unavailable: Mouse Button Press / Mouse Button.",
        ),
      );
    const { result } = renderHook(() => useKeymapSharing(true, applied), {
      wrapper,
    });
    await act(async () => {
      await result.current.prepare("apply", record as never);
    });
    await act(async () => {
      expect(await result.current.confirm()).toBe(false);
    });
    expect(mockCall).toHaveBeenCalledWith({
      setKeymapIdentifier: { identifier: expected },
    });
    expect(result.current.review).toBeNull();
    expect(result.current.applyResult?.verified).toBe(false);
    expect(result.current.message).toBeNull();
    if (failure === "write-and-identity") {
      expect(identifier).toBe("old_");
      expect(result.current.applyResult?.error).toMatch(/Mouse Button Press/);
      expect(result.current.applyResult?.error).toMatch(
        /identity could not be stored/,
      );
    } else {
      expect(identifier).toBe(expected);
      expect(result.current.current?.id).toBe(record.id);
      expect(result.current.changed).toBe(true);
      expect(result.current.identity).toBe("known");
      expect(result.current.applyResult?.error).toMatch(
        failure === "write" ? /Mouse Button Press/ : /does not yet match/,
      );
    }
  },
);
