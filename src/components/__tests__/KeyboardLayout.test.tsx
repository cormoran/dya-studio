import { act, fireEvent, render, screen } from "@testing-library/react";
import { KeyboardLayout } from "../KeyboardLayout";
import { ComboSource } from "../../proto/cormoran/runtime_combo/runtime_combo";

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe("KeyboardLayout combo controls", () => {
  it("shows a combo tooltip for an adjacent two-key control", () => {
    jest.useFakeTimers();
    const containerWidth = jest
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockReturnValue(160);
    render(
      <KeyboardLayout
        layout={{
          name: "Test",
          keys: [
            { width: 100, height: 100, x: 0, y: 0, r: 0, rx: 0, ry: 0 },
            { width: 100, height: 100, x: 100, y: 0, r: 0, rx: 0, ry: 0 },
          ],
        }}
        layer={{
          id: 0,
          name: "Base",
          bindings: [
            { behaviorId: 1, param1: 0, param2: 0 },
            { behaviorId: 1, param1: 0, param2: 0 },
          ],
        }}
        layers={[]}
        behaviors={
          new Map([[1, { id: 1, displayName: "Key Press", metadata: [] }]])
        }
        selectedKey={null}
        onKeyClick={jest.fn()}
        onKeyReset={jest.fn()}
        isBindingModified={jest.fn().mockReturnValue(false)}
        getOriginalBinding={jest.fn().mockReturnValue(null)}
        combos={[
          {
            index: 2,
            name: "Twin escape",
            keyPositions: [0, 1],
            behavior: { behaviorId: 1, param1: 0, param2: 0 },
            layerMask: 0,
            enabled: true,
            timeoutMs: 0,
            requirePriorIdleMs: 0,
            slowReleaseOverride: 0,
            source: ComboSource.COMBO_SOURCE_DEFAULT,
          },
        ]}
      />,
    );

    const control = screen.getByRole("button", {
      name: /Combo Twin escape:/,
    });
    expect(control).toHaveClass(
      "bg-[var(--color-surface-elevated)]",
      "hover:bg-[var(--color-surface-elevated)]",
    );
    expect(Number.parseFloat(control.style.width)).toBeGreaterThan(20);
    expect(Number.parseFloat(control.style.height)).toBeGreaterThan(20);
    expect(control).toHaveTextContent("0x0");
    expect(control.querySelector("svg")).toHaveClass(
      "absolute",
      "left-px",
      "top-px",
    );
    fireEvent.pointerMove(control);
    act(() => jest.advanceTimersByTime(200));

    expect(screen.getByRole("tooltip")).toHaveTextContent("Combo: Twin escape");
    containerWidth.mockRestore();
    jest.useRealTimers();
  });
});

test("renders consumer brightness and keyboard F20/F21 as distinct keys", () => {
  const values = [0xc006f, 0xc0070, 0x7006f, 0x70070];
  render(
    <KeyboardLayout
      layout={{
        name: "Test",
        keys: values.map((_, i) => ({
          width: 100,
          height: 100,
          x: i * 100,
          y: 0,
          r: 0,
          rx: 0,
          ry: 0,
        })),
      }}
      layer={{
        id: 0,
        name: "Base",
        bindings: values.map((param1) => ({
          behaviorId: 1,
          param1,
          param2: 0,
        })),
      }}
      layers={[]}
      behaviors={
        new Map([[1, { id: 1, displayName: "Key Press", metadata: [] }]])
      }
      keyboardLayout="JIS"
      selectedKey={null}
      onKeyClick={jest.fn()}
      onKeyReset={jest.fn()}
      isBindingModified={jest.fn().mockReturnValue(false)}
      getOriginalBinding={jest.fn().mockReturnValue(null)}
    />,
  );
  for (const [position, label] of ["☀+", "☀-", "F20", "F21"].entries()) {
    const key = screen.getByRole("button", {
      name: `Key position ${position}: ${label}`,
    });
    expect(key).toHaveAttribute("data-binding-label", label);
  }
});
