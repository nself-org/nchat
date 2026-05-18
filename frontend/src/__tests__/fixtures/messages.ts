/**
 * Message Test Fixtures
 *
 * Reusable test data for message-related tests
 */

import type { Message, TypingUser } from "@/types/message";
import type { User } from "@/types/user";

// ============================================================================
// User Fixtures
// ============================================================================

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: "user-1",
  username: "testuser",
  displayName: "Test User",
  email: "test@example.com",
  avatarUrl: "https://example.com/avatar.png",
  role: "member",
  status: "online",
  createdAt: new Date("2024-01-01"),
  ...overrides,
});

export const mockUsers = {
  alice: createMockUser({
    id: "user-alice",
    username: "alice",
    displayName: "Alice Smith",
    email: "alice@example.com",
  }),
  bob: createMockUser({
    id: "user-bob",
    username: "bob",
    displayName: "Bob Jones",
    email: "bob@example.com",
  }),
  charlie: createMockUser({
    id: "user-charlie",
    username: "charlie",
    displayName: "Charlie Brown",
    email: "charlie@example.com",
  }),
  owner: createMockUser({
    id: "user-owner",
    username: "owner",
    displayName: "Owner User",
    email: "owner@example.com",
    role: "owner",
  }),
  admin: createMockUser({
    id: "user-admin",
    username: "admin",
    displayName: "Admin User",
    email: "admin@example.com",
    role: "admin",
  }),
};

// ============================================================================
// Message Fixtures
// ============================================================================

export const createMockMessage = (overrides?: Partial<Message>): Message => ({
  id: `msg-${Date.now()}-${Math.random()}`,
  channelId: "channel-1",
  content: "Test message content",
  type: "text",
  userId: mockUsers.alice.id,
  user: mockUsers.alice,
  createdAt: new Date(),
  editedAt: null,
  isEdited: false,
  isPinned: false,
  reactions: [],
  attachments: [],
  mentions: [],
  ...overrides,
});

export const mockMessages = {
  text: createMockMessage({
    id: "msg-text-1",
    content: "Hello, this is a text message!",
    userId: mockUsers.alice.id,
    user: mockUsers.alice,
  }),
  textWithMention: createMockMessage({
    id: "msg-mention-1",
    content: "Hey @bob, check this out!",
    userId: mockUsers.alice.id,
    user: mockUsers.alice,
    mentions: [mockUsers.bob.username],
  }),
  edited: createMockMessage({
    id: "msg-edited-1",
    content: "This message was edited",
    userId: mockUsers.alice.id,
    user: mockUsers.alice,
    isEdited: true,
    editedAt: new Date(),
  }),
  pinned: createMockMessage({
    id: "msg-pinned-1",
    content: "Important pinned message",
    userId: mockUsers.admin.id,
    user: mockUsers.admin,
    isPinned: true,
  }),
  withReactions: createMockMessage({
    id: "msg-reactions-1",
    content: "Message with reactions",
    userId: mockUsers.bob.id,
    user: mockUsers.bob,
    reactions: [
      {
        emoji: "👍",
        count: 3,
        users: [mockUsers.alice.id, mockUsers.bob.id, mockUsers.charlie.id],
      },
      { emoji: "❤️", count: 1, users: [mockUsers.alice.id] },
    ],
  }),
  reply: createMockMessage({
    id: "msg-reply-1",
    content: "This is a reply",
    userId: mockUsers.charlie.id,
    user: mockUsers.charlie,
    replyTo: {
      id: "msg-text-1",
      userId: mockUsers.alice.id,
      content: "Original message",
    },
  }),
  thread: createMockMessage({
    id: "msg-thread-1",
    content: "Message with thread",
    userId: mockUsers.alice.id,
    user: mockUsers.alice,
    threadCount: 5,
    threadLastReplyAt: new Date(),
  }),
  system: createMockMessage({
    id: "msg-system-1",
    type: "system",
    content: "Alice joined the channel",
    userId: "system",
    user: {
      id: "system",
      username: "system",
      displayName: "System",
    },
  }),
};

// ============================================================================
// Create Message Sequences
// ============================================================================

export const createMessageSequence = (
  count: number,
  baseUser = mockUsers.alice,
): Message[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockMessage({
      id: `msg-seq-${i}`,
      content: `Message ${i + 1}`,
      userId: baseUser.id,
      user: baseUser,
      createdAt: new Date(Date.now() + i * 1000),
    }),
  );
};

export const createConversation = (): Message[] => {
  return [
    createMockMessage({
      id: "conv-1",
      content: "Hey everyone!",
      userId: mockUsers.alice.id,
      user: mockUsers.alice,
      createdAt: new Date("2024-01-15T10:00:00"),
    }),
    createMockMessage({
      id: "conv-2",
      content: "Hi Alice!",
      userId: mockUsers.bob.id,
      user: mockUsers.bob,
      createdAt: new Date("2024-01-15T10:01:00"),
    }),
    createMockMessage({
      id: "conv-3",
      content: "Hello!",
      userId: mockUsers.charlie.id,
      user: mockUsers.charlie,
      createdAt: new Date("2024-01-15T10:02:00"),
    }),
  ];
};

// ============================================================================
// Typing Indicators
// ============================================================================

export const createTypingUser = (
  overrides?: Partial<TypingUser>,
): TypingUser => ({
  id: mockUsers.alice.id,
  username: mockUsers.alice.username,
  displayName: mockUsers.alice.displayName,
  ...overrides,
});

export const mockTypingUsers = {
  alice: createTypingUser({
    id: mockUsers.alice.id,
    username: mockUsers.alice.username,
    displayName: mockUsers.alice.displayName,
  }),
  bob: createTypingUser({
    id: mockUsers.bob.id,
    username: mockUsers.bob.username,
    displayName: mockUsers.bob.displayName,
  }),
};

// ============================================================================
// Channels
// ============================================================================

export const createMockChannel = (overrides?: any) => ({
  id: "channel-1",
  name: "general",
  type: "public",
  description: "General discussion",
  createdAt: new Date("2024-01-01"),
  memberCount: 10,
  ...overrides,
});

export const mockChannels = {
  general: createMockChannel({
    id: "channel-general",
    name: "general",
    type: "public",
  }),
  random: createMockChannel({
    id: "channel-random",
    name: "random",
    type: "public",
  }),
  private: createMockChannel({
    id: "channel-private",
    name: "private-team",
    type: "private",
  }),
  dm: createMockChannel({
    id: "dm-alice-bob",
    name: "",
    type: "dm",
  }),
};
