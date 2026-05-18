import { cn, debounce } from "../utils";

describe("cn utility function", () => {
  it("merges class names correctly", () => {
    const result = cn("base-class", "additional-class");
    expect(result).toBe("base-class additional-class");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const isDisabled = false;

    const result = cn("base", isActive && "active", isDisabled && "disabled");
    expect(result).toBe("base active");
  });

  it("merges Tailwind classes correctly", () => {
    // tailwind-merge should handle conflicting classes
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });

  it("handles arrays of classes", () => {
    const result = cn(["base", "class"], "additional");
    expect(result).toBe("base class additional");
  });

  it("handles undefined and null values", () => {
    const result = cn("base", undefined, null, "end");
    expect(result).toBe("base end");
  });

  it("handles objects with boolean values", () => {
    const result = cn({
      base: true,
      active: true,
      disabled: false,
    });
    expect(result).toBe("base active");
  });

  it("merges complex Tailwind utilities", () => {
    const result = cn("text-red-500 hover:text-blue-500", "text-green-500");
    // tailwind-merge should keep the last text color
    expect(result).toBe("hover:text-blue-500 text-green-500");
  });
});

describe("debounce utility function", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("delays function execution", () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn("arg1", "arg2");
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(999);
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
  });

  it("cancels previous timeout when called again", () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn("first");
    jest.advanceTimersByTime(500);

    debouncedFn("second");
    jest.advanceTimersByTime(500);

    // First call should be canceled, function not called yet
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    // Now second call should execute
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("second");
  });

  it("handles multiple rapid calls correctly", () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn("call1");
    debouncedFn("call2");
    debouncedFn("call3");
    debouncedFn("call4");
    debouncedFn("call5");

    // No calls should have executed yet
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);

    // Only the last call should execute
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("call5");
  });

  it("preserves function context and arguments", () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 500);

    debouncedFn(1, 2, 3, "test", { key: "value" });
    jest.advanceTimersByTime(500);

    expect(mockFn).toHaveBeenCalledWith(1, 2, 3, "test", { key: "value" });
  });

  it("works with zero delay", () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 0);

    debouncedFn("immediate");
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(0);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("immediate");
  });

  it("handles no arguments", () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 1000);

    debouncedFn();
    jest.advanceTimersByTime(1000);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith();
  });
});
