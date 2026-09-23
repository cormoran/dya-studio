import { comboEditStatus, formatLayerScope } from "../comboUtils";
import { ComboSource } from "../../../proto/cormoran/runtime_combo/runtime_combo";

describe("comboEditStatus", () => {
  it("gives an in-memory combo change priority over its persisted source", () => {
    expect(
      comboEditStatus(ComboSource.COMBO_SOURCE_OVERRIDDEN, 4, new Set([4])),
    ).toBe("unsaved");
  });

  it("keeps persisted custom combos distinct from defaults", () => {
    expect(
      comboEditStatus(ComboSource.COMBO_SOURCE_RUNTIME, 4, new Set()),
    ).toBe("modified");
    expect(
      comboEditStatus(ComboSource.COMBO_SOURCE_DEFAULT, 4, new Set()),
    ).toBe("default");
  });
});

describe("formatLayerScope", () => {
  const t = (key: string, params?: Record<string, number | string>) =>
    key === "Layer {{id}}" ? `Layer ${params?.id}` : key;

  it("lists active layer names instead of exposing the bitmask", () => {
    expect(
      formatLayerScope(0x7, t, [
        { id: 0, name: "Base" },
        { id: 1, name: "Lower" },
        { id: 2, name: "Raise" },
      ]),
    ).toBe("Base, Lower, Raise");
  });

  it("keeps the all-layers label for an unrestricted combo", () => {
    expect(formatLayerScope(0, t)).toBe("All layers");
  });
});
