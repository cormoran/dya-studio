import type { UseKeymapReturn } from "../useKeymap";
import { createKeymapWebMcpTools } from "../useKeymapWebMcpTools";

function createKeymap(overrides: Partial<UseKeymapReturn> = {}) {
  const value = {
    keymap: {
      layers: [
        {
          id: 3,
          name: "Base",
          bindings: [{ behaviorId: 1, param1: 4, param2: 0 }],
        },
      ],
      availableLayers: 0,
      maxLayerNameLength: 32,
    },
    behaviors: new Map([
      [1, { id: 1, displayName: "Key press", metadata: [] }],
      [2, { id: 2, displayName: "Layer tap", metadata: [] }],
    ]),
    isLoading: false,
    isFullyLoaded: true,
    error: null,
    hasUnsavedChanges: true,
    getBindingDisplayName: jest.fn(() => "A"),
    setBinding: jest.fn().mockResolvedValue(true),
    saveChanges: jest.fn().mockResolvedValue(true),
    discardChanges: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  return value as unknown as UseKeymapReturn;
}

function findTool(keymap: UseKeymapReturn, name: string) {
  const tool = createKeymapWebMcpTools(keymap).find(
    (candidate) => candidate.name === name,
  );
  if (!tool) throw new Error(`Missing test tool: ${name}`);
  return tool;
}

describe("keymap WebMCP tools", () => {
  it("returns layers, bindings, behaviors, and edit state", async () => {
    const keymap = createKeymap();
    const result = await findTool(keymap, "dya_get_keymap_state").execute({});

    expect(result).toMatchObject({
      loading: false,
      fullyLoaded: true,
      unsaved: true,
      layers: [
        {
          id: 3,
          bindings: [
            { keyPosition: 0, behaviorId: 1, param1: 4, displayName: "A" },
          ],
        },
      ],
      availableBehaviors: [
        { id: 1, displayName: "Key press" },
        { id: 2, displayName: "Layer tap" },
      ],
    });
  });

  it("validates and stages a binding with useKeymap.setBinding", async () => {
    const keymap = createKeymap();
    const result = await findTool(keymap, "dya_set_keymap_binding").execute({
      layerId: 3,
      keyPosition: 0,
      behaviorId: 2,
      param1: 7,
      param2: 8,
    });

    expect(keymap.setBinding).toHaveBeenCalledWith(3, 0, {
      behaviorId: 2,
      param1: 7,
      param2: 8,
    });
    expect(result).toEqual({ edited: true, layerId: 3, keyPosition: 0 });
  });

  it("rejects invalid IDs, positions, unloaded state, and device failures", async () => {
    const keymap = createKeymap();
    const edit = findTool(keymap, "dya_set_keymap_binding");

    await expect(
      edit.execute({
        layerId: 99,
        keyPosition: 0,
        behaviorId: 2,
        param1: 0,
        param2: 0,
      }),
    ).rejects.toThrow("Unknown layer ID");
    await expect(
      edit.execute({
        layerId: 3,
        keyPosition: 99,
        behaviorId: 2,
        param1: 0,
        param2: 0,
      }),
    ).rejects.toThrow("Invalid key position");
    await expect(
      edit.execute({
        layerId: 3,
        keyPosition: 0,
        behaviorId: 99,
        param1: 0,
        param2: 0,
      }),
    ).rejects.toThrow("Unknown behavior ID");

    const unloaded = createKeymap({ keymap: null });
    await expect(
      findTool(unloaded, "dya_set_keymap_binding").execute({
        layerId: 3,
        keyPosition: 0,
        behaviorId: 2,
        param1: 0,
        param2: 0,
      }),
    ).rejects.toThrow("has not been loaded");

    const failed = createKeymap({
      setBinding: jest.fn().mockResolvedValue(false),
    });
    await expect(
      findTool(failed, "dya_set_keymap_binding").execute({
        layerId: 3,
        keyPosition: 0,
        behaviorId: 2,
        param1: 0,
        param2: 0,
      }),
    ).rejects.toThrow("rejected the binding edit");
  });

  it("uses useKeymap save and discard methods and exposes failures", async () => {
    const keymap = createKeymap();
    await expect(
      findTool(keymap, "dya_save_keymap").execute({}),
    ).resolves.toEqual({ saved: true });
    await expect(
      findTool(keymap, "dya_discard_keymap_changes").execute({}),
    ).resolves.toEqual({ discarded: true });
    expect(keymap.saveChanges).toHaveBeenCalledTimes(1);
    expect(keymap.discardChanges).toHaveBeenCalledTimes(1);

    const failed = createKeymap({
      saveChanges: jest.fn().mockResolvedValue(false),
      discardChanges: jest.fn().mockResolvedValue(false),
    });
    await expect(
      findTool(failed, "dya_save_keymap").execute({}),
    ).rejects.toThrow("failed to save");
    await expect(
      findTool(failed, "dya_discard_keymap_changes").execute({}),
    ).rejects.toThrow("failed to discard");
  });
});
