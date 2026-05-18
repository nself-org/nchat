"use client";

// ===============================================================================
// Discord Message Component
// ===============================================================================
//
// A Discord-style message with avatar, role-colored username,
// timestamp, reactions, and hover action bar.
//
// ===============================================================================

import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { discordColors } from "../config";
import {
  Smile,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Reply,
  Pencil,
  Trash2,
} from "lucide-react";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface DiscordMessageProps {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  roleColor?: string;
  isBot?: boolean;
  content: string;
  timestamp: Date;
  isEdited?: boolean;
  isPinned?: boolean;
  isReply?: boolean;
  replyTo?: {
    userName: string;
    content: string;
  };
  isFirstInGroup?: boolean;
  reactions?: DiscordReaction[];
  attachments?: DiscordAttachment[];
  onReactionAdd?: (emoji: string) => void;
  onReactionRemove?: (emoji: string) => void;
  onReplyClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  onPinClick?: () => void;
  className?: string;
}

export interface DiscordReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export interface DiscordAttachment {
  type: "image" | "video" | "file" | "embed";
  url: string;
  name?: string;
  width?: number;
  height?: number;
}

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function DiscordMessage({
  id,
  userId,
  userName,
  userAvatar,
  roleColor,
  isBot,
  content,
  timestamp,
  isEdited,
  isPinned,
  isReply,
  replyTo,
  isFirstInGroup = true,
  reactions = [],
  attachments = [],
  onReactionAdd,
  onReactionRemove,
  onReplyClick,
  onEditClick,
  onDeleteClick,
  onPinClick,
  className,
}: DiscordMessageProps) {
  const [showActions, setShowActions] = useState(false);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    }

    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div
      className={cn(
        "group relative py-0.5 pl-[72px] pr-12",
        "transition-colors hover:bg-[#2E3035]",
        isPinned && "border-l-2 border-yellow-500 bg-[#444]",
        className,
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Hover Actions */}
      {showActions && (
        <div className="absolute -top-4 right-4 z-10 flex items-center rounded border border-[#1E1F22] bg-[#2B2D31] shadow-lg">
          <ActionButton
            icon={<Smile className="h-5 w-5" />}
            onClick={() => onReactionAdd?.("👍")}
          />
          <ActionButton
            icon={<Reply className="h-5 w-5" />}
            onClick={onReplyClick}
          />
          <ActionButton
            icon={<Pin className="h-5 w-5" />}
            onClick={onPinClick}
          />
          <ActionButton
            icon={<Pencil className="h-5 w-5" />}
            onClick={onEditClick}
          />
          <ActionButton
            icon={<Trash2 className="h-5 w-5" />}
            onClick={onDeleteClick}
            danger
          />
          <ActionButton icon={<MoreHorizontal className="h-5 w-5" />} />
        </div>
      )}

      {/* Reply Reference */}
      {isReply && replyTo && (
        <div className="mb-1 ml-[-52px] flex items-center gap-1 text-sm">
          <div className="flex h-5 w-8 items-center justify-center">
            <div className="h-3 w-6 rounded-tl border-l-2 border-t-2 border-gray-500" />
          </div>
          <span className="text-gray-400">@{replyTo.userName}</span>
          <span className="max-w-[300px] truncate text-gray-500">
            {replyTo.content}
          </span>
        </div>
      )}

      {/* Avatar (only for first message in group) */}
      {isFirstInGroup && (
        <div className="absolute left-4 top-1">
          <div className="h-10 w-10 overflow-hidden rounded-full">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center font-bold text-white"
                style={{ backgroundColor: roleColor || discordColors.blurple }}
              >
                {userName[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message Content */}
      <div>
        {/* Header (only for first message in group) */}
        {isFirstInGroup && (
          <div className="mb-0.5 flex items-center gap-2">
            <button
              className="font-medium hover:underline"
              style={{ color: roleColor || discordColors.gray100 }}
            >
              {userName}
            </button>
            {isBot && (
              <span
                className="rounded px-1 py-0.5 text-[10px] font-semibold uppercase"
                style={{
                  backgroundColor: discordColors.blurple,
                  color: "white",
                }}
              >
                BOT
              </span>
            )}
            <span className="text-xs" style={{ color: discordColors.gray400 }}>
              {formatTimestamp(timestamp)}
            </span>
          </div>
        )}

        {/* Compact timestamp (for grouped messages) */}
        {!isFirstInGroup && (
          <span className="absolute left-0 w-[72px] text-center text-[10px] text-gray-500 opacity-0 group-hover:opacity-100">
            {timestamp.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
        )}

        {/* Text Content */}
        <div
          style={{ color: discordColors.gray100 }}
          className="whitespace-pre-wrap break-words"
        >
          {content}
          {isEdited && (
            <span className="ml-1 text-xs text-gray-500">(edited)</span>
          )}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="max-w-[400px] overflow-hidden rounded"
              >
                {attachment.type === "image" && (
                  <img
                    src={attachment.url}
                    alt={attachment.name || "Image"}
                    className="h-auto max-w-full rounded"
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
              <button
                key={index}
                onClick={() =>
                  reaction.hasReacted
                    ? onReactionRemove?.(reaction.emoji)
                    : onReactionAdd?.(reaction.emoji)
                }
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-sm",
                  "border transition-colors",
                  reaction.hasReacted
                    ? "border-[#5865F2] bg-[#5865F233] text-[#DEE0FC]"
                    : "border-[#1E1F22] bg-[#2B2D31] text-gray-300 hover:border-gray-500",
                )}
              >
                <span>{reaction.emoji}</span>
                <span className="font-medium">{reaction.count}</span>
              </button>
            ))}
            <button
              onClick={() => onReactionAdd?.("👍")}
              className="flex h-7 w-7 items-center justify-center rounded border border-[#1E1F22] bg-[#2B2D31] text-gray-500 hover:text-gray-300"
            >
              <Smile className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 transition-colors",
        danger
          ? "text-gray-400 hover:bg-red-500/10 hover:text-red-400"
          : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
      )}
    >
      {icon}
    </button>
  );
}

export default DiscordMessage;
