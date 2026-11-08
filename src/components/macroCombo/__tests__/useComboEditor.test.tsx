import { act, renderHook } from "@testing-library/react";
import { useComboEditor } from "../useComboEditor";
import { comboToDraft, validateCombo } from "../comboUtils";
import type { UseKeymapReturn } from "../../../hooks/useKeymap";
import type {
  Combo,
  UseRuntimeComboReturn,
} from "../../../hooks/useRuntimeCombo";
import {
  ComboSource,
  SlowReleaseOverride,
} from "../../../proto/cormoran/runtime_combo/runtime_combo";

const combo: Combo = {
  index: 0,
  name: "Chord",
  keyPositions: [0, 1],
  behavior: { behaviorId: 1, param1: 0x70004, param2: 0 },
  layerMask: 0,
  enabled: true,
  timeoutMs: 0,
  requirePriorIdleMs: 0,
  slowReleaseOverride: SlowReleaseOverride.SLOW_RELEASE_OVERRIDE_INHERIT,
  source: ComboSource.COMBO_SOURCE_RUNTIME,
};
const t = (key: string) => key;
const keymap = { behaviors: new Map() } as UseKeymapReturn;

function setup() {
  const runtimeCombo = {
    combos: [combo],
    globalSettings: { maxCombo: 16 },
    setCombo: jest.fn().mockResolvedValue(true),
    setComboName: jest.fn().mockResolvedValue(true),
    deleteCombo: jest.fn().mockResolvedValue(true),
  } as unknown as UseRuntimeComboReturn;
  const editor = renderHook(() =>
    useComboEditor({
      runtimeCombo,
      keymap,
      requireUnlocked: () => true,
      t,
      onComboSelected: () => {},
    }),
  );
  return { ...editor, runtimeCombo };
}

it("ignores the invalid empty default draft until a combo is selected", () => {
  const { result } = setup();
  expect(validateCombo(result.current.draft, 16, t)).not.toBeNull();
  expect(result.current.validationError).toBeNull();
});

it.each([
  { keyPositions: [0] },
  { keyPositions: Array.from({ length: 17 }, (_, i) => i) },
  { behavior: { behaviorId: 0, param1: 0, param2: 0 } },
  { index: 16 },
])(
  "retains invalid selected input and never queues it for RAM: %p",
  async (invalid) => {
    const { result, runtimeCombo } = setup();
    act(() => result.current.selectCombo(combo));
    const draft = { ...comboToDraft(combo, keymap.behaviors), ...invalid };
    act(() => result.current.applyDraftChange(draft, true));
    expect(result.current.draft).toEqual(draft);
    expect(result.current.validationError).not.toBeNull();
    await act(async () => result.current.flushPendingWrites());
    expect(runtimeCombo.setCombo).not.toHaveBeenCalled();
    act(() => result.current.clearSelection());
    expect(result.current.validationError).toBeNull();
  },
);

it("clears selection after deleting the last combo so its empty draft cannot block Save", async () => {
  const { result } = setup();
  act(() => result.current.selectCombo(combo));
  await act(async () => result.current.handleDeleteCombo());
  expect(result.current.selectedIndex).toBeNull();
  expect(result.current.draft.keyPositions).toEqual([]);
  expect(result.current.validationError).toBeNull();
});
