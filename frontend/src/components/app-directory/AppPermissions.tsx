"use client";

import * as React from "react";
import {
  Eye,
  MessageSquare,
  FileText,
  Heart,
  Bell,
  Webhook,
  Terminal,
  User,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getPermissionDefinition,
  getPermissionGroup,
  getPermissionRiskLevel,
  groupPermissions,
  getPermissionsSummary,
  PERMISSION_GROUPS,
  type PermissionGroup,
} from "@/lib/app-directory/app-permissions";
import type {
  AppPermission,
  PermissionScope,
} from "@/lib/app-directory/app-types";

interface AppPermissionsProps {
  permissions: AppPermission[];
  interactive?: boolean;
  selectedPermissions?: PermissionScope[];
  onPermissionToggle?: (scope: PermissionScope, selected: boolean) => void;
  className?: string;
}

// Icon mapping for permission groups
const GROUP_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  basic: Eye,
  messaging: MessageSquare,
  files: FileText,
  interactions: Heart,
  notifications: Bell,
  webhooks: Webhook,
  commands: Terminal,
  identity: User,
  admin: Settings,
};

export function AppPermissions({
  permissions,
  interactive = false,
  selectedPermissions = [],
  onPermissionToggle,
  className,
}: AppPermissionsProps) {
  const groupedPermissions = groupPermissions(permissions);
  const summary = getPermissionsSummary(permissions);

  // Convert Map to array for rendering
  const groups = Array.from(groupedPermissions.entries());

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary */}
      <div className="flex items-center gap-4 rounded-lg bg-muted p-3">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {summary.total} permission{summary.total !== 1 ? "s" : ""} requested
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.required} required, {summary.optional} optional
          </p>
        </div>
        {summary.highRisk > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {summary.highRisk} sensitive
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  This app requests {summary.highRisk} high-risk permission(s)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Grouped Permissions */}
      <div className="space-y-3">
        {groups.map(([group, groupPermissions]) => (
          <PermissionGroupCard
            key={group.id}
            group={group}
            permissions={groupPermissions}
            interactive={interactive}
            selectedPermissions={selectedPermissions}
            onPermissionToggle={onPermissionToggle}
          />
        ))}
      </div>

      {/* Permission Legend */}
      <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-destructive" />
          <span>Required</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-muted-foreground" />
          <span>Optional</span>
        </div>
      </div>
    </div>
  );
}

interface PermissionGroupCardProps {
  group: PermissionGroup;
  permissions: AppPermission[];
  interactive: boolean;
  selectedPermissions: PermissionScope[];
  onPermissionToggle?: (scope: PermissionScope, selected: boolean) => void;
}

function PermissionGroupCard({
  group,
  permissions,
  interactive,
  selectedPermissions,
  onPermissionToggle,
}: PermissionGroupCardProps) {
  const Icon = GROUP_ICONS[group.id] || Shield;

  const riskColors = {
    low: "text-green-500 bg-green-500/10",
    medium: "text-yellow-500 bg-yellow-500/10",
    high: "text-red-500 bg-red-500/10",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("rounded-lg p-2", riskColors[group.riskLevel])}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">
                {group.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {group.description}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              group.riskLevel === "high" && "border-red-200 text-red-600",
              group.riskLevel === "medium" &&
                "border-yellow-200 text-yellow-600",
              group.riskLevel === "low" && "border-green-200 text-green-600",
            )}
          >
            {group.riskLevel} risk
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {permissions.map((permission) => (
            <PermissionItem
              key={permission.scope}
              permission={permission}
              interactive={interactive}
              isSelected={selectedPermissions.includes(permission.scope)}
              onToggle={(selected) =>
                onPermissionToggle?.(permission.scope, selected)
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface PermissionItemProps {
  permission: AppPermission;
  interactive: boolean;
  isSelected: boolean;
  onToggle: (selected: boolean) => void;
}

function PermissionItem({
  permission,
  interactive,
  isSelected,
  onToggle,
}: PermissionItemProps) {
  const definition = getPermissionDefinition(permission.scope);
  const isRequired = permission.level === "required";
  const riskLevel = getPermissionRiskLevel(permission.scope);

  const isClickable = interactive && !isRequired;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onToggle(!isSelected);
    }
  };

  const handleClick = () => {
    if (isClickable) {
      onToggle(!isSelected);
    }
  };

  const interactiveProps = isClickable
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
      }
    : {};

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg p-2 transition-colors",
        isClickable && "cursor-pointer hover:bg-muted",
        interactive && isSelected && "bg-primary/5",
        !interactive && "bg-muted/50",
      )}
      {...interactiveProps}
    >
      {interactive && (
        <div className="pt-0.5">
          {isRequired ? (
            <div className="flex h-4 w-4 items-center justify-center rounded border border-primary bg-primary">
              <CheckCircle className="text-primary-foreground h-3 w-3" />
            </div>
          ) : (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onToggle(e.target.checked)}
              className="h-4 w-4 rounded border-input"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{definition.label}</span>
          {isRequired && (
            <Badge variant="secondary" className="px-1.5 text-xs">
              Required
            </Badge>
          )}
          {riskLevel === "high" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>This is a sensitive permission</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {definition.description}
        </p>
        {permission.reason && (
          <p className="mt-1 text-xs italic text-muted-foreground">
            Why: {permission.reason}
          </p>
        )}
      </div>
    </div>
  );

  return content;
}

// Compact permission display for cards/lists
interface PermissionBadgesProps {
  permissions: AppPermission[];
  max?: number;
  className?: string;
}

export function PermissionBadges({
  permissions,
  max = 3,
  className,
}: PermissionBadgesProps) {
  const displayPermissions = permissions.slice(0, max);
  const remaining = permissions.length - max;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {displayPermissions.map((permission) => {
        const definition = getPermissionDefinition(permission.scope);
        const riskLevel = getPermissionRiskLevel(permission.scope);
        return (
          <Badge
            key={permission.scope}
            variant="outline"
            className={cn(
              "text-xs",
              riskLevel === "high" && "border-red-200 text-red-600",
              riskLevel === "medium" && "border-yellow-200 text-yellow-600",
            )}
          >
            {definition.label}
          </Badge>
        );
      })}
      {remaining > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}
