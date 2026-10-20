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

it("serializes immediate writes and applies the latest queued value after an in-flight write", async () => {
  let finish!: () => void;
  const writes: string[] = [];
  const write = jest.fn(async (value: string) => {
    writes.push(value);
    if (value === "first")
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
  });
  const { result } = renderHook(() => useDebouncedMemoryWrite(write, 0));
  act(() => result.current.queue("first"));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
  act(() => {
    result.current.queue("second");
    result.current.queue("latest");
  });
  const pending = result.current.flush();
  expect(writes).toEqual(["first"]);
  await act(async () => {
    finish();
    await pending;
  });
  expect(writes).toEqual(["first", "latest"]);
});
