"use client";

/**
 * Message Context Menu
 *
 * Comprehensive right-click context menu with:
 * - Quick reactions
 * - Copy text/link
 * - Edit/delete (if own)
 * - Pin/bookmark
 * - Forward/report
 * - Mark unread
 * - Remind me
 * - Start thread
 * - View details/history
 */

import { useState } from "react";
import {
  Copy,
  Link2,
  Edit,
  Trash2,
  Pin,
  PinOff,
  Bookmark,
  BookmarkCheck,
  Reply,
  MessageSquare,
  Forward,
  Flag,
  Smile,
  Mail,
  MailOpen,
  Clock,
  Info,
  History,
  Users,
  Share2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuShortcut,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import type {
  Message,
  MessageAction,
  MessageActionPermissions,
} from "@/types/message";

// ============================================================================
// Types
// ============================================================================

interface MessageContextMenuProps {
  children: React.ReactNode;
  message: Message;
  permissions: MessageActionPermissions;
  onAction: (action: MessageAction, data?: unknown) => void;
  className?: string;
  /** Show advanced options */
  showAdvanced?: boolean;
  /** Enable selection mode */
  onEnterSelectionMode?: () => void;
  /** Current selection state */
  isSelected?: boolean;
}

// ============================================================================
// Quick Reactions
// ============================================================================

const QUICK_REACTIONS = [
  { emoji: "👍", name: "thumbs_up" },
  { emoji: "❤️", name: "heart" },
  { emoji: "😂", name: "joy" },
  { emoji: "🎉", name: "tada" },
  { emoji: "👀", name: "eyes" },
  { emoji: "🔥", name: "fire" },
];

const REACTION_CATEGORIES = {
  emotions: [
    { emoji: "😀", name: "smile" },
    { emoji: "😂", name: "joy" },
    { emoji: "😍", name: "heart_eyes" },
    { emoji: "🤔", name: "thinking" },
    { emoji: "😢", name: "cry" },
    { emoji: "😎", name: "sunglasses" },
    { emoji: "🤩", name: "star_struck" },
    { emoji: "😱", name: "scream" },
  ],
  gestures: [
    { emoji: "👍", name: "thumbs_up" },
    { emoji: "👎", name: "thumbs_down" },
    { emoji: "👏", name: "clap" },
    { emoji: "👋", name: "wave" },
    { emoji: "🙏", name: "pray" },
    { emoji: "💪", name: "muscle" },
    { emoji: "✌️", name: "victory" },
    { emoji: "🤝", name: "handshake" },
  ],
  symbols: [
    { emoji: "❤️", name: "heart" },
    { emoji: "🔥", name: "fire" },
    { emoji: "⭐", name: "star" },
    { emoji: "👀", name: "eyes" },
    { emoji: "🎉", name: "tada" },
    { emoji: "🚀", name: "rocket" },
    { emoji: "✅", name: "check" },
    { emoji: "❌", name: "x" },
  ],
};

// ============================================================================
// Component
// ============================================================================

export function MessageContextMenu({
  children,
  message,
  permissions,
  onAction,
  className,
  showAdvanced = true,
  onEnterSelectionMode,
  isSelected = false,
}: MessageContextMenuProps) {
  const [remindTime, setRemindTime] = useState<string>("30m");

  // Handlers
  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    onAction("copy");
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/chat/${message.channelId}?message=${message.id}`;
    navigator.clipboard.writeText(url);
    onAction("copy-link");
  };

  const handleReact = (emoji: string) => {
    onAction("react", { emoji });
  };

  const handleRemindMe = (time: string) => {
    onAction("mark-unread"); // For now, mark as unread
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild className={className}>
        {children}
      </ContextMenuTrigger>

      <ContextMenuContent className="w-72">
        {/* Quick reactions */}
        {permissions.canReact && (
          <>
            <div className="flex items-center gap-1 px-2 py-2">
              {QUICK_REACTIONS.map((reaction) => (
                <button
                  key={reaction.name}
                  onClick={() => handleReact(reaction.emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-muted"
                  title={reaction.name}
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
            <ContextMenuSeparator />
          </>
        )}

        {/* Primary Actions */}
        <ContextMenuItem onClick={handleCopyText}>
          <Copy className="mr-2 h-4 w-4" />
          Copy text
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem onClick={handleCopyLink}>
          <Link2 className="mr-2 h-4 w-4" />
          Copy link to message
          <ContextMenuShortcut>⌘⇧C</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Reply Actions */}
        {permissions.canReply && (
          <ContextMenuItem onClick={() => onAction("reply")}>
            <Reply className="mr-2 h-4 w-4" />
            Reply
            <ContextMenuShortcut>R</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {permissions.canThread && (
          <ContextMenuItem onClick={() => onAction("thread")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Reply in thread
            <ContextMenuShortcut>T</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {/* Add reaction with submenu */}
        {permissions.canReact && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Smile className="mr-2 h-4 w-4" />
              Add reaction
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-64">
              <ContextMenuLabel>Emotions</ContextMenuLabel>
              <div className="grid grid-cols-8 gap-1 px-2 py-2">
                {REACTION_CATEGORIES.emotions.map((reaction) => (
                  <button
                    key={reaction.name}
                    onClick={() => handleReact(reaction.emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-muted"
                    title={reaction.name}
                  >
                    {reaction.emoji}
                  </button>
                ))}
              </div>
              <ContextMenuSeparator />
              <ContextMenuLabel>Gestures</ContextMenuLabel>
              <div className="grid grid-cols-8 gap-1 px-2 py-2">
                {REACTION_CATEGORIES.gestures.map((reaction) => (
                  <button
                    key={reaction.name}
                    onClick={() => handleReact(reaction.emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-muted"
                    title={reaction.name}
                  >
                    {reaction.emoji}
                  </button>
                ))}
              </div>
              <ContextMenuSeparator />
              <ContextMenuLabel>Symbols</ContextMenuLabel>
              <div className="grid grid-cols-8 gap-1 px-2 py-2">
                {REACTION_CATEGORIES.symbols.map((reaction) => (
                  <button
                    key={reaction.name}
                    onClick={() => handleReact(reaction.emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-muted"
                    title={reaction.name}
                  >
                    {reaction.emoji}
                  </button>
                ))}
              </div>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {(permissions.canEdit ||
          permissions.canPin ||
          permissions.canBookmark ||
          permissions.canForward) && <ContextMenuSeparator />}

        {/* Message Management */}
        {permissions.canEdit && (
          <ContextMenuItem onClick={() => onAction("edit")}>
            <Edit className="mr-2 h-4 w-4" />
            Edit message
            <ContextMenuShortcut>E</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {/* Pin / Unpin */}
        {permissions.canPin && (
          <ContextMenuItem
            onClick={() => onAction(message.isPinned ? "unpin" : "pin")}
          >
            {message.isPinned ? (
              <>
                <PinOff className="mr-2 h-4 w-4" />
                Unpin from channel
                <ContextMenuShortcut>P</ContextMenuShortcut>
              </>
            ) : (
              <>
                <Pin className="mr-2 h-4 w-4" />
                Pin to channel
                <ContextMenuShortcut>P</ContextMenuShortcut>
              </>
            )}
          </ContextMenuItem>
        )}

        {/* Bookmark */}
        {permissions.canBookmark && (
          <ContextMenuItem
            onClick={() =>
              onAction(message.isBookmarked ? "unbookmark" : "bookmark")
            }
          >
            {message.isBookmarked ? (
              <>
                <BookmarkCheck className="mr-2 h-4 w-4" />
                Remove from saved items
                <ContextMenuShortcut>S</ContextMenuShortcut>
              </>
            ) : (
              <>
                <Bookmark className="mr-2 h-4 w-4" />
                Save message
                <ContextMenuShortcut>S</ContextMenuShortcut>
              </>
            )}
          </ContextMenuItem>
        )}

        {/* Forward */}
        {permissions.canForward && (
          <ContextMenuItem onClick={() => onAction("forward")}>
            <Forward className="mr-2 h-4 w-4" />
            Forward message
            <ContextMenuShortcut>⌘F</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {/* Share submenu */}
        {permissions.canForward && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => onAction("forward")}>
                <Forward className="mr-2 h-4 w-4" />
                Forward to channel
              </ContextMenuItem>
              <ContextMenuItem onClick={handleCopyLink}>
                <Link2 className="mr-2 h-4 w-4" />
                Copy link
              </ContextMenuItem>
              <ContextMenuItem onClick={handleCopyText}>
                <Copy className="mr-2 h-4 w-4" />
                Copy text
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {/* Advanced Options */}
        {showAdvanced && (
          <>
            <ContextMenuSeparator />

            {/* Mark as unread */}
            {permissions.canMarkUnread && (
              <ContextMenuItem onClick={() => onAction("mark-unread")}>
                <MailOpen className="mr-2 h-4 w-4" />
                Mark as unread
                <ContextMenuShortcut>U</ContextMenuShortcut>
              </ContextMenuItem>
            )}

            {/* Remind me */}
            {permissions.canBookmark && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Clock className="mr-2 h-4 w-4" />
                  Remind me
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuRadioGroup
                    value={remindTime}
                    onValueChange={setRemindTime}
                  >
                    <ContextMenuRadioItem
                      value="30m"
                      onClick={() => handleRemindMe("30m")}
                    >
                      In 30 minutes
                    </ContextMenuRadioItem>
                    <ContextMenuRadioItem
                      value="1h"
                      onClick={() => handleRemindMe("1h")}
                    >
                      In 1 hour
                    </ContextMenuRadioItem>
                    <ContextMenuRadioItem
                      value="3h"
                      onClick={() => handleRemindMe("3h")}
                    >
                      In 3 hours
                    </ContextMenuRadioItem>
                    <ContextMenuRadioItem
                      value="tomorrow"
                      onClick={() => handleRemindMe("tomorrow")}
                    >
                      Tomorrow
                    </ContextMenuRadioItem>
                    <ContextMenuRadioItem
                      value="next-week"
                      onClick={() => handleRemindMe("next-week")}
                    >
                      Next week
                    </ContextMenuRadioItem>
                  </ContextMenuRadioGroup>
                  <ContextMenuSeparator />
                  <ContextMenuItem>
                    <Clock className="mr-2 h-4 w-4" />
                    Custom time...
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}

            {/* View details */}
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Info className="mr-2 h-4 w-4" />
                Message info
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </ContextMenuItem>
                {message.isEdited && (
                  <ContextMenuItem>
                    <History className="mr-2 h-4 w-4" />
                    View edit history
                  </ContextMenuItem>
                )}
                {message.reactions && message.reactions.length > 0 && (
                  <ContextMenuItem>
                    <Users className="mr-2 h-4 w-4" />
                    View reactions ({message.reactions.length})
                  </ContextMenuItem>
                )}
                <ContextMenuSeparator />
                <div className="px-2 py-2 text-xs text-muted-foreground">
                  <div>
                    <strong>Sent:</strong>{" "}
                    {new Date(message.createdAt).toLocaleString()}
                  </div>
                  {message.isEdited && message.editedAt && (
                    <div>
                      <strong>Edited:</strong>{" "}
                      {new Date(message.editedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {/* Selection Mode */}
        {onEnterSelectionMode && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onEnterSelectionMode}>
              <ContextMenuCheckboxItem checked={isSelected}>
                Select message
              </ContextMenuCheckboxItem>
            </ContextMenuItem>
          </>
        )}

        {/* Destructive Actions */}
        {(permissions.canReport || permissions.canDelete) && (
          <ContextMenuSeparator />
        )}

        {/* Report */}
        {permissions.canReport && (
          <ContextMenuItem
            onClick={() => onAction("report")}
            className="text-amber-600 focus:bg-amber-50 focus:text-amber-600 dark:text-amber-500 dark:focus:bg-amber-950"
          >
            <Flag className="mr-2 h-4 w-4" />
            Report message
          </ContextMenuItem>
        )}

        {/* Delete */}
        {permissions.canDelete && (
          <ContextMenuItem
            onClick={() => onAction("delete")}
            className="focus:bg-destructive/10 text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete message
            <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ============================================================================
// Simplified Context Menu (for compact view)
// ============================================================================

export function SimpleMessageContextMenu({
  children,
  message,
  permissions,
  onAction,
  className,
}: Omit<MessageContextMenuProps, "showAdvanced" | "onEnterSelectionMode">) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild className={className}>
        {children}
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        {permissions.canReply && (
          <ContextMenuItem onClick={() => onAction("reply")}>
            <Reply className="mr-2 h-4 w-4" />
            Reply
          </ContextMenuItem>
        )}

        {permissions.canThread && (
          <ContextMenuItem onClick={() => onAction("thread")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Reply in thread
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={() => {
            navigator.clipboard.writeText(message.content);
            onAction("copy");
          }}
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy text
        </ContextMenuItem>

        {permissions.canEdit && (
          <ContextMenuItem onClick={() => onAction("edit")}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </ContextMenuItem>
        )}

        {permissions.canDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => onAction("delete")}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
