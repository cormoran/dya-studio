import { findUnlockGuide } from "../unlockGuide";
import { binding, guideModel } from "../../testUtils/unlockGuide";

describe("findUnlockGuide", () => {
  it("finds a direct unlock on the default layer", () => {
    expect(
      findUnlockGuide(guideModel([[binding(0), binding(1)]])),
    ).toMatchObject([{ position: 1, layer: 0, action: "unlock" }]);
  });
  it.each([
    [2, "hold"],
    [3, "hold"],
    [4, "press"],
    [5, "press"],
  ])(
    "handles layer behavior %s with ordered index instead of stable ID",
    (id, action) => {
      const guide = findUnlockGuide(
        guideModel([
          [binding(id as number, 1), binding(0)],
          [binding(6), binding(1)],
        ]),
      );
      expect(guide).toMatchObject([
        { position: 0, layer: 0, action },
        { position: 1, layer: 1, action: "unlock" },
      ]);
    },
  );
  it("resolves transparent keys through multiple held layers", () => {
    const model = guideModel([
      [binding(2, 1), binding(2, 2), binding(0)],
      [binding(6), binding(6), binding(0)],
      [binding(6), binding(6), binding(1)],
    ]);
    // Force the second switch to be reachable only from the first layer.
    model.layers[0].bindings[1] = binding(0);
    model.layers[1].bindings[1] = binding(2, 2);
    expect(findUnlockGuide(model)).toMatchObject([
      { position: 0, action: "hold" },
      { position: 1, action: "hold" },
      { position: 2, action: "unlock" },
    ]);
  });
  it("will not press an already held key", () => {
    expect(
      findUnlockGuide(guideModel([[binding(2, 1)], [binding(1)]])),
    ).toBeNull();
  });
  it("allows a released TO key to be used for unlock", () => {
    expect(
      findUnlockGuide(guideModel([[binding(4, 1)], [binding(1)]])),
    ).toHaveLength(2);
  });
  it("does not look through an opaque binding on a higher active layer", () => {
    const model = guideModel([
      [binding(2, 2), binding(0), binding(0)],
      [binding(6), binding(6), binding(1)],
      [binding(6), binding(2, 1), binding(7)],
    ]);
    expect(findUnlockGuide(model)).toBeNull();
    model.layers[2].bindings[2] = binding(6);
    expect(findUnlockGuide(model)).toHaveLength(3);
  });
  it("rejects inaccessible custom/conditional paths, invalid targets and cycles", () => {
    for (const first of [
      binding(7, 1),
      binding(2, 99),
      binding(2, -1),
      binding(2, 0),
    ]) {
      expect(
        findUnlockGuide(
          guideModel([
            [first, binding(0)],
            [binding(6), binding(1)],
          ]),
        ),
      ).toBeNull();
    }
  });
  it("rejects incomplete data and missing geometry", () => {
    const model = guideModel([[binding(1)]]);
    model.pendingLayerIds = [20];
    expect(findUnlockGuide(model)).toBeNull();
    model.pendingLayerIds = [];
    model.layouts = [];
    expect(findUnlockGuide(model)).toBeNull();
  });
  it("does not lose held layers through TO", () => {
    expect(
      findUnlockGuide(
        guideModel([
          [binding(2, 1), binding(0), binding(0)],
          [binding(6), binding(4, 2), binding(0)],
          [binding(6), binding(6), binding(1)],
        ]),
      ),
    ).toBeNull();
  });
});
