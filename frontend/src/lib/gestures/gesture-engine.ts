/**
 * Gesture Recognition Engine
 *
 * Low-level gesture detection system that processes raw touch/pointer events
 * and recognizes gestures: swipe, long-press, pinch, double-tap, pan, rotate.
 *
 * Designed for composability -- consumers attach listeners for specific gesture
 * types and receive fully-resolved gesture payloads with velocity, direction,
 * and distance information.
 */

// ============================================================================
// Types
// ============================================================================

export type GestureType =
  | "swipe-left"
  | "swipe-right"
  | "swipe-up"
  | "swipe-down"
  | "long-press"
  | "pinch"
  | "double-tap"
  | "pan"
  | "rotate";

export interface Point {
  x: number;
  y: number;
}

export interface TouchRecord {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  lastTime: number;
  lastX: number;
  lastY: number;
}

export interface GestureEvent {
  type: GestureType;
  /** Centre-point of the gesture in viewport coordinates */
  center: Point;
  /** Elapsed time since gesture start in ms */
  duration: number;
  /** Timestamp when the gesture fired */
  timestamp: number;
}

export interface SwipeEvent extends GestureEvent {
  type: "swipe-left" | "swipe-right" | "swipe-up" | "swipe-down";
  /** Total pixel distance travelled */
  distance: number;
  /** Pixels / millisecond */
  velocity: number;
  /** Delta from the touch-start point */
  deltaX: number;
  deltaY: number;
}

export interface LongPressEvent extends GestureEvent {
  type: "long-press";
  /** Position where the long-press was detected */
  position: Point;
}

export interface PinchEvent extends GestureEvent {
  type: "pinch";
  /** Current cumulative scale (1.0 = no change) */
  scale: number;
  /** Scale change since last event */
  deltaScale: number;
  /** Distance between the two touch points */
  distance: number;
}

export interface DoubleTapEvent extends GestureEvent {
  type: "double-tap";
  /** Position of the second tap */
  position: Point;
}

export interface PanEvent extends GestureEvent {
  type: "pan";
  deltaX: number;
  deltaY: number;
  velocityX: number;
  velocityY: number;
  /** Cumulative translation from start */
  totalDeltaX: number;
  totalDeltaY: number;
}

export interface RotateEvent extends GestureEvent {
  type: "rotate";
  /** Rotation in degrees since last event */
  deltaRotation: number;
  /** Cumulative rotation in degrees */
  totalRotation: number;
}

export type AnyGestureEvent =
  | SwipeEvent
  | LongPressEvent
  | PinchEvent
  | DoubleTapEvent
  | PanEvent
  | RotateEvent;

export type GestureListener<T extends AnyGestureEvent = AnyGestureEvent> = (
  event: T,
) => void;

export interface GestureThresholds {
  /** Minimum distance (px) for a swipe to register */
  swipeDistance: number;
  /** Minimum velocity (px/ms) for a swipe */
  swipeVelocity: number;
  /** Time (ms) before a long-press fires */
  longPressDelay: number;
  /** Max movement (px) allowed during a long-press */
  longPressTolerance: number;
  /** Max interval (ms) between taps for double-tap */
  doubleTapInterval: number;
  /** Max distance (px) between taps for double-tap */
  doubleTapDistance: number;
  /** Minimum scale change to fire pinch event */
  pinchThreshold: number;
  /** Minimum rotation (deg) change to fire rotate event */
  rotateThreshold: number;
  /** Minimum movement (px) before pan starts */
  panThreshold: number;
}

export interface GestureRecognizerOptions {
  /** Which gesture types to listen for */
  enabled?: GestureType[];
  /** Custom thresholds */
  thresholds?: Partial<GestureThresholds>;
  /** Prevent default on touch events when gesture detected */
  preventDefault?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_THRESHOLDS: GestureThresholds = {
  swipeDistance: 50,
  swipeVelocity: 0.3,
  longPressDelay: 500,
  longPressTolerance: 10,
  doubleTapInterval: 300,
  doubleTapDistance: 40,
  pinchThreshold: 0.01,
  rotateThreshold: 2,
  panThreshold: 10,
};

const ALL_GESTURE_TYPES: GestureType[] = [
  "swipe-left",
  "swipe-right",
  "swipe-up",
  "swipe-down",
  "long-press",
  "pinch",
  "double-tap",
  "pan",
  "rotate",
];

// ============================================================================
// Utility helpers
// ============================================================================

export function distanceBetween(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Throttle a function to fire at most once every `wait` ms.
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - lastTime);
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };
}

