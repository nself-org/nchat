"use client";

/**
 * NetworkQuality - Network quality indicator component
 *
 * Displays the current network quality with visual representation.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import type { NetworkQuality as NetworkQualityType } from "@/lib/offline/offline-types";

// =============================================================================
// Types
// =============================================================================

export interface NetworkQualityProps {
  className?: string;
  showText?: boolean;
  showBars?: boolean;
  size?: "sm" | "md" | "lg";
}

// =============================================================================
// Helpers
// =============================================================================

function getQualityColor(quality: NetworkQualityType): string {
  switch (quality) {
    case "excellent":
      return "text-green-500";
    case "good":
      return "text-green-400";
    case "fair":
      return "text-yellow-500";
    case "poor":
      return "text-red-500";
    default:
      return "text-gray-400";
  }
}

function getQualityBars(quality: NetworkQualityType): number {
  switch (quality) {
    case "excellent":
      return 4;
    case "good":
      return 3;
    case "fair":
      return 2;
    case "poor":
      return 1;
    default:
      return 0;
  }
}

// =============================================================================
// Component
// =============================================================================

export function NetworkQuality({
  className,
  showText = true,
  showBars = true,
  size = "md",
}: NetworkQualityProps) {
  const { networkQuality, networkQualityText, isOffline, isSlowConnection } =
    useConnectionStatus();

  if (isOffline) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {showBars && <SignalBars quality="unknown" size={size} />}
        {showText && (
          <span className="text-sm text-gray-400">No connection</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showBars && <SignalBars quality={networkQuality} size={size} />}
      {showText && (
        <span className={cn("text-sm", getQualityColor(networkQuality))}>
          {networkQualityText}
          {isSlowConnection && (
            <span className="ml-1 text-xs text-muted-foreground">(slow)</span>
          )}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Signal Bars Component
// =============================================================================

interface SignalBarsProps {
  quality: NetworkQualityType;
  size?: "sm" | "md" | "lg";
}

function SignalBars({ quality, size = "md" }: SignalBarsProps) {
  const activeBars = getQualityBars(quality);
  const color = getQualityColor(quality);

  const barSizes = {
    sm: { width: 2, heights: [4, 6, 8, 10], gap: 0.5 },
    md: { width: 3, heights: [6, 9, 12, 15], gap: 1 },
    lg: { width: 4, heights: [8, 12, 16, 20], gap: 1.5 },
  };

  const { width, heights, gap } = barSizes[size];
  const totalWidth = 4 * width + 3 * gap * 4;
  const maxHeight = heights[3];

  return (
    <div
      className="flex items-end"
      style={{
        width: `${totalWidth}px`,
        height: `${maxHeight}px`,
        gap: `${gap * 4}px`,
      }}
    >
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className={cn(
            "rounded-sm transition-colors",
            index < activeBars
              ? color.replace("text-", "bg-")
              : "bg-gray-200 dark:bg-gray-700",
          )}
          style={{
            width: `${width}px`,
            height: `${heights[index]}px`,
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Detailed Network Info
// =============================================================================

export interface NetworkInfoProps {
  className?: string;
}

export function NetworkInfo({ className }: NetworkInfoProps) {
  const {
    networkQuality,
    networkQualityText,
    isSlowConnection,
    isSaveDataEnabled,
    state,
  } = useConnectionStatus();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Status</span>
        <span className="text-sm font-medium capitalize">{state}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Quality</span>
        <div className="flex items-center gap-2">
          <SignalBars quality={networkQuality} size="sm" />
          <span className="text-sm font-medium">{networkQualityText}</span>
        </div>
      </div>

      {isSlowConnection && (
        <div className="flex items-center gap-2 text-yellow-500">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-sm">Slow connection detected</span>
        </div>
      )}

      {isSaveDataEnabled && (
        <div className="flex items-center gap-2 text-blue-500">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm">Data saver mode active</span>
        </div>
      )}
    </div>
  );
}

export default NetworkQuality;
