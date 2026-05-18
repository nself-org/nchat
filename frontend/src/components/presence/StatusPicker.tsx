"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type PresenceStatus,
  PRESENCE_LABELS,
  PRESENCE_DESCRIPTIONS,
  getPresenceColor,
} from "@/lib/presence/presence-types";
import { PresenceIndicator } from "./PresenceIndicator";
import { Check } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface StatusPickerProps {
  /**
   * Currently selected status
   */
  value: PresenceStatus;

  /**
   * Callback when status is selected
   */
  onChange: (status: PresenceStatus) => void;

  /**
   * Whether to show the invisible option
   * @default true
   */
  showInvisible?: boolean;

  /**
   * Whether to show descriptions
   * @default true
   */
  showDescriptions?: boolean;

  /**
   * Additional class names
   */
  className?: string;
}

// ============================================================================
// Status Options
// ============================================================================

const STATUS_OPTIONS: Array<{
  value: PresenceStatus;
  label: string;
  description: string;
}> = [
  {
    value: "online",
    label: PRESENCE_LABELS.online,
    description: PRESENCE_DESCRIPTIONS.online,
  },
  {
    value: "away",
    label: PRESENCE_LABELS.away,
    description: PRESENCE_DESCRIPTIONS.away,
  },
  {
    value: "dnd",
    label: PRESENCE_LABELS.dnd,
    description: PRESENCE_DESCRIPTIONS.dnd,
  },
  {
    value: "invisible",
    label: PRESENCE_LABELS.invisible,
    description: PRESENCE_DESCRIPTIONS.invisible,
  },
];

// ============================================================================
// Component
// ============================================================================

export function StatusPicker({
  value,
  onChange,
  showInvisible = true,
  showDescriptions = true,
  className,
}: StatusPickerProps) {
  const options = showInvisible
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter((o) => o.value !== "invisible");

  return (
    <div
      className={cn("flex flex-col", className)}
      role="radiogroup"
      aria-label="Status"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            value === option.value && "bg-muted",
          )}
        >
          {/* Status indicator */}
          <PresenceIndicator
            status={option.value}
            size="md"
            position="inline"
            animate={false}
          />

          {/* Label and description */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{option.label}</span>
              {value === option.value && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
            {showDescriptions && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {option.description}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Compact Status Picker (Dropdown Style)
// ============================================================================

export interface CompactStatusPickerProps {
  value: PresenceStatus;
  onChange: (status: PresenceStatus) => void;
  showInvisible?: boolean;
  className?: string;
}

export function CompactStatusPicker({
  value,
  onChange,
  showInvisible = true,
  className,
}: CompactStatusPickerProps) {
  const options = showInvisible
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter((o) => o.value !== "invisible");

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="radiogroup"
      aria-label="Status"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={value === option.value}
          aria-label={option.label}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg p-2 transition-colors",
            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring",
            value === option.value && "bg-muted ring-2 ring-ring",
          )}
          title={option.label}
        >
          <PresenceIndicator
            status={option.value}
            size="lg"
            position="inline"
            animate={false}
          />
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Status Button (for triggering dropdown/dialog)
// ============================================================================

export interface StatusButtonProps {
  status: PresenceStatus;
  onClick?: () => void;
  className?: string;
}

export function StatusButton({
  status,
  onClick,
  className,
}: StatusButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
        "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring",
        "transition-colors",
        className,
      )}
      aria-label={`Current status: ${PRESENCE_LABELS[status]}`}
    >
      <PresenceIndicator status={status} size="sm" position="inline" />
      <span>{PRESENCE_LABELS[status]}</span>
    </button>
  );
}

export default StatusPicker;
