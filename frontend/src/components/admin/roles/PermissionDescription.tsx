"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Permission } from "@/lib/admin/roles/role-types";
import {
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  isDangerousPermission,
  requiresAdmin,
} from "@/lib/admin/roles/permission-types";
import * as Icons from "lucide-react";
import { AlertTriangle, Shield } from "lucide-react";

interface PermissionDescriptionProps {
  permission: Permission;
  showCategory?: boolean;
  showWarnings?: boolean;
  className?: string;
}

/**
 * PermissionDescription - Detailed description of a permission
 */
export function PermissionDescription({
  permission,
  showCategory = true,
  showWarnings = true,
  className,
}: PermissionDescriptionProps) {
  const permDef = PERMISSIONS[permission];
  if (!permDef) return null;

  const categoryDef = PERMISSION_CATEGORIES[permDef.category];
  const isDangerous = isDangerousPermission(permission);
  const needsAdmin = requiresAdmin(permission);

  const CategoryIcon = Icons[
    categoryDef.icon as keyof typeof Icons
  ] as React.ElementType;

  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <div className="flex items-start gap-3">
        {/* Category icon */}
        {showCategory && CategoryIcon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <CategoryIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 space-y-2">
          {/* Permission name */}
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{permDef.name}</h4>
            {showWarnings && isDangerous && (
              <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">
                <AlertTriangle size={12} />
                Sensitive
              </span>
            )}
            {showWarnings && needsAdmin && (
              <span className="flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-500">
                <Shield size={12} />
                Admin
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground">{permDef.description}</p>

          {/* Category */}
          {showCategory && (
            <div className="text-xs text-muted-foreground">
              Category: {categoryDef.name}
            </div>
          )}

          {/* Warnings */}
          {showWarnings && isDangerous && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">This is a sensitive permission</p>
                <p className="text-xs opacity-90">
                  Granting this permission gives significant control. Only
                  assign to trusted users.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PermissionDescriptionInline - Inline description for tooltips
 */
interface PermissionDescriptionInlineProps {
  permission: Permission;
  className?: string;
}

export function PermissionDescriptionInline({
  permission,
  className,
}: PermissionDescriptionInlineProps) {
  const permDef = PERMISSIONS[permission];
  if (!permDef) return null;

  const isDangerous = isDangerousPermission(permission);
  const needsAdmin = requiresAdmin(permission);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <span className="font-medium">{permDef.name}</span>
        {isDangerous && <AlertTriangle className="h-3 w-3 text-amber-500" />}
        {needsAdmin && <Shield className="h-3 w-3 text-blue-500" />}
      </div>
      <p className="text-xs text-muted-foreground">{permDef.description}</p>
    </div>
  );
}

/**
 * PermissionList - List of permission descriptions
 */
interface PermissionListProps {
  permissions: Permission[];
  showDescriptions?: boolean;
  compact?: boolean;
  className?: string;
}

export function PermissionList({
  permissions,
  showDescriptions = false,
  compact = false,
  className,
}: PermissionListProps) {
  if (permissions.length === 0) {
    return <div className="text-sm text-muted-foreground">No permissions</div>;
  }

  return (
    <div className={cn("space-y-1", className)}>
      {permissions.map((permission) => {
        const permDef = PERMISSIONS[permission];
        if (!permDef) return null;

        const isDangerous = isDangerousPermission(permission);

        return (
          <div
            key={permission}
            className={cn(
              "flex items-center gap-2",
              compact ? "text-xs" : "text-sm",
            )}
          >
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isDangerous ? "bg-amber-500" : "bg-primary",
              )}
            />
            <span className={isDangerous ? "text-amber-500" : undefined}>
              {permDef.name}
            </span>
            {showDescriptions && (
              <span className="text-muted-foreground">
                - {permDef.description}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PermissionDescription;
