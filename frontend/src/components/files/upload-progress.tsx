"use client";

import * as React from "react";
import { X, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// TYPES
// ============================================================================

export type UploadStatus = "pending" | "uploading" | "completed" | "error";

export interface UploadProgressProps {
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Upload status */
  status: UploadStatus;
  /** Error message (when status is 'error') */
  errorMessage?: string;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Show status icon */
  showStatusIcon?: boolean;
  /** Show cancel button */
  showCancel?: boolean;
  /** Show retry button (on error) */
  showRetry?: boolean;
  /** Cancel callback */
  onCancel?: () => void;
  /** Retry callback */
  onRetry?: () => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZE_CONFIG = {
  sm: {
    progressHeight: "h-1",
    iconSize: "h-3 w-3",
    buttonSize: "h-5 w-5",
    fontSize: "text-xs",
    gap: "gap-1.5",
  },
  md: {
    progressHeight: "h-2",
    iconSize: "h-4 w-4",
    buttonSize: "h-6 w-6",
    fontSize: "text-sm",
    gap: "gap-2",
  },
  lg: {
    progressHeight: "h-3",
    iconSize: "h-5 w-5",
    buttonSize: "h-8 w-8",
    fontSize: "text-base",
    gap: "gap-3",
  },
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * UploadProgress - Displays upload progress with status indicators
 *
 * @example
 * ```tsx
 * <UploadProgress
 *   progress={45}
 *   status="uploading"
 *   showPercentage
 *   showCancel
 *   onCancel={() => /* console.log 'Canceled')}
 * />
 * ```
 */
export function UploadProgress({
  progress,
  status,
  errorMessage,
  showPercentage = true,
  showStatusIcon = true,
  showCancel = true,
  showRetry = true,
  onCancel,
  onRetry,
  size = "md",
  className,
}: UploadProgressProps) {
  const config = SIZE_CONFIG[size];

  // Determine colors based on status
  const getProgressColor = () => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "error":
        return "bg-destructive";
      default:
        return "bg-primary";
    }
  };

  // Render status icon
  const renderStatusIcon = () => {
    if (!showStatusIcon) return null;

    switch (status) {
      case "pending":
        return (
          <Loader2
            className={cn(
              config.iconSize,
              "animate-spin text-muted-foreground",
            )}
          />
        );
      case "uploading":
        return (
          <Loader2
            className={cn(config.iconSize, "animate-spin text-primary")}
          />
        );
      case "completed":
        return (
          <CheckCircle2 className={cn(config.iconSize, "text-green-500")} />
        );
      case "error":
        return (
          <AlertCircle className={cn(config.iconSize, "text-destructive")} />
        );
      default:
        return null;
    }
  };

  // Render action buttons
  const renderActions = () => {
    const buttons: React.ReactNode[] = [];

    // Cancel button (for pending/uploading)
    if (
      showCancel &&
      (status === "pending" || status === "uploading") &&
      onCancel
    ) {
      buttons.push(
        <TooltipProvider key="cancel">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  config.buttonSize,
                  "text-muted-foreground hover:text-destructive",
                )}
                onClick={onCancel}
              >
                <X className={config.iconSize} />
                <span className="sr-only">Cancel upload</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cancel upload</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
    }

    // Retry button (for error)
    if (showRetry && status === "error" && onRetry) {
      buttons.push(
        <TooltipProvider key="retry">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  config.buttonSize,
                  "text-muted-foreground hover:text-primary",
                )}
                onClick={onRetry}
              >
                <RotateCcw className={config.iconSize} />
                <span className="sr-only">Retry upload</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Retry upload</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
    }

    return buttons.length > 0 ? (
      <div className="flex items-center gap-0.5">{buttons}</div>
    ) : null;
  };

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("flex items-center", config.gap)}>
        {/* Status icon */}
        {renderStatusIcon()}

        {/* Progress bar */}
        <div className="flex-1">
          <Progress
            value={progress}
            className={cn(
              config.progressHeight,
              "[&>div]:transition-all",
              status === "error" && "[&>div]:bg-destructive",
              status === "completed" && "[&>div]:bg-green-500",
            )}
          />
        </div>

        {/* Percentage */}
        {showPercentage && (
          <span
            className={cn(
              config.fontSize,
              "min-w-[3ch] text-right tabular-nums",
              status === "error" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {status === "error" ? "!" : `${Math.round(progress)}%`}
          </span>
        )}

        {/* Action buttons */}
        {renderActions()}
      </div>

      {/* Error message */}
      {status === "error" && errorMessage && (
        <p className={cn("mt-1 text-destructive", config.fontSize)}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/**
 * CircularUploadProgress - Circular progress indicator
 */
export interface CircularUploadProgressProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Upload status */
  status: UploadStatus;
  /** Size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Show percentage in center */
  showPercentage?: boolean;
  /** Custom class name */
  className?: string;
}

export function CircularUploadProgress({
  progress,
  status,
  size = 40,
  strokeWidth = 3,
  showPercentage = true,
  className,
}: CircularUploadProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  // Get stroke color based on status
  const getStrokeColor = () => {
    switch (status) {
      case "completed":
        return "stroke-green-500";
      case "error":
        return "stroke-destructive";
      default:
        return "stroke-primary";
    }
  };

  // Render center content
  const renderCenter = () => {
    if (status === "completed") {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (status === "error") {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (showPercentage) {
      return (
        <span className="text-xs font-medium tabular-nums">
          {Math.round(progress)}
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn(
          "-rotate-90 transform",
          status === "uploading" && progress < 100 && "animate-pulse",
        )}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-300", getStrokeColor())}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {renderCenter()}
      </div>
    </div>
  );
}
