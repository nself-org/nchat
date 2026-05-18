/**
 * Broadcast Service
 *
 * Service for managing broadcast lists and sending broadcasts.
 * Broadcasts allow users to send messages to multiple recipients as individual DMs.
 *
 * Features:
 * - Create and manage broadcast lists (max 256 recipients)
 * - Send broadcasts to all recipients as individual DMs
 * - Track delivery and read counts
 * - Recipients don't see each other (privacy)
 */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import {
  GET_BROADCAST_LISTS,
  GET_BROADCAST_LIST,
  GET_BROADCAST_LIST_WITH_RECIPIENTS,
  GET_BROADCAST_HISTORY,
  GET_BROADCAST,
  CREATE_BROADCAST_LIST,
  UPDATE_BROADCAST_LIST,
  UPDATE_BROADCAST_LIST_NAME,
  UPDATE_BROADCAST_LIST_RECIPIENTS,
  DELETE_BROADCAST_LIST,
  SEND_BROADCAST,
  UPDATE_BROADCAST_COUNTS,
  INCREMENT_BROADCAST_READ_COUNT,
  type BroadcastList as GraphQLBroadcastList,
  type Broadcast as GraphQLBroadcast,
} from "@/graphql/broadcasts";
import { GET_OR_CREATE_DM_CHANNEL } from "@/graphql/channels";
import { SEND_MESSAGE } from "@/graphql/messages/mutations";

import { logger } from "@/lib/logger";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of recipients per broadcast list */
export const MAX_RECIPIENTS_PER_LIST = 256;

