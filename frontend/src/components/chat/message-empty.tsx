"use client";

import { Hash, MessageCircle, Lock, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppConfig } from "@/contexts/app-config-context";

interface MessageEmptyProps {
  channelName?: string;
  channelType?: "public" | "private" | "dm" | "group-dm";
  description?: string;
  createdBy?: string;
  createdAt?: Date;
  className?: string;
}

/**
 * Empty state component for channels with no messages
 * Displays a welcoming message encouraging users to start the conversation
 */
export function MessageEmpty({
  channelName = "general",
  channelType = "public",
  description,
  createdBy,
  createdAt,
  className,
}: MessageEmptyProps) {
  const { config } = useAppConfig();
  const appName = config?.branding?.appName || "nChat";

  const getIcon = () => {
    switch (channelType) {
      case "private":
        return <Lock className="h-12 w-12 text-muted-foreground" />;
      case "dm":
        return <MessageCircle className="h-12 w-12 text-muted-foreground" />;
      case "group-dm":
        return <Users className="h-12 w-12 text-muted-foreground" />;
      default:
        return <Hash className="h-12 w-12 text-muted-foreground" />;
    }
  };

  const getTitle = () => {
    switch (channelType) {
      case "dm":
        return `This is the beginning of your conversation with ${channelName}`;
      case "group-dm":
        return `This is the beginning of ${channelName}`;
      default:
        return (
          <>
            Welcome to{" "}
            <span className="font-bold text-foreground">#{channelName}</span>
          </>
        );
    }
  };

  const getSubtitle = () => {
    if (description) {
      return description;
    }

    switch (channelType) {
      case "dm":
        return "Send a message to start the conversation.";
      case "group-dm":
        return "This group was created for you to chat with your team.";
      case "private":
        return `This is the start of the #${channelName} private channel.`;
      default:
        return `This is the very beginning of the #${channelName} channel.`;
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-start justify-end p-6 pb-4",
        className,
      )}
    >
      {/* Icon */}
      <div className="bg-muted/50 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        {getIcon()}
      </div>

      {/* Title */}
      <h2 className="mb-2 text-xl font-semibold text-muted-foreground">
        {getTitle()}
      </h2>

      {/* Subtitle / Description */}
      <p className="mb-4 max-w-lg text-sm text-muted-foreground">
        {getSubtitle()}
      </p>

      {/* Channel metadata */}
      {(createdBy || createdAt) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {createdBy && (
            <span>
              Created by <strong>{createdBy}</strong>
            </span>
          )}
          {createdBy && createdAt && <span aria-hidden>&middot;</span>}
          {createdAt && (
            <span>
              {createdAt.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      )}

      {/* Tips section */}
      {channelType !== "dm" && (
        <div className="mt-6 rounded-lg border border-dashed p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Quick Tips
          </div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>
              Use <code className="rounded bg-muted px-1">@username</code> to
              mention someone
            </li>
            <li>
              Use <code className="rounded bg-muted px-1">#channel</code> to
              link to another channel
            </li>
            <li>
              Press <kbd className="rounded bg-muted px-1.5 py-0.5">Enter</kbd>{" "}
              to send,{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5">Shift+Enter</kbd>{" "}
              for new line
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Simplified empty state for search results
 */
export function SearchEmpty({
  query,
  className,
}: {
  query: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 text-center",
        className,
      )}
    >
      <MessageCircle className="text-muted-foreground/50 h-12 w-12" />
      <div className="space-y-1">
        <h3 className="font-medium">No messages found</h3>
        <p className="text-sm text-muted-foreground">
          No messages matching &quot;{query}&quot;
        </p>
      </div>
    </div>
  );
}

/**
 * Empty state for thread panel when no thread is selected
 */
export function ThreadEmpty({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 text-center",
        className,
      )}
    >
      <MessageCircle className="text-muted-foreground/50 h-12 w-12" />
      <div className="space-y-1">
        <h3 className="font-medium">No thread selected</h3>
        <p className="text-sm text-muted-foreground">
          Click on a message with replies to view the thread
        </p>
      </div>
    </div>
  );
}
