"use client";

import * as React from "react";
import { use, useState, useCallback, useEffect, useMemo } from "react";
import { notFound } from "next/navigation";
import { ChannelHeader } from "@/components/layout/channel-header";
import { MemberList } from "@/components/layout/member-list";
import { PinnedMessages } from "@/components/layout/pinned-messages";
import { ChatContainer } from "@/components/chat/chat-container";
import { ChatLoading } from "@/components/chat/chat-loading";
import { ThreadPanel } from "@/components/thread/thread-panel";
import { useAuth } from "@/contexts/auth-context";
import { useChannelStore, type Channel } from "@/stores/channel-store";
import { useMessageStore } from "@/stores/message-store";
import { useChannelTyping } from "@/hooks/use-channel-typing";
import type { Message, TypingUser } from "@/types/message";
import type { UserProfile, PresenceStatus } from "@/stores/user-store";

// ============================================================================
// Mock Data for Development
// ============================================================================

// Mock channel data
const mockChannels: Record<string, Channel> = {
  general: {
    id: "ch-1",
    name: "general",
    slug: "general",
    description: "General discussion for the whole team",
    type: "public",
    categoryId: null,
    createdBy: "user-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T12:00:00Z",
    topic: "Welcome to the team! Feel free to chat about anything.",
    icon: null,
    color: null,
    isArchived: false,
    isDefault: true,
    memberCount: 8,
    lastMessageAt: new Date().toISOString(),
    lastMessagePreview: "Welcome to the team!",
  },
  announcements: {
    id: "ch-2",
    name: "announcements",
    slug: "announcements",
    description: "Important team announcements",
    type: "public",
    categoryId: null,
    createdBy: "user-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T12:00:00Z",
    topic: "Official announcements only. Read-only for most users.",
    icon: null,
    color: null,
    isArchived: false,
    isDefault: false,
    memberCount: 8,
    lastMessageAt: new Date().toISOString(),
    lastMessagePreview: "New features deployed!",
  },
  random: {
    id: "ch-3",
    name: "random",
    slug: "random",
    description: "Non-work banter and water cooler conversation",
    type: "public",
    categoryId: null,
    createdBy: "user-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T12:00:00Z",
    topic: "Off-topic discussions, memes, and fun stuff!",
    icon: null,
    color: null,
    isArchived: false,
    isDefault: false,
    memberCount: 6,
    lastMessageAt: new Date().toISOString(),
    lastMessagePreview: "Anyone up for lunch?",
  },
};

// Mock members for channels
const mockMembers: UserProfile[] = [
  {
    id: "user-1",
    email: "owner@nself.org",
    username: "owner",
    displayName: "Owner User",
    avatarUrl: undefined,
    role: "owner",
    presence: "online" as PresenceStatus,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "user-2",
    email: "admin@nself.org",
    username: "admin",
    displayName: "Admin User",
    avatarUrl: undefined,
    role: "admin",
    presence: "online" as PresenceStatus,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "user-3",
    email: "moderator@nself.org",
    username: "moderator",
    displayName: "Moderator User",
    avatarUrl: undefined,
    role: "moderator",
    presence: "away" as PresenceStatus,
    customStatus: { emoji: "🏠", text: "Working from home" },
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "user-4",
    email: "alice@nself.org",
    username: "alice",
    displayName: "Alice Smith",
    avatarUrl: undefined,
    role: "member",
    presence: "online" as PresenceStatus,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "user-5",
    email: "bob@nself.org",
    username: "bob",
    displayName: "Bob Jones",
    avatarUrl: undefined,
    role: "member",
    presence: "dnd" as PresenceStatus,
    customStatus: { emoji: "🎯", text: "In a meeting" },
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "user-6",
    email: "charlie@nself.org",
    username: "charlie",
    displayName: "Charlie Brown",
    avatarUrl: undefined,
    role: "member",
    presence: "offline" as PresenceStatus,
    createdAt: new Date("2024-01-01"),
  },
];

// ============================================================================
// Page Component
// ============================================================================

interface ChannelPageProps {
  params: Promise<{ slug: string }>;
}

