"use client";

import { X, Edit, Reply, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { renderPlainText } from "./message-content";
import type { Message, MessageUser } from "@/types/message";

interface ReplyPreviewProps {
  message: Message;
  onClose: () => void;
  mode?: "reply" | "thread";
  className?: string;
}

/**
 * Reply preview component
 * Shows above the message input when replying to a message
 */
export function ReplyPreview({
  message,
  onClose,
  mode = "reply",
  className,
}: ReplyPreviewProps) {
  const Icon = mode === "thread" ? MessageSquare : Reply;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "bg-muted/50 overflow-hidden border-b border-l-4 border-l-primary",
          className,
        )}
      >
        <div className="flex items-start gap-3 p-3">
          {/* Icon */}
          <div className="bg-primary/10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-primary">
            <Icon className="h-3.5 w-3.5" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-primary">
                {mode === "thread" ? "Replying in thread to" : "Replying to"}
              </span>
              <span className="font-semibold">{message.user.displayName}</span>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {renderPlainText(message.content, 100)}
            </p>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cancel reply</span>
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface EditPreviewProps {
  message: Message;
  onClose: () => void;
  className?: string;
}

/**
 * Edit preview component
 * Shows above the message input when editing a message
 */
export function EditPreview({ message, onClose, className }: EditPreviewProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "overflow-hidden border-b border-l-4 border-l-amber-500 bg-amber-500/5",
          className,
        )}
      >
        <div className="flex items-start gap-3 p-3">
          {/* Icon */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <Edit className="h-3.5 w-3.5" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-amber-500">
              Editing message
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {renderPlainText(message.content, 100)}
            </p>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cancel edit</span>
          </Button>
        </div>

        {/* Hint */}
        <div className="bg-muted/30 border-t px-3 py-1.5 text-xs text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1">Escape</kbd> to cancel,{" "}
          <kbd className="rounded bg-muted px-1">Enter</kbd> to save
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Inline reply indicator within a message
 * Shows what message this is a reply to
 */
interface InlineReplyIndicatorProps {
  replyTo: Message;
  onClick?: () => void;
  className?: string;
}

export function InlineReplyIndicator({
  replyTo,
  onClick,
  className,
}: InlineReplyIndicatorProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group mb-1 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {/* Reply line */}
      <div className="flex items-center gap-1">
        <div className="border-muted-foreground/50 h-3 w-3 rounded-tl border-l-2 border-t-2" />
        <Reply className="h-3 w-3 opacity-60" />
      </div>

      {/* Author avatar */}
      <Avatar className="h-4 w-4">
        <AvatarImage
          src={replyTo.user.avatarUrl}
          alt={replyTo.user.displayName}
        />
        <AvatarFallback className="text-[8px]">
          {replyTo.user.displayName.charAt(0)}
        </AvatarFallback>
      </Avatar>

      {/* Author name */}
      <span className="font-medium group-hover:underline">
        {replyTo.user.displayName}
      </span>

      {/* Preview text */}
      <span className="truncate opacity-70">
        {renderPlainText(replyTo.content, 50)}
      </span>
    </button>
  );
}

/**
 * Thread reply count banner
 */
interface ThreadReplyBannerProps {
  count: number;
  lastReply?: {
    user: MessageUser;
    content: string;
    createdAt: Date;
  };
  onClick?: () => void;
  className?: string;
}

export function ThreadReplyBanner({
  count,
  lastReply,
  onClick,
  className,
}: ThreadReplyBannerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-muted/30 hover:border-primary/20 hover:bg-muted/50 group mt-2 flex w-full items-center gap-2 rounded-md border border-transparent p-2 text-left transition-colors",
        className,
      )}
    >
      <MessageSquare className="h-4 w-4 text-primary" />

      <span className="text-xs font-medium text-primary">
        {count} {count === 1 ? "reply" : "replies"}
      </span>

      {lastReply && (
        <>
          <span className="text-xs text-muted-foreground">Last reply from</span>
          <span className="text-xs font-medium">
            {lastReply.user.displayName}
          </span>
        </>
      )}

      <span className="ml-auto text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        View thread
      </span>
    </button>
  );
}
