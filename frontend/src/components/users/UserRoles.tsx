"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type UserRole, getRoleColor, getRoleLabel } from "@/stores/user-store";
import { RoleBadge } from "@/components/user/role-badge";
import { Crown, ShieldCheck, Shield, User, UserX, Check } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface UserRolesProps extends React.HTMLAttributes<HTMLDivElement> {
  role: UserRole;
  showPermissions?: boolean;
  customPermissions?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const ROLE_PERMISSIONS: Record<
  UserRole,
  { permission: string; included: boolean }[]
> = {
  owner: [
    { permission: "Full system access", included: true },
    { permission: "Manage all users and roles", included: true },
    { permission: "Configure workspace settings", included: true },
    { permission: "Delete workspace", included: true },
    { permission: "Manage billing", included: true },
    { permission: "Create and manage channels", included: true },
    { permission: "Moderate all content", included: true },
    { permission: "View analytics and reports", included: true },
  ],
  admin: [
    { permission: "Full system access", included: false },
    { permission: "Manage users (except owners)", included: true },
    { permission: "Configure workspace settings", included: true },
    { permission: "Delete workspace", included: false },
    { permission: "Manage billing", included: false },
    { permission: "Create and manage channels", included: true },
    { permission: "Moderate all content", included: true },
    { permission: "View analytics and reports", included: true },
  ],
  moderator: [
    { permission: "Full system access", included: false },
    { permission: "Manage users", included: false },
    { permission: "Configure workspace settings", included: false },
    { permission: "Delete workspace", included: false },
    { permission: "Manage billing", included: false },
    { permission: "Create and manage channels", included: true },
    { permission: "Moderate content", included: true },
    { permission: "Mute and ban users", included: true },
  ],
  member: [
    { permission: "Send messages", included: true },
    { permission: "Join public channels", included: true },
    { permission: "Create private channels", included: true },
    { permission: "Upload files", included: true },
    { permission: "React to messages", included: true },
    { permission: "Create threads", included: true },
    { permission: "Moderate content", included: false },
    { permission: "Manage channels", included: false },
  ],
  guest: [
    { permission: "View messages", included: true },
    { permission: "Send messages (limited)", included: true },
    { permission: "Access invited channels only", included: true },
    { permission: "Upload files", included: false },
    { permission: "Create channels", included: false },
    { permission: "Invite others", included: false },
  ],
};

function getRoleIcon(role: UserRole): React.ReactNode {
  const iconProps = { className: "h-5 w-5" };
  switch (role) {
    case "owner":
      return <Crown {...iconProps} />;
    case "admin":
      return <ShieldCheck {...iconProps} />;
    case "moderator":
      return <Shield {...iconProps} />;
    case "member":
      return <User {...iconProps} />;
    case "guest":
      return <UserX {...iconProps} />;
    default:
      return <User {...iconProps} />;
  }
}

function getRoleDescription(role: UserRole): string {
  switch (role) {
    case "owner":
      return "Full control over the workspace with all administrative privileges.";
    case "admin":
      return "Can manage users, channels, and most workspace settings.";
    case "moderator":
      return "Can moderate content and manage channel membership.";
    case "member":
      return "Standard access to send messages and participate in channels.";
    case "guest":
      return "Limited access to specific channels they have been invited to.";
    default:
      return "";
  }
}

// ============================================================================
// Component
// ============================================================================

const UserRoles = React.forwardRef<HTMLDivElement, UserRolesProps>(
  (
    { className, role, showPermissions = true, customPermissions, ...props },
    ref,
  ) => {
    const roleColor = getRoleColor(role);
    const roleLabel = getRoleLabel(role);
    const permissions = customPermissions
      ? customPermissions.map((p) => ({ permission: p, included: true }))
      : ROLE_PERMISSIONS[role] || [];

    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        {/* Role header */}
        <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${roleColor}20`, color: roleColor }}
          >
            {getRoleIcon(role)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold">{roleLabel}</h4>
              <RoleBadge role={role} size="sm" showIcon={false} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {getRoleDescription(role)}
            </p>
          </div>
        </div>

        {/* Permissions list */}
        {showPermissions && permissions.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-muted-foreground">
              Permissions
            </h5>
            <ul className="space-y-2">
              {permissions.map((item, index) => (
                <li
                  key={index}
                  className={cn(
                    "flex items-center gap-3 text-sm",
                    !item.included && "text-muted-foreground line-through",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full",
                      item.included
                        ? "bg-green-500/10 text-green-500"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.included ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className="h-0.5 w-2 rounded-full bg-current" />
                    )}
                  </span>
                  <span>{item.permission}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  },
);
UserRoles.displayName = "UserRoles";

export { UserRoles };
