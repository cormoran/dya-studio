/**
 * Tests for useDemoKeymap hook
 */
import { renderHook, act } from "@testing-library/react";
import { useDemoKeymap } from "../useDemoKeymap";

describe("useDemoKeymap", () => {
  test("initializes with mock keymap data", () => {
    const { result } = renderHook(() => useDemoKeymap());

    expect(result.current.keymap).toBeDefined();
    expect(result.current.keymap?.layers).toBeDefined();
    expect(result.current.keymap?.layers.length).toBeGreaterThan(0);
    expect(result.current.physicalLayouts).toBeDefined();
    expect(result.current.behaviors.size).toBeGreaterThan(0);
  });

  test("starts with no unsaved changes", () => {
    const { result } = renderHook(() => useDemoKeymap());

    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  test("is never loading", () => {
    const { result } = renderHook(() => useDemoKeymap());

    expect(result.current.isLoading).toBe(false);
  });

  test("has no errors", () => {
    const { result } = renderHook(() => useDemoKeymap());

    expect(result.current.error).toBeNull();
  });

  test("setBinding updates a key binding and marks as unsaved", async () => {
    const { result } = renderHook(() => useDemoKeymap());

    const layerId = result.current.keymap!.layers[0].id;
    const keyPosition = 0;
    const newBinding = { behaviorId: 2, param1: 0, param2: 0 };

    await act(async () => {
      const success = await result.current.setBinding(
        layerId,
        keyPosition,
        newBinding,
      );
      expect(success).toBe(true);
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.keymap!.layers[0].bindings[0]).toEqual(newBinding);
  });

  test("resetBinding restores original binding", async () => {
    const { result } = renderHook(() => useDemoKeymap());

    const layerId = result.current.keymap!.layers[0].id;
    const keyPosition = 0;
    const originalBinding =
      result.current.keymap!.layers[0].bindings[keyPosition];
    const newBinding = { behaviorId: 2, param1: 0, param2: 0 };

    // Change the binding
    await act(async () => {
      await result.current.setBinding(layerId, keyPosition, newBinding);
    });

    // Reset it
    await act(async () => {
      const success = await result.current.resetBinding(layerId, keyPosition);
      expect(success).toBe(true);
    });

    expect(result.current.keymap!.layers[0].bindings[keyPosition]).toEqual(
      originalBinding,
    );
  });

  test("isBindingModified detects modified bindings", async () => {
    const { result } = renderHook(() => useDemoKeymap());

    const layerId = result.current.keymap!.layers[0].id;
    const keyPosition = 0;
    const newBinding = { behaviorId: 2, param1: 0, param2: 0 };

    // Initially not modified
    expect(result.current.isBindingModified(layerId, keyPosition)).toBe(false);

    // Modify the binding
    await act(async () => {
      await result.current.setBinding(layerId, keyPosition, newBinding);
    });

    // Now it should be detected as modified
    expect(result.current.isBindingModified(layerId, keyPosition)).toBe(true);
  });

  test("saveChanges marks changes as saved", async () => {
    const { result } = renderHook(() => useDemoKeymap());

    // Make a change
    await act(async () => {
      await result.current.setBinding(0, 0, {
        behaviorId: 2,
        param1: 0,
        param2: 0,
      });
    });

    expect(result.current.hasUnsavedChanges).toBe(true);

    // Save changes
    await act(async () => {
      const success = await result.current.saveChanges();
      expect(success).toBe(true);
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  test("discardChanges resets to original state", async () => {
    const { result } = renderHook(() => useDemoKeymap());

    const originalLayerCount = result.current.keymap!.layers.length;

    // Make changes
    await act(async () => {
      await result.current.setBinding(0, 0, {
        behaviorId: 2,
        param1: 0,
        param2: 0,
      });
    });

    expect(result.current.hasUnsavedChanges).toBe(true);

    // Discard changes
    await act(async () => {
      const success = await result.current.discardChanges();
      expect(success).toBe(true);
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.keymap!.layers.length).toBe(originalLayerCount);
  });

  test("addLayer creates a new layer", async () => {
    const { result } = renderHook(() => useDemoKeymap());

    const initialLayerCount = result.current.keymap!.layers.length;

    await act(async () => {
      const layerResult = await result.current.addLayer();
      expect(layerResult).toBeDefined();
      expect(layerResult?.layer).toBeDefined();
    });

    expect(result.current.keymap!.layers.length).toBe(initialLayerCount + 1);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  test("removeLayer deletes a layer", async () => {
    const { result } = renderHook(() => useDemoKeymap());

    const initialLayerCount = result.current.keymap!.layers.length;

    await act(async () => {
      const success = await result.current.removeLayer(0);
      expect(success).toBe(true);
    });

    expect(result.current.keymap!.layers.length).toBe(initialLayerCount - 1);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  test("moveLayer reorders layers", async () => {
    const { result } = renderHook(() => useDemoKeymap());

    const firstLayerId = result.current.keymap!.layers[0].id;
    const secondLayerId = result.current.keymap!.layers[1].id;

    await act(async () => {
      const success = await result.current.moveLayer(0, 1);
      expect(success).toBe(true);
    });

    expect(result.current.keymap!.layers[0].id).toBe(secondLayerId);
    expect(result.current.keymap!.layers[1].id).toBe(firstLayerId);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  test("getBehavior returns behavior definition", () => {
    const { result } = renderHook(() => useDemoKeymap());

    const behavior = result.current.getBehavior(1);
    expect(behavior).toBeDefined();
    expect(behavior?.displayName).toBe("kp");
  });

  test("getBindingDisplayName returns display name for binding", () => {
    const { result } = renderHook(() => useDemoKeymap());

    const displayName = result.current.getBindingDisplayName({
      behaviorId: 1,
      param1: 0,
      param2: 0,
    });
    expect(displayName).toBe("kp");
  });
});
