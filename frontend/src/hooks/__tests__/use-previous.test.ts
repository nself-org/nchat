/**
 * Tests for use-previous hook
 */

import { renderHook } from "@testing-library/react";
import {
  usePrevious,
  usePreviousWithInitial,
  useValueChange,
} from "../use-previous";

describe("usePrevious", () => {
  it("should return undefined on first render", () => {
    const { result } = renderHook(() => usePrevious("initial"));
    expect(result.current).toBeUndefined();
  });

  it("should return previous value after update", () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: "first" },
    });

    expect(result.current).toBeUndefined();

    rerender({ value: "second" });
    expect(result.current).toBe("first");

    rerender({ value: "third" });
    expect(result.current).toBe("second");
  });

  it("should work with different data types", () => {
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: 1 } },
    );

    numberRerender({ value: 2 });
    expect(numberResult.current).toBe(1);

    const obj1 = { foo: "bar" };
    const obj2 = { foo: "baz" };
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: obj1 } },
    );

    objectRerender({ value: obj2 });
    expect(objectResult.current).toBe(obj1);
  });
});

describe("usePreviousWithInitial", () => {
  it("should return initial value on first render", () => {
    const { result } = renderHook(() =>
      usePreviousWithInitial("current", "initial"),
    );
    expect(result.current).toBe("initial");
  });

  it("should return previous value after update", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePreviousWithInitial(value, "initial"),
      { initialProps: { value: "first" } },
    );

    expect(result.current).toBe("initial");

    rerender({ value: "second" });
    expect(result.current).toBe("first");

    rerender({ value: "third" });
    expect(result.current).toBe("second");
  });

  it("should work with same type for value and initial", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePreviousWithInitial(value, 0),
      {
        initialProps: { value: 1 },
      },
    );

    expect(result.current).toBe(0);

    rerender({ value: 2 });
    expect(result.current).toBe(1);
  });
});

describe("useValueChange", () => {
  it("should return correct state on first render", () => {
    const { result } = renderHook(() => useValueChange("initial"));

    expect(result.current.previous).toBeUndefined();
    expect(result.current.hasChanged).toBe(false);
    expect(result.current.isFirstRender).toBe(true);
  });

  it("should detect value changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useValueChange(value),
      {
        initialProps: { value: "first" },
      },
    );

    expect(result.current.hasChanged).toBe(false);
    expect(result.current.isFirstRender).toBe(true);

    rerender({ value: "second" });

    expect(result.current.previous).toBe("first");
    expect(result.current.hasChanged).toBe(true);
    expect(result.current.isFirstRender).toBe(false);
  });

  it("should not detect change when value stays same", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useValueChange(value),
      {
        initialProps: { value: "same" },
      },
    );

    rerender({ value: "same" });

    expect(result.current.previous).toBe("same");
    expect(result.current.hasChanged).toBe(false);
    expect(result.current.isFirstRender).toBe(false);
  });

  it("should track multiple changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useValueChange(value),
      {
        initialProps: { value: "first" },
      },
    );

    rerender({ value: "second" });
    expect(result.current.hasChanged).toBe(true);
    expect(result.current.previous).toBe("first");

    rerender({ value: "third" });
    expect(result.current.hasChanged).toBe(true);
    expect(result.current.previous).toBe("second");

    rerender({ value: "third" });
    expect(result.current.hasChanged).toBe(false);
    expect(result.current.previous).toBe("third");
  });

  it("should work with objects", () => {
    const obj1 = { foo: "bar" };
    const obj2 = { foo: "baz" };

    const { result, rerender } = renderHook(
      ({ value }) => useValueChange(value),
      {
        initialProps: { value: obj1 },
      },
    );

    rerender({ value: obj2 });

    expect(result.current.hasChanged).toBe(true);
    expect(result.current.previous).toBe(obj1);
  });

  it("should detect no change for same object reference", () => {
    const obj = { foo: "bar" };

    const { result, rerender } = renderHook(
      ({ value }) => useValueChange(value),
      {
        initialProps: { value: obj },
      },
    );

    rerender({ value: obj });

    expect(result.current.hasChanged).toBe(false);
  });
});
