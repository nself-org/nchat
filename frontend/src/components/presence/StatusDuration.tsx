"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type StatusDuration,
  DURATION_OPTIONS,
  getDurationOption,
  formatDurationRemaining,
} from "@/lib/presence/presence-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface StatusDurationPickerProps {
  /**
   * Currently selected duration
   */
  value: StatusDuration;

  /**
   * Callback when duration changes
   */
  onChange: (duration: StatusDuration) => void;

  /**
   * Display variant
   * @default 'select'
   */
  variant?: "select" | "radio" | "buttons";

  /**
   * Whether to show the preview of when it will clear
   * @default true
   */
  showPreview?: boolean;

  /**
   * Additional class names
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function StatusDurationPicker({
  value,
  onChange,
  variant = "select",
  showPreview = true,
  className,
}: StatusDurationPickerProps) {
  const selectedOption = getDurationOption(value);
  const expiresAt = selectedOption?.getExpiresAt();

  // Select variant
  if (variant === "select") {
    return (
      <div className={cn("space-y-2", className)}>
        <Select
          value={value}
          onValueChange={(v) => onChange(v as StatusDuration)}
        >
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Select duration" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showPreview && expiresAt && (
          <p className="text-xs text-muted-foreground">
            Status will clear in {formatDurationRemaining(expiresAt)}
          </p>
        )}
      </div>
    );
  }

  // Radio variant
  if (variant === "radio") {
    return (
      <div className={cn("space-y-3", className)}>
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as StatusDuration)}
        >
          {DURATION_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`duration-${option.value}`}
              />
              <Label
                htmlFor={`duration-${option.value}`}
                className="cursor-pointer text-sm font-normal"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {showPreview && expiresAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            Status will clear in {formatDurationRemaining(expiresAt)}
          </p>
        )}
      </div>
    );
  }

  // Buttons variant
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1">
        {DURATION_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs transition-colors",
              "hover:bg-muted/80",
              value === option.value
                ? "text-primary-foreground bg-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {showPreview && expiresAt && (
        <p className="text-xs text-muted-foreground">
          Status will clear in {formatDurationRemaining(expiresAt)}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Compact Duration Badge
// ============================================================================

export interface DurationBadgeProps {
  expiresAt: Date | string | null | undefined;
  className?: string;
}

export function DurationBadge({ expiresAt, className }: DurationBadgeProps) {
  if (!expiresAt) {
    return null;
  }

  const remaining = formatDurationRemaining(expiresAt);

  if (remaining === "Expired") {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
        "bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      {remaining}
    </span>
  );
}

// ============================================================================
// Duration Display
// ============================================================================

export interface DurationDisplayProps {
  expiresAt: Date | string | null | undefined;
  prefix?: string;
  className?: string;
}

export function DurationDisplay({
  expiresAt,
  prefix = "Clears in",
  className,
}: DurationDisplayProps) {
  if (!expiresAt) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Does not expire
      </span>
    );
  }

  const remaining = formatDurationRemaining(expiresAt);

  if (remaining === "Expired") {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Expired
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      {prefix} {remaining}
    </span>
  );
}

export default StatusDurationPicker;
