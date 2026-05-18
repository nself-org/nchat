/**
 * Tests for use-local-storage hook
 */

import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "../use-local-storage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it("returns initial value when key not set", () => {
    const { result } = renderHook(() => useLocalStorage("k1", "initial"));
    expect(result.current[0]).toBe("initial");
  });

  it("returns stored value when key already set", () => {
    window.localStorage.setItem("k1", JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("k1", "fallback"));
    expect(result.current[0]).toBe("stored");
  });

  it("setValue updates state and localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("k1", 0));
    act(() => {
      result.current[1](42);
    });
    expect(result.current[0]).toBe(42);
    expect(JSON.parse(window.localStorage.getItem("k1")!)).toBe(42);
  });

  it("supports functional updates", () => {
    const { result } = renderHook(() => useLocalStorage<number>("k1", 1));
    act(() => {
      result.current[1]((prev) => prev + 5);
    });
    expect(result.current[0]).toBe(6);
  });

  it("removeValue restores initial value and clears storage", () => {
    const { result } = renderHook(() => useLocalStorage("k1", "initial"));
    act(() => {
      result.current[1]("newval");
    });
    expect(result.current[0]).toBe("newval");
    act(() => {
      result.current[2]();
    });
    expect(result.current[0]).toBe("initial");
    expect(window.localStorage.getItem("k1")).toBeNull();
  });

  it("handles complex objects", () => {
    const { result } = renderHook(() =>
      useLocalStorage<{ count: number }>("k1", { count: 0 }),
    );
    act(() => {
      result.current[1]({ count: 99 });
    });
    expect(result.current[0]).toEqual({ count: 99 });
    expect(JSON.parse(window.localStorage.getItem("k1")!)).toEqual({
      count: 99,
    });
  });

  it("falls back to initial value on malformed JSON", () => {
    window.localStorage.setItem("k1", "{notjson");
    const { result } = renderHook(() => useLocalStorage("k1", "fallback"));
    expect(result.current[0]).toBe("fallback");
  });

  it("syncs across hooks via storage event", () => {
    const { result: r1 } = renderHook(() => useLocalStorage("shared", "a"));
    const { result: r2 } = renderHook(() => useLocalStorage("shared", "a"));

    act(() => {
      r1.current[1]("updated");
    });
    expect(r1.current[0]).toBe("updated");
    // storage event dispatched by r1 should update r2
    expect(r2.current[0]).toBe("updated");
  });

  it("storage event with null newValue resets to initial", () => {
    const { result } = renderHook(() => useLocalStorage("k1", "initial"));
    act(() => {
      result.current[1]("x");
    });
    expect(result.current[0]).toBe("x");
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "k1", newValue: null }),
      );
    });
    expect(result.current[0]).toBe("initial");
  });

  it("ignores storage events for unrelated keys", () => {
    const { result } = renderHook(() => useLocalStorage("k1", "v1"));
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "other",
          newValue: JSON.stringify("ignored"),
        }),
      );
    });
    expect(result.current[0]).toBe("v1");
  });

  it("handles boolean and number types", () => {
    const { result: bool } = renderHook(() => useLocalStorage("b", false));
    act(() => bool.current[1](true));
    expect(bool.current[0]).toBe(true);

    const { result: num } = renderHook(() => useLocalStorage("n", 1));
    act(() => num.current[1](2));
    expect(num.current[0]).toBe(2);
  });

  it("removes listener on unmount", () => {
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useLocalStorage("k", "v"));
    expect(addSpy).toHaveBeenCalledWith("storage", expect.any(Function));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("storage", expect.any(Function));
  });
});
