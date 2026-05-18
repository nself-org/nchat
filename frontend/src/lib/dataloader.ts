/**
 * DataLoader Implementation for N+1 Query Prevention
 *
 * Batches and caches GraphQL queries to prevent N+1 query problems
 * and improve API performance.
 */

import DataLoader from "dataloader";
import { apolloClient } from "./apollo-client";
import { gql } from "@apollo/client";

// ============================================================================
// Type Definitions
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  status?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  createdAt: string;
}

export interface Reaction {
  id: string;
  emoji: string;
  messageId: string;
  userId: string;
}

// ============================================================================
// GraphQL Queries for Batch Loading
// ============================================================================

const GET_USERS_BY_IDS = gql`
  query GetUsersByIds($ids: [uuid!]!) {
    users(where: { id: { _in: $ids } }) {
      id
      email
      displayName: display_name
      avatarUrl: avatar_url
      metadata
    }
  }
`;

const GET_CHANNELS_BY_IDS = gql`
  query GetChannelsByIds($ids: [uuid!]!) {
    nchat_channels(where: { id: { _in: $ids } }) {
      id
      name
      type
      description
      visibility
      metadata
    }
  }
`;

const GET_MESSAGES_BY_IDS = gql`
  query GetMessagesByIds($ids: [uuid!]!) {
    nchat_messages(where: { id: { _in: $ids } }) {
      id
      content
      channel_id
      user_id
      message_type
      created_at
      updated_at
    }
  }
`;

const GET_REACTIONS_BY_MESSAGE_IDS = gql`
  query GetReactionsByMessageIds($messageIds: [uuid!]!) {
    nchat_reactions(where: { message_id: { _in: $messageIds } }) {
      id
      emoji
      message_id
      user_id
      created_at
    }
  }
`;

const GET_CHANNEL_MEMBERS_BY_CHANNEL_IDS = gql`
  query GetChannelMembersByChannelIds($channelIds: [uuid!]!) {
    nchat_channel_members(
      where: { channel_id: { _in: $channelIds }, left_at: { _is_null: true } }
    ) {
      channel_id
      user_id
      role
      joined_at
    }
  }
`;

const GET_UNREAD_COUNTS_BY_CHANNEL_IDS = gql`
  query GetUnreadCountsByChannelIds($channelIds: [uuid!]!, $userId: uuid!) {
    nchat_channels(where: { id: { _in: $channelIds } }) {
      id
      unread_count: messages_aggregate(
        where: {
          created_at: {
            _gt: {
              _select: {
                _from: "nchat_read_receipts"
                _where: {
                  _and: [
                    { user_id: { _eq: $userId } }
                    { channel_id: { _eq: "id" } }
                  ]
                }
                _select: "read_at"
                _order_by: { read_at: desc }
                _limit: 1
              }
            }
          }
          deleted_at: { _is_null: true }
        }
      ) {
        aggregate {
          count
        }
      }
    }
  }
`;

// ============================================================================
// Batch Functions
// ============================================================================

async function batchLoadUsers(
  ids: readonly string[],
): Promise<(User | null)[]> {
  const { data } = await apolloClient.query({
    query: GET_USERS_BY_IDS,
    variables: { ids },
    fetchPolicy: "cache-first",
  });

  const userMap = new Map<string, User>(
    data.users.map((user: any) => [user.id, user]),
  );

  return ids.map((id) => userMap.get(id) || null);
}

async function batchLoadChannels(
  ids: readonly string[],
): Promise<(Channel | null)[]> {
  const { data } = await apolloClient.query({
    query: GET_CHANNELS_BY_IDS,
    variables: { ids },
    fetchPolicy: "cache-first",
  });

  const channelMap = new Map<string, Channel>(
    data.nchat_channels.map((channel: any) => [channel.id, channel]),
  );

  return ids.map((id) => channelMap.get(id) || null);
}

async function batchLoadMessages(
  ids: readonly string[],
): Promise<(Message | null)[]> {
  const { data } = await apolloClient.query({
    query: GET_MESSAGES_BY_IDS,
    variables: { ids },
    fetchPolicy: "cache-first",
  });

  const messageMap = new Map<string, Message>(
    data.nchat_messages.map((message: any) => [message.id, message]),
  );

  return ids.map((id) => messageMap.get(id) || null);
}

async function batchLoadReactionsByMessage(
  messageIds: readonly string[],
): Promise<Reaction[][]> {
  const { data } = await apolloClient.query({
    query: GET_REACTIONS_BY_MESSAGE_IDS,
    variables: { messageIds },
    fetchPolicy: "cache-first",
  });

  const reactionsMap = new Map<string, Reaction[]>();
  data.nchat_reactions.forEach((reaction: any) => {
    const messageReactions = reactionsMap.get(reaction.message_id) || [];
    messageReactions.push(reaction);
    reactionsMap.set(reaction.message_id, messageReactions);
  });

  return messageIds.map((id) => reactionsMap.get(id) || []);
}

