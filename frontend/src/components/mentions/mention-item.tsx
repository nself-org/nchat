"use client";

/**
 * MentionItem - Single mention display component
 *
 * Shows a mention with message preview, author info, channel context,
 * timestamp, and unread indicator. Supports jumping to the original message.
 *
 * @example
 * ```tsx
 * <MentionItem
 *   mention={mention}
 *   onJumpToMessage={handleJump}
 *   onMarkAsRead={handleMarkRead}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, formatMessageTimeTooltip } from "@/lib/date";
import {
  type Mention,
  type MentionType,
  getMentionTypeLabel,
  extractMentionPreview,
} from "@/lib/mentions/mention-store";

// ============================================================================
// Types
// ============================================================================

export interface MentionItemProps {
  /** The mention to display */
  mention: Mention;
  /** Called when user wants to jump to the message */
  onJumpToMessage?: (mention: Mention) => void;
  /** Called when marking as read */
  onMarkAsRead?: (mentionId: string) => void;
  /** Whether this item is selected */
  isSelected?: boolean;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

interface UnreadIndicatorProps {
  isUnread: boolean;
}

function UnreadIndicator({ isUnread }: UnreadIndicatorProps) {
  if (!isUnread) return null;

  return (
    <span
      className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary"
      aria-label="Unread mention"
    />
  );
}

interface MentionTypeBadgeProps {
  type: MentionType;
}

function MentionTypeBadge({ type }: MentionTypeBadgeProps) {
  const label = getMentionTypeLabel(type);
  const isGroupMention = type !== "user";

  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-xs",
        isGroupMention
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-primary/10 text-primary",
      )}
    >
      {label}
    </span>
  );
}

interface ChannelLinkProps {
  channel: Mention["message"]["channel"];
}

function ChannelLink({ channel }: ChannelLinkProps) {
  const icon = channel.is_private ? (
    <svg
      className="h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ) : (
    <span className="text-xs">#</span>
  );

  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      {icon}
      <span>{channel.name}</span>
    </span>
  );
}

interface MessagePreviewProps {
  content: string;
  mentionType: MentionType;
  currentUserId?: string;
}

function MessagePreview({ content, mentionType }: MessagePreviewProps) {
  const preview = extractMentionPreview(content, 120);

  // Highlight the mention in the preview
  const highlightedContent = React.useMemo(() => {
    // Match @mentions in the content
    const mentionRegex = /@(\w+|here|channel|everyone)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(preview)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(preview.slice(lastIndex, match.index));
      }

      // Add highlighted mention
      parts.push(
        <span
          key={match.index}
          className="bg-primary/10 rounded px-0.5 font-medium text-primary"
        >
          {match[0]}
        </span>,
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < preview.length) {
      parts.push(preview.slice(lastIndex));
    }

    return parts.length > 0 ? parts : preview;
  }, [preview]);

  return (
    <p className="text-foreground/80 line-clamp-2 text-sm">
      {highlightedContent}
    </p>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MentionItem({
  mention,
  onJumpToMessage,
  onMarkAsRead,
  isSelected = false,
  className,
}: MentionItemProps) {
  const { message } = mention;
  const author = message.user;
  const channel = message.channel;

  const handleClick = React.useCallback(() => {
    onJumpToMessage?.(mention);
  }, [mention, onJumpToMessage]);

  const handleMarkRead = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!mention.is_read) {
        onMarkAsRead?.(mention.id);
      }
    },
    [mention, onMarkAsRead],
  );

  // Get initials for avatar fallback
  const initials = React.useMemo(() => {
    const name = author.display_name || author.username;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [author]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "relative flex cursor-pointer gap-3 p-3 transition-colors",
        "hover:bg-accent/50",
        "focus:bg-accent/50 focus:outline-none",
        !mention.is_read && "bg-primary/5",
        isSelected && "bg-accent",
        className,
      )}
    >
      {/* Unread indicator */}
      <UnreadIndicator isUnread={!mention.is_read} />

      {/* Author avatar */}
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage
          src={author.avatar_url || undefined}
          alt={author.display_name}
        />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium">
              {author.display_name || author.username}
            </span>
            <MentionTypeBadge type={mention.type} />
          </div>
          <time
            className="shrink-0 text-xs text-muted-foreground"
            dateTime={mention.created_at}
            title={formatMessageTimeTooltip(mention.created_at)}
          >
            {formatRelativeTime(mention.created_at)}
          </time>
        </div>

        {/* Channel context */}
        <div className="flex items-center gap-2">
          <ChannelLink channel={channel} />
        </div>

        {/* Message preview */}
        <MessagePreview content={message.content} mentionType={mention.type} />

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClick}
            className="h-7 text-xs text-primary hover:text-primary"
          >
            <svg
              className="mr-1 h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Jump to message
          </Button>

          {!mention.is_read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkRead}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <svg
                className="mr-1 h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Mark as read
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Variant
// ============================================================================

export interface MentionItemCompactProps {
  mention: Mention;
  onJumpToMessage?: (mention: Mention) => void;
  className?: string;
}

export function MentionItemCompact({
  mention,
  onJumpToMessage,
  className,
}: MentionItemCompactProps) {
  const { message } = mention;
  const author = message.user;
  const channel = message.channel;

  const preview = extractMentionPreview(message.content, 50);

  return (
    <button
      onClick={() => onJumpToMessage?.(mention)}
      className={cn(
        "flex w-full items-center gap-2 p-2 text-left",
        "hover:bg-accent/50 rounded-md transition-colors",
        "focus:bg-accent/50 focus:outline-none",
        !mention.is_read && "bg-primary/5",
        className,
      )}
    >
      {!mention.is_read && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      )}
      <span className="shrink-0 text-xs text-muted-foreground">
        #{channel.name}
      </span>
      <span className="truncate text-sm font-medium">
        {author.display_name || author.username}:
      </span>
      <span className="truncate text-sm text-muted-foreground">{preview}</span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
        {formatRelativeTime(mention.created_at)}
      </span>
    </button>
  );
}

export default MentionItem;
