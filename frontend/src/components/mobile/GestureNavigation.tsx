"use client";

import {
  useRef,
  useCallback,
  useState,
  useEffect,
  ReactNode,
  memo,
} from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface GestureNavigationProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  velocityThreshold?: number;
  disabled?: boolean;
  className?: string;
  showIndicators?: boolean;
  hapticFeedback?: boolean;
}

export interface SwipeIndicatorProps {
  direction: "left" | "right";
  visible: boolean;
  progress: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_THRESHOLD = 100;
const DEFAULT_VELOCITY_THRESHOLD = 500;
const INDICATOR_OPACITY_THRESHOLD = 0.3;

// ============================================================================
// Component
// ============================================================================

/**
 * Gesture Navigation Component
 *
 * Enables swipe-based navigation between views/screens.
 * Common pattern in mobile apps for back/forward navigation.
 *
 * Features:
 * - Swipe to go back/forward
 * - Visual feedback indicators
 * - Configurable thresholds
 * - Haptic feedback
 * - Velocity-based detection
 * - Edge swipe support
 *
 * @example
 * ```tsx
 * <GestureNavigation
 *   onSwipeRight={() => router.back()}
 *   onSwipeLeft={() => router.forward()}
 *   showIndicators
 * >
 *   <PageContent />
 * </GestureNavigation>
 * ```
 */
export const GestureNavigation = memo(function GestureNavigation({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = DEFAULT_THRESHOLD,
  velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
  disabled = false,
  className,
  showIndicators = true,
  hapticFeedback = true,
}: GestureNavigationProps) {
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null,
  );
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredHaptic = useRef(false);

  // Trigger haptic feedback
  const triggerHaptic = useCallback(() => {
    if (!hapticFeedback || hasTriggeredHaptic.current) return;

    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }

    hasTriggeredHaptic.current = true;
  }, [hapticFeedback]);

  // Handle drag
  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled) return;

      const { offset, velocity } = info;
      const absX = Math.abs(offset.x);
      const absY = Math.abs(offset.y);

      // Determine primary direction
      if (absX > absY) {
        // Horizontal swipe
        const direction = offset.x > 0 ? "right" : "left";
        const handler = direction === "right" ? onSwipeRight : onSwipeLeft;

        if (handler) {
          setSwipeDirection(direction);
          const progress = Math.min(absX / threshold, 1);
          setSwipeProgress(progress);

          // Trigger haptic at threshold
          if (progress >= 1) {
            triggerHaptic();
          }
        }
      }
      // Vertical swipes handled but not shown in indicators
    },
    [disabled, threshold, onSwipeLeft, onSwipeRight, triggerHaptic],
  );

  // Handle drag start
  const handleDragStart = useCallback(() => {
    if (disabled) return;
    setIsDragging(true);
    hasTriggeredHaptic.current = false;
  }, [disabled]);

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled) {
        setIsDragging(false);
        return;
      }

      const { offset, velocity } = info;
      const absX = Math.abs(offset.x);
      const absY = Math.abs(offset.y);

      // Determine if swipe was successful
      const meetsThreshold = absX > threshold || absY > threshold;
      const meetsVelocity =
        Math.abs(velocity.x) > velocityThreshold ||
        Math.abs(velocity.y) > velocityThreshold;

      if (meetsThreshold || meetsVelocity) {
        // Horizontal swipes
        if (absX > absY) {
          if (offset.x > 0 && onSwipeRight) {
            onSwipeRight();
            triggerHaptic();
          } else if (offset.x < 0 && onSwipeLeft) {
            onSwipeLeft();
            triggerHaptic();
          }
        }
        // Vertical swipes
        else {
          if (offset.y > 0 && onSwipeDown) {
            onSwipeDown();
            triggerHaptic();
          } else if (offset.y < 0 && onSwipeUp) {
            onSwipeUp();
            triggerHaptic();
          }
        }
      }

      // Reset
      await controls.start({
        x: 0,
        y: 0,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 30,
        },
      });

      setIsDragging(false);
      setSwipeDirection(null);
      setSwipeProgress(0);
      hasTriggeredHaptic.current = false;
    },
    [
      disabled,
      threshold,
      velocityThreshold,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      controls,
      triggerHaptic,
    ],
  );

  return (
    <div ref={containerRef} className={cn("relative h-full w-full", className)}>
      {/* Swipe indicators */}
      {showIndicators && !disabled && (
        <>
          {onSwipeRight && (
            <SwipeIndicator
              direction="right"
              visible={isDragging && swipeDirection === "right"}
              progress={swipeProgress}
            />
          )}
          {onSwipeLeft && (
            <SwipeIndicator
              direction="left"
              visible={isDragging && swipeDirection === "left"}
              progress={swipeProgress}
            />
          )}
        </>
      )}

      {/* Draggable content */}
      <motion.div
        drag={!disabled}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </div>
  );
});

