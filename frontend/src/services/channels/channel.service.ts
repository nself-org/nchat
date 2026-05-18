/**
 * Channel Service
 *
 * Core service for channel CRUD operations using Hasura GraphQL backend.
 * Provides a clean API for channel management with proper error handling.
 */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import {
  GET_CHANNELS,
  GET_CHANNEL_BY_ID,
  GET_CHANNEL_BY_SLUG,
  GET_PUBLIC_CHANNELS,
  SEARCH_CHANNELS,
  GET_CHANNEL_STATS,
  GET_CHANNELS_BY_CATEGORY,
} from "@/graphql/channels/queries";
import {
  CREATE_CHANNEL,
  UPDATE_CHANNEL,
  DELETE_CHANNEL,
  ARCHIVE_CHANNEL,
  UNARCHIVE_CHANNEL,
  UPDATE_CHANNEL_POSITION,
  UPDATE_CHANNEL_TYPE,
  MAKE_ANNOUNCEMENT_CHANNEL,
} from "@/graphql/channels/mutations";
import type { ChannelType } from "@/types/channel";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  topic?: string | null;
  type: ChannelType | "announcement";
  workspaceId?: string | null;
  categoryId?: string | null;
  icon?: string | null;
  color?: string | null;
  position: number;
  isDefault: boolean;
  isArchived: boolean;
  isReadonly: boolean;
  isNsfw: boolean;
  slowmodeSeconds: number;
  maxMembers?: number | null;
  memberCount: number;
  messageCount: number;
  lastMessageAt?: string | null;
  lastMessageId?: string | null;
  retentionDays?: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  creator?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  membersAggregate?: {
    aggregate: {
      count: number;
    };
  };
}

export interface CreateChannelInput {
  name: string;
  slug?: string;
  description?: string | null;
  topic?: string | null;
  type: "public" | "private" | "direct" | "group" | "announcement";
  workspaceId?: string | null;
  categoryId?: string | null;
  icon?: string | null;
  color?: string | null;
  isDefault?: boolean;
  isReadonly?: boolean;
  maxMembers?: number | null;
  slowmodeSeconds?: number;
  memberIds?: string[];
}

export interface UpdateChannelInput {
  name?: string;
  description?: string | null;
  topic?: string | null;
  icon?: string | null;
  color?: string | null;
  categoryId?: string | null;
  position?: number;
  isDefault?: boolean;
  isReadonly?: boolean;
  maxMembers?: number | null;
  slowmodeSeconds?: number;
}

