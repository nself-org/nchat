"use client";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface SettingsToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  premium?: boolean;
  className?: string;
}

/**
 * SettingsToggle - Toggle switch setting component
 */
export function SettingsToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  premium = false,
  className,
}: SettingsToggleProps) {
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
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-description` : undefined}
      />
    </div>
  );
}
