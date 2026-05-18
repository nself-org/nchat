"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { pullToRefresh } from "@/lib/animations";

import { logger } from "@/lib/logger";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

/**
 * Pull-to-refresh component for mobile
 * Drag down from the top to trigger a refresh
 */
export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isPulling, setIsPulling] = React.useState(false);
  const y = useMotionValue(0);

  // Calculate rotation and opacity based on pull distance
  const rotate = useTransform(y, [0, threshold], [0, 360]);
  const opacity = useTransform(y, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const scale = useTransform(y, [0, threshold], [0.8, 1.2]);

  const handleDragStart = () => {
    if (!disabled && !isRefreshing) {
      setIsPulling(true);
    }
  };

  const handleDrag = (_: any, info: PanInfo) => {
    // Only allow pulling down, and only from the top of the page
    if (info.offset.y > 0 && window.scrollY === 0) {
      y.set(Math.min(info.offset.y, threshold * 1.5));
    }
  };

  const handleDragEnd = async (_: any, info: PanInfo) => {
    setIsPulling(false);

    // If pulled past threshold, trigger refresh
    if (info.offset.y >= threshold && !disabled && !isRefreshing) {
      setIsRefreshing(true);
      y.set(60); // Hold at refreshing position

      try {
        await onRefresh();
      } catch (error) {
        logger.error("Refresh failed:", error);
      } finally {
        setIsRefreshing(false);
        y.set(0); // Return to normal position
      }
    } else {
      // Return to normal position
      y.set(0);
    }
  };

  const pullDistance = useTransform(y, (latest) => latest);
  const showIndicator = useTransform(
    pullDistance,
    (latest) => latest > 10 || isRefreshing,
  );

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 top-0 z-50 flex items-center justify-center"
        style={{
          y: useTransform(y, (latest) => Math.max(0, latest - 40)),
          opacity: showIndicator,
        }}
      >
        <motion.div
          className="text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-lg"
          style={{
            rotate: isRefreshing ? 0 : rotate,
            scale,
          }}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ y }}
        animate={
          isRefreshing ? "refreshing" : isPulling ? "pulling" : "initial"
        }
        variants={pullToRefresh}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Simpler pull-to-refresh indicator (stateless)
 */
export function PullIndicator({
  progress,
  isRefreshing,
}: {
  progress: number;
  isRefreshing: boolean;
}) {
  const opacity = Math.min(progress / 80, 1);
  const rotate = (progress / 80) * 360;

  return (
    <div className="flex h-16 items-center justify-center">
      <motion.div
        className="flex h-8 w-8 items-center justify-center"
        style={{
          opacity,
          rotate: isRefreshing ? 0 : rotate,
        }}
      >
        {isRefreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <RefreshCw className="h-5 w-5 text-primary" />
        )}
      </motion.div>
    </div>
  );
}
