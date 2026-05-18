"use client";

import { useState, memo, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Eye, Users, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MessageUser } from "@/types/message";

// ============================================================================
// Types
// ============================================================================

export interface ReadReceipt {
  /** User who read the message */
  user: MessageUser;
  /** When they read it */
  readAt: Date | string;
}

export interface ReadByListProps {
  /** List of users who have read the message */
  readBy: ReadReceipt[];
  /** Total recipients (for showing read/unread ratio) */
  totalRecipients?: number;
  /** Whether to show as modal (for many readers) */
  asModal?: boolean;
  /** Whether the modal is open (controlled) */
  open?: boolean;
  /** Callback when modal open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Maximum avatars to show inline */
  maxInlineAvatars?: number;
  /** Size variant */
  size?: "sm" | "default";
  /** Additional CSS classes */
  className?: string;
}

export interface ReadByPopoverProps {
  /** List of users who have read the message */
  readBy: ReadReceipt[];
  /** Trigger element */
  children: React.ReactNode;
  /** Side of popover */
  side?: "top" | "bottom" | "left" | "right";
  /** Additional CSS classes */
  className?: string;
}

export interface ReadByModalProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** List of users who have read the message */
  readBy: ReadReceipt[];
  /** Total recipients */
  totalRecipients?: number;
  /** Loading state */
  isLoading?: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Single read receipt item
 */
const ReadReceiptItem = memo(function ReadReceiptItem({
  receipt,
  showTime = true,
}: {
  receipt: ReadReceipt;
  showTime?: boolean;
}) {
  const readDate = new Date(receipt.readAt);

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={receipt.user.avatarUrl}
            alt={receipt.user.displayName}
          />
          <AvatarFallback className="text-xs">
            {receipt.user.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{receipt.user.displayName}</p>
          {receipt.user.username && (
            <p className="text-xs text-muted-foreground">
              @{receipt.user.username}
            </p>
          )}
        </div>
      </div>
      {showTime && (
        <p
          className="text-xs text-muted-foreground"
          title={format(readDate, "PPpp")}
        >
          {formatDistanceToNow(readDate, { addSuffix: true })}
        </p>
      )}
    </div>
  );
});

/**
 * Stacked avatar display for inline read indicators
 */
