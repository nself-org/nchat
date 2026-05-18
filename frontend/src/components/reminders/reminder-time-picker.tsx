"use client";

/**
 * Reminder Time Picker Component
 *
 * A comprehensive date and time picker for selecting reminder times.
 * Supports timezone awareness, relative time display, and both date and time selection.
 *
 * @example
 * ```tsx
 * <ReminderTimePicker
 *   value={reminderTime}
 *   onChange={(date) => setReminderTime(date)}
 *   timezone="America/New_York"
 * />
 * ```
 */

import * as React from "react";
import { Calendar, Clock, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getCommonTimezones,
  formatTimezoneOffset,
  formatFutureTime,
} from "@/lib/reminders/reminder-store";

// ============================================================================
// Types
// ============================================================================

export interface ReminderTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  timezone: string;
  onTimezoneChange?: (timezone: string) => void;
  minDate?: Date;
  maxDate?: Date;
  showTimezone?: boolean;
  showRelativeTime?: boolean;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getRelativeTimeDescription(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) {
    return "Time is in the past";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `In ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"}`;
  }

  if (diffHours < 24) {
    const remainingMinutes = diffMinutes % 60;
    if (remainingMinutes === 0) {
      return `In ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
    }
    return `In ${diffHours} hour${diffHours === 1 ? "" : "s"} ${remainingMinutes} min`;
  }

  if (diffDays < 7) {
    return `In ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  return `In ${diffWeeks} week${diffWeeks === 1 ? "" : "s"}`;
}

// ============================================================================
// Component
// ============================================================================

export function ReminderTimePicker({
  value,
  onChange,
  timezone,
  onTimezoneChange,
  minDate,
  showTimezone = true,
  showRelativeTime = true,
  disabled = false,
  className,
}: ReminderTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const timezones = React.useMemo(() => getCommonTimezones(), []);

  // Handle date change
  const handleDateChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateStr = e.target.value;
      if (!dateStr) return;

      const [year, month, day] = dateStr.split("-").map(Number);
      const newDate = new Date(value);
      newDate.setFullYear(year, month - 1, day);
      onChange(newDate);
    },
    [value, onChange],
  );

  // Handle time change
  const handleTimeChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const timeStr = e.target.value;
      if (!timeStr) return;

      const [hours, minutes] = timeStr.split(":").map(Number);
      const newDate = new Date(value);
      newDate.setHours(hours, minutes, 0, 0);
      onChange(newDate);
    },
    [value, onChange],
  );

  // Quick time adjustments
  const adjustTime = React.useCallback(
    (minutes: number) => {
      const newDate = new Date(value.getTime() + minutes * 60 * 1000);
      onChange(newDate);
    },
    [value, onChange],
  );

  // Check if selected time is in the past
  const isInPast = value.getTime() < Date.now();

  // Get min date for input
  const minDateStr = minDate
    ? formatDateForInput(minDate)
    : formatDateForInput(new Date());

  return (
    <div className={cn("space-y-4", className)}>
      {/* Date and Time Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="reminder-date" className="text-sm font-medium">
            Date
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="reminder-date"
              type="date"
              value={formatDateForInput(value)}
              onChange={handleDateChange}
              min={minDateStr}
              disabled={disabled}
              className={cn(
                "flex h-10 w-full rounded-xl border border-input bg-background py-2 pl-10 pr-3 text-sm ring-offset-background",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isInPast && "border-destructive",
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reminder-time" className="text-sm font-medium">
            Time
          </Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="reminder-time"
              type="time"
              value={formatTimeForInput(value)}
              onChange={handleTimeChange}
              disabled={disabled}
              className={cn(
                "flex h-10 w-full rounded-xl border border-input bg-background py-2 pl-10 pr-3 text-sm ring-offset-background",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isInPast && "border-destructive",
              )}
            />
          </div>
        </div>
      </div>

      {/* Quick Time Adjustments */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => adjustTime(15)}
          disabled={disabled}
          className="text-xs"
        >
          +15 min
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => adjustTime(30)}
          disabled={disabled}
          className="text-xs"
        >
          +30 min
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => adjustTime(60)}
          disabled={disabled}
          className="text-xs"
        >
          +1 hour
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => adjustTime(-15)}
          disabled={disabled}
          className="text-xs"
        >
          -15 min
        </Button>
      </div>

      {/* Timezone Selector */}
      {showTimezone && onTimezoneChange && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Timezone</Label>
          <Select
            value={timezone}
            onValueChange={onTimezoneChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  <span>{tz.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({formatTimezoneOffset(tz.value)})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Relative Time Display */}
      {showRelativeTime && (
        <div
          className={cn(
            "rounded-lg p-3 text-sm",
            isInPast
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
          )}
        >
          <div className="font-medium">{formatFutureTime(value)}</div>
          <div className="mt-1 text-xs">
            {isInPast
              ? "Please select a future time"
              : getRelativeTimeDescription(value)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Version
// ============================================================================

export interface CompactTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
  className?: string;
}

export function CompactTimePicker({
  value,
  onChange,
  disabled = false,
  className,
}: CompactTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {formatFutureTime(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <ReminderTimePicker
          value={value}
          onChange={(date) => {
            onChange(date);
            setIsOpen(false);
          }}
          timezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
          showTimezone={false}
          showRelativeTime={true}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}

export default ReminderTimePicker;