/** Rate limit: broadcasts per minute */
export const BROADCASTS_PER_MINUTE = 5;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BroadcastList {
  id: string;
  ownerId: string;
  name: string;
  recipientIds: string[];
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface Broadcast {
  id: string;
  listId: string;
  senderId: string;
  content: string;
  contentHtml?: string;
  sentAt: string;
  deliveryCount: number;
  readCount: number;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  list?: BroadcastList;
}

export interface Recipient {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface CreateBroadcastListInput {
  name: string;
  recipientIds: string[];
}

export interface UpdateBroadcastListInput {
  name?: string;
  recipientIds?: string[];
}

export interface SendBroadcastInput {
  content: string;
  contentHtml?: string;
}

export interface BroadcastListsResult {
  lists: BroadcastList[];
  total: number;
  hasMore: boolean;
}

export interface BroadcastHistoryResult {
  broadcasts: Broadcast[];
  total: number;
  hasMore: boolean;
}

export interface SendBroadcastResult {
  broadcast: Broadcast;
  deliveryCount: number;
  failedRecipients: string[];
}

// ============================================================================
// BROADCAST SERVICE CLASS
// ============================================================================

export class BroadcastService {
  private client: ApolloClient<NormalizedCacheObject>;
  private broadcastTimestamps: Map<string, number[]> = new Map();

  constructor(client: ApolloClient<NormalizedCacheObject>) {
    this.client = client;
  }

  // ==========================================================================
  // BROADCAST LIST OPERATIONS
  // ==========================================================================

  /**
   * Create a new broadcast list
   */
  async createBroadcastList(
    input: CreateBroadcastListInput,
    ownerId: string,
  ): Promise<BroadcastList> {
    // Validate recipient count
    if (input.recipientIds.length > MAX_RECIPIENTS_PER_LIST) {
      throw new Error(
        `Maximum ${MAX_RECIPIENTS_PER_LIST} recipients allowed per broadcast list`,
      );
    }

    // Remove duplicates and filter out owner
    const uniqueRecipients = [...new Set(input.recipientIds)].filter(
      (id) => id !== ownerId,
    );

    const { data } = await this.client.mutate({
      mutation: CREATE_BROADCAST_LIST,
      variables: {
        name: input.name.trim(),
        ownerId,
        recipientIds: uniqueRecipients,
      },
    });

    return this.transformBroadcastList(data.insert_nchat_broadcast_lists_one);
  }

  /**
   * Get all broadcast lists for a user
   */
  async getBroadcastLists(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<BroadcastListsResult> {
    const { data } = await this.client.query({
      query: GET_BROADCAST_LISTS,
      variables: { ownerId: userId, limit, offset },
      fetchPolicy: "network-only",
    });

    const lists = (data.nchat_broadcast_lists || []).map(
      (list: Record<string, unknown>) => this.transformBroadcastList(list),
    );
    const total =
      data.nchat_broadcast_lists_aggregate?.aggregate?.count || lists.length;

    return {
      lists,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get a single broadcast list by ID
   */
  async getBroadcastList(id: string): Promise<BroadcastList | null> {
    const { data } = await this.client.query({
      query: GET_BROADCAST_LIST,
      variables: { id },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_broadcast_lists_by_pk) {
      return null;
    }

    return this.transformBroadcastList(data.nchat_broadcast_lists_by_pk);
  }

  /**
   * Get broadcast list with full recipient details
   */
  async getBroadcastListWithRecipients(
    id: string,
  ): Promise<{ list: BroadcastList; recipients: Recipient[] } | null> {
    // First get the list to get recipient IDs
    const list = await this.getBroadcastList(id);
    if (!list) {
      return null;
    }

    // If no recipients, return empty array
    if (list.recipientIds.length === 0) {
      return { list, recipients: [] };
    }

    // Fetch recipient details
    const { data } = await this.client.query({
      query: GET_BROADCAST_LIST_WITH_RECIPIENTS,
      variables: { id, recipientIds: list.recipientIds },
      fetchPolicy: "network-only",
    });

    const recipients = (data.recipients || []).map(
      (user: Record<string, unknown>) => ({
        id: user.id as string,
        username: user.username as string,
        displayName: (user.display_name as string) || (user.username as string),
        avatarUrl: user.avatar_url as string | undefined,
      }),
    );

    return { list, recipients };
  }

  /**
   * Update a broadcast list
   */
  async updateBroadcastList(
    id: string,
    updates: UpdateBroadcastListInput,
  ): Promise<BroadcastList> {
    // Validate recipient count if updating recipients
    if (
      updates.recipientIds &&
      updates.recipientIds.length > MAX_RECIPIENTS_PER_LIST
    ) {
      throw new Error(
        `Maximum ${MAX_RECIPIENTS_PER_LIST} recipients allowed per broadcast list`,
      );
    }

    const variables: Record<string, unknown> = { id };

    if (updates.name !== undefined) {
      variables.name = updates.name.trim();
    }

    if (updates.recipientIds !== undefined) {
      // Remove duplicates
      variables.recipientIds = [...new Set(updates.recipientIds)];
    }

    const { data } = await this.client.mutate({
      mutation: UPDATE_BROADCAST_LIST,
      variables,
    });

    return this.transformBroadcastList(data.update_nchat_broadcast_lists_by_pk);
  }

  /**
   * Delete a broadcast list
   */
  async deleteBroadcastList(id: string): Promise<{ id: string; name: string }> {
    const { data } = await this.client.mutate({
      mutation: DELETE_BROADCAST_LIST,
      variables: { id },
    });

    return {
      id: data.delete_nchat_broadcast_lists_by_pk.id,
      name: data.delete_nchat_broadcast_lists_by_pk.name,
    };
  }

  /**
   * Add recipients to a broadcast list
   */
  async addRecipients(
    listId: string,
    userIds: string[],
  ): Promise<BroadcastList> {
    const list = await this.getBroadcastList(listId);
    if (!list) {
      throw new Error("Broadcast list not found");
    }

    // Merge existing and new recipients
    const allRecipients = [...new Set([...list.recipientIds, ...userIds])];

    // Validate recipient count
    if (allRecipients.length > MAX_RECIPIENTS_PER_LIST) {
      throw new Error(
        `Maximum ${MAX_RECIPIENTS_PER_LIST} recipients allowed. ` +
          `Current: ${list.recipientIds.length}, Adding: ${userIds.length}, ` +
          `Max allowed to add: ${MAX_RECIPIENTS_PER_LIST - list.recipientIds.length}`,
      );
    }

    const { data } = await this.client.mutate({
      mutation: UPDATE_BROADCAST_LIST_RECIPIENTS,
      variables: { id: listId, recipientIds: allRecipients },
    });

    return this.transformBroadcastList(data.update_nchat_broadcast_lists_by_pk);
  }

  /**
   * Remove recipients from a broadcast list
   */
  async removeRecipients(
    listId: string,
    userIds: string[],
  ): Promise<BroadcastList> {
    const list = await this.getBroadcastList(listId);
    if (!list) {
      throw new Error("Broadcast list not found");
    }

    // Filter out recipients to remove
    const remainingRecipients = list.recipientIds.filter(
      (id) => !userIds.includes(id),
    );

    const { data } = await this.client.mutate({
      mutation: UPDATE_BROADCAST_LIST_RECIPIENTS,
      variables: { id: listId, recipientIds: remainingRecipients },
    });

    return this.transformBroadcastList(data.update_nchat_broadcast_lists_by_pk);
  }

  // ==========================================================================
  // BROADCAST SENDING
  // ==========================================================================

  /**
   * Send a broadcast to all recipients in a list
   * Creates individual DM messages to each recipient
   */
  async sendBroadcast(
    listId: string,
    input: SendBroadcastInput,
    senderId: string,
  ): Promise<SendBroadcastResult> {
    // Check rate limit
    if (!this.checkRateLimit(senderId)) {
      throw new Error(
        `Rate limit exceeded. Maximum ${BROADCASTS_PER_MINUTE} broadcasts per minute.`,
      );
    }

    // Get the broadcast list
    const list = await this.getBroadcastList(listId);
    if (!list) {
      throw new Error("Broadcast list not found");
    }

    // Verify ownership
    if (list.ownerId !== senderId) {
      throw new Error("Only the list owner can send broadcasts");
    }

    // Check for empty recipients
    if (list.recipientIds.length === 0) {
      throw new Error("Broadcast list has no recipients");
    }

    // Track delivery results
    let deliveryCount = 0;
    const failedRecipients: string[] = [];

    // Send DM to each recipient
    for (const recipientId of list.recipientIds) {
      try {
        await this.sendDMToRecipient(senderId, recipientId, input);
        deliveryCount++;
      } catch (error) {
        logger.error(`Failed to send broadcast to ${recipientId}:`, error);
        failedRecipients.push(recipientId);
      }
    }

    // Create broadcast record
    const { data } = await this.client.mutate({
      mutation: SEND_BROADCAST,
      variables: {
        listId,
        senderId,
        content: input.content,
        contentHtml: input.contentHtml,
        deliveryCount,
      },
    });

    const broadcast = this.transformBroadcast(data.insert_nchat_broadcasts_one);

    // Record rate limit timestamp
    this.recordBroadcast(senderId);

    return {
      broadcast,
      deliveryCount,
      failedRecipients,
    };
  }

  /**
   * Send a DM to a single recipient
   */
  private async sendDMToRecipient(
    senderId: string,
    recipientId: string,
    input: SendBroadcastInput,
  ): Promise<void> {
    // Get or create DM channel
    const { data: channelData } = await this.client.mutate({
      mutation: GET_OR_CREATE_DM_CHANNEL,
      variables: {
        userId1: senderId,
        userId2: recipientId,
      },
    });

    const channelId = channelData.insert_nchat_channels_one?.id;
    if (!channelId) {
      throw new Error("Failed to create DM channel");
    }

    // Send message
    await this.client.mutate({
      mutation: SEND_MESSAGE,
      variables: {
        channelId,
        userId: senderId,
        content: input.content,
        contentHtml: input.contentHtml,
        type: "broadcast",
      },
    });
  }

  // ==========================================================================
  // BROADCAST HISTORY
  // ==========================================================================

  /**
   * Get broadcast history for a list
   */
  async getBroadcastHistory(
    listId: string,
    limit = 50,
    offset = 0,
  ): Promise<BroadcastHistoryResult> {
    const { data } = await this.client.query({
      query: GET_BROADCAST_HISTORY,
      variables: { listId, limit, offset },
      fetchPolicy: "network-only",
    });

    const broadcasts = (data.nchat_broadcasts || []).map(
      (broadcast: Record<string, unknown>) =>
        this.transformBroadcast(broadcast),
    );
    const total =
      data.nchat_broadcasts_aggregate?.aggregate?.count || broadcasts.length;

    return {
      broadcasts,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get a single broadcast by ID
   */
  async getBroadcast(id: string): Promise<Broadcast | null> {
    const { data } = await this.client.query({
      query: GET_BROADCAST,
      variables: { id },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_broadcasts_by_pk) {
      return null;
    }

    return this.transformBroadcast(data.nchat_broadcasts_by_pk);
  }

  /**
   * Update broadcast counts (delivery/read)
   */
  async updateBroadcastCounts(
    id: string,
    deliveryCount?: number,
    readCount?: number,
  ): Promise<{ id: string; deliveryCount: number; readCount: number }> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_BROADCAST_COUNTS,
      variables: { id, deliveryCount, readCount },
    });

    return {
      id: data.update_nchat_broadcasts_by_pk.id,
      deliveryCount: data.update_nchat_broadcasts_by_pk.delivery_count,
      readCount: data.update_nchat_broadcasts_by_pk.read_count,
    };
  }

  /**
   * Increment read count for a broadcast
   */
  async incrementReadCount(
    id: string,
  ): Promise<{ id: string; readCount: number }> {
    const { data } = await this.client.mutate({
      mutation: INCREMENT_BROADCAST_READ_COUNT,
      variables: { id },
    });

    return {
      id: data.update_nchat_broadcasts_by_pk.id,
      readCount: data.update_nchat_broadcasts_by_pk.read_count,
    };
  }

  // ==========================================================================
  // RATE LIMITING
  // ==========================================================================

  /**
   * Check if user is within rate limit
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const timestamps = this.broadcastTimestamps.get(userId) || [];

    // Filter timestamps within the window
    const recentTimestamps = timestamps.filter((ts) => now - ts < windowMs);

    return recentTimestamps.length < BROADCASTS_PER_MINUTE;
  }

  /**
   * Record a broadcast for rate limiting
   */
  private recordBroadcast(userId: string): void {
    const now = Date.now();
    const timestamps = this.broadcastTimestamps.get(userId) || [];

    // Add current timestamp and keep only recent ones
    const windowMs = 60 * 1000;
    const recentTimestamps = [
      ...timestamps.filter((ts) => now - ts < windowMs),
      now,
    ];

    this.broadcastTimestamps.set(userId, recentTimestamps);
  }

  /**
   * Get remaining broadcasts allowed in current window
   */
  getRemainingBroadcasts(userId: string): number {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const timestamps = this.broadcastTimestamps.get(userId) || [];
    const recentCount = timestamps.filter((ts) => now - ts < windowMs).length;

    return Math.max(0, BROADCASTS_PER_MINUTE - recentCount);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Transform raw broadcast list from GraphQL to typed interface
   */
  private transformBroadcastList(raw: Record<string, unknown>): BroadcastList {
    const recipientIds = (raw.recipient_ids as string[]) || [];

    return {
      id: raw.id as string,
      ownerId: raw.owner_id as string,
      name: raw.name as string,
      recipientIds,
      recipientCount: recipientIds.length,
      createdAt: raw.created_at as string,
      updatedAt: raw.updated_at as string,
      owner: raw.owner
        ? {
            id: (raw.owner as Record<string, unknown>).id as string,
            username: (raw.owner as Record<string, unknown>).username as string,
            displayName:
              ((raw.owner as Record<string, unknown>).display_name as string) ||
              ((raw.owner as Record<string, unknown>).username as string),
            avatarUrl: (raw.owner as Record<string, unknown>).avatar_url as
              | string
              | undefined,
          }
        : undefined,
    };
  }

  /**
   * Transform raw broadcast from GraphQL to typed interface
   */
  private transformBroadcast(raw: Record<string, unknown>): Broadcast {
    return {
      id: raw.id as string,
      listId: raw.list_id as string,
      senderId: raw.sender_id as string,
      content: raw.content as string,
      contentHtml: raw.content_html as string | undefined,
      sentAt: raw.sent_at as string,
      deliveryCount: (raw.delivery_count as number) || 0,
      readCount: (raw.read_count as number) || 0,
      sender: raw.sender
        ? {
            id: (raw.sender as Record<string, unknown>).id as string,
            username: (raw.sender as Record<string, unknown>)
              .username as string,
            displayName:
              ((raw.sender as Record<string, unknown>)
                .display_name as string) ||
              ((raw.sender as Record<string, unknown>).username as string),
            avatarUrl: (raw.sender as Record<string, unknown>).avatar_url as
              | string
              | undefined,
          }
        : undefined,
      list: raw.list
        ? this.transformBroadcastList(raw.list as Record<string, unknown>)
        : undefined,
    };
  }
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

let broadcastServiceInstance: BroadcastService | null = null;

export function getBroadcastService(
  client: ApolloClient<NormalizedCacheObject>,
): BroadcastService {
  if (!broadcastServiceInstance) {
    broadcastServiceInstance = new BroadcastService(client);
  }
  return broadcastServiceInstance;
}

export function createBroadcastService(
  client: ApolloClient<NormalizedCacheObject>,
): BroadcastService {
  return new BroadcastService(client);
}
