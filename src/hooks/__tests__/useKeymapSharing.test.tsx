import { act, renderHook } from "@testing-library/react";
import { ZMKAppContext } from "@cormoran/zmk-studio-react-hook";
import { useKeymapSharing } from "../useKeymapSharing";
import { EMPTY_DIFF } from "../../lib/abyss/abyssDiff";
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
const changed = {
  ...EMPTY_DIFF,
  bindingChanges: [
    {
      layerIndex: 0,
      layerName: "Base",
      keyIndex: 0,
      from: { type: "trans" },
      to: { type: "none" },
    },
  ],
};
function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ZMKAppContext.Provider value={app as never}>
      {children}
    </ZMKAppContext.Provider>
  );
}
const applied = jest.fn().mockResolvedValue(undefined);
beforeEach(() => {
  jest.clearAllMocks();
  mockLoad.mockResolvedValue({ state: { currentKeymap: device } });
  mockCall.mockResolvedValue({ error: { code: 0 } }); // older firmware
  mockWrite.mockResolvedValue(undefined);
  client.getKeymap.mockResolvedValue(record);
  client.updateKeymap.mockResolvedValue({ id: "one", version: 2 });
  (getAbyssClient as jest.Mock).mockReturnValue(client);
  mockCompare.mockImplementation((a, b) =>
    JSON.stringify(a.layers) === JSON.stringify(b.layers)
      ? EMPTY_DIFF
      : changed,
  );
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
it("revalidates keyboard state before applying and retains the diff on conflict", async () => {
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
  expect(result.current.review).not.toBeNull();
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
  expect(applied).not.toHaveBeenCalled();
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
