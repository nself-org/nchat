"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ProfileFieldDefinition {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "email"
    | "url"
    | "phone"
    | "date"
    | "select"
    | "boolean";
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  maxLength?: number;
}

export interface ProfileFieldsProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  fields: ProfileFieldDefinition[];
  values: Record<string, string | boolean>;
  onChange: (key: string, value: string | boolean) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  variant?: "default" | "compact";
}

// ============================================================================
// Component
// ============================================================================

const ProfileFields = React.forwardRef<HTMLDivElement, ProfileFieldsProps>(
  (
    {
      className,
      fields,
      values,
      onChange,
      errors = {},
      disabled = false,
      variant = "default",
      ...props
    },
    ref,
  ) => {
    const isCompact = variant === "compact";

    const renderField = (field: ProfileFieldDefinition) => {
      const value = values[field.key] ?? "";
      const error = errors[field.key];

      switch (field.type) {
        case "textarea":
          return (
            <div
              key={field.key}
              className={cn("space-y-2", isCompact && "space-y-1")}
            >
              <Label htmlFor={field.key} className={cn(isCompact && "text-xs")}>
                {field.label}
                {field.required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </Label>
              <Textarea
                id={field.key}
                value={value as string}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                disabled={disabled}
                maxLength={field.maxLength}
                rows={isCompact ? 2 : 3}
                className={cn(error && "border-destructive")}
              />
              {field.description && !error && (
                <p className="text-xs text-muted-foreground">
                  {field.description}
                </p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
              {field.maxLength && (
                <p className="text-right text-xs text-muted-foreground">
                  {(value as string).length}/{field.maxLength}
                </p>
              )}
            </div>
          );

        case "select":
          return (
            <div
              key={field.key}
              className={cn("space-y-2", isCompact && "space-y-1")}
            >
              <Label htmlFor={field.key} className={cn(isCompact && "text-xs")}>
                {field.label}
                {field.required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </Label>
              <Select
                value={value as string}
                onValueChange={(v) => onChange(field.key, v)}
                disabled={disabled}
              >
                <SelectTrigger
                  id={field.key}
                  className={cn(
                    error && "border-destructive",
                    isCompact && "h-8 text-sm",
                  )}
                >
                  <SelectValue
                    placeholder={
                      field.placeholder || `Select ${field.label.toLowerCase()}`
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.description && !error && (
                <p className="text-xs text-muted-foreground">
                  {field.description}
                </p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          );

        case "boolean":
          return (
            <div
              key={field.key}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3",
                isCompact && "p-2",
              )}
            >
              <div className="space-y-0.5">
                <Label
                  htmlFor={field.key}
                  className={cn("font-medium", isCompact && "text-xs")}
                >
                  {field.label}
                </Label>
                {field.description && (
                  <p
                    className={cn(
                      "text-muted-foreground",
                      isCompact ? "text-[10px]" : "text-xs",
                    )}
                  >
                    {field.description}
                  </p>
                )}
              </div>
              <Switch
                id={field.key}
                checked={!!value}
                onCheckedChange={(checked) => onChange(field.key, checked)}
                disabled={disabled}
              />
            </div>
          );

        case "date":
          return (
            <div
              key={field.key}
              className={cn("space-y-2", isCompact && "space-y-1")}
            >
              <Label htmlFor={field.key} className={cn(isCompact && "text-xs")}>
                {field.label}
                {field.required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id={field.key}
                  type="date"
                  value={value as string}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  disabled={disabled}
                  className={cn(
                    error && "border-destructive",
                    isCompact && "h-8 text-sm",
                    "pr-10",
                  )}
                />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              {field.description && !error && (
                <p className="text-xs text-muted-foreground">
                  {field.description}
                </p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          );

        default:
          // text, email, url, phone
          return (
            <div
              key={field.key}
              className={cn("space-y-2", isCompact && "space-y-1")}
            >
              <Label htmlFor={field.key} className={cn(isCompact && "text-xs")}>
                {field.label}
                {field.required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </Label>
              <Input
                id={field.key}
                type={field.type === "text" ? "text" : field.type}
                value={value as string}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                disabled={disabled}
                maxLength={field.maxLength}
                className={cn(
                  error && "border-destructive",
                  isCompact && "h-8 text-sm",
                )}
              />
              {field.description && !error && (
                <p className="text-xs text-muted-foreground">
                  {field.description}
                </p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          );
      }
    };

    return (
      <div
        ref={ref}
        className={cn("space-y-4", isCompact && "space-y-3", className)}
        {...props}
      >
        {fields.map(renderField)}
      </div>
    );
  },
);
ProfileFields.displayName = "ProfileFields";

export { ProfileFields };
