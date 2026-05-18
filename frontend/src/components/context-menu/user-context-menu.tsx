"use client";

import * as React from "react";
import {
  User,
  MessageSquare,
  AtSign,
  Copy,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserMinus,
  Ban,
  Crown,
  Flag,
  VolumeX,
  UserX,
  type LucideIcon,
} from "lucide-react";
import {
  useContextMenuStore,
  type UserTarget,
} from "@/lib/context-menu/context-menu-store";
import { PositionedContextMenu } from "./base-context-menu";
import { MenuItem } from "./menu-item";
import { MenuSeparator } from "./menu-separator";
import {
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuSubmenuContent,
} from "./menu-submenu";
import { useBlockStore } from "@/lib/moderation/block-store";
import { useReportStore } from "@/lib/moderation/report-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface UserContextMenuProps {
  /**
   * Called when an action is performed
   */
  onAction?: (action: string, data: UserActionData) => void;
}

export interface UserActionData {
  userId: string;
  username: string;
  channelId?: string;
  action: UserAction;
  newRole?: UserRole;
}

export type UserAction =
  | "view-profile"
  | "send-message"
  | "mention"
  | "copy-username"
  | "change-role"
  | "remove-from-channel"
  | "ban"
  | "block"
  | "unblock"
  | "report"
  | "mute";

export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

// Role options with icons
const ROLE_OPTIONS: { value: UserRole; label: string; icon: LucideIcon }[] = [
  { value: "owner", label: "Owner", icon: Crown },
  { value: "admin", label: "Admin", icon: ShieldCheck },
  { value: "moderator", label: "Moderator", icon: Shield },
  { value: "member", label: "Member", icon: User },
  { value: "guest", label: "Guest", icon: User },
];

// ============================================================================
// Component
// ============================================================================

export function UserContextMenu({ onAction }: UserContextMenuProps) {
  const target = useContextMenuStore((state) => state.target);
  const closeMenu = useContextMenuStore((state) => state.closeMenu);

  // Block store for checking block status
  const { isUserBlocked, openBlockModal } = useBlockStore();
  const { openReportUserModal } = useReportStore();

  // Mute modal state
  const [muteModalOpen, setMuteModalOpen] = React.useState(false);

  // Type guard for user target
  const userTarget = target?.type === "user" ? (target as UserTarget) : null;

  if (!userTarget) return null;

  const {
    userId,
    username,
    displayName,
    role,
    channelId,
    canChangeRole,
    canRemoveFromChannel,
    canSendMessage,
  } = userTarget;

  // Check if this user is blocked
  const isBlocked = isUserBlocked(userId);

  const handleAction = (action: UserAction, newRole?: UserRole) => {
    onAction?.(action, {
      userId,
      username,
      channelId,
      action,
      newRole,
    });
    closeMenu();
  };

  const handleCopyUsername = async () => {
    try {
      await navigator.clipboard.writeText(`@${username}`);
      handleAction("copy-username");
    } catch (error) {
      logger.error("Failed to copy username:", error);
    }
  };

  const handleMention = () => {
    // This would typically insert @username into the message input
    handleAction("mention");
  };

  const handleBlock = () => {
    openBlockModal({
      userId,
      username,
      displayName,
      avatarUrl: undefined, // Would need to add this to UserTarget if available
    });
    handleAction("block");
  };

  const handleReport = () => {
    openReportUserModal({
      id: userId,
      username,
      displayName,
      avatarUrl: undefined, // Would need to add this to UserTarget if available
    });
    handleAction("report");
  };

  const handleMute = () => {
    setMuteModalOpen(true);
    handleAction("mute");
  };

  return (
    <PositionedContextMenu>
      {/* View Profile */}
      <MenuItem icon={User} onSelect={() => handleAction("view-profile")}>
        View profile
      </MenuItem>

      {/* Send Direct Message */}
      {canSendMessage && (
        <MenuItem
          icon={MessageSquare}
          onSelect={() => handleAction("send-message")}
        >
          Send message
        </MenuItem>
      )}

      {/* Mention */}
      <MenuItem icon={AtSign} onSelect={handleMention}>
        Mention @{username}
      </MenuItem>

      {/* Copy Username */}
      <MenuItem icon={Copy} onSelect={handleCopyUsername}>
        Copy username
      </MenuItem>

      {/* Admin actions */}
      {(canChangeRole || canRemoveFromChannel) && <MenuSeparator />}

      {/* Change Role (admin only) */}
      {canChangeRole && (
        <MenuSubmenu>
          <MenuSubmenuTrigger icon={ShieldAlert}>
            Change role
          </MenuSubmenuTrigger>
          <MenuSubmenuContent>
            {ROLE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <MenuItem
                key={value}
                icon={Icon}
                onSelect={() => handleAction("change-role", value)}
                disabled={role === value}
              >
                {label}
                {role === value && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (current)
                  </span>
                )}
              </MenuItem>
            ))}
          </MenuSubmenuContent>
        </MenuSubmenu>
      )}

      {/* Remove from Channel (admin only, in channel context) */}
      {canRemoveFromChannel && channelId && (
        <MenuItem
          icon={UserMinus}
          danger
          onSelect={() => handleAction("remove-from-channel")}
        >
          Remove from channel
        </MenuItem>
      )}

      {/* Ban User (admin only) */}
      {canChangeRole && (
        <MenuItem icon={Ban} danger onSelect={() => handleAction("ban")}>
          Ban user
        </MenuItem>
      )}

      {/* User moderation actions (available to all users) */}
      <MenuSeparator />

      {/* Block/Unblock User */}
      {isBlocked ? (
        <MenuItem icon={UserX} onSelect={() => handleAction("unblock")}>
          Unblock user
        </MenuItem>
      ) : (
        <MenuItem icon={UserX} danger onSelect={handleBlock}>
          Block user
        </MenuItem>
      )}

      {/* Report User */}
      <MenuItem icon={Flag} danger onSelect={handleReport}>
        Report user
      </MenuItem>

      {/* Mute User (moderator only) */}
      {canChangeRole && (
        <MenuItem icon={VolumeX} onSelect={handleMute}>
          Mute user
        </MenuItem>
      )}
    </PositionedContextMenu>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { ROLE_OPTIONS };
