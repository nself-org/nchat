"use client";

import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/user/user-avatar";
import type { Message } from "@/types/message";
import { X, Pin, ExternalLink, Trash2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface PinnedMessagesProps {
  messages: Message[];
  loading?: boolean;
  onClose?: () => void;
  onJumpToMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  canUnpin?: boolean;
  className?: string;
}

// ============================================================================
// Pinned Message Item Component
// ============================================================================

interface PinnedMessageItemProps {
  message: Message;
  onJumpTo?: () => void;
  onUnpin?: () => void;
  canUnpin?: boolean;
}

function PinnedMessageItem({
  message,
  onJumpTo,
  onUnpin,
  canUnpin = false,
}: PinnedMessageItemProps) {
  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-3",
        "hover:bg-accent/50 transition-colors",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <UserAvatar user={message.user} size="sm" showPresence={false} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {message.user.displayName}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.createdAt), "MMM d, yyyy h:mm a")}
            </span>
          </div>

          {/* Message Content */}
          <p className="text-foreground/90 mt-1 line-clamp-3 whitespace-pre-wrap text-sm">
            {message.content}
          </p>

          {/* Attachments indicator */}
          {message.attachments && message.attachments.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {message.attachments.length} attachment
              {message.attachments.length !== 1 && "s"}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onJumpTo}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Jump to message</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {canUnpin && (
          <AlertDialog>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Unpin message</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unpin message?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the message from the pinned messages list.
                  The message itself will not be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onUnpin}>Unpin</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Pinned Messages Skeleton
// ============================================================================

function PinnedMessagesSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-lg border bg-card p-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Pinned Messages Empty State
// ============================================================================

function PinnedMessagesEmpty() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-3">
        <Pin className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-sm font-medium">No pinned messages</h3>
      <p className="max-w-[200px] text-xs text-muted-foreground">
        Pin important messages to keep them easily accessible for everyone in
        the channel.
      </p>
    </div>
  );
}

// ============================================================================
// Pinned Messages Component
// ============================================================================

export function PinnedMessages({
  messages,
  loading = false,
  onClose,
  onJumpToMessage,
  onUnpinMessage,
  canUnpin = false,
  className,
}: PinnedMessagesProps) {
  return (
    <div
      className={cn("flex h-full flex-col border-l bg-background", className)}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Pinned Messages</h2>
          {!loading && messages.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({messages.length})
            </span>
          )}
        </div>
        {onClose && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {loading ? (
          <PinnedMessagesSkeleton />
        ) : messages.length === 0 ? (
          <PinnedMessagesEmpty />
        ) : (
          <div className="space-y-3 p-4">
            {messages.map((message) => (
              <PinnedMessageItem
                key={message.id}
                message={message}
                onJumpTo={() => onJumpToMessage?.(message.id)}
                onUnpin={() => onUnpinMessage?.(message.id)}
                canUnpin={canUnpin}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export { PinnedMessageItem, PinnedMessagesSkeleton, PinnedMessagesEmpty };
