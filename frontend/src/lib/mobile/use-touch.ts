"use client";

import { useRef, useCallback, useState, useEffect } from "react";

// ============================================================================
// Types
// ============================================================================

export interface LongPressOptions {
  delay?: number;
  threshold?: number;
  onLongPress?: (event: React.TouchEvent | React.MouseEvent) => void;
  onPress?: (event: React.TouchEvent | React.MouseEvent) => void;
  onCancel?: () => void;
}

export interface DoubleTapOptions {
  delay?: number;
  onSingleTap?: (event: React.TouchEvent | React.MouseEvent) => void;
  onDoubleTap?: (event: React.TouchEvent | React.MouseEvent) => void;
}

export interface PinchState {
  scale: number;
  delta: number;
  origin: { x: number; y: number };
  isPinching: boolean;
}

export interface PinchOptions {
  onPinchStart?: (state: PinchState) => void;
  onPinch?: (state: PinchState) => void;
  onPinchEnd?: (state: PinchState) => void;
  minScale?: number;
  maxScale?: number;
}

// ============================================================================
// Long Press Hook
// ============================================================================

/**
 * Long press gesture detection
 * Supports both touch and mouse events
 */
export function useLongPress(options: LongPressOptions = {}) {
  const {
    delay = 500,
    threshold = 10,
    onLongPress,
    onPress,
    onCancel,
  } = options;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const triggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleStart = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      triggeredRef.current = false;

      // Get position
      if ("touches" in event) {
        const touch = event.touches[0];
        startPosRef.current = { x: touch.clientX, y: touch.clientY };
      } else {
        startPosRef.current = { x: event.clientX, y: event.clientY };
      }

      // Set up long press timer
      timerRef.current = setTimeout(() => {
        triggeredRef.current = true;
        onLongPress?.(event);
      }, delay);
    },
    [delay, onLongPress],
  );

  const handleMove = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (!startPosRef.current) return;

      // Get current position
      let currentX: number;
      let currentY: number;

      if ("touches" in event) {
        const touch = event.touches[0];
        currentX = touch.clientX;
        currentY = touch.clientY;
      } else {
        currentX = event.clientX;
        currentY = event.clientY;
      }

      // Check if moved beyond threshold
      const deltaX = Math.abs(currentX - startPosRef.current.x);
      const deltaY = Math.abs(currentY - startPosRef.current.y);

      if (deltaX > threshold || deltaY > threshold) {
        clear();
        onCancel?.();
      }
    },
    [threshold, clear, onCancel],
  );

  const handleEnd = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      clear();
      startPosRef.current = null;

      // Trigger regular press if long press wasn't triggered
      if (!triggeredRef.current) {
        onPress?.(event);
      }
    },
    [clear, onPress],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => clear();
  }, [clear]);

  return {
    onTouchStart: handleStart,
    onTouchMove: handleMove,
    onTouchEnd: handleEnd,
    onTouchCancel: handleEnd,
    onMouseDown: handleStart,
    onMouseMove: handleMove,
    onMouseUp: handleEnd,
    onMouseLeave: handleEnd,
  };
}

// ============================================================================
// Double Tap Hook
// ============================================================================

/**
 * Double tap gesture detection
 */
export function useDoubleTap(options: DoubleTapOptions = {}) {
  const { delay = 300, onSingleTap, onDoubleTap } = options;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);

  const handleTap = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;

      if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
        // Double tap detected
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        lastTapRef.current = 0;
        onDoubleTap?.(event);
      } else {
        // Potential single tap
        lastTapRef.current = now;

        // Wait to see if there's a second tap
        timerRef.current = setTimeout(() => {
          lastTapRef.current = 0;
          onSingleTap?.(event);
        }, delay);
      }
    },
    [delay, onSingleTap, onDoubleTap],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    onTouchEnd: handleTap,
    onClick: handleTap,
  };
}

// ============================================================================
// Pinch Zoom Hook
// ============================================================================

/**
 * Pinch zoom gesture detection
 */
