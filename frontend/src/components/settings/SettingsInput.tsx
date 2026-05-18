"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SettingsInputProps {
  id: string;
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password" | "url" | "tel" | "number";
  placeholder?: string;
  disabled?: boolean;
  premium?: boolean;
  className?: string;
  vertical?: boolean;
  error?: string;
  maxLength?: number;
  pattern?: string;
}

/**
 * SettingsInput - Text input setting component
 */
export function SettingsInput({
  id,
  label,
  description,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  premium = false,
  className,
  vertical = false,
  error,
  maxLength,
  pattern,
}: SettingsInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  const inputElement = (
    <div className="relative">
      <Input
        id={id}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        pattern={pattern}
        className={cn(
          vertical ? "w-full" : "w-[280px]",
          isPassword && "pr-10",
          error && "border-destructive",
        )}
        aria-describedby={
          description || error ? `${id}-description` : undefined
        }
        aria-invalid={!!error}
      />
      {isPassword && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="sr-only">
            {showPassword ? "Hide password" : "Show password"}
          </span>
        </Button>
      )}
    </div>
  );

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
          <p id={`${id}-description`} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {inputElement}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {maxLength && (
          <p className="text-right text-xs text-muted-foreground">
            {value.length}/{maxLength}
          </p>
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
          <p id={`${id}-description`} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="flex-shrink-0">{inputElement}</div>
    </div>
  );
}
