"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Role, EffectivePermissions } from "@/lib/admin/roles/role-types";
import {
  canManageRole,
  sortRolesByPosition,
} from "@/lib/admin/roles/role-hierarchy";
import { getInheritedPermissions } from "@/lib/admin/roles/role-inheritance";
import { RoleBadge, RoleBadgeGroup } from "./RoleBadge";
import { RoleCardCompact } from "./RoleCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { getInitials } from "@/stores/user-store";
import { Search, Plus, Minus, AlertCircle, Check } from "lucide-react";

interface UserRoleAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    email?: string;
  };
  currentRoles: Role[];
  allRoles: Role[];
  editorPermissions?: EffectivePermissions | null;
  onAssignRole: (
    roleId: string,
  ) => Promise<{ success: boolean; errors: string[] }>;
  onRemoveRole: (
    roleId: string,
  ) => Promise<{ success: boolean; errors: string[] }>;
}

/**
 * UserRoleAssignment - Modal for managing roles for a specific user
 */
export function UserRoleAssignment({
  open,
  onOpenChange,
  user,
  currentRoles,
  allRoles,
  editorPermissions,
  onAssignRole,
  onRemoveRole,
}: UserRoleAssignmentProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [pendingChanges, setPendingChanges] = React.useState<
    Array<{ roleId: string; action: "add" | "remove" }>
  >([]);

  const currentRoleIds = new Set(currentRoles.map((r) => r.id));

  // Roles the editor can manage
  const manageableRoles = React.useMemo(() => {
    if (!editorPermissions) return [];
    return allRoles.filter((role) =>
      canManageRole(editorPermissions.highestRole, role),
    );
  }, [allRoles, editorPermissions]);

  // Filter roles by search
  const filteredRoles = React.useMemo(() => {
    const sorted = sortRolesByPosition(manageableRoles);
    if (!searchQuery) return sorted;
    const query = searchQuery.toLowerCase();
    return sorted.filter(
      (role) =>
        role.name.toLowerCase().includes(query) ||
        role.description?.toLowerCase().includes(query),
    );
  }, [manageableRoles, searchQuery]);

  // Check if role has pending change
  const getPendingAction = (roleId: string) => {
    return pendingChanges.find((c) => c.roleId === roleId)?.action;
  };

  // Get effective state (current + pending)
  const getEffectiveState = (
    roleId: string,
  ): "assigned" | "unassigned" | "pending-add" | "pending-remove" => {
    const isAssigned = currentRoleIds.has(roleId);
    const pending = getPendingAction(roleId);

    if (pending === "add") return "pending-add";
    if (pending === "remove") return "pending-remove";
    return isAssigned ? "assigned" : "unassigned";
  };

  // Toggle role
  const toggleRole = (roleId: string) => {
    const isAssigned = currentRoleIds.has(roleId);
    const pending = getPendingAction(roleId);

    if (pending) {
      // Remove pending change
      setPendingChanges((prev) => prev.filter((c) => c.roleId !== roleId));
    } else if (isAssigned) {
      // Add remove change
      setPendingChanges((prev) => [...prev, { roleId, action: "remove" }]);
    } else {
      // Add assign change
      setPendingChanges((prev) => [...prev, { roleId, action: "add" }]);
    }
  };

  // Apply changes
  const applyChanges = async () => {
    if (pendingChanges.length === 0) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);
    const newErrors: string[] = [];

    for (const change of pendingChanges) {
      try {
        const result =
          change.action === "add"
            ? await onAssignRole(change.roleId)
            : await onRemoveRole(change.roleId);

        if (!result.success) {
          newErrors.push(...result.errors);
        }
      } catch (error) {
        newErrors.push(`Failed to ${change.action} role`);
      }
    }

    setIsSubmitting(false);

    if (newErrors.length === 0) {
      setPendingChanges([]);
      onOpenChange(false);
    } else {
      setErrors(newErrors);
    }
  };

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setPendingChanges([]);
      setErrors([]);
    }
  }, [open]);

  const addCount = pendingChanges.filter((c) => c.action === "add").length;
  const removeCount = pendingChanges.filter(
    (c) => c.action === "remove",
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage User Roles</DialogTitle>
          <DialogDescription>
            Add or remove roles for this user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar>
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{user.displayName}</div>
              <div className="truncate text-sm text-muted-foreground">
                @{user.username}
              </div>
            </div>
          </div>

          {/* Current roles */}
          {currentRoles.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">
                Current roles
              </Label>
              <RoleBadgeGroup
                roles={currentRoles}
                maxDisplay={5}
                className="mt-1"
              />
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roles..."
              className="pl-9"
            />
          </div>

          {/* Role list */}
          <ScrollArea className="h-64">
            <div className="space-y-1 pr-4">
              {filteredRoles.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {searchQuery
                    ? "No roles found matching your search"
                    : "No manageable roles available"}
                </div>
              ) : (
                filteredRoles.map((role) => {
                  const state = getEffectiveState(role.id);

                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                        state === "assigned" &&
                          "bg-primary/5 border-primary/30",
                        state === "pending-add" &&
                          "border-green-500/30 bg-green-500/10",
                        state === "pending-remove" &&
                          "border-red-500/30 bg-red-500/10",
                        state === "unassigned" && "hover:bg-accent",
                      )}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${role.color}20` }}
                      >
                        {state === "assigned" || state === "pending-add" ? (
                          <Check size={16} style={{ color: role.color }} />
                        ) : (
                          <Plus size={16} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate font-medium"
                          style={{ color: role.color }}
                        >
                          {role.name}
                        </div>
                        {role.description && (
                          <div className="truncate text-xs text-muted-foreground">
                            {role.description}
                          </div>
                        )}
                      </div>
                      {state === "pending-add" && (
                        <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-500">
                          Adding
                        </span>
                      )}
                      {state === "pending-remove" && (
                        <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-500">
                          Removing
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 flex items-start gap-2 rounded-lg border border-destructive p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
              <ul className="list-inside list-disc text-sm text-destructive">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {/* Changes summary */}
          {pendingChanges.length > 0 && (
            <div className="flex-1 text-sm text-muted-foreground">
              {addCount > 0 && (
                <span className="text-green-500">+{addCount} </span>
              )}
              {removeCount > 0 && (
                <span className="text-red-500">-{removeCount} </span>
              )}
              changes pending
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={applyChanges}
            disabled={isSubmitting || pendingChanges.length === 0}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UserRoleAssignment;