async function batchLoadChannelMembers(
  channelIds: readonly string[],
): Promise<any[][]> {
  const { data } = await apolloClient.query({
    query: GET_CHANNEL_MEMBERS_BY_CHANNEL_IDS,
    variables: { channelIds },
    fetchPolicy: "cache-first",
  });

  const membersMap = new Map<string, any[]>();
  data.nchat_channel_members.forEach((member: any) => {
    const channelMembers = membersMap.get(member.channel_id) || [];
    channelMembers.push(member);
    membersMap.set(member.channel_id, channelMembers);
  });

  return channelIds.map((id) => membersMap.get(id) || []);
}

// ============================================================================
// DataLoader Instances
// ============================================================================

export class DataLoaderService {
  private userLoader: DataLoader<string, User | null>;
  private channelLoader: DataLoader<string, Channel | null>;
  private messageLoader: DataLoader<string, Message | null>;
  private reactionsLoader: DataLoader<string, Reaction[]>;
  private channelMembersLoader: DataLoader<string, any[]>;

  constructor() {
    // User loader with caching
    this.userLoader = new DataLoader<string, User | null>(batchLoadUsers, {
      cache: true,
      maxBatchSize: 100,
      batchScheduleFn: (callback: () => void) => setTimeout(callback, 10), // 10ms batching window
    });

    // Channel loader with caching
    this.channelLoader = new DataLoader<string, Channel | null>(
      batchLoadChannels,
      {
        cache: true,
        maxBatchSize: 100,
        batchScheduleFn: (callback: () => void) => setTimeout(callback, 10),
      },
    );

    // Message loader with caching
    this.messageLoader = new DataLoader<string, Message | null>(
      batchLoadMessages,
      {
        cache: true,
        maxBatchSize: 100,
        batchScheduleFn: (callback: () => void) => setTimeout(callback, 10),
      },
    );

    // Reactions loader (by message ID)
    this.reactionsLoader = new DataLoader<string, Reaction[]>(
      batchLoadReactionsByMessage,
      {
        cache: true,
        maxBatchSize: 100,
        batchScheduleFn: (callback: () => void) => setTimeout(callback, 10),
      },
    );

    // Channel members loader
    this.channelMembersLoader = new DataLoader<string, any[]>(
      batchLoadChannelMembers,
      {
        cache: true,
        maxBatchSize: 50,
        batchScheduleFn: (callback: () => void) => setTimeout(callback, 10),
      },
    );
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  async loadUser(id: string): Promise<User | null> {
    return this.userLoader.load(id);
  }

  async loadUsers(ids: string[]): Promise<(User | null | Error)[]> {
    return this.userLoader.loadMany(ids);
  }

  async loadChannel(id: string): Promise<Channel | null> {
    return this.channelLoader.load(id);
  }

  async loadChannels(ids: string[]): Promise<(Channel | null | Error)[]> {
    return this.channelLoader.loadMany(ids);
  }

  async loadMessage(id: string): Promise<Message | null> {
    return this.messageLoader.load(id);
  }

  async loadMessages(ids: string[]): Promise<(Message | null | Error)[]> {
    return this.messageLoader.loadMany(ids);
  }

  async loadReactionsByMessage(messageId: string): Promise<Reaction[]> {
    return this.reactionsLoader.load(messageId);
  }

  async loadChannelMembers(channelId: string): Promise<any[]> {
    return this.channelMembersLoader.load(channelId);
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  clearAll(): void {
    this.userLoader.clearAll();
    this.channelLoader.clearAll();
    this.messageLoader.clearAll();
    this.reactionsLoader.clearAll();
    this.channelMembersLoader.clearAll();
  }

  clearUser(id: string): void {
    this.userLoader.clear(id);
  }

  clearChannel(id: string): void {
    this.channelLoader.clear(id);
  }

  clearMessage(id: string): void {
    this.messageLoader.clear(id);
    this.reactionsLoader.clear(id);
  }

  primeUser(id: string, user: User): void {
    this.userLoader.prime(id, user);
  }

  primeChannel(id: string, channel: Channel): void {
    this.channelLoader.prime(id, channel);
  }

  primeMessage(id: string, message: Message): void {
    this.messageLoader.prime(id, message);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let dataLoaderInstance: DataLoaderService | null = null;

export function getDataLoader(): DataLoaderService {
  if (!dataLoaderInstance) {
    dataLoaderInstance = new DataLoaderService();
  }
  return dataLoaderInstance;
}

// Create fresh DataLoader for each request (server-side)
export function createDataLoader(): DataLoaderService {
  return new DataLoaderService();
}

// Reset DataLoader (useful for testing or cache invalidation)
export function resetDataLoader(): void {
  if (dataLoaderInstance) {
    dataLoaderInstance.clearAll();
  }
  dataLoaderInstance = null;
}
