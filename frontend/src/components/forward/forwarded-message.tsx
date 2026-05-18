"use client";

import * as React from "react";
import {
  Forward,
  Hash,
  Lock,
  ExternalLink,
  Paperclip,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user/user-avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFeatureEnabled } from "@/lib/features/hooks/use-feature";
import { FEATURES } from "@/lib/features/feature-flags";

// ============================================================================
// Types
// ============================================================================

export interface ForwardedMessageUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface ForwardedMessageChannel {
  id: string;
  name: string;
  slug: string;
  type: "public" | "private" | "direct" | "group";
  isPrivate?: boolean;
}

export interface ForwardedMessageAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  thumbnailUrl?: string;
}

export interface OriginalMessage {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  user: ForwardedMessageUser;
  channel: ForwardedMessageChannel;
  attachments?: ForwardedMessageAttachment[];
}

export interface ForwardedMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The original message that was forwarded */
  originalMessage: OriginalMessage;
  /** Optional comment added when forwarding */
  comment?: string;
  /** Called when clicking to go to original message */
  onNavigateToOriginal?: (messageId: string, channelId: string) => void;
  /** Whether to show the full original message content */
  expanded?: boolean;
  /** Whether to show attachments preview */
  showAttachments?: boolean;
  /** Maximum content length before truncation */
  maxContentLength?: number;
  /** Compact display mode */
  compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + "...";
}

// ============================================================================
// Forward Header Component
// ============================================================================

interface ForwardHeaderProps {
  user: ForwardedMessageUser;
  channel: ForwardedMessageChannel;
  timestamp: string;
  onNavigate?: () => void;
  compact?: boolean;
}

function ForwardHeader({
  user,
  channel,
  timestamp,
  onNavigate,
  compact,
}: ForwardHeaderProps) {
  const ChannelIcon = channel.isPrivate ? Lock : Hash;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        compact && "text-[11px]",
      )}
    >
      <Forward className={cn("h-3 w-3", compact && "h-2.5 w-2.5")} />
      <span>Forwarded from</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onNavigate}
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              "text-foreground/80 hover:text-foreground hover:underline",
              "focus:underline focus:outline-none",
              "transition-colors",
            )}
          >
            <UserAvatar
              user={{
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
              }}
              size="xs"
              showPresence={false}
              className={cn(compact && "h-4 w-4")}
            />
            <span>{user.displayName}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>@{user.username}</p>
        </TooltipContent>
      </Tooltip>
      <span>in</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onNavigate}
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              "text-foreground/80 hover:text-foreground hover:underline",
              "focus:underline focus:outline-none",
              "transition-colors",
            )}
          >
            <ChannelIcon className="h-3 w-3" />
            <span>{channel.name}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Click to view original message</p>
        </TooltipContent>
      </Tooltip>
      <span className="ml-auto">{formatTimestamp(timestamp)}</span>
    </div>
  );
}

// ============================================================================
// Attachments Preview Component
// ============================================================================

interface AttachmentsPreviewProps {
  attachments: ForwardedMessageAttachment[];
  compact?: boolean;
}

