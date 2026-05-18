"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pin, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

export interface PinnableMessage {
  id: string;
  content: string;
  authorName: string;
  authorAvatarUrl?: string;
  createdAt: Date;
  hasAttachments?: boolean;
  attachmentCount?: number;
}

interface PinMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: PinnableMessage | null;
  onPin: (messageId: string) => Promise<void>;
  channelName?: string;
  currentPinnedCount?: number;
  maxPinnedMessages?: number;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date);
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(date);
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function PinMessageModal({
  open,
  onOpenChange,
  message,
  onPin,
  channelName = "this channel",
  currentPinnedCount = 0,
  maxPinnedMessages = 50,
}: PinMessageModalProps) {
  const [loading, setLoading] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setLoading(false);
    }
  }, [open]);

  const handlePin = async () => {
    if (!message) return;

    setLoading(true);
    try {
      await onPin(message.id);
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to pin message:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!message) return null;

  const isNearLimit = currentPinnedCount >= maxPinnedMessages - 5;
  const isAtLimit = currentPinnedCount >= maxPinnedMessages;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                "bg-primary/10 text-primary",
              )}
            >
              <Pin className="h-5 w-5" />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <DialogTitle>Pin this message?</DialogTitle>
              <DialogDescription>
                This message will be pinned to {channelName} for all members to
                see.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Message preview */}
        <div className="bg-muted/30 space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.authorAvatarUrl} />
              <AvatarFallback className="text-xs">
                {message.authorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {message.authorName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(message.createdAt)} at{" "}
                {formatTime(message.createdAt)}
              </p>
            </div>
          </div>

          <p className="whitespace-pre-wrap break-words pl-11 text-sm">
            {truncateText(message.content, 200)}
          </p>

          {message.hasAttachments && (
            <p className="pl-11 text-xs text-muted-foreground">
              + {message.attachmentCount || 1} attachment
              {(message.attachmentCount || 1) > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Pinned count info */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-muted-foreground">
            Currently pinned messages
          </span>
          <Badge
            variant={
              isAtLimit ? "destructive" : isNearLimit ? "secondary" : "outline"
            }
          >
            {currentPinnedCount} / {maxPinnedMessages}
          </Badge>
        </div>

        {/* Warning if near or at limit */}
        {isAtLimit && (
          <div className="bg-destructive/10 border-destructive/20 flex items-start gap-3 rounded-lg border p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">
              You have reached the maximum number of pinned messages. Please
              unpin an existing message before pinning a new one.
            </p>
          </div>
        )}

        {isNearLimit && !isAtLimit && (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You are approaching the maximum number of pinned messages.
              Consider unpinning older messages.
            </p>
          </div>
        )}

        {/* Info about pinned messages */}
        <p className="text-xs text-muted-foreground">
          Pinned messages are visible to all channel members and appear in the
          pinned messages sidebar. Members will be notified about this pin.
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handlePin} disabled={loading || isAtLimit}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Pin className="mr-2 h-4 w-4" />
            Pin Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Unpin modal as a simpler variant
interface UnpinMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: PinnableMessage | null;
  onUnpin: (messageId: string) => Promise<void>;
}

export function UnpinMessageModal({
  open,
  onOpenChange,
  message,
  onUnpin,
}: UnpinMessageModalProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setLoading(false);
    }
  }, [open]);

  const handleUnpin = async () => {
    if (!message) return;

    setLoading(true);
    try {
      await onUnpin(message.id);
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to unpin message:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                "bg-muted text-muted-foreground",
              )}
            >
              <Pin className="h-5 w-5" />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <DialogTitle>Unpin this message?</DialogTitle>
              <DialogDescription>
                This message will be removed from the pinned messages list.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Brief message preview */}
        <div className="bg-muted/30 rounded-xl border p-3">
          <p className="line-clamp-2 text-sm">
            {truncateText(message.content, 150)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            by {message.authorName}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleUnpin} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Unpin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
