import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useKeymapVersionHistory } from "../useKeymapVersionHistory";
import { useVersionHistory } from "../../useVersionHistory";
import type { UseKeymapReturn } from "../../useKeymap";
import { VersionDiffModal } from "../../../components/versionHistory/VersionDiffModal";
import {
  buildKeymapSnapshot,
  type KeymapSnapshot,
} from "../../../lib/versionHistory/tabs/keymap";
import type { StoredSnapshot } from "../../../lib/versionHistory";

// Keep the real select/Cancel/apply flow; storage is outside this adapter's scope.
jest.mock("../../useVersionHistory", () => ({ useVersionHistory: jest.fn() }));
const mockHistory = jest.mocked(useVersionHistory);
const t = (key: string) => key;
const path = ["layers", "0", "bindings", "0"];
const A = 0x00070004;
const B = 0x00070005;
const CTRL_C = 0x01070006;

function makeKeymap() {
  return {
    keymap: {
      layers: [
        {
          id: 0,
          name: "BASE",
          bindings: [
            { behaviorId: 1, param1: A, param2: 0 },
            { behaviorId: 2, param1: 0, param2: 0 },
          ],
        },
      ],
    },
    physicalLayouts: { activeLayoutIndex: 0 },
    behaviors: new Map([
      [1, { id: 1, displayName: "Key Press", metadata: [] }],
      [2, { id: 2, displayName: "Transparent", metadata: [] }],
      [3, { id: 3, displayName: "Momentary Layer", metadata: [] }],
      [4, { id: 4, displayName: "Custom Behavior", metadata: [] }],
      [5, { id: 5, displayName: "Layer-Tap", metadata: [] }],
    ]),
    isFullyLoaded: true,
    setBinding: jest.fn().mockResolvedValue(undefined),
    setLayerName: jest.fn().mockResolvedValue(undefined),
    removeLayer: jest.fn().mockResolvedValue(true),
    restoreLayer: jest.fn(),
    moveLayer: jest.fn().mockResolvedValue(true),
    saveChanges: jest.fn(),
  } as unknown as UseKeymapReturn;
}

function version(data: KeymapSnapshot): StoredSnapshot<KeymapSnapshot> {
  return {
    id: 1,
    envelopeVersion: 1,
    deviceKey: "Demo",
    tabId: "keymap",
    schemaVersion: 1,
    timestamp: 1700000000000,
    data,
  };
}

beforeEach(() => {
  mockHistory.mockReset();
  mockHistory.mockReturnValue({
    versions: [],
    isBusy: false,
    capture: jest.fn(),
    reload: jest.fn(),
  });
});

it("distinguishes A/B and A/Ctrl+C with behavior context and exact parameters", () => {
  const { result } = renderHook(() => useKeymapVersionHistory(makeKeymap(), t));
  const format = (code: number) =>
    result.current.labeler.formatValue!(path, `1:${code}:0`);
  expect(format(A)).toContain("Key Press: A");
  expect(format(B)).toContain("Key Press: B");
  expect(format(CTRL_C)).toMatch(/Key Press: .*C/);
  expect(format(CTRL_C)).toContain("Key Press: LC(C)");
  expect(new Set([format(A), format(B), format(CTRL_C)]).size).toBe(3);
  expect(format(CTRL_C)).toContain(`param1=${CTRL_C}, param2=0`);
});

it("retains unknown behaviors/values and both parameters, including zeros", () => {
  const { result } = renderHook(() => useKeymapVersionHistory(makeKeymap(), t));
  const format = (value: string) =>
    result.current.labeler.formatValue!(path, value);
  expect(format("999:0:0")).toBe(
    "Behavior 999 (behaviorId=999, param1=0, param2=0)",
  );
  expect(format("999:0:17")).toContain("param1=0, param2=17");
  expect(format("4:0:0")).toContain("Custom Behavior");
  expect(format("4:0:17")).not.toBe(format("4:0:0"));
  expect(format("1:65535:0")).toContain("param1=65535");
  // Even registered formatters may hide unexpected parameters.
  expect(format(`1:${A}:17`)).not.toBe(format(`1:${A}:0`));
  expect(format("2:0:17")).not.toBe(format("2:0:0"));
  expect(format("broken-binding")).toContain("broken-binding");
  expect(result.current.labeler.formatValue!(["layoutIndex"], 0)).toBeNull();
});

