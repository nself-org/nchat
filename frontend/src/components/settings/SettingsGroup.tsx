"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  divider?: boolean;
}

/**
 * SettingsGroup - Groups related settings together
 */
export function SettingsGroup({
  title,
  description,
  children,
  className,
  divider = true,
}: SettingsGroupProps) {
  return (
    <div
      className={cn(
        "py-4",
        divider && "border-b border-border last:border-b-0",
        className,
      )}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h4 className="text-sm font-medium text-foreground">{title}</h4>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}
