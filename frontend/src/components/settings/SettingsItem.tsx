"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Info, Lock, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SettingsItemProps {
  id?: string;
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  vertical?: boolean;
  disabled?: boolean;
  premium?: boolean;
  beta?: boolean;
  info?: string;
}

/**
 * SettingsItem - Individual setting item with label and control
 */
export function SettingsItem({
  id,
  label,
  description,
  children,
  className,
  htmlFor,
  vertical = false,
  disabled = false,
  premium = false,
  beta = false,
  info,
}: SettingsItemProps) {
  const labelId = htmlFor || id;

  if (vertical) {
    return (
      <div
        className={cn("space-y-3 py-3", disabled && "opacity-60", className)}
      >
        <div className="flex items-center gap-2">
          <Label
            htmlFor={labelId}
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
          {beta && (
            <Badge variant="outline" className="text-xs">
              Beta
            </Badge>
          )}
          {info && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{info}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {disabled && !premium && (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <div className={cn(disabled && "pointer-events-none")}>{children}</div>
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
            htmlFor={labelId}
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
          {beta && (
            <Badge variant="outline" className="text-xs">
              Beta
            </Badge>
          )}
          {info && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{info}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className={cn("flex-shrink-0", disabled && "pointer-events-none")}>
        {children}
      </div>
    </div>
  );
}
