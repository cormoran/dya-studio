import { act, renderHook, waitFor } from "@testing-library/react";
import { useRuntimeTapDance } from "../useRuntimeTapDance";
import { RuntimeTapDanceHandler } from "../../lib/transport/demo-runtime-tapdance";
import {
  Config,
  Request,
  Response,
} from "../../proto/cormoran/runtime_tapdance/runtime_tapdance";

const mockCall = jest.fn();
jest.mock("../useCustomSubsystem", () => ({
  useCustomSubsystem: () => ({
    subsystem: { index: 17 },
    ready: true,
    call: mockCall,
  }),
}));
beforeEach(() => {
  const handler = new RuntimeTapDanceHandler();
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
it("loads every slot, persists changes, and reads them back through the wire codec", async () => {
  const { result } = renderHook(() => useRuntimeTapDance());
  await waitFor(() => expect(result.current.slots).toHaveLength(8));
  await act(async () => {
    expect(
      await result.current.save(
        1,
        Config.create({
          singleBinding: { behaviorId: 10, param1: 0x70007 },
          doubleBinding: {},
          tripleBinding: {},
        }),
      ),
    ).toBe(true);
  });
  expect(
    mockCall.mock.calls
      .filter(([req]) => req.set)
      .every(([req]) => req.set.persist),
  ).toBe(true);
  await act(async () => {
    await result.current.load();
  });
  expect(result.current.slots[1].singleBinding?.param1).toBe(0x70007);
});
it("clears triple before double so every intermediate configuration is valid", async () => {
  const { result } = renderHook(() => useRuntimeTapDance());
  await waitFor(() => expect(result.current.slots).toHaveLength(8));
  await act(async () => {
    expect(
      await result.current.save(
        0,
        Config.create({
          singleBinding: { behaviorId: 10, param1: 0x70004 },
          doubleBinding: {},
          tripleBinding: {},
        }),
      ),
    ).toBe(true);
  });
  expect(
    mockCall.mock.calls
      .filter(([req]) => req.set)
      .map(([req]) => req.set.tapCount),
  ).toEqual([3, 2, 1]);
});
it("reports a partial save and retries all actions without claiming success", async () => {
  const { result } = renderHook(() => useRuntimeTapDance());
  await waitFor(() => expect(result.current.slots).toHaveLength(8));
  const config = Config.create(result.current.slots[0]);
  mockCall
    .mockResolvedValueOnce({ state: { config, index: 0 } })
    .mockResolvedValueOnce({ error: { message: "write failed" } });
  await act(async () => {
    expect(await result.current.save(0, config)).toBe(false);
  });
  expect(result.current.error).toContain("some actions may already be saved");
  await act(async () => {
    expect(await result.current.save(0, config)).toBe(true);
  });
  expect(result.current.error).toBeNull();
});
it("saves interval and removes a slot with persistent RPCs", async () => {
  const { result } = renderHook(() => useRuntimeTapDance());
  await waitFor(() => expect(result.current.slots).toHaveLength(8));
  await act(async () => {
    expect(await result.current.saveInterval(300)).toBe(true);
  });
  await act(async () => {
    expect(await result.current.remove(0)).toBe(true);
  });
  await act(async () => {
    await result.current.load();
  });
  expect(result.current.intervalMs).toBe(300);
  expect(result.current.slots[0].singleBinding?.behaviorId).toBe(0);
  expect(mockCall).toHaveBeenCalledWith(
    expect.objectContaining({ remove: { index: 0, persist: true } }),
  );
});
it("turns a missing response into an error and allows an explicit reload", async () => {
  mockCall.mockResolvedValueOnce(null);
  const { result } = renderHook(() => useRuntimeTapDance());
  await waitFor(() =>
    expect(result.current.error).toContain("no tapdance state"),
  );
  await act(async () => {
    await result.current.load();
  });
  expect(result.current.slots).toHaveLength(8);
});
