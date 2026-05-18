"use client";

import { format, formatDistanceToNow } from "date-fns";
import { MessageSquare, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ThreadInfo, MessageUser } from "@/types/message";

interface MessageThreadPreviewProps {
  threadInfo: ThreadInfo;
  onClick: () => void;
  className?: string;
}

/**
 * Thread preview component
 * Shows reply count, participant avatars, and last reply preview
 */
export function MessageThreadPreview({
  threadInfo,
  onClick,
  className,
}: MessageThreadPreviewProps) {
  const { replyCount, lastReplyAt, participants, latestReply } = threadInfo;

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "hover:bg-muted/50 group mt-1 flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors",
        className,
      )}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.1 }}
    >
      {/* Participant avatars */}
      <div className="flex -space-x-1.5">
        {participants.slice(0, 3).map((user) => (
          <Avatar
            key={user.id}
            className="h-6 w-6 border-2 border-background ring-0"
          >
            <AvatarImage src={user.avatarUrl} alt={user.displayName} />
            <AvatarFallback className="text-[10px]">
              {user.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      {/* Reply count and preview */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="whitespace-nowrap text-xs font-medium text-primary">
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </span>

        {latestReply && (
          <>
            <span className="text-xs text-muted-foreground">
              Last reply{" "}
              {formatDistanceToNow(new Date(lastReplyAt), { addSuffix: true })}
            </span>
          </>
        )}
      </div>

      {/* View thread indicator */}
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.button>
  );
}

/**
 * Compact thread preview for smaller spaces
 */
export function CompactThreadPreview({
  threadInfo,
  onClick,
  className,
}: MessageThreadPreviewProps) {
  const { replyCount, participants } = threadInfo;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-1.5 text-xs text-primary hover:underline",
        className,
      )}
    >
      <MessageSquare className="h-3 w-3" />
      <span className="font-medium">
        {replyCount} {replyCount === 1 ? "reply" : "replies"}
      </span>
      {participants.length > 0 && (
        <div className="flex -space-x-1">
          {participants.slice(0, 2).map((user) => (
            <Avatar key={user.id} className="h-4 w-4 border border-background">
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
              <AvatarFallback className="text-[8px]">
                {user.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
    </button>
  );
}

/**
 * Thread header for thread panel
 */
interface ThreadHeaderProps {
  parentMessage: {
    content: string;
    user: MessageUser;
    createdAt: Date;
  };
  replyCount: number;
  onClose: () => void;
  className?: string;
}

export function ThreadHeader({
  parentMessage,
  replyCount,
  onClose,
  className,
}: ThreadHeaderProps) {
  return (
    <div className={cn("border-b p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Thread</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <span className="sr-only">Close thread</span>
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Parent message preview */}
      <div className="flex items-start gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={parentMessage.user.avatarUrl}
            alt={parentMessage.user.displayName}
          />
          <AvatarFallback>
            {parentMessage.user.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">
              {parentMessage.user.displayName}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(parentMessage.createdAt), "MMM d, h:mm a")}
            </span>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {parentMessage.content}
          </p>
        </div>
      </div>

      {/* Reply count */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </span>
      </div>
    </div>
  );
}

/**
 * Reply line indicator for threaded messages
 */
export function ReplyLine({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "highlighted";
}) {
  return (
    <div
      className={cn(
        "absolute bottom-0 left-5 top-8 w-0.5",
        variant === "default" ? "bg-border" : "bg-primary/30",
        className,
      )}
    />
  );
}
