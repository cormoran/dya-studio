import { Notification, Response } from "../../proto/cormoran/pmw3610/pmw3610";
import { Pmw3610RelayCorrelator } from "../pmw3610Relay";

function peripheralResponsePayload(
  requestId: number,
  source: number,
  response: Parameters<typeof Response.create>[0],
): Uint8Array {
  return Notification.encode(
    Notification.create({
      peripheralResponse: {
        requestId,
        source,
        response: Response.create(response),
      },
    }),
  ).finish();
}

describe("Pmw3610RelayCorrelator", () => {
  it("resolves a deferred request from its peripheral notification", async () => {
    const correlator = new Pmw3610RelayCorrelator(100);
    const responsePromise = correlator.waitFor(7);

    expect(
      correlator.handleNotificationPayload(
        peripheralResponsePayload(7, 1, {
          readDiagnostics: { squal: 42, shutter: 3 },
        }),
      ),
    ).toBe(true);

    await expect(responsePromise).resolves.toMatchObject({
      readDiagnostics: { squal: 42, shutter: 3 },
    });
  });

  it("buffers a fast notification until its deferred response is observed", async () => {
    const correlator = new Pmw3610RelayCorrelator(100);
    correlator.handleNotificationPayload(
      peripheralResponsePayload(8, 1, {
        getInfo: { devices: [{ deviceIndex: 0, settingsId: "mkb-rtb" }] },
      }),
    );

    await expect(correlator.waitFor(8)).resolves.toMatchObject({
      getInfo: { devices: [{ settingsId: "mkb-rtb" }] },
    });
  });

  it("collects buffered and live responses from an all-source scan", async () => {
    const correlator = new Pmw3610RelayCorrelator(100);
    correlator.handleNotificationPayload(
      peripheralResponsePayload(9, 1, {
        getInfo: { devices: [{ deviceIndex: 0, settingsId: "right" }] },
      }),
    );

    const responsesPromise = correlator.collectBroadcast(9, 5);
    correlator.handleNotificationPayload(
      peripheralResponsePayload(9, 2, {
        getInfo: { devices: [{ deviceIndex: 0, settingsId: "left" }] },
      }),
    );

    await expect(responsesPromise).resolves.toMatchObject([
      {
        source: 1,
        response: { getInfo: { devices: [{ settingsId: "right" }] } },
      },
      {
        source: 2,
        response: { getInfo: { devices: [{ settingsId: "left" }] } },
      },
    ]);
  });
});
