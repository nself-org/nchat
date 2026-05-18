"use client";

import { format } from "date-fns";
import {
  UserPlus,
  UserMinus,
  Hash,
  Pin,
  PinOff,
  Edit,
  Phone,
  PhoneOff,
  Settings,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, MessageType, SystemMessageData } from "@/types/message";

interface MessageSystemProps {
  message: Message;
  className?: string;
}

/**
 * System message component
 * Renders special system events like user joins, pins, channel updates
 */
export function MessageSystem({ message, className }: MessageSystemProps) {
  const { icon: Icon, text, variant } = getSystemMessageContent(message);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-2 text-xs",
        variant === "info" && "text-muted-foreground",
        variant === "success" && "text-emerald-500",
        variant === "warning" && "text-amber-500",
        variant === "error" && "text-red-500",
        className,
      )}
    >
      <div className="bg-muted/50 flex h-6 w-6 items-center justify-center rounded-full">
        <Icon className="h-3 w-3" />
      </div>
      <span>{text}</span>
      <span className="text-muted-foreground/60">
        {format(new Date(message.createdAt), "h:mm a")}
      </span>
    </div>
  );
}

/**
 * System message as a line separator
 */
export function SystemMessageLine({ message, className }: MessageSystemProps) {
  const { icon: Icon, text } = getSystemMessageContent(message);

  return (
    <div className={cn("relative py-4", className)}>
      {/* Line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-border" />

      {/* Content */}
      <div className="relative flex justify-center">
        <div className="flex items-center gap-2 bg-background px-3 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{text}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Get icon and text content for system message
 */
function getSystemMessageContent(message: Message): {
  icon: React.ComponentType<{ className?: string }>;
  text: React.ReactNode;
  variant: "info" | "success" | "warning" | "error";
} {
  const userName = message.user?.displayName || "Someone";

  switch (message.type) {
    case "user_joined":
      return {
        icon: UserPlus,
        text: (
          <>
            <strong>{userName}</strong> joined the channel
          </>
        ),
        variant: "success",
      };

    case "user_left":
      return {
        icon: UserMinus,
        text: (
          <>
            <strong>{userName}</strong> left the channel
          </>
        ),
        variant: "info",
      };

    case "channel_created":
      return {
        icon: Hash,
        text: (
          <>
            <strong>{userName}</strong> created this channel
          </>
        ),
        variant: "info",
      };

    case "channel_renamed":
      return {
        icon: Edit,
        text: (
          <>
            <strong>{userName}</strong> renamed the channel
          </>
        ),
        variant: "info",
      };

    case "topic_changed":
      return {
        icon: Settings,
        text: (
          <>
            <strong>{userName}</strong> changed the channel topic
          </>
        ),
        variant: "info",
      };

    case "message_pinned":
      return {
        icon: Pin,
        text: (
          <>
            <strong>{userName}</strong> pinned a message
          </>
        ),
        variant: "info",
      };

    case "message_unpinned":
      return {
        icon: PinOff,
        text: (
          <>
            <strong>{userName}</strong> unpinned a message
          </>
        ),
        variant: "info",
      };

    case "call_started":
      return {
        icon: Phone,
        text: (
          <>
            <strong>{userName}</strong> started a call
          </>
        ),
        variant: "success",
      };

    case "call_ended":
      return {
        icon: PhoneOff,
        text: "Call ended",
        variant: "info",
      };

    default:
      return {
        icon: MessageSquare,
        text: message.content || "System message",
        variant: "info",
      };
  }
}

/**
 * Date separator component
 * Shows date between message groups
 */
export function DateSeparator({
  date,
  className,
}: {
  date: Date;
  className?: string;
}) {
  const formatDate = (d: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Today";
    }

    if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return format(d, "EEEE, MMMM d, yyyy");
  };

  return (
    <div className={cn("relative py-4", className)}>
      {/* Line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-border" />

      {/* Date badge */}
      <div className="relative flex justify-center">
        <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          {formatDate(date)}
        </span>
      </div>
    </div>
  );
}

/**
 * New messages separator
 * Shows "New messages" line for unread indicator
 */
export function NewMessagesSeparator({
  count,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("relative py-4", className)}>
      {/* Line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-red-500/50" />

      {/* Badge */}
      <div className="relative flex justify-center">
        <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white">
          {count
            ? `${count} new message${count > 1 ? "s" : ""}`
            : "New messages"}
        </span>
      </div>
    </div>
  );
}

/**
 * Thread started indicator
 */
export function ThreadStartedIndicator({
  userName,
  className,
}: {
  userName: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 py-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <div className="bg-primary/20 h-px flex-1" />
      <MessageSquare className="h-3 w-3 text-primary" />
      <span>
        <strong className="text-primary">{userName}</strong> started a thread
      </span>
      <div className="bg-primary/20 h-px flex-1" />
    </div>
  );
}
