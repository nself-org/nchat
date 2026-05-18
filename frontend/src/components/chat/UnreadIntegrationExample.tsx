/**
 * Unread Integration Example
 *
 * Complete example showing how to integrate unread tracking
 * into a chat application.
 *
 * This file demonstrates:
 * - useUnread hook integration
 * - UnreadIndicator usage in different contexts
 * - JumpToUnread button integration
 * - Message list with unread line
 * - Channel sidebar with unread badges
 * - Auto mark-as-read on scroll
 */

"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { useUnread, useUnreadNavigation } from "@/hooks/use-unread";
import { UnreadLine, SidebarUnread, MentionHighlight } from "./UnreadIndicator";
import {
  JumpToUnreadButton,
  JumpToChannel,
  UnreadNavigation,
} from "./JumpToUnread";
import { MessageList, type MessageListRef } from "./message-list";
import type { Message } from "@/types/message";

// ============================================================================
// Example 1: Channel Sidebar with Unread Indicators
// ============================================================================

interface ChannelSidebarExampleProps {
  channels: Array<{
    id: string;
    name: string;
    type: "channel" | "dm" | "thread";
    unreadCount: number;
    mentionCount: number;
    isMuted?: boolean;
  }>;
  currentChannelId?: string;
  onChannelClick: (channelId: string) => void;
}

