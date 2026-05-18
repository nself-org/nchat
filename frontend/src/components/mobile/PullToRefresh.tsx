"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
  memo,
} from "react";
import { motion, useAnimation } from "framer-motion";
import { RefreshCw, ArrowDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
  hapticFeedback?: boolean;
  className?: string;
}

export type RefreshState =
  | "idle"
  | "pulling"
  | "ready"
  | "refreshing"
  | "complete";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_THRESHOLD = 80;
const DEFAULT_MAX_PULL = 120;
const COMPLETE_DELAY = 500;

// ============================================================================
// Component
// ============================================================================

/**
 * Pull-to-refresh component for mobile
 *
 * Features:
 * - Pull down to refresh
 * - Visual feedback with icon animation
 * - Haptic feedback
 * - Customizable threshold
 * - Success indicator
 * - Prevents scroll bounce
 *
 * @example
 * ```tsx
 * <PullToRefresh onRefresh={async () => {
 *   await fetchNewMessages()
 * }}>
 *   <MessageList messages={messages} />
 * </PullToRefresh>
 * ```
 */
export const PullToRefresh = memo(function PullToRefresh({
  children,
  onRefresh,
  threshold = DEFAULT_THRESHOLD,
  maxPullDistance = DEFAULT_MAX_PULL,
  disabled = false,
  hapticFeedback = true,
  className,
}: PullToRefreshProps) {
  const [refreshState, setRefreshState] = useState<RefreshState>("idle");
  const [pullDistance, setPullDistance] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const hasTriggeredHaptic = useRef(false);

  const controls = useAnimation();

  // Trigger haptic feedback
  const triggerHaptic = useCallback(() => {
    if (!hapticFeedback || hasTriggeredHaptic.current) return;

    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }

    hasTriggeredHaptic.current = true;
  }, [hapticFeedback]);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || refreshState === "refreshing") return;

      const scrollTop = containerRef.current?.scrollTop || 0;

      // Only allow pull if at top of scroll
      if (scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
        hasTriggeredHaptic.current = false;
      }
    },
    [disabled, refreshState],
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || disabled || refreshState === "refreshing")
        return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY.current;

      if (distance > 0) {
        // Pulling down
        e.preventDefault();

        // Apply resistance curve
        const resistance = 0.5;
        const adjustedDistance = Math.min(
          distance * resistance,
          maxPullDistance,
        );

        setPullDistance(adjustedDistance);

        // Update state based on distance
        if (adjustedDistance >= threshold) {
          setRefreshState("ready");
          triggerHaptic();
        } else {
          setRefreshState("pulling");
        }
      }
    },
    [disabled, refreshState, threshold, maxPullDistance, triggerHaptic],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;

    isPulling.current = false;

    if (refreshState === "ready") {
      // Trigger refresh
      setRefreshState("refreshing");

      try {
        await Promise.resolve(onRefresh());

        // Show success state
        setRefreshState("complete");
        triggerHaptic();

        // Reset after delay
        setTimeout(() => {
          setPullDistance(0);
          setRefreshState("idle");
        }, COMPLETE_DELAY);
      } catch (error) {
        logger.error("Refresh failed:", error);
        setPullDistance(0);
        setRefreshState("idle");
      }
    } else {
      // Reset if not at threshold
      setPullDistance(0);
      setRefreshState("idle");
    }
  }, [refreshState, onRefresh, triggerHaptic]);

  // Calculate indicator properties
  const indicatorOpacity = Math.min(pullDistance / threshold, 1);
  const indicatorRotation =
    refreshState === "refreshing" ? 360 : pullDistance * 2;
  const indicatorScale = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full overflow-y-auto overscroll-y-contain",
        className,
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center overflow-hidden"
        style={{
          height: pullDistance,
          opacity: indicatorOpacity,
        }}
      >
        <motion.div
          animate={controls}
          className="flex flex-col items-center justify-center"
          style={{
            transform: `scale(${indicatorScale})`,
          }}
        >
          {/* Icon */}
          <div className="relative">
            <motion.div
              animate={{
                rotate: refreshState === "refreshing" ? 360 : indicatorRotation,
              }}
              transition={
                refreshState === "refreshing"
                  ? { duration: 1, repeat: Infinity, ease: "linear" }
                  : { duration: 0 }
              }
            >
              {refreshState === "complete" ? (
                <Check className="h-6 w-6 text-green-500" />
              ) : refreshState === "ready" || refreshState === "refreshing" ? (
                <RefreshCw
                  className={cn(
                    "h-6 w-6 text-primary",
                    refreshState === "refreshing" && "animate-spin",
                  )}
                />
              ) : (
                <ArrowDown className="h-6 w-6 text-muted-foreground" />
              )}
            </motion.div>
          </div>

          {/* Text */}
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {refreshState === "complete"
              ? "Updated!"
              : refreshState === "ready"
                ? "Release to refresh"
                : refreshState === "refreshing"
                  ? "Refreshing..."
                  : "Pull to refresh"}
          </p>
        </motion.div>
      </div>

      {/* Content */}
      <motion.div
        ref={contentRef}
        animate={{
          y: refreshState === "refreshing" ? pullDistance : 0,
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
});

