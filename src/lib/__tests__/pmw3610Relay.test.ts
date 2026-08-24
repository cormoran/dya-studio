import { Notification, Response } from "../../proto/cormoran/pmw3610/pmw3610";
import { Pmw3610RelayCorrelator } from "../pmw3610Relay";

function peripheralResponse(
  source: number,
  requestId: number,
  response: Parameters<typeof Response.create>[0],
) {
  return Notification.encode(
    Notification.create({
      peripheralResponse: {
        source,
        requestId,
        response: Response.create(response),
      },
    }),
  ).finish();
}

it("waits for the requested peripheral when both halves respond", async () => {
  const correlator = new Pmw3610RelayCorrelator();
  const result = correlator.waitFor(7, 2);

  expect(
    correlator.handle(peripheralResponse(1, 7, { error: { message: "left" } })),
  ).toBe(false);
  expect(
    correlator.handle(
      peripheralResponse(2, 7, {
        readDiagnostics: { squal: 42 },
      }),
    ),
  ).toBe(true);

  await expect(result).resolves.toMatchObject({
    readDiagnostics: { squal: 42 },
  });
});
