"use client";

import {
  Copy,
  Link,
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
} from "@/components/ui/context-menu";
import { emojiFromName } from "./message-reactions";
import type {
  MessageActionPermissions,
  MessageAction,
  Message,
} from "@/types/message";

interface MessageContextMenuProps {
  children: React.ReactNode;
  message: Message;
  permissions: MessageActionPermissions;
  onAction: (action: MessageAction, data?: unknown) => void;
  className?: string;
}

const QUICK_REACTIONS = ["thumbs_up", "heart", "smile", "tada", "eyes", "fire"];

/**
 * Message context menu
 * Right-click menu with message actions
 */
export function MessageContextMenu({
  children,
  message,
  permissions,
  onAction,
  className,
}: MessageContextMenuProps) {
  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    onAction("copy");
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/chat/${message.channelId}?message=${message.id}`;
    navigator.clipboard.writeText(url);
    onAction("copy-link");
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild className={className}>
        {children}
      </ContextMenuTrigger>

      <ContextMenuContent className="w-64">
        {/* Quick reactions */}
        {permissions.canReact && (
          <>
            <div className="flex items-center gap-1 px-2 py-1.5">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onAction("react", { emoji })}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-muted"
                >
                  {emojiFromName(emoji)}
                </button>
              ))}
            </div>
            <ContextMenuSeparator />
          </>
        )}

        {/* Copy text */}
        <ContextMenuItem onClick={handleCopyText}>
          <Copy className="mr-2 h-4 w-4" />
          Copy text
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>

        {/* Copy link */}
        <ContextMenuItem onClick={handleCopyLink}>
          <Link className="mr-2 h-4 w-4" />
          Copy link to message
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Reply */}
        {permissions.canReply && (
          <ContextMenuItem onClick={() => onAction("reply")}>
            <Reply className="mr-2 h-4 w-4" />
            Reply
            <ContextMenuShortcut>R</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {/* Thread */}
        {permissions.canThread && (
          <ContextMenuItem onClick={() => onAction("thread")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Reply in thread
            <ContextMenuShortcut>T</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {/* Add reaction submenu */}
        {permissions.canReact && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Smile className="mr-2 h-4 w-4" />
              Add reaction
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56">
              <ReactionGrid
                onSelect={(emoji) => onAction("react", { emoji })}
              />
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {(permissions.canEdit ||
          permissions.canPin ||
          permissions.canBookmark ||
          permissions.canForward) && <ContextMenuSeparator />}

        {/* Edit */}
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
              </>
            ) : (
              <>
                <Pin className="mr-2 h-4 w-4" />
                Pin to channel
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
              </>
            ) : (
              <>
                <Bookmark className="mr-2 h-4 w-4" />
                Add to saved items
              </>
            )}
          </ContextMenuItem>
        )}

        {/* Forward */}
        {permissions.canForward && (
          <ContextMenuItem onClick={() => onAction("forward")}>
            <Forward className="mr-2 h-4 w-4" />
            Forward message
          </ContextMenuItem>
        )}

        {(permissions.canReport || permissions.canDelete) && (
          <ContextMenuSeparator />
        )}

        {/* Report */}
        {permissions.canReport && (
          <ContextMenuItem
            onClick={() => onAction("report")}
            className="text-amber-500 focus:bg-amber-500/10 focus:text-amber-500"
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
            <ContextMenuShortcut>Del</ContextMenuShortcut>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Reaction grid for submenu
 */
function ReactionGrid({ onSelect }: { onSelect: (emoji: string) => void }) {
  const reactions = [
    ["thumbs_up", "thumbs_down", "clap", "wave"],
    ["heart", "fire", "star", "eyes"],
    ["smile", "joy", "thinking", "cry"],
    ["tada", "rocket", "check", "x"],
  ];

  return (
    <div className="grid grid-cols-4 gap-1 p-2">
      {reactions.flat().map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-muted"
        >
          {emojiFromName(emoji)}
        </button>
      ))}
    </div>
  );
}

/**
 * Custom Context Menu UI component (if not using Radix)
 */
interface ContextMenuUIProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
}

export { ContextMenuContent as ContextMenuContentUI };
