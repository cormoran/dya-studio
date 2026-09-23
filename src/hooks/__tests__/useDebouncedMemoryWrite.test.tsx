import { act, renderHook } from "@testing-library/react";
import {
  MEMORY_WRITE_DEBOUNCE_MS,
  useDebouncedMemoryWrite,
} from "../useDebouncedMemoryWrite";

it("waits for a write already in flight after queued edits are canceled", async () => {
  jest.useFakeTimers();
  try {
    let finishWrite!: () => void;
    const write = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    );
    const { result } = renderHook(() => useDebouncedMemoryWrite(write));
    act(() => result.current.queue("first"));
    await act(async () => {
      jest.advanceTimersByTime(MEMORY_WRITE_DEBOUNCE_MS);
    });
    expect(write).toHaveBeenCalledWith("first");

    act(() => {
      result.current.queue("second");
      result.current.cancel();
    });
    let settled = false;
    const flush = result.current.flush().then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    await act(async () => {
      finishWrite();
      await flush;
    });
    expect(settled).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});
