"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Role,
  Permission,
  CreateRoleInput,
  UpdateRoleInput,
  EffectivePermissions,
} from "@/lib/admin/roles/role-types";
import { validateRole } from "@/lib/admin/roles/role-manager";
import { ROLE_COLOR_PRESETS } from "@/lib/admin/roles/role-defaults";
import { RoleColor } from "./RoleColor";
import { RoleIcon } from "./RoleIcon";
import { RolePermissions } from "./RolePermissions";
import { RoleBadge } from "./RoleBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Save,
  X,
  Eye,
  Settings,
  Shield,
  Palette,
} from "lucide-react";

interface RoleEditorProps {
  role?: Partial<Role>;
  isNew?: boolean;
  editorPermissions?: EffectivePermissions | null;
  isSubmitting?: boolean;
  onSave: (data: CreateRoleInput | UpdateRoleInput) => void;
  onCancel: () => void;
  onChange?: (data: Partial<Role>) => void;
  className?: string;
}

/**
 * RoleEditor - Full role editing interface with tabs
 */
export function RoleEditor({
  role,
  isNew = false,
  editorPermissions,
  isSubmitting = false,
  onSave,
  onCancel,
  onChange,
  className,
}: RoleEditorProps) {
  const [formData, setFormData] = React.useState<Partial<Role>>({
    name: "",
    description: "",
    color: ROLE_COLOR_PRESETS[0].color,
    icon: undefined,
    isDefault: false,
    isMentionable: false,
    permissions: [],
    ...role,
  });

  const [errors, setErrors] = React.useState<string[]>([]);
  const [activeTab, setActiveTab] = React.useState("general");

  const updateField = <K extends keyof Role>(field: K, value: Role[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    onChange?.({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const validationErrors = validateRole(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);

    if (isNew) {
      onSave({
        name: formData.name!,
        description: formData.description,
        color: formData.color,
        icon: formData.icon,
        isDefault: formData.isDefault,
        isMentionable: formData.isMentionable,
        permissions: formData.permissions,
      } as CreateRoleInput);
    } else {
      onSave({
        name: formData.name,
        description: formData.description,
        color: formData.color,
        icon: formData.icon,
        isDefault: formData.isDefault,
        isMentionable: formData.isMentionable,
        permissions: formData.permissions,
      } as UpdateRoleInput);
    }
  };

  const isBuiltIn = role?.isBuiltIn ?? false;

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {/* Header with preview */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {isNew ? "Create New Role" : "Edit Role"}
          </h2>
          {isBuiltIn && (
            <p className="text-sm text-amber-500">
              This is a built-in role. Some settings cannot be changed.
            </p>
          )}
        </div>

        {/* Live preview */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Preview:</span>
          <RoleBadge
            name={formData.name || "Role Name"}
            color={formData.color || "#6B7280"}
            icon={formData.icon}
            size="lg"
          />
        </div>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 rounded-lg border border-destructive p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle size={16} />
            <span className="font-medium">
              Please fix the following errors:
            </span>
          </div>
          <ul className="mt-2 list-inside list-disc text-sm text-destructive">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings size={14} />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette size={14} />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield size={14} />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye size={14} />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Enter role name"
                disabled={isBuiltIn}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {formData.name?.length || 0}/100 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                type="number"
                value={formData.position || ""}
                onChange={(e) =>
                  updateField("position", parseInt(e.target.value) || 0)
                }
                placeholder="Role position"
                disabled={isBuiltIn}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Higher positions have more authority
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe this role's purpose..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {formData.description?.length || 0}/500 characters
            </p>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Role Settings</h3>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isDefault">Default Role</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically assign this role to new members
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => updateField("isDefault", checked)}
                disabled={isBuiltIn && formData.isDefault}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isMentionable">Mentionable</Label>
                <p className="text-sm text-muted-foreground">
                  Allow anyone to @mention this role
                </p>
              </div>
              <Switch
                id="isMentionable"
                checked={formData.isMentionable}
                onCheckedChange={(checked) =>
                  updateField("isMentionable", checked)
                }
              />
            </div>
          </div>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <RoleColor
            value={formData.color || "#6B7280"}
            onChange={(color) => updateField("color", color)}
          />

          <div className="border-t pt-6">
            <RoleIcon
              value={formData.icon}
              onChange={(icon) => updateField("icon", icon)}
              color={formData.color}
            />
          </div>
        </TabsContent>

        {/* Permissions */}
        <TabsContent value="permissions" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Configure what members with this role can do. Permissions marked
            with a warning are sensitive and should be granted carefully.
          </div>

          <RolePermissions
            permissions={formData.permissions || []}
            onChange={(permissions) => updateField("permissions", permissions)}
            editorPermissions={editorPermissions}
            showDescriptions
          />
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview" className="space-y-4">
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 font-medium">Role Preview</h3>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Badge:</span>
                <RoleBadge
                  name={formData.name || "Role Name"}
                  color={formData.color || "#6B7280"}
                  icon={formData.icon}
                  size="sm"
                />
                <RoleBadge
                  name={formData.name || "Role Name"}
                  color={formData.color || "#6B7280"}
                  icon={formData.icon}
                  size="md"
                />
                <RoleBadge
                  name={formData.name || "Role Name"}
                  color={formData.color || "#6B7280"}
                  icon={formData.icon}
                  size="lg"
                />
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Name color:
                </span>
                <span style={{ color: formData.color }}>
                  {formData.name || "Role Name"}
                </span>
              </div>

              {formData.description && (
                <div>
                  <span className="text-sm text-muted-foreground">
                    Description:
                  </span>
                  <p className="mt-1">{formData.description}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Settings:</span>
                {formData.isDefault && (
                  <span className="rounded bg-blue-500/10 px-2 py-0.5 text-blue-500">
                    Default
                  </span>
                )}
                {formData.isMentionable && (
                  <span className="rounded bg-green-500/10 px-2 py-0.5 text-green-500">
                    Mentionable
                  </span>
                )}
              </div>

              <div>
                <span className="text-sm text-muted-foreground">
                  Permissions: {formData.permissions?.length || 0} enabled
                </span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : isNew ? "Create Role" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export default RoleEditor;
