"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type LocationSharingDuration,
  SHARING_DURATION_OPTIONS,
} from "@/lib/location";

// ============================================================================
// Types
// ============================================================================

interface LocationDurationProps {
  /** Currently selected duration */
  value: LocationSharingDuration;
  /** Callback when duration changes */
  onChange: (duration: LocationSharingDuration) => void;
  /** Layout variant */
  variant?: "buttons" | "pills" | "list";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show icons */
  showIcon?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Location Duration Component
// ============================================================================

/**
 * Location Duration Selector
 *
 * Allows users to select how long they want to share their live location.
 */
export function LocationDuration({
  value,
  onChange,
  variant = "buttons",
  size = "md",
  showIcon = true,
  disabled = false,
  className,
}: LocationDurationProps) {
  if (variant === "list") {
    return (
      <DurationList
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
      />
    );
  }

  if (variant === "pills") {
    return (
      <DurationPills
        value={value}
        onChange={onChange}
        size={size}
        disabled={disabled}
        className={className}
      />
    );
  }

  return (
    <DurationButtons
      value={value}
      onChange={onChange}
      size={size}
      showIcon={showIcon}
      disabled={disabled}
      className={className}
    />
  );
}

// ============================================================================
// Button Variant
// ============================================================================

interface DurationButtonsProps {
  value: LocationSharingDuration;
  onChange: (duration: LocationSharingDuration) => void;
  size: "sm" | "md" | "lg";
  showIcon: boolean;
  disabled: boolean;
  className?: string;
}

function DurationButtons({
  value,
  onChange,
  size,
  showIcon,
  disabled,
  className,
}: DurationButtonsProps) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {SHARING_DURATION_OPTIONS.map((option) => (
        <Button
          key={option.duration}
          variant={value === option.duration ? "default" : "outline"}
          size={size === "sm" ? "sm" : "default"}
          disabled={disabled}
          onClick={() => onChange(option.duration)}
          className={cn(
            "min-w-[80px]",
            sizeClasses[size],
            value === option.duration && "ring-2 ring-primary ring-offset-2",
          )}
        >
          {showIcon && <Clock className="mr-1.5 h-3.5 w-3.5" />}
          {option.label}
        </Button>
      ))}
    </div>
  );
}

// ============================================================================
// Pill Variant
// ============================================================================

interface DurationPillsProps {
  value: LocationSharingDuration;
  onChange: (duration: LocationSharingDuration) => void;
  size: "sm" | "md" | "lg";
  disabled: boolean;
  className?: string;
}

function DurationPills({
  value,
  onChange,
  size,
  disabled,
  className,
}: DurationPillsProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <div
      className={cn(
        "bg-muted/50 inline-flex rounded-full border p-0.5",
        className,
      )}
    >
      {SHARING_DURATION_OPTIONS.map((option) => (
        <button
          key={option.duration}
          disabled={disabled}
          onClick={() => onChange(option.duration)}
          className={cn(
            "rounded-full font-medium transition-colors",
            sizeClasses[size],
            value === option.duration
              ? "text-primary-foreground bg-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {option.shortLabel}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// List Variant
// ============================================================================

interface DurationListProps {
  value: LocationSharingDuration;
  onChange: (duration: LocationSharingDuration) => void;
  disabled: boolean;
  className?: string;
}

function DurationList({
  value,
  onChange,
  disabled,
  className,
}: DurationListProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {SHARING_DURATION_OPTIONS.map((option) => (
        <button
          key={option.duration}
          disabled={disabled}
          onClick={() => onChange(option.duration)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border p-3 transition-colors",
            value === option.duration
              ? "bg-primary/5 border-primary"
              : "border-transparent hover:bg-muted",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{option.label}</span>
          </div>
          {value === option.duration && (
            <div className="h-2 w-2 rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Duration Display Component
// ============================================================================

interface DurationDisplayProps {
  /** Duration in minutes */
  duration: LocationSharingDuration;
  /** Size variant */
  size?: "sm" | "md";
  /** Custom class name */
  className?: string;
}

/**
 * Display the selected duration.
 */
export function DurationDisplay({
  duration,
  size = "md",
  className,
}: DurationDisplayProps) {
  const option = SHARING_DURATION_OPTIONS.find((o) => o.duration === duration);

  if (!option) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-muted-foreground",
        size === "sm" ? "text-xs" : "text-sm",
        className,
      )}
    >
      <Clock className={cn("h-3.5 w-3.5", size === "sm" && "h-3 w-3")} />
      <span>{option.label}</span>
    </div>
  );
}

// ============================================================================
// Quick Duration Selector
// ============================================================================

interface QuickDurationSelectorProps {
  /** Callback when duration is selected */
  onSelect: (duration: LocationSharingDuration) => void;
  /** Custom class name */
  className?: string;
}

/**
 * Quick duration selector for inline use.
 */
export function QuickDurationSelector({
  onSelect,
  className,
}: QuickDurationSelectorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border bg-popover p-1 shadow-md",
        className,
      )}
    >
      {SHARING_DURATION_OPTIONS.map((option) => (
        <Button
          key={option.duration}
          variant="ghost"
          size="sm"
          onClick={() => onSelect(option.duration)}
          className="h-8 px-3 text-sm"
        >
          {option.shortLabel}
        </Button>
      ))}
    </div>
  );
}

export default LocationDuration;
