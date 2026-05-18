"use client";

import { useState, useCallback, memo } from "react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useAppConfig } from "@/contexts/app-config-context";
import { MessageContent } from "./message-content";
import { MessageAttachments } from "./message-attachments";
import { MessageReactions } from "./message-reactions";
import {
  MessageThreadPreview,
  CompactThreadPreview,
} from "./message-thread-preview";
import { MessageActions, getMessagePermissions } from "./message-actions";
import { MessageContextMenu } from "./message-context-menu";
import { MessageSystem } from "./message-system";
import { InlineReplyIndicator } from "./reply-preview";
import { MessageDeliveryStatus } from "./message-delivery-status";
import { FailedMessageRetry } from "./failed-message-retry";
import { useMessageStatus } from "@/lib/messages/use-message-status";
import { messageEntry, messageHover } from "@/lib/animations";
import type {
  Message,
  MessageAction,
  MessageActionPermissions,
} from "@/types/message";

interface MessageItemProps {
  message: Message;
  isGrouped?: boolean;
  showAvatar?: boolean;
  isCompact?: boolean;
  isHighlighted?: boolean;
  onReply?: (message: Message) => void;
  onThread?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
  onRetryMessage?: (messageId: string) => void;
  className?: string;
}

/**
 * Individual message component
 * Renders a single message with all its features
 */
