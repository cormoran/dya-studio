import { act, renderHook, waitFor } from "@testing-library/react";
import { useRuntimeTapDance } from "../useRuntimeTapDance";
import { RuntimeTapDanceHandler } from "../../lib/transport/demo-runtime-tapdance";
import {
  Config,
  Request,
  Response,
} from "../../proto/cormoran/runtime_tapdance/runtime_tapdance";

const mockCall = jest.fn();
let handler: RuntimeTapDanceHandler;
jest.mock("../useCustomSubsystem", () => ({
  useCustomSubsystem: () => ({
    subsystem: { index: 17 },
    ready: true,
    call: mockCall,
  }),
}));
beforeEach(() => {
  handler = new RuntimeTapDanceHandler();
  mockCall
    .mockReset()
    .mockImplementation(async (request: Request) =>
      Response.decode(
        Response.encode(
          handler.process(Request.decode(Request.encode(request).finish())),
        ).finish(),
      ),
    );
});
const config = () =>
  Config.create({
    singleBinding: { behaviorId: 10, param1: 0x70007 },
    doubleBinding: {},
    tripleBinding: {},
  });
async function loaded() {
  const hook = renderHook(() => useRuntimeTapDance());
  await waitFor(() => expect(hook.result.current.entries).toHaveLength(1));
  return hook;
}
it("loads named sparse IDs, allocates on create, and persists bindings through the wire codec", async () => {
  const { result } = await loaded();
  expect(result.current.entries[0].index).toBe(7);
  expect(
    mockCall.mock.calls
      .filter(([request]) => request.get)
      .map(([request]) => request.get.index),
  ).toEqual([7]);
  let id: number | null = null;
  await act(async () => {
    id = await result.current.create("New");
  });
  expect(id).toBe(8);
  expect(result.current.hasUnsavedChanges).toBe(true);
  await act(async () => {
    expect(await result.current.save(id!, config())).toBe(true);
  });
  expect(
    mockCall.mock.calls
      .filter(([request]) => request.set)
      .every(([request]) => request.set.persist === false),
  ).toBe(true);
  expect(mockCall).toHaveBeenCalledWith(expect.objectContaining({ save: {} }));
  await act(async () => {
    await result.current.load();
  });
  expect(
    result.current.entries.find((entry) => entry.index === id)?.config
      ?.singleBinding?.param1,
  ).toBe(0x70007);
  expect(result.current.hasUnsavedChanges).toBe(false);
});
it("clears triple before double so intermediate firmware states stay valid", async () => {
  const { result } = await loaded();
  await act(async () => {
    expect(await result.current.save(7, config(), false)).toBe(true);
  });
  expect(
    mockCall.mock.calls
      .filter(([request]) => request.set)
      .map(([request]) => request.set.tapCount),
  ).toEqual([3, 2, 1]);
  expect(mockCall.mock.calls.some(([request]) => request.save)).toBe(false);
  expect(result.current.hasUnsavedChanges).toBe(true);
});
it("reports partial RAM writes and preserves retry without claiming flash success", async () => {
  const { result } = await loaded();
  const original = mockCall.getMockImplementation()!;
  let sets = 0;
  mockCall.mockImplementation(async (request: Request) =>
    request.set && ++sets === 2
      ? Response.create({ error: { code: -5, message: "write failed" } })
      : original(request),
  );
  await act(async () => {
    expect(await result.current.save(7, config())).toBe(false);
  });
  expect(result.current.error).toContain("some changes may already be applied");
  expect(mockCall.mock.calls.some(([request]) => request.save)).toBe(false);
  await act(async () => {
    expect(await result.current.save(7, config())).toBe(true);
  });
  expect(result.current.error).toBeNull();
});
it("discards new allocations, preserves monotonic IDs, and permanently frees deletes", async () => {
  const { result } = await loaded();
  let first: number | null = null,
    second: number | null = null;
  await act(async () => {
    first = await result.current.create("First");
  });
  await act(async () => {
    expect(await result.current.discardChanges()).toBe(true);
  });
  expect(result.current.entries.some((entry) => entry.index === first)).toBe(
    false,
  );
  await act(async () => {
    second = await result.current.create("Second");
  });
  expect(second!).toBeGreaterThan(first!);
  await act(async () => {
    expect(await result.current.saveChanges()).toBe(true);
  });
  const used = result.current.globalSettings!.poolBytesUsed;
  await act(async () => {
    expect(await result.current.remove(second!)).toBe(true);
  });
  expect(result.current.globalSettings!.poolBytesUsed).toBeLessThan(used);
  await act(async () => {
    await result.current.discardChanges();
  });
  expect(result.current.entries.some((entry) => entry.index === second)).toBe(
    false,
  );
});
it("paginates named entries without treating IDs as array positions", async () => {
  for (let i = 0; i < 6; i++)
    handler.process(Request.create({ create: { name: `Dance ${i}` } }));
  const { result } = renderHook(() => useRuntimeTapDance());
  await waitFor(() => expect(result.current.entries).toHaveLength(7));
  expect(
    mockCall.mock.calls
      .filter(([request]) => request.list)
      .map(([request]) => request.list.hasAfterId),
  ).toEqual([false, true]);
  expect(result.current.entries.map((entry) => entry.index)).toEqual([
    7, 8, 9, 10, 11, 12, 13,
  ]);
});
it("handles pool exhaustion and allocation recovery without changing existing entries", async () => {
  const { result } = await loaded();
  let last: number | null = null;
  for (let i = 0; i < 12; i++) {
    let created: number | null = null;
    await act(async () => {
      created = await result.current.create(`Dance ${i}`);
    });
    if (created === null) break;
    last = created;
  }
  expect(result.current.error).toContain("Shared pool capacity exhausted");
  expect(result.current.entries.find((entry) => entry.index === 7)?.name).toBe(
    "Alphabet",
  );
  await act(async () => {
    await result.current.remove(last!);
  });
  await act(async () => {
    expect(await result.current.create("Recovered")).not.toBeNull();
  });
});
it("writes interval to RAM and restores it with Discard", async () => {
  const { result } = await loaded();
  await act(async () => {
    expect(await result.current.saveInterval(300)).toBe(true);
  });
  expect(result.current.intervalMs).toBe(300);
  expect(result.current.hasUnsavedChanges).toBe(true);
  await act(async () => {
    await result.current.discardChanges();
  });
  expect(result.current.intervalMs).toBe(200);
});
it("explains the API upgrade for legacy firmware and issues no mutation", async () => {
  mockCall.mockResolvedValue(
    Response.create({ error: { code: -95, message: "Unsupported request" } }),
  );
  const { result } = renderHook(() => useRuntimeTapDance());
  await waitFor(() =>
    expect(result.current.error).toContain(
      "Update the runtime tapdance firmware",
    ),
  );
  expect(mockCall).toHaveBeenCalledTimes(1);
  await act(async () => {
    expect(await result.current.create("Unsafe")).toBeNull();
  });
  expect(mockCall).toHaveBeenCalledTimes(1);
});
