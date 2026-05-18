"use client";

import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface SettingsSliderProps {
  id: string;
  label: string;
  description?: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showValue?: boolean;
  disabled?: boolean;
  premium?: boolean;
  className?: string;
  vertical?: boolean;
  marks?: { value: number; label: string }[];
}

/**
 * SettingsSlider - Slider setting component
 */
export function SettingsSlider({
  id,
  label,
  description,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  showValue = true,
  disabled = false,
  premium = false,
  className,
  vertical = false,
  marks,
}: SettingsSliderProps) {
  const formattedValue = `${value}${unit}`;

  if (vertical) {
    return (
      <div
        className={cn("space-y-4 py-3", disabled && "opacity-60", className)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label
              htmlFor={id}
              className={cn(
                "text-sm font-medium",
                disabled ? "cursor-not-allowed" : "cursor-pointer",
              )}
            >
              {label}
            </Label>
            {premium && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                Pro
              </Badge>
            )}
          </div>
          {showValue && (
            <span className="text-sm font-medium tabular-nums text-muted-foreground">
              {formattedValue}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <Slider
          id={id}
          value={[value]}
          onValueChange={([newValue]) => onValueChange(newValue)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="w-full"
          aria-describedby={description ? `${id}-description` : undefined}
        />
        {marks && (
          <div className="relative w-full">
            <div className="flex justify-between text-xs text-muted-foreground">
              {marks.map((mark) => (
                <span
                  key={mark.value}
                  className="text-center"
                  style={{
                    position: "absolute",
                    left: `${((mark.value - min) / (max - min)) * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {mark.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-3",
        disabled && "opacity-60",
        className,
      )}
    >
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={id}
            className={cn(
              "text-sm font-medium",
              disabled ? "cursor-not-allowed" : "cursor-pointer",
            )}
          >
            {label}
          </Label>
          {premium && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Sparkles className="h-3 w-3" />
              Pro
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Slider
          id={id}
          value={[value]}
          onValueChange={([newValue]) => onValueChange(newValue)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="w-[180px]"
          aria-describedby={description ? `${id}-description` : undefined}
        />
        {showValue && (
          <span className="w-14 text-right text-sm font-medium tabular-nums text-muted-foreground">
            {formattedValue}
          </span>
        )}
      </div>
    </div>
  );
}
