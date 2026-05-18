"use client";

/**
 * Stream Chat Component
 *
 * Live chat overlay for streams with moderation controls,
 * reactions, and message pinning.
 *
 * @module components/livestream/StreamChat
 */

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  MoreVertical,
  Pin,
  Trash2,
  Ban,
  Clock,
  AlertCircle,
  MessageSquare,
  Users,
} from "lucide-react";
import type { StreamChatMessage, ChatMode } from "@/services/livestream/types";

// ============================================================================
// Types
// ============================================================================

export interface StreamChatProps {
  streamId: string;
  messages: StreamChatMessage[];
  pinnedMessage?: StreamChatMessage;
  viewerCount?: number;
  chatMode?: ChatMode;
  slowModeSeconds?: number;
  isStreamer?: boolean;
  isModerator?: boolean;
  currentUserId?: string;
  onSendMessage: (content: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onPinMessage?: (messageId: string) => Promise<void>;
  onUnpinMessage?: (messageId: string) => Promise<void>;
  onTimeoutUser?: (userId: string, seconds: number) => Promise<void>;
  onBanUser?: (userId: string) => Promise<void>;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function StreamChat({
  streamId,
  messages,
  pinnedMessage,
  viewerCount = 0,
  chatMode = "open",
  slowModeSeconds = 0,
  isStreamer = false,
  isModerator = false,
  currentUserId,
  onSendMessage,
  onDeleteMessage,
  onPinMessage,
  onUnpinMessage,
  onTimeoutUser,
  onBanUser,
  className,
}: StreamChatProps) {
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canModerate = isStreamer || isModerator;
  const isChatDisabled = chatMode === "disabled";

  // ==========================================================================
  // Auto-scroll to bottom
  // ==========================================================================

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ==========================================================================
  // Slow mode cooldown
  // ==========================================================================

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // ==========================================================================
  // Send Message
  // ==========================================================================

  const handleSendMessage = useCallback(async () => {
    const content = messageInput.trim();

    if (!content || isSending || cooldownSeconds > 0 || isChatDisabled) {
      return;
    }

    if (content.length > 500) {
      setError("Message too long (max 500 characters)");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await onSendMessage(content);
      setMessageInput("");

      if (slowModeSeconds > 0) {
        setCooldownSeconds(slowModeSeconds);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSending(false);
    }
  }, [
    messageInput,
    isSending,
    cooldownSeconds,
    isChatDisabled,
    slowModeSeconds,
    onSendMessage,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ==========================================================================
  // Message Actions
  // ==========================================================================

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await onDeleteMessage?.(messageId);
      } catch (err) {
        setError("Failed to delete message");
      }
    },
    [onDeleteMessage],
  );

  const handlePinMessage = useCallback(
    async (messageId: string) => {
      try {
        if (pinnedMessage?.id === messageId) {
          await onUnpinMessage?.(messageId);
        } else {
          await onPinMessage?.(messageId);
        }
      } catch (err) {
        setError("Failed to pin message");
      }
    },
    [pinnedMessage, onPinMessage, onUnpinMessage],
  );

  const handleTimeoutUser = useCallback(
    async (userId: string) => {
      try {
        await onTimeoutUser?.(userId, 600); // 10 minute timeout
      } catch (err) {
        setError("Failed to timeout user");
      }
    },
    [onTimeoutUser],
  );

  const handleBanUser = useCallback(
    async (userId: string) => {
      try {
        await onBanUser?.(userId);
      } catch (err) {
        setError("Failed to ban user");
      }
    },
    [onBanUser],
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div
      className={cn("flex flex-col h-full bg-background border-l", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Stream Chat</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {viewerCount.toLocaleString()}
        </div>
      </div>

      {/* Chat Mode Banner */}
      {chatMode !== "open" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted text-xs">
          <AlertCircle className="h-3 w-3" />
          {chatMode === "disabled" && "Chat is disabled"}
          {chatMode === "followers" && "Followers-only mode"}
          {chatMode === "subscribers" && "Subscribers-only mode"}
        </div>
      )}

      {/* Slow Mode Banner */}
      {slowModeSeconds > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 text-yellow-600 text-xs">
          <Clock className="h-3 w-3" />
          Slow mode: {slowModeSeconds}s between messages
        </div>
      )}

      {/* Pinned Message */}
      {pinnedMessage && !pinnedMessage.isDeleted && (
        <div className="p-3 border-b bg-accent/50">
          <div className="flex items-start gap-2">
            <Pin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium">
                  {pinnedMessage.user?.displayName ??
                    pinnedMessage.user?.username ??
                    "Unknown"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {pinnedMessage.content}
              </p>
            </div>
            {canModerate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handlePinMessage(pinnedMessage.id)}
              >
                <Pin className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isOwnMessage={message.userId === currentUserId}
              canModerate={canModerate}
              isPinned={pinnedMessage?.id === message.id}
              onDelete={() => handleDeleteMessage(message.id)}
              onPin={() => handlePinMessage(message.id)}
              onTimeout={() =>
                message.userId && handleTimeoutUser(message.userId)
              }
              onBan={() => message.userId && handleBanUser(message.userId)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 text-destructive text-xs">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isChatDisabled
                ? "Chat is disabled"
                : cooldownSeconds > 0
                  ? `Wait ${cooldownSeconds}s...`
                  : "Send a message..."
            }
            disabled={isChatDisabled || cooldownSeconds > 0}
            maxLength={500}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={
              !messageInput.trim() ||
              isSending ||
              cooldownSeconds > 0 ||
              isChatDisabled
            }
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{messageInput.length}/500</span>
          {cooldownSeconds > 0 && <span>{cooldownSeconds}s</span>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Chat Message Component
// ============================================================================

interface ChatMessageProps {
  message: StreamChatMessage;
  isOwnMessage: boolean;
  canModerate: boolean;
  isPinned: boolean;
  onDelete: () => void;
  onPin: () => void;
  onTimeout: () => void;
  onBan: () => void;
}

function ChatMessage({
  message,
  isOwnMessage,
  canModerate,
  isPinned,
  onDelete,
  onPin,
  onTimeout,
  onBan,
}: ChatMessageProps) {
  if (message.isDeleted) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Message deleted
      </div>
    );
  }

  const displayName =
    message.user?.displayName ?? message.user?.username ?? "Anonymous";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "group flex items-start gap-2",
        isPinned && "bg-accent/30 -mx-2 px-2 py-1 rounded",
      )}
    >
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarImage src={message.user?.avatarUrl} alt={displayName} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-medium",
              message.user?.isModerator && "text-green-600",
              message.user?.isSubscriber && "text-purple-600",
            )}
          >
            {displayName}
          </span>
          {message.user?.isModerator && (
            <span className="text-[10px] bg-green-600/20 text-green-600 px-1 rounded">
              MOD
            </span>
          )}
          {message.user?.isSubscriber && (
            <span className="text-[10px] bg-purple-600/20 text-purple-600 px-1 rounded">
              SUB
            </span>
          )}
          {isPinned && <Pin className="h-3 w-3 text-primary" />}
        </div>
        <p className="text-sm break-words">{message.content}</p>
      </div>

      {/* Actions Menu */}
      {(canModerate || isOwnMessage) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canModerate && (
              <>
                <DropdownMenuItem onClick={onPin}>
                  <Pin className="h-4 w-4 mr-2" />
                  {isPinned ? "Unpin" : "Pin"} Message
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Message
            </DropdownMenuItem>
            {canModerate && !isOwnMessage && message.userId && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onTimeout}>
                  <Clock className="h-4 w-4 mr-2" />
                  Timeout (10 min)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onBan} className="text-destructive">
                  <Ban className="h-4 w-4 mr-2" />
                  Ban User
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export default StreamChat;
