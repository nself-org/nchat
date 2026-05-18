/**
 * @fileoverview Tests for Idle Detector
 */

import {
  IdleDetector,
  getIdleDetector,
  destroyIdleDetector,
} from "../idle-detector";

describe("IdleDetector", () => {
  let detector: IdleDetector;
  let onIdleMock: jest.Mock;
  let onActiveMock: jest.Mock;
  let onVisibilityChangeMock: jest.Mock;

  // Save original window properties
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;
  const originalDocument = { hidden: document.hidden };

  beforeEach(() => {
    jest.useFakeTimers();

    onIdleMock = jest.fn();
    onActiveMock = jest.fn();
    onVisibilityChangeMock = jest.fn();

    detector = new IdleDetector({
      timeout: 5000, // 5 seconds for testing
      onIdle: onIdleMock,
      onActive: onActiveMock,
      onVisibilityChange: onVisibilityChangeMock,
    });
  });

  afterEach(() => {
    detector.stop();
    destroyIdleDetector();
    jest.useRealTimers();
    jest.clearAllMocks();

    // Restore document.hidden
    Object.defineProperty(document, "hidden", {
      value: originalDocument.hidden,
      writable: true,
    });
  });

  describe("start", () => {
    it("should start tracking user activity", () => {
      const addEventListenerSpy = jest.spyOn(window, "addEventListener");

      detector.start();

      // Should add activity event listeners
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function),
        {
          passive: true,
        },
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "mousemove",
        expect.any(Function),
        {
          passive: true,
        },
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
        {
          passive: true,
        },
      );
    });

    it("should add visibility change listener", () => {
      const addEventListenerSpy = jest.spyOn(document, "addEventListener");

      detector.start();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
    });

    it("should not start twice", () => {
      const addEventListenerSpy = jest.spyOn(window, "addEventListener");

      detector.start();
      detector.start();

      // Count calls for mousedown - should only be called once
      const mousedownCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === "mousedown",
      );
      expect(mousedownCalls).toHaveLength(1);
    });
  });

  describe("stop", () => {
    it("should remove event listeners", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      detector.start();
      detector.stop();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function),
      );
    });

    it("should clear idle timer", () => {
      detector.start();

      // Advance halfway through timeout
      jest.advanceTimersByTime(2500);

      detector.stop();

      // Advance past the timeout
      jest.advanceTimersByTime(5000);

      // Should not trigger idle callback
      expect(onIdleMock).not.toHaveBeenCalled();
    });
  });

  describe("idle detection", () => {
    it("should call onIdle after timeout", () => {
      detector.start();

      jest.advanceTimersByTime(5000);

      expect(onIdleMock).toHaveBeenCalledTimes(1);
    });

    it("should not call onIdle if activity occurs", () => {
      detector.start();

      // Advance halfway
      jest.advanceTimersByTime(2500);

      // Simulate activity
      detector.triggerActivity();

      // Advance another 2.5 seconds
      jest.advanceTimersByTime(2500);

      // Should not be idle yet
      expect(onIdleMock).not.toHaveBeenCalled();

      // Complete the timeout
      jest.advanceTimersByTime(2500);

      expect(onIdleMock).toHaveBeenCalledTimes(1);
    });

    it("should report correct idle state", () => {
      detector.start();

      expect(detector.getIsIdle()).toBe(false);

      jest.advanceTimersByTime(5000);

      expect(detector.getIsIdle()).toBe(true);
    });
  });

  describe("activity detection", () => {
    it("should call onActive when activity occurs after being idle", () => {
      detector.start();

      // Become idle
      jest.advanceTimersByTime(5000);
      expect(detector.getIsIdle()).toBe(true);

      // Trigger activity
      detector.triggerActivity();

      expect(onActiveMock).toHaveBeenCalledTimes(1);
      expect(detector.getIsIdle()).toBe(false);
    });

    it("should not call onActive if not idle", () => {
      detector.start();

      detector.triggerActivity();

      expect(onActiveMock).not.toHaveBeenCalled();
    });

    it("should track time since last activity", () => {
      detector.start();

      expect(detector.getTimeSinceActivity()).toBe(0);

      jest.advanceTimersByTime(3000);

      expect(detector.getTimeSinceActivity()).toBe(3000);
    });
  });

  describe("visibility change", () => {
    it("should set idle when page becomes hidden", () => {
      detector.start();

      // Mock document.hidden
      Object.defineProperty(document, "hidden", {
        value: true,
        writable: true,
      });

      // Simulate visibility change event
      document.dispatchEvent(new Event("visibilitychange"));

      expect(detector.getIsIdle()).toBe(true);
      expect(onIdleMock).toHaveBeenCalled();
      expect(onVisibilityChangeMock).toHaveBeenCalledWith(false);
    });

    it("should trigger activity when page becomes visible", () => {
      detector.start();

      // First, hide the page
      Object.defineProperty(document, "hidden", {
        value: true,
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      // Then show it again
      Object.defineProperty(document, "hidden", {
        value: false,
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));

      expect(detector.getIsIdle()).toBe(false);
      expect(onVisibilityChangeMock).toHaveBeenCalledWith(true);
      expect(onActiveMock).toHaveBeenCalled();
    });
  });

  describe("setTimeout", () => {
    it("should update the timeout value", () => {
      detector.start();

      // Set longer timeout
      detector.setTimeout(10000);

      // Original timeout should not trigger idle
      jest.advanceTimersByTime(5000);
      expect(detector.getIsIdle()).toBe(false);

      // New timeout should trigger idle
      jest.advanceTimersByTime(5000);
      expect(detector.getIsIdle()).toBe(true);
    });
  });

  describe("setCallbacks", () => {
    it("should update callbacks", () => {
      const newOnIdle = jest.fn();

      detector.start();
      detector.setCallbacks({ onIdle: newOnIdle });

      jest.advanceTimersByTime(5000);

      expect(newOnIdle).toHaveBeenCalled();
      expect(onIdleMock).not.toHaveBeenCalled();
    });
  });

  describe("Singleton", () => {
    it("should return same instance", () => {
      const instance1 = getIdleDetector();
      const instance2 = getIdleDetector();

      expect(instance1).toBe(instance2);
    });

    it("should allow destroying and recreating", () => {
      const instance1 = getIdleDetector();
      destroyIdleDetector();

      const instance2 = getIdleDetector();
      expect(instance1).not.toBe(instance2);
    });

    it("should stop detector on destroy", () => {
      const instance = getIdleDetector();
      instance.start();

      destroyIdleDetector();

      // Advancing time should not cause errors
      jest.advanceTimersByTime(10000);
    });
  });
});
