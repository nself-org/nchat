"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Role,
  CreateRoleInput,
  EffectivePermissions,
} from "@/lib/admin/roles/role-types";
import { RoleBadge } from "./RoleBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, AlertCircle } from "lucide-react";

interface DuplicateRoleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  editorPermissions?: EffectivePermissions | null;
  onDuplicate: (
    input: CreateRoleInput,
  ) => Promise<{ success: boolean; errors: string[] }>;
}

/**
 * DuplicateRole - Dialog for duplicating an existing role
 */
export function DuplicateRole({
  open,
  onOpenChange,
  role,
  editorPermissions,
  onDuplicate,
}: DuplicateRoleProps) {
  const [newName, setNewName] = React.useState("");
  const [copyPermissions, setCopyPermissions] = React.useState(true);
  const [copyAppearance, setCopyAppearance] = React.useState(true);
  const [copySettings, setCopySettings] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open && role) {
      setNewName(`${role.name} (Copy)`);
      setCopyPermissions(true);
      setCopyAppearance(true);
      setCopySettings(false);
      setErrors([]);
    }
  }, [open, role]);

  if (!role) return null;

  const handleDuplicate = async () => {
    if (!newName.trim()) {
      setErrors(["Role name is required"]);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const input: CreateRoleInput = {
        name: newName.trim(),
        description: role.description,
        color: copyAppearance ? role.color : "#6B7280",
        icon: copyAppearance ? role.icon : undefined,
        permissions: copyPermissions ? [...role.permissions] : [],
        isMentionable: copySettings ? role.isMentionable : false,
        isDefault: false, // Never copy isDefault
      };

      const result = await onDuplicate(input);

      if (result.success) {
        onOpenChange(false);
      } else {
        setErrors(result.errors);
      }
    } catch (error) {
      setErrors(["An unexpected error occurred"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy size={18} />
            Duplicate Role
          </DialogTitle>
          <DialogDescription>
            Create a copy of this role with a new name
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source role preview */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <span className="text-sm text-muted-foreground">Source:</span>
            <RoleBadge name={role.name} color={role.color} icon={role.icon} />
          </div>

          {/* New name input */}
          <div className="space-y-2">
            <Label htmlFor="newName">New Role Name *</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter role name"
              maxLength={100}
            />
          </div>

          {/* Copy options */}
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="font-medium">Copy Options</h4>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="copyPermissions"
                checked={copyPermissions}
                onCheckedChange={(checked) =>
                  setCopyPermissions(checked as boolean)
                }
              />
              <Label htmlFor="copyPermissions" className="cursor-pointer">
                Copy permissions ({role.permissions.length} permissions)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="copyAppearance"
                checked={copyAppearance}
                onCheckedChange={(checked) =>
                  setCopyAppearance(checked as boolean)
                }
              />
              <Label htmlFor="copyAppearance" className="cursor-pointer">
                Copy appearance (color and icon)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="copySettings"
                checked={copySettings}
                onCheckedChange={(checked) =>
                  setCopySettings(checked as boolean)
                }
              />
              <Label htmlFor="copySettings" className="cursor-pointer">
                Copy settings (mentionable)
              </Label>
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <span className="text-sm text-muted-foreground">Preview:</span>
            <RoleBadge
              name={newName || "New Role"}
              color={copyAppearance ? role.color : "#6B7280"}
              icon={copyAppearance ? role.icon : undefined}
            />
          </div>

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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={isSubmitting}>
            <Copy className="mr-2 h-4 w-4" />
            {isSubmitting ? "Creating..." : "Create Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DuplicateRole;
