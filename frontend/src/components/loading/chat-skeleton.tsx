"use client";

import { cn } from "@/lib/utils";
import { Skeleton, LineSkeleton } from "./skeleton";
import { MessageSkeleton } from "./message-skeleton";
import { UserListSkeleton } from "./user-skeleton";

interface ChatSkeletonProps {
  /** Show channel header */
  showHeader?: boolean;
  /** Show message input */
  showInput?: boolean;
  /** Show member panel */
  showMemberPanel?: boolean;
  /** Number of messages to show */
  messageCount?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Full chat area skeleton
 * Includes header, messages, and input
 */
export function ChatSkeleton({
  showHeader = true,
  showInput = true,
  showMemberPanel = false,
  messageCount = 6,
  className,
}: ChatSkeletonProps) {
  return (
    <div className={cn("flex h-full", className)}>
      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        {showHeader && <ChatHeaderSkeleton />}

        {/* Messages */}
        <div className="flex-1 overflow-hidden p-4">
          <MessageSkeleton count={messageCount} />
        </div>

        {/* Input */}
        {showInput && <ChatInputSkeleton />}
      </div>

      {/* Member panel */}
      {showMemberPanel && <ChatMemberPanelSkeleton />}
    </div>
  );
}

/**
 * Chat header skeleton
 */
export function ChatHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b px-4 py-3",
        className,
      )}
    >
      {/* Left: Channel info */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded" />
        <div>
          <LineSkeleton width={120} height={16} />
          <LineSkeleton width={80} height={12} className="mt-0.5" />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <div className="mx-1 h-6 w-px bg-border" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  );
}

/**
 * Chat input skeleton
 */
export function ChatInputSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("border-t p-4", className)}>
      {/* Typing indicator area */}
      <div className="mb-2 h-4" />

      {/* Input container */}
      <div className="flex items-end gap-2 rounded-lg border bg-background p-2">
        {/* Attachment button */}
        <Skeleton className="h-8 w-8 shrink-0 rounded" />

        {/* Text input */}
        <Skeleton className="h-8 flex-1 rounded" />

        {/* Emoji button */}
        <Skeleton className="h-8 w-8 shrink-0 rounded" />

        {/* Send button */}
        <Skeleton className="h-8 w-16 shrink-0 rounded" />
      </div>
    </div>
  );
}

/**
 * Chat member panel skeleton
 */
export function ChatMemberPanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-60 flex-col border-l", className)}>
      {/* Panel header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <LineSkeleton width={80} height={14} />
        <Skeleton className="h-6 w-6 rounded" />
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-hidden p-4">
        <UserListSkeleton count={8} size="sm" showStatus />
      </div>
    </div>
  );
}

/**
 * Thread panel skeleton
 */
export function ThreadPanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full w-96 flex-col border-l", className)}>
      {/* Thread header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <LineSkeleton width={60} height={16} />
          <LineSkeleton width={100} height={12} />
        </div>
        <Skeleton className="h-6 w-6 rounded" />
      </div>

      {/* Parent message */}
      <div className="border-b p-4">
        <MessageSkeleton count={1} showReactions />
      </div>

      {/* Thread replies */}
      <div className="flex-1 overflow-hidden p-4">
        <MessageSkeleton count={4} compact />
      </div>

      {/* Thread input */}
      <ChatInputSkeleton />
    </div>
  );
}

/**
 * Channel info panel skeleton
 */
export function ChannelInfoPanelSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("flex w-80 flex-col border-l", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <LineSkeleton width={100} height={16} />
        <Skeleton className="h-6 w-6 rounded" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Channel info section */}
        <div className="border-b p-4">
          <div className="mb-4 flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div>
              <LineSkeleton width={100} height={16} />
              <LineSkeleton width={60} height={12} className="mt-1" />
            </div>
          </div>

          {/* Description */}
          <LineSkeleton width={60} height={12} className="mb-2" />
          <LineSkeleton width="100%" height={14} />
          <LineSkeleton width="80%" height={14} className="mt-1" />
        </div>

        {/* Members section */}
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <LineSkeleton width={80} height={14} />
            <LineSkeleton width={20} height={12} />
          </div>
          <UserListSkeleton count={5} size="sm" showStatus />
        </div>

        {/* Settings section */}
        <div className="border-t p-4">
          <LineSkeleton width={60} height={12} className="mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty chat state skeleton (for when no channel is selected)
 */
export function EmptyChatSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-4",
        className,
      )}
    >
      <Skeleton className="h-24 w-24 rounded-2xl" />
      <LineSkeleton width={200} height={20} />
      <LineSkeleton width={280} height={14} />
    </div>
  );
}