/**
 * Debounce a function so it fires `wait` ms after the last call.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
}

// ============================================================================
// GestureRecognizer
// ============================================================================

export class GestureRecognizer {
  private thresholds: GestureThresholds;
  private enabledTypes: Set<GestureType>;
  private preventDefault: boolean;

  // Listener maps keyed by gesture type
  private listeners: Map<GestureType, Set<GestureListener<any>>> = new Map();

  // Touch tracking
  private activeTouches: Map<number, TouchRecord> = new Map();

  // Long-press
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressFired = false;

  // Double-tap
  private lastTapTime = 0;
  private lastTapPoint: Point = { x: 0, y: 0 };

  // Pinch / rotate state
  private initialPinchDistance = 0;
  private initialPinchAngle = 0;
  private cumulativeScale = 1;
  private cumulativeRotation = 0;

  // Pan tracking
  private panStarted = false;
  private panStartPoint: Point = { x: 0, y: 0 };

  // Bound event handlers (so they can be removed)
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundTouchCancel: (e: TouchEvent) => void;

  // The element we are attached to
  private element: HTMLElement | null = null;

  constructor(options: GestureRecognizerOptions = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
    this.enabledTypes = new Set(options.enabled ?? ALL_GESTURE_TYPES);
    this.preventDefault = options.preventDefault ?? false;

    // Bind handlers
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);
    this.boundTouchCancel = this.handleTouchCancel.bind(this);
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /** Attach to an element and start listening */
  attach(element: HTMLElement): void {
    this.detach();
    this.element = element;
    element.addEventListener("touchstart", this.boundTouchStart, {
      passive: !this.preventDefault,
    });
    element.addEventListener("touchmove", this.boundTouchMove, {
      passive: !this.preventDefault,
    });
    element.addEventListener("touchend", this.boundTouchEnd);
    element.addEventListener("touchcancel", this.boundTouchCancel);
  }

  /** Detach from the current element */
  detach(): void {
    if (this.element) {
      this.element.removeEventListener("touchstart", this.boundTouchStart);
      this.element.removeEventListener("touchmove", this.boundTouchMove);
      this.element.removeEventListener("touchend", this.boundTouchEnd);
      this.element.removeEventListener("touchcancel", this.boundTouchCancel);
      this.element = null;
    }
    this.reset();
  }

  /** Register a listener for a gesture type */
  on<T extends AnyGestureEvent>(
    type: GestureType,
    listener: GestureListener<T>,
  ): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  /** Remove a listener */
  off<T extends AnyGestureEvent>(
    type: GestureType,
    listener: GestureListener<T>,
  ): void {
    this.listeners.get(type)?.delete(listener);
  }

  /** Remove all listeners */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /** Update thresholds at runtime */
  setThresholds(thresholds: Partial<GestureThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /** Get current thresholds */
  getThresholds(): Readonly<GestureThresholds> {
    return { ...this.thresholds };
  }

  /** Check whether a gesture type is enabled */
  isEnabled(type: GestureType): boolean {
    return this.enabledTypes.has(type);
  }

  /** Enable or disable a gesture type at runtime */
  setEnabled(type: GestureType, enabled: boolean): void {
    if (enabled) {
      this.enabledTypes.add(type);
    } else {
      this.enabledTypes.delete(type);
    }
  }

  /** Reset internal state */
  reset(): void {
    this.activeTouches.clear();
    this.clearLongPressTimer();
    this.longPressFired = false;
    this.panStarted = false;
    this.cumulativeScale = 1;
    this.cumulativeRotation = 0;
    this.initialPinchDistance = 0;
    this.initialPinchAngle = 0;
  }

  /** Get current active touch count */
  getActiveTouchCount(): number {
    return this.activeTouches.size;
  }

  // --------------------------------------------------------------------------
  // Private event handlers
  // --------------------------------------------------------------------------

  private emit(event: AnyGestureEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((fn) => fn(event));
    }
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    const now = Date.now();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const record: TouchRecord = {
        id: t.identifier,
        startX: t.clientX,
        startY: t.clientY,
        currentX: t.clientX,
        currentY: t.clientY,
        startTime: now,
        lastTime: now,
        lastX: t.clientX,
        lastY: t.clientY,
      };
      this.activeTouches.set(t.identifier, record);
    }

    // Single touch gestures
    if (this.activeTouches.size === 1) {
      const touch = Array.from(this.activeTouches.values())[0];

      // Long-press detection
      if (this.isSwipeOrLongPressEnabled("long-press")) {
        this.longPressFired = false;
        this.clearLongPressTimer();
        this.longPressTimer = setTimeout(() => {
          if (this.activeTouches.size === 1) {
            const current = this.activeTouches.get(touch.id);
            if (current) {
              const moved = distanceBetween(
                { x: current.startX, y: current.startY },
                { x: current.currentX, y: current.currentY },
              );
              if (moved <= this.thresholds.longPressTolerance) {
                this.longPressFired = true;
                const evt: LongPressEvent = {
                  type: "long-press",
                  center: { x: current.currentX, y: current.currentY },
                  position: { x: current.currentX, y: current.currentY },
                  duration: this.thresholds.longPressDelay,
                  timestamp: Date.now(),
                };
                this.emit(evt);
              }
            }
          }
        }, this.thresholds.longPressDelay);
      }

      // Double-tap detection (on touch-start to measure timing)
      // We will check on touch-end for completeness
    }

    // Multi-touch (pinch / rotate)
    if (this.activeTouches.size === 2) {
      this.clearLongPressTimer();
      const touches = Array.from(this.activeTouches.values());
      const a: Point = { x: touches[0].currentX, y: touches[0].currentY };
      const b: Point = { x: touches[1].currentX, y: touches[1].currentY };
      this.initialPinchDistance = distanceBetween(a, b);
      this.initialPinchAngle = angleBetween(a, b);
      this.cumulativeScale = 1;
      this.cumulativeRotation = 0;
    }

    if (this.preventDefault) {
      e.preventDefault();
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    const now = Date.now();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const record = this.activeTouches.get(t.identifier);
      if (record) {
        record.lastX = record.currentX;
        record.lastY = record.currentY;
        record.lastTime = now;
        record.currentX = t.clientX;
        record.currentY = t.clientY;
      }
    }

    // Cancel long-press if moved beyond tolerance
    if (this.activeTouches.size === 1 && this.longPressTimer !== null) {
      const touch = Array.from(this.activeTouches.values())[0];
      const moved = distanceBetween(
        { x: touch.startX, y: touch.startY },
        { x: touch.currentX, y: touch.currentY },
      );
      if (moved > this.thresholds.longPressTolerance) {
        this.clearLongPressTimer();
      }
    }

    // Pan detection (single-touch, after pan threshold)
    if (this.activeTouches.size === 1 && this.enabledTypes.has("pan")) {
      const touch = Array.from(this.activeTouches.values())[0];
      const totalDeltaX = touch.currentX - touch.startX;
      const totalDeltaY = touch.currentY - touch.startY;
      const totalDist = Math.sqrt(
        totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY,
      );

      if (!this.panStarted && totalDist >= this.thresholds.panThreshold) {
        this.panStarted = true;
        this.panStartPoint = { x: touch.startX, y: touch.startY };
        this.clearLongPressTimer();
      }

      if (this.panStarted) {
        const dt = now - touch.lastTime || 1;
        const deltaX = touch.currentX - touch.lastX;
        const deltaY = touch.currentY - touch.lastY;
        const velocityX = deltaX / dt;
        const velocityY = deltaY / dt;

        const evt: PanEvent = {
          type: "pan",
          center: { x: touch.currentX, y: touch.currentY },
          duration: now - touch.startTime,
          timestamp: now,
          deltaX,
          deltaY,
          velocityX,
          velocityY,
          totalDeltaX,
          totalDeltaY,
        };
        this.emit(evt);

        if (this.preventDefault) {
          e.preventDefault();
        }
      }
    }

    // Pinch + rotate (two-touch)
    if (this.activeTouches.size === 2) {
      const touches = Array.from(this.activeTouches.values());
      const a: Point = { x: touches[0].currentX, y: touches[0].currentY };
      const b: Point = { x: touches[1].currentX, y: touches[1].currentY };
      const currentDist = distanceBetween(a, b);
      const currentAngle = angleBetween(a, b);
      const center = midpoint(a, b);

      // Pinch
      if (this.enabledTypes.has("pinch") && this.initialPinchDistance > 0) {
        const newScale = currentDist / this.initialPinchDistance;
        const deltaScale = newScale - this.cumulativeScale;

        if (Math.abs(deltaScale) >= this.thresholds.pinchThreshold) {
          this.cumulativeScale = newScale;

          const evt: PinchEvent = {
            type: "pinch",
            center,
            duration: now - touches[0].startTime,
            timestamp: now,
            scale: this.cumulativeScale,
            deltaScale,
            distance: currentDist,
          };
          this.emit(evt);
        }
      }

      // Rotate
      if (this.enabledTypes.has("rotate")) {
        let deltaAngle =
          currentAngle - this.initialPinchAngle - this.cumulativeRotation;
        // Normalise to -180..180
        while (deltaAngle > 180) deltaAngle -= 360;
        while (deltaAngle < -180) deltaAngle += 360;

        if (Math.abs(deltaAngle) >= this.thresholds.rotateThreshold) {
          this.cumulativeRotation += deltaAngle;

          const evt: RotateEvent = {
            type: "rotate",
            center,
            duration: now - touches[0].startTime,
            timestamp: now,
            deltaRotation: deltaAngle,
            totalRotation: this.cumulativeRotation,
          };
          this.emit(evt);
        }
      }

      if (this.preventDefault) {
        e.preventDefault();
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    const now = Date.now();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const record = this.activeTouches.get(t.identifier);

      if (record) {
        // Update final position
        record.currentX = t.clientX;
        record.currentY = t.clientY;
        record.lastTime = now;

        // Single-touch end: swipe / double-tap detection
        if (this.activeTouches.size === 1) {
          this.clearLongPressTimer();

          if (!this.longPressFired) {
            const duration = now - record.startTime;
            const deltaX = record.currentX - record.startX;
            const deltaY = record.currentY - record.startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const velocity = duration > 0 ? distance / duration : 0;

            // Swipe detection
            if (
              distance >= this.thresholds.swipeDistance &&
              velocity >= this.thresholds.swipeVelocity
            ) {
              const absX = Math.abs(deltaX);
              const absY = Math.abs(deltaY);
              let swipeType: GestureType;

              if (absX >= absY) {
                swipeType = deltaX > 0 ? "swipe-right" : "swipe-left";
              } else {
                swipeType = deltaY > 0 ? "swipe-down" : "swipe-up";
              }

              if (this.enabledTypes.has(swipeType)) {
                const evt: SwipeEvent = {
                  type: swipeType as SwipeEvent["type"],
                  center: { x: record.currentX, y: record.currentY },
                  duration,
                  timestamp: now,
                  distance,
                  velocity,
                  deltaX,
                  deltaY,
                };
                this.emit(evt);
              }
            }

            // Double-tap detection (only if no significant movement)
            if (
              this.enabledTypes.has("double-tap") &&
              distance < this.thresholds.doubleTapDistance
            ) {
              const timeSinceLastTap = now - this.lastTapTime;
              const distFromLastTap = distanceBetween(this.lastTapPoint, {
                x: record.currentX,
                y: record.currentY,
              });

              if (
                timeSinceLastTap <= this.thresholds.doubleTapInterval &&
                distFromLastTap <= this.thresholds.doubleTapDistance
              ) {
                const evt: DoubleTapEvent = {
                  type: "double-tap",
                  center: { x: record.currentX, y: record.currentY },
                  position: { x: record.currentX, y: record.currentY },
                  duration: timeSinceLastTap,
                  timestamp: now,
                };
                this.emit(evt);
                this.lastTapTime = 0;
              } else {
                this.lastTapTime = now;
                this.lastTapPoint = { x: record.currentX, y: record.currentY };
              }
            }
          }

          this.panStarted = false;
        }

        this.activeTouches.delete(t.identifier);
      }
    }

    // Reset multi-touch state when all fingers lifted
    if (this.activeTouches.size === 0) {
      this.longPressFired = false;
      this.panStarted = false;
      this.initialPinchDistance = 0;
      this.cumulativeScale = 1;
      this.cumulativeRotation = 0;
    }
  }

  private handleTouchCancel(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      this.activeTouches.delete(e.changedTouches[i].identifier);
    }
    this.clearLongPressTimer();
    this.longPressFired = false;
    this.panStarted = false;

    if (this.activeTouches.size === 0) {
      this.initialPinchDistance = 0;
      this.cumulativeScale = 1;
      this.cumulativeRotation = 0;
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private isSwipeOrLongPressEnabled(type: GestureType): boolean {
    return this.enabledTypes.has(type);
  }
}
