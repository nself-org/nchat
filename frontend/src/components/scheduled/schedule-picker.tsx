"use client";

/**
 * Schedule Picker Component
 *
 * A comprehensive date/time picker for scheduling messages.
 * Includes calendar, time input, timezone selector, and relative time display.
 *
 * @example
 * ```tsx
 * <SchedulePicker
 *   value={scheduledDate}
 *   onChange={setScheduledDate}
 *   timezone={timezone}
 *   onTimezoneChange={setTimezone}
 * />
 * ```
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getUserTimezone,
  getCommonTimezones,
  formatTimezoneOffset,
} from "@/lib/scheduled/scheduled-store";

// ============================================================================
// Types
// ============================================================================

interface SchedulePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ============================================================================
// Helper Functions
// ============================================================================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) {
    return "In the past";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `in ${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
  }

  if (diffHours < 24) {
    const remainingMinutes = diffMinutes % 60;
    if (remainingMinutes > 0) {
      return `in ${diffHours}h ${remainingMinutes}m`;
    }
    return `in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  }

  if (diffDays < 7) {
    return `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `in ${weeks} week${weeks !== 1 ? "s" : ""}`;
  }

  const months = Math.floor(diffDays / 30);
  return `in ${months} month${months !== 1 ? "s" : ""}`;
}

function padZero(num: number): string {
  return num.toString().padStart(2, "0");
}

// ============================================================================
// Component
// ============================================================================

export function SchedulePicker({
  value,
  onChange,
  timezone,
  onTimezoneChange,
  minDate,
  maxDate,
  disabled = false,
  className,
}: SchedulePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => ({
    year: value.getFullYear(),
    month: value.getMonth(),
  }));
  const [timeValue, setTimeValue] = useState(() => ({
    hours: value.getHours(),
    minutes: value.getMinutes(),
  }));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Sync time value when external value changes
  useEffect(() => {
    setTimeValue({
      hours: value.getHours(),
      minutes: value.getMinutes(),
    });
  }, [value]);

  // Calendar data
  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [currentMonth]);

  // Relative time display
  const relativeTime = useMemo(() => formatRelativeTime(value), [value]);

  // Check if a date is disabled
  const isDateDisabled = useCallback(
    (day: number): boolean => {
      const date = new Date(currentMonth.year, currentMonth.month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (date < today) return true;
      if (minDate && date < minDate) return true;
      if (maxDate && date > maxDate) return true;

      return false;
    },
    [currentMonth, minDate, maxDate],
  );

  // Check if a date is selected
  const isDateSelected = useCallback(
    (day: number): boolean => {
      return (
        value.getFullYear() === currentMonth.year &&
        value.getMonth() === currentMonth.month &&
        value.getDate() === day
      );
    },
    [value, currentMonth],
  );

  // Check if a date is today
  const isToday = useCallback(
    (day: number): boolean => {
      const today = new Date();
      return (
        today.getFullYear() === currentMonth.year &&
        today.getMonth() === currentMonth.month &&
        today.getDate() === day
      );
    },
    [currentMonth],
  );

  // Navigation handlers
  const handlePreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  }, []);

  // Date selection handler
  const handleDateSelect = useCallback(
    (day: number) => {
      if (isDateDisabled(day)) return;

      const newDate = new Date(
        currentMonth.year,
        currentMonth.month,
        day,
        timeValue.hours,
        timeValue.minutes,
      );
      onChange(newDate);
      setIsCalendarOpen(false);
    },
    [currentMonth, timeValue, onChange, isDateDisabled],
  );

  // Time change handlers
  const handleTimeChange = useCallback(
    (type: "hours" | "minutes", valueStr: string) => {
      const numValue = parseInt(valueStr, 10);
      if (isNaN(numValue)) return;

      const newTimeValue = { ...timeValue };

      if (type === "hours") {
        newTimeValue.hours = Math.min(23, Math.max(0, numValue));
      } else {
        newTimeValue.minutes = Math.min(59, Math.max(0, numValue));
      }

      setTimeValue(newTimeValue);

      const newDate = new Date(value);
      newDate.setHours(newTimeValue.hours, newTimeValue.minutes);
      onChange(newDate);
    },
    [timeValue, value, onChange],
  );

  // Quick time buttons
  const handleQuickTime = useCallback(
    (hours: number, minutes: number) => {
      const newTimeValue = { hours, minutes };
      setTimeValue(newTimeValue);

      const newDate = new Date(value);
      newDate.setHours(hours, minutes);
      onChange(newDate);
    },
    [value, onChange],
  );

  const commonTimezones = useMemo(() => getCommonTimezones(), []);
  const currentTimezoneOffset = useMemo(
    () => formatTimezoneOffset(timezone),
    [timezone],
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Date Picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Date</Label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground",
              )}
              disabled={disabled}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {value.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3">
              {/* Month Navigation */}
              <div className="mb-4 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousMonth}
                  className="h-7 w-7"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {MONTHS[currentMonth.month]} {currentMonth.year}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-7 w-7"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Days of Week Header */}
              <div className="mb-2 grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map((day) => (
                  <div
                    key={day}
                    className="py-1 text-center text-xs font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div key={index} className="aspect-square">
                    {day !== null && (
                      <button
                        type="button"
                        onClick={() => handleDateSelect(day)}
                        disabled={isDateDisabled(day)}
                        className={cn(
                          "h-full w-full rounded-md text-sm transition-colors",
                          "hover:text-accent-foreground hover:bg-accent",
                          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                          isDateSelected(day) &&
                            "text-primary-foreground hover:bg-primary/90 bg-primary",
                          isToday(day) &&
                            !isDateSelected(day) &&
                            "border border-primary",
                          isDateDisabled(day) &&
                            "cursor-not-allowed opacity-50 hover:bg-transparent",
                        )}
                      >
                        {day}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Time</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number"
              min={0}
              max={23}
              value={padZero(timeValue.hours)}
              onChange={(e) => handleTimeChange("hours", e.target.value)}
              disabled={disabled}
              className="pl-10 text-center"
              placeholder="HH"
            />
          </div>
          <span className="text-lg font-medium">:</span>
          <Input
            type="number"
            min={0}
            max={59}
            value={padZero(timeValue.minutes)}
            onChange={(e) => handleTimeChange("minutes", e.target.value)}
            disabled={disabled}
            className="w-20 text-center"
            placeholder="MM"
          />
        </div>

        {/* Quick Time Options */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickTime(9, 0)}
            disabled={disabled}
            className="text-xs"
          >
            9:00 AM
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickTime(12, 0)}
            disabled={disabled}
            className="text-xs"
          >
            12:00 PM
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickTime(14, 0)}
            disabled={disabled}
            className="text-xs"
          >
            2:00 PM
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickTime(17, 0)}
            disabled={disabled}
            className="text-xs"
          >
            5:00 PM
          </Button>
        </div>
      </div>

      {/* Timezone Selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Globe className="h-4 w-4" />
          Timezone
        </Label>
        <Select
          value={timezone}
          onValueChange={onTimezoneChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue>
              {commonTimezones.find((tz) => tz.value === timezone)?.label ||
                timezone}{" "}
              ({currentTimezoneOffset})
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={getUserTimezone()}>
              Local ({getUserTimezone()})
            </SelectItem>
            {commonTimezones.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Relative Time Display */}
      <div className="bg-muted/50 rounded-lg p-3 text-center">
        <p className="text-sm text-muted-foreground">Will be sent</p>
        <p className="text-lg font-medium text-primary">{relativeTime}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {value.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: timezone,
          })}
        </p>
      </div>
    </div>
  );
}

export default SchedulePicker;
