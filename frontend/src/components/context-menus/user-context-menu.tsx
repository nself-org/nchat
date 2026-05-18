"use client";

import * as React from "react";
import {
  User,
  MessageSquare,
  AtSign,
  Copy,
  UserPlus,
  UserMinus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Ban,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItemWithIcon,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuLabel,
} from "./context-menu-base";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

export interface ContextMenuUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role?: UserRole;
}

export interface UserContextMenuProps {
  children: React.ReactNode;
  targetUser: ContextMenuUser;
  channelId?: string;
  onViewProfile?: (user: ContextMenuUser) => void;
  onSendDirectMessage?: (user: ContextMenuUser) => void;
  onMentionInMessage?: (user: ContextMenuUser) => void;
  onCopyUsername?: (user: ContextMenuUser) => void;
  onAddToChannel?: (user: ContextMenuUser) => void;
  onRemoveFromChannel?: (user: ContextMenuUser, channelId: string) => void;
  onChangeRole?: (user: ContextMenuUser, role: UserRole) => void;
  onBlockUser?: (user: ContextMenuUser) => void;
  disabled?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getRoleIcon(role: UserRole) {
  switch (role) {
    case "owner":
      return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
    case "admin":
      return <ShieldCheck className="h-4 w-4 text-blue-500" />;
    case "moderator":
      return <Shield className="h-4 w-4 text-green-500" />;
    case "guest":
      return <ShieldX className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Shield className="h-4 w-4 text-muted-foreground" />;
  }
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "moderator":
      return "Moderator";
    case "member":
      return "Member";
    case "guest":
      return "Guest";
    default:
      return "Member";
  }
}

// ============================================================================
// Component
// ============================================================================

export function UserContextMenu({
  children,
  targetUser,
  channelId,
  onViewProfile,
  onSendDirectMessage,
  onMentionInMessage,
  onCopyUsername,
  onAddToChannel,
  onRemoveFromChannel,
  onChangeRole,
  onBlockUser,
  disabled = false,
}: UserContextMenuProps) {
  const { user: currentUser } = useAuth();

  const isCurrentUser = currentUser?.id === targetUser.id;
  const isAdmin =
    currentUser?.role === "owner" || currentUser?.role === "admin";
  const isOwner = currentUser?.role === "owner";

  // Can't change role of owner, and only owner can change admin roles
  const canChangeRole =
    isAdmin &&
    !isCurrentUser &&
    targetUser.role !== "owner" &&
    (isOwner || targetUser.role !== "admin");

  const handleCopyUsername = React.useCallback(() => {
    if (onCopyUsername) {
      onCopyUsername(targetUser);
    } else {
      navigator.clipboard.writeText(`@${targetUser.username}`);
    }
  }, [targetUser, onCopyUsername]);

  if (disabled) {
    return <>{children}</>;
  }

  // Available roles to assign (based on current user's permissions)
  const availableRoles: UserRole[] = isOwner
    ? ["admin", "moderator", "member", "guest"]
    : ["moderator", "member", "guest"];

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* User header */}
        <ContextMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {targetUser.displayName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              @{targetUser.username}
            </p>
          </div>
        </ContextMenuLabel>

        <ContextMenuSeparator />

        {/* View Profile */}
        <ContextMenuItemWithIcon
          icon={<User className="h-4 w-4" />}
          onClick={() => onViewProfile?.(targetUser)}
        >
          View profile
        </ContextMenuItemWithIcon>

        {/* Send DM (not for self) */}
        {!isCurrentUser && (
          <ContextMenuItemWithIcon
            icon={<MessageSquare className="h-4 w-4" />}
            onClick={() => onSendDirectMessage?.(targetUser)}
          >
            Send direct message
          </ContextMenuItemWithIcon>
        )}

        {/* Mention */}
        {!isCurrentUser && (
          <ContextMenuItemWithIcon
            icon={<AtSign className="h-4 w-4" />}
            onClick={() => onMentionInMessage?.(targetUser)}
          >
            Mention in message
          </ContextMenuItemWithIcon>
        )}

        {/* Copy username */}
        <ContextMenuItemWithIcon
          icon={<Copy className="h-4 w-4" />}
          onClick={handleCopyUsername}
        >
          Copy username
        </ContextMenuItemWithIcon>

        {/* Admin actions */}
        {isAdmin && !isCurrentUser && (
          <>
            <ContextMenuSeparator />

            {/* Add to channel */}
            <ContextMenuItemWithIcon
              icon={<UserPlus className="h-4 w-4" />}
              onClick={() => onAddToChannel?.(targetUser)}
            >
              Add to channel
            </ContextMenuItemWithIcon>

            {/* Remove from channel (if channel context provided) */}
            {channelId && (
              <ContextMenuItemWithIcon
                icon={<UserMinus className="h-4 w-4" />}
                onClick={() => onRemoveFromChannel?.(targetUser, channelId)}
              >
                Remove from channel
              </ContextMenuItemWithIcon>
            )}

            {/* Change role submenu */}
            {canChangeRole && (
              <ContextMenuSub>
                <ContextMenuSubTrigger
                  icon={getRoleIcon(targetUser.role || "member")}
                >
                  Change role
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-40">
                  <ContextMenuLabel>
                    Current: {getRoleLabel(targetUser.role || "member")}
                  </ContextMenuLabel>
                  <ContextMenuSeparator />
                  {availableRoles.map((role) => (
                    <ContextMenuItemWithIcon
                      key={role}
                      icon={getRoleIcon(role)}
                      onClick={() => onChangeRole?.(targetUser, role)}
                      disabled={targetUser.role === role}
                    >
                      {getRoleLabel(role)}
                    </ContextMenuItemWithIcon>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
          </>
        )}

        {/* Block user (not for self, not for admins unless you're owner) */}
        {!isCurrentUser && (isOwner || targetUser.role !== "admin") && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItemWithIcon
              icon={<Ban className="h-4 w-4" />}
              destructive
              onClick={() => onBlockUser?.(targetUser)}
            >
              Block user
            </ContextMenuItemWithIcon>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

UserContextMenu.displayName = "UserContextMenu";
