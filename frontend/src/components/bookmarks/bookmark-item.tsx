"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useBookmarkActions,
  useBookmarkFolders,
} from "@/lib/bookmarks/use-bookmarks";
import {
  useBookmarkStore,
  type Bookmark,
} from "@/lib/bookmarks/bookmark-store";
import { formatRelativeTime, formatMessageTimeTooltip } from "@/lib/date";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface BookmarkItemProps {
  bookmark: Bookmark;
  compact?: boolean;
  showChannel?: boolean;
  showFolder?: boolean;
  onJumpToMessage?: (messageId: string, channelId: string) => void;
  onRemove?: (bookmarkId: string) => void;
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function HashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5"
      />
    </svg>
  );
}

function MoreHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function truncateContent(content: string, maxLength = 150): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + "...";
}

function getMessageTypeIcon(type: string): string {
  switch (type) {
    case "image":
      return "[Image]";
    case "file":
      return "[File]";
    case "video":
      return "[Video]";
    case "audio":
      return "[Audio]";
    case "code":
      return "[Code]";
    default:
      return "";
  }
}

// ============================================================================
// Bookmark Item Component
// ============================================================================

export function BookmarkItem({
  bookmark,
  compact = false,
  showChannel = true,
  showFolder = true,
  onJumpToMessage,
  onRemove,
  className,
}: BookmarkItemProps) {
  const router = useRouter();
  const { removeBookmark } = useBookmarkActions();
  const { openAddToFolderModal } = useBookmarkStore();
  const { folders } = useBookmarkFolders();

  const [isHovered, setIsHovered] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);

  const { message } = bookmark;
  const folder = bookmark.folder_id
    ? folders.find((f) => f.id === bookmark.folder_id)
    : null;

  const handleJumpToMessage = () => {
    if (onJumpToMessage) {
      onJumpToMessage(message.id, message.channel.id);
    } else {
      router.push(`/chat/${message.channel.slug}?message=${message.id}`);
    }
  };

  const handleRemove = async () => {
    if (isRemoving) return;

    try {
      setIsRemoving(true);
      await removeBookmark(bookmark.id);
      onRemove?.(bookmark.id);
    } catch (error) {
      logger.error("Failed to remove bookmark:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleMoveToFolder = () => {
    openAddToFolderModal(bookmark.id);
  };

  // Compact view for sidebar or list
  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "group flex cursor-pointer items-start gap-2 rounded-md p-2",
          "transition-colors hover:bg-accent",
          className,
        )}
        onClick={handleJumpToMessage}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleJumpToMessage();
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarImage
            src={message.user.avatar_url}
            alt={message.user.display_name}
          />
          <AvatarFallback className="text-xs">
            {getInitials(message.user.display_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">
            {getMessageTypeIcon(message.type)}
            {truncateContent(message.content, 60)}
          </p>
          {showChannel && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <HashIcon className="h-3 w-3" />
              {message.channel.name}
            </p>
          )}
        </div>
        {isHovered && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            disabled={isRemoving}
          >
            <TrashIcon className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Full view for bookmarks panel
  return (
    <div
      className={cn(
        "group relative rounded-lg border p-4 transition-colors",
        "hover:bg-accent/50",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage
              src={message.user.avatar_url}
              alt={message.user.display_name}
            />
            <AvatarFallback>
              {getInitials(message.user.display_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">
                {message.user.display_name}
              </span>
              <span className="text-xs text-muted-foreground">
                @{message.user.username}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(message.created_at)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{formatMessageTimeTooltip(message.created_at)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {message.is_edited && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={handleJumpToMessage}
                >
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Jump to message</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleJumpToMessage}>
                <ArrowRightIcon className="mr-2 h-4 w-4" />
                Jump to message
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMoveToFolder}>
                <FolderIcon className="mr-2 h-4 w-4" />
                Move to folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleRemove}
                disabled={isRemoving}
                className="text-destructive focus:text-destructive"
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Remove bookmark
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Message Content */}
      <div className="mt-3 pl-[52px]">
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {getMessageTypeIcon(message.type) && (
            <span className="mr-1 text-muted-foreground">
              {getMessageTypeIcon(message.type)}
            </span>
          )}
          {truncateContent(message.content)}
        </p>

        {/* Attachments Preview */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.slice(0, 3).map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs"
              >
                <span className="max-w-[100px] truncate">
                  {attachment.file_name}
                </span>
              </div>
            ))}
            {message.attachments.length > 3 && (
              <div className="flex items-center rounded bg-muted px-2 py-1 text-xs">
                +{message.attachments.length - 3} more
              </div>
            )}
          </div>
        )}

        {/* Note */}
        {bookmark.note && (
          <div className="mt-2 rounded-r border-l-2 border-yellow-400 bg-yellow-50 px-3 py-2 dark:bg-yellow-900/20">
            <p className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <PencilIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{bookmark.note}</span>
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 pl-[52px] text-xs text-muted-foreground">
        {showChannel && (
          <div className="flex items-center gap-1">
            <HashIcon className="h-3 w-3" />
            <span>{message.channel.name}</span>
          </div>
        )}
        {showFolder && folder && (
          <div className="flex items-center gap-1">
            <FolderIcon className="h-3 w-3" />
            <span>{folder.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span>Saved {formatRelativeTime(bookmark.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

export default BookmarkItem;
