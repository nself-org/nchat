"use client";

/**
 * Role Editor Component
 *
 * Enterprise RBAC role management with:
 * - Custom role creation
 * - Permission management
 * - Role templates
 * - Role inheritance
 */

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CustomRole,
  RoleTemplate,
  ROLE_TEMPLATES,
  getCustomRoleService,
  canAssignRole,
} from "@/lib/rbac/custom-roles";
import { Permission } from "@/lib/admin/roles/role-types";
import { Permission as AuthPermission } from "@/lib/auth/permissions";
import { UserRole } from "@/lib/auth/roles";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Edit,
  Shield,
  Users,
  Star,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RolePermissions } from "@/components/admin/roles/RolePermissions";

// ============================================================================
// Main Component
// ============================================================================

export function RoleEditor() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = () => {
    const service = getCustomRoleService();
    setRoles(service.getAllRoles());
  };

  const handleCreateRole = async (data: Partial<CustomRole>) => {
    try {
      const service = getCustomRoleService();
      await service.createRole(
        {
          name: data.name || "New Role",
          slug: data.slug || "new-role",
          color: data.color || "#6B7280",
          permissions: data.permissions || [],
          isSystem: false,
          isDefault: false,
          priority: data.priority || 50,
          ...data,
        } as Omit<CustomRole, "id" | "createdAt" | "updatedAt" | "createdBy">,
        "current-user-id", // Replace with actual user ID
      );
      loadRoles();
      setIsCreating(false);

      toast({
        title: "Role Created",
        description: `${data.name} has been created successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (id: string, updates: Partial<CustomRole>) => {
    try {
      const service = getCustomRoleService();
      await service.updateRole(id, updates, "current-user-id");
      loadRoles();
      setIsEditing(false);
      setSelectedRole(null);

      toast({
        title: "Role Updated",
        description: "Role settings have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const service = getCustomRoleService();
      await service.deleteRole(id, "current-user-id");
      loadRoles();
      setSelectedRole(null);

      toast({
        title: "Role Deleted",
        description: "The role has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleDuplicateRole = async (role: CustomRole) => {
    const duplicated = {
      ...role,
      name: `${role.name} (Copy)`,
      slug: `${role.slug}-copy`,
      isSystem: false,
    };
    await handleCreateRole(duplicated);
  };

  const handleCreateFromTemplate = async (template: RoleTemplate) => {
    try {
      const service = getCustomRoleService();
      await service.createFromTemplate(template.id, {}, "current-user-id");
      loadRoles();
      setShowTemplates(false);

      toast({
        title: "Role Created from Template",
        description: `${template.name} has been created.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground">
            Create and manage custom roles with fine-grained permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplates(true)}>
            <Star className="mr-2 h-4 w-4" />
            Templates
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Roles List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card
            key={role.id}
            className={cn(role.isSystem && "border-primary/50")}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <CardTitle>{role.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  {role.isSystem && (
                    <Badge variant="secondary" className="text-xs">
                      System
                    </Badge>
                  )}
                  {role.isDefault && (
                    <Badge variant="default" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              </div>
              {role.description && (
                <CardDescription>{role.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Permissions</span>
                <span className="font-medium">{role.permissions.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Priority</span>
                <Badge variant="outline">{role.priority}</Badge>
              </div>
              {role.baseRole && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Base Role</span>
                  <Badge variant="secondary">{role.baseRole}</Badge>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedRole(role);
                    setIsEditing(true);
                  }}
                  disabled={role.isSystem}
                >
                  <Edit className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicateRole(role)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {!role.isSystem && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteRole(role.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {roles.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No Custom Roles</h3>
            <p className="mb-4 text-muted-foreground">
              Create custom roles with specific permissions
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      {(isCreating || isEditing) && (
        <RoleEditorDialog
          role={isEditing ? selectedRole : null}
          open={isCreating || isEditing}
          onClose={() => {
            setIsCreating(false);
            setIsEditing(false);
            setSelectedRole(null);
          }}
          onSave={(data) => {
            if (isEditing && selectedRole) {
              handleUpdateRole(selectedRole.id, data);
            } else {
              handleCreateRole(data);
            }
          }}
        />
      )}

      {/* Templates Dialog */}
      {showTemplates && (
        <RoleTemplatesDialog
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelect={handleCreateFromTemplate}
        />
      )}
    </div>
  );
}

// ============================================================================
// Role Editor Dialog
// ============================================================================

interface RoleEditorDialogProps {
  role: CustomRole | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<CustomRole>) => void;
}

function RoleEditorDialog({
  role,
  open,
  onClose,
  onSave,
}: RoleEditorDialogProps) {
  const [formData, setFormData] = useState<Partial<CustomRole>>(
    role || {
      name: "",
      slug: "",
      description: "",
      color: "#6B7280",
      permissions: [],
      isDefault: false,
      priority: 50,
    },
  );

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setFormData({ ...formData, name, slug });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? "Edit Role" : "Create Custom Role"}</DialogTitle>
          <DialogDescription>
            Configure role settings and permissions
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Content Manager"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="content-manager"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe this role's purpose and responsibilities"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-20"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    placeholder="#6B7280"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority (1-100)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseRole">Base Role (Optional)</Label>
              <Select
                value={formData.baseRole}
                onValueChange={(value) =>
                  setFormData({ ...formData, baseRole: value as UserRole })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No base role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Inherit permissions from a base system role
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isDefault: checked })
                }
              />
              <Label htmlFor="isDefault">
                Set as default role for new users
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <RolePermissions
              permissions={
                (formData.permissions || []) as unknown as Permission[]
              }
              onChange={(permissions) =>
                setFormData({
                  ...formData,
                  permissions: permissions as unknown as AuthPermission[],
                })
              }
              showDescriptions={true}
            />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxUsers">Maximum Users (Optional)</Label>
              <Input
                id="maxUsers"
                type="number"
                min="0"
                value={formData.maxUsers || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxUsers: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                placeholder="No limit"
              />
              <p className="text-xs text-muted-foreground">
                Limit the number of users who can have this role
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAfter">Auto-Expire After (Days)</Label>
              <Input
                id="expiresAfter"
                type="number"
                min="0"
                value={formData.expiresAfter || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiresAfter: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                placeholder="Never expires"
              />
              <p className="text-xs text-muted-foreground">
                Automatically remove role after specified days
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(formData)}>
            {role ? "Update Role" : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Role Templates Dialog
// ============================================================================

interface RoleTemplatesDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: RoleTemplate) => void;
}

function RoleTemplatesDialog({
  open,
  onClose,
  onSelect,
}: RoleTemplatesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Role Templates</DialogTitle>
          <DialogDescription>
            Quick start with pre-configured role templates
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {ROLE_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:border-primary"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {template.name}
                  {template.recommended && (
                    <Badge variant="default" className="text-xs">
                      <Star className="mr-1 h-3 w-3" />
                      Recommended
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Permissions:</span>
                  <span className="font-medium">
                    {template.permissions.length}
                  </span>
                </div>
                {template.baseRole && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Base Role:</span>
                    <Badge variant="secondary">{template.baseRole}</Badge>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => onSelect(template)}>
                  Use Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RoleEditor;