export const MessageItem = memo(function MessageItem({
  message,
  isGrouped = false,
  showAvatar = true,
  isCompact = false,
  isHighlighted = false,
  onReply,
  onThread,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
  onPin,
  onUnpin,
  onForward,
  onScrollToMessage,
  onRetryMessage,
  className,
}: MessageItemProps) {
  const [isHovering, setIsHovering] = useState(false);
  const { user } = useAuth();
  const { config } = useAppConfig();

  // Get message delivery status
  const { isFailed, error, retryCount, retry } = useMessageStatus({
    messageId: message.id,
  });

  // Calculate values needed for callbacks (before early return)
  const isOwnMessage = user?.id === message.userId;
  const userRole = user?.role || "member";
  const permissions = getMessagePermissions(isOwnMessage, userRole);

  // Feature flags from config
  const featuresEnabled = {
    reactions: config?.features?.reactions ?? true,
    threads: config?.features?.threads ?? true,
  };

  // Adjust permissions based on features
  const adjustedPermissions: MessageActionPermissions = {
    ...permissions,
    canReact: permissions.canReact && featuresEnabled.reactions,
    canThread: permissions.canThread && featuresEnabled.threads,
  };

  // Define all callbacks before any early returns (Rules of Hooks)
  const handleAction = useCallback(
    (action: MessageAction, data?: unknown) => {
      switch (action) {
        case "reply":
          onReply?.(message);
          break;
        case "thread":
          onThread?.(message);
          break;
        case "edit":
          onEdit?.(message);
          break;
        case "delete":
          onDelete?.(message.id);
          break;
        case "react":
          const emoji = (data as { emoji?: string })?.emoji || "thumbs_up";
          onReact?.(message.id, emoji);
          break;
        case "pin":
          onPin?.(message.id);
          break;
        case "unpin":
          onUnpin?.(message.id);
          break;
        case "forward":
          onForward?.(message);
          break;
        case "copy":
          // Already handled in context menu
          break;
        case "copy-link":
          // Already handled in context menu
          break;
      }
    },
    [
      message,
      onReply,
      onThread,
      onEdit,
      onDelete,
      onReact,
      onPin,
      onUnpin,
      onForward,
    ],
  );

  const handleReact = useCallback(
    (emoji: string) => {
      onReact?.(message.id, emoji);
    },
    [message.id, onReact],
  );

  const handleRemoveReaction = useCallback(
    (emoji: string) => {
      onRemoveReaction?.(message.id, emoji);
    },
    [message.id, onRemoveReaction],
  );

  // Check if this is a system message (after all hooks are defined)
  if (message.type !== "text") {
    return <MessageSystem message={message} className={className} />;
  }

  return (
    <MessageContextMenu
      message={message}
      permissions={adjustedPermissions}
      onAction={handleAction}
    >
      <motion.div
        variants={messageEntry}
        initial="initial"
        animate="animate"
        exit="exit"
        layout
        className={cn(
          "group relative px-4 transition-colors",
          isHovering && "bg-muted/50",
          isHighlighted && "bg-primary/5",
          message.isPinned && "border-l-2 border-l-amber-500 bg-amber-500/5",
          className,
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Pin indicator */}
        {message.isPinned && (
          <div className="absolute -left-0.5 top-2 text-amber-500">
            <Pin className="h-3 w-3" />
          </div>
        )}

        {/* Hover actions */}
        <AnimatePresence>
          {isHovering && (
            <MessageActions
              messageId={message.id}
              permissions={adjustedPermissions}
              isPinned={message.isPinned}
              isBookmarked={message.isBookmarked}
              onAction={handleAction}
            />
          )}
        </AnimatePresence>

        <div
          className={cn(
            "flex gap-3",
            isGrouped && !showAvatar && "pl-12",
            isCompact && "gap-2",
          )}
        >
          {/* Avatar */}
          {showAvatar && !isGrouped && (
            <div className="shrink-0 pt-0.5">
              <Avatar className={cn("h-9 w-9", isCompact && "h-6 w-6")}>
                <AvatarImage
                  src={message.user.avatarUrl}
                  alt={message.user.displayName}
                />
                <AvatarFallback className={cn(isCompact && "text-xs")}>
                  {message.user.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Grouped message timestamp (shown on hover) */}
          {isGrouped && (
            <div
              className={cn(
                "w-12 shrink-0 pt-1 text-right text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
              )}
            >
              <div className="flex items-center justify-end gap-1">
                <span>{format(new Date(message.createdAt), "h:mm")}</span>
                {user && (
                  <MessageDeliveryStatus
                    messageId={message.id}
                    messageUserId={message.userId}
                    currentUserId={user.id}
                    messageCreatedAt={new Date(message.createdAt)}
                    size="sm"
                    showTooltip={false}
                    showReadCount={false}
                    onRetry={onRetryMessage}
                  />
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Header (author + time + delivery status) - only for non-grouped messages */}
            {!isGrouped && (
              <div className="mb-0.5 flex items-baseline gap-2">
                <span
                  className={cn(
                    "font-semibold hover:underline",
                    isCompact && "text-sm",
                  )}
                >
                  {message.user.displayName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatMessageTime(new Date(message.createdAt))}
                </span>
                {message.isEdited && (
                  <span className="text-xs text-muted-foreground">
                    (edited)
                  </span>
                )}
                {/* Delivery status indicator */}
                {user && (
                  <MessageDeliveryStatus
                    messageId={message.id}
                    messageUserId={message.userId}
                    currentUserId={user.id}
                    messageCreatedAt={new Date(message.createdAt)}
                    size={isCompact ? "sm" : "md"}
                    onRetry={onRetryMessage}
                  />
                )}
              </div>
            )}

            {/* Reply indicator */}
            {message.replyTo && (
              <InlineReplyIndicator
                replyTo={message.replyTo}
                onClick={() => onScrollToMessage?.(message.replyTo!.id)}
              />
            )}

            {/* Message content */}
            <MessageContent
              content={message.content}
              contentHtml={message.contentHtml}
              mentions={message.mentionedUsers}
              channelMentions={message.mentionedChannels}
              className={cn(isCompact && "text-sm")}
            />

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <MessageAttachments
                attachments={message.attachments}
                linkPreviews={message.linkPreviews}
                className="mt-2"
              />
            )}

            {/* Reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <MessageReactions
                reactions={message.reactions}
                onReact={handleReact}
                onRemoveReaction={handleRemoveReaction}
                onAddReaction={
                  adjustedPermissions.canReact
                    ? () => handleAction("react")
                    : undefined
                }
                compact={isCompact}
                className="mt-2"
              />
            )}

            {/* Thread preview */}
            {message.threadInfo && featuresEnabled.threads && (
              <MessageThreadPreview
                threadInfo={message.threadInfo}
                onClick={() => onThread?.(message)}
                className="mt-1"
              />
            )}

            {/* Failed message retry indicator */}
            {isFailed && (
              <FailedMessageRetry
                messageId={message.id}
                content={message.content}
                errorMessage={error || undefined}
                retryCount={retryCount}
                maxRetries={3}
                onRetry={(id) => onRetryMessage?.(id) || retry()}
                onDelete={(id) => onDelete?.(id)}
                variant="inline"
                className="mt-2"
              />
            )}
          </div>
        </div>
      </motion.div>
    </MessageContextMenu>
  );
});

/**
 * Format message timestamp
 */
function formatMessageTime(date: Date): string {
  if (isToday(date)) {
    return format(date, "h:mm a");
  }

  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  }

  // Within the last week
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 7) {
    return format(date, "EEEE") + " at " + format(date, "h:mm a");
  }

  return format(date, "MMM d, yyyy") + " at " + format(date, "h:mm a");
}

/**
 * Compact message item for thread view
 */
export const CompactMessageItem = memo(function CompactMessageItem(
  props: MessageItemProps,
) {
  return <MessageItem {...props} isCompact showAvatar />;
});

/**
 * Message group component
 * Groups consecutive messages from the same user within a time window
 */
interface MessageGroupProps {
  messages: Message[];
  onReply?: (message: Message) => void;
  onThread?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  className?: string;
}

export function MessageGroup({
  messages,
  className,
  ...props
}: MessageGroupProps) {
  if (messages.length === 0) return null;

  return (
    <div className={cn("py-1", className)}>
      {messages.map((message, index) => (
        <MessageItem
          key={message.id}
          message={message}
          isGrouped={index > 0}
          showAvatar={index === 0}
          {...props}
        />
      ))}
    </div>
  );
}