export interface ChannelListOptions {
  type?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchChannelsOptions {
  query: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface ChannelListResult {
  channels: Channel[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// CHANNEL SERVICE CLASS
// ============================================================================

export class ChannelService {
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(client: ApolloClient<NormalizedCacheObject>) {
    this.client = client;
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get a list of channels with optional filtering
   */
  async getChannels(
    options: ChannelListOptions = {},
  ): Promise<ChannelListResult> {
    const { type, includeArchived = false, limit = 50, offset = 0 } = options;

    const { data } = await this.client.query({
      query: GET_CHANNELS,
      variables: { type, includeArchived, limit, offset },
      fetchPolicy: "network-only",
    });

    const channels = this.transformChannels(data.nchat_channels);
    const total =
      data.nchat_channels_aggregate?.aggregate?.count || channels.length;

    return {
      channels,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get public (discoverable) channels
   */
  async getPublicChannels(limit = 50, offset = 0): Promise<ChannelListResult> {
    const { data } = await this.client.query({
      query: GET_PUBLIC_CHANNELS,
      variables: { limit, offset },
      fetchPolicy: "network-only",
    });

    const channels = this.transformChannels(data.nchat_channels);
    const total =
      data.nchat_channels_aggregate?.aggregate?.count || channels.length;

    return {
      channels,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get a single channel by ID
   */
  async getChannelById(id: string): Promise<Channel | null> {
    const { data } = await this.client.query({
      query: GET_CHANNEL_BY_ID,
      variables: { id },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_channels_by_pk) {
      return null;
    }

    return this.transformChannel(data.nchat_channels_by_pk);
  }

  /**
   * Get a single channel by slug
   */
  async getChannelBySlug(
    slug: string,
    workspaceId?: string,
  ): Promise<Channel | null> {
    const { data } = await this.client.query({
      query: GET_CHANNEL_BY_SLUG,
      variables: { slug, workspaceId },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_channels || data.nchat_channels.length === 0) {
      return null;
    }

    return this.transformChannel(data.nchat_channels[0]);
  }

  /**
   * Get channels organized by category
   */
  async getChannelsByCategory(includeArchived = false): Promise<{
    categories: Array<{
      id: string;
      name: string;
      description?: string;
      position: number;
      isCollapsed: boolean;
      channels: Channel[];
    }>;
    uncategorized: Channel[];
  }> {
    const { data } = await this.client.query({
      query: GET_CHANNELS_BY_CATEGORY,
      variables: { includeArchived },
      fetchPolicy: "network-only",
    });

    const categories = (data.nchat_categories || []).map(
      (cat: {
        id: string;
        name: string;
        description?: string;
        position: number;
        is_collapsed: boolean;
        channels: unknown[];
      }) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        position: cat.position,
        isCollapsed: cat.is_collapsed,
        channels: this.transformChannels(
          cat.channels as unknown[] as Record<string, unknown>[],
        ),
      }),
    );

    const uncategorized = this.transformChannels(data.uncategorized || []);

    return { categories, uncategorized };
  }

  /**
   * Search channels by name, description, or topic
   */
  async searchChannels(
    options: SearchChannelsOptions,
  ): Promise<ChannelListResult> {
    const { query, type, limit = 20, offset = 0 } = options;

    const { data } = await this.client.query({
      query: SEARCH_CHANNELS,
      variables: {
        searchQuery: `%${query}%`,
        type,
        limit,
        offset,
      },
      fetchPolicy: "network-only",
    });

    const channels = this.transformChannels(data.nchat_channels);
    const total =
      data.nchat_channels_aggregate?.aggregate?.count || channels.length;

    return {
      channels,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get channel statistics
   */
  async getChannelStats(channelId: string): Promise<{
    memberCount: number;
    messageCount: number;
    pinnedCount: number;
    createdAt: string;
    lastMessageAt?: string;
  } | null> {
    const { data } = await this.client.query({
      query: GET_CHANNEL_STATS,
      variables: { channelId },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_channels_by_pk) {
      return null;
    }

    const channel = data.nchat_channels_by_pk;
    return {
      memberCount:
        channel.member_count ||
        channel.members_aggregate?.aggregate?.count ||
        0,
      messageCount:
        channel.message_count ||
        channel.messages_aggregate?.aggregate?.count ||
        0,
      pinnedCount: channel.pinned_count?.aggregate?.count || 0,
      createdAt: channel.created_at,
      lastMessageAt: channel.last_message_at,
    };
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  /**
   * Create a new channel
   */
  async createChannel(
    input: CreateChannelInput,
    createdBy: string,
  ): Promise<Channel> {
    const slug = input.slug || this.generateSlug(input.name);

    const { data } = await this.client.mutate({
      mutation: CREATE_CHANNEL,
      variables: {
        name: input.name,
        slug,
        description: input.description,
        topic: input.topic,
        type: input.type,
        workspaceId: input.workspaceId,
        categoryId: input.categoryId,
        icon: input.icon,
        color: input.color,
        isDefault: input.isDefault ?? false,
        isReadonly: input.isReadonly ?? false,
        maxMembers: input.maxMembers,
        slowmodeSeconds: input.slowmodeSeconds ?? 0,
        createdBy,
      },
    });

    return this.transformChannel(data.insert_nchat_channels_one);
  }

  /**
   * Update an existing channel
   */
  async updateChannel(
    channelId: string,
    updates: UpdateChannelInput,
  ): Promise<Channel> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_CHANNEL,
      variables: {
        channelId,
        name: updates.name,
        description: updates.description,
        topic: updates.topic,
        icon: updates.icon,
        color: updates.color,
        categoryId: updates.categoryId,
        position: updates.position,
        isDefault: updates.isDefault,
        isReadonly: updates.isReadonly,
        maxMembers: updates.maxMembers,
        slowmodeSeconds: updates.slowmodeSeconds,
      },
    });

    return this.transformChannel(data.update_nchat_channels_by_pk);
  }

  /**
   * Delete a channel (hard delete)
   */
  async deleteChannel(
    channelId: string,
  ): Promise<{ id: string; name: string }> {
    const { data } = await this.client.mutate({
      mutation: DELETE_CHANNEL,
      variables: { channelId },
    });

    return {
      id: data.delete_nchat_channels_by_pk.id,
      name: data.delete_nchat_channels_by_pk.name,
    };
  }

  /**
   * Archive a channel (soft delete)
   */
  async archiveChannel(channelId: string): Promise<Channel> {
    const { data } = await this.client.mutate({
      mutation: ARCHIVE_CHANNEL,
      variables: { channelId },
    });

    return this.transformChannel(data.update_nchat_channels_by_pk);
  }

  /**
   * Unarchive a channel
   */
  async unarchiveChannel(channelId: string): Promise<Channel> {
    const { data } = await this.client.mutate({
      mutation: UNARCHIVE_CHANNEL,
      variables: { channelId },
    });

    return this.transformChannel(data.update_nchat_channels_by_pk);
  }

  /**
   * Update channel position (for reordering)
   */
  async updateChannelPosition(
    channelId: string,
    position: number,
    categoryId?: string | null,
  ): Promise<void> {
    await this.client.mutate({
      mutation: UPDATE_CHANNEL_POSITION,
      variables: { channelId, position, categoryId },
    });
  }

  /**
   * Change channel type
   */
  async updateChannelType(
    channelId: string,
    type: "public" | "private" | "announcement",
  ): Promise<void> {
    await this.client.mutate({
      mutation: UPDATE_CHANNEL_TYPE,
      variables: { channelId, type },
    });
  }

  /**
   * Convert channel to announcement channel
   */
  async makeAnnouncementChannel(channelId: string): Promise<void> {
    await this.client.mutate({
      mutation: MAKE_ANNOUNCEMENT_CHANNEL,
      variables: { channelId },
    });
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Generate a URL-safe slug from a channel name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 80);
  }

  /**
   * Transform a raw channel from GraphQL to our interface
   */
  private transformChannel(raw: Record<string, unknown>): Channel {
    return {
      id: raw.id as string,
      name: raw.name as string,
      slug: raw.slug as string,
      description: raw.description as string | null,
      topic: raw.topic as string | null,
      type: raw.type as ChannelType | "announcement",
      workspaceId: raw.workspace_id as string | null,
      categoryId: raw.category_id as string | null,
      icon: raw.icon as string | null,
      color: raw.color as string | null,
      position: (raw.position as number) || 0,
      isDefault: (raw.is_default as boolean) || false,
      isArchived: (raw.is_archived as boolean) || false,
      isReadonly: (raw.is_readonly as boolean) || false,
      isNsfw: (raw.is_nsfw as boolean) || false,
      slowmodeSeconds: (raw.slowmode_seconds as number) || 0,
      maxMembers: raw.max_members as number | null,
      memberCount: (raw.member_count as number) || 0,
      messageCount: (raw.message_count as number) || 0,
      lastMessageAt: raw.last_message_at as string | null,
      lastMessageId: raw.last_message_id as string | null,
      retentionDays: raw.retention_days as number | null,
      createdBy: raw.created_by as string,
      createdAt: raw.created_at as string,
      updatedAt: raw.updated_at as string,
      archivedAt: raw.archived_at as string | null,
      creator: raw.creator
        ? {
            id: (raw.creator as Record<string, unknown>).id as string,
            username: (raw.creator as Record<string, unknown>)
              .username as string,
            displayName: (raw.creator as Record<string, unknown>)
              .display_name as string,
            avatarUrl: (raw.creator as Record<string, unknown>).avatar_url as
              | string
              | undefined,
          }
        : undefined,
      membersAggregate: raw.members_aggregate as
        | { aggregate: { count: number } }
        | undefined,
    };
  }

  /**
   * Transform an array of raw channels
   */
  private transformChannels(rawChannels: Record<string, unknown>[]): Channel[] {
    return rawChannels.map((raw) => this.transformChannel(raw));
  }
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

let channelServiceInstance: ChannelService | null = null;

export function getChannelService(
  client: ApolloClient<NormalizedCacheObject>,
): ChannelService {
  if (!channelServiceInstance) {
    channelServiceInstance = new ChannelService(client);
  }
  return channelServiceInstance;
}

export function createChannelService(
  client: ApolloClient<NormalizedCacheObject>,
): ChannelService {
  return new ChannelService(client);
}
