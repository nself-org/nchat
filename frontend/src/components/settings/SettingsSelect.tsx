"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SettingsSelectProps {
  id: string;
  label: string;
  description?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  premium?: boolean;
  className?: string;
  vertical?: boolean;
}

/**
 * SettingsSelect - Dropdown select setting component
 */
export function SettingsSelect({
  id,
  label,
  description,
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  premium = false,
  className,
  vertical = false,
}: SettingsSelectProps) {
  if (vertical) {
    return (
      <div
        className={cn("space-y-3 py-3", disabled && "opacity-60", className)}
      >
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
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                <div>
                  <span>{option.label}</span>
                  {option.description && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-[180px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
