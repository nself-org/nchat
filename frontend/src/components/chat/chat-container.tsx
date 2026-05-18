"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MessageList, SimpleMessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { ChatEmpty } from "@/components/chat/chat-empty";
import { ChatLoading } from "@/components/chat/chat-loading";
import { useMessageStore } from "@/stores/message-store";
import { useAuth } from "@/contexts/auth-context";
import type { Message, TypingUser } from "@/types/message";
import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

interface ChatContainerProps {
  channel: Channel;
  messages: Message[];
  loading?: boolean;
  hasMore?: boolean;
  typingUsers?: TypingUser[];
  onSendMessage: (content: string, replyToId?: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  onLoadMore?: () => void;
  onOpenThread?: (messageId: string) => void;
  className?: string;
}

// ============================================================================
// Chat Container Component
// ============================================================================

export function ChatContainer({
  channel,
  messages,
  loading = false,
  hasMore = false,
  typingUsers = [],
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReactToMessage,
  onLoadMore,
  onOpenThread,
  className,
}: ChatContainerProps) {
  const { user } = useAuth();
  const messageListRef = React.useRef<{
    scrollToBottom: (behavior?: ScrollBehavior) => void;
    scrollToMessage: (id: string) => void;
  } | null>(null);

  // Get store state for editing/replying
  const {
    editingMessage,
    replyingTo,
    startEditing,
    stopEditing,
    startReplying,
    stopReplying,
  } = useMessageStore();

  // Handle send message
  const handleSendMessage = React.useCallback(
    (content: string) => {
      if (editingMessage) {
        // Editing an existing message
        onEditMessage?.(editingMessage.messageId, content);
        stopEditing();
      } else if (replyingTo) {
        // Replying to a message
        onSendMessage(content, replyingTo.messageId);
        stopReplying();
      } else {
        // New message
        onSendMessage(content);
      }

      // Scroll to bottom after sending
      setTimeout(() => messageListRef.current?.scrollToBottom(), 100);
    },
    [
      editingMessage,
      replyingTo,
      onSendMessage,
      onEditMessage,
      stopEditing,
      stopReplying,
    ],
  );

  // Handle message actions
  const handleReply = React.useCallback(
    (message: Message) => {
      startReplying(message);
    },
    [startReplying],
  );

  const handleEdit = React.useCallback(
    (message: Message) => {
      startEditing(message.id, message.content);
    },
    [startEditing],
  );

  const handleDelete = React.useCallback(
    (messageId: string) => {
      onDeleteMessage?.(messageId);
    },
    [onDeleteMessage],
  );

  const handleReact = React.useCallback(
    (messageId: string, emoji: string) => {
      onReactToMessage?.(messageId, emoji);
    },
    [onReactToMessage],
  );

  const handleThread = React.useCallback(
    (message: Message) => {
      onOpenThread?.(message.id);
    },
    [onOpenThread],
  );

  // Loading state
  if (loading && messages.length === 0) {
    return <ChatLoading />;
  }

  // Empty state
  if (!loading && messages.length === 0) {
    return (
      <div className={cn("flex h-full flex-col", className)}>
        <ChatEmpty channel={channel} />
        <MessageInput channelId={channel.id} onSend={handleSendMessage} />
      </div>
    );
  }

  return (
    <div className={cn("relative flex h-full flex-col", className)}>
      {/* Messages Area */}
      <MessageList
        ref={messageListRef}
        channelId={channel.id}
        channelName={channel.name}
        channelType={
          channel.type === "direct"
            ? "dm"
            : channel.type === "group"
              ? "group-dm"
              : channel.type
        }
        messages={messages}
        isLoading={loading}
        hasMore={hasMore}
        typingUsers={typingUsers}
        onLoadMore={onLoadMore}
        onReply={handleReply}
        onThread={handleThread}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReact={handleReact}
        className="flex-1"
      />

      {/* Reply Preview */}
      {replyingTo && (
        <ReplyPreview message={replyingTo.message} onCancel={stopReplying} />
      )}

      {/* Edit Preview */}
      {editingMessage && (
        <EditPreview
          originalContent={editingMessage.originalContent}
          onCancel={stopEditing}
        />
      )}

      {/* Message Input */}
      <MessageInput channelId={channel.id} onSend={handleSendMessage} />
    </div>
  );
}

// ============================================================================
// Reply Preview Component
// ============================================================================

interface ReplyPreviewProps {
  message: Message;
  onCancel: () => void;
}

function ReplyPreview({ message, onCancel }: ReplyPreviewProps) {
  return (
    <div className="bg-muted/50 flex items-center gap-2 border-t px-4 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary">
            Replying to {message.user.displayName}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {message.content}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="rounded p-1 transition-colors hover:bg-muted"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================================
// Edit Preview Component
// ============================================================================

interface EditPreviewProps {
  originalContent: string;
  onCancel: () => void;
}

function EditPreview({ originalContent, onCancel }: EditPreviewProps) {
  return (
    <div className="flex items-center gap-2 border-t bg-amber-500/10 px-4 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-amber-600">
            Editing message
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {originalContent}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="rounded p-1 transition-colors hover:bg-muted"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================================
// Typing Indicator Component
// ============================================================================

interface TypingIndicatorProps {
  users: TypingUser[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].displayName} is typing...`;
    }
    if (users.length === 2) {
      return `${users[0].displayName} and ${users[1].displayName} are typing...`;
    }
    if (users.length === 3) {
      return `${users[0].displayName}, ${users[1].displayName}, and ${users[2].displayName} are typing...`;
    }
    return `${users[0].displayName} and ${users.length - 1} others are typing...`;
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>
          .
        </span>
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}

// ============================================================================
// Scroll to Bottom Button Component
// ============================================================================

interface ScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export function ScrollToBottomButton({
  visible,
  onClick,
  unreadCount = 0,
}: ScrollToBottomButtonProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute bottom-20 right-4 z-10",
        "flex items-center gap-2 rounded-full",
        "text-primary-foreground bg-primary",
        "px-4 py-2 shadow-lg",
        "hover:bg-primary/90 transition-colors",
        "animate-in fade-in slide-in-from-bottom-2",
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m7 13 5 5 5-5" />
        <path d="m7 6 5 5 5-5" />
      </svg>
      {unreadCount > 0 && (
        <span className="text-sm font-medium">
          {unreadCount} new message{unreadCount !== 1 && "s"}
        </span>
      )}
    </button>
  );
}
