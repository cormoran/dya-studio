/**
 * Tests for mouse movement/scroll encoding/decoding
 */
import {
  encodeMouseMove,
  decodeMouseMove,
  MOUSE_MOVEMENTS,
  MOUSE_SCROLLS,
  ZMK_POINTING_DEFAULT_MOVE_VAL,
  ZMK_POINTING_DEFAULT_SCRL_VAL,
} from "../keycodes";

describe("Mouse Movement Encoding/Decoding", () => {
  // ZMK pointing.h: X occupies bits 16..31 and Y bits 0..15, each
  // signed int16. Literal vectors prevent matching encoder/decoder errors
  // (such as swapped axes) from passing a round-trip-only assertion.
  test.each([
    [600, 10, 0x0258000a],
    [-600, 10, 0xfda8000a],
    [600, -10, 0x0258fff6],
    [-600, -10, 0xfda8fff6],
    [0, 0, 0x00000000],
    [1, 1, 0x00010001],
    [-1, -1, 0xffffffff],
    [1000, -1000, 0x03e8fc18],
    [-5000, 5000, 0xec781388],
    [32767, -32768, 0x7fff8000],
    [-32768, 32767, 0x80007fff],
    [600, -600, 0x0258fda8],
    [-100, 100, 0xff9c0064],
  ])(
    "encodes (%i, %i) as protocol word %i and decodes independently",
    (x, y, packed) => {
      expect(encodeMouseMove(x, y)).toBe(packed);
      expect(decodeMouseMove(packed)).toEqual({ x, y });
    },
  );

  describe("MOUSE_MOVEMENTS presets", () => {
    test("Move Up has correct encoding", () => {
      const moveUp = MOUSE_MOVEMENTS[0];
      expect(moveUp.label).toBe("Move Up");
      const decoded = decodeMouseMove(moveUp.value);
      expect(decoded.x).toBe(0);
      expect(decoded.y).toBe(-ZMK_POINTING_DEFAULT_MOVE_VAL);
    });

    test("Move Down has correct encoding", () => {
      const moveDown = MOUSE_MOVEMENTS[1];
      expect(moveDown.label).toBe("Move Down");
      const decoded = decodeMouseMove(moveDown.value);
      expect(decoded.x).toBe(0);
      expect(decoded.y).toBe(ZMK_POINTING_DEFAULT_MOVE_VAL);
    });

    test("Move Left has correct encoding", () => {
      const moveLeft = MOUSE_MOVEMENTS[2];
      expect(moveLeft.label).toBe("Move Left");
      const decoded = decodeMouseMove(moveLeft.value);
      expect(decoded.x).toBe(-ZMK_POINTING_DEFAULT_MOVE_VAL);
      expect(decoded.y).toBe(0);
    });

    test("Move Right has correct encoding", () => {
      const moveRight = MOUSE_MOVEMENTS[3];
      expect(moveRight.label).toBe("Move Right");
      const decoded = decodeMouseMove(moveRight.value);
      expect(decoded.x).toBe(ZMK_POINTING_DEFAULT_MOVE_VAL);
      expect(decoded.y).toBe(0);
    });
  });

  describe("MOUSE_SCROLLS presets", () => {
    test("Scroll Up has correct encoding", () => {
      const scrollUp = MOUSE_SCROLLS[0];
      expect(scrollUp.label).toBe("Scroll Up");
      const decoded = decodeMouseMove(scrollUp.value);
      expect(decoded.x).toBe(0);
      expect(decoded.y).toBe(ZMK_POINTING_DEFAULT_SCRL_VAL);
    });

    test("Scroll Down has correct encoding", () => {
      const scrollDown = MOUSE_SCROLLS[1];
      expect(scrollDown.label).toBe("Scroll Down");
      const decoded = decodeMouseMove(scrollDown.value);
      expect(decoded.x).toBe(0);
      expect(decoded.y).toBe(-ZMK_POINTING_DEFAULT_SCRL_VAL);
    });

    test("Scroll Left has correct encoding", () => {
      const scrollLeft = MOUSE_SCROLLS[2];
      expect(scrollLeft.label).toBe("Scroll Left");
      const decoded = decodeMouseMove(scrollLeft.value);
      expect(decoded.x).toBe(-ZMK_POINTING_DEFAULT_SCRL_VAL);
      expect(decoded.y).toBe(0);
    });

    test("Scroll Right has correct encoding", () => {
      const scrollRight = MOUSE_SCROLLS[3];
      expect(scrollRight.label).toBe("Scroll Right");
      const decoded = decodeMouseMove(scrollRight.value);
      expect(decoded.x).toBe(ZMK_POINTING_DEFAULT_SCRL_VAL);
      expect(decoded.y).toBe(0);
    });
  });
});
