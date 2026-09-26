import {
  KEY_LAYOUT_70,
  KEY_LAYOUT_70_JIS,
  ROW_UNITS,
  isSpacer,
} from "../keyLayout";

function position(code: number) {
  for (const [y, row] of KEY_LAYOUT_70_JIS.entries()) {
    let x = 0;
    for (const item of row) {
      const w = item.w ?? 1;
      if (!isSpacer(item) && item.code === code) return { x, y, w };
      x += w;
    }
  }
  throw new Error(`Missing key ${code}`);
}

it.each([KEY_LAYOUT_70, KEY_LAYOUT_70_JIS])(
  "keeps every row on the same grid",
  (...rows) => {
    for (const row of rows) {
      expect(row.reduce((sum, item) => sum + (item.w ?? 1), 0)).toBe(ROW_UNITS);
    }
  },
);

it("keeps JIS stagger, Enter clearance, and arrows aligned", () => {
  expect(position(0x14).x).toBe(1.5); // Q
  expect(position(0x04).x).toBe(1.75); // A
  expect(position(0x1d).x).toBe(2.25); // Z
  const enter = position(0x28);
  const bracket = position(0x32);
  const backspace = position(0x2a);
  expect(enter.x).toBe(13.5);
  expect(bracket.x + bracket.w).toBe(enter.x + 0.25);
  expect(enter.x + enter.w).toBe(backspace.x + backspace.w);
  expect(position(0x52).x).toBe(position(0x51).x); // Up / Down
  expect(position(0x50).x + 1).toBe(position(0x51).x);
  expect(position(0x51).x + 1).toBe(position(0x4f).x);
});

it("puts Muhenkan before Space and Henkan/Kana after it", () => {
  const codes = KEY_LAYOUT_70_JIS[5]
    .filter((item) => !isSpacer(item))
    .map((item) => item.code);
  expect(codes.slice(3, 7)).toEqual([0x8a, 0x2c, 0x8b, 0x88]);
});
