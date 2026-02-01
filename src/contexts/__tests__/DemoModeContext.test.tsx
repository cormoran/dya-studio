/**
 * Tests for DemoModeContext
 */
import { renderHook, act } from "@testing-library/react";
import { DemoModeProvider, useDemoMode } from "../DemoModeContext";

describe("DemoModeContext", () => {
  test("initial state is demo mode disabled", () => {
    const { result } = renderHook(() => useDemoMode(), {
      wrapper: DemoModeProvider,
    });

    expect(result.current.isDemoMode).toBe(false);
  });

  test("enableDemoMode enables demo mode", () => {
    const { result } = renderHook(() => useDemoMode(), {
      wrapper: DemoModeProvider,
    });

    act(() => {
      result.current.enableDemoMode();
    });

    expect(result.current.isDemoMode).toBe(true);
  });

  test("disableDemoMode disables demo mode", () => {
    const { result } = renderHook(() => useDemoMode(), {
      wrapper: DemoModeProvider,
    });

    // First enable it
    act(() => {
      result.current.enableDemoMode();
    });

    expect(result.current.isDemoMode).toBe(true);

    // Then disable it
    act(() => {
      result.current.disableDemoMode();
    });

    expect(result.current.isDemoMode).toBe(false);
  });

  test("toggleDemoMode toggles demo mode state", () => {
    const { result } = renderHook(() => useDemoMode(), {
      wrapper: DemoModeProvider,
    });

    // Initial state is false
    expect(result.current.isDemoMode).toBe(false);

    // Toggle to true
    act(() => {
      result.current.toggleDemoMode();
    });

    expect(result.current.isDemoMode).toBe(true);

    // Toggle back to false
    act(() => {
      result.current.toggleDemoMode();
    });

    expect(result.current.isDemoMode).toBe(false);
  });
});
