"use client";

import * as React from "react";
import { useState } from "react";
import { format } from "date-fns";
import { Pin, PinOff, ExternalLink, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChannelStore } from "@/stores/channel-store";
import { useUIStore } from "@/stores/ui-store";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

interface PinnedMessagesProps {
  channelId: string;
  className?: string;
  onMessageClick?: (messageId: string) => void;
}

interface PinnedMessage {
  id: string;
  messageId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  pinnedAt: Date;
  pinnedBy: string;
  pinnedByName: string;
  messageCreatedAt: Date;
}

// ============================================================================
// Mock Data (for development)
// ============================================================================

const mockPinnedMessages: PinnedMessage[] = [
  {
    id: "pin-1",
    messageId: "msg-1",
    content:
      "Welcome to the team! Please make sure to read the onboarding documentation in the #resources channel.",
    authorId: "1",
    authorName: "Alice Johnson",
    authorAvatar: undefined,
    pinnedAt: new Date("2024-01-15T10:30:00Z"),
    pinnedBy: "2",
    pinnedByName: "Bob Smith",
    messageCreatedAt: new Date("2024-01-10T09:00:00Z"),
  },
  {
    id: "pin-2",
    messageId: "msg-2",
    content:
      "Important: All team meetings are now on Tuesdays at 10 AM PST. Please update your calendars accordingly.",
    authorId: "2",
    authorName: "Bob Smith",
    authorAvatar: undefined,
    pinnedAt: new Date("2024-01-14T14:00:00Z"),
    pinnedBy: "1",
    pinnedByName: "Alice Johnson",
    messageCreatedAt: new Date("2024-01-12T11:30:00Z"),
  },
  {
    id: "pin-3",
    messageId: "msg-3",
    content:
      "Project deadlines:\n- Phase 1: Jan 20\n- Phase 2: Feb 15\n- Final release: March 1\n\nPlease coordinate with your team leads.",
    authorId: "3",
    authorName: "Charlie Brown",
    authorAvatar: undefined,
    pinnedAt: new Date("2024-01-13T09:15:00Z"),
    pinnedBy: "3",
    pinnedByName: "Charlie Brown",
    messageCreatedAt: new Date("2024-01-11T16:45:00Z"),
  },
];

// ============================================================================
// Pinned Message Item Component
// ============================================================================

function PinnedMessageItem({
  message,
  isAdmin,
  onJumpToMessage,
  onUnpin,
}: {
  message: PinnedMessage;
  isAdmin: boolean;
  onJumpToMessage: () => void;
  onUnpin: () => void;
}) {
  return (
    <div className="hover:bg-accent/50 group rounded-md p-3 transition-colors">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={message.authorAvatar} alt={message.authorName} />
            <AvatarFallback className="text-[10px]">
              {message.authorName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{message.authorName}</span>
            <span className="text-xs text-muted-foreground">
              {format(message.messageCreatedAt, "MMM d, yyyy")}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onJumpToMessage}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Jump to message
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={onUnpin} className="text-destructive">
                <PinOff className="mr-2 h-4 w-4" />
                Unpin message
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <p className="whitespace-pre-wrap break-words text-sm">
        {message.content}
      </p>

      {/* Footer */}
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Pin className="h-3 w-3" />
        <span>
          Pinned by {message.pinnedByName} on{" "}
          {format(message.pinnedAt, "MMM d")}
        </span>
      </div>

      {/* Jump to message button on hover */}
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 h-7 text-xs opacity-0 transition-opacity group-hover:opacity-100"
        onClick={onJumpToMessage}
      >
        <ExternalLink className="mr-1.5 h-3 w-3" />
        Jump to message
      </Button>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function PinnedMessages({
  channelId,
  className,
  onMessageClick,
}: PinnedMessagesProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const { openModal } = useUIStore();

  // In production, this would come from the store/API
  const pinnedMessages = mockPinnedMessages;

  const handleJumpToMessage = (messageId: string) => {
    if (onMessageClick) {
      onMessageClick(messageId);
    } else {
      // Scroll to message in the main chat view
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        messageElement.classList.add("highlight-message");
        setTimeout(() => {
          messageElement.classList.remove("highlight-message");
        }, 2000);
      }
    }
  };

  const handleUnpin = (messageId: string) => {
    openModal("confirm-action", {
      title: "Unpin Message",
      message: "Are you sure you want to unpin this message?",
      confirmLabel: "Unpin",
      onConfirm: () => {
        // In production, this would call an API
      },
    });
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {pinnedMessages.length > 0 ? (
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {pinnedMessages.map((message) => (
              <PinnedMessageItem
                key={message.id}
                message={message}
                isAdmin={isAdmin}
                onJumpToMessage={() => handleJumpToMessage(message.messageId)}
                onUnpin={() => handleUnpin(message.messageId)}
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Pin className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-1 font-medium">No pinned messages</h3>
          <p className="max-w-[250px] text-sm text-muted-foreground">
            Pin important messages so they&apos;re easy to find. Right-click any
            message to pin it.
          </p>
        </div>
      )}

      {/* Info footer */}
      {pinnedMessages.length > 0 && (
        <div className="border-t p-3 text-center">
          <p className="text-xs text-muted-foreground">
            {pinnedMessages.length} pinned message
            {pinnedMessages.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

PinnedMessages.displayName = "PinnedMessages";
