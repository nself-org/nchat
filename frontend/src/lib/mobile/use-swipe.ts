"use client";

import { useRef, useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export type SwipeDirection = "left" | "right" | "up" | "down" | null;

export interface SwipeState {
  direction: SwipeDirection;
  deltaX: number;
  deltaY: number;
  absX: number;
  absY: number;
  velocity: number;
  startX: number;
  startY: number;
  isSwping: boolean;
}

export interface SwipeCallbacks {
  onSwipeStart?: (state: SwipeState) => void;
  onSwipeMove?: (state: SwipeState) => void;
  onSwipeEnd?: (state: SwipeState) => void;
  onSwipeLeft?: (state: SwipeState) => void;
  onSwipeRight?: (state: SwipeState) => void;
  onSwipeUp?: (state: SwipeState) => void;
  onSwipeDown?: (state: SwipeState) => void;
}

export interface SwipeOptions extends SwipeCallbacks {
  threshold?: number; // Minimum distance to register swipe
  velocityThreshold?: number; // Minimum velocity for quick swipes
  lockDirection?: boolean; // Lock to first detected direction
  preventDefaultOnSwipe?: boolean;
  trackMouse?: boolean; // Track mouse events as well
}

export interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_THRESHOLD = 50;
const DEFAULT_VELOCITY_THRESHOLD = 0.5;

// ============================================================================
// Hook
// ============================================================================

/**
 * Swipe gesture detection hook
 * Supports both touch and optional mouse events
 */
export function useSwipe(
  options: SwipeOptions = {},
): [SwipeState, SwipeHandlers] {
  const {
    threshold = DEFAULT_THRESHOLD,
    velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
    lockDirection = true,
    preventDefaultOnSwipe = false,
    trackMouse = false,
    onSwipeStart,
    onSwipeMove,
    onSwipeEnd,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = options;

  const [state, setState] = useState<SwipeState>({
    direction: null,
    deltaX: 0,
    deltaY: 0,
    absX: 0,
    absY: 0,
    velocity: 0,
    startX: 0,
    startY: 0,
    isSwping: false,
  });

  const startRef = useRef({ x: 0, y: 0, time: 0 });
  const lockedDirectionRef = useRef<"horizontal" | "vertical" | null>(null);
  const isTrackingRef = useRef(false);

  // Calculate swipe direction
  const getDirection = useCallback(
    (deltaX: number, deltaY: number): SwipeDirection => {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (lockDirection && lockedDirectionRef.current) {
        if (lockedDirectionRef.current === "horizontal") {
          return deltaX > 0 ? "right" : "left";
        } else {
          return deltaY > 0 ? "down" : "up";
        }
      }

      if (absX > absY) {
        return deltaX > 0 ? "right" : "left";
      } else if (absY > absX) {
        return deltaY > 0 ? "down" : "up";
      }

      return null;
    },
    [lockDirection],
  );

  // Handle start
  const handleStart = useCallback(
    (x: number, y: number) => {
      startRef.current = { x, y, time: Date.now() };
      lockedDirectionRef.current = null;
      isTrackingRef.current = true;

      const newState: SwipeState = {
        direction: null,
        deltaX: 0,
        deltaY: 0,
        absX: 0,
        absY: 0,
        velocity: 0,
        startX: x,
        startY: y,
        isSwping: true,
      };

      setState(newState);
      onSwipeStart?.(newState);
    },
    [onSwipeStart],
  );

  // Handle move
  const handleMove = useCallback(
    (x: number, y: number, e?: React.TouchEvent) => {
      if (!isTrackingRef.current) return;

      const deltaX = x - startRef.current.x;
      const deltaY = y - startRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Lock direction on first significant movement
      if (
        lockDirection &&
        !lockedDirectionRef.current &&
        (absX > 10 || absY > 10)
      ) {
        lockedDirectionRef.current = absX > absY ? "horizontal" : "vertical";
      }

      // Calculate velocity
      const elapsed = Date.now() - startRef.current.time;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = elapsed > 0 ? distance / elapsed : 0;

      const direction = getDirection(deltaX, deltaY);

      // Prevent default if swiping horizontally (to prevent page navigation)
      if (
        preventDefaultOnSwipe &&
        direction &&
        (direction === "left" || direction === "right")
      ) {
        e?.preventDefault();
      }

      const newState: SwipeState = {
        direction,
        deltaX,
        deltaY,
        absX,
        absY,
        velocity,
        startX: startRef.current.x,
        startY: startRef.current.y,
        isSwping: true,
      };

      setState(newState);
      onSwipeMove?.(newState);
    },
    [lockDirection, preventDefaultOnSwipe, getDirection, onSwipeMove],
  );

  // Handle end
  const handleEnd = useCallback(() => {
    if (!isTrackingRef.current) return;
    isTrackingRef.current = false;

    setState((prev) => {
      const { deltaX, deltaY, absX, absY, velocity } = prev;

      // Check if swipe meets threshold
      const meetsThreshold = absX > threshold || absY > threshold;
      const meetsVelocity = velocity > velocityThreshold;

      if (meetsThreshold || meetsVelocity) {
        const direction = getDirection(deltaX, deltaY);
        const finalState = { ...prev, direction, isSwping: false };

        // Call direction-specific callbacks
        switch (direction) {
          case "left":
            onSwipeLeft?.(finalState);
            break;
          case "right":
            onSwipeRight?.(finalState);
            break;
          case "up":
            onSwipeUp?.(finalState);
            break;
          case "down":
            onSwipeDown?.(finalState);
            break;
        }

        onSwipeEnd?.(finalState);
        return finalState;
      }

      const cancelState = { ...prev, direction: null, isSwping: false };
      onSwipeEnd?.(cancelState);
      return cancelState;
    });
  }, [
    threshold,
    velocityThreshold,
    getDirection,
    onSwipeEnd,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  ]);

  // Touch handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    },
    [handleStart],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY, e);
    },
    [handleMove],
  );

  const onTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse handlers (for desktop testing)
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!trackMouse) return;
      handleStart(e.clientX, e.clientY);
    },
    [trackMouse, handleStart],
  );

  // Global mouse event listeners for drag tracking
  useEffect(() => {
    if (!trackMouse) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isTrackingRef.current) {
        handleMove(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      if (isTrackingRef.current) {
        handleEnd();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [trackMouse, handleMove, handleEnd]);

  const handlers: SwipeHandlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    ...(trackMouse && { onMouseDown }),
  };

  return [state, handlers];
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Simple swipe detection with just callbacks
 */
export function useSimpleSwipe(
  callbacks: SwipeCallbacks,
  options: Omit<SwipeOptions, keyof SwipeCallbacks> = {},
) {
  return useSwipe({ ...options, ...callbacks });
}

/**
 * Horizontal swipe only
 */
export function useHorizontalSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  options: Omit<
    SwipeOptions,
    "onSwipeLeft" | "onSwipeRight" | "onSwipeUp" | "onSwipeDown"
  > = {},
) {
  return useSwipe({
    ...options,
    onSwipeLeft: onSwipeLeft ? () => onSwipeLeft() : undefined,
    onSwipeRight: onSwipeRight ? () => onSwipeRight() : undefined,
  });
}

/**
 * Vertical swipe only
 */
export function useVerticalSwipe(
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  options: Omit<
    SwipeOptions,
    "onSwipeLeft" | "onSwipeRight" | "onSwipeUp" | "onSwipeDown"
  > = {},
) {
  return useSwipe({
    ...options,
    onSwipeUp: onSwipeUp ? () => onSwipeUp() : undefined,
    onSwipeDown: onSwipeDown ? () => onSwipeDown() : undefined,
  });
}