function AttachmentsPreview({ attachments, compact }: AttachmentsPreviewProps) {
  const imageAttachments = attachments.filter((a) =>
    a.fileType.startsWith("image/"),
  );
  const otherAttachments = attachments.filter(
    (a) => !a.fileType.startsWith("image/"),
  );

  return (
    <div className="mt-2 space-y-1.5">
      {/* Image thumbnails */}
      {imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {imageAttachments.slice(0, 4).map((attachment) => (
            <div
              key={attachment.id}
              className={cn(
                "relative overflow-hidden rounded-md bg-muted",
                compact ? "h-12 w-12" : "h-16 w-16",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachment.thumbnailUrl || attachment.fileUrl}
                alt={attachment.fileName}
                className="h-full w-full object-cover"
              />
              {imageAttachments.length > 4 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
                  +{imageAttachments.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Other attachments */}
      {otherAttachments.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Paperclip className="h-3 w-3" />
          <span>
            {otherAttachments.length}{" "}
            {otherAttachments.length === 1 ? "file" : "files"}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const ForwardedMessage = React.forwardRef<
  HTMLDivElement,
  ForwardedMessageProps
>(
  (
    {
      className,
      originalMessage,
      comment,
      onNavigateToOriginal,
      expanded = false,
      showAttachments = true,
      maxContentLength = 300,
      compact = false,
      ...props
    },
    ref,
  ) => {
    const isForwardEnabled = useFeatureEnabled(FEATURES.MESSAGES_FORWARD);

    // Don't render if forwarding is disabled
    if (!isForwardEnabled) {
      return null;
    }

    const handleNavigate = () => {
      onNavigateToOriginal?.(originalMessage.id, originalMessage.channel.id);
    };

    const displayContent = expanded
      ? originalMessage.content
      : truncateContent(originalMessage.content, maxContentLength);

    const hasAttachments =
      originalMessage.attachments && originalMessage.attachments.length > 0;

    return (
      <div
        ref={ref}
        className={cn(
          "border-primary/30 bg-muted/30 rounded-lg border-l-2",
          compact ? "p-2" : "p-3",
          className,
        )}
        {...props}
      >
        {/* Forward indicator header */}
        <ForwardHeader
          user={originalMessage.user}
          channel={originalMessage.channel}
          timestamp={originalMessage.createdAt}
          onNavigate={handleNavigate}
          compact={compact}
        />

        {/* Original message content */}
        <div className={cn("mt-2", compact && "mt-1.5")}>
          <p
            className={cn(
              "text-foreground/90 whitespace-pre-wrap",
              compact ? "text-sm" : "text-sm",
            )}
          >
            {displayContent}
          </p>

          {/* Show "read more" if truncated */}
          {!expanded && originalMessage.content.length > maxContentLength && (
            <button
              type="button"
              onClick={handleNavigate}
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <span>View full message</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          )}

          {/* Attachments */}
          {showAttachments && hasAttachments && (
            <AttachmentsPreview
              attachments={originalMessage.attachments!}
              compact={compact}
            />
          )}
        </div>

        {/* Comment from forwarder */}
        {comment && (
          <div
            className={cn(
              "border-border/50 mt-3 border-t pt-2",
              compact && "mt-2 pt-1.5",
            )}
          >
            <p className={cn("text-sm italic", compact && "text-xs")}>
              "{comment}"
            </p>
          </div>
        )}

        {/* Navigate to original action */}
        <button
          type="button"
          onClick={handleNavigate}
          className={cn(
            "mt-2 inline-flex items-center gap-1",
            "text-xs text-muted-foreground hover:text-foreground",
            "focus:underline focus:outline-none",
            "transition-colors",
          )}
        >
          <ExternalLink className="h-3 w-3" />
          <span>Go to original</span>
        </button>
      </div>
    );
  },
);

ForwardedMessage.displayName = "ForwardedMessage";

// ============================================================================
// Compact Forwarded Message (for message list)
// ============================================================================

export interface ForwardedMessageCompactProps {
  originalMessage: OriginalMessage;
  onNavigateToOriginal?: (messageId: string, channelId: string) => void;
}

export function ForwardedMessageCompact({
  originalMessage,
  onNavigateToOriginal,
}: ForwardedMessageCompactProps) {
  return (
    <ForwardedMessage
      originalMessage={originalMessage}
      onNavigateToOriginal={onNavigateToOriginal}
      compact
      showAttachments={false}
      maxContentLength={150}
    />
  );
}

// ============================================================================
// Forward Indicator Badge (for inline display)
// ============================================================================

export interface ForwardIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  onClick?: () => void;
}

export const ForwardIndicator = React.forwardRef<
  HTMLSpanElement,
  ForwardIndicatorProps
>(({ className, onClick, ...props }, ref) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Conditionally interactive based on onClick */}
        <span
          ref={ref}
          {...(onClick ? { role: "button", tabIndex: 0 } : {})}
          onClick={onClick}
          onKeyDown={
            onClick
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick();
                  }
                }
              : undefined
          }
          className={cn(
            "inline-flex items-center gap-1 rounded-sm px-1 py-0.5",
            "text-xs text-muted-foreground",
            "bg-muted/50 hover:bg-muted",
            onClick && "cursor-pointer",
            "transition-colors",
            className,
          )}
          {...props}
        >
          <Forward className="h-3 w-3" />
          <span>Forwarded</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>This message was forwarded</p>
      </TooltipContent>
    </Tooltip>
  );
});

ForwardIndicator.displayName = "ForwardIndicator";

export default ForwardedMessage;
