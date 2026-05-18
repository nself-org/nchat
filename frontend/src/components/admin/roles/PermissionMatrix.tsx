"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Role,
  Permission,
  PermissionCategory,
  EffectivePermissions,
} from "@/lib/admin/roles/role-types";
import {
  PERMISSION_GROUPS,
  PERMISSIONS,
  isDangerousPermission,
} from "@/lib/admin/roles/permission-types";
import {
  canManageRole,
  sortRolesByPosition,
} from "@/lib/admin/roles/role-hierarchy";
import { PermissionToggleCompact } from "./PermissionToggle";
import { RoleBadge } from "./RoleBadge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import * as Icons from "lucide-react";
import { ChevronDown, AlertTriangle, Shield } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PermissionMatrixProps {
  roles: Role[];
  onPermissionChange: (
    roleId: string,
    permission: Permission,
    enabled: boolean,
  ) => void;
  editorPermissions?: EffectivePermissions | null;
  expandedCategories?: PermissionCategory[];
  onCategoryToggle?: (category: PermissionCategory) => void;
  className?: string;
}

/**
 * PermissionMatrix - Full permission matrix showing all roles and permissions
 */
export function PermissionMatrix({
  roles,
  onPermissionChange,
  editorPermissions,
  expandedCategories = ["general", "messages", "members"],
  onCategoryToggle,
  className,
}: PermissionMatrixProps) {
  const [localExpanded, setLocalExpanded] =
    React.useState<PermissionCategory[]>(expandedCategories);

  const expanded = onCategoryToggle ? expandedCategories : localExpanded;
  const toggleCategory = (category: PermissionCategory) => {
    if (onCategoryToggle) {
      onCategoryToggle(category);
    } else {
      setLocalExpanded((prev) =>
        prev.includes(category)
          ? prev.filter((c) => c !== category)
          : [...prev, category],
      );
    }
  };

  const sortedRoles = sortRolesByPosition(roles);

  const canEditRole = (role: Role): boolean => {
    if (!editorPermissions) return false;
    return canManageRole(editorPermissions.highestRole, role);
  };

  return (
    <div className={cn("rounded-lg border", className)}>
      <ScrollArea className="w-full">
        <div className="min-w-[800px]">
          {/* Header row with roles */}
          <div className="sticky top-0 z-10 flex border-b bg-background">
            <div className="w-64 shrink-0 p-3 font-medium">Permission</div>
            {sortedRoles.map((role) => (
              <div
                key={role.id}
                className="flex w-28 shrink-0 flex-col items-center justify-center border-l p-2"
              >
                <RoleBadge
                  name={role.name}
                  color={role.color}
                  size="sm"
                  showIcon={false}
                />
                <span className="mt-1 text-xs text-muted-foreground">
                  #{role.position}
                </span>
              </div>
            ))}
          </div>

          {/* Permission categories */}
          {PERMISSION_GROUPS.map((group) => {
            const isExpanded = expanded.includes(group.category);
            const CategoryIcon = Icons[
              group.icon as keyof typeof Icons
            ] as React.ElementType;

            return (
              <Collapsible
                key={group.category}
                open={isExpanded}
                onOpenChange={() => toggleCategory(group.category)}
              >
                {/* Category header */}
                <CollapsibleTrigger className="bg-muted/50 hover:bg-muted/70 flex w-full items-center border-b">
                  <div className="flex w-64 shrink-0 items-center gap-2 p-3">
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                    {CategoryIcon && (
                      <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{group.name}</span>
                  </div>
                  {/* Role column headers for category */}
                  {sortedRoles.map((role) => {
                    const enabledCount = group.permissions.filter((p) =>
                      role.permissions.includes(p.id),
                    ).length;
                    const totalCount = group.permissions.length;

                    return (
                      <div
                        key={role.id}
                        className="flex w-28 shrink-0 items-center justify-center border-l p-2 text-xs text-muted-foreground"
                      >
                        {enabledCount}/{totalCount}
                      </div>
                    );
                  })}
                </CollapsibleTrigger>

                {/* Permission rows */}
                <CollapsibleContent>
                  {group.permissions.map((perm) => {
                    const isDangerous = isDangerousPermission(perm.id);

                    return (
                      <div
                        key={perm.id}
                        className="hover:bg-accent/30 flex border-b last:border-b-0"
                      >
                        {/* Permission name */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex w-64 shrink-0 items-center gap-2 p-3 pl-8">
                                {isDangerous && (
                                  <AlertTriangle
                                    size={14}
                                    className="text-amber-500"
                                  />
                                )}
                                {perm.requiresAdmin && (
                                  <Shield size={14} className="text-blue-500" />
                                )}
                                <span
                                  className={cn(
                                    "text-sm",
                                    isDangerous && "text-amber-500",
                                  )}
                                >
                                  {perm.name}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="font-medium">{perm.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {perm.description}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Role permission toggles */}
                        {sortedRoles.map((role) => {
                          const isEnabled = role.permissions.includes(perm.id);
                          const canEdit = canEditRole(role);
                          const canGrant =
                            canEdit &&
                            editorPermissions?.permissions.includes(perm.id);

                          return (
                            <div
                              key={role.id}
                              className="flex w-28 shrink-0 items-center justify-center border-l p-2"
                            >
                              <PermissionToggleCompact
                                permission={perm.id}
                                enabled={isEnabled}
                                onChange={(enabled) =>
                                  onPermissionChange(role.id, perm.id, enabled)
                                }
                                disabled={!canGrant}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

/**
 * PermissionMatrixCompact - Compact view focusing on a single role
 */
interface PermissionMatrixCompactProps {
  role: Role;
  onPermissionChange: (permission: Permission, enabled: boolean) => void;
  editorPermissions?: EffectivePermissions | null;
  className?: string;
}

export function PermissionMatrixCompact({
  role,
  onPermissionChange,
  editorPermissions,
  className,
}: PermissionMatrixCompactProps) {
  const canEditRole = editorPermissions
    ? canManageRole(editorPermissions.highestRole, role)
    : false;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-3">
        <RoleBadge name={role.name} color={role.color} icon={role.icon} />
        <span className="text-sm text-muted-foreground">
          {role.permissions.length} permissions
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {Object.entries(PERMISSIONS).map(([id, perm]) => {
          const permission = id as Permission;
          const isEnabled = role.permissions.includes(permission);
          const canGrant =
            canEditRole && editorPermissions?.permissions.includes(permission);

          return (
            <PermissionToggleCompact
              key={permission}
              permission={permission}
              enabled={isEnabled}
              onChange={(enabled) => onPermissionChange(permission, enabled)}
              disabled={!canGrant}
            />
          );
        })}
      </div>
    </div>
  );
}

export default PermissionMatrix;
