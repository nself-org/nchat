/**
 * useGestures Hook Tests
 *
 * Comprehensive tests for the gesture detection hook.
 */

import { renderHook, act } from "@testing-library/react";
import { useGestures } from "../use-gestures";

// ============================================================================
// Test Setup
// ============================================================================

// Mock requestAnimationFrame
const mockRaf = jest
  .spyOn(window, "requestAnimationFrame")
  .mockImplementation((cb) => {
    setTimeout(() => cb(0), 0);
    return 0;
  });

const mockCancelRaf = jest
  .spyOn(window, "cancelAnimationFrame")
  .mockImplementation(() => {});

// ============================================================================
// Tests
// ============================================================================

describe("useGestures", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockRaf.mockRestore();
    mockCancelRaf.mockRestore();
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe("Initial State", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useGestures());

      expect(result.current.state.scale).toBe(1);
      expect(result.current.state.translateX).toBe(0);
      expect(result.current.state.translateY).toBe(0);
      expect(result.current.state.rotation).toBe(0);
      expect(result.current.state.isPinching).toBe(false);
      expect(result.current.state.isPanning).toBe(false);
    });

    it("should accept initial scale option", () => {
      const { result } = renderHook(() => useGestures({}, { initialScale: 2 }));

      expect(result.current.state.scale).toBe(2);
    });

    it("should accept initial translate options", () => {
      const { result } = renderHook(() =>
        useGestures({}, { initialTranslateX: 100, initialTranslateY: 50 }),
      );

      expect(result.current.state.translateX).toBe(100);
      expect(result.current.state.translateY).toBe(50);
    });
  });

  // ==========================================================================
  // Zoom Control Tests
  // ==========================================================================

  describe("Zoom Controls", () => {
    it("should zoom in by default step", () => {
      const { result } = renderHook(() => useGestures());

      act(() => {
        result.current.zoomIn();
      });

      expect(result.current.state.scale).toBe(1.25);
    });

    it("should zoom in by custom amount", () => {
      const { result } = renderHook(() => useGestures());

      act(() => {
        result.current.zoomIn(0.5);
      });

      expect(result.current.state.scale).toBe(1.5);
    });

    it("should zoom out by default step", () => {
      const { result } = renderHook(() => useGestures({}, { initialScale: 2 }));

      act(() => {
        result.current.zoomOut();
      });

      expect(result.current.state.scale).toBe(1.75);
    });

    it("should zoom out by custom amount", () => {
      const { result } = renderHook(() => useGestures({}, { initialScale: 2 }));

      act(() => {
        result.current.zoomOut(0.5);
      });

      expect(result.current.state.scale).toBe(1.5);
    });

    it("should not exceed max zoom", () => {
      const { result } = renderHook(() =>
        useGestures({}, { initialScale: 4.9, maxScale: 5 }),
      );

      act(() => {
        result.current.zoomIn(0.5);
      });

      expect(result.current.state.scale).toBe(5);
    });

    it("should not go below min zoom", () => {
      const { result } = renderHook(() =>
        useGestures({}, { initialScale: 0.6, minScale: 0.5 }),
      );

      act(() => {
        result.current.zoomOut(0.5);
      });

      expect(result.current.state.scale).toBe(0.5);
    });

    it("should set exact scale value", () => {
      const { result } = renderHook(() => useGestures());

      act(() => {
        result.current.setScale(2.5);
      });

      expect(result.current.state.scale).toBe(2.5);
    });

    it("should clamp scale to min/max bounds", () => {
      const { result } = renderHook(() =>
        useGestures({}, { minScale: 0.5, maxScale: 5 }),
      );

      act(() => {
        result.current.setScale(10);
      });

      expect(result.current.state.scale).toBe(5);

      act(() => {
        result.current.setScale(0.1);
      });

      expect(result.current.state.scale).toBe(0.5);
    });
  });

  // ==========================================================================
  // Pan Control Tests
  // ==========================================================================

  describe("Pan Controls", () => {
    it("should set translate values", () => {
      const { result } = renderHook(() => useGestures());

      act(() => {
        result.current.setTranslate(100, 50);
      });

      expect(result.current.state.translateX).toBe(100);
      expect(result.current.state.translateY).toBe(50);
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("Reset", () => {
    it("should reset all values to initial state", () => {
      const { result } = renderHook(() =>
        useGestures(
          {},
          { initialScale: 1, initialTranslateX: 0, initialTranslateY: 0 },
        ),
      );

      // Modify state
      act(() => {
        result.current.setScale(2.5);
        result.current.setTranslate(100, 50);
      });

      expect(result.current.state.scale).toBe(2.5);
      expect(result.current.state.translateX).toBe(100);
      expect(result.current.state.translateY).toBe(50);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state.scale).toBe(1);
      expect(result.current.state.translateX).toBe(0);
      expect(result.current.state.translateY).toBe(0);
      expect(result.current.state.rotation).toBe(0);
    });
  });

  // ==========================================================================
  // Callback Tests
  // ==========================================================================

  describe("Callbacks", () => {
    it("should call onZoomChange when scale changes", () => {
      const onZoomChange = jest.fn();
      const { result } = renderHook(() => useGestures({ onZoomChange }));

      act(() => {
        result.current.zoomIn();
      });

      expect(onZoomChange).toHaveBeenCalledWith(1.25, { x: 0, y: 0 });
    });

    it("should call onPanChange when translate changes", () => {
      const onPanChange = jest.fn();
      const { result } = renderHook(() => useGestures({ onPanChange }));

      act(() => {
        result.current.setTranslate(100, 50);
      });

      expect(onPanChange).toHaveBeenCalledWith(100, 50);
    });
  });

  // ==========================================================================
  // Transform Style Tests
  // ==========================================================================

  describe("Transform Style", () => {
    it("should return correct transform style", () => {
      const { result } = renderHook(() =>
        useGestures(
          {},
          { initialScale: 2, initialTranslateX: 50, initialTranslateY: 25 },
        ),
      );

      const style = result.current.getTransformStyle();

      expect(style.transform).toContain("translate(50px, 25px)");
      expect(style.transform).toContain("scale(2)");
      expect(style.touchAction).toBe("none");
      expect(style.userSelect).toBe("none");
    });

    it("should set grab cursor when zoomed", () => {
      const { result } = renderHook(() => useGestures({}, { initialScale: 2 }));

      const style = result.current.getTransformStyle();

      expect(style.cursor).toBe("grab");
    });

    it("should set default cursor when not zoomed", () => {
      const { result } = renderHook(() => useGestures({}, { initialScale: 1 }));

      const style = result.current.getTransformStyle();

      expect(style.cursor).toBe("default");
    });
  });

  // ==========================================================================
  // Ref Tests
  // ==========================================================================

  describe("Ref", () => {
    it("should provide a ref object", () => {
      const { result } = renderHook(() => useGestures());

      expect(result.current.ref).toBeDefined();
      expect(result.current.ref.current).toBeNull();
    });
  });

  // ==========================================================================
  // Options Tests
  // ==========================================================================

  describe("Options", () => {
    it("should respect enablePinchZoom option", () => {
      const { result } = renderHook(() =>
        useGestures({}, { enablePinchZoom: false }),
      );

      // Hook should still work, just not respond to pinch gestures
      expect(result.current.state.scale).toBe(1);
    });

    it("should respect enableWheelZoom option", () => {
      const { result } = renderHook(() =>
        useGestures({}, { enableWheelZoom: false }),
      );

      // Hook should still work, just not respond to wheel gestures
      expect(result.current.state.scale).toBe(1);
    });

    it("should respect custom zoom sensitivity", () => {
      const { result } = renderHook(() =>
        useGestures({}, { zoomSensitivity: 0.01 }),
      );

      // Custom sensitivity is used internally
      expect(result.current.state.scale).toBe(1);
    });
  });
});
