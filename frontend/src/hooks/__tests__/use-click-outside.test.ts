/**
 * Tests for use-click-outside hook
 */

import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { useClickOutside, useClickOutsideRef } from "../use-click-outside";

describe("useClickOutside", () => {
  let container: HTMLDivElement;
  let element: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    element = document.createElement("div");
    container.appendChild(element);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should call handler when clicking outside", () => {
    const handler = jest.fn();
    const ref = { current: element };

    renderHook(() => useClickOutside(ref, handler));

    const outsideClick = new MouseEvent("mousedown", { bubbles: true });
    document.body.dispatchEvent(outsideClick);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(outsideClick);
  });

  it("should not call handler when clicking inside", () => {
    const handler = jest.fn();
    const ref = { current: element };

    renderHook(() => useClickOutside(ref, handler));

    const insideClick = new MouseEvent("mousedown", { bubbles: true });
    element.dispatchEvent(insideClick);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle touch events", () => {
    const handler = jest.fn();
    const ref = { current: element };

    renderHook(() => useClickOutside(ref, handler));

    const touchEvent = new TouchEvent("touchstart", { bubbles: true });
    document.body.dispatchEvent(touchEvent);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should not call handler when disabled", () => {
    const handler = jest.fn();
    const ref = { current: element };

    renderHook(() => useClickOutside(ref, handler, false));

    const outsideClick = new MouseEvent("mousedown", { bubbles: true });
    document.body.dispatchEvent(outsideClick);

    expect(handler).not.toHaveBeenCalled();
  });

  it("should enable/disable based on enabled prop", () => {
    const handler = jest.fn();
    const ref = { current: element };

    const { rerender } = renderHook(
      ({ enabled }) => useClickOutside(ref, handler, enabled),
      {
        initialProps: { enabled: false },
      },
    );

    const click1 = new MouseEvent("mousedown", { bubbles: true });
    document.body.dispatchEvent(click1);
    expect(handler).not.toHaveBeenCalled();

    rerender({ enabled: true });

    const click2 = new MouseEvent("mousedown", { bubbles: true });
    document.body.dispatchEvent(click2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should not call handler when ref is null", () => {
    const handler = jest.fn();
    const ref = { current: null };

    renderHook(() => useClickOutside(ref, handler));

    const outsideClick = new MouseEvent("mousedown", { bubbles: true });
    document.body.dispatchEvent(outsideClick);

    // When ref is null, there's no element to compare against, so handler is not called
    expect(handler).not.toHaveBeenCalled();
  });

  it("should cleanup event listeners on unmount", () => {
    const handler = jest.fn();
    const ref = { current: element };
    const addEventListenerSpy = jest.spyOn(document, "addEventListener");
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");

    const { unmount } = renderHook(() => useClickOutside(ref, handler));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "mousedown",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "touchstart",
      expect.any(Function),
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "mousedown",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "touchstart",
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});

describe("useClickOutsideRef", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("should return a ref", () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useClickOutsideRef(handler));

    expect(result.current).toBeDefined();
    expect(result.current.current).toBeNull();
  });

  it("should work like useClickOutside", () => {
    const handler = jest.fn();
    const { result } = renderHook(() => useClickOutsideRef(handler));

    // Simulate attaching ref to element
    const element = document.createElement("div");
    container.appendChild(element);
    // @ts-ignore - manually assign ref for testing
    result.current.current = element;

    const outsideClick = new MouseEvent("mousedown", { bubbles: true });
    document.body.dispatchEvent(outsideClick);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
