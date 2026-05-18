"use client";

/**
 * Schedule Quick Options Component
 *
 * Provides quick scheduling options like "Tomorrow morning",
 * "End of day", "Monday 9am", etc.
 *
 * @example
 * ```tsx
 * <ScheduleQuickOptions
 *   onSelect={(date) => setScheduledDate(date)}
 *   timezone="America/New_York"
 * />
 * ```
 */

import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Sunrise,
  Sunset,
  Calendar,
  CalendarDays,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface QuickOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  getDate: (timezone: string) => Date;
}

interface ScheduleQuickOptionsProps {
  onSelect: (date: Date, optionId: string) => void;
  timezone: string;
  onCustomClick?: () => void;
  selectedOption?: string | null;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the next occurrence of a specific day of the week
 */
function getNextDayOfWeek(dayOfWeek: number, hour: number = 9): Date {
  const now = new Date();
  const result = new Date(now);
  result.setHours(hour, 0, 0, 0);

  const currentDay = now.getDay();
  let daysUntilTarget = dayOfWeek - currentDay;

  // If the target day is today but the time has passed, or if it's earlier in the week
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7;
  }

  // Special case: if it's the same day but hour hasn't passed yet
  if (daysUntilTarget === 7 && now.getHours() < hour) {
    daysUntilTarget = 0;
  }

  result.setDate(now.getDate() + daysUntilTarget);
  return result;
}

/**
 * Get tomorrow's date at a specific hour
 */
function getTomorrow(hour: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/**
 * Get today's date at a specific hour (or tomorrow if that time has passed)
 */
function getToday(hour: number): Date {
  const now = new Date();
  const date = new Date(now);
  date.setHours(hour, 0, 0, 0);

  // If the time has already passed today, return tomorrow
  if (date <= now) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

/**
 * Get a date relative to now
 */
function getRelativeDate(hours: number): Date {
  const date = new Date();
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  // Round to nearest 15 minutes
  const minutes = date.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  date.setMinutes(roundedMinutes, 0, 0);
  return date;
}

// ============================================================================
// Quick Options
// ============================================================================

const QUICK_OPTIONS: QuickOption[] = [
  {
    id: "in-1-hour",
    label: "In 1 hour",
    description: "Send in about an hour",
    icon: <Clock className="h-4 w-4" />,
    getDate: () => getRelativeDate(1),
  },
  {
    id: "in-3-hours",
    label: "In 3 hours",
    description: "Send in about 3 hours",
    icon: <Clock className="h-4 w-4" />,
    getDate: () => getRelativeDate(3),
  },
  {
    id: "tomorrow-morning",
    label: "Tomorrow morning",
    description: "Tomorrow at 9:00 AM",
    icon: <Sunrise className="h-4 w-4" />,
    getDate: () => getTomorrow(9),
  },
  {
    id: "tomorrow-afternoon",
    label: "Tomorrow afternoon",
    description: "Tomorrow at 1:00 PM",
    icon: <Sunset className="h-4 w-4" />,
    getDate: () => getTomorrow(13),
  },
  {
    id: "end-of-day",
    label: "End of day",
    description: "Today at 5:00 PM",
    icon: <Sunset className="h-4 w-4" />,
    getDate: () => getToday(17),
  },
  {
    id: "monday-morning",
    label: "Monday 9 AM",
    description: "Next Monday at 9:00 AM",
    icon: <Calendar className="h-4 w-4" />,
    getDate: () => getNextDayOfWeek(1, 9), // 1 = Monday
  },
  {
    id: "next-week",
    label: "Next week",
    description: "Same day next week at 9:00 AM",
    icon: <CalendarDays className="h-4 w-4" />,
    getDate: () => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      date.setHours(9, 0, 0, 0);
      return date;
    },
  },
];

// ============================================================================
// Component
// ============================================================================

export function ScheduleQuickOptions({
  onSelect,
  timezone,
  onCustomClick,
  selectedOption,
  disabled = false,
  className,
  compact = false,
}: ScheduleQuickOptionsProps) {
  // Format the scheduled time for display
  const formatOptionTime = useCallback(
    (option: QuickOption): string => {
      const date = option.getDate(timezone);
      return date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: timezone,
      });
    },
    [timezone],
  );

  const handleOptionClick = useCallback(
    (option: QuickOption) => {
      if (disabled) return;
      const date = option.getDate(timezone);
      onSelect(date, option.id);
    },
    [disabled, timezone, onSelect],
  );

  // Filter out options that would be in the past
  const validOptions = useMemo(() => {
    const now = new Date();
    return QUICK_OPTIONS.filter((option) => {
      const date = option.getDate(timezone);
      return date > now;
    });
  }, [timezone]);

  if (compact) {
    return (
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {validOptions.slice(0, 4).map((option) => (
          <Button
            key={option.id}
            type="button"
            variant={selectedOption === option.id ? "secondary" : "outline"}
            size="sm"
            onClick={() => handleOptionClick(option)}
            disabled={disabled}
            className="text-xs"
          >
            {option.icon}
            <span className="ml-1">{option.label}</span>
          </Button>
        ))}
        {onCustomClick && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCustomClick}
            disabled={disabled}
            className="text-xs"
          >
            <Settings2 className="mr-1 h-3 w-3" />
            Custom
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-muted-foreground">Quick options</p>
      <div className="grid gap-2">
        {validOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handleOptionClick(option)}
            disabled={disabled}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
              "hover:border-accent hover:bg-accent",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              selectedOption === option.id &&
                "border-primary bg-accent ring-1 ring-primary",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                "bg-muted text-muted-foreground",
                selectedOption === option.id && "bg-primary/10 text-primary",
              )}
            >
              {option.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{option.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {formatOptionTime(option)}
              </p>
            </div>
          </button>
        ))}

        {/* Custom Option */}
        {onCustomClick && (
          <button
            type="button"
            onClick={onCustomClick}
            disabled={disabled}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
              "hover:border-accent hover:bg-accent",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              selectedOption === "custom" &&
                "border-primary bg-accent ring-1 ring-primary",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                "bg-muted text-muted-foreground",
                selectedOption === "custom" && "bg-primary/10 text-primary",
              )}
            >
              <Settings2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Custom date & time</p>
              <p className="text-xs text-muted-foreground">
                Choose a specific date and time
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { QUICK_OPTIONS };
export type { QuickOption, ScheduleQuickOptionsProps };
export default ScheduleQuickOptions;
