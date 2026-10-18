import { act, fireEvent, render, screen } from "@testing-library/react";
import { useComboDrag, COMBO_HOLD_MS } from "../useComboDrag";
import { comboDropPositions, comboPreviewCenter } from "../comboPreview";
import type { Combo } from "../../hooks/useRuntimeCombo";
import { ComboSource } from "../../proto/cormoran/runtime_combo/runtime_combo";

const keys = [
  [0, 0],
  [100, 0],
  [0, 100],
  [100, 100],
].map(([x, y]) => ({
  x,
  y,
  width: 100,
  height: 100,
  r: 0,
  rx: 0,
  ry: 0,
}));
const combo: Combo = {
  index: 2,
  name: "Test",
  keyPositions: [0, 1],
  enabled: true,
  behavior: { behaviorId: 1, param1: 4, param2: 0 },
  layerMask: 0,
  timeoutMs: 0,
  requirePriorIdleMs: 0,
  slowReleaseOverride: 0,
  source: ComboSource.COMBO_SOURCE_DEFAULT,
};
function Harness({
  onDrop,
  onClick,
  context = "0",
}: {
  onDrop: jest.Mock;
  onClick: jest.Mock;
  context?: string;
}) {
  const { drag, handlers } = useComboDrag(keys, context, onDrop);
  return (
    <button
      {...handlers(combo, { x: 100, y: 50 }, 1)}
      onClick={onClick}
      data-active={Boolean(drag)}
      data-positions={drag?.positions.join(",")}
    >
      Combo
    </button>
  );
}
beforeEach(() => {
  jest.useFakeTimers();
  window.PointerEvent = MouseEvent as typeof PointerEvent;
  HTMLElement.prototype.setPointerCapture = jest.fn();
});
afterEach(() => {
  jest.useRealTimers();
});

function start(button: HTMLElement) {
  fireEvent.pointerDown(button, { button: 0, clientX: 100, clientY: 50 });
  act(() => jest.advanceTimersByTime(COMBO_HOLD_MS));
}
test("a short click opens the editor without writing", () => {
  const onDrop = jest.fn(),
    onClick = jest.fn();
  render(<Harness onDrop={onDrop} onClick={onClick} />);
  const button = screen.getByRole("button");
  fireEvent.pointerDown(button, { button: 0, clientX: 100, clientY: 50 });
  act(() => jest.advanceTimersByTime(COMBO_HOLD_MS - 1));
  expect(button).toHaveAttribute("data-active", "false");
  fireEvent.pointerUp(button, { clientX: 100, clientY: 50 });
  fireEvent.click(button, { detail: 1 });
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onDrop).not.toHaveBeenCalled();
});
test("held drop highlights and changes exactly two positions without opening the editor", () => {
  const onDrop = jest.fn(),
    onClick = jest.fn();
  render(<Harness onDrop={onDrop} onClick={onClick} />);
  const button = screen.getByRole("button");
  start(button);
  expect(button).toHaveAttribute("data-active", "true");
  fireEvent.pointerMove(button, { clientX: 100, clientY: 150 });
  expect(button).toHaveAttribute("data-positions", "2,3");
  fireEvent.pointerUp(button, { clientX: 100, clientY: 150 });
  fireEvent.click(button, { detail: 1 });
  expect(onDrop).toHaveBeenCalledWith(combo, [2, 3]);
  expect(onClick).not.toHaveBeenCalled();
});
test.each([
  [50, 150],
  [100, 100],
  [-100, -100],
  [100, 50],
])(
  "invalid or unchanged drop at %s,%s leaves positions unchanged",
  (clientX, clientY) => {
    const onDrop = jest.fn();
    render(<Harness onDrop={onDrop} onClick={jest.fn()} />);
    const button = screen.getByRole("button");
    start(button);
    fireEvent.pointerUp(button, { clientX, clientY });
    expect(onDrop).not.toHaveBeenCalled();
  },
);
test.each(["escape", "cancel", "blur", "context", "scroll"])(
  "%s cancels a held drag",
  (kind) => {
    const onDrop = jest.fn(),
      onClick = jest.fn();
    const { rerender } = render(<Harness onDrop={onDrop} onClick={onClick} />);
    const button = screen.getByRole("button");
    start(button);
    if (kind === "escape") fireEvent.keyDown(window, { key: "Escape" });
    if (kind === "cancel") fireEvent.pointerCancel(button);
    if (kind === "blur") fireEvent.blur(window);
    if (kind === "scroll") fireEvent.scroll(window);
    if (kind === "context")
      rerender(<Harness context="1" onDrop={onDrop} onClick={onClick} />);
    fireEvent.pointerUp(button, { clientX: 100, clientY: 150 });
    expect(onDrop).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("data-active", "false");
  },
);
test("movement before the hold threshold cancels activation", () => {
  render(<Harness onDrop={jest.fn()} onClick={jest.fn()} />);
  const button = screen.getByRole("button");
  fireEvent.pointerDown(button, { button: 0, clientX: 100, clientY: 50 });
  fireEvent.pointerMove(button, { clientX: 110, clientY: 50 });
  act(() => jest.advanceTimersByTime(COMBO_HOLD_MS));
  expect(button).toHaveAttribute("data-active", "false");
});
test("hit testing uses rotated key polygons and excludes edge-only contact", () => {
  expect(comboDropPositions(keys, { x: 100, y: 50 })).toEqual([0, 1]);
  expect(comboDropPositions(keys, { x: 75, y: 50 })).toEqual([0]);
  const rotated = keys.slice(0, 2).map((key) => ({ ...key, r: 9000 }));
  expect(comboDropPositions(rotated, { x: -50, y: 100 })).toEqual([0, 1]);
  expect(comboPreviewCenter(keys, [0, 3])).toEqual({ x: 100, y: 100 });
});
