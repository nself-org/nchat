"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Permission,
  PermissionCategory,
  EffectivePermissions,
} from "@/lib/admin/roles/role-types";
import {
  PERMISSION_CATEGORIES,
  getPermissionsByCategory,
} from "@/lib/admin/roles/permission-types";
import { PermissionToggle } from "./PermissionToggle";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import * as Icons from "lucide-react";
import { ChevronDown } from "lucide-react";

interface PermissionGroupProps {
  category: PermissionCategory;
  enabledPermissions: Permission[];
  onChange: (permission: Permission, enabled: boolean) => void;
  editorPermissions?: EffectivePermissions | null;
  disabled?: boolean;
  defaultOpen?: boolean;
  showDescriptions?: boolean;
  variant?: "switch" | "checkbox";
  className?: string;
}

/**
 * PermissionGroup - Collapsible group of permissions by category
 */
export function PermissionGroup({
  category,
  enabledPermissions,
  onChange,
  editorPermissions,
  disabled = false,
  defaultOpen = false,
  showDescriptions = true,
  variant = "checkbox",
  className,
}: PermissionGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const categoryDef = PERMISSION_CATEGORIES[category];
  const permissions = getPermissionsByCategory(category);

  // Calculate stats
  const enabledCount = permissions.filter((p) =>
    enabledPermissions.includes(p.id),
  ).length;
  const allEnabled = enabledCount === permissions.length;
  const someEnabled = enabledCount > 0 && enabledCount < permissions.length;

  // Check which permissions can be granted
  const canGrantPermission = (permission: Permission): boolean => {
    if (!editorPermissions) return true;
    if (editorPermissions.isOwner) return true;
    if (!editorPermissions.permissions.includes("manage_roles")) return false;
    if (permission === "administrator" && !editorPermissions.isOwner)
      return false;
    return editorPermissions.permissions.includes(permission);
  };

  // Toggle all permissions in category
  const toggleAll = () => {
    if (disabled) return;

    permissions.forEach((perm) => {
      if (canGrantPermission(perm.id)) {
        onChange(perm.id, !allEnabled);
      }
    });
  };

  const IconComponent = Icons[
    categoryDef.icon as keyof typeof Icons
  ] as React.ElementType;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("rounded-lg border", className)}
    >
      <CollapsibleTrigger className="hover:bg-accent/50 flex w-full items-center gap-3 p-4">
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />

        {IconComponent && (
          <IconComponent className="h-5 w-5 text-muted-foreground" />
        )}

        <div className="flex-1 text-left">
          <div className="font-medium">{categoryDef.name}</div>
          <div className="text-sm text-muted-foreground">
            {categoryDef.description}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {enabledCount}/{permissions.length}
          </span>

          <div
            role="button"
            tabIndex={0}
            aria-label="Toggle all permissions"
            onClick={(e) => {
              e.stopPropagation();
              toggleAll();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                toggleAll();
              }
            }}
            className="flex items-center"
          >
            <Checkbox
              checked={
                allEnabled ? true : someEnabled ? "indeterminate" : false
              }
              disabled={disabled}
              className="pointer-events-none"
            />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-1 border-t p-4">
          {permissions.map((perm) => {
            const isEnabled = enabledPermissions.includes(perm.id);
            const canGrant = canGrantPermission(perm.id);

            return (
              <PermissionToggle
                key={perm.id}
                permission={perm.id}
                enabled={isEnabled}
                onChange={(enabled) => onChange(perm.id, enabled)}
                variant={variant}
                disabled={disabled || !canGrant}
                showDescription={showDescriptions}
                showWarnings
              />
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * PermissionGroupList - List of all permission groups
 */
interface PermissionGroupListProps {
  enabledPermissions: Permission[];
  onChange: (permission: Permission, enabled: boolean) => void;
  editorPermissions?: EffectivePermissions | null;
  disabled?: boolean;
  defaultOpenCategories?: PermissionCategory[];
  showDescriptions?: boolean;
  variant?: "switch" | "checkbox";
  className?: string;
}

export function PermissionGroupList({
  enabledPermissions,
  onChange,
  editorPermissions,
  disabled = false,
  defaultOpenCategories = ["general", "messages"],
  showDescriptions = true,
  variant = "checkbox",
  className,
}: PermissionGroupListProps) {
  const categories = Object.keys(PERMISSION_CATEGORIES) as PermissionCategory[];

  return (
    <div className={cn("space-y-3", className)}>
      {categories.map((category) => (
        <PermissionGroup
          key={category}
          category={category}
          enabledPermissions={enabledPermissions}
          onChange={onChange}
          editorPermissions={editorPermissions}
          disabled={disabled}
          defaultOpen={defaultOpenCategories.includes(category)}
          showDescriptions={showDescriptions}
          variant={variant}
        />
      ))}
    </div>
  );
}

export default PermissionGroup;
