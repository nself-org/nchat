"use client";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LucideIcon } from "lucide-react";

interface NotificationToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}

export function NotificationToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  icon: Icon,
  disabled = false,
  className,
}: NotificationToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4 transition-colors",
        disabled && "opacity-50",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="space-y-0.5">
          <Label
            htmlFor={id}
            className={cn(
              "cursor-pointer text-sm font-medium",
              disabled && "cursor-not-allowed",
            )}
          >
            {label}
          </Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

interface NotificationToggleGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function NotificationToggleGroup({
  title,
  description,
  children,
  className,
}: NotificationToggleGroupProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h4 className="text-sm font-medium">{title}</h4>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

interface SimpleNotificationToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function SimpleNotificationToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: SimpleNotificationToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2",
        disabled && "opacity-50",
        className,
      )}
    >
      <div className="space-y-0.5 pr-4">
        <Label
          htmlFor={id}
          className={cn(
            "cursor-pointer text-sm font-medium",
            disabled && "cursor-not-allowed",
          )}
        >
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