export default function ChannelPage({ params }: ChannelPageProps) {
  const { slug } = use(params);
  const { user } = useAuth();

  // Local state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Store actions
  const {
    setActiveChannel,
    toggleMuteChannel,
    toggleStarChannel,
    mutedChannels,
    starredChannels,
  } = useChannelStore();

  // Typing indicator hook - integrates with WebSocket and store
  const { typingUsers, stopTyping } = useChannelTyping({
    channelId: channel?.id ?? "",
    enabled: !!channel?.id,
  });

  // Convert typing users to the format expected by ChatContainer
  const formattedTypingUsers: TypingUser[] = useMemo(() => {
    return typingUsers.map((u) => ({
      id: u.userId,
      displayName: u.userName,
      avatarUrl: u.userAvatar,
      startedAt: new Date(u.startedAt),
    }));
  }, [typingUsers]);

  // Load channel data
  useEffect(() => {
    const loadChannel = async () => {
      setLoading(true);
      setError(null);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const channelData = mockChannels[slug];
      if (!channelData) {
        setError("Channel not found");
        setLoading(false);
        return;
      }

      setChannel(channelData);
      setActiveChannel(channelData.id);

      // Check muted/starred status
      setIsMuted(mutedChannels.has(channelData.id));
      setIsStarred(starredChannels.has(channelData.id));

      // Load initial messages
      const initialMessages = generateMockMessages(channelData, user);
      setMessages(initialMessages);

      // Load pinned messages
      const pinned = initialMessages.filter((m) => m.isPinned);
      setPinnedMessages(pinned);

      setLoading(false);
    };

    loadChannel();
  }, [slug, user, setActiveChannel, mutedChannels, starredChannels]);

  // Handle send message
  const handleSendMessage = useCallback(
    (content: string, replyToId?: string) => {
      if (!user || !channel) return;

      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        channelId: channel.id,
        content,
        type: "text",
        userId: user.id,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        createdAt: new Date(),
        isEdited: false,
        replyToId,
        replyTo: replyToId
          ? messages.find((m) => m.id === replyToId)
          : undefined,
      };

      setMessages((prev) => [...prev, newMessage]);
    },
    [user, channel, messages],
  );

  // Handle edit message
  const handleEditMessage = useCallback(
    (messageId: string, content: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content, isEdited: true, editedAt: new Date() }
            : msg,
        ),
      );
    },
    [],
  );

  // Handle delete message
  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  // Handle react to message
  const handleReactToMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (!user) return;

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;

          const reactions = msg.reactions || [];
          const existingReaction = reactions.find((r) => r.emoji === emoji);

          if (existingReaction) {
            // Toggle reaction
            const hasReacted = existingReaction.hasReacted;
            if (hasReacted) {
              // Remove reaction
              const updatedReactions = reactions
                .map((r) =>
                  r.emoji === emoji
                    ? {
                        ...r,
                        count: r.count - 1,
                        hasReacted: false,
                        users: r.users.filter((u) => u.id !== user.id),
                      }
                    : r,
                )
                .filter((r) => r.count > 0);
              return { ...msg, reactions: updatedReactions };
            } else {
              // Add reaction
              return {
                ...msg,
                reactions: reactions.map((r) =>
                  r.emoji === emoji
                    ? {
                        ...r,
                        count: r.count + 1,
                        hasReacted: true,
                        users: [
                          ...r.users,
                          {
                            id: user.id,
                            username: user.username,
                            displayName: user.displayName,
                          },
                        ],
                      }
                    : r,
                ),
              };
            }
          } else {
            // Add new reaction
            return {
              ...msg,
              reactions: [
                ...reactions,
                {
                  emoji,
                  count: 1,
                  hasReacted: true,
                  users: [
                    {
                      id: user.id,
                      username: user.username,
                      displayName: user.displayName,
                    },
                  ],
                },
              ],
            };
          }
        }),
      );
    },
    [user],
  );

  // Handle load more messages
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    // Simulate API call for pagination
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In a real app, this would fetch older messages from the backend
    // For now, we'll just mark hasMore as false since we have all messages
    setHasMore(false);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore]);

  // Handle open thread
  const handleOpenThread = useCallback((messageId: string) => {
    setActiveThreadId(messageId);
    setShowPinnedMessages(false);
    setShowMemberList(false);
  }, []);

  // Handle toggle mute
  const handleToggleMute = useCallback(() => {
    if (channel) {
      toggleMuteChannel(channel.id);
      setIsMuted((prev) => !prev);
    }
  }, [channel, toggleMuteChannel]);

  // Handle toggle star
  const handleToggleStar = useCallback(() => {
    if (channel) {
      toggleStarChannel(channel.id);
      setIsStarred((prev) => !prev);
    }
  }, [channel, toggleStarChannel]);

  // Handle unpin message
  const handleUnpinMessage = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isPinned: false } : msg,
      ),
    );
    setPinnedMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  // Handle jump to message
  const handleJumpToMessage = useCallback((messageId: string) => {
    // Set highlighted message ID for visual feedback
    setHighlightedMessageId(messageId);
    setShowPinnedMessages(false);

    // Scroll to the message element
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Clear highlight after animation
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2000);
  }, []);

  // Error state
  if (error) {
    return notFound();
  }

  // Loading state
  if (loading) {
    return <ChatLoading />;
  }

  // No channel
  if (!channel) {
    return notFound();
  }

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Channel Header */}
        <ChannelHeader
          channel={channel}
          members={mockMembers.slice(0, 5)}
          isMuted={isMuted}
          isStarred={isStarred}
          onToggleMute={handleToggleMute}
          onToggleStar={handleToggleStar}
          onOpenSettings={() => {}}
          onOpenSearch={() => {}}
          onOpenPinnedMessages={() =>
            setShowPinnedMessages(!showPinnedMessages)
          }
          onOpenMemberList={() => setShowMemberList(!showMemberList)}
          onStartCall={() => {}}
          onStartVideoCall={() => {}}
        />

        {/* Chat Container */}
        <ChatContainer
          channel={channel}
          messages={messages}
          loading={loading}
          hasMore={hasMore}
          typingUsers={formattedTypingUsers}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onReactToMessage={handleReactToMessage}
          onLoadMore={handleLoadMore}
          onOpenThread={handleOpenThread}
          className="flex-1"
        />
      </div>

      {/* Pinned Messages Panel */}
      {showPinnedMessages && (
        <PinnedMessages
          messages={pinnedMessages}
          onClose={() => setShowPinnedMessages(false)}
          onJumpToMessage={handleJumpToMessage}
          onUnpinMessage={handleUnpinMessage}
          canUnpin={
            user?.role === "owner" ||
            user?.role === "admin" ||
            user?.role === "moderator"
          }
          className="w-80"
        />
      )}

      {/* Member List Panel */}
      {showMemberList && !showPinnedMessages && !activeThreadId && (
        <MemberList
          members={mockMembers}
          onClose={() => setShowMemberList(false)}
          onMemberClick={(member) => {}}
          onStartDM={(member) => {}}
          className="w-64"
        />
      )}

      {/* Thread Panel */}
      {activeThreadId && !showPinnedMessages && !showMemberList && (
        <ThreadPanel
          threadId={activeThreadId}
          onClose={() => setActiveThreadId(null)}
          standalone
          className="w-96"
        />
      )}
    </div>
  );
}

