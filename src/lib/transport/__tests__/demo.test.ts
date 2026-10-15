import { Request, Response } from "@zmkfirmware/zmk-studio-ts-client";
import {
  get_decoder,
  get_encoder,
} from "@zmkfirmware/zmk-studio-ts-client/framing";
import { connect } from "../demo";
import {
  RemoveLayerErrorCode,
  SetLayerPropsResponse,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";

// setupTests installs real Node WHATWG streams, so exercise the wire protocol
// rather than skipping transport coverage or merely checking exported symbols.
describe("Demo Transport", () => {
  it.each([0xab, 0xac, 0xad])(
    "round-trips a fragmented request with escaped request ID %i",
    async (requestId) => {
      const transport = await connect();
      const encoder = new TransformStream(get_encoder());
      const encodedReader = encoder.readable.getReader();
      const requestWriter = encoder.writable.getWriter();
      const writer = transport.writable.getWriter();
      const reader = transport.readable
        .pipeThrough(new TransformStream(get_decoder()))
        .getReader();

      // Forward one byte at a time, including a chunk boundary after ESC.
      const forward = (async () => {
        while (true) {
          const { value, done } = await encodedReader.read();
          if (done) break;
          for (const byte of value) await writer.write(Uint8Array.of(byte));
        }
      })();

      try {
        const response = reader.read();
        await requestWriter.write(
          Uint8Array.from(
            Request.encode(
              Request.create({ requestId, core: { getDeviceInfo: {} } }),
            ).finish(),
          ),
        );
        await requestWriter.close();
        await forward;

        const { value, done } = await response;
        expect(done).toBe(false);
        expect(Response.decode(value!).requestResponse).toMatchObject({
          requestId,
          core: { getDeviceInfo: { name: "DYA Keyboard (Demo)" } },
        });
      } finally {
        transport.abortController.abort();
        await writer.close();
        writer.releaseLock();
        reader.releaseLock();
        encodedReader.releaseLock();
        requestWriter.releaseLock();
      }
    },
  );

  it("removes a reordered layer by its current index and preserves its stable ID", async () => {
    const transport = await connect();
    const encoder = new TransformStream(get_encoder());
    const encodedReader = encoder.readable.getReader();
    const requestWriter = encoder.writable.getWriter();
    const writer = transport.writable.getWriter();
    const reader = transport.readable
      .pipeThrough(new TransformStream(get_decoder()))
      .getReader();
    let requestId = 0;

    const forward = (async () => {
      while (true) {
        const { value, done } = await encodedReader.read();
        if (done) break;
        for (const byte of value) await writer.write(Uint8Array.of(byte));
      }
    })();
    const send = async (keymap: NonNullable<Request["keymap"]>) => {
      await requestWriter.write(
        Uint8Array.from(
          Request.encode(
            Request.create({ requestId: ++requestId, keymap }),
          ).finish(),
        ),
      );
      const { value, done } = await reader.read();
      expect(done).toBe(false);
      return Response.decode(value!).requestResponse?.keymap;
    };

    try {
      await send({ addLayer: {} });
      await send({ addLayer: {} });
      await send({ moveLayer: { startIndex: 4, destIndex: 3 } });
      expect(
        (await send({ getKeymap: true }))?.getKeymap?.layers.map((l) => l.id),
      ).toEqual([0, 1, 2, 4, 3]);

      const removed = await send({ removeLayer: { layerIndex: 3 } });
      expect(removed?.removeLayer?.ok).toEqual({});
      expect(
        (await send({ getKeymap: true }))?.getKeymap?.layers.map((l) => l.id),
      ).toEqual([0, 1, 2, 3]);

      const restored = await send({ restoreLayer: { layerId: 4, atIndex: 3 } });
      expect(restored?.restoreLayer?.ok?.id).toBe(4);
      await send({ saveChanges: true });
      await send({ removeLayer: { layerIndex: 3 } });
      await send({ discardChanges: true });
      expect(
        (await send({ getKeymap: true }))?.getKeymap?.layers.map((l) => l.id),
      ).toEqual([0, 1, 2, 4, 3]);
    } finally {
      await requestWriter.close();
      transport.abortController.abort();
      await writer.close();
      writer.releaseLock();
      reader.releaseLock();
      encodedReader.releaseLock();
      requestWriter.releaseLock();
      await forward;
    }
  });

  it("renames by stable ID with protocol errors and Save/Discard readback", async () => {
    const transport = await connect();
    const encoder = new TransformStream(get_encoder());
    const encodedReader = encoder.readable.getReader();
    const requestWriter = encoder.writable.getWriter();
    const writer = transport.writable.getWriter();
    const reader = transport.readable
      .pipeThrough(new TransformStream(get_decoder()))
      .getReader();
    let requestId = 0;

    const forward = (async () => {
      while (true) {
        const { value, done } = await encodedReader.read();
        if (done) break;
        for (const byte of value) await writer.write(Uint8Array.of(byte));
      }
    })();
    const send = async (keymap: NonNullable<Request["keymap"]>) => {
      await requestWriter.write(
        Uint8Array.from(
          Request.encode(
            Request.create({ requestId: ++requestId, keymap }),
          ).finish(),
        ),
      );
      const { value, done } = await reader.read();
      expect(done).toBe(false);
      return Response.decode(value!).requestResponse?.keymap;
    };

    try {
      const initial = (await send({ getKeymap: true }))?.getKeymap;
      await send({ moveLayer: { startIndex: 0, destIndex: 2 } });
      await send({ saveChanges: true });
      const before = (await send({ getKeymap: true }))?.getKeymap;
      expect(
        (await send({ setLayerProps: { layerId: 0, name: "Primary" } }))
          ?.setLayerProps,
      ).toBe(SetLayerPropsResponse.SET_LAYER_PROPS_RESP_OK);
      const renamed = (await send({ getKeymap: true }))?.getKeymap;
      expect(renamed?.layers.map(({ id, name }) => ({ id, name }))).toEqual([
        { id: 2, name: "Raise" },
        { id: 1, name: "Lower" },
        { id: 0, name: "Primary" },
      ]);
      expect(renamed?.layers.map((l) => l.bindings)).toEqual(
        before?.layers.map((l) => l.bindings),
      );
      expect(
        (await send({ checkUnsavedChanges: true }))?.checkUnsavedChanges,
      ).toBe(true);
      await send({ discardChanges: true });
      expect((await send({ getKeymap: true }))?.getKeymap).toEqual(before);
      expect(
        (await send({ checkUnsavedChanges: true }))?.checkUnsavedChanges,
      ).toBe(false);

      for (const [layerId, name, expected] of [
        [
          99,
          "Invalid",
          SetLayerPropsResponse.SET_LAYER_PROPS_RESP_ERR_INVALID_ID,
        ],
        [
          0,
          "x".repeat(initial!.maxLayerNameLength),
          SetLayerPropsResponse.SET_LAYER_PROPS_RESP_ERR_GENERIC,
        ],
        [
          0,
          "あ".repeat(11),
          SetLayerPropsResponse.SET_LAYER_PROPS_RESP_ERR_GENERIC,
        ],
        [0, "", SetLayerPropsResponse.SET_LAYER_PROPS_RESP_OK],
      ] as const) {
        expect(
          (await send({ setLayerProps: { layerId, name } }))?.setLayerProps,
        ).toBe(expected);
        expect((await send({ getKeymap: true }))?.getKeymap).toEqual(before);
        expect(
          (await send({ checkUnsavedChanges: true }))?.checkUnsavedChanges,
        ).toBe(false);
      }

      const name = "x".repeat(initial!.maxLayerNameLength - 1);
      expect(
        (await send({ setLayerProps: { layerId: 0, name } }))?.setLayerProps,
      ).toBe(SetLayerPropsResponse.SET_LAYER_PROPS_RESP_OK);
      await send({ saveChanges: true });
      const saved = (await send({ getKeymap: true }))?.getKeymap;
      expect(saved?.layers.find((l) => l.id === 0)?.name).toBe(name);
      expect(
        (await send({ checkUnsavedChanges: true }))?.checkUnsavedChanges,
      ).toBe(false);
      await send({ setLayerProps: { layerId: 0, name: "Unsaved" } });
      await send({ discardChanges: true });
      expect((await send({ getKeymap: true }))?.getKeymap).toEqual(saved);
      expect(
        (await send({ checkUnsavedChanges: true }))?.checkUnsavedChanges,
      ).toBe(false);
    } finally {
      await requestWriter.close();
      transport.abortController.abort();
      await writer.close();
      writer.releaseLock();
      reader.releaseLock();
      encodedReader.releaseLock();
      requestWriter.releaseLock();
      await forward;
    }
  });

  it.each([-1, 4])(
    "rejects invalid layer index %i without changing keymap state",
    async (layerIndex) => {
      const transport = await connect();
      const encoder = new TransformStream(get_encoder());
      const encodedReader = encoder.readable.getReader();
      const requestWriter = encoder.writable.getWriter();
      const writer = transport.writable.getWriter();
      const reader = transport.readable
        .pipeThrough(new TransformStream(get_decoder()))
        .getReader();

      const forward = (async () => {
        while (true) {
          const { value, done } = await encodedReader.read();
          if (done) break;
          for (const byte of value) await writer.write(Uint8Array.of(byte));
        }
      })();
      const send = async (
        requestId: number,
        keymap: NonNullable<Request["keymap"]>,
      ) => {
        await requestWriter.write(
          Uint8Array.from(
            Request.encode(Request.create({ requestId, keymap })).finish(),
          ),
        );
        const { value, done } = await reader.read();
        expect(done).toBe(false);
        return Response.decode(value!).requestResponse?.keymap;
      };

      try {
        await send(1, { addLayer: {} });
        const before = (
          await send(2, { getKeymap: true })
        )?.getKeymap?.layers.map((l) => l.id);
        const result = await send(3, { removeLayer: { layerIndex } });
        expect(result?.removeLayer?.err).toBe(
          RemoveLayerErrorCode.REMOVE_LAYER_ERR_INVALID_INDEX,
        );
        expect(
          (await send(4, { getKeymap: true }))?.getKeymap?.layers.map(
            (l) => l.id,
          ),
        ).toEqual(before);
        expect(
          (await send(5, { checkUnsavedChanges: true }))?.checkUnsavedChanges,
        ).toBe(true);
      } finally {
        await requestWriter.close();
        transport.abortController.abort();
        await writer.close();
        writer.releaseLock();
        reader.releaseLock();
        encodedReader.releaseLock();
        requestWriter.releaseLock();
        await forward;
      }
    },
  );
});
