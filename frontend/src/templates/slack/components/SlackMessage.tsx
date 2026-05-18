"use client";

// ===============================================================================
// Slack Message Component
// ===============================================================================
//
// A Slack-style message with avatar, username, timestamp, content,
// reactions, and thread replies indicator.
//
// ===============================================================================

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { slackColors } from "../config";
import {
  Smile,
  MessageCircle,
  Share,
  Bookmark,
  MoreHorizontal,
  Pin,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface SlackMessageProps {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  isEdited?: boolean;
  isPinned?: boolean;
  isHighlighted?: boolean;
  isFirstInGroup?: boolean;
  reactions?: SlackReaction[];
  threadCount?: number;
  threadParticipants?: string[];
  attachments?: SlackAttachment[];
  onReactionAdd?: (emoji: string) => void;
  onReactionRemove?: (emoji: string) => void;
  onThreadClick?: () => void;
  onShareClick?: () => void;
  onBookmarkClick?: () => void;
  onMoreClick?: () => void;
  className?: string;
}

export interface SlackReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users?: string[];
}

export interface SlackAttachment {
  type: "image" | "file" | "link";
  url: string;
  name?: string;
  thumbnailUrl?: string;
  size?: number;
}

// -------------------------------------------------------------------------------
// Helper Components
// -------------------------------------------------------------------------------

function MessageActions({
  onReactionAdd,
  onThreadClick,
  onShareClick,
  onBookmarkClick,
  onMoreClick,
}: {
  onReactionAdd?: (emoji: string) => void;
  onThreadClick?: () => void;
  onShareClick?: () => void;
  onBookmarkClick?: () => void;
  onMoreClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "absolute -top-4 right-4 flex items-center gap-0.5 p-0.5",
        "rounded-lg border border-gray-200 bg-white shadow-md dark:border-[#35383C] dark:bg-[#222529]",
        "opacity-0 transition-opacity group-hover:opacity-100",
      )}
    >
      <ActionButton
        icon={<Smile className="h-4 w-4" />}
        onClick={() => onReactionAdd?.("👍")}
        tooltip="Add reaction"
      />
      <ActionButton
        icon={<MessageCircle className="h-4 w-4" />}
        onClick={onThreadClick}
        tooltip="Reply in thread"
      />
      <ActionButton
        icon={<Share className="h-4 w-4" />}
        onClick={onShareClick}
        tooltip="Share message"
      />
      <ActionButton
        icon={<Bookmark className="h-4 w-4" />}
        onClick={onBookmarkClick}
        tooltip="Save for later"
      />
      <ActionButton
        icon={<MoreHorizontal className="h-4 w-4" />}
        onClick={onMoreClick}
        tooltip="More actions"
      />
    </div>
  );
}

function ActionButton({
  icon,
  onClick,
  tooltip,
}: {
  icon: ReactNode;
  onClick?: () => void;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#35383C] dark:hover:text-gray-200"
    >
      {icon}
    </button>
  );
}

function ReactionPill({
  reaction,
  onClick,
}: {
  reaction: SlackReaction;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        "border transition-colors",
        reaction.hasReacted
          ? "border-[#1264A3] bg-[#E8F5FA] text-[#1264A3]"
          : "border-gray-200 bg-white text-gray-700 hover:border-[#1264A3] dark:border-[#35383C] dark:bg-[#222529] dark:text-gray-300",
      )}
    >
      <span>{reaction.emoji}</span>
      <span className="font-medium">{reaction.count}</span>
    </button>
  );
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// -------------------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------------------

export function SlackMessage({
  id,
  userId,
  userName,
  userAvatar,
  content,
  timestamp,
  isEdited,
  isPinned,
  isHighlighted,
  isFirstInGroup = true,
  reactions = [],
  threadCount,
  threadParticipants = [],
  attachments = [],
  onReactionAdd,
  onReactionRemove,
  onThreadClick,
  onShareClick,
  onBookmarkClick,
  onMoreClick,
  className,
}: SlackMessageProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn(
        "group relative px-5 py-1",
        "hover:bg-[#F8F8F8] dark:hover:bg-[#222529]",
        isHighlighted && "bg-[#FEF9E9] dark:bg-[#5C4C0B]",
        isPinned && "border-l-4 border-[#ECB22E]",
        className,
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Message Actions Toolbar */}
      {showActions && (
        <MessageActions
          onReactionAdd={onReactionAdd}
          onThreadClick={onThreadClick}
          onShareClick={onShareClick}
          onBookmarkClick={onBookmarkClick}
          onMoreClick={onMoreClick}
        />
      )}

      <div className="flex gap-2">
        {/* Avatar */}
        {isFirstInGroup ? (
          <div className="h-9 w-9 flex-shrink-0">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="h-9 w-9 rounded object-cover"
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded text-sm font-bold text-white"
                style={{ backgroundColor: slackColors.aubergine }}
              >
                {userName[0]?.toUpperCase()}
              </div>
            )}
          </div>
        ) : (
          <div className="flex w-9 flex-shrink-0 items-center justify-center text-xs text-gray-400 opacity-0 group-hover:opacity-100">
            {formatTimestamp(timestamp).split(" ")[0]}
          </div>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header (only for first message in group) */}
          {isFirstInGroup && (
            <div className="mb-0.5 flex items-baseline gap-2">
              <button className="font-bold text-gray-900 hover:underline dark:text-white">
                {userName}
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimestamp(timestamp)}
              </span>
              {isPinned && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Pin className="h-3 w-3" />
                  Pinned
                </span>
              )}
            </div>
          )}

          {/* Message Text */}
          <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
            {content}
            {isEdited && (
              <span className="ml-1 text-xs text-gray-400">(edited)</span>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="max-w-md overflow-hidden rounded-lg border border-gray-200 dark:border-[#35383C]"
                >
                  {attachment.type === "image" && (
                    <img
                      src={attachment.url}
                      alt={attachment.name || "Image"}
                      className="h-auto max-w-full"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reactions */}
          {reactions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {reactions.map((reaction, index) => (
                <ReactionPill
                  key={index}
                  reaction={reaction}
                  onClick={() =>
                    reaction.hasReacted
                      ? onReactionRemove?.(reaction.emoji)
                      : onReactionAdd?.(reaction.emoji)
                  }
                />
              ))}
              <button
                onClick={() => onReactionAdd?.("👍")}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-[#1264A3] hover:text-[#1264A3] dark:border-[#35383C]"
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Thread indicator */}
          {threadCount && threadCount > 0 && (
            <button
              onClick={onThreadClick}
              className="mt-2 flex items-center gap-2 text-sm text-[#1264A3] hover:underline"
            >
              <div className="flex -space-x-1">
                {threadParticipants.slice(0, 3).map((participant, index) => (
                  <div
                    key={index}
                    className="h-5 w-5 rounded border-2 border-white bg-gray-300 dark:border-[#1A1D21]"
                  />
                ))}
              </div>
              <span className="font-medium">
                {threadCount} {threadCount === 1 ? "reply" : "replies"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SlackMessage;