// ============================================================================
// Helper: Generate Mock Messages
// ============================================================================

function generateMockMessages(
  channel: Channel,
  currentUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    role: string;
  } | null,
): Message[] {
  const baseMessages: Partial<Message>[] = [
    {
      type: "channel_created",
      content: `Channel #${channel.name} was created`,
      userId: "system",
      user: {
        id: "system",
        username: "system",
        displayName: "System",
      },
      isPinned: false,
    },
    {
      type: "text",
      content: `Welcome to #${channel.name}! ${channel.description || "This is a great place to chat."}`,
      userId: "user-1",
      user: {
        id: "user-1",
        username: "owner",
        displayName: "Owner User",
        role: "owner",
      },
      isPinned: true,
    },
    {
      type: "text",
      content: "Hey everyone! Excited to be here.",
      userId: "user-4",
      user: {
        id: "user-4",
        username: "alice",
        displayName: "Alice Smith",
        role: "member",
      },
      reactions: [
        {
          emoji: "wave",
          count: 2,
          hasReacted: false,
          users: [
            { id: "user-1", username: "owner", displayName: "Owner User" },
            { id: "user-2", username: "admin", displayName: "Admin User" },
          ],
        },
      ],
      isPinned: false,
    },
    {
      type: "text",
      content: "Welcome aboard! Let us know if you have any questions.",
      userId: "user-2",
      user: {
        id: "user-2",
        username: "admin",
        displayName: "Admin User",
        role: "admin",
      },
      isPinned: false,
    },
    {
      type: "text",
      content: "Thanks! I'm looking forward to collaborating with everyone.",
      userId: "user-4",
      user: {
        id: "user-4",
        username: "alice",
        displayName: "Alice Smith",
        role: "member",
      },
      reactions: [
        {
          emoji: "thumbs_up",
          count: 3,
          hasReacted: true,
          users: [
            { id: "user-1", username: "owner", displayName: "Owner User" },
            { id: "user-2", username: "admin", displayName: "Admin User" },
            { id: "user-5", username: "bob", displayName: "Bob Jones" },
          ],
        },
        {
          emoji: "heart",
          count: 1,
          hasReacted: false,
          users: [
            {
              id: "user-3",
              username: "moderator",
              displayName: "Moderator User",
            },
          ],
        },
      ],
      isPinned: false,
    },
  ];

  const now = new Date();
  return baseMessages.map((msg, index) => ({
    id: `msg-${index + 1}`,
    channelId: channel.id,
    content: msg.content || "",
    type: msg.type || "text",
    userId: msg.userId || "system",
    user: msg.user || {
      id: "system",
      username: "system",
      displayName: "System",
    },
    createdAt: new Date(now.getTime() - (baseMessages.length - index) * 60000),
    isEdited: false,
    reactions: msg.reactions,
    isPinned: msg.isPinned,
  })) as Message[];
}
