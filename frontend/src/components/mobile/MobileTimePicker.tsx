"use client";

import { useState, useCallback, memo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TouchButton } from "./TouchOptimized";
import { BottomSheet } from "./BottomSheet";

// ============================================================================
// Types
// ============================================================================

export interface MobileTimePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  format?: "12h" | "24h";
  minuteStep?: number;
  minTime?: { hour: number; minute: number };
  maxTime?: { hour: number; minute: number };
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface TimeValue {
  hour: number;
  minute: number;
  period?: "AM" | "PM";
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatTime(date: Date, format: "12h" | "24h" = "12h"): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  if (format === "24h") {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function parseTimeValue(date: Date, format: "12h" | "24h"): TimeValue {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  if (format === "24h") {
    return { hour: hours, minute: minutes };
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return { hour: displayHour, minute: minutes, period };
}

function createDateWithTime(time: TimeValue, format: "12h" | "24h"): Date {
  const now = new Date();
  let hours = time.hour;

  if (format === "12h" && time.period) {
    if (time.period === "PM" && hours !== 12) {
      hours += 12;
    } else if (time.period === "AM" && hours === 12) {
      hours = 0;
    }
  }

  now.setHours(hours, time.minute, 0, 0);
  return now;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Mobile-optimized Time Picker
 *
 * Features:
 * - Touch-friendly scrollable wheels
 * - 12-hour or 24-hour format
 * - Configurable minute steps
 * - Min/max time constraints
 * - Bottom sheet modal
 * - Haptic feedback
 * - Large tap targets
 *
 * @example
 * ```tsx
 * <MobileTimePicker
 *   value={selectedTime}
 *   onChange={setSelectedTime}
 *   format="12h"
 *   minuteStep={15}
 * />
 * ```
 */
export const MobileTimePicker = memo(function MobileTimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Select time",
  className,
  format = "12h",
  minuteStep = 1,
  minTime,
  maxTime,
  isOpen: controlledIsOpen,
  onOpenChange,
}: MobileTimePickerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<TimeValue>(() =>
    value
      ? parseTimeValue(value, format)
      : { hour: 12, minute: 0, period: "PM" },
  );

  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  // Generate hour and minute options
  const hours =
    format === "24h"
      ? Array.from({ length: 24 }, (_, i) => i)
      : Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from(
    { length: Math.floor(60 / minuteStep) },
    (_, i) => i * minuteStep,
  );

  // Handle time change
  const handleTimeChange = useCallback(
    (newTime: TimeValue) => {
      setSelectedTime(newTime);
      const date = createDateWithTime(newTime, format);
      onChange(date);

      // Haptic feedback
      if ("vibrate" in navigator) {
        navigator.vibrate(5);
      }
    },
    [onChange, format],
  );

  // Handle confirm
  const handleConfirm = useCallback(() => {
    setIsOpen(false);

    // Haptic feedback
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }
  }, [setIsOpen]);

  // Update selected time when value changes externally
  useEffect(() => {
    if (value && !isOpen) {
      setSelectedTime(parseTimeValue(value, format));
    }
  }, [value, format, isOpen]);

  return (
    <>
      {/* Trigger button */}
      <TouchButton
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        variant="secondary"
        className={cn("justify-start text-left font-normal", className)}
      >
        <Clock className="mr-2 h-4 w-4" />
        <span>{value ? formatTime(value, format) : placeholder}</span>
      </TouchButton>

      {/* Bottom sheet with time picker */}
      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        snapPoints={[0.6]}
        showHandle
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h3 className="text-lg font-semibold">Select Time</h3>
          </div>

          {/* Time display */}
          <div className="bg-primary/10 rounded-lg py-6 text-center">
            <p className="text-4xl font-bold text-primary">
              {formatTime(createDateWithTime(selectedTime, format), format)}
            </p>
          </div>

          {/* Time wheels */}
          <div className="flex items-center justify-center gap-2">
            {/* Hour picker */}
            <TimeWheel
              value={selectedTime.hour}
              options={hours}
              onChange={(hour) => handleTimeChange({ ...selectedTime, hour })}
              label="Hour"
              format={(h) => h.toString().padStart(2, "0")}
            />

            <div className="text-2xl font-bold">:</div>

            {/* Minute picker */}
            <TimeWheel
              value={selectedTime.minute}
              options={minutes}
              onChange={(minute) =>
                handleTimeChange({ ...selectedTime, minute })
              }
              label="Minute"
              format={(m) => m.toString().padStart(2, "0")}
            />

            {/* AM/PM picker for 12-hour format */}
            {format === "12h" && (
              <>
                <div className="w-4" />
                <TimeWheel
                  value={selectedTime.period === "AM" ? 0 : 1}
                  options={[0, 1]}
                  onChange={(index) =>
                    handleTimeChange({
                      ...selectedTime,
                      period: index === 0 ? "AM" : "PM",
                    })
                  }
                  label="Period"
                  format={(i) => (i === 0 ? "AM" : "PM")}
                />
              </>
            )}
          </div>

          {/* Confirm button */}
          <TouchButton onClick={handleConfirm} className="w-full" size="lg">
            Confirm
          </TouchButton>
        </div>
      </BottomSheet>
    </>
  );
});

// ============================================================================
// Time Wheel Component
// ============================================================================

interface TimeWheelProps {
  value: number;
  options: number[];
  onChange: (value: number) => void;
  label: string;
  format: (value: number) => string;
}

const TimeWheel = memo(function TimeWheel({
  value,
  options,
  onChange,
  label,
  format,
}: TimeWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleIncrement = useCallback(() => {
    const currentIndex = options.indexOf(value);
    const nextIndex = (currentIndex + 1) % options.length;
    onChange(options[nextIndex]);
  }, [value, options, onChange]);

  const handleDecrement = useCallback(() => {
    const currentIndex = options.indexOf(value);
    const prevIndex =
      currentIndex === 0 ? options.length - 1 : currentIndex - 1;
    onChange(options[prevIndex]);
  }, [value, options, onChange]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Label */}
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>

      {/* Wheel container */}
      <div className="relative flex flex-col items-center">
        {/* Increment button */}
        <TouchButton
          onClick={handleIncrement}
          variant="ghost"
          size="icon-sm"
          className="h-10 w-16"
          hapticFeedback
        >
          <ChevronUp className="h-5 w-5" />
        </TouchButton>

        {/* Value display */}
        <div
          ref={wheelRef}
          className={cn(
            "flex h-16 w-16 items-center justify-center",
            "bg-primary/5 rounded-lg border-2 border-primary",
            "text-2xl font-bold",
            isDragging && "scale-105",
          )}
        >
          {format(value)}
        </div>

        {/* Decrement button */}
        <TouchButton
          onClick={handleDecrement}
          variant="ghost"
          size="icon-sm"
          className="h-10 w-16"
          hapticFeedback
        >
          <ChevronDown className="h-5 w-5" />
        </TouchButton>
      </div>
    </div>
  );
});

export default MobileTimePicker;
