"use client";

/**
 * AutoSaveIndicator - Shows auto-save status
 *
 * Visual indicator for draft auto-save status
 */

import * as React from "react";
import { Loader2, Check, AlertCircle, Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDraftsStore, selectAutoSaveState } from "@/stores/drafts-store";
import { formatLastSaveTime, getAutoSaveStatusText } from "@/lib/drafts";
import type { AutoSaveStatus } from "@/lib/drafts/draft-types";

// ============================================================================
// Types
// ============================================================================

export interface AutoSaveIndicatorProps {
  /** Override status (otherwise uses store) */
  status?: AutoSaveStatus;
  /** Override error message */
  error?: string | null;
  /** Override last save time */
  lastSaveTime?: number | null;
  /** Show text label */
  showLabel?: boolean;
  /** Size variant */
  size?: "sm" | "default" | "lg";
  /** Show tooltip */
  showTooltip?: boolean;
  /** Animate transitions */
  animate?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Size Classes
// ============================================================================

const sizeClasses = {
  icon: {
    sm: "h-3 w-3",
    default: "h-4 w-4",
    lg: "h-5 w-5",
  },
  text: {
    sm: "text-[10px]",
    default: "text-xs",
    lg: "text-sm",
  },
};

// ============================================================================
// Status Config
// ============================================================================

const statusConfig: Record<
  AutoSaveStatus,
  {
    icon: typeof Loader2;
    color: string;
    label: string;
  }
> = {
  idle: {
    icon: Cloud,
    color: "text-muted-foreground",
    label: "Synced",
  },
  saving: {
    icon: Loader2,
    color: "text-blue-500",
    label: "Saving...",
  },
  saved: {
    icon: Check,
    color: "text-green-500",
    label: "Saved",
  },
  error: {
    icon: AlertCircle,
    color: "text-destructive",
    label: "Save failed",
  },
};

// ============================================================================
// Component
// ============================================================================

export function AutoSaveIndicator({
  status: statusProp,
  error: errorProp,
  lastSaveTime: lastSaveTimeProp,
  showLabel = true,
  size = "default",
  showTooltip = true,
  animate = true,
  className,
}: AutoSaveIndicatorProps) {
  const autoSaveState = useDraftsStore(selectAutoSaveState);

  const status = statusProp ?? autoSaveState.status;
  const error = errorProp ?? autoSaveState.error;
  const lastSaveTime = lastSaveTimeProp ?? autoSaveState.lastSaveTime;

  const config = statusConfig[status];
  const Icon = config.icon;

  // Build tooltip text
  const tooltipText =
    status === "error"
      ? `Error: ${error}`
      : status === "saved" && lastSaveTime
        ? `Last saved ${formatLastSaveTime(lastSaveTime)}`
        : config.label;

  // Build label text
  const labelText =
    status === "saved" && lastSaveTime
      ? formatLastSaveTime(lastSaveTime)
      : config.label;

  const indicator = (
    <div
      className={cn(
        "flex items-center gap-1.5",
        animate && "transition-all duration-200",
        className,
      )}
    >
      <Icon
        className={cn(
          sizeClasses.icon[size],
          config.color,
          status === "saving" && "animate-spin",
        )}
      />
      {showLabel && (
        <span
          className={cn(
            sizeClasses.text[size],
            config.color,
            animate && "transition-colors duration-200",
          )}
        >
          {labelText}
        </span>
      )}
    </div>
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent side="top">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Minimal Indicator
// ============================================================================

export interface AutoSaveIndicatorMinimalProps {
  status?: AutoSaveStatus;
  className?: string;
}

/**
 * Minimal dot indicator
 */
export function AutoSaveIndicatorMinimal({
  status: statusProp,
  className,
}: AutoSaveIndicatorMinimalProps) {
  const autoSaveState = useDraftsStore(selectAutoSaveState);
  const status = statusProp ?? autoSaveState.status;

  const colorClasses: Record<AutoSaveStatus, string> = {
    idle: "bg-muted-foreground",
    saving: "bg-blue-500 animate-pulse",
    saved: "bg-green-500",
    error: "bg-destructive",
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full transition-colors duration-200",
              colorClasses[status],
              className,
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="top">{statusConfig[status].label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Inline Text Indicator
// ============================================================================

export interface AutoSaveIndicatorInlineProps {
  status?: AutoSaveStatus;
  lastSaveTime?: number | null;
  className?: string;
}

/**
 * Inline text indicator (e.g., "Saved 2m ago")
 */
export function AutoSaveIndicatorInline({
  status: statusProp,
  lastSaveTime: lastSaveTimeProp,
  className,
}: AutoSaveIndicatorInlineProps) {
  const autoSaveState = useDraftsStore(selectAutoSaveState);
  const status = statusProp ?? autoSaveState.status;
  const lastSaveTime = lastSaveTimeProp ?? autoSaveState.lastSaveTime;

  let text: string;

  switch (status) {
    case "saving":
      text = "Saving...";
      break;
    case "saved":
      text = lastSaveTime
        ? `Saved ${formatLastSaveTime(lastSaveTime)}`
        : "Saved";
      break;
    case "error":
      text = "Save failed";
      break;
    default:
      text = "";
  }

  if (!text) return null;

  return (
    <span
      className={cn(
        "text-xs text-muted-foreground",
        status === "error" && "text-destructive",
        status === "saving" && "text-blue-500",
        className,
      )}
    >
      {text}
    </span>
  );
}

// ============================================================================
// Connection Status
// ============================================================================

export interface AutoSaveConnectionProps {
  isConnected?: boolean;
  className?: string;
}

/**
 * Shows sync/connection status
 */
export function AutoSaveConnection({
  isConnected = true,
  className,
}: AutoSaveConnectionProps) {
  const Icon = isConnected ? Cloud : CloudOff;
  const text = isConnected ? "Synced" : "Offline";
  const color = isConnected ? "text-green-500" : "text-muted-foreground";

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5", className)}>
            <Icon className={cn("h-4 w-4", color)} />
            <span className={cn("text-xs", color)}>{text}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isConnected
            ? "Your drafts are synced"
            : "Drafts will sync when connected"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AutoSaveIndicator;
