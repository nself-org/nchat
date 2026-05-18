"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Permission,
  PermissionCategory,
  EffectivePermissions,
} from "@/lib/admin/roles/role-types";
import {
  PERMISSION_GROUPS,
  PERMISSIONS,
  isDangerousPermission,
  requiresAdmin,
} from "@/lib/admin/roles/permission-types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import * as Icons from "lucide-react";
import { ChevronDown, AlertTriangle, Shield } from "lucide-react";

interface RolePermissionsProps {
  permissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  editorPermissions?: EffectivePermissions | null;
  disabled?: boolean;
  showDescriptions?: boolean;
  expandedCategories?: PermissionCategory[];
  onCategoryToggle?: (category: PermissionCategory) => void;
  className?: string;
}

/**
 * RolePermissions - Permission editor with categories and checkboxes
 */
export function RolePermissions({
  permissions,
  onChange,
  editorPermissions,
  disabled = false,
  showDescriptions = true,
  expandedCategories = ["general", "messages"],
  onCategoryToggle,
  className,
}: RolePermissionsProps) {
  const [localExpanded, setLocalExpanded] =
    React.useState<PermissionCategory[]>(expandedCategories);

  const expanded = onCategoryToggle ? expandedCategories : localExpanded;
  const setExpanded = onCategoryToggle
    ? (category: PermissionCategory) => onCategoryToggle(category)
    : (category: PermissionCategory) => {
        setLocalExpanded((prev) =>
          prev.includes(category)
            ? prev.filter((c) => c !== category)
            : [...prev, category],
        );
      };

  const togglePermission = (permission: Permission) => {
    if (disabled) return;
    const newPermissions = permissions.includes(permission)
      ? permissions.filter((p) => p !== permission)
      : [...permissions, permission];
    onChange(newPermissions);
  };

  const toggleCategoryPermissions = (category: PermissionCategory) => {
    if (disabled) return;
    const categoryPermissions = PERMISSION_GROUPS.find(
      (g) => g.category === category,
    )?.permissions.map((p) => p.id);

    if (!categoryPermissions) return;

    const allEnabled = categoryPermissions.every((p) =>
      permissions.includes(p),
    );

    if (allEnabled) {
      // Remove all category permissions
      onChange(permissions.filter((p) => !categoryPermissions.includes(p)));
    } else {
      // Add all category permissions (that the editor can grant)
      const newPermissions = new Set(permissions);
      categoryPermissions.forEach((p) => {
        if (canGrantPermission(p)) {
          newPermissions.add(p);
        }
      });
      onChange(Array.from(newPermissions));
    }
  };

  const canGrantPermission = (permission: Permission): boolean => {
    if (!editorPermissions) return true;
    if (editorPermissions.isOwner) return true;
    if (!editorPermissions.permissions.includes("manage_roles")) return false;
    if (permission === "administrator" && !editorPermissions.isOwner)
      return false;
    return editorPermissions.permissions.includes(permission);
  };

  const getCategoryStats = (category: PermissionCategory) => {
    const group = PERMISSION_GROUPS.find((g) => g.category === category);
    if (!group) return { enabled: 0, total: 0 };

    const total = group.permissions.length;
    const enabled = group.permissions.filter((p) =>
      permissions.includes(p.id),
    ).length;

    return { enabled, total };
  };

  return (
    <div className={cn("space-y-4", className)}>
      {PERMISSION_GROUPS.map((group) => {
        const IconComponent = Icons[
          group.icon as keyof typeof Icons
        ] as React.ElementType;
        const isExpanded = expanded.includes(group.category);
        const stats = getCategoryStats(group.category);
        const allEnabled = stats.enabled === stats.total;
        const someEnabled = stats.enabled > 0 && stats.enabled < stats.total;

        return (
          <Collapsible
            key={group.category}
            open={isExpanded}
            onOpenChange={() => setExpanded(group.category)}
          >
            <div className="rounded-lg border">
              {/* Category header */}
              <CollapsibleTrigger className="hover:bg-accent/50 flex w-full items-center gap-3 p-4">
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180",
                  )}
                />
                {IconComponent && (
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1 text-left">
                  <div className="font-medium">{group.name}</div>
                  {showDescriptions && (
                    <div className="text-sm text-muted-foreground">
                      {group.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {stats.enabled}/{stats.total}
                  </span>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Toggle all ${group.category} permissions`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategoryPermissions(group.category);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCategoryPermissions(group.category);
                      }
                    }}
                    className="flex items-center"
                  >
                    <Checkbox
                      checked={
                        allEnabled
                          ? true
                          : someEnabled
                            ? "indeterminate"
                            : false
                      }
                      disabled={disabled}
                      className="pointer-events-none"
                    />
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* Permissions list */}
              <CollapsibleContent>
                <div className="space-y-3 border-t p-4">
                  {group.permissions.map((perm) => {
                    const isEnabled = permissions.includes(perm.id);
                    const canGrant = canGrantPermission(perm.id);

                    return (
                      <PermissionItem
                        key={perm.id}
                        permission={perm}
                        isEnabled={isEnabled}
                        canGrant={canGrant}
                        disabled={disabled || !canGrant}
                        showDescription={showDescriptions}
                        onToggle={() => togglePermission(perm.id)}
                      />
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}

/**
 * PermissionItem - Single permission toggle
 */
interface PermissionItemProps {
  permission: {
    id: Permission;
    name: string;
    description: string;
    dangerous?: boolean;
    requiresAdmin?: boolean;
  };
  isEnabled: boolean;
  canGrant: boolean;
  disabled?: boolean;
  showDescription?: boolean;
  onToggle: () => void;
}

function PermissionItem({
  permission,
  isEnabled,
  canGrant,
  disabled = false,
  showDescription = true,
  onToggle,
}: PermissionItemProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onToggle?.();
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md p-2 transition-colors",
        !disabled && "hover:bg-accent/50 cursor-pointer",
        disabled && "opacity-50",
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled ? "true" : undefined}
      onClick={disabled ? undefined : onToggle}
      onKeyDown={handleKeyDown}
    >
      <Checkbox checked={isEnabled} disabled={disabled} className="mt-1" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Label
            className={cn(
              "cursor-pointer font-medium",
              permission.dangerous && "text-amber-500",
            )}
          >
            {permission.name}
          </Label>
          {permission.dangerous && (
            <span title="Dangerous permission">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </span>
          )}
          {permission.requiresAdmin && (
            <span title="Requires admin">
              <Shield className="h-4 w-4 text-blue-500" />
            </span>
          )}
        </div>
        {showDescription && (
          <p className="text-sm text-muted-foreground">
            {permission.description}
          </p>
        )}
        {!canGrant && (
          <p className="mt-1 text-xs text-amber-500">
            You cannot grant this permission
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * PermissionSummary - Shows a summary of enabled permissions
 */
interface PermissionSummaryProps {
  permissions: Permission[];
  maxDisplay?: number;
  className?: string;
}

export function PermissionSummary({
  permissions,
  maxDisplay = 5,
  className,
}: PermissionSummaryProps) {
  const displayPermissions = permissions.slice(0, maxDisplay);
  const remaining = permissions.length - maxDisplay;

  return (
    <div className={cn("space-y-1", className)}>
      {displayPermissions.map((perm) => (
        <div
          key={perm}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          {PERMISSIONS[perm]?.name ?? perm}
        </div>
      ))}
      {remaining > 0 && (
        <div className="text-sm text-muted-foreground">
          +{remaining} more permission{remaining !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

export default RolePermissions;
