/**
 * Tests for use-debounce hook
 */

import { renderHook, act } from "@testing-library/react";
import { useDebounce, useDebouncedCallback } from "../use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should return initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial"));
    expect(result.current).toBe("initial");
  });

  it("should debounce value changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "first", delay: 500 },
      },
    );

    expect(result.current).toBe("first");

    // Update value
    rerender({ value: "second", delay: 500 });

    // Should still be old value
    expect(result.current).toBe("first");

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should now be new value
    expect(result.current).toBe("second");
  });

  it("should cancel previous timeout on rapid changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      {
        initialProps: { value: "first" },
      },
    );

    rerender({ value: "second" });
    act(() => {
      jest.advanceTimersByTime(250);
    });

    rerender({ value: "third" });
    act(() => {
      jest.advanceTimersByTime(250);
    });

    // Should still be first value
    expect(result.current).toBe("first");

    act(() => {
      jest.advanceTimersByTime(250);
    });

    // Should now be third value (second was skipped)
    expect(result.current).toBe("third");
  });

  it("should use default delay of 500ms", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: "first" },
    });

    rerender({ value: "second" });

    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current).toBe("first");

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("second");
  });

  it("should handle different data types", () => {
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 1 } },
    );

    numberRerender({ value: 2 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(numberResult.current).toBe(2);

    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: { foo: "bar" } } },
    );

    const newObj = { foo: "baz" };
    objectRerender({ value: newObj });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(objectResult.current).toEqual(newObj);
  });
});

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should debounce callback execution", () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(mockCallback, 500),
    );

    act(() => {
      result.current("arg1");
      result.current("arg2");
      result.current("arg3");
    });

    expect(mockCallback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith("arg3");
  });

  it("should cancel previous timeout", () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(mockCallback, 500),
    );

    act(() => {
      result.current("first");
      jest.advanceTimersByTime(250);
      result.current("second");
      jest.advanceTimersByTime(500);
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith("second");
  });

  it("should use default delay", () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(mockCallback));

    act(() => {
      result.current();
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple arguments", () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(mockCallback, 100),
    );

    act(() => {
      result.current("arg1", "arg2", "arg3");
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockCallback).toHaveBeenCalledWith("arg1", "arg2", "arg3");
  });

  it("should use latest callback", () => {
    let callback = jest.fn();
    const { result, rerender } = renderHook(
      ({ cb }) => useDebouncedCallback(cb, 100),
      {
        initialProps: { cb: callback },
      },
    );

    act(() => {
      result.current();
    });

    const newCallback = jest.fn();
    callback = newCallback;
    rerender({ cb: newCallback });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(newCallback).toHaveBeenCalledTimes(1);
  });

  it("should cleanup on unmount", () => {
    const mockCallback = jest.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback(mockCallback, 500),
    );

    act(() => {
      result.current();
    });

    unmount();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockCallback).not.toHaveBeenCalled();
  });
});
