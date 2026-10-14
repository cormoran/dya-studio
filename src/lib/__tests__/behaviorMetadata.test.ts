import {
  formatBehaviorBinding,
  formatBehaviorParam,
} from "../behaviorMetadata";
import { formatKeycodeWithModifiers } from "../keycodes";
import type { BehaviorDefinition } from "../../hooks/useKeymap";

const behavior: BehaviorDefinition = {
  id: 1,
  displayName: "Key Press",
  metadata: [],
};
const binding = (param1: number) => ({ behaviorId: 1, param1, param2: 0 });

describe("page-aware binding formatting", () => {
  test.each([
    [0xc006f, "☀+"],
    [0xc0070, "☀-"],
    [0x7006f, "F20"],
    [0x70070, "F21"],
    [0x6f, "F20"],
    [0x70, "F21"],
    [0x010c006f, "LC(☀+)"],
    [0x800c0070, "RG(☀-)"],
    [0xc002f, "0xC002F"],
    [0x1006f, "0x1006F"],
    [0x0101006f, "LC(0x1006F)"],
    [0x7ffff, "0x7FFFF"],
  ])("formats %s without aliasing another HID page", (value, expected) => {
    for (const keyboardLayout of ["US", "JIS", "US_JP"] as const) {
      expect(
        formatBehaviorBinding(binding(value), behavior, { keyboardLayout }),
      ).toBe(expected);
      const formatted = formatKeycodeWithModifiers(value, keyboardLayout);
      expect(formatted.display).toContain(expected);
      expect(formatted.rawCode).toBe(
        `0x${(value >>> 0).toString(16).toUpperCase()}`,
      );
    }
  });

  test.each([0x2f, 0x7002f, 0x0100002f, 0x0107002f])(
    "preserves keyboard and legacy layout overrides for %s",
    (value) => {
      const modified = value > 0xffffff;
      expect(
        formatBehaviorBinding(binding(value), behavior, {
          keyboardLayout: "JIS",
        }),
      ).toBe(modified ? "LC(@`)" : "@`");
      expect(
        formatBehaviorBinding(binding(value), behavior, {
          keyboardLayout: "US",
        }),
      ).toBe(modified ? "LC([{)" : "[{");
    },
  );

  test("keeps US for JP language-key names on the keyboard page", () => {
    expect(
      formatBehaviorBinding(binding(0x70090), behavior, {
        keyboardLayout: "US_JP",
      }),
    ).toBe("かな");
    expect(
      formatBehaviorBinding(binding(0xc0090), behavior, {
        keyboardLayout: "US_JP",
      }),
    ).toBe("0xC0090");
  });

  test("uses the same page-aware names for both metadata HID parameters", () => {
    const custom: BehaviorDefinition = {
      id: 2,
      displayName: "Custom",
      metadata: [
        {
          param1: [{ hidUsage: {} }],
          param2: [{ hidUsage: {} }],
        },
      ],
    };
    expect(formatBehaviorParam(custom, 0xc006f, 0xc0070, 1, {})).toBe(
      "☀+ (0xC006F)",
    );
    expect(formatBehaviorParam(custom, 0xc006f, 0xc0070, 2, {})).toBe("☀-");
  });
});
