import { render, screen } from "@testing-library/react";
import { KeyboardLayout } from "../KeyboardLayout";

jest.mock("../PhysicalKey", () => ({
  PhysicalKey: ({
    attrs,
    keyPosition,
  }: {
    attrs: Record<string, number>;
    keyPosition: number;
  }) => (
    <div
      data-testid={`key-${keyPosition}`}
      data-geometry={JSON.stringify(attrs)}
    />
  ),
}));

describe("KeyboardLayout rotation origins", () => {
  it("translates absolute pivots with keys, preserving negative-coordinate geometry", () => {
    const keys = [
      { width: 100, height: 100, x: 149, y: -183, r: 1500, rx: 149, ry: -183 },
      { width: 100, height: 100, x: 987, y: 205, r: -1500, rx: -113, ry: 205 },
      { width: 100, height: 100, x: 1503, y: -100, r: 500, rx: -97, ry: -300 },
    ];
    const layer = { id: 0, name: "Def", bindings: [] };
    render(
      <KeyboardLayout
        layout={{ name: "SAA", keys }}
        layer={layer}
        layers={[layer]}
        behaviors={new Map()}
        selectedKey={null}
        onKeyClick={() => {}}
        onKeyReset={() => {}}
        isBindingModified={() => false}
        getOriginalBinding={() => null}
      />,
    );
    keys.forEach((key, i) => {
      const actual = JSON.parse(
        screen.getByTestId(`key-${i}`).getAttribute("data-geometry")!,
      );
      expect(actual.x).not.toBe(key.x);
      expect(actual.y).not.toBe(key.y);
      expect(actual.rx - actual.x).toBeCloseTo(key.rx - key.x);
      expect(actual.ry - actual.y).toBeCloseTo(key.ry - key.y);
      expect(actual.r).toBe(key.r);
    });
  });
});
