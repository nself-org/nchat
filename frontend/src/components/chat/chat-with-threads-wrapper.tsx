"use client";

/**
 * Suspense wrapper for ChatWithThreads
 * Required because useSearchParams needs Suspense boundary
 */

import { Suspense } from "react";
import {
  ChatWithThreads,
  type ChatThreadsToggleProps,
} from "@/components/chat/chat-with-threads";
import type { Message, TypingUser } from "@/types/message";
import type { Channel } from "@/stores/channel-store";

interface ChatWithThreadsProps {
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
  className?: string;
}

export function ChatWithThreadsWrapper(props: ChatWithThreadsProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          Loading...
        </div>
      }
    >
      <ChatWithThreads {...props} />
    </Suspense>
  );
}

export { ChatThreadsToggle } from "@/components/chat/chat-with-threads";
