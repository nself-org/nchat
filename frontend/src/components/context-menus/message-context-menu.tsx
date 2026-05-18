"use client";

import * as React from "react";
import {
  Reply,
  MessageSquare,
  Smile,
  Pencil,
  Trash2,
  Copy,
  Link2,
  Pin,
  PinOff,
  Bookmark,
  BookmarkCheck,
  Forward,
  Flag,
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
} from "./context-menu-base";
import { useAuth } from "@/contexts/auth-context";
import type { Message, MessageActionPermissions } from "@/types/message";

// ============================================================================
// Types
// ============================================================================

export interface MessageContextMenuProps {
  children: React.ReactNode;
  message: Message;
  onReply?: (message: Message) => void;
  onReplyInThread?: (message: Message) => void;
  onReact?: (message: Message, emoji?: string) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onCopyText?: (message: Message) => void;
  onCopyLink?: (message: Message) => void;
  onPin?: (message: Message) => void;
  onUnpin?: (message: Message) => void;
  onBookmark?: (message: Message) => void;
  onUnbookmark?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onReport?: (message: Message) => void;
  disabled?: boolean;
}

// Quick reactions for the submenu
const QUICK_REACTIONS = [
  { emoji: "\u{1F44D}", label: "Thumbs up" },
  { emoji: "\u{2764}\u{FE0F}", label: "Heart" },
  { emoji: "\u{1F604}", label: "Smile" },
  { emoji: "\u{1F389}", label: "Party" },
  { emoji: "\u{1F914}", label: "Thinking" },
  { emoji: "\u{1F440}", label: "Eyes" },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getMessagePermissions(
  message: Message,
  currentUserId: string | undefined,
  userRole: string | undefined,
): MessageActionPermissions {
  const isOwner = message.userId === currentUserId;
  const isAdmin = userRole === "owner" || userRole === "admin";
  const isModerator = userRole === "moderator";
  const canModerate = isAdmin || isModerator;
  const isSystemMessage = message.type !== "text";

  return {
    canEdit: isOwner && !isSystemMessage && !message.isDeleted,
    canDelete: (isOwner || canModerate) && !isSystemMessage,
    canPin: canModerate && !isSystemMessage,
    canReact: !isSystemMessage && !message.isDeleted,
    canReply: !isSystemMessage && !message.isDeleted,
    canThread: !isSystemMessage && !message.isDeleted,
    canBookmark: !isSystemMessage && !message.isDeleted,
    canForward: !isSystemMessage && !message.isDeleted,
    canReport: !isOwner && !isSystemMessage && !message.isDeleted,
    canCopy: !message.isDeleted,
    canMarkUnread: !message.isDeleted,
  };
}

// ============================================================================
// Component
// ============================================================================

export function MessageContextMenu({
  children,
  message,
  onReply,
  onReplyInThread,
  onReact,
  onEdit,
  onDelete,
  onCopyText,
  onCopyLink,
  onPin,
  onUnpin,
  onBookmark,
  onUnbookmark,
  onForward,
  onReport,
  disabled = false,
}: MessageContextMenuProps) {
  const { user } = useAuth();
  const permissions = getMessagePermissions(message, user?.id, user?.role);

  const handleCopyText = React.useCallback(() => {
    if (onCopyText) {
      onCopyText(message);
    } else {
      navigator.clipboard.writeText(message.content);
    }
  }, [message, onCopyText]);

  const handleCopyLink = React.useCallback(() => {
    if (onCopyLink) {
      onCopyLink(message);
    } else {
      // Generate message link
      const url = `${window.location.origin}/chat/channel/${message.channelId}?message=${message.id}`;
      navigator.clipboard.writeText(url);
    }
  }, [message, onCopyLink]);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Reply Actions */}
        {permissions.canReply && (
          <>
            <ContextMenuItemWithIcon
              icon={<Reply className="h-4 w-4" />}
              shortcut="R"
              onClick={() => onReply?.(message)}
            >
              Reply
            </ContextMenuItemWithIcon>

            {permissions.canThread && (
              <ContextMenuItemWithIcon
                icon={<MessageSquare className="h-4 w-4" />}
                shortcut="T"
                onClick={() => onReplyInThread?.(message)}
              >
                Reply in thread
              </ContextMenuItemWithIcon>
            )}
          </>
        )}

        {/* Reactions Submenu */}
        {permissions.canReact && (
          <ContextMenuSub>
            <ContextMenuSubTrigger icon={<Smile className="h-4 w-4" />}>
              Add reaction
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              <div className="grid grid-cols-6 gap-1 p-2">
                {QUICK_REACTIONS.map(({ emoji, label }) => (
                  <button
                    key={emoji}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-accent"
                    onClick={() => onReact?.(message, emoji)}
                    title={label}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <ContextMenuSeparator />
              <ContextMenuItemWithIcon
                icon={<Smile className="h-4 w-4" />}
                onClick={() => onReact?.(message)}
              >
                Browse all emoji...
              </ContextMenuItemWithIcon>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {(permissions.canReply || permissions.canReact) && (
          <ContextMenuSeparator />
        )}

        {/* Edit & Delete */}
        {permissions.canEdit && (
          <ContextMenuItemWithIcon
            icon={<Pencil className="h-4 w-4" />}
            shortcut="E"
            onClick={() => onEdit?.(message)}
          >
            Edit message
          </ContextMenuItemWithIcon>
        )}

        {permissions.canDelete && (
          <ContextMenuItemWithIcon
            icon={<Trash2 className="h-4 w-4" />}
            destructive
            onClick={() => onDelete?.(message)}
          >
            Delete message
          </ContextMenuItemWithIcon>
        )}

        {(permissions.canEdit || permissions.canDelete) && (
          <ContextMenuSeparator />
        )}

        {/* Copy Actions */}
        <ContextMenuItemWithIcon
          icon={<Copy className="h-4 w-4" />}
          shortcut="Ctrl+C"
          onClick={handleCopyText}
        >
          Copy text
        </ContextMenuItemWithIcon>

        <ContextMenuItemWithIcon
          icon={<Link2 className="h-4 w-4" />}
          onClick={handleCopyLink}
        >
          Copy link to message
        </ContextMenuItemWithIcon>

        <ContextMenuSeparator />

        {/* Pin/Bookmark */}
        {permissions.canPin && (
          <>
            {message.isPinned ? (
              <ContextMenuItemWithIcon
                icon={<PinOff className="h-4 w-4" />}
                onClick={() => onUnpin?.(message)}
              >
                Unpin message
              </ContextMenuItemWithIcon>
            ) : (
              <ContextMenuItemWithIcon
                icon={<Pin className="h-4 w-4" />}
                onClick={() => onPin?.(message)}
              >
                Pin message
              </ContextMenuItemWithIcon>
            )}
          </>
        )}

        {permissions.canBookmark && (
          <>
            {message.isBookmarked ? (
              <ContextMenuItemWithIcon
                icon={<BookmarkCheck className="h-4 w-4" />}
                onClick={() => onUnbookmark?.(message)}
              >
                Remove bookmark
              </ContextMenuItemWithIcon>
            ) : (
              <ContextMenuItemWithIcon
                icon={<Bookmark className="h-4 w-4" />}
                onClick={() => onBookmark?.(message)}
              >
                Bookmark
              </ContextMenuItemWithIcon>
            )}
          </>
        )}

        {/* Forward */}
        {permissions.canForward && (
          <ContextMenuItemWithIcon
            icon={<Forward className="h-4 w-4" />}
            onClick={() => onForward?.(message)}
          >
            Forward message
          </ContextMenuItemWithIcon>
        )}

        {/* Report */}
        {permissions.canReport && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItemWithIcon
              icon={<Flag className="h-4 w-4" />}
              destructive
              onClick={() => onReport?.(message)}
            >
              Report message
            </ContextMenuItemWithIcon>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

MessageContextMenu.displayName = "MessageContextMenu";
