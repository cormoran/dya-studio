import { comboEditStatus } from "../comboUtils";
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
