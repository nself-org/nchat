"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Role, EffectivePermissions } from "@/lib/admin/roles/role-types";
import {
  canManageRole,
  sortRolesByPosition,
} from "@/lib/admin/roles/role-hierarchy";
import { RoleBadge } from "./RoleBadge";
import { RoleIconPreview } from "./RoleIcon";
import { Button } from "@/components/ui/button";
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Shield,
  Users,
  Lock,
} from "lucide-react";

interface RoleHierarchyProps {
  roles: Role[];
  currentUserPermissions?: EffectivePermissions | null;
  selectedRoleId?: string | null;
  onSelectRole?: (roleId: string) => void;
  onMoveRole?: (roleId: string, direction: "up" | "down") => void;
  onReorder?: (reorderedRoles: Role[]) => void;
  className?: string;
}

/**
 * RoleHierarchy - Visual display of role hierarchy with drag and drop
 */
export function RoleHierarchy({
  roles,
  currentUserPermissions,
  selectedRoleId,
  onSelectRole,
  onMoveRole,
  onReorder,
  className,
}: RoleHierarchyProps) {
  const sortedRoles = React.useMemo(() => sortRolesByPosition(roles), [roles]);

  const canManage = (role: Role): boolean => {
    if (!currentUserPermissions) return false;
    return canManageRole(currentUserPermissions.highestRole, role);
  };

  const canMoveUp = (role: Role, index: number): boolean => {
    if (index === 0) return false;
    if (!canManage(role)) return false;
    // Can't move above a role you can't manage
    const roleAbove = sortedRoles[index - 1];
    return canManage(roleAbove);
  };

  const canMoveDown = (role: Role, index: number): boolean => {
    if (index === sortedRoles.length - 1) return false;
    if (!canManage(role)) return false;
    return true;
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="mb-4 text-sm text-muted-foreground">
        Roles are displayed from highest authority (top) to lowest (bottom).
        Higher roles can manage lower roles.
      </div>

      <div className="relative">
        {/* Hierarchy line */}
        <div className="absolute bottom-0 left-5 top-0 w-0.5 bg-border" />

        {/* Role items */}
        <div className="space-y-2">
          {sortedRoles.map((role, index) => {
            const canEdit = canManage(role);
            const isSelected = selectedRoleId === role.id;

            return (
              <HierarchyItem
                key={role.id}
                role={role}
                index={index}
                totalRoles={sortedRoles.length}
                isSelected={isSelected}
                canEdit={canEdit}
                canMoveUp={canMoveUp(role, index)}
                canMoveDown={canMoveDown(role, index)}
                onSelect={() => onSelectRole?.(role.id)}
                onMoveUp={() => onMoveRole?.(role.id, "up")}
                onMoveDown={() => onMoveRole?.(role.id, "down")}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span>Owner</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span>Admin</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock size={12} />
          <span>Built-in role</span>
        </div>
      </div>
    </div>
  );
}

/**
 * HierarchyItem - Single role in hierarchy view
 */
interface HierarchyItemProps {
  role: Role;
  index: number;
  totalRoles: number;
  isSelected?: boolean;
  canEdit?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onSelect?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function HierarchyItem({
  role,
  index,
  totalRoles,
  isSelected = false,
  canEdit = false,
  canMoveUp = false,
  canMoveDown = false,
  onSelect,
  onMoveUp,
  onMoveDown,
}: HierarchyItemProps) {
  const memberCount = role.memberCount ?? 0;

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-lg border p-3 pl-10 transition-all",
        "hover:shadow-sm",
        isSelected && "bg-primary/5 ring-2 ring-primary",
        !canEdit && "opacity-75",
      )}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      {/* Position indicator */}
      <div
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 bg-background"
        style={{ borderColor: role.color }}
      />

      {/* Drag handle (when editable) */}
      {canEdit && (
        <div className="cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical size={16} />
        </div>
      )}

      {/* Role info */}
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: `${role.color}20` }}
      >
        {role.icon ? (
          <RoleIconPreview icon={role.icon} color={role.color} size={18} />
        ) : (
          <Shield size={18} style={{ color: role.color }} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium" style={{ color: role.color }}>
            {role.name}
          </span>
          {role.isBuiltIn && (
            <Lock size={12} className="text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono">Position: {role.position}</span>
          <span className="flex items-center gap-1">
            <Users size={10} />
            {memberCount}
          </span>
        </div>
      </div>

      {/* Move buttons */}
      {(canMoveUp || canMoveDown) && (
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!canMoveUp}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp?.();
            }}
            title="Move up (higher authority)"
          >
            <ArrowUp size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!canMoveDown}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown?.();
            }}
            title="Move down (lower authority)"
          >
            <ArrowDown size={14} />
          </Button>
        </div>
      )}

      {/* Permission level indicator */}
      <div className="text-xs text-muted-foreground">
        {index === 0 ? (
          <span className="text-amber-500">Highest</span>
        ) : index === totalRoles - 1 ? (
          <span className="text-blue-500">Lowest</span>
        ) : (
          <span>Level {totalRoles - index}</span>
        )}
      </div>
    </div>
  );
}

/**
 * HierarchyComparison - Compare two roles in hierarchy
 */
interface HierarchyComparisonProps {
  roleA: Role;
  roleB: Role;
  className?: string;
}

export function HierarchyComparison({
  roleA,
  roleB,
  className,
}: HierarchyComparisonProps) {
  const isAHigher = roleA.position > roleB.position;
  const higher = isAHigher ? roleA : roleB;
  const lower = isAHigher ? roleB : roleA;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-center gap-4">
        <RoleBadge name={higher.name} color={higher.color} icon={higher.icon} />
        <div className="flex flex-col items-center text-muted-foreground">
          <ArrowDown size={16} />
          <span className="text-xs">can manage</span>
        </div>
        <RoleBadge name={lower.name} color={lower.color} icon={lower.icon} />
      </div>

      <div className="rounded-lg border p-3 text-sm text-muted-foreground">
        <p>
          <strong style={{ color: higher.color }}>{higher.name}</strong> has
          position {higher.position}, which is{" "}
          {higher.position - lower.position} higher than{" "}
          <strong style={{ color: lower.color }}>{lower.name}</strong> (position{" "}
          {lower.position}).
        </p>
      </div>
    </div>
  );
}

export default RoleHierarchy;
