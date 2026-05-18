/**
 * useGestures Hook - Comprehensive gesture detection for touch and mouse
 *
 * Supports pinch-to-zoom, pan, swipe, double-tap, and wheel zoom.
 * Optimized for performance with hardware-accelerated transforms.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface GestureState {
  // Transform state
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;

  // Gesture detection
  isPinching: boolean;
  isPanning: boolean;
  isSwiping: boolean;

  // Velocity for momentum
  velocityX: number;
  velocityY: number;
}

export interface SwipeDirection {
  direction: "left" | "right" | "up" | "down";
  distance: number;
  velocity: number;
}

export interface GestureCallbacks {
  onZoomChange?: (scale: number, center: Point) => void;
  onPanChange?: (x: number, y: number) => void;
  onPanEnd?: (velocityX: number, velocityY: number) => void;
  onSwipe?: (direction: SwipeDirection) => void;
  onDoubleTap?: (point: Point) => void;
  onRotationChange?: (rotation: number) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}

export interface UseGesturesOptions {
  // Enable/disable features
  enablePinchZoom?: boolean;
  enableWheelZoom?: boolean;
  enablePan?: boolean;
  enableSwipe?: boolean;
  enableDoubleTap?: boolean;
  enableRotation?: boolean;
  enableMomentum?: boolean;

  // Constraints
  minScale?: number;
  maxScale?: number;
  boundaryPadding?: number;

  // Sensitivity
  zoomSensitivity?: number;
  panSensitivity?: number;
  swipeThreshold?: number;
  swipeVelocityThreshold?: number;
  doubleTapDelay?: number;

  // Momentum
  momentumDecay?: number;
  momentumMaxVelocity?: number;

  // Accessibility
  reducedMotion?: boolean;

  // Initial values
  initialScale?: number;
  initialTranslateX?: number;
  initialTranslateY?: number;
}

export interface UseGesturesReturn {
  // Ref to attach to element
  ref: React.RefObject<HTMLElement | null>;

  // Current state
  state: GestureState;

  // Control functions
  setScale: (scale: number) => void;
  setTranslate: (x: number, y: number) => void;
  reset: () => void;
  zoomIn: (amount?: number) => void;
  zoomOut: (amount?: number) => void;
  zoomToPoint: (scale: number, point: Point) => void;

  // Style helper
  getTransformStyle: () => React.CSSProperties;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: Required<UseGesturesOptions> = {
  enablePinchZoom: true,
  enableWheelZoom: true,
  enablePan: true,
  enableSwipe: true,
  enableDoubleTap: true,
  enableRotation: false,
  enableMomentum: true,
  minScale: 0.5,
  maxScale: 5,
  boundaryPadding: 50,
  zoomSensitivity: 0.002,
  panSensitivity: 1,
  swipeThreshold: 50,
  swipeVelocityThreshold: 0.3,
  doubleTapDelay: 300,
  momentumDecay: 0.95,
  momentumMaxVelocity: 20,
  reducedMotion: false,
  initialScale: 1,
  initialTranslateX: 0,
  initialTranslateY: 0,
};

// ============================================================================
// Helper Functions
// ============================================================================

function getDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCenter(touches: TouchList): Point {
  if (touches.length < 2) {
    return { x: touches[0].clientX, y: touches[0].clientY };
  }
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function getAngle(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[1].clientX - touches[0].clientX;
  const dy = touches[1].clientY - touches[0].clientY;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============================================================================
// Hook
// ============================================================================

export function useGestures(
  callbacks: GestureCallbacks = {},
  options: UseGesturesOptions = {},
): UseGesturesReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Refs
  const ref = useRef<HTMLElement | null>(null);
  const lastTouchDistance = useRef(0);
  const lastTouchCenter = useRef<Point>({ x: 0, y: 0 });
  const lastTouchAngle = useRef(0);
  const lastTapTime = useRef(0);
  const lastTapPoint = useRef<Point>({ x: 0, y: 0 });
  const touchStartTime = useRef(0);
  const touchStartPoint = useRef<Point>({ x: 0, y: 0 });
  const lastMoveTime = useRef(0);
  const lastMovePoint = useRef<Point>({ x: 0, y: 0 });
  const momentumFrame = useRef<number | null>(null);
  const isGestureActive = useRef(false);

  // State
  const [state, setState] = useState<GestureState>({
    scale: opts.initialScale,
    translateX: opts.initialTranslateX,
    translateY: opts.initialTranslateY,
    rotation: 0,
    isPinching: false,
    isPanning: false,
    isSwiping: false,
    velocityX: 0,
    velocityY: 0,
  });

  // ========================================================================
  // Control Functions
  // ========================================================================

  const setScale = useCallback(
    (scale: number) => {
      const clampedScale = clamp(scale, opts.minScale, opts.maxScale);
      setState((prev) => ({ ...prev, scale: clampedScale }));
      callbacks.onZoomChange?.(clampedScale, { x: 0, y: 0 });
    },
    [opts.minScale, opts.maxScale, callbacks],
  );

  const setTranslate = useCallback(
    (x: number, y: number) => {
      setState((prev) => ({ ...prev, translateX: x, translateY: y }));
      callbacks.onPanChange?.(x, y);
    },
    [callbacks],
  );

  const reset = useCallback(() => {
    if (momentumFrame.current) {
      cancelAnimationFrame(momentumFrame.current);
      momentumFrame.current = null;
    }
    setState({
      scale: opts.initialScale,
      translateX: opts.initialTranslateX,
      translateY: opts.initialTranslateY,
      rotation: 0,
      isPinching: false,
      isPanning: false,
      isSwiping: false,
      velocityX: 0,
      velocityY: 0,
    });
  }, [opts.initialScale, opts.initialTranslateX, opts.initialTranslateY]);

  const zoomIn = useCallback(
    (amount = 0.25) => {
      const newScale = clamp(
        state.scale + amount,
        opts.minScale,
        opts.maxScale,
      );
      setScale(newScale);
    },
    [state.scale, opts.minScale, opts.maxScale, setScale],
  );

  const zoomOut = useCallback(
    (amount = 0.25) => {
      const newScale = clamp(
        state.scale - amount,
        opts.minScale,
        opts.maxScale,
      );
      setScale(newScale);
    },
    [state.scale, opts.minScale, opts.maxScale, setScale],
  );

  const zoomToPoint = useCallback(
    (targetScale: number, point: Point) => {
      const clampedScale = clamp(targetScale, opts.minScale, opts.maxScale);
      const scaleDiff = clampedScale - state.scale;

      // Calculate new translation to zoom towards point
      const newTranslateX =
        state.translateX -
        (point.x - state.translateX) * (scaleDiff / state.scale);
      const newTranslateY =
        state.translateY -
        (point.y - state.translateY) * (scaleDiff / state.scale);

      setState((prev) => ({
        ...prev,
        scale: clampedScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      }));

      callbacks.onZoomChange?.(clampedScale, point);
      callbacks.onPanChange?.(newTranslateX, newTranslateY);
    },
    [
      state.scale,
      state.translateX,
      state.translateY,
      opts.minScale,
      opts.maxScale,
      callbacks,
    ],
  );

  // ========================================================================
  // Momentum Animation
  // ========================================================================

  const applyMomentum = useCallback(
    (velocityX: number, velocityY: number) => {
      if (!opts.enableMomentum || opts.reducedMotion) return;

      const animate = () => {
        setState((prev) => {
          const newVelocityX = prev.velocityX * opts.momentumDecay;
          const newVelocityY = prev.velocityY * opts.momentumDecay;

          // Stop when velocity is negligible
          if (Math.abs(newVelocityX) < 0.1 && Math.abs(newVelocityY) < 0.1) {
            momentumFrame.current = null;
            return { ...prev, velocityX: 0, velocityY: 0 };
          }

          const newTranslateX = prev.translateX + newVelocityX;
          const newTranslateY = prev.translateY + newVelocityY;

          callbacks.onPanChange?.(newTranslateX, newTranslateY);

          momentumFrame.current = requestAnimationFrame(animate);

          return {
            ...prev,
            translateX: newTranslateX,
            translateY: newTranslateY,
            velocityX: newVelocityX,
            velocityY: newVelocityY,
          };
        });
      };

      setState((prev) => ({
        ...prev,
        velocityX: clamp(
          velocityX,
          -opts.momentumMaxVelocity,
          opts.momentumMaxVelocity,
        ),
        velocityY: clamp(
          velocityY,
          -opts.momentumMaxVelocity,
          opts.momentumMaxVelocity,
        ),
      }));

      momentumFrame.current = requestAnimationFrame(animate);
    },
    [
      opts.enableMomentum,
      opts.reducedMotion,
      opts.momentumDecay,
      opts.momentumMaxVelocity,
      callbacks,
    ],
  );

  // ========================================================================
  // Touch Event Handlers
  // ========================================================================

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      // Stop momentum on new touch
      if (momentumFrame.current) {
        cancelAnimationFrame(momentumFrame.current);
        momentumFrame.current = null;
      }

      const touches = e.touches;
      touchStartTime.current = Date.now();
      touchStartPoint.current = {
        x: touches[0].clientX,
        y: touches[0].clientY,
      };
      lastMoveTime.current = Date.now();
      lastMovePoint.current = { x: touches[0].clientX, y: touches[0].clientY };

      if (touches.length === 2 && opts.enablePinchZoom) {
        // Pinch start
        lastTouchDistance.current = getDistance(touches);
        lastTouchCenter.current = getCenter(touches);
        lastTouchAngle.current = getAngle(touches);
        setState((prev) => ({ ...prev, isPinching: true }));
        isGestureActive.current = true;
        callbacks.onGestureStart?.();
      } else if (touches.length === 1) {
        // Check for double tap
        const now = Date.now();
        const timeSinceLastTap = now - lastTapTime.current;
        const distFromLastTap = Math.sqrt(
          Math.pow(touches[0].clientX - lastTapPoint.current.x, 2) +
            Math.pow(touches[0].clientY - lastTapPoint.current.y, 2),
        );

        if (
          opts.enableDoubleTap &&
          timeSinceLastTap < opts.doubleTapDelay &&
          distFromLastTap < 50
        ) {
          // Double tap detected
          callbacks.onDoubleTap?.({
            x: touches[0].clientX,
            y: touches[0].clientY,
          });
          lastTapTime.current = 0;
        } else {
          lastTapTime.current = now;
          lastTapPoint.current = {
            x: touches[0].clientX,
            y: touches[0].clientY,
          };
        }

        // Pan start (only when zoomed)
        if (opts.enablePan && state.scale > 1) {
          setState((prev) => ({ ...prev, isPanning: true }));
          isGestureActive.current = true;
          callbacks.onGestureStart?.();
        }
      }
    },
    [opts, state.scale, callbacks],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const touches = e.touches;

      if (touches.length === 2 && state.isPinching && opts.enablePinchZoom) {
        e.preventDefault();

        // Calculate pinch zoom
        const newDistance = getDistance(touches);
        const newCenter = getCenter(touches);
        const scaleDelta = newDistance / lastTouchDistance.current;
        const newScale = clamp(
          state.scale * scaleDelta,
          opts.minScale,
          opts.maxScale,
        );

        // Calculate rotation if enabled
        let newRotation = state.rotation;
        if (opts.enableRotation) {
          const newAngle = getAngle(touches);
          newRotation = state.rotation + (newAngle - lastTouchAngle.current);
          lastTouchAngle.current = newAngle;
        }

        // Calculate pan during pinch
        const panDeltaX =
          (newCenter.x - lastTouchCenter.current.x) * opts.panSensitivity;
        const panDeltaY =
          (newCenter.y - lastTouchCenter.current.y) * opts.panSensitivity;

        lastTouchDistance.current = newDistance;
        lastTouchCenter.current = newCenter;

        setState((prev) => ({
          ...prev,
          scale: newScale,
          translateX: prev.translateX + panDeltaX,
          translateY: prev.translateY + panDeltaY,
          rotation: newRotation,
        }));

        callbacks.onZoomChange?.(newScale, newCenter);
        callbacks.onPanChange?.(
          state.translateX + panDeltaX,
          state.translateY + panDeltaY,
        );
        if (opts.enableRotation) {
          callbacks.onRotationChange?.(newRotation);
        }
      } else if (touches.length === 1) {
        const now = Date.now();
        const timeDelta = now - lastMoveTime.current;
        const deltaX =
          (touches[0].clientX - lastMovePoint.current.x) * opts.panSensitivity;
        const deltaY =
          (touches[0].clientY - lastMovePoint.current.y) * opts.panSensitivity;

        // Calculate velocity
        const velocityX = timeDelta > 0 ? (deltaX / timeDelta) * 16 : 0;
        const velocityY = timeDelta > 0 ? (deltaY / timeDelta) * 16 : 0;

        lastMoveTime.current = now;
        lastMovePoint.current = {
          x: touches[0].clientX,
          y: touches[0].clientY,
        };

        if (state.isPanning && opts.enablePan) {
          e.preventDefault();

          setState((prev) => ({
            ...prev,
            translateX: prev.translateX + deltaX,
            translateY: prev.translateY + deltaY,
            velocityX,
            velocityY,
          }));

          callbacks.onPanChange?.(
            state.translateX + deltaX,
            state.translateY + deltaY,
          );
        }
      }
    },
    [opts, state, callbacks],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const now = Date.now();
      const touchDuration = now - touchStartTime.current;

      // Check for swipe
      if (
        opts.enableSwipe &&
        e.changedTouches.length === 1 &&
        !state.isPinching
      ) {
        const deltaX = e.changedTouches[0].clientX - touchStartPoint.current.x;
        const deltaY = e.changedTouches[0].clientY - touchStartPoint.current.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const velocity = distance / touchDuration;

        if (
          distance > opts.swipeThreshold &&
          velocity > opts.swipeVelocityThreshold
        ) {
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);

          let direction: "left" | "right" | "up" | "down";
          if (absX > absY) {
            direction = deltaX > 0 ? "right" : "left";
          } else {
            direction = deltaY > 0 ? "down" : "up";
          }

          callbacks.onSwipe?.({ direction, distance, velocity });
        }
      }

      // Apply momentum if panning
      if (state.isPanning && opts.enableMomentum) {
        applyMomentum(state.velocityX, state.velocityY);
        callbacks.onPanEnd?.(state.velocityX, state.velocityY);
      }

      // Reset gesture state
      if (isGestureActive.current) {
        callbacks.onGestureEnd?.();
        isGestureActive.current = false;
      }

      setState((prev) => ({
        ...prev,
        isPinching: false,
        isPanning: false,
        isSwiping: false,
      }));
    },
    [opts, state, callbacks, applyMomentum],
  );

  // ========================================================================
  // Mouse Event Handlers
  // ========================================================================

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!opts.enableWheelZoom) return;
      e.preventDefault();

      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = e.clientX - rect.left - rect.width / 2;
      const centerY = e.clientY - rect.top - rect.height / 2;

      const delta = -e.deltaY * opts.zoomSensitivity;
      const newScale = clamp(
        state.scale * (1 + delta),
        opts.minScale,
        opts.maxScale,
      );

      // Zoom towards cursor position
      const scaleFactor = newScale / state.scale;
      const newTranslateX =
        centerX - (centerX - state.translateX) * scaleFactor;
      const newTranslateY =
        centerY - (centerY - state.translateY) * scaleFactor;

      setState((prev) => ({
        ...prev,
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      }));

      callbacks.onZoomChange?.(newScale, { x: e.clientX, y: e.clientY });
      callbacks.onPanChange?.(newTranslateX, newTranslateY);
    },
    [opts, state, callbacks],
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!opts.enablePan || state.scale <= 1) return;
      if (e.button !== 0) return; // Only left click

      // Stop momentum on new click
      if (momentumFrame.current) {
        cancelAnimationFrame(momentumFrame.current);
        momentumFrame.current = null;
      }

      touchStartPoint.current = { x: e.clientX, y: e.clientY };
      lastMoveTime.current = Date.now();
      lastMovePoint.current = { x: e.clientX, y: e.clientY };

      setState((prev) => ({ ...prev, isPanning: true }));
      isGestureActive.current = true;
      callbacks.onGestureStart?.();
    },
    [opts.enablePan, state.scale, callbacks],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!state.isPanning) return;

      const now = Date.now();
      const timeDelta = now - lastMoveTime.current;
      const deltaX =
        (e.clientX - lastMovePoint.current.x) * opts.panSensitivity;
      const deltaY =
        (e.clientY - lastMovePoint.current.y) * opts.panSensitivity;

      // Calculate velocity
      const velocityX = timeDelta > 0 ? (deltaX / timeDelta) * 16 : 0;
      const velocityY = timeDelta > 0 ? (deltaY / timeDelta) * 16 : 0;

      lastMoveTime.current = now;
      lastMovePoint.current = { x: e.clientX, y: e.clientY };

      setState((prev) => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY,
        velocityX,
        velocityY,
      }));

      callbacks.onPanChange?.(
        state.translateX + deltaX,
        state.translateY + deltaY,
      );
    },
    [
      opts.panSensitivity,
      state.isPanning,
      state.translateX,
      state.translateY,
      callbacks,
    ],
  );

  const handleMouseUp = useCallback(() => {
    if (!state.isPanning) return;

    // Apply momentum
    if (opts.enableMomentum) {
      applyMomentum(state.velocityX, state.velocityY);
      callbacks.onPanEnd?.(state.velocityX, state.velocityY);
    }

    if (isGestureActive.current) {
      callbacks.onGestureEnd?.();
      isGestureActive.current = false;
    }

    setState((prev) => ({ ...prev, isPanning: false }));
  }, [
    opts.enableMomentum,
    state.isPanning,
    state.velocityX,
    state.velocityY,
    callbacks,
    applyMomentum,
  ]);

  const handleDoubleClick = useCallback(
    (e: MouseEvent) => {
      if (!opts.enableDoubleTap) return;

      callbacks.onDoubleTap?.({ x: e.clientX, y: e.clientY });
    },
    [opts.enableDoubleTap, callbacks],
  );

  // ========================================================================
  // Event Binding
  // ========================================================================

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Touch events
    element.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd);
    element.addEventListener("touchcancel", handleTouchEnd);

    // Mouse events
    element.addEventListener("wheel", handleWheel, { passive: false });
    element.addEventListener("mousedown", handleMouseDown);
    element.addEventListener("dblclick", handleDoubleClick);

    // Global mouse events for drag
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);
      element.removeEventListener("wheel", handleWheel);
      element.removeEventListener("mousedown", handleMouseDown);
      element.removeEventListener("dblclick", handleDoubleClick);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (momentumFrame.current) {
        cancelAnimationFrame(momentumFrame.current);
      }
    };
  }, [
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
  ]);

  // ========================================================================
  // Style Helper
  // ========================================================================

  const getTransformStyle = useCallback((): React.CSSProperties => {
    const transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale}) rotate(${state.rotation}deg)`;

    return {
      transform,
      transformOrigin: "center center",
      transition:
        state.isPanning || state.isPinching
          ? "none"
          : "transform 0.2s ease-out",
      cursor:
        state.scale > 1 ? (state.isPanning ? "grabbing" : "grab") : "default",
      touchAction: "none",
      userSelect: "none",
      WebkitUserSelect: "none",
      willChange: "transform",
    };
  }, [state]);

  return {
    ref,
    state,
    setScale,
    setTranslate,
    reset,
    zoomIn,
    zoomOut,
    zoomToPoint,
    getTransformStyle,
  };
}

export default useGestures;
