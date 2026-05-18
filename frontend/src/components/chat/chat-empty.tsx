"use client";

import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Channel } from "@/stores/channel-store";
import {
  Hash,
  Lock,
  Megaphone,
  Sparkles,
  MessageSquarePlus,
  Users,
  Bookmark,
  Info,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface ChatEmptyProps {
  channel: Channel;
  className?: string;
}

// ============================================================================
// Helper: Get channel icon
// ============================================================================

function ChannelIcon({ type, name }: { type: Channel["type"]; name: string }) {
  const iconClass = "h-8 w-8";

  if (name === "announcements") {
    return <Megaphone className={iconClass} />;
  }
  if (type === "private") {
    return <Lock className={iconClass} />;
  }
  return <Hash className={iconClass} />;
}

// ============================================================================
// Getting Started Tips
// ============================================================================

const tips = [
  {
    icon: MessageSquarePlus,
    title: "Start a conversation",
    description: "Type a message below to begin chatting with your team.",
  },
  {
    icon: Users,
    title: "Mention teammates",
    description: "Use @username to get someone's attention.",
  },
  {
    icon: Bookmark,
    title: "Pin important messages",
    description: "Right-click a message to pin it for easy access.",
  },
];

// ============================================================================
// Chat Empty Component
// ============================================================================

export function ChatEmpty({ channel, className }: ChatEmptyProps) {
  const createdDate = channel.createdAt
    ? format(new Date(channel.createdAt), "MMMM d, yyyy")
    : null;

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center p-8",
        className,
      )}
    >
      <div className="max-w-md text-center">
        {/* Channel Icon */}
        <div className="bg-primary/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
          <ChannelIcon type={channel.type} name={channel.name} />
        </div>

        {/* Channel Name */}
        <h2 className="mb-2 text-2xl font-bold">Welcome to #{channel.name}</h2>

        {/* Description or Topic */}
        {channel.description ? (
          <p className="mb-4 text-muted-foreground">{channel.description}</p>
        ) : channel.topic ? (
          <p className="mb-4 text-muted-foreground">{channel.topic}</p>
        ) : (
          <p className="mb-4 text-muted-foreground">
            This is the start of the #{channel.name} channel.
          </p>
        )}

        {/* Created Date */}
        {createdDate && (
          <p className="mb-6 text-sm text-muted-foreground">
            Channel created on {createdDate}
          </p>
        )}

        {/* Getting Started Section */}
        <div className="mt-8 border-t pt-8">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold">Getting Started</h3>
          </div>

          <div className="space-y-4">
            {tips.map((tip, index) => (
              <div
                key={index}
                className="hover:bg-accent/50 flex items-start gap-3 rounded-lg p-3 text-left transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <tip.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{tip.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {tip.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Info Button */}
        <Button variant="outline" className="mt-6 gap-2">
          <Info className="h-4 w-4" />
          View channel details
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Chat Empty for DMs
// ============================================================================

interface DMEmptyProps {
  userName: string;
  userAvatar?: string;
  className?: string;
}

export function DMEmpty({ userName, userAvatar, className }: DMEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center p-8",
        className,
      )}
    >
      <div className="max-w-md text-center">
        {/* User Avatar */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-semibold">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            userName.charAt(0).toUpperCase()
          )}
        </div>

        {/* User Name */}
        <h2 className="mb-2 text-2xl font-bold">{userName}</h2>

        {/* Description */}
        <p className="mb-6 text-muted-foreground">
          This is the very beginning of your direct message history with{" "}
          <span className="font-medium text-foreground">{userName}</span>.
        </p>

        {/* Suggestions */}
        <div className="bg-muted/50 mt-8 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Say hi and start a conversation! Messages here are private between
            you and {userName}.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Generic Empty State
// ============================================================================

interface GenericEmptyProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function GenericEmpty({
  title = "No messages yet",
  description = "Start the conversation by sending a message.",
  icon,
  action,
  className,
}: GenericEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center p-8",
        className,
      )}
    >
      <div className="max-w-md text-center">
        {icon && (
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            {icon}
          </div>
        )}
        <h2 className="mb-2 text-xl font-semibold">{title}</h2>
        <p className="mb-6 text-muted-foreground">{description}</p>
        {action && <Button onClick={action.onClick}>{action.label}</Button>}
      </div>
    </div>
  );
}
