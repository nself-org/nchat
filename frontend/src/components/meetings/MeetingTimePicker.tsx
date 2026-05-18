"use client";

/**
 * MeetingTimePicker - Date, time, and duration selection for meetings
 */

import * as React from "react";
import { cn } from "@/lib/utils";
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
import { Calendar, Clock, Globe } from "lucide-react";
import { getDurationOptions, generateTimeSlots } from "@/lib/meetings";

// ============================================================================
// Types
// ============================================================================

interface MeetingTimePickerProps {
  date: Date;
  time: string;
  duration: number;
  timezone: string;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
  onDurationChange: (duration: number) => void;
  onTimezoneChange: (timezone: string) => void;
  errors?: Record<string, string>;
  minDate?: Date;
}

// ============================================================================
// Constants
// ============================================================================

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const DURATION_OPTIONS = getDurationOptions();
const TIME_SLOTS = generateTimeSlots(30, 0, 24);

// ============================================================================
// Component
// ============================================================================

export function MeetingTimePicker({
  date,
  time,
  duration,
  timezone,
  onDateChange,
  onTimeChange,
  onDurationChange,
  onTimezoneChange,
  errors = {},
  minDate = new Date(),
}: MeetingTimePickerProps) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  // Format date for display
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Format date for input
  const inputDateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  // Handle date input change
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + "T00:00:00");
    if (!isNaN(newDate.getTime())) {
      onDateChange(newDate);
    }
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isDisabled: boolean;
    }> = [];

    // Previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false, isDisabled: true });
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      const isDisabled = d < new Date(minDate.toDateString());
      days.push({ date: d, isCurrentMonth: true, isDisabled });
    }

    // Next month days to fill the grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, isDisabled: true });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Navigate months
  const goToPrevMonth = () => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  // Select a day
  const selectDay = (day: Date) => {
    const newDate = new Date(date);
    newDate.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    onDateChange(newDate);
    setIsCalendarOpen(false);
  };

  // Check if a date is selected
  const isSelected = (day: Date) => {
    return (
      day.getFullYear() === date.getFullYear() &&
      day.getMonth() === date.getMonth() &&
      day.getDate() === date.getDate()
    );
  };

  // Check if a date is today
  const isToday = (day: Date) => {
    const today = new Date();
    return (
      day.getFullYear() === today.getFullYear() &&
      day.getMonth() === today.getMonth() &&
      day.getDate() === today.getDate()
    );
  };

  return (
    <div className="space-y-4">
      {/* Date */}
      <div className="space-y-2">
        <Label>Date</Label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                errors.scheduledStartAt && "border-red-500",
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {formattedDate}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3">
              {/* Month Navigation */}
              <div className="mb-2 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevMonth}
                  className="h-7 w-7 p-0"
                >
                  &lt;
                </Button>
                <span className="text-sm font-medium">
                  {date.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextMonth}
                  className="h-7 w-7 p-0"
                >
                  &gt;
                </Button>
              </div>

              {/* Day Headers */}
              <div className="mb-1 grid grid-cols-7 gap-1">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div
                    key={day}
                    className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => !day.isDisabled && selectDay(day.date)}
                    disabled={day.isDisabled}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md text-sm",
                      !day.isCurrentMonth && "text-muted-foreground/50",
                      day.isDisabled && "cursor-not-allowed opacity-50",
                      isSelected(day.date) &&
                        "text-primary-foreground bg-primary",
                      isToday(day.date) &&
                        !isSelected(day.date) &&
                        "border border-primary",
                      !day.isDisabled &&
                        !isSelected(day.date) &&
                        "hover:bg-accent",
                    )}
                  >
                    {day.date.getDate()}
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {errors.scheduledStartAt && (
          <p className="text-sm text-red-500">{errors.scheduledStartAt}</p>
        )}
      </div>

      {/* Time and Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Time</Label>
          <Select value={time} onValueChange={onTimeChange}>
            <SelectTrigger
              className={cn(errors.scheduledStartAt && "border-red-500")}
            >
              <Clock className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {TIME_SLOTS.map((slot) => (
                <SelectItem key={slot.startTime} value={slot.startTime}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Duration</Label>
          <Select
            value={String(duration)}
            onValueChange={(v) => onDurationChange(Number(v))}
          >
            <SelectTrigger className={cn(errors.duration && "border-red-500")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.duration && (
            <p className="text-sm text-red-500">{errors.duration}</p>
          )}
        </div>
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <Label>Timezone</Label>
        <Select value={timezone} onValueChange={onTimezoneChange}>
          <SelectTrigger>
            <Globe className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* End Time Display */}
      <div className="text-sm text-muted-foreground">
        Ends at{" "}
        {(() => {
          const [hours, minutes] = time.split(":").map(Number);
          const endDate = new Date(date);
          endDate.setHours(hours, minutes + duration);
          return endDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
        })()}
      </div>
    </div>
  );
}
