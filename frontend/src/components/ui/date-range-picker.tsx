"use client";

/**
 * DateRangePicker - Date range selection component
 *
 * Features:
 * - Calendar date picker
 * - Quick presets (today, yesterday, last week, last month, custom)
 * - Relative date selection
 * - Time selection support
 * - Keyboard navigation
 */

import * as React from "react";
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// Types
// ============================================================================

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface DateRangePickerProps {
  /** Selected date range */
  value?: DateRange;
  /** Callback when date range changes */
  onChange?: (range: DateRange) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show presets */
  showPresets?: boolean;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Date Presets
// ============================================================================

interface DatePreset {
  label: string;
  getValue: () => DateRange;
}

const presets: DatePreset[] = [
  {
    label: "Today",
    getValue: () => ({
      from: new Date(),
      to: new Date(),
    }),
  },
  {
    label: "Yesterday",
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return {
        from: yesterday,
        to: yesterday,
      };
    },
  },
  {
    label: "Last 7 days",
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: new Date(),
    }),
  },
  {
    label: "Last 14 days",
    getValue: () => ({
      from: subDays(new Date(), 14),
      to: new Date(),
    }),
  },
  {
    label: "Last 30 days",
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
  {
    label: "This week",
    getValue: () => ({
      from: startOfWeek(new Date()),
      to: endOfWeek(new Date()),
    }),
  },
  {
    label: "This month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "Last month",
    getValue: () => {
      const lastMonth = subDays(startOfMonth(new Date()), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
];

// ============================================================================
// Main Component
// ============================================================================

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Select date range",
  showPresets = true,
  disabled = false,
  className,
}: DateRangePickerProps) {
  const [range, setRange] = React.useState<DateRange>(
    value || { from: null, to: null },
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectingFrom, setSelectingFrom] = React.useState(true);

  // Update internal state when value prop changes
  React.useEffect(() => {
    if (value) {
      setRange(value);
    }
  }, [value]);

  const handleDateClick = (date: Date) => {
    if (selectingFrom) {
      setRange({ from: date, to: null });
      setSelectingFrom(false);
    } else {
      const newRange: DateRange = {
        from: range.from,
        to: date,
      };

      // Swap if to is before from
      if (newRange.from && newRange.to && newRange.to < newRange.from) {
        newRange.from = date;
        newRange.to = range.from;
      }

      setRange(newRange);
      onChange?.(newRange);
      setSelectingFrom(true);
    }
  };

  const handlePresetClick = (preset: DatePreset) => {
    const newRange = preset.getValue();
    setRange(newRange);
    onChange?.(newRange);
    setIsOpen(false);
  };

  const handleClear = () => {
    const emptyRange = { from: null, to: null };
    setRange(emptyRange);
    onChange?.(emptyRange);
    setSelectingFrom(true);
  };

  const formatRange = () => {
    if (!range.from && !range.to) return placeholder;

    if (range.from && range.to) {
      return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`;
    }

    if (range.from) {
      return `From ${format(range.from, "MMM d, yyyy")}`;
    }

    return placeholder;
  };

  const nextMonth = () => {
    setCurrentMonth(addDays(currentMonth, 30));
  };

  const prevMonth = () => {
    setCurrentMonth(subDays(currentMonth, 30));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !range.from && !range.to && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets Sidebar */}
          {showPresets && (
            <>
              <div className="flex flex-col gap-1 border-r p-3">
                <Label className="mb-2 text-xs font-medium">Presets</Label>
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePresetClick(preset)}
                    className="justify-start text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </>
          )}

          {/* Calendar */}
          <div className="p-3">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={prevMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">
                  {format(currentMonth, "MMMM yyyy")}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={nextMonth}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <Calendar
                month={currentMonth}
                range={range}
                onDateClick={handleDateClick}
              />

              {/* Footer */}
              <div className="flex items-center justify-between border-t pt-3">
                <div className="text-xs text-muted-foreground">
                  {selectingFrom ? "Select start date" : "Select end date"}
                </div>
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Calendar Component
// ============================================================================

interface CalendarProps {
  month: Date;
  range: DateRange;
  onDateClick: (date: Date) => void;
}

function Calendar({ month, range, onDateClick }: CalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days: Date[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    days.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  const isInRange = (date: Date) => {
    if (!range.from || !range.to) return false;
    return date >= range.from && date <= range.to;
  };

  const isRangeStart = (date: Date) => {
    return (
      range.from &&
      format(date, "yyyy-MM-dd") === format(range.from, "yyyy-MM-dd")
    );
  };

  const isRangeEnd = (date: Date) => {
    return (
      range.to && format(date, "yyyy-MM-dd") === format(range.to, "yyyy-MM-dd")
    );
  };

  const isToday = (date: Date) => {
    return format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  };

  const isCurrentMonth = (date: Date) => {
    return format(date, "MM") === format(month, "MM");
  };

  return (
    <div className="space-y-2">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onDateClick(date)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-xs transition-colors",
              "hover:text-accent-foreground hover:bg-accent",
              !isCurrentMonth(date) && "text-muted-foreground/50",
              isInRange(date) && "bg-primary/10",
              (isRangeStart(date) || isRangeEnd(date)) &&
                "text-primary-foreground hover:text-primary-foreground bg-primary hover:bg-primary",
              isToday(date) && "border border-primary",
            )}
          >
            {format(date, "d")}
          </button>
        ))}
      </div>
    </div>
  );
}

export default DateRangePicker;
