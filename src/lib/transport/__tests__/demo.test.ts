import { Request, Response } from "@zmkfirmware/zmk-studio-ts-client";
import {
  get_decoder,
  get_encoder,
} from "@zmkfirmware/zmk-studio-ts-client/framing";
import { connect } from "../demo";

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
});