// ============================================================================
// Hook Version
// ============================================================================

export interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
  hapticFeedback?: boolean;
}

export interface UsePullToRefreshReturn {
  refreshState: RefreshState;
  pullDistance: number;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  indicatorProps: {
    opacity: number;
    rotation: number;
    scale: number;
  };
}

/**
 * Hook for implementing pull-to-refresh
 *
 * @example
 * ```tsx
 * const { refreshState, pullDistance, handlers, indicatorProps } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await fetchData()
 *   },
 * })
 *
 * <div {...handlers}>
 *   <RefreshIndicator {...indicatorProps} height={pullDistance} />
 *   <Content />
 * </div>
 * ```
 */
export function usePullToRefresh(
  options: UsePullToRefreshOptions,
): UsePullToRefreshReturn {
  const {
    onRefresh,
    threshold = DEFAULT_THRESHOLD,
    maxPullDistance = DEFAULT_MAX_PULL,
    disabled = false,
    hapticFeedback = true,
  } = options;

  const [refreshState, setRefreshState] = useState<RefreshState>("idle");
  const [pullDistance, setPullDistance] = useState(0);

  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const hasTriggeredHaptic = useRef(false);

  const triggerHaptic = useCallback(() => {
    if (!hapticFeedback || hasTriggeredHaptic.current) return;
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }
    hasTriggeredHaptic.current = true;
  }, [hapticFeedback]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || refreshState === "refreshing") return;
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
      hasTriggeredHaptic.current = false;
    },
    [disabled, refreshState],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || disabled || refreshState === "refreshing")
        return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY.current;

      if (distance > 0) {
        const resistance = 0.5;
        const adjustedDistance = Math.min(
          distance * resistance,
          maxPullDistance,
        );

        setPullDistance(adjustedDistance);

        if (adjustedDistance >= threshold) {
          setRefreshState("ready");
          triggerHaptic();
        } else {
          setRefreshState("pulling");
        }
      }
    },
    [disabled, refreshState, threshold, maxPullDistance, triggerHaptic],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;

    isPulling.current = false;

    if (refreshState === "ready") {
      setRefreshState("refreshing");

      try {
        await Promise.resolve(onRefresh());
        setRefreshState("complete");
        triggerHaptic();

        setTimeout(() => {
          setPullDistance(0);
          setRefreshState("idle");
        }, COMPLETE_DELAY);
      } catch (error) {
        logger.error("Refresh failed:", error);
        setPullDistance(0);
        setRefreshState("idle");
      }
    } else {
      setPullDistance(0);
      setRefreshState("idle");
    }
  }, [refreshState, onRefresh, triggerHaptic]);

  const indicatorOpacity = Math.min(pullDistance / threshold, 1);
  const indicatorRotation =
    refreshState === "refreshing" ? 360 : pullDistance * 2;
  const indicatorScale = Math.min(pullDistance / threshold, 1);

  return {
    refreshState,
    pullDistance,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    indicatorProps: {
      opacity: indicatorOpacity,
      rotation: indicatorRotation,
      scale: indicatorScale,
    },
  };
}

export default PullToRefresh;