export function ChannelSidebarExample({
  channels,
  currentChannelId,
  onChannelClick,
}: ChannelSidebarExampleProps) {
  return (
    <div className="flex h-full flex-col gap-1 p-2">
      {channels.map((channel) => (
        <SidebarUnread
          key={channel.id}
          channelName={channel.name}
          channelType={channel.type}
          unreadCount={channel.unreadCount}
          mentionCount={channel.mentionCount}
          isMuted={channel.isMuted}
          isActive={channel.id === currentChannelId}
          onClick={() => onChannelClick(channel.id)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Example 2: Message List with Unread Line and Jump Button
// ============================================================================

interface MessageListWithUnreadProps {
  channelId: string;
  messages: Message[];
  onLoadMore?: () => void;
}

export function MessageListWithUnread({
  channelId,
  messages,
  onLoadMore,
}: MessageListWithUnreadProps) {
  const messageListRef = useRef<MessageListRef>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Use unread hook
  const {
    unreadCount,
    mentionCount,
    firstUnreadMessageId,
    hasUnread,
    markChannelAsRead,
    isMessageUnread,
  } = useUnread({
    channelId,
    messages,
    autoMarkRead: true,
    autoMarkReadDelay: 1000,
  });

  // Jump to first unread message
  const handleJumpToUnread = useCallback(() => {
    if (firstUnreadMessageId && messageListRef.current) {
      messageListRef.current.scrollToMessage(firstUnreadMessageId);
    }
  }, [firstUnreadMessageId]);

  // Jump to latest message
  const handleJumpToLatest = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollToBottom("smooth");
    }
  }, []);

  // Process messages to insert unread line
  const messagesWithUnreadLine = React.useMemo(() => {
    if (!firstUnreadMessageId) return messages;

    const firstUnreadIndex = messages.findIndex(
      (m) => m.id === firstUnreadMessageId,
    );
    if (firstUnreadIndex === -1) return messages;

    // Insert a marker at the unread position
    // In real implementation, MessageList would handle this
    return messages;
  }, [messages, firstUnreadMessageId]);

  return (
    <div className="relative flex h-full flex-col">
      {/* Message List */}
      <MessageList
        ref={messageListRef}
        channelId={channelId}
        messages={messagesWithUnreadLine}
        onLoadMore={onLoadMore}
        onMarkAsRead={markChannelAsRead}
      />

      {/* Jump to Unread Button */}
      <JumpToUnreadButton
        hasUnread={hasUnread}
        unreadCount={unreadCount}
        mentionCount={mentionCount}
        onJumpToUnread={handleJumpToUnread}
        onJumpToLatest={handleJumpToLatest}
        isAtBottom={isAtBottom}
        showJumpToLatest={!hasUnread && !isAtBottom}
        position="bottom-center"
        variant="default"
      />
    </div>
  );
}

// ============================================================================
// Example 3: Complete Chat Interface with Unread Navigation
// ============================================================================

interface CompleteChatInterfaceProps {
  channels: Array<{
    id: string;
    name: string;
    type: "channel" | "dm" | "thread";
  }>;
  currentChannelId: string;
  messages: Message[];
  onChannelChange: (channelId: string) => void;
}

export function CompleteChatInterface({
  channels,
  currentChannelId,
  messages,
  onChannelChange,
}: CompleteChatInterfaceProps) {
  const messageListRef = useRef<MessageListRef>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Current channel unread tracking
  const {
    unreadCount,
    mentionCount,
    firstUnreadMessageId,
    hasUnread,
    markChannelAsRead,
  } = useUnread({
    channelId: currentChannelId,
    messages,
    autoMarkRead: false, // Manual control
  });

  // Navigation between unread channels
  const {
    unreadChannels,
    hasUnreadChannels,
    getNextUnreadChannel,
    getPreviousUnreadChannel,
  } = useUnreadNavigation(currentChannelId);

  // Jump to unread in current channel
  const handleJumpToUnread = useCallback(() => {
    if (firstUnreadMessageId && messageListRef.current) {
      messageListRef.current.scrollToMessage(firstUnreadMessageId);
    }
  }, [firstUnreadMessageId]);

  // Jump to next/previous unread channel
  const handleNextUnreadChannel = useCallback(() => {
    const nextChannel = getNextUnreadChannel();
    if (nextChannel) {
      onChannelChange(nextChannel);
    }
  }, [getNextUnreadChannel, onChannelChange]);

  const handlePrevUnreadChannel = useCallback(() => {
    const prevChannel = getPreviousUnreadChannel();
    if (prevChannel) {
      onChannelChange(prevChannel);
    }
  }, [getPreviousUnreadChannel, onChannelChange]);

  return (
    <div className="flex h-screen">
      {/* Sidebar with unread indicators */}
      <div className="bg-muted/50 w-64 border-r">
        <ChannelSidebarExample
          channels={channels.map((channel) => ({
            ...channel,
            unreadCount: 0, // Would be populated from useAllUnread
            mentionCount: 0,
          }))}
          currentChannelId={currentChannelId}
          onChannelClick={onChannelChange}
        />
      </div>

      {/* Main chat area */}
      <div className="relative flex flex-1 flex-col">
        {/* Channel header with unread navigation */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">
            {channels.find((c) => c.id === currentChannelId)?.name}
          </h2>

          {hasUnreadChannels && (
            <JumpToChannel
              onNextUnread={handleNextUnreadChannel}
              onPrevUnread={handlePrevUnreadChannel}
              hasUnreadChannels={hasUnreadChannels}
              unreadChannelCount={unreadChannels.length}
            />
          )}
        </div>

        {/* Messages with jump button */}
        <div className="relative flex-1">
          <MessageList
            ref={messageListRef}
            channelId={currentChannelId}
            messages={messages}
            onMarkAsRead={markChannelAsRead}
          />

          <UnreadNavigation
            messageUnread={{
              hasUnread,
              unreadCount,
              mentionCount,
              onJumpToUnread: handleJumpToUnread,
            }}
            channelUnread={{
              hasUnreadChannels,
              unreadChannelCount: unreadChannels.length,
              onNextUnread: handleNextUnreadChannel,
              onPrevUnread: handlePrevUnreadChannel,
            }}
            isAtBottom={isAtBottom}
            showJumpToLatest={!hasUnread}
            onJumpToLatest={() =>
              messageListRef.current?.scrollToBottom("smooth")
            }
          />
        </div>

        {/* Message input */}
        <div className="border-t p-4">{/* Message input component */}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 4: Custom Message Item with Mention Highlight
// ============================================================================

interface MessageItemWithUnreadProps {
  message: Message;
  channelId: string;
  currentUserId: string;
}

export function MessageItemWithUnread({
  message,
  channelId,
  currentUserId,
}: MessageItemWithUnreadProps) {
  const { isMessageUnread } = useUnread({ channelId });

  const isMentioned =
    message.mentionedUsers?.includes(currentUserId) ||
    message.mentionsEveryone ||
    message.mentionsHere;

  return (
    <MentionHighlight isMentioned={!!isMentioned}>
      <div className="p-4">
        {/* Message content */}
        <div className="flex items-start gap-3">
          <img
            src={message.user.avatarUrl}
            alt={message.user.displayName}
            className="h-10 w-10 rounded-full"
          />
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold">{message.user.displayName}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
              {isMessageUnread(message) && (
                <span className="text-xs font-medium text-blue-500">New</span>
              )}
            </div>
            <div className="mt-1">{message.content}</div>
          </div>
        </div>
      </div>
    </MentionHighlight>
  );
}

// ============================================================================
// Example 5: Browser/Desktop Badge Update
// ============================================================================

export function useBrowserBadge() {
  const { totalUnread, totalMentions } = useUnread({ channelId: "" }) as any; // Use global unread

  useEffect(() => {
    // Update document title
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) nself-chat`;
    } else {
      document.title = "nself-chat";
    }

    // Update favicon badge (would need a library like favico.js)
    // updateFaviconBadge(totalUnread);

    // Desktop app badge (Electron/Tauri)
    if (window.electron?.setBadgeCount) {
      window.electron.setBadgeCount(totalUnread);
    }
  }, [totalUnread, totalMentions]);
}

// ============================================================================
// Type augmentation for electron
// ============================================================================

declare global {
  interface Window {
    electron?: {
      setBadgeCount: (count: number) => void;
    };
  }
}

export default CompleteChatInterface;