// ============================================================================
// Swipe Indicator Component
// ============================================================================

const SwipeIndicator = memo(function SwipeIndicator({
  direction,
  visible,
  progress,
}: SwipeIndicatorProps) {
  const opacity = Math.min(progress, 1);
  const scale = 0.8 + progress * 0.2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: visible ? opacity : 0,
        scale: visible ? scale : 0.8,
      }}
      className={cn(
        "absolute top-1/2 z-10 -translate-y-1/2",
        "pointer-events-none",
        direction === "right" ? "left-4" : "right-4",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center",
          "bg-primary/20 rounded-full backdrop-blur-sm",
          progress >= 1 && "bg-primary/30",
        )}
      >
        {direction === "right" ? (
          <ChevronLeft className="h-6 w-6 text-primary" />
        ) : (
          <ChevronRight className="h-6 w-6 text-primary" />
        )}
      </div>
    </motion.div>
  );
});

// ============================================================================
// Edge Swipe Component
// ============================================================================

export interface EdgeSwipeProps {
  children: ReactNode;
  onSwipeFromLeft?: () => void;
  onSwipeFromRight?: () => void;
  edgeWidth?: number;
  threshold?: number;
  className?: string;
}

/**
 * Edge Swipe Component
 *
 * Detects swipes starting from screen edges.
 * Common for opening sidebars/drawers.
 *
 * @example
 * ```tsx
 * <EdgeSwipe
 *   onSwipeFromLeft={() => setSidebarOpen(true)}
 *   edgeWidth={20}
 * >
 *   <Content />
 * </EdgeSwipe>
 * ```
 */
export const EdgeSwipe = memo(function EdgeSwipe({
  children,
  onSwipeFromLeft,
  onSwipeFromRight,
  edgeWidth = 20,
  threshold = 100,
  className,
}: EdgeSwipeProps) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isEdgeSwipe, setIsEdgeSwipe] = useState(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const x = touch.clientX;

      // Check if touch started near edge
      const isLeftEdge = x < edgeWidth && onSwipeFromLeft;
      const isRightEdge = x > window.innerWidth - edgeWidth && onSwipeFromRight;

      if (isLeftEdge || isRightEdge) {
        setTouchStartX(x);
        setIsEdgeSwipe(true);
      }
    },
    [edgeWidth, onSwipeFromLeft, onSwipeFromRight],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isEdgeSwipe || touchStartX === null) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;

      // Prevent default to avoid back navigation
      if (Math.abs(deltaX) > 10) {
        e.preventDefault();
      }
    },
    [isEdgeSwipe, touchStartX],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isEdgeSwipe || touchStartX === null) {
        setTouchStartX(null);
        setIsEdgeSwipe(false);
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;

      // Left edge swipe (swipe right)
      if (touchStartX < edgeWidth && deltaX > threshold && onSwipeFromLeft) {
        onSwipeFromLeft();

        // Haptic feedback
        if ("vibrate" in navigator) {
          navigator.vibrate(10);
        }
      }
      // Right edge swipe (swipe left)
      else if (
        touchStartX > window.innerWidth - edgeWidth &&
        deltaX < -threshold &&
        onSwipeFromRight
      ) {
        onSwipeFromRight();

        // Haptic feedback
        if ("vibrate" in navigator) {
          navigator.vibrate(10);
        }
      }

      setTouchStartX(null);
      setIsEdgeSwipe(false);
    },
    [
      isEdgeSwipe,
      touchStartX,
      edgeWidth,
      threshold,
      onSwipeFromLeft,
      onSwipeFromRight,
    ],
  );

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn("h-full w-full", className)}
    >
      {children}
    </div>
  );
});

export default GestureNavigation;
