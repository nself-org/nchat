/**
 * GraphQL Mocks
 *
 * Mock implementations for Apollo Client and GraphQL operations in tests
 */

import { DocumentNode } from "graphql";
import { MockedResponse } from "@apollo/client/testing";
import type { TestChannel, TestMessage, TestUser } from "../render";
import { testUsers } from "./auth";

// ============================================================================
// Types
// ============================================================================

export interface MockQueryOptions<
  TData = any,
  TVariables = Record<string, any>,
> {
  query: DocumentNode;
  variables?: TVariables;
  data: TData;
  delay?: number;
}

export interface MockMutationOptions<
  TData = any,
  TVariables = Record<string, any>,
> {
  mutation: DocumentNode;
  variables?: TVariables;
  data: TData;
  delay?: number;
}

export interface MockSubscriptionOptions<
  TData = any,
  TVariables = Record<string, any>,
> {
  subscription: DocumentNode;
  variables?: TVariables;
  data: TData[];
  delay?: number;
}

export interface MockErrorOptions {
  query: DocumentNode;
  variables?: Record<string, any>;
  errorMessage: string;
  extensions?: Record<string, any>;
}

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * Create a mock query response
 */
export function createMockQuery<TData = any, TVariables = Record<string, any>>(
  options: MockQueryOptions<TData, TVariables>,
): MockedResponse<Record<string, any>> {
  return {
    request: {
      query: options.query,
      variables: options.variables as Record<string, any>,
    },
    result: {
      data: options.data as Record<string, any>,
    },
    delay: options.delay,
  };
}

/**
 * Create a mock mutation response
 */
export function createMockMutation<
  TData = any,
  TVariables = Record<string, any>,
>(
  options: MockMutationOptions<TData, TVariables>,
): MockedResponse<Record<string, any>> {
  return {
    request: {
      query: options.mutation,
      variables: options.variables as Record<string, any>,
    },
    result: {
      data: options.data as Record<string, any>,
    },
    delay: options.delay,
  };
}

/**
 * Create a mock error response
 */
export function createMockError(options: MockErrorOptions): MockedResponse {
  return {
    request: {
      query: options.query,
      variables: options.variables,
    },
    error: new Error(options.errorMessage),
  };
}

/**
 * Create a mock network error
 */
export function createNetworkError(
  query: DocumentNode,
  variables?: Record<string, any>,
): MockedResponse {
  return {
    request: {
      query,
      variables,
    },
    error: new Error("Network error"),
  };
}

/**
 * Create a mock GraphQL error
 */
export function createGraphQLError(
  query: DocumentNode,
  message: string,
  variables?: Record<string, any>,
): MockedResponse {
  return {
    request: {
      query,
      variables,
    },
    result: {
      errors: [
        {
          message,
          locations: [],
          path: [],
        },
      ],
    },
  };
}

// ============================================================================
// Pre-built Mock Data
// ============================================================================

export const mockChannelData: TestChannel[] = [
  {
    id: "channel-general",
    name: "general",
    slug: "general",
    description: "General discussion for everyone",
    type: "public",
    isDefault: true,
    isArchived: false,
    memberCount: 25,
  },
  {
    id: "channel-random",
    name: "random",
    slug: "random",
    description: "Random conversations",
    type: "public",
    isDefault: false,
    isArchived: false,
    memberCount: 20,
  },
  {
    id: "channel-engineering",
    name: "engineering",
    slug: "engineering",
    description: "Engineering team discussions",
    type: "private",
    isDefault: false,
    isArchived: false,
    memberCount: 8,
  },
  {
    id: "channel-archived",
    name: "old-project",
    slug: "old-project",
    description: "Archived project channel",
    type: "public",
    isDefault: false,
    isArchived: true,
    memberCount: 5,
  },
];

export const mockMessageData: TestMessage[] = [
  {
    id: "msg-1",
    channelId: "channel-general",
    content: "Welcome to the channel!",
    type: "text",
    userId: testUsers.owner.id,
    user: testUsers.owner,
    createdAt: new Date("2024-01-15T10:00:00Z"),
    isEdited: false,
  },
  {
    id: "msg-2",
    channelId: "channel-general",
    content: "Hello everyone!",
    type: "text",
    userId: testUsers.alice.id,
    user: testUsers.alice,
    createdAt: new Date("2024-01-15T10:01:00Z"),
    isEdited: false,
  },
  {
    id: "msg-3",
    channelId: "channel-general",
    content: "Great to be here!",
    type: "text",
    userId: testUsers.bob.id,
    user: testUsers.bob,
    createdAt: new Date("2024-01-15T10:02:00Z"),
    isEdited: false,
    reactions: [
      {
        emoji: "👍",
        count: 3,
        users: ["user-alice", "user-bob", "user-charlie"],
      },
      { emoji: "❤️", count: 1, users: ["user-alice"] },
    ],
  },
  {
    id: "msg-4",
    channelId: "channel-general",
    content: "This message was edited",
    type: "text",
    userId: testUsers.alice.id,
    user: testUsers.alice,
    createdAt: new Date("2024-01-15T10:03:00Z"),
    isEdited: true,
  },
];

