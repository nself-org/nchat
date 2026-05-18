"use client";

import { useState, useCallback, memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TouchButton } from "./TouchOptimized";
import { BottomSheet } from "./BottomSheet";

// ============================================================================
// Types
// ============================================================================

export interface MobileDatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  format?: "short" | "long" | "iso";
  highlightToday?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatDate(
  date: Date,
  format: "short" | "long" | "iso" = "short",
): string {
  if (format === "iso") {
    return date.toISOString().split("T")[0];
  }

  const month = MONTHS[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  if (format === "long") {
    return `${month} ${day}, ${year}`;
  }

  return `${month.slice(0, 3)} ${day}, ${year}`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Mobile-optimized Date Picker
 *
 * Features:
 * - Touch-friendly day selection
 * - Month/year navigation
 * - Min/max date constraints
 * - Today highlighting
 * - Bottom sheet modal
 * - Haptic feedback
 * - Large tap targets (48dp)
 *
 * @example
 * ```tsx
 * <MobileDatePicker
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   minDate={new Date()}
 *   highlightToday
 * />
 * ```
 */
export const MobileDatePicker = memo(function MobileDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  placeholder = "Select date",
  className,
  format = "short",
  highlightToday = true,
  isOpen: controlledIsOpen,
  onOpenChange,
}: MobileDatePickerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());

  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  const today = useMemo(() => new Date(), []);
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Previous month days
    if (firstDay > 0) {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

      for (let i = firstDay - 1; i >= 0; i--) {
        days.push({
          date: new Date(prevYear, prevMonth, daysInPrevMonth - i),
          isCurrentMonth: false,
        });
      }
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(currentYear, currentMonth, i),
        isCurrentMonth: true,
      });
    }

    // Next month days to fill grid
    const remainingDays = 42 - days.length; // 6 weeks
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(nextYear, nextMonth, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Navigation
  const goToPreviousMonth = useCallback(() => {
    setViewDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  const goToToday = useCallback(() => {
    setViewDate(new Date());
  }, []);

  // Handle date selection
  const handleDateSelect = useCallback(
    (date: Date) => {
      // Check constraints
      if (minDate && date < minDate) return;
      if (maxDate && date > maxDate) return;

      onChange(date);
      setIsOpen(false);

      // Haptic feedback
      if ("vibrate" in navigator) {
        navigator.vibrate(10);
      }
    },
    [onChange, minDate, maxDate, setIsOpen],
  );

  // Check if date is disabled
  const isDateDisabled = useCallback(
    (date: Date) => {
      if (minDate && date < minDate) return true;
      if (maxDate && date > maxDate) return true;
      return false;
    },
    [minDate, maxDate],
  );

  return (
    <>
      {/* Trigger button */}
      <TouchButton
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        variant="secondary"
        className={cn("justify-start text-left font-normal", className)}
      >
        <Calendar className="mr-2 h-4 w-4" />
        <span>{value ? formatDate(value, format) : placeholder}</span>
      </TouchButton>

      {/* Bottom sheet with calendar */}
      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        snapPoints={[0.75]}
        showHandle
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <TouchButton
              variant="ghost"
              size="icon"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-5 w-5" />
            </TouchButton>

            <div className="text-center">
              <h3 className="text-lg font-semibold">
                {MONTHS[currentMonth]} {currentYear}
              </h3>
            </div>

            <TouchButton variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </TouchButton>
          </div>

          {/* Today button */}
          {highlightToday && (
            <TouchButton
              onClick={goToToday}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              Today
            </TouchButton>
          )}

          {/* Calendar grid */}
          <div className="space-y-2">
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="flex h-10 items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const isSelected = value && isSameDay(day.date, value);
                const isToday = highlightToday && isSameDay(day.date, today);
                const disabled = isDateDisabled(day.date);

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleDateSelect(day.date)}
                    disabled={disabled}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "relative flex h-12 w-full items-center justify-center rounded-lg",
                      "text-sm font-medium transition-colors",
                      "touch-manipulation",
                      !day.isCurrentMonth && "text-muted-foreground/40",
                      day.isCurrentMonth && !disabled && "hover:bg-accent",
                      isSelected &&
                        "text-primary-foreground hover:bg-primary/90 bg-primary",
                      isToday && !isSelected && "border-2 border-primary",
                      disabled && "cursor-not-allowed opacity-30",
                    )}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    {day.date.getDate()}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Selected date display */}
          {value && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Selected</p>
              <p className="text-lg font-semibold">
                {formatDate(value, "long")}
              </p>
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
});

export default MobileDatePicker;
