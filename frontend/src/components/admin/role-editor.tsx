"use client";

import { useState, useEffect } from "react";
import { Shield, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AdminUser, Role } from "@/lib/admin/admin-store";

interface RoleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  roles: Role[];
  currentUserRole: string;
  onSave: (userId: string, roleId: string) => Promise<void>;
  isLoading?: boolean;
}

const roleDescriptions: Record<string, string> = {
  owner: "Full control over the workspace, including billing and deletion",
  admin: "Can manage users, channels, and settings",
  moderator: "Can moderate content and manage reports",
  member: "Standard user with access to channels",
  guest: "Limited read-only access",
};

const roleColors: Record<string, string> = {
  owner: "border-yellow-500 bg-yellow-500/10",
  admin: "border-red-500 bg-red-500/10",
  moderator: "border-blue-500 bg-blue-500/10",
  member: "border-green-500 bg-green-500/10",
  guest: "border-gray-500 bg-gray-500/10",
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Determine which roles the current user can assign
function getAssignableRoles(currentRole: string, roles: Role[]): Role[] {
  const roleHierarchy = ["guest", "member", "moderator", "admin", "owner"];
  const currentIndex = roleHierarchy.indexOf(currentRole.toLowerCase());

  return roles.filter((role) => {
    const roleIndex = roleHierarchy.indexOf(role.name.toLowerCase());
    // Can only assign roles lower than or equal to own role (except owner can assign anything)
    return currentRole.toLowerCase() === "owner" || roleIndex < currentIndex;
  });
}

export function RoleEditor({
  isOpen,
  onClose,
  user,
  roles,
  currentUserRole,
  onSave,
  isLoading = false,
}: RoleEditorProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Initialize selected role when user changes
  useEffect(() => {
    if (user) {
      setSelectedRoleId(user.role.id);
    }
  }, [user]);

  const assignableRoles = getAssignableRoles(currentUserRole, roles);
  const currentUserRoleName = user?.role.name.toLowerCase() ?? "";
  const isOwner = currentUserRoleName === "owner";
  const hasChanged = selectedRoleId !== user?.role.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user || !selectedRoleId) return;

    if (!hasChanged) {
      handleClose();
      return;
    }

    try {
      await onSave(user.id, selectedRoleId);
      handleClose();
    } catch (err) {
      setError("Failed to update role. Please try again.");
    }
  };

  const handleClose = () => {
    setSelectedRoleId("");
    setError(null);
    onClose();
  };

  if (!user) return null;

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Change User Role
          </DialogTitle>
          <DialogDescription>
            Select a new role for this user. This will affect their permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* User Info */}
          <div className="bg-muted/50 mb-6 flex items-center gap-3 rounded-lg border p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
              <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium">{user.displayName}</div>
              <div className="text-sm text-muted-foreground">
                @{user.username}
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn("capitalize", roleColors[currentUserRoleName])}
            >
              Current: {user.role.name}
            </Badge>
          </div>

          {isOwner ? (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-orange-500/50 bg-orange-500/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <p className="text-muted-foreground">
                Cannot change the role of the workspace owner.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label>Select Role</Label>
                <RadioGroup
                  value={selectedRoleId}
                  onValueChange={setSelectedRoleId}
                  className="space-y-2"
                >
                  {roles.map((role) => {
                    const roleName = role.name.toLowerCase();
                    const isAssignable = assignableRoles.some(
                      (r) => r.id === role.id,
                    );
                    const isCurrentRole = role.id === user.role.id;
                    const isSelected = selectedRoleId === role.id;

                    return (
                      <div
                        key={role.id}
                        className={cn(
                          "flex items-start space-x-3 rounded-lg border p-4 transition-colors",
                          isSelected && "bg-primary/5 border-primary",
                          !isAssignable && !isCurrentRole && "opacity-50",
                          roleColors[roleName],
                        )}
                      >
                        <RadioGroupItem
                          value={role.id}
                          id={role.id}
                          disabled={!isAssignable && !isCurrentRole}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={role.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 font-medium",
                              !isAssignable &&
                                !isCurrentRole &&
                                "cursor-not-allowed",
                            )}
                          >
                            {role.name}
                            {isCurrentRole && (
                              <Badge variant="secondary" className="text-xs">
                                Current
                              </Badge>
                            )}
                            {isSelected && !isCurrentRole && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </Label>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {role.description ||
                              roleDescriptions[roleName] ||
                              "No description"}
                          </p>
                          {!isAssignable && !isCurrentRole && (
                            <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                              You cannot assign this role
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* Permissions Preview */}
              {selectedRole &&
                selectedRole.permissions &&
                selectedRole.permissions.length > 0 && (
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="bg-muted/50 rounded-lg border p-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedRole.permissions.map((permission, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              {/* Warning for admin/moderator roles */}
              {selectedRole &&
                ["admin", "moderator"].includes(
                  selectedRole.name.toLowerCase(),
                ) && (
                  <div className="flex items-start gap-2 rounded-lg border border-orange-500/50 bg-orange-500/10 p-3 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
                    <div>
                      <p className="font-medium text-orange-600 dark:text-orange-400">
                        Warning
                      </p>
                      <p className="text-muted-foreground">
                        This user will gain elevated privileges and can affect
                        other users.
                      </p>
                    </div>
                  </div>
                )}

              {/* Error */}
              {error && (
                <div className="border-destructive/50 bg-destructive/10 flex items-center gap-2 rounded-lg border p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            {!isOwner && (
              <Button type="submit" disabled={isLoading || !hasChanged}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RoleEditor;
