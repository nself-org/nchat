"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Permission } from "@/lib/admin/roles/role-types";
import {
  PERMISSIONS,
  isDangerousPermission,
  requiresAdmin,
} from "@/lib/admin/roles/permission-types";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Shield, Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PermissionToggleProps {
  permission: Permission;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  variant?: "switch" | "checkbox";
  disabled?: boolean;
  inherited?: boolean;
  inheritedFrom?: string;
  showDescription?: boolean;
  showWarnings?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * PermissionToggle - Toggle for a single permission
 */
export function PermissionToggle({
  permission,
  enabled,
  onChange,
  variant = "checkbox",
  disabled = false,
  inherited = false,
  inheritedFrom,
  showDescription = true,
  showWarnings = true,
  compact = false,
  className,
}: PermissionToggleProps) {
  const permDef = PERMISSIONS[permission];
  if (!permDef) return null;

  const isDangerous = isDangerousPermission(permission);
  const needsAdmin = requiresAdmin(permission);

  const handleChange = () => {
    if (disabled || inherited) return;
    onChange(!enabled);
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex items-start gap-3 rounded-md p-2 transition-colors",
          !disabled && !inherited && "hover:bg-accent/50 cursor-pointer",
          disabled && "opacity-50",
          inherited && "opacity-75",
          className,
        )}
        role="button"
        tabIndex={disabled || inherited ? -1 : 0}
        onClick={handleChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleChange();
          }
        }}
      >
        {/* Toggle */}
        {variant === "switch" ? (
          <Switch
            checked={enabled}
            onCheckedChange={onChange}
            disabled={disabled || inherited}
            className="mt-0.5"
          />
        ) : (
          <Checkbox
            checked={enabled}
            onCheckedChange={() => onChange(!enabled)}
            disabled={disabled || inherited}
            className={cn("mt-1", inherited && "opacity-50")}
          />
        )}

        {/* Content */}
        <div className={cn("min-w-0 flex-1", compact && "py-0")}>
          <div className="flex items-center gap-2">
            <Label
              className={cn(
                "cursor-pointer font-medium",
                isDangerous && showWarnings && "text-amber-500",
              )}
            >
              {permDef.name}
            </Label>

            {/* Warning indicators */}
            {showWarnings && (
              <>
                {isDangerous && (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        This is a sensitive permission. Grant with caution.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {needsAdmin && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Shield className="h-4 w-4 text-blue-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Requires administrator privileges
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {inherited && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Inherited from {inheritedFrom || "another role"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
          </div>

          {/* Description */}
          {showDescription && !compact && (
            <p className="text-sm text-muted-foreground">
              {permDef.description}
            </p>
          )}

          {/* Inherited notice */}
          {inherited && inheritedFrom && (
            <p className="mt-1 text-xs text-muted-foreground">
              Inherited from {inheritedFrom}
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * PermissionToggleCompact - Compact version for matrix view
 */
interface PermissionToggleCompactProps {
  permission: Permission;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  inherited?: boolean;
  className?: string;
}

export function PermissionToggleCompact({
  permission,
  enabled,
  onChange,
  disabled = false,
  inherited = false,
  className,
}: PermissionToggleCompactProps) {
  const permDef = PERMISSIONS[permission];
  const isDangerous = isDangerousPermission(permission);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => !disabled && !inherited && onChange(!enabled)}
            disabled={disabled || inherited}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded transition-colors",
              enabled
                ? isDangerous
                  ? "bg-amber-500/20 text-amber-500"
                  : "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground",
              !disabled && !inherited && "hover:opacity-80",
              disabled && "cursor-not-allowed opacity-50",
              inherited && "ring-primary/30 cursor-default ring-1 ring-inset",
              className,
            )}
          >
            {enabled ? (
              <div className="h-2 w-2 rounded-full bg-current" />
            ) : (
              <div className="h-2 w-2 rounded-full border border-current" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{permDef?.name}</p>
          <p className="text-xs text-muted-foreground">
            {permDef?.description}
          </p>
          {inherited && (
            <p className="mt-1 text-xs text-primary">
              Inherited from another role
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default PermissionToggle;
