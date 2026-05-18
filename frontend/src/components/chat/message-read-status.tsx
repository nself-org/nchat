"use client";

import { memo, useMemo } from "react";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import type { ReadReceipt, DeliveryStatus } from "@/stores/read-receipts-store";

// ============================================================================
// Types
// ============================================================================

export interface MessageReadStatusProps {
  /** Message ID */
  messageId: string;
  /** Current delivery status */
  status: DeliveryStatus;
  /** Whether this is the current user's message */
  isOwnMessage: boolean;
  /** Whether this is a direct message (1-on-1 chat) */
  isDirectMessage?: boolean;
  /** Users who have read this message */
  readBy?: ReadReceipt[];
  /** Total recipients in the channel/group */
  totalRecipients?: number;
  /** Callback for retry action when failed */
  onRetry?: () => void;
  /** Error message when failed */
  errorMessage?: string;
  /** Size variant */
  size?: "sm" | "default";
  /** Whether to show tooltip/popover */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Status Icon Components
// ============================================================================

const StatusIcon = memo(function StatusIcon({
  status,
  size = "default",
  hasReaders,
  className,
}: {
  status: DeliveryStatus;
  size?: "sm" | "default";
  hasReaders?: boolean;
  className?: string;
}) {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  switch (status) {
    case "sending":
      return (
        <Clock
          className={cn(
            iconSize,
            "animate-pulse text-muted-foreground",
            className,
          )}
          aria-label="Sending"
        />
      );
    case "sent":
      return (
        <Check
          className={cn(iconSize, "text-muted-foreground", className)}
          aria-label="Sent"
        />
      );
    case "delivered":
      return (
        <CheckCheck
          className={cn(iconSize, "text-muted-foreground", className)}
          aria-label="Delivered"
        />
      );
    case "read":
      return (
        <CheckCheck
          className={cn(
            iconSize,
            hasReaders ? "fill-primary/20 text-primary" : "text-primary",
            className,
          )}
          aria-label="Read"
        />
      );
    case "failed":
      return (
        <AlertCircle
          className={cn(iconSize, "text-destructive", className)}
          aria-label="Failed to send"
        />
      );
    default:
      return null;
  }
});

// ============================================================================
// Read By Popover Content
// ============================================================================

const ReadByContent = memo(function ReadByContent({
  readBy,
  totalRecipients,
}: {
  readBy: ReadReceipt[];
  totalRecipients?: number;
}) {
  const sortedReaders = useMemo(
    () =>
      [...readBy].sort(
        (a, b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime(),
      ),
    [readBy],
  );

  const unreadCount = totalRecipients
    ? Math.max(0, totalRecipients - readBy.length)
    : 0;

  return (
    <div className="w-56">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium">Read by</span>
        {totalRecipients && (
          <span className="text-muted-foreground">
            {readBy.length}/{totalRecipients}
          </span>
        )}
      </div>

      {readBy.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No one has read this yet
        </p>
      ) : (
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {sortedReaders.map((receipt) => (
              <div
                key={receipt.userId}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={receipt.user?.avatarUrl}
                      alt={receipt.user?.displayName || "User"}
                    />
                    <AvatarFallback className="text-[10px]">
                      {(receipt.user?.displayName || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {receipt.user?.displayName || "Unknown"}
                  </span>
                </div>
                <span
                  className="text-[10px] text-muted-foreground"
                  title={format(new Date(receipt.readAt), "PPpp")}
                >
                  {formatDistanceToNow(new Date(receipt.readAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {unreadCount > 0 && (
        <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
          {unreadCount} recipient{unreadCount !== 1 ? "s" : ""} haven't read
          this
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * MessageReadStatus Component
 *
 * Displays delivery and read status for messages with:
 * - Sending: Clock icon (animated)
 * - Sent: Single check (gray)
 * - Delivered: Double check (gray)
 * - Read: Double check (blue/filled)
 * - Failed: Alert icon (red)
 *
 * For group chats, shows a popover with who has read the message.
 * For DMs, shows simple read status with optional timestamp.
 */
export const MessageReadStatus = memo(function MessageReadStatus({
  messageId,
  status,
  isOwnMessage,
  isDirectMessage = false,
  readBy = [],
  totalRecipients,
  onRetry,
  errorMessage,
  size = "default",
  showDetails = true,
  className,
}: MessageReadStatusProps) {
  // Only show status for own messages
  if (!isOwnMessage) {
    return null;
  }

  // Determine effective status
  const effectiveStatus = readBy.length > 0 ? "read" : status;

  // Failed status with retry
  if (effectiveStatus === "failed") {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={onRetry}
              className={cn(
                "inline-flex items-center text-destructive hover:opacity-80",
                onRetry && "cursor-pointer",
                className,
              )}
              aria-label="Message failed to send. Click to retry."
            >
              <StatusIcon status="failed" size={size} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="space-y-1">
              <p className="font-medium">Failed to send</p>
              {errorMessage && (
                <p className="text-xs text-muted-foreground">{errorMessage}</p>
              )}
              {onRetry && (
                <p className="text-xs text-primary">Click to retry</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Simple status without details
  if (!showDetails) {
    return (
      <StatusIcon
        status={effectiveStatus}
        size={size}
        hasReaders={readBy.length > 0}
        className={className}
      />
    );
  }

  // DM read status - simple tooltip
  if (isDirectMessage) {
    const readTime = readBy[0]?.readAt;

    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex items-center", className)}>
              <StatusIcon
                status={effectiveStatus}
                size={size}
                hasReaders={readBy.length > 0}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            {effectiveStatus === "read" && readTime ? (
              <div>
                <p className="font-medium">Seen</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(readTime), { addSuffix: true })}
                </p>
              </div>
            ) : (
              <p>{getStatusLabel(effectiveStatus)}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Group chat read status - popover with readers list
  if (readBy.length > 0 && effectiveStatus === "read") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-0.5 hover:opacity-80",
              className,
            )}
            aria-label={`Read by ${readBy.length} people`}
          >
            <StatusIcon
              status={effectiveStatus}
              size={size}
              hasReaders={true}
            />
            {totalRecipients && totalRecipients > 2 && (
              <span className="text-[10px] text-primary">{readBy.length}</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="p-3">
          <ReadByContent readBy={readBy} totalRecipients={totalRecipients} />
        </PopoverContent>
      </Popover>
    );
  }

  // Simple status with tooltip
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center", className)}>
            <StatusIcon
              status={effectiveStatus}
              size={size}
              hasReaders={readBy.length > 0}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{getStatusLabel(effectiveStatus)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

// ============================================================================
// Inline Read Status (Compact variant for message timestamps)
// ============================================================================

export interface InlineReadStatusProps {
  /** Current delivery status */
  status: DeliveryStatus;
  /** Whether any readers exist */
  hasReaders?: boolean;
  /** Size variant */
  size?: "sm" | "default";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact inline read status indicator
 * Used alongside timestamps in message headers
 */
export const InlineReadStatus = memo(function InlineReadStatus({
  status,
  hasReaders = false,
  size = "sm",
  className,
}: InlineReadStatusProps) {
  const effectiveStatus = hasReaders ? "read" : status;

  return (
    <StatusIcon
      status={effectiveStatus}
      size={size}
      hasReaders={hasReaders}
      className={className}
    />
  );
});

// ============================================================================
// Group Read Indicator (Shows stacked avatars)
// ============================================================================

export interface GroupReadIndicatorProps {
  /** Users who have read the message */
  readBy: ReadReceipt[];
  /** Max avatars to show inline */
  maxAvatars?: number;
  /** Size variant */
  size?: "sm" | "default";
  /** Callback when clicked */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Shows stacked avatars of users who have read a message
 */
export const GroupReadIndicator = memo(function GroupReadIndicator({
  readBy,
  maxAvatars = 3,
  size = "default",
  onClick,
  className,
}: GroupReadIndicatorProps) {
  if (readBy.length === 0) return null;

  const displayReaders = readBy.slice(0, maxAvatars);
  const remainingCount = readBy.length - maxAvatars;
  const avatarSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const overlap = size === "sm" ? "-ml-1" : "-ml-1.5";

  const content = (
    <div className={cn("flex items-center", className)}>
      {displayReaders.map((receipt, index) => (
        <Avatar
          key={receipt.userId}
          className={cn(
            avatarSize,
            "border border-background",
            index > 0 && overlap,
          )}
        >
          <AvatarImage
            src={receipt.user?.avatarUrl}
            alt={receipt.user?.displayName || "User"}
          />
          <AvatarFallback className="text-[8px]">
            {(receipt.user?.displayName || "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <span
          className={cn(
            avatarSize,
            overlap,
            "flex items-center justify-center rounded-full border border-background bg-muted text-[8px] font-medium",
          )}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="hover:opacity-80"
        aria-label={`Read by ${readBy.length} people`}
      >
        {content}
      </button>
    );
  }

  return content;
});

// ============================================================================
// Helpers
// ============================================================================

function getStatusLabel(status: DeliveryStatus): string {
  switch (status) {
    case "sending":
      return "Sending...";
    case "sent":
      return "Sent";
    case "delivered":
      return "Delivered";
    case "read":
      return "Read";
    case "failed":
      return "Failed to send";
    default:
      return "";
  }
}

export default MessageReadStatus;
