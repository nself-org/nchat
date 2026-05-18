"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Role } from "@/lib/admin/roles/role-types";
import { RoleBadge } from "./RoleBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Users } from "lucide-react";

interface DeleteRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  memberCount?: number;
  availableRoles?: Role[]; // Roles to migrate members to
  onDelete: (
    roleId: string,
    migrateToRoleId?: string,
  ) => Promise<{ success: boolean; errors: string[] }>;
}

/**
 * DeleteRoleModal - Confirmation dialog for deleting a role
 */
export function DeleteRoleModal({
  open,
  onOpenChange,
  role,
  memberCount = 0,
  availableRoles = [],
  onDelete,
}: DeleteRoleModalProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [migrateToRoleId, setMigrateToRoleId] = React.useState<string>("");
  const [errors, setErrors] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setConfirmText("");
      setMigrateToRoleId("");
      setErrors([]);
    }
  }, [open]);

  if (!role) return null;

  const isConfirmed = confirmText.toLowerCase() === role.name.toLowerCase();
  const hasMembersToMigrate = memberCount > 0;
  const needsMigration = hasMembersToMigrate && !migrateToRoleId;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    if (needsMigration) {
      setErrors(["Please select a role to migrate members to"]);
      return;
    }

    setIsDeleting(true);
    setErrors([]);

    try {
      const result = await onDelete(
        role.id,
        hasMembersToMigrate ? migrateToRoleId : undefined,
      );

      if (result.success) {
        onOpenChange(false);
      } else {
        setErrors(result.errors);
      }
    } catch (error) {
      setErrors(["An unexpected error occurred"]);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRoles = availableRoles.filter(
    (r) => r.id !== role.id && !r.isBuiltIn,
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Role
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Are you sure you want to delete this role? This action cannot be
              undone.
            </p>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <RoleBadge
                name={role.name}
                color={role.color}
                icon={role.icon}
                size="lg"
              />
              {role.description && (
                <span className="text-sm">{role.description}</span>
              )}
            </div>

            {/* Member migration */}
            {hasMembersToMigrate && (
              <div className="space-y-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                <div className="flex items-center gap-2 text-amber-500">
                  <Users size={16} />
                  <span className="font-medium">
                    {memberCount} member{memberCount !== 1 ? "s" : ""} will lose
                    this role
                  </span>
                </div>

                {filteredRoles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Migrate members to another role (optional)</Label>
                    <Select
                      value={migrateToRoleId}
                      onValueChange={setMigrateToRoleId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No migration</SelectItem>
                        {filteredRoles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: r.color }}
                              />
                              {r.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Members will be assigned to this role after deletion
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Confirmation input */}
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <strong className="text-foreground">{role.name}</strong> to
                confirm
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={role.name}
                autoComplete="off"
              />
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-destructive/10 rounded-lg border border-destructive p-3">
                <ul className="list-inside list-disc text-sm text-destructive">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
          >
            {isDeleting ? "Deleting..." : "Delete Role"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteRoleModal;