const StackedAvatars = memo(function StackedAvatars({
  users,
  maxDisplay = 3,
  size = "default",
}: {
  users: MessageUser[];
  maxDisplay?: number;
  size?: "sm" | "default";
}) {
  const displayUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  const avatarSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const overlap = size === "sm" ? "-ml-1.5" : "-ml-2";

  return (
    <div className="flex items-center">
      {displayUsers.map((user, index) => (
        <Avatar
          key={user.id}
          className={cn(
            avatarSize,
            "border-2 border-background",
            index > 0 && overlap,
          )}
        >
          <AvatarImage src={user.avatarUrl} alt={user.displayName} />
          <AvatarFallback className="text-[10px]">
            {user.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <span
          className={cn(
            avatarSize,
            overlap,
            "flex items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium",
          )}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
});

// ============================================================================
// Popover Component
// ============================================================================

/**
 * Read By Popover
 *
 * Shows a small popover with the list of users who read the message
 */
export const ReadByPopover = memo(function ReadByPopover({
  readBy,
  children,
  side = "top",
  className,
}: ReadByPopoverProps) {
  const sortedReadBy = useMemo(
    () =>
      [...readBy].sort(
        (a, b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime(),
      ),
    [readBy],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align="end"
        className={cn("w-64 p-2", className)}
      >
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4" />
          <span>Read by {readBy.length}</span>
        </div>
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {sortedReadBy.map((receipt) => (
              <ReadReceiptItem key={receipt.user.id} receipt={receipt} />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
});

// ============================================================================
// Modal Component
// ============================================================================

/**
 * Read By Modal
 *
 * Full modal showing all users who read the message
 */
export const ReadByModal = memo(function ReadByModal({
  open,
  onOpenChange,
  readBy,
  totalRecipients,
  isLoading = false,
}: ReadByModalProps) {
  const sortedReadBy = useMemo(
    () =>
      [...readBy].sort(
        (a, b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime(),
      ),
    [readBy],
  );

  const unreadCount = totalRecipients ? totalRecipients - readBy.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Read by</DialogTitle>
              <DialogDescription>
                {totalRecipients
                  ? `${readBy.length} of ${totalRecipients} recipients`
                  : `${readBy.length} ${readBy.length === 1 ? "person" : "people"}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Stats bar */}
        {totalRecipients && totalRecipients > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(readBy.length / totalRecipients) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round((readBy.length / totalRecipients) * 100)}%
            </span>
          </div>
        )}

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : readBy.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No one has read this message yet
            </div>
          ) : (
            <div className="divide-y">
              {sortedReadBy.map((receipt) => (
                <ReadReceiptItem key={receipt.user.id} receipt={receipt} />
              ))}
            </div>
          )}
        </ScrollArea>

        {unreadCount > 0 && (
          <div className="bg-muted/30 rounded-lg border p-3 text-center text-sm text-muted-foreground">
            <Users className="mr-1 inline-block h-4 w-4" />
            {unreadCount} recipient{unreadCount !== 1 ? "s" : ""} haven't read
            this yet
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * Read By List Component
 *
 * Shows who has read a message with avatars and an expandable list
 */
export const ReadByList = memo(function ReadByList({
  readBy,
  totalRecipients,
  asModal = false,
  open,
  onOpenChange,
  maxInlineAvatars = 3,
  size = "default",
  className,
}: ReadByListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const users = useMemo(() => readBy.map((r) => r.user), [readBy]);

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setIsModalOpen(newOpen);
    }
  };

  const actualOpen = open !== undefined ? open : isModalOpen;

  if (readBy.length === 0) {
    return null;
  }

  // For modal mode or many readers
  if (asModal || readBy.length > maxInlineAvatars) {
    return (
      <>
        <button
          onClick={() => handleOpenChange(true)}
          className={cn(
            "inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground",
            size === "sm" ? "text-xs" : "text-sm",
            className,
          )}
        >
          <StackedAvatars
            users={users}
            maxDisplay={maxInlineAvatars}
            size={size}
          />
          <span>
            Read by {readBy.length}
            {totalRecipients && ` of ${totalRecipients}`}
          </span>
        </button>

        <ReadByModal
          open={actualOpen}
          onOpenChange={handleOpenChange}
          readBy={readBy}
          totalRecipients={totalRecipients}
        />
      </>
    );
  }

  // Inline popover for few readers
  return (
    <ReadByPopover readBy={readBy}>
      <button
        className={cn(
          "inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground",
          size === "sm" ? "text-xs" : "text-sm",
          className,
        )}
      >
        <StackedAvatars
          users={users}
          maxDisplay={maxInlineAvatars}
          size={size}
        />
        {totalRecipients && (
          <span>
            {readBy.length}/{totalRecipients}
          </span>
        )}
      </button>
    </ReadByPopover>
  );
});

// ============================================================================
// Inline Read Indicator (for DMs)
// ============================================================================

export interface InlineReadIndicatorProps {
  /** Whether the message has been read */
  isRead: boolean;
  /** When it was read */
  readAt?: Date | string;
  /** Reader info (for DMs) */
  reader?: MessageUser;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Inline Read Indicator
 *
 * Simple "Seen" indicator for direct messages
 */
export const InlineReadIndicator = memo(function InlineReadIndicator({
  isRead,
  readAt,
  reader,
  className,
}: InlineReadIndicatorProps) {
  if (!isRead) {
    return null;
  }

  const readDate = readAt ? new Date(readAt) : null;

  return (
    <span
      className={cn("text-xs text-muted-foreground", className)}
      title={readDate ? format(readDate, "PPpp") : undefined}
    >
      Seen
      {readDate && ` ${formatDistanceToNow(readDate, { addSuffix: true })}`}
    </span>
  );
});

export default ReadByList;