// ============================================================================
// Mock Response Builders
// ============================================================================

/**
 * Build mock channels query response
 */
export function buildChannelsResponse(
  channels: TestChannel[] = mockChannelData,
) {
  return {
    nchat_channels: channels.map((ch) => ({
      __typename: "nchat_channels",
      id: ch.id,
      name: ch.name,
      slug: ch.slug,
      description: ch.description || null,
      type: ch.type,
      topic: null,
      is_default: ch.isDefault ?? false,
      is_private: ch.type === "private",
      is_archived: ch.isArchived ?? false,
      position: 0,
      icon: null,
      settings: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category_id: null,
      creator: {
        __typename: "nchat_users",
        id: testUsers.owner.id,
        username: testUsers.owner.username,
        display_name: testUsers.owner.displayName,
        avatar_url: testUsers.owner.avatarUrl,
        status: "online",
        status_emoji: null,
      },
      members_aggregate: {
        __typename: "nchat_channel_members_aggregate",
        aggregate: {
          __typename: "nchat_channel_members_aggregate_fields",
          count: ch.memberCount || 1,
        },
      },
    })),
  };
}

/**
 * Build mock messages query response
 */
export function buildMessagesResponse(
  messages: TestMessage[] = mockMessageData,
  channelId?: string,
) {
  const filteredMessages = channelId
    ? messages.filter((m) => m.channelId === channelId)
    : messages;

  return {
    nchat_messages: filteredMessages.map((msg) => ({
      __typename: "nchat_messages",
      id: msg.id,
      content: msg.content,
      type: msg.type || "text",
      is_edited: msg.isEdited ?? false,
      is_deleted: false,
      created_at: msg.createdAt?.toISOString() || new Date().toISOString(),
      edited_at: msg.isEdited ? new Date().toISOString() : null,
      deleted_at: null,
      user: {
        __typename: "nchat_users",
        id: msg.user?.id || msg.userId,
        username: msg.user?.username || "user",
        display_name: msg.user?.displayName || "User",
        avatar_url: msg.user?.avatarUrl || null,
        status: "online",
      },
      parent: null,
      reactions: (msg.reactions || []).map((r) => ({
        __typename: "nchat_reactions",
        emoji: r.emoji,
        user_id: r.users[0],
      })),
      reactions_aggregate: {
        __typename: "nchat_reactions_aggregate",
        aggregate: {
          __typename: "nchat_reactions_aggregate_fields",
          count: (msg.reactions || []).reduce((sum, r) => sum + r.count, 0),
        },
      },
      attachments: [],
    })),
  };
}

/**
 * Build mock single channel response
 */
export function buildChannelResponse(channel: TestChannel) {
  return {
    nchat_channels: [buildChannelsResponse([channel]).nchat_channels[0]],
  };
}

/**
 * Build mock user response
 */
export function buildUserResponse(user: TestUser) {
  return {
    nchat_users_by_pk: {
      __typename: "nchat_users",
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      email: user.email,
      avatar_url: user.avatarUrl || null,
      role: user.role,
      status: user.status || "online",
      status_emoji: null,
      bio: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Build mock send message mutation response
 */
export function buildSendMessageResponse(message: Partial<TestMessage>) {
  const fullMessage: TestMessage = {
    id: message.id || `msg-${Date.now()}`,
    channelId: message.channelId || "channel-general",
    content: message.content || "",
    type: message.type || "text",
    userId: message.userId || testUsers.member.id,
    user: message.user || testUsers.member,
    createdAt: message.createdAt || new Date(),
    isEdited: false,
  };

  return {
    insert_nchat_messages_one: {
      __typename: "nchat_messages",
      id: fullMessage.id,
      content: fullMessage.content,
      type: fullMessage.type,
      created_at: fullMessage.createdAt?.toISOString(),
      user: {
        __typename: "nchat_users",
        id: fullMessage.userId,
        username: fullMessage.user?.username,
        display_name: fullMessage.user?.displayName,
        avatar_url: fullMessage.user?.avatarUrl,
      },
    },
  };
}

/**
 * Build mock create channel mutation response
 */
export function buildCreateChannelResponse(channel: Partial<TestChannel>) {
  const fullChannel: TestChannel = {
    id: channel.id || `channel-${Date.now()}`,
    name: channel.name || "new-channel",
    slug: channel.slug || "new-channel",
    description: channel.description,
    type: channel.type || "public",
    isDefault: false,
    isArchived: false,
    memberCount: 1,
  };

  return {
    insert_nchat_channels_one: buildChannelsResponse([fullChannel])
      .nchat_channels[0],
  };
}

// ============================================================================
// Mock Apollo Client
// ============================================================================

export function createMockApolloClient(mocks: MockedResponse[] = []) {
  // This is used for test-helpers.ts compatibility
  const { ApolloClient, InMemoryCache } = require("@apollo/client");

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: {
      request: () => null,
    },
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "no-cache",
      },
      query: {
        fetchPolicy: "no-cache",
      },
    },
  });
}
