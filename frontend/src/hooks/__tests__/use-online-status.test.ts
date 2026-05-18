/**
 * Tests for use-online-status hooks
 */

import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus, useNetworkStatus } from "../use-online-status";

describe("useOnlineStatus", () => {
  const setOnLine = (value: boolean) => {
    Object.defineProperty(navigator, "onLine", {
      value,
      configurable: true,
      writable: true,
    });
  };

  beforeEach(() => {
    setOnLine(true);
  });

  it("initial state matches navigator.onLine", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it("initial state false when navigator offline", () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it("updates to false on offline event", () => {
    const { result } = renderHook(() => useOnlineStatus());
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);
  });

  it("updates to true on online event", () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnlineStatus());
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("removes listeners on unmount", () => {
    const removeSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});

describe("useNetworkStatus", () => {
  const setOnLine = (value: boolean) => {
    Object.defineProperty(navigator, "onLine", {
      value,
      configurable: true,
      writable: true,
    });
  };

  beforeEach(() => {
    setOnLine(true);
  });

  it("initial state reports online with lastOnline set", () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
    expect(result.current.lastOnline).toBeInstanceOf(Date);
  });

  it("offline event sets wasOffline and isOnline=false", () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(true);
  });

  it("online event updates lastOnline", () => {
    const { result } = renderHook(() => useNetworkStatus());
    const first = result.current.lastOnline;
    // Advance time then fire online event
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastOnline).toBeInstanceOf(Date);
    expect(result.current.lastOnline!.getTime()).toBeGreaterThanOrEqual(
      first!.getTime(),
    );
  });

  it("starts with null lastOnline when offline at mount", () => {
    setOnLine(false);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);
    expect(result.current.lastOnline).toBeNull();
  });
});
