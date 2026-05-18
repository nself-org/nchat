"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface SettingsRowProps {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  vertical?: boolean;
}

export function SettingsRow({
  label,
  description,
  children,
  className,
  htmlFor,
  vertical = false,
}: SettingsRowProps) {
  if (vertical) {
    return (
      <div className={cn("space-y-2", className)}>
        <div>
          <Label htmlFor={htmlFor} className="text-sm font-medium">
            {label}
          </Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center justify-between gap-4 py-3", className)}
    >
      <div className="space-y-0.5">
        <Label htmlFor={htmlFor} className="cursor-pointer text-sm font-medium">
          {label}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
