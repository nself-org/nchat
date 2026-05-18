"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Role } from "@/lib/admin/roles/role-types";
import { RoleBadge } from "./RoleBadge";
import { RoleIconPreview } from "./RoleIcon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Shield,
  Star,
  GripVertical,
} from "lucide-react";

interface RoleCardProps {
  role: Role;
  isSelected?: boolean;
  canManage?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onViewMembers?: () => void;
  draggable?: boolean;
  className?: string;
}

/**
 * RoleCard - Displays a role in a card format
 */
export function RoleCard({
  role,
  isSelected = false,
  canManage = false,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onViewMembers,
  draggable = false,
  className,
}: RoleCardProps) {
  const memberCount = role.memberCount ?? 0;

  return (
    <Card
      className={cn(
        "group relative cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        className,
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Drag handle */}
        {draggable && canManage && (
          <div className="cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            <GripVertical size={16} />
          </div>
        )}

        {/* Role color indicator */}
        <div
          className="h-10 w-1 rounded-full"
          style={{ backgroundColor: role.color }}
        />

        {/* Role icon */}
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: `${role.color}20` }}
        >
          {role.icon ? (
            <RoleIconPreview icon={role.icon} color={role.color} size={20} />
          ) : (
            <Shield size={20} style={{ color: role.color }} />
          )}
        </div>

        {/* Role info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className="truncate font-semibold"
              style={{ color: role.color }}
            >
              {role.name}
            </h3>
            {role.isBuiltIn && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                BUILT-IN
              </span>
            )}
            {role.isDefault && (
              <span title="Default role">
                <Star size={14} className="fill-amber-400 text-amber-400" />
              </span>
            )}
          </div>
          {role.description && (
            <p className="truncate text-sm text-muted-foreground">
              {role.description}
            </p>
          )}
        </div>

        {/* Member count */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users size={14} />
          <span>{memberCount}</span>
        </div>

        {/* Position indicator */}
        <div className="flex items-center justify-center rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
          #{role.position}
        </div>

        {/* Actions menu */}
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Edit2 size={14} className="mr-2" />
                  Edit Role
                </DropdownMenuItem>
              )}
              {onViewMembers && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewMembers();
                  }}
                >
                  <Users size={14} className="mr-2" />
                  View Members
                </DropdownMenuItem>
              )}
              {onDuplicate && !role.isBuiltIn && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                >
                  <Copy size={14} className="mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onDelete && !role.isBuiltIn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
}

/**
 * RoleCardCompact - A more compact version of the role card
 */
interface RoleCardCompactProps {
  role: Role;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function RoleCardCompact({
  role,
  isSelected = false,
  onClick,
  className,
}: RoleCardCompactProps) {
  return (
    <div
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-all hover:bg-accent",
        isSelected && "bg-accent ring-1 ring-primary",
        className,
      )}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div
        className="flex h-6 w-6 items-center justify-center rounded-full"
        style={{ backgroundColor: `${role.color}20` }}
      >
        {role.icon ? (
          <RoleIconPreview icon={role.icon} color={role.color} size={14} />
        ) : (
          <Shield size={14} style={{ color: role.color }} />
        )}
      </div>
      <span className="flex-1 truncate text-sm" style={{ color: role.color }}>
        {role.name}
      </span>
      {role.isBuiltIn && (
        <span className="text-[10px] text-muted-foreground">Built-in</span>
      )}
    </div>
  );
}

/**
 * RoleCardSkeleton - Loading skeleton for role card
 */
export function RoleCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="flex items-center gap-3 p-4">
        <div className="h-10 w-1 rounded-full bg-muted" />
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-48 rounded bg-muted" />
        </div>
        <div className="h-6 w-12 rounded bg-muted" />
        <div className="h-6 w-10 rounded bg-muted" />
      </div>
    </Card>
  );
}

export default RoleCard;
