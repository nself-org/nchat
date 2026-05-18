"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Pipette } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { presetColors } from "@/lib/settings/settings-defaults";

interface SettingsColorPickerProps {
  id: string;
  label: string;
  description?: string;
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  allowCustom?: boolean;
  disabled?: boolean;
  premium?: boolean;
  className?: string;
}

/**
 * SettingsColorPicker - Color picker setting component
 */
export function SettingsColorPicker({
  id,
  label,
  description,
  value,
  onChange,
  presets = presetColors,
  allowCustom = true,
  disabled = false,
  premium = false,
  className,
}: SettingsColorPickerProps) {
  const [customColor, setCustomColor] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetClick = (color: string) => {
    onChange(color);
    setCustomColor(color);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
      onChange(color);
    }
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    onChange(color);
  };

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

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className="w-[180px] justify-start gap-2"
          >
            <div
              className="h-5 w-5 rounded-md border shadow-sm"
              style={{ backgroundColor: value }}
            />
            <span className="flex-1 text-left font-mono text-sm uppercase">
              {value}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px]" align="end">
          <div className="space-y-4">
            {/* Preset Colors */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Presets</Label>
              <div className="grid grid-cols-8 gap-2">
                {presets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handlePresetClick(color)}
                    className={cn(
                      "relative h-6 w-6 rounded-md border shadow-sm transition-transform hover:scale-110",
                      value === color && "ring-2 ring-primary ring-offset-2",
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  >
                    {value === color && (
                      <Check
                        className={cn(
                          "absolute inset-0 m-auto h-3 w-3",
                          isLightColor(color) ? "text-gray-900" : "text-white",
                        )}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color */}
            {allowCustom && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Custom Color
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      value={customColor}
                      onChange={handleCustomChange}
                      placeholder="#6366f1"
                      className="font-mono uppercase"
                      maxLength={7}
                    />
                  </div>
                  <label className="cursor-pointer">
                    <div className="hover:bg-muted/80 flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                      <Pipette className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                      type="color"
                      value={value}
                      onChange={handleNativeColorChange}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div
                className="h-12 rounded-md shadow-inner"
                style={{ backgroundColor: value }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Check if a color is light (for contrast)
 */
function isLightColor(color: string): boolean {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
