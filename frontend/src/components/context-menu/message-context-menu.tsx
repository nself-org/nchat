"use client";

import * as React from "react";
import {
  Reply,
  SmilePlus,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Bookmark,
  BookmarkMinus,
  Copy,
  Link,
  Forward,
  Flag,
  MoreHorizontal,
} from "lucide-react";
import {
  useContextMenuStore,
  type MessageTarget,
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

export interface MessageContextMenuProps {
  /**
   * Called when an action is performed
   */
  onAction?: (action: string, data: MessageActionData) => void;
}

export interface MessageActionData {
  messageId: string;
  channelId: string;
  action: MessageAction;
  emoji?: string;
}

export type MessageAction =
  | "reply"
  | "react"
  | "edit"
  | "delete"
  | "pin"
  | "unpin"
  | "bookmark"
  | "unbookmark"
  | "copy-text"
  | "copy-link"
  | "forward"
  | "report";

// Common emoji reactions
const QUICK_REACTIONS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "🎉", label: "Party" },
];

// ============================================================================
// Component
// ============================================================================

export function MessageContextMenu({ onAction }: MessageContextMenuProps) {
  const target = useContextMenuStore((state) => state.target);
  const closeMenu = useContextMenuStore((state) => state.closeMenu);

  // Type guard for message target
  const messageTarget =
    target?.type === "message" ? (target as MessageTarget) : null;

  if (!messageTarget) return null;

  const {
    messageId,
    channelId,
    content,
    isPinned,
    isBookmarked,
    canEdit,
    canDelete,
    canPin,
    canModerate,
  } = messageTarget;

  const handleAction = (action: MessageAction, emoji?: string) => {
    onAction?.(action, {
      messageId,
      channelId,
      action,
      emoji,
    });
    closeMenu();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(content);
      handleAction("copy-text");
    } catch (error) {
      logger.error("Failed to copy text:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/chat/${channelId}/${messageId}`;
      await navigator.clipboard.writeText(url);
      handleAction("copy-link");
    } catch (error) {
      logger.error("Failed to copy link:", error);
    }
  };

  return (
    <PositionedContextMenu>
      {/* Reply */}
      <MenuItem
        icon={Reply}
        shortcut="R"
        onSelect={() => handleAction("reply")}
      >
        Reply
      </MenuItem>

      {/* Quick Reactions Submenu */}
      <MenuSubmenu>
        <MenuSubmenuTrigger icon={SmilePlus}>Add reaction</MenuSubmenuTrigger>
        <MenuSubmenuContent>
          <div className="flex gap-1 p-1">
            {QUICK_REACTIONS.map(({ emoji, label }) => (
              <button
                key={emoji}
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-accent"
                title={label}
                onClick={() => handleAction("react", emoji)}
              >
                <span className="text-lg">{emoji}</span>
              </button>
            ))}
          </div>
          <MenuSeparator />
          <MenuItem
            icon={MoreHorizontal}
            onSelect={() => handleAction("react")}
          >
            More reactions...
          </MenuItem>
        </MenuSubmenuContent>
      </MenuSubmenu>

      <MenuSeparator />

      {/* Edit (own messages only) */}
      {canEdit && (
        <MenuItem
          icon={Pencil}
          shortcut="E"
          onSelect={() => handleAction("edit")}
        >
          Edit message
        </MenuItem>
      )}

      {/* Delete (own messages or moderator) */}
      {canDelete && (
        <MenuItem icon={Trash2} danger onSelect={() => handleAction("delete")}>
          Delete message
        </MenuItem>
      )}

      {(canEdit || canDelete) && <MenuSeparator />}

      {/* Pin/Unpin (if user has permission) */}
      {canPin && (
        <MenuItem
          icon={isPinned ? PinOff : Pin}
          onSelect={() => handleAction(isPinned ? "unpin" : "pin")}
        >
          {isPinned ? "Unpin message" : "Pin message"}
        </MenuItem>
      )}

      {/* Bookmark */}
      <MenuItem
        icon={isBookmarked ? BookmarkMinus : Bookmark}
        onSelect={() => handleAction(isBookmarked ? "unbookmark" : "bookmark")}
      >
        {isBookmarked ? "Remove bookmark" : "Bookmark"}
      </MenuItem>

      <MenuSeparator />

      {/* Copy Text */}
      <MenuItem icon={Copy} shortcut="Ctrl+C" onSelect={handleCopyText}>
        Copy text
      </MenuItem>

      {/* Copy Link */}
      <MenuItem icon={Link} onSelect={handleCopyLink}>
        Copy link to message
      </MenuItem>

      {/* Forward */}
      <MenuItem icon={Forward} onSelect={() => handleAction("forward")}>
        Forward message
      </MenuItem>

      <MenuSeparator />

      {/* Report (for moderation) */}
      {canModerate && (
        <MenuItem icon={Flag} danger onSelect={() => handleAction("report")}>
          Report message
        </MenuItem>
      )}
    </PositionedContextMenu>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { QUICK_REACTIONS };
