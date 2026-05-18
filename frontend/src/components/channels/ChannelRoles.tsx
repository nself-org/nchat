"use client";

import * as React from "react";
import { useState } from "react";
import { Shield, Crown, Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelRolesProps {
  channel: Channel;
  isAdmin?: boolean;
  onCreateRole?: (role: ChannelRole) => Promise<void>;
  onUpdateRole?: (
    roleId: string,
    updates: Partial<ChannelRole>,
  ) => Promise<void>;
  onDeleteRole?: (roleId: string) => Promise<void>;
  className?: string;
}

export interface ChannelRole {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: RolePermissions;
  memberCount: number;
}

export interface RolePermissions {
  canPost: boolean;
  canReact: boolean;
  canThread: boolean;
  canUpload: boolean;
  canMention: boolean;
  canInvite: boolean;
  canModerate: boolean;
  canManageRoles: boolean;
  canManageChannel: boolean;
}

// Default roles
const DEFAULT_ROLES: ChannelRole[] = [
  {
    id: "owner",
    name: "Owner",
    color: "#fbbf24",
    position: 0,
    permissions: {
      canPost: true,
      canReact: true,
      canThread: true,
      canUpload: true,
      canMention: true,
      canInvite: true,
      canModerate: true,
      canManageRoles: true,
      canManageChannel: true,
    },
    memberCount: 1,
  },
  {
    id: "admin",
    name: "Admin",
    color: "#3b82f6",
    position: 1,
    permissions: {
      canPost: true,
      canReact: true,
      canThread: true,
      canUpload: true,
      canMention: true,
      canInvite: true,
      canModerate: true,
      canManageRoles: false,
      canManageChannel: false,
    },
    memberCount: 2,
  },
  {
    id: "member",
    name: "Member",
    color: "#6b7280",
    position: 2,
    permissions: {
      canPost: true,
      canReact: true,
      canThread: true,
      canUpload: true,
      canMention: false,
      canInvite: false,
      canModerate: false,
      canManageRoles: false,
      canManageChannel: false,
    },
    memberCount: 15,
  },
];

// ============================================================================
// Component
// ============================================================================

export function ChannelRoles({
  channel,
  isAdmin = false,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  className,
}: ChannelRolesProps) {
  const [roles] = useState<ChannelRole[]>(DEFAULT_ROLES);
  const [editingRole, setEditingRole] = useState<ChannelRole | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveRole = async (role: ChannelRole) => {
    try {
      setIsSaving(true);
      if (editingRole) {
        await onUpdateRole?.(role.id, role);
      } else {
        await onCreateRole?.(role);
      }
      setEditingRole(null);
      setShowCreateDialog(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      setIsSaving(true);
      await onDeleteRole?.(roleId);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Channel Roles
              </CardTitle>
              <CardDescription>
                Manage roles and permissions for channel members
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.name}</span>
                      {role.id === "owner" && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {role.memberCount} member{role.memberCount !== 1 && "s"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.canModerate && (
                      <Badge variant="outline" className="text-xs">
                        Mod
                      </Badge>
                    )}
                    {role.permissions.canManageChannel && (
                      <Badge variant="outline" className="text-xs">
                        Manage
                      </Badge>
                    )}
                  </div>
                  {isAdmin && role.id !== "owner" && role.id !== "member" && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingRole(role)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Role Dialog */}
      <RoleDialog
        open={showCreateDialog || editingRole !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingRole(null);
          }
        }}
        role={editingRole}
        onSave={handleSaveRole}
        isSaving={isSaving}
      />
    </div>
  );
}

// ============================================================================
// Role Dialog
// ============================================================================

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: ChannelRole | null;
  onSave: (role: ChannelRole) => void;
  isSaving: boolean;
}

function RoleDialog({
  open,
  onOpenChange,
  role,
  onSave,
  isSaving,
}: RoleDialogProps) {
  const [formData, setFormData] = useState<Partial<ChannelRole>>(
    role || {
      name: "",
      color: "#6b7280",
      permissions: {
        canPost: true,
        canReact: true,
        canThread: true,
        canUpload: true,
        canMention: false,
        canInvite: false,
        canModerate: false,
        canManageRoles: false,
        canManageChannel: false,
      },
    },
  );

  React.useEffect(() => {
    if (role) {
      setFormData(role);
    } else {
      setFormData({
        name: "",
        color: "#6b7280",
        permissions: {
          canPost: true,
          canReact: true,
          canThread: true,
          canUpload: true,
          canMention: false,
          canInvite: false,
          canModerate: false,
          canManageRoles: false,
          canManageChannel: false,
        },
      });
    }
  }, [role]);

  const handlePermissionChange = (
    key: keyof RolePermissions,
    value: boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions!,
        [key]: value,
      },
    }));
  };

  const handleSave = () => {
    onSave({
      id: role?.id || `role-${Date.now()}`,
      name: formData.name || "New Role",
      color: formData.color || "#6b7280",
      position: role?.position ?? 99,
      permissions: formData.permissions!,
      memberCount: role?.memberCount ?? 0,
    });
  };

  const COLORS = [
    "#ef4444",
    "#f97316",
    "#fbbf24",
    "#84cc16",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#ec4899",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? "Edit Role" : "Create Role"}</DialogTitle>
          <DialogDescription>
            Configure role name and permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Role Name</Label>
            <Input
              value={formData.name || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Role name"
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, color }))}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-all",
                    formData.color === color
                      ? "scale-110 border-foreground"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            <div className="space-y-2">
              {[
                { key: "canPost", label: "Send messages" },
                { key: "canReact", label: "Add reactions" },
                { key: "canThread", label: "Create threads" },
                { key: "canUpload", label: "Upload files" },
                { key: "canMention", label: "Use @channel/@here" },
                { key: "canInvite", label: "Invite members" },
                { key: "canModerate", label: "Moderate messages" },
                { key: "canManageRoles", label: "Manage roles" },
                { key: "canManageChannel", label: "Manage channel" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={
                      formData.permissions?.[key as keyof RolePermissions] ??
                      false
                    }
                    onCheckedChange={(checked) =>
                      handlePermissionChange(
                        key as keyof RolePermissions,
                        checked,
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {role ? "Save Changes" : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

ChannelRoles.displayName = "ChannelRoles";
