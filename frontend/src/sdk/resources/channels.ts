/**
 * Channels Resource
 *
 * API methods for managing channels.
 */

import { BaseResource } from "./base";
import type {
  Channel,
  PaginatedResult,
  ListOptions,
  UUID,
  User,
} from "../types";

/**
 * Create Channel Options
 */
export interface CreateChannelOptions {
  name: string;
  description?: string;
  type: "public" | "private";
  category?: string;
  members?: UUID[];
}

/**
 * Update Channel Options
 */
export interface UpdateChannelOptions {
  name?: string;
  description?: string;
  category?: string;
}

/**
 * Channels Resource Class
 *
 * @example
 * ```typescript
 * // Create a channel
 * const channel = await client.channels.create({
 *   name: 'general',
 *   description: 'General discussion',
 *   type: 'public'
 * })
 *
 * // List all channels
 * const channels = await client.channels.list()
 *
 * // Join a channel
 * await client.channels.join('channel-123')
 * ```
 */
export class ChannelsResource extends BaseResource {
  /**
   * Create a new channel
   */
  async create(options: CreateChannelOptions): Promise<Channel> {
    return this._post<Channel>("/api/channels", options);
  }

  /**
   * Get a single channel by ID
   */
  async get(channelId: UUID): Promise<Channel> {
    return this._get<Channel>(`/api/channels/${channelId}`);
  }

  /**
   * List all accessible channels
   */
  async list(options?: ListOptions): Promise<PaginatedResult<Channel>> {
    return this._get<PaginatedResult<Channel>>("/api/channels", options);
  }

  /**
   * Update a channel
   */
  async update(
    channelId: UUID,
    options: UpdateChannelOptions,
  ): Promise<Channel> {
    return this._patch<Channel>(`/api/channels/${channelId}`, options);
  }

  /**
   * Delete a channel
   */
  async delete(channelId: UUID): Promise<void> {
    return this._delete<void>(`/api/channels/${channelId}`);
  }

  /**
   * Join a channel
   */
  async join(channelId: UUID): Promise<void> {
    return this._post<void>(`/api/channels/${channelId}/join`);
  }

  /**
   * Leave a channel
   */
  async leave(channelId: UUID): Promise<void> {
    return this._post<void>(`/api/channels/${channelId}/leave`);
  }

  /**
   * Get channel members
   */
  async getMembers(
    channelId: UUID,
    options?: ListOptions,
  ): Promise<PaginatedResult<User>> {
    return this._get<PaginatedResult<User>>(
      `/api/channels/${channelId}/members`,
      options,
    );
  }

  /**
   * Add members to a channel
   */
  async addMembers(channelId: UUID, userIds: UUID[]): Promise<void> {
    return this._post<void>(`/api/channels/${channelId}/members`, { userIds });
  }

  /**
   * Remove a member from a channel
   */
  async removeMember(channelId: UUID, userId: UUID): Promise<void> {
    return this._delete<void>(`/api/channels/${channelId}/members/${userId}`);
  }

  /**
   * Archive a channel
   */
  async archive(channelId: UUID): Promise<void> {
    return this._post<void>(`/api/channels/${channelId}/archive`);
  }

  /**
   * Unarchive a channel
   */
  async unarchive(channelId: UUID): Promise<void> {
    return this._post<void>(`/api/channels/${channelId}/unarchive`);
  }

  /**
   * Mark channel as read
   */
  async markAsRead(channelId: UUID): Promise<void> {
    return this._post<void>(`/api/channels/${channelId}/read`);
  }
}