export function usePinch(options: PinchOptions = {}) {
  const {
    onPinchStart,
    onPinch,
    onPinchEnd,
    minScale = 0.5,
    maxScale = 3,
  } = options;

  const [state, setState] = useState<PinchState>({
    scale: 1,
    delta: 0,
    origin: { x: 0, y: 0 },
    isPinching: false,
  });

  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);

  const getDistance = (touches: React.TouchList): number => {
    const [touch1, touch2] = [touches[0], touches[1]];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getOrigin = (touches: React.TouchList): { x: number; y: number } => {
    const [touch1, touch2] = [touches[0], touches[1]];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length === 2) {
        initialDistanceRef.current = getDistance(event.touches);
        initialScaleRef.current = state.scale;

        const origin = getOrigin(event.touches);
        const newState: PinchState = {
          ...state,
          origin,
          isPinching: true,
        };

        setState(newState);
        onPinchStart?.(newState);
      }
    },
    [state, onPinchStart],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length === 2 && initialDistanceRef.current) {
        const currentDistance = getDistance(event.touches);
        const delta = currentDistance / initialDistanceRef.current;
        let newScale = initialScaleRef.current * delta;

        // Clamp scale
        newScale = Math.max(minScale, Math.min(maxScale, newScale));

        const origin = getOrigin(event.touches);
        const newState: PinchState = {
          scale: newScale,
          delta: newScale - state.scale,
          origin,
          isPinching: true,
        };

        setState(newState);
        onPinch?.(newState);
      }
    },
    [state.scale, minScale, maxScale, onPinch],
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length < 2 && initialDistanceRef.current) {
        initialDistanceRef.current = null;

        const newState: PinchState = {
          ...state,
          isPinching: false,
        };

        setState(newState);
        onPinchEnd?.(newState);
      }
    },
    [state, onPinchEnd],
  );

  const resetScale = useCallback(() => {
    setState({
      scale: 1,
      delta: 0,
      origin: { x: 0, y: 0 },
      isPinching: false,
    });
  }, []);

  return {
    state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    resetScale,
  };
}

// ============================================================================
// Touch Ripple Hook
// ============================================================================

export interface RippleState {
  x: number;
  y: number;
  size: number;
  key: number;
}

/**
 * Material Design style touch ripple effect
 */
export function useRipple() {
  const [ripples, setRipples] = useState<RippleState[]>([]);
  const keyRef = useRef(0);

  const addRipple = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();

      let x: number;
      let y: number;

      if ("touches" in event) {
        const touch = event.touches[0];
        x = touch.clientX - rect.left;
        y = touch.clientY - rect.top;
      } else {
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
      }

      // Calculate ripple size (should cover the entire element)
      const size = Math.max(rect.width, rect.height) * 2;

      const newRipple: RippleState = {
        x: x - size / 2,
        y: y - size / 2,
        size,
        key: keyRef.current++,
      };

      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.key !== newRipple.key));
      }, 600);
    },
    [],
  );

  return {
    ripples,
    handlers: {
      onMouseDown: addRipple,
      onTouchStart: addRipple,
    },
  };
}

// ============================================================================
// Pull to Refresh Hook
// ============================================================================

export interface PullToRefreshOptions {
  threshold?: number;
  maxPull?: number;
  onRefresh: () => Promise<void>;
}

export interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  progress: number;
}

/**
 * Pull to refresh gesture
 */
export function usePullToRefresh(options: PullToRefreshOptions) {
  const { threshold = 80, maxPull = 120, onRefresh } = options;

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    progress: 0,
  });

  const startYRef = useRef<number | null>(null);
  const isScrolledToTopRef = useRef(true);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const target = event.currentTarget as HTMLElement;
    isScrolledToTopRef.current = target.scrollTop === 0;

    if (isScrolledToTopRef.current) {
      startYRef.current = event.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (
        !startYRef.current ||
        !isScrolledToTopRef.current ||
        state.isRefreshing
      )
        return;

      const currentY = event.touches[0].clientY;
      const diff = currentY - startYRef.current;

      if (diff > 0) {
        // Pulling down
        const pullDistance = Math.min(diff * 0.5, maxPull); // Apply resistance
        const progress = Math.min(pullDistance / threshold, 1);

        setState((prev) => ({
          ...prev,
          isPulling: true,
          pullDistance,
          progress,
        }));

        // Prevent default scrolling
        if (diff > 10) {
          event.preventDefault();
        }
      }
    },
    [threshold, maxPull, state.isRefreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling) return;

    startYRef.current = null;

    if (state.progress >= 1) {
      // Trigger refresh
      setState((prev) => ({
        ...prev,
        isRefreshing: true,
        pullDistance: threshold,
      }));

      try {
        await onRefresh();
      } finally {
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
          progress: 0,
        });
      }
    } else {
      // Cancel
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        progress: 0,
      });
    }
  }, [state.isPulling, state.progress, threshold, onRefresh]);

  return {
    state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
