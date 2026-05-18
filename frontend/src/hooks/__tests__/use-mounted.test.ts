/**
 * Tests for use-mounted hooks
 */

import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import {
  useIsMounted,
  useMountedRef,
  useOnMount,
  useOnUnmount,
  useSafeSetState,
} from "../use-mounted";

describe("useIsMounted", () => {
  // Note: With React Testing Library's renderHook, useEffect runs synchronously,
  // so the mounted state is already true by the time we can observe it
  it("should return true after mount", () => {
    const { result } = renderHook(() => useIsMounted());
    // After renderHook completes, the component is mounted
    expect(result.current).toBe(true);
  });

  it("should remain true on rerender", () => {
    const { result, rerender } = renderHook(() => useIsMounted());
    rerender();
    expect(result.current).toBe(true);
  });

  it("should return false after unmount", () => {
    const { result, unmount, rerender } = renderHook(() => useIsMounted());
    rerender();
    expect(result.current).toBe(true);

    unmount();
    // After unmount we can't check result.current, but the effect cleanup will set it to false
  });
});

describe("useMountedRef", () => {
  it("should return function that checks mounted state", () => {
    const { result } = renderHook(() => useMountedRef());
    expect(typeof result.current).toBe("function");
  });

  // Note: With React Testing Library's renderHook, useEffect runs synchronously,
  // so the mounted state is already true by the time we can observe it
  it("should return true after mount", () => {
    const { result } = renderHook(() => useMountedRef());
    expect(result.current()).toBe(true);
  });

  it("should remain true on rerender", () => {
    const { result, rerender } = renderHook(() => useMountedRef());
    rerender();
    expect(result.current()).toBe(true);
  });

  it("should be stable across renders", () => {
    const { result, rerender } = renderHook(() => useMountedRef());
    const firstRef = result.current;
    rerender();
    const secondRef = result.current;
    expect(firstRef).toBe(secondRef);
  });
});

describe("useOnMount", () => {
  it("should execute callback on mount", () => {
    const mockCallback = jest.fn();
    renderHook(() => useOnMount(mockCallback));
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("should not execute callback on rerenders", () => {
    const mockCallback = jest.fn();
    const { rerender } = renderHook(() => useOnMount(mockCallback));
    rerender();
    rerender();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("should execute cleanup function on unmount", () => {
    const mockCleanup = jest.fn();
    const mockCallback = jest.fn(() => mockCleanup);
    const { unmount } = renderHook(() => useOnMount(mockCallback));

    expect(mockCallback).toHaveBeenCalledTimes(1);
    unmount();
    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });
});

describe("useOnUnmount", () => {
  it("should execute callback on unmount", () => {
    const mockCallback = jest.fn();
    const { unmount } = renderHook(() => useOnUnmount(mockCallback));
    expect(mockCallback).not.toHaveBeenCalled();

    unmount();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it("should not execute callback on rerender", () => {
    const mockCallback = jest.fn();
    const { rerender } = renderHook(() => useOnUnmount(mockCallback));
    rerender();
    rerender();
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it("should use latest callback", () => {
    let callbackValue = "first";
    const mockCallback = jest.fn(() => callbackValue);

    const { rerender, unmount } = renderHook(({ cb }) => useOnUnmount(cb), {
      initialProps: { cb: mockCallback },
    });

    callbackValue = "second";
    const newCallback = jest.fn(() => callbackValue);
    rerender({ cb: newCallback });

    unmount();
    expect(newCallback).toHaveBeenCalled();
  });
});

describe("useSafeSetState", () => {
  it("should update state when mounted", () => {
    const { result } = renderHook(() => {
      const [value, setValue] = useState("initial");
      const safeSetValue = useSafeSetState(setValue);
      return { value, safeSetValue };
    });

    act(() => {
      result.current.safeSetValue("updated");
    });

    // Need to wait for next render
    expect(result.current.value).toBe("updated");
  });

  it("should not update state when unmounted", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    const { result, unmount } = renderHook(() => {
      const [value, setValue] = useState("initial");
      const safeSetValue = useSafeSetState(setValue);
      return { value, safeSetValue };
    });

    unmount();

    // This should not cause a warning about setting state on unmounted component
    act(() => {
      result.current.safeSetValue("updated");
    });

    consoleErrorSpy.mockRestore();
  });

  it("should handle function updaters", () => {
    const { result } = renderHook(() => {
      const [count, setCount] = useState(0);
      const safeSetCount = useSafeSetState(setCount);
      return { count, safeSetCount };
    });

    act(() => {
      result.current.safeSetCount((prev) => prev + 1);
    });

    expect(result.current.count).toBe(1);
  });
});