it("formats non-key behaviors and makes layer/second parameter differences visible", () => {
  const { result } = renderHook(() => useKeymapVersionHistory(makeKeymap(), t));
  const format = (value: string) =>
    result.current.labeler.formatValue!(path, value);
  expect(format("3:0:0")).toContain("Momentary Layer: MO 0");
  expect(format("3:1:0")).not.toBe(format("3:0:0"));
  expect(format(`5:0:${A}`)).toContain("Layer-Tap: LT 0 A");
  expect(format(`5:0:${B}`)).not.toBe(format(`5:0:${A}`));
  expect(format("2:0:0")).toContain("Transparent");
});

it("preserves snapshot schema, capture data and loaded gating", async () => {
  const keymap = makeKeymap();
  renderHook(() => useKeymapVersionHistory(keymap, t));
  const options = mockHistory.mock.calls.at(-1)![0];
  expect(options).toMatchObject({
    tabId: "keymap",
    schemaVersion: 1,
    isLoaded: true,
    enabled: true,
  });
  expect(await options.collect()).toEqual(
    buildKeymapSnapshot(keymap.keymap!.layers, 0),
  );
});

it("previews the actual binding columns and Cancel performs no writes", async () => {
  const keymap = makeKeymap();
  const data = buildKeymapSnapshot(keymap.keymap!.layers, 0);
  data.layers[0].bindings[0] = `1:${B}:0`;
  function Preview() {
    const history = useKeymapVersionHistory(keymap, t);
    return (
      <>
        <button onClick={() => history.selectVersion(version(data))}>
          Preview B
        </button>
        <VersionDiffModal
          {...history.diffModalProps}
          labeler={history.labeler}
        />
      </>
    );
  }
  render(<Preview />);
  await userEvent.click(screen.getByRole("button", { name: "Preview B" }));
  const row = await screen.findByRole("row", {
    name: /Key Press: A.*Key Press: B/,
  });
  const cells = within(row).getAllByRole("cell");
  expect(cells[1]).toHaveTextContent("Key Press: A");
  expect(cells[2]).toHaveTextContent("Key Press: B");
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  for (const method of [
    keymap.setBinding,
    keymap.setLayerName,
    keymap.removeLayer,
    keymap.restoreLayer,
    keymap.moveLayer,
    keymap.saveChanges,
  ]) {
    expect(method).not.toHaveBeenCalled();
  }
  expect(keymap.keymap!.layers[0].bindings[0].param1).toBe(A);
});

it("restores only changed bindings as original numbers without saving to flash", async () => {
  const keymap = makeKeymap();
  const data = buildKeymapSnapshot(keymap.keymap!.layers, 0);
  data.layers[0].bindings[0] = `1:${CTRL_C}:0`;
  const { result } = renderHook(() => useKeymapVersionHistory(keymap, t));
  act(() => result.current.selectVersion(version(data)));
  await waitFor(() =>
    expect(result.current.diffModalProps.current).not.toBeNull(),
  );
  act(() => result.current.diffModalProps.onApply());
  await waitFor(() => expect(result.current.diffModalProps.open).toBe(false));
  expect(keymap.setBinding).toHaveBeenCalledTimes(1);
  expect(keymap.setBinding).toHaveBeenCalledWith(0, 0, {
    behaviorId: 1,
    param1: CTRL_C,
    param2: 0,
  });
  expect(keymap.setLayerName).not.toHaveBeenCalled();
  expect(keymap.removeLayer).not.toHaveBeenCalled();
  expect(keymap.restoreLayer).not.toHaveBeenCalled();
  expect(keymap.moveLayer).not.toHaveBeenCalled();
  expect(keymap.saveChanges).not.toHaveBeenCalled();
});

it("keeps unchanged restores write-free and rejects a different physical layout", async () => {
  const keymap = makeKeymap();
  const data = buildKeymapSnapshot(keymap.keymap!.layers, 0);
  const { result } = renderHook(() => useKeymapVersionHistory(keymap, t));
  act(() => result.current.selectVersion(version(data)));
  await waitFor(() =>
    expect(result.current.diffModalProps.current).not.toBeNull(),
  );
  act(() => result.current.diffModalProps.onApply());
  await waitFor(() => expect(result.current.diffModalProps.open).toBe(false));
  expect(keymap.setBinding).not.toHaveBeenCalled();
  expect(keymap.saveChanges).not.toHaveBeenCalled();
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  act(() => result.current.selectVersion(version({ ...data, layoutIndex: 1 })));
  await waitFor(() =>
    expect(result.current.diffModalProps.current).not.toBeNull(),
  );
  act(() => result.current.diffModalProps.onApply());
  await waitFor(() =>
    expect(result.current.diffModalProps.error).toMatch(
      /different physical layout/,
    ),
  );
  expect(result.current.diffModalProps.open).toBe(true);
  expect(keymap.setBinding).not.toHaveBeenCalled();
  log.mockRestore();
});
