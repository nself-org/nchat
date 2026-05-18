"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ROLE_COLOR_PRESETS } from "@/lib/admin/roles/role-defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

interface RoleColorProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * RoleColor - Color picker for roles with presets and custom input
 */
export function RoleColor({
  value,
  onChange,
  disabled = false,
  className,
}: RoleColorProps) {
  const [customColor, setCustomColor] = React.useState(value);

  const handlePresetClick = (color: string) => {
    if (disabled) return;
    onChange(color);
    setCustomColor(color);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value.toUpperCase();
    setCustomColor(newColor);
    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
      onChange(newColor);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value.toUpperCase();
    setCustomColor(newColor);
    onChange(newColor);
  };

  const isPreset = ROLE_COLOR_PRESETS.some((p) => p.color === value);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label>Color Presets</Label>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {ROLE_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.color}
              type="button"
              disabled={disabled}
              className={cn(
                "relative h-8 w-8 rounded-full border-2 transition-all",
                "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2",
                value === preset.color
                  ? "border-foreground ring-2 ring-offset-2"
                  : "border-transparent",
                disabled && "cursor-not-allowed opacity-50",
              )}
              style={{ backgroundColor: preset.color }}
              onClick={() => handlePresetClick(preset.color)}
              title={preset.name}
            >
              {value === preset.color && (
                <Check
                  className="absolute inset-0 m-auto text-white drop-shadow-md"
                  size={16}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Custom Color</Label>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={value}
              onChange={handleColorPickerChange}
              disabled={disabled}
              className={cn(
                "h-10 w-10 cursor-pointer rounded border-0 p-0",
                disabled && "cursor-not-allowed opacity-50",
              )}
            />
          </div>
          <Input
            value={customColor}
            onChange={handleCustomChange}
            disabled={disabled}
            placeholder="#000000"
            maxLength={7}
            className={cn(
              "w-28 font-mono uppercase",
              !isPreset && "border-primary",
            )}
          />
          <div
            className="h-10 w-10 rounded border"
            style={{ backgroundColor: value }}
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        This color will be used to display the role badge and highlight members.
      </div>
    </div>
  );
}

/**
 * RoleColorPreview - Shows a preview of the color
 */
interface RoleColorPreviewProps {
  color: string;
  name?: string;
  className?: string;
}

export function RoleColorPreview({
  color,
  name,
  className,
}: RoleColorPreviewProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-4 w-4 rounded-full border"
        style={{ backgroundColor: color }}
      />
      {name && <span style={{ color }}>{name}</span>}
    </div>
  );
}

export default RoleColor;
