/**
 * StarColorPicker Component
 *
 * Picker for selecting star colors with priority indication.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Star, Check } from "lucide-react";
import { STAR_COLORS, type StarColor } from "@/lib/stars";

interface StarColorPickerProps {
  value: StarColor;
  onChange: (color: StarColor) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Color picker for star priorities.
 */
export function StarColorPicker({
  value,
  onChange,
  disabled = false,
  className,
}: StarColorPickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (color: StarColor) => {
    onChange(color);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn("gap-2", className)}
        >
          <Star
            className="h-4 w-4"
            style={{ color: STAR_COLORS[value].hex }}
            fill={STAR_COLORS[value].hex}
          />
          <span>{STAR_COLORS[value].label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="grid gap-1">
          {(
            Object.entries(STAR_COLORS) as [
              StarColor,
              (typeof STAR_COLORS)[StarColor],
            ][]
          ).map(([color, config]) => (
            <button
              key={color}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-accent transition-colors text-left",
                value === color && "bg-accent",
              )}
              onClick={() => handleSelect(color)}
            >
              <Star
                className="h-4 w-4 shrink-0"
                style={{ color: config.hex }}
                fill={config.hex}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{config.label}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {config.priority} priority
                </p>
              </div>
              {value === color && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface StarColorGridProps {
  value: StarColor;
  onChange: (color: StarColor) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Grid layout color picker for compact spaces.
 */
export function StarColorGrid({
  value,
  onChange,
  disabled = false,
  className,
}: StarColorGridProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {(
        Object.entries(STAR_COLORS) as [
          StarColor,
          (typeof STAR_COLORS)[StarColor],
        ][]
      ).map(([color, config]) => (
        <button
          key={color}
          className={cn(
            "p-1 rounded-md hover:bg-accent transition-colors",
            value === color && "ring-2 ring-offset-1 ring-primary",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          onClick={() => !disabled && onChange(color)}
          disabled={disabled}
          title={`${config.label} (${config.priority} priority)`}
        >
          <Star
            className="h-5 w-5"
            style={{ color: config.hex }}
            fill={config.hex}
          />
        </button>
      ))}
    </div>
  );
}
