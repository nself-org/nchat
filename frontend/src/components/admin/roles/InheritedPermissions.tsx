"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Permission, Role } from "@/lib/admin/roles/role-types";
import { PERMISSIONS } from "@/lib/admin/roles/permission-types";
import { getPermissionSourceMap } from "@/lib/admin/roles/role-inheritance";
import { RoleBadge } from "./RoleBadge";
import { Lock, ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface InheritedPermissionsProps {
  userRoles: Role[];
  showDetails?: boolean;
  groupByPermission?: boolean;
  className?: string;
}

/**
 * InheritedPermissions - Shows which permissions come from which roles
 */
export function InheritedPermissions({
  userRoles,
  showDetails = true,
  groupByPermission = true,
  className,
}: InheritedPermissionsProps) {
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const sourceMap = React.useMemo(
    () => getPermissionSourceMap(userRoles),
    [userRoles],
  );

  // Group permissions by source count
  const uniquePermissions = Array.from(sourceMap.entries()).filter(
    ([_, sources]) => sources.length === 1,
  );
  const sharedPermissions = Array.from(sourceMap.entries()).filter(
    ([_, sources]) => sources.length > 1,
  );

  const toggleItem = (key: string) => {
    setExpandedItems((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  if (groupByPermission) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Shared permissions */}
        {sharedPermissions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Permissions from multiple roles
            </h4>
            <div className="space-y-1">
              {sharedPermissions.map(([permission, roles]) => (
                <Collapsible
                  key={permission}
                  open={expandedItems.includes(permission)}
                  onOpenChange={() => toggleItem(permission)}
                >
                  <CollapsibleTrigger className="hover:bg-accent/50 flex w-full items-center gap-2 rounded-md p-2 text-left">
                    {expandedItems.includes(permission) ? (
                      <ChevronDown
                        size={14}
                        className="text-muted-foreground"
                      />
                    ) : (
                      <ChevronRight
                        size={14}
                        className="text-muted-foreground"
                      />
                    )}
                    <span className="flex-1 text-sm">
                      {PERMISSIONS[permission]?.name ?? permission}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {roles.length} roles
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 flex flex-wrap gap-1 pb-2">
                      {roles.map((role) => (
                        <RoleBadge
                          key={role.id}
                          name={role.name}
                          color={role.color}
                          icon={role.icon}
                          size="sm"
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        )}

        {/* Unique permissions */}
        {uniquePermissions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Permissions from single roles
            </h4>
            <div className="space-y-1">
              {uniquePermissions.map(([permission, roles]) => {
                const role = roles[0];
                return (
                  <div
                    key={permission}
                    className="flex items-center gap-2 rounded-md p-2 text-sm"
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <span className="flex-1">
                      {PERMISSIONS[permission]?.name ?? permission}
                    </span>
                    <RoleBadge
                      name={role.name}
                      color={role.color}
                      size="sm"
                      showIcon={false}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Group by role
  return (
    <div className={cn("space-y-4", className)}>
      {userRoles.map((role) => {
        const isExpanded = expandedItems.includes(role.id);

        return (
          <Collapsible
            key={role.id}
            open={isExpanded}
            onOpenChange={() => toggleItem(role.id)}
          >
            <CollapsibleTrigger className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-lg border p-3">
              {isExpanded ? (
                <ChevronDown size={16} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={16} className="text-muted-foreground" />
              )}
              <RoleBadge name={role.name} color={role.color} icon={role.icon} />
              <span className="flex-1 text-left text-sm text-muted-foreground">
                {role.permissions.length} permissions
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-8 mt-2 space-y-1">
                {role.permissions.map((permission) => (
                  <div
                    key={permission}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {PERMISSIONS[permission]?.name ?? permission}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

/**
 * InheritedPermissionsBadge - Shows inherited permission indicator
 */
interface InheritedPermissionsBadgeProps {
  permission: Permission;
  fromRoles: Role[];
  className?: string;
}

export function InheritedPermissionsBadge({
  permission,
  fromRoles,
  className,
}: InheritedPermissionsBadgeProps) {
  if (fromRoles.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <Lock size={10} />
      <span>
        Inherited from{" "}
        {fromRoles.length === 1 ? (
          <span style={{ color: fromRoles[0].color }}>{fromRoles[0].name}</span>
        ) : (
          `${fromRoles.length} roles`
        )}
      </span>
    </div>
  );
}

export default InheritedPermissions;
