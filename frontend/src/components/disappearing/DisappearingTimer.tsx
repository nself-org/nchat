"use client";

import { useState, useCallback } from "react";
import { Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import {
  DISAPPEARING_TIMER_OPTIONS,
  formatDuration,
  isValidDuration,
} from "@/lib/disappearing";

interface DisappearingTimerProps {
  /** Current timer duration in seconds (0 = off) */
  value: number;
  /** Callback when timer changes */
  onChange: (duration: number) => void;
  /** Whether the timer is disabled */
  disabled?: boolean;
  /** Allow custom duration input */
  allowCustom?: boolean;
  /** Show as dropdown or button group */
  variant?: "dropdown" | "buttons" | "compact";
  /** Additional class names */
  className?: string;
}

/**
 * Timer selector for disappearing messages duration.
 */
export function DisappearingTimer({
  value,
  onChange,
  disabled = false,
  allowCustom = false,
  variant = "dropdown",
  className,
}: DisappearingTimerProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState<"hours" | "days">("hours");

  const handleSelectChange = useCallback(
    (newValue: string) => {
      if (newValue === "custom") {
        setIsCustomOpen(true);
        return;
      }
      onChange(parseInt(newValue, 10));
    },
    [onChange],
  );

  const handleCustomSubmit = useCallback(() => {
    const num = parseInt(customValue, 10);
    if (isNaN(num) || num <= 0) return;

    let seconds = num;
    if (customUnit === "hours") {
      seconds = num * 3600;
    } else if (customUnit === "days") {
      seconds = num * 86400;
    }

    if (isValidDuration(seconds)) {
      onChange(seconds);
      setIsCustomOpen(false);
      setCustomValue("");
    }
  }, [customValue, customUnit, onChange]);

  const isPreset = DISAPPEARING_TIMER_OPTIONS.some(
    (opt) => opt.value === value,
  );
  const selectedLabel = isPreset
    ? DISAPPEARING_TIMER_OPTIONS.find((opt) => opt.value === value)?.label
    : formatDuration(value);

  if (variant === "buttons") {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {DISAPPEARING_TIMER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              "min-w-[60px]",
              value === option.value && "ring-2 ring-primary ring-offset-2",
            )}
          >
            {option.shortLabel}
          </Button>
        ))}
        {allowCustom && (
          <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={!isPreset && value > 0 ? "default" : "outline"}
                size="sm"
                disabled={disabled}
              >
                {!isPreset && value > 0 ? formatDuration(value) : "Custom"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <CustomDurationInput
                value={customValue}
                unit={customUnit}
                onValueChange={setCustomValue}
                onUnitChange={setCustomUnit}
                onSubmit={handleCustomSubmit}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Select
        value={String(value)}
        onValueChange={handleSelectChange}
        disabled={disabled}
      >
        <SelectTrigger className={cn("h-8 w-[100px] text-xs", className)}>
          <Clock size={12} className="mr-1 shrink-0" />
          <SelectValue placeholder="Timer" />
        </SelectTrigger>
        <SelectContent>
          {DISAPPEARING_TIMER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.shortLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Default dropdown variant
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Clock size={16} className="text-muted-foreground" />
        Timer duration
      </Label>
      <Select
        value={String(value)}
        onValueChange={handleSelectChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select duration">
            {selectedLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DISAPPEARING_TIMER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              <div className="flex w-full items-center justify-between">
                <span>{option.label}</span>
                {value === option.value && (
                  <Check size={14} className="ml-2 text-primary" />
                )}
              </div>
            </SelectItem>
          ))}
          {allowCustom && (
            <SelectItem value="custom">
              <span className="text-muted-foreground">Custom duration...</span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {allowCustom && isCustomOpen && (
        <div className="bg-muted/50 mt-2 rounded-md border p-3">
          <CustomDurationInput
            value={customValue}
            unit={customUnit}
            onValueChange={setCustomValue}
            onUnitChange={setCustomUnit}
            onSubmit={handleCustomSubmit}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Custom duration input component.
 */
function CustomDurationInput({
  value,
  unit,
  onValueChange,
  onUnitChange,
  onSubmit,
}: {
  value: string;
  unit: "hours" | "days";
  onValueChange: (value: string) => void;
  onUnitChange: (unit: "hours" | "days") => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm">Custom duration</Label>
      <div className="flex gap-2">
        <Input
          type="number"
          min="1"
          max={unit === "hours" ? 8760 : 365}
          placeholder="Enter value"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="flex-1"
        />
        <Select
          value={unit}
          onValueChange={(v) => onUnitChange(v as "hours" | "days")}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hours">Hours</SelectItem>
            <SelectItem value="days">Days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onSubmit} className="w-full" size="sm">
        Set timer
      </Button>
    </div>
  );
}

export default DisappearingTimer;
