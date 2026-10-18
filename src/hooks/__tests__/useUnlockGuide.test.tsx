import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  ZMKAppContext,
  ZMKCustomSubsystem,
} from "@cormoran/zmk-studio-react-hook";
import { useUnlockGuide } from "../useUnlockGuide";
import { FastKeymapCacheKeys, Request, Response } from "../../lib/fastKeymap";
import { FK_DEFINITION_VERSION } from "../../lib/fastKeymap/standardBehaviors";

const device = "unlock-guide-lifecycle";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    FastKeymapCacheKeys.behaviors(device),
    JSON.stringify({
      fp: 11,
      defFpBits: 16,
      behaviors: [
        {
          localId: 41,
          alias: "studio_unlock",
          displayName: "Studio Unlock",
          defFp: 5,
          metadata: [],
        },
      ],
    }),
  );
  localStorage.setItem(
    FastKeymapCacheKeys.layer(device, 33),
    JSON.stringify([{ behaviorId: 41, param1: 0, param2: 0 }]),
  );
  localStorage.setItem(
    FastKeymapCacheKeys.layouts(device),
    JSON.stringify({
      fp: 22,
      activeLayoutIndex: 0,
      layouts: [
        {
          name: "Active",
          fp: 1,
          keys: [{ x: 0, y: 0, width: 100, height: 100, r: 0, rx: 0, ry: 0 }],
        },
      ],
    }),
  );
});
afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

it("settles after getSnapshot despite fresh subsystem objects and reloads for a new session or index", async () => {
  const requests: Request[] = [];
  let allowedSnapshots = 1;
  jest
    .spyOn(ZMKCustomSubsystem.prototype, "callRPC")
    .mockImplementation(async (payload) => {
      const request = Request.decode(payload);
      requests.push(request);
      if (!request.getSnapshot)
        throw new Error(`Unexpected RPC: ${JSON.stringify(request)}`);
      // Stop a regressed implementation flooding React; the extra request still
      // fails the exact-count assertions instead of timing out the whole suite.
      if (requests.length > allowedSnapshots)
        return new Promise<Uint8Array>(() => {});
      return Response.encode(
        Response.fromPartial({
          snapshot: {
            definitionVersion: FK_DEFINITION_VERSION,
            behaviorsFp: 11,
            physicalLayoutFp: 22,
            defFpBits: 16,
            activeLayoutIndex: 0,
            layers: [
              { id: 7, name: "Base", bindingCount: 1, fp: 33, defaultFp: 33 },
            ],
          },
        }),
      ).finish();
    });
  let connection = {};
  let index: number | null = 2;
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ZMKAppContext.Provider
        value={
          {
            state: { connection, deviceInfo: { name: device } },
            // Match useZMKApp.findSubsystem: a new descriptor on every lookup.
            findSubsystem: () =>
              index === null
                ? null
                : { index, identifier: "cormoran__fast_keymap" },
          } as never
        }
      >
        {children}
      </ZMKAppContext.Provider>
    );
  }
  const { result, rerender } = renderHook(() => useUnlockGuide(true), {
    wrapper: Wrapper,
  });
  await waitFor(() => expect(result.current?.steps[0].action).toBe("unlock"));
  expect(requests).toHaveLength(1);
  expect(requests[0].getSnapshot).toBe(true);
  for (let i = 0; i < 4; i++) {
    await act(async () => rerender());
  }
  expect(requests).toHaveLength(1);

  let previousModel = result.current!.model;
  allowedSnapshots++;
  index = 4;
  await act(async () => rerender());
  await waitFor(() => {
    expect(result.current?.steps[0].action).toBe("unlock");
    expect(result.current?.model).not.toBe(previousModel);
  });
  expect(requests).toHaveLength(2);
  previousModel = result.current!.model;

  allowedSnapshots++;
  connection = {};
  await act(async () => rerender());
  await waitFor(() => {
    expect(result.current?.steps[0].action).toBe("unlock");
    expect(result.current?.model).not.toBe(previousModel);
  });
  expect(requests).toHaveLength(3);
  previousModel = result.current!.model;

  index = null;
  await act(async () => rerender());
  expect(result.current).toBeNull();
  expect(requests).toHaveLength(3);

  allowedSnapshots++;
  index = 4;
  await act(async () => rerender());
  await waitFor(() => expect(result.current?.steps[0].action).toBe("unlock"));
  expect(result.current!.model).not.toBe(previousModel);
  expect(requests).toHaveLength(4);
});
