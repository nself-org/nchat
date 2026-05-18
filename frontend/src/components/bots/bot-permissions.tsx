"use client";

import {
  MessageSquare,
  Send,
  Hash,
  Users,
  FileText,
  Upload,
  Terminal,
  Bell,
  UserCircle,
  Webhook,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BotPermission } from "@/graphql/bots";

// ============================================================================
// TYPES
// ============================================================================

export interface BotPermissionsProps {
  permissions: BotPermission[];
  onChange?: (permissions: BotPermission[]) => void;
  readOnly?: boolean;
  showDescriptions?: boolean;
  className?: string;
}

export interface PermissionConfig {
  id: BotPermission;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  riskLevel: "low" | "medium" | "high";
}

// ============================================================================
// PERMISSION CONFIGURATIONS
// ============================================================================

export const PERMISSION_CONFIGS: PermissionConfig[] = [
  {
    id: "read_messages",
    label: "Read Messages",
    description: "View messages in channels where the bot is installed",
    icon: MessageSquare,
    riskLevel: "low",
  },
  {
    id: "send_messages",
    label: "Send Messages",
    description: "Post messages to channels on behalf of the bot",
    icon: Send,
    riskLevel: "low",
  },
  {
    id: "manage_channels",
    label: "Manage Channels",
    description: "Create, edit, and archive channels",
    icon: Hash,
    riskLevel: "high",
  },
  {
    id: "manage_users",
    label: "Manage Users",
    description: "Invite, remove, and modify user roles",
    icon: Users,
    riskLevel: "high",
  },
  {
    id: "read_files",
    label: "Read Files",
    description: "Access files shared in channels",
    icon: FileText,
    riskLevel: "medium",
  },
  {
    id: "upload_files",
    label: "Upload Files",
    description: "Share files and attachments in channels",
    icon: Upload,
    riskLevel: "medium",
  },
  {
    id: "use_slash_commands",
    label: "Slash Commands",
    description: "Register and respond to slash commands",
    icon: Terminal,
    riskLevel: "low",
  },
  {
    id: "send_notifications",
    label: "Send Notifications",
    description: "Send direct notifications to users",
    icon: Bell,
    riskLevel: "medium",
  },
  {
    id: "access_user_data",
    label: "Access User Data",
    description: "View user profiles and presence information",
    icon: UserCircle,
    riskLevel: "medium",
  },
  {
    id: "manage_webhooks",
    label: "Manage Webhooks",
    description: "Create and manage incoming webhooks",
    icon: Webhook,
    riskLevel: "high",
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function getRiskLevelColor(level: "low" | "medium" | "high"): string {
  switch (level) {
    case "low":
      return "text-green-600";
    case "medium":
      return "text-amber-600";
    case "high":
      return "text-red-600";
  }
}

function getRiskLevelBg(level: "low" | "medium" | "high"): string {
  switch (level) {
    case "low":
      return "bg-green-100 dark:bg-green-900/30";
    case "medium":
      return "bg-amber-100 dark:bg-amber-900/30";
    case "high":
      return "bg-red-100 dark:bg-red-900/30";
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BotPermissions({
  permissions,
  onChange,
  readOnly = false,
  showDescriptions = true,
  className,
}: BotPermissionsProps) {
  const handleToggle = (permissionId: BotPermission, enabled: boolean) => {
    if (readOnly || !onChange) return;

    if (enabled) {
      onChange([...permissions, permissionId]);
    } else {
      onChange(permissions.filter((p) => p !== permissionId));
    }
  };

  const hasHighRiskPermissions = permissions.some((p) => {
    const config = PERMISSION_CONFIGS.find((c) => c.id === p);
    return config?.riskLevel === "high";
  });

  return (
    <div className={cn("space-y-4", className)}>
      {hasHighRiskPermissions && !readOnly && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              High-risk permissions requested
            </p>
            <p className="text-amber-700 dark:text-amber-300/80">
              This bot requests elevated permissions. Only grant these if you
              trust the bot developer.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {PERMISSION_CONFIGS.map((config) => {
          const Icon = config.icon;
          const isEnabled = permissions.includes(config.id);

          return (
            <div
              key={config.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                isEnabled
                  ? "border-primary/20 bg-primary/5"
                  : "border-border bg-card",
              )}
            >
              <div
                className={cn(
                  "rounded-lg p-2",
                  isEnabled
                    ? "bg-primary/10"
                    : getRiskLevelBg(config.riskLevel),
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isEnabled
                      ? "text-primary"
                      : getRiskLevelColor(config.riskLevel),
                  )}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`permission-${config.id}`}
                    className="cursor-pointer font-medium"
                  >
                    {config.label}
                  </Label>
                  {config.riskLevel !== "low" && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-xs",
                        config.riskLevel === "high"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                      )}
                    >
                      {config.riskLevel === "high"
                        ? "High risk"
                        : "Medium risk"}
                    </span>
                  )}
                </div>
                {showDescriptions && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {config.description}
                  </p>
                )}
              </div>

              {!readOnly ? (
                <Switch
                  id={`permission-${config.id}`}
                  checked={isEnabled}
                  onCheckedChange={(checked) =>
                    handleToggle(config.id, checked)
                  }
                />
              ) : (
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full",
                    isEnabled
                      ? "text-primary-foreground bg-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {isEnabled ? (
                    <Shield className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-xs">-</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT VERSION
// ============================================================================

export function BotPermissionsCompact({
  permissions,
  className,
}: {
  permissions: BotPermission[];
  className?: string;
}) {
  const enabledConfigs = PERMISSION_CONFIGS.filter((config) =>
    permissions.includes(config.id),
  );

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {enabledConfigs.map((config) => {
        const Icon = config.icon;
        return (
          <div
            key={config.id}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
              getRiskLevelBg(config.riskLevel),
              getRiskLevelColor(config.riskLevel),
            )}
            title={config.description}
          >
            <Icon className="h-3 w-3" />
            <span>{config.label}</span>
          </div>
        );
      })}
      {enabledConfigs.length === 0 && (
        <span className="text-sm text-muted-foreground">No permissions</span>
      )}
    </div>
  );
}

// ============================================================================
// PERMISSION SUMMARY
// ============================================================================

export function BotPermissionsSummary({
  permissions,
  className,
}: {
  permissions: BotPermission[];
  className?: string;
}) {
  const lowCount = permissions.filter((p) => {
    const config = PERMISSION_CONFIGS.find((c) => c.id === p);
    return config?.riskLevel === "low";
  }).length;

  const mediumCount = permissions.filter((p) => {
    const config = PERMISSION_CONFIGS.find((c) => c.id === p);
    return config?.riskLevel === "medium";
  }).length;

  const highCount = permissions.filter((p) => {
    const config = PERMISSION_CONFIGS.find((c) => c.id === p);
    return config?.riskLevel === "high";
  }).length;

  return (
    <div className={cn("flex items-center gap-3 text-sm", className)}>
      <span className="text-muted-foreground">
        {permissions.length} permission{permissions.length !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-2">
        {lowCount > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            {lowCount}
          </span>
        )}
        {mediumCount > 0 && (
          <span className="flex items-center gap-1 text-amber-600">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            {mediumCount}
          </span>
        )}
        {highCount > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            {highCount}
          </span>
        )}
      </div>
    </div>
  );
}
