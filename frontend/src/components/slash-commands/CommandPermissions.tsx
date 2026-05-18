"use client";

/**
 * CommandPermissions - Who can use the command
 */

import { useState } from "react";
import { Shield, User, Users, X, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CommandPermissions as CommandPermissionsType } from "@/lib/slash-commands/command-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CommandPermissionsProps {
  permissions?: Partial<CommandPermissionsType>;
  onChange: (permissions: Partial<CommandPermissionsType>) => void;
}

// ============================================================================
// Role Definitions
// ============================================================================

const roles = [
  { value: "owner", label: "Owner", description: "Full administrative access" },
  {
    value: "admin",
    label: "Admin",
    description: "Can manage users and settings",
  },
  {
    value: "moderator",
    label: "Moderator",
    description: "Can moderate content",
  },
  { value: "member", label: "Member", description: "Standard member access" },
  { value: "guest", label: "Guest", description: "Limited read-only access" },
] as const;

// ============================================================================
// Component
// ============================================================================

export function CommandPermissions({
  permissions = {},
  onChange,
}: CommandPermissionsProps) {
  const [newAllowedUser, setNewAllowedUser] = useState("");
  const [newDeniedUser, setNewDeniedUser] = useState("");

  const handleAddAllowedUser = () => {
    if (!newAllowedUser.trim()) return;
    const current = permissions.allowedUsers || [];
    if (!current.includes(newAllowedUser.trim())) {
      onChange({
        ...permissions,
        allowedUsers: [...current, newAllowedUser.trim()],
      });
    }
    setNewAllowedUser("");
  };

  const handleRemoveAllowedUser = (user: string) => {
    const current = permissions.allowedUsers || [];
    onChange({
      ...permissions,
      allowedUsers: current.filter((u) => u !== user),
    });
  };

  const handleAddDeniedUser = () => {
    if (!newDeniedUser.trim()) return;
    const current = permissions.deniedUsers || [];
    if (!current.includes(newDeniedUser.trim())) {
      onChange({
        ...permissions,
        deniedUsers: [...current, newDeniedUser.trim()],
      });
    }
    setNewDeniedUser("");
  };

  const handleRemoveDeniedUser = (user: string) => {
    const current = permissions.deniedUsers || [];
    onChange({
      ...permissions,
      deniedUsers: current.filter((u) => u !== user),
    });
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Permission Settings</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Control who can use this command based on roles and specific users.
        </p>
      </div>

      {/* Minimum Role */}
      <div className="space-y-3">
        <Label>Minimum Role Required</Label>
        <p className="text-xs text-muted-foreground">
          Users must have at least this role to use the command
        </p>
        <div className="grid gap-2 sm:grid-cols-5">
          {roles.map((role) => (
            <button
              key={role.value}
              onClick={() => onChange({ ...permissions, minRole: role.value })}
              className={cn(
                "hover:bg-muted/50 rounded-lg border p-3 text-left transition-colors",
                permissions.minRole === role.value &&
                  "bg-primary/5 border-primary",
              )}
            >
              <div className="text-sm font-medium">{role.label}</div>
              <div className="text-xs text-muted-foreground">
                {role.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Guest Access */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Allow Guest Access</Label>
          <p className="text-xs text-muted-foreground">
            Enable this to let guests (unauthenticated users) use the command
          </p>
        </div>
        <Switch
          checked={permissions.allowGuests || false}
          onCheckedChange={(checked) =>
            onChange({ ...permissions, allowGuests: checked })
          }
        />
      </div>

      {/* Allowed Users */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Allowed Users</Label>
            <p className="text-xs text-muted-foreground">
              Specific users who can use this command (bypasses role check)
            </p>
          </div>
          <Badge variant="outline">
            {permissions.allowedUsers?.length || 0}
          </Badge>
        </div>

        {permissions.allowedUsers && permissions.allowedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {permissions.allowedUsers.map((user) => (
              <Badge key={user} variant="secondary" className="gap-1">
                <User className="h-3 w-3" />
                {user}
                <button
                  onClick={() => handleRemoveAllowedUser(user)}
                  className="ml-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newAllowedUser}
            onChange={(e) => setNewAllowedUser(e.target.value)}
            placeholder="User ID or username"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddAllowedUser();
              }
            }}
          />
          <Button variant="outline" size="icon" onClick={handleAddAllowedUser}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Denied Users */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Blocked Users</Label>
            <p className="text-xs text-muted-foreground">
              Users who are explicitly blocked from using this command
            </p>
          </div>
          <Badge variant="outline">
            {permissions.deniedUsers?.length || 0}
          </Badge>
        </div>

        {permissions.deniedUsers && permissions.deniedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {permissions.deniedUsers.map((user) => (
              <Badge key={user} variant="destructive" className="gap-1">
                <User className="h-3 w-3" />
                {user}
                <button
                  onClick={() => handleRemoveDeniedUser(user)}
                  className="ml-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newDeniedUser}
            onChange={(e) => setNewDeniedUser(e.target.value)}
            placeholder="User ID or username"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddDeniedUser();
              }
            }}
          />
          <Button variant="outline" size="icon" onClick={handleAddDeniedUser}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <h4 className="text-sm font-medium">Permission Summary</h4>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>
            - Requires <strong>{permissions.minRole || "member"}</strong> role
            or higher
          </li>
          <li>
            - Guests{" "}
            {permissions.allowGuests ? (
              <strong className="text-green-500">can</strong>
            ) : (
              <strong className="text-red-500">cannot</strong>
            )}{" "}
            use this command
          </li>
          {permissions.allowedUsers && permissions.allowedUsers.length > 0 && (
            <li>
              - {permissions.allowedUsers.length} user(s) have explicit access
            </li>
          )}
          {permissions.deniedUsers && permissions.deniedUsers.length > 0 && (
            <li>- {permissions.deniedUsers.length} user(s) are blocked</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default CommandPermissions;
