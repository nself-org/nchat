"use client";

import * as React from "react";
import {
  ExternalLink,
  CheckCheck,
  BellOff,
  Bell,
  Star,
  StarOff,
  Settings,
  LogOut,
  Link,
  Users,
  Archive,
} from "lucide-react";
import {
  useContextMenuStore,
  type ChannelTarget,
} from "@/lib/context-menu/context-menu-store";
import { PositionedContextMenu } from "./base-context-menu";
import { MenuItem } from "./menu-item";
import { MenuSeparator } from "./menu-separator";
import {
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuSubmenuContent,
} from "./menu-submenu";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface ChannelContextMenuProps {
  /**
   * Called when an action is performed
   */
  onAction?: (action: string, data: ChannelActionData) => void;
}

export interface ChannelActionData {
  channelId: string;
  action: ChannelAction;
  muteDuration?: MuteDuration;
}

export type ChannelAction =
  | "open"
  | "open-new-tab"
  | "mark-read"
  | "mute"
  | "unmute"
  | "star"
  | "unstar"
  | "edit"
  | "members"
  | "leave"
  | "archive"
  | "copy-link";

export type MuteDuration = "1h" | "8h" | "24h" | "7d" | "forever";

// Mute duration options
const MUTE_DURATIONS: { value: MuteDuration; label: string }[] = [
  { value: "1h", label: "For 1 hour" },
  { value: "8h", label: "For 8 hours" },
  { value: "24h", label: "For 24 hours" },
  { value: "7d", label: "For 7 days" },
  { value: "forever", label: "Until I turn it back on" },
];

// ============================================================================
// Component
// ============================================================================

export function ChannelContextMenu({ onAction }: ChannelContextMenuProps) {
  const target = useContextMenuStore((state) => state.target);
  const closeMenu = useContextMenuStore((state) => state.closeMenu);

  // Type guard for channel target
  const channelTarget =
    target?.type === "channel" ? (target as ChannelTarget) : null;

  if (!channelTarget) return null;

  const {
    channelId,
    name,
    isMuted,
    isStarred,
    canEdit,
    canLeave,
    unreadCount,
  } = channelTarget;

  const handleAction = (action: ChannelAction, muteDuration?: MuteDuration) => {
    onAction?.(action, {
      channelId,
      action,
      muteDuration,
    });
    closeMenu();
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/chat/${channelId}`;
      await navigator.clipboard.writeText(url);
      handleAction("copy-link");
    } catch (error) {
      logger.error("Failed to copy link:", error);
    }
  };

  return (
    <PositionedContextMenu>
      {/* Open */}
      <MenuItem icon={ExternalLink} onSelect={() => handleAction("open")}>
        Open channel
      </MenuItem>

      {/* Open in new tab */}
      <MenuItem
        icon={ExternalLink}
        onSelect={() => handleAction("open-new-tab")}
      >
        Open in new tab
      </MenuItem>

      <MenuSeparator />

      {/* Mark as read */}
      <MenuItem
        icon={CheckCheck}
        onSelect={() => handleAction("mark-read")}
        disabled={unreadCount === 0}
      >
        Mark as read
        {unreadCount > 0 && (
          <span className="text-primary-foreground ml-2 rounded-full bg-primary px-1.5 py-0.5 text-xs">
            {unreadCount}
          </span>
        )}
      </MenuItem>

      {/* Mute/Unmute with submenu */}
      {isMuted ? (
        <MenuItem icon={Bell} onSelect={() => handleAction("unmute")}>
          Unmute channel
        </MenuItem>
      ) : (
        <MenuSubmenu>
          <MenuSubmenuTrigger icon={BellOff}>Mute channel</MenuSubmenuTrigger>
          <MenuSubmenuContent>
            {MUTE_DURATIONS.map(({ value, label }) => (
              <MenuItem
                key={value}
                onSelect={() => handleAction("mute", value)}
              >
                {label}
              </MenuItem>
            ))}
          </MenuSubmenuContent>
        </MenuSubmenu>
      )}

      {/* Star/Unstar */}
      <MenuItem
        icon={isStarred ? StarOff : Star}
        onSelect={() => handleAction(isStarred ? "unstar" : "star")}
      >
        {isStarred ? "Remove from starred" : "Add to starred"}
      </MenuItem>

      <MenuSeparator />

      {/* Edit channel (admin only) */}
      {canEdit && (
        <MenuItem icon={Settings} onSelect={() => handleAction("edit")}>
          Edit channel
        </MenuItem>
      )}

      {/* View members */}
      <MenuItem icon={Users} onSelect={() => handleAction("members")}>
        View members
      </MenuItem>

      {/* Copy link */}
      <MenuItem icon={Link} onSelect={handleCopyLink}>
        Copy channel link
      </MenuItem>

      {(canEdit || canLeave) && <MenuSeparator />}

      {/* Archive channel (admin only) */}
      {canEdit && (
        <MenuItem
          icon={Archive}
          danger
          onSelect={() => handleAction("archive")}
        >
          Archive channel
        </MenuItem>
      )}

      {/* Leave channel */}
      {canLeave && (
        <MenuItem icon={LogOut} danger onSelect={() => handleAction("leave")}>
          Leave channel
        </MenuItem>
      )}
    </PositionedContextMenu>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { MUTE_DURATIONS };
