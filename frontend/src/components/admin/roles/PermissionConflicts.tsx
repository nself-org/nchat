"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Role, Permission } from "@/lib/admin/roles/role-types";
import {
  detectPermissionConflicts,
  PermissionConflict,
} from "@/lib/admin/roles/role-inheritance";
import { PERMISSIONS } from "@/lib/admin/roles/permission-types";
import { RoleBadge } from "./RoleBadge";
import { AlertTriangle, AlertCircle, Shield, Info, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface PermissionConflictsProps {
  userRoles: Role[];
  onDismiss?: (conflictId: string) => void;
  dismissedConflicts?: string[];
  showAll?: boolean;
  className?: string;
}

/**
 * PermissionConflicts - Shows potential permission conflicts and warnings
 */
export function PermissionConflicts({
  userRoles,
  onDismiss,
  dismissedConflicts = [],
  showAll = false,
  className,
}: PermissionConflictsProps) {
  const conflicts = React.useMemo(
    () => detectPermissionConflicts(userRoles),
    [userRoles],
  );

  // Filter dismissed conflicts
  const visibleConflicts = showAll
    ? conflicts
    : conflicts.filter(
        (c) => !dismissedConflicts.includes(`${c.permission}-${c.type}`),
      );

  if (visibleConflicts.length === 0) {
    return null;
  }

  // Group by type
  const escalationConflicts = visibleConflicts.filter(
    (c) => c.type === "escalation",
  );
  const dangerousConflicts = visibleConflicts.filter(
    (c) => c.type === "dangerous",
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Escalation warnings */}
      {escalationConflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Privilege Escalation Risk</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              {escalationConflicts.map((conflict) => (
                <ConflictItem
                  key={`${conflict.permission}-${conflict.type}`}
                  conflict={conflict}
                  onDismiss={
                    onDismiss
                      ? () =>
                          onDismiss(`${conflict.permission}-${conflict.type}`)
                      : undefined
                  }
                />
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Dangerous permission warnings */}
      {dangerousConflicts.length > 0 && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Shield className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-500">
            Sensitive Permissions Detected
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              {dangerousConflicts.map((conflict) => (
                <ConflictItem
                  key={`${conflict.permission}-${conflict.type}`}
                  conflict={conflict}
                  onDismiss={
                    onDismiss
                      ? () =>
                          onDismiss(`${conflict.permission}-${conflict.type}`)
                      : undefined
                  }
                />
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * ConflictItem - Single conflict display
 */
interface ConflictItemProps {
  conflict: PermissionConflict;
  onDismiss?: () => void;
}

function ConflictItem({ conflict, onDismiss }: ConflictItemProps) {
  const permDef = PERMISSIONS[conflict.permission];

  return (
    <div className="bg-background/50 flex items-start justify-between gap-3 rounded-md p-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {permDef?.name ?? conflict.permission}
          </span>
        </div>
        <p className="text-sm opacity-90">{conflict.message}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {conflict.roles.map((role) => (
            <RoleBadge
              key={role.id}
              name={role.name}
              color={role.color}
              size="sm"
              showIcon={false}
            />
          ))}
        </div>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onDismiss}
        >
          <X size={14} />
        </Button>
      )}
    </div>
  );
}

/**
 * PermissionConflictSummary - Compact summary of conflicts
 */
interface PermissionConflictSummaryProps {
  userRoles: Role[];
  className?: string;
}

export function PermissionConflictSummary({
  userRoles,
  className,
}: PermissionConflictSummaryProps) {
  const conflicts = React.useMemo(
    () => detectPermissionConflicts(userRoles),
    [userRoles],
  );

  if (conflicts.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-green-500",
          className,
        )}
      >
        <div className="h-2 w-2 rounded-full bg-green-500" />
        No permission conflicts detected
      </div>
    );
  }

  const escalationCount = conflicts.filter(
    (c) => c.type === "escalation",
  ).length;
  const dangerousCount = conflicts.filter((c) => c.type === "dangerous").length;

  return (
    <div className={cn("space-y-1", className)}>
      {escalationCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle size={14} />
          {escalationCount} escalation risk{escalationCount !== 1 ? "s" : ""}
        </div>
      )}
      {dangerousCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-500">
          <Shield size={14} />
          {dangerousCount} sensitive permission{dangerousCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

/**
 * PermissionSecurityCheck - Full security analysis
 */
interface PermissionSecurityCheckProps {
  userRoles: Role[];
  className?: string;
}

export function PermissionSecurityCheck({
  userRoles,
  className,
}: PermissionSecurityCheckProps) {
  const conflicts = React.useMemo(
    () => detectPermissionConflicts(userRoles),
    [userRoles],
  );

  const hasAdministrator = userRoles.some((r) =>
    r.permissions.includes("administrator"),
  );
  const hasManageRoles = userRoles.some((r) =>
    r.permissions.includes("manage_roles"),
  );
  const hasManageServer = userRoles.some((r) =>
    r.permissions.includes("manage_server"),
  );

  return (
    <div className={cn("space-y-4", className)}>
      <h4 className="font-medium">Security Analysis</h4>

      <div className="space-y-2">
        {/* Administrator check */}
        <SecurityCheckItem
          label="Administrator"
          status={hasAdministrator ? "warning" : "ok"}
          description={
            hasAdministrator
              ? "User has full administrator access"
              : "No administrator permission"
          }
        />

        {/* Manage roles check */}
        <SecurityCheckItem
          label="Role Management"
          status={hasManageRoles ? "info" : "ok"}
          description={
            hasManageRoles
              ? "Can create and manage roles"
              : "Cannot manage roles"
          }
        />

        {/* Server management check */}
        <SecurityCheckItem
          label="Server Settings"
          status={hasManageServer ? "info" : "ok"}
          description={
            hasManageServer
              ? "Can modify server settings"
              : "Cannot modify server settings"
          }
        />

        {/* Conflict count */}
        <SecurityCheckItem
          label="Permission Conflicts"
          status={conflicts.length > 0 ? "warning" : "ok"}
          description={
            conflicts.length > 0
              ? `${conflicts.length} potential issue${conflicts.length !== 1 ? "s" : ""} detected`
              : "No conflicts detected"
          }
        />
      </div>
    </div>
  );
}

interface SecurityCheckItemProps {
  label: string;
  status: "ok" | "info" | "warning" | "error";
  description: string;
}

function SecurityCheckItem({
  label,
  status,
  description,
}: SecurityCheckItemProps) {
  const statusColors = {
    ok: "bg-green-500",
    info: "bg-blue-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
  };

  const statusIcons = {
    ok: null,
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const Icon = statusIcons[status];

  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <div className={cn("h-2 w-2 rounded-full", statusColors[status])} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {Icon && <Icon size={14} className="text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default PermissionConflicts;
