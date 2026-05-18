/**
 * Data Exporter
 *
 * Core export engine that fetches data from GraphQL and prepares it for export.
 */

import { ApolloClient } from "@apollo/client";
import { gql } from "@apollo/client";
import type {
  ExportOptions,
  ExportData,
  ExportedMessage,
  ExportedChannel,
  ExportedUser,
  ExportMetadata,
  ExportedAttachment,
  ExportedReaction,
  ExportedThread,
} from "./types";

// ============================================================================
// GraphQL Queries
// ============================================================================

const GET_MESSAGES_FOR_EXPORT = gql`
  query GetMessagesForExport(
    $channelIds: [uuid!]
    $fromDate: timestamptz
    $toDate: timestamptz
    $limit: Int!
    $offset: Int!
  ) {
    nchat_messages(
      where: {
        channel_id: { _in: $channelIds }
        created_at: { _gte: $fromDate, _lte: $toDate }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      content
      type
      is_edited
      is_deleted
      is_pinned
      created_at
      updated_at
      edited_at
      deleted_at
      channel_id
      user_id
      reply_to_id
      attachments
      mentions
      metadata
      user {
        id
        username
        display_name
        avatar_url
        role
      }
      channel {
        id
        name
        slug
        type
      }
      reply_to {
        id
        content
        user {
          id
          username
          display_name
        }
      }
      reactions {
        id
        emoji
        user_id
        created_at
        user {
          id
          username
          display_name
          avatar_url
        }
      }
      replies(
        where: { is_deleted: { _eq: false } }
        order_by: { created_at: asc }
        limit: 100
      ) {
        id
        content
        user_id
        created_at
        user {
          id
          username
          display_name
        }
      }
    }
  }
`;

const GET_MESSAGES_COUNT = gql`
  query GetMessagesCount(
    $channelIds: [uuid!]
    $fromDate: timestamptz
    $toDate: timestamptz
  ) {
    nchat_messages_aggregate(
      where: {
        channel_id: { _in: $channelIds }
        created_at: { _gte: $fromDate, _lte: $toDate }
        is_deleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const GET_CHANNELS_FOR_EXPORT = gql`
  query GetChannelsForExport($channelIds: [uuid!]!) {
    nchat_channels(where: { id: { _in: $channelIds } }) {
      id
      name
      slug
      description
      type
      is_private
      created_at
      creator {
        id
        username
        display_name
      }
      members_aggregate {
        aggregate {
          count
        }
      }
      messages_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

const GET_USERS_FOR_EXPORT = gql`
  query GetUsersForExport($userIds: [uuid!]!) {
    nchat_users(where: { id: { _in: $userIds } }) {
      id
      email
      username
      display_name
      role
      created_at
      avatar_url
      status
    }
  }
`;

const GET_MESSAGE_HISTORY = gql`
  query GetMessageHistory($messageIds: [uuid!]!) {
    nchat_message_history(
      where: { message_id: { _in: $messageIds } }
      order_by: { edited_at: desc }
    ) {
      id
      message_id
      content
      edited_at
      edited_by
      editor: user {
        id
        username
        display_name
      }
    }
  }
`;

// ============================================================================
// Data Exporter Class
// ============================================================================

export class DataExporter {
  private client: ApolloClient<unknown>;
  private batchSize = 100; // Number of messages to fetch per batch

  constructor(client: ApolloClient<unknown>) {
    this.client = client;
  }

  /**
   * Export data based on provided options
   */
  async export(
    options: ExportOptions,
    userId: string,
    onProgress?: (
      progress: number,
      itemsProcessed: number,
      itemsTotal: number,
    ) => void,
  ): Promise<ExportData> {
    // Get channel IDs based on scope
    const channelIds = await this.getChannelIds(options, userId);

    // Get total count
    const totalMessages = await this.getMessageCount(channelIds, options);

    // Fetch messages in batches
    const messages: ExportedMessage[] = [];
    let offset = 0;

    while (offset < totalMessages) {
      const batch = await this.fetchMessageBatch(
        channelIds,
        options,
        offset,
        this.batchSize,
      );
      const processedBatch = await this.processMessages(batch, options);
      messages.push(...processedBatch);

      offset += this.batchSize;
      const progress = Math.min(
        100,
        Math.round((offset / totalMessages) * 100),
      );
      onProgress?.(progress, Math.min(offset, totalMessages), totalMessages);
    }

    // Fetch channels and users if requested
    const channels = options.includeChannelData
      ? await this.fetchChannels(channelIds)
      : undefined;

    const userIds = [...new Set(messages.map((m) => m.userId))];
    const users = options.includeUserData
      ? await this.fetchUsers(userIds)
      : undefined;

    // Anonymize if requested (GDPR compliance)
    if (options.anonymize) {
      this.anonymizeData(messages, users);
    }

    // Build metadata
    const metadata = this.buildMetadata(
      messages,
      channels,
      users,
      options,
      userId,
    );

    return {
      metadata,
      messages,
      channels,
      users,
    };
  }

  /**
   * Get channel IDs based on export scope
   */
  private async getChannelIds(
    options: ExportOptions,
    userId: string,
  ): Promise<string[]> {
    switch (options.scope) {
      case "specific_channels":
        return options.channelIds || [];

      case "direct_messages": {
        const { data } = await this.client.query({
          query: gql`
            query GetUserDirectMessages($userId: uuid!) {
              nchat_channel_members(
                where: {
                  user_id: { _eq: $userId }
                  channel: { type: { _eq: "direct" } }
                }
              ) {
                channel_id
              }
            }
          `,
          variables: { userId },
        });
        return data.nchat_channel_members.map(
          (m: { channel_id: string }) => m.channel_id,
        );
      }

      case "all_messages": {
        const { data } = await this.client.query({
          query: gql`
            query GetAllUserChannels($userId: uuid!) {
              nchat_channel_members(where: { user_id: { _eq: $userId } }) {
                channel_id
              }
            }
          `,
          variables: { userId },
        });
        return data.nchat_channel_members.map(
          (m: { channel_id: string }) => m.channel_id,
        );
      }

      case "user_data":
        // User data export includes all channels the user has access to
        return [];

      default:
        return [];
    }
  }

  /**
   * Get total message count
   */
  private async getMessageCount(
    channelIds: string[],
    options: ExportOptions,
  ): Promise<number> {
    if (channelIds.length === 0) return 0;

    const { data } = await this.client.query({
      query: GET_MESSAGES_COUNT,
      variables: {
        channelIds,
        fromDate: options.fromDate?.toISOString(),
        toDate: options.toDate?.toISOString(),
      },
    });

    return data.nchat_messages_aggregate.aggregate.count;
  }

  /**
   * Fetch a batch of messages
   */
  private async fetchMessageBatch(
    channelIds: string[],
    options: ExportOptions,
    offset: number,
    limit: number,
  ) {
    if (channelIds.length === 0) return [];

    const { data } = await this.client.query({
      query: GET_MESSAGES_FOR_EXPORT,
      variables: {
        channelIds,
        fromDate: options.fromDate?.toISOString(),
        toDate: options.toDate?.toISOString(),
        limit,
        offset,
      },
      fetchPolicy: "network-only",
    });

    return data.nchat_messages;
  }

  /**
   * Process raw messages into export format
   */
  private async processMessages(
    rawMessages: any[],
    options: ExportOptions,
  ): Promise<ExportedMessage[]> {
    const messages: ExportedMessage[] = [];

    for (const msg of rawMessages) {
      const exportedMessage: ExportedMessage = {
        id: msg.id,
        channelId: msg.channel_id,
        channelName: msg.channel?.name || "Unknown",
        userId: msg.user_id,
        username: msg.user?.username || "Unknown",
        displayName: msg.user?.display_name || "Unknown",
        content: msg.content,
        type: msg.type,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at,
        isEdited: msg.is_edited,
        isDeleted: msg.is_deleted,
        isPinned: msg.is_pinned,
        editedAt: msg.edited_at,
        deletedAt: msg.deleted_at,
      };

      // Add optional fields based on export options
      if (options.includeFiles && msg.attachments) {
        exportedMessage.attachments = this.processAttachments(
          msg.attachments,
          options.embedFiles || false,
        );
      }

      if (options.includeReactions && msg.reactions) {
        exportedMessage.reactions = this.processReactions(msg.reactions);
      }

      if (options.includeThreads && msg.replies) {
        exportedMessage.thread = this.processThread(msg.replies);
      }

      if (msg.reply_to) {
        exportedMessage.replyTo = {
          id: msg.reply_to.id,
          content: msg.reply_to.content,
          username: msg.reply_to.user?.username || "Unknown",
        };
      }

      if (msg.mentions) {
        exportedMessage.mentions = msg.mentions;
      }

      if (options.includeMetadata && msg.metadata) {
        exportedMessage.metadata = msg.metadata;
      }

      messages.push(exportedMessage);
    }

    // Fetch edit history if requested
    if (options.includeEdits) {
      await this.addEditHistory(messages);
    }

    return messages;
  }

  /**
   * Process attachments
   */
  private processAttachments(
    attachments: any,
    embedFiles: boolean,
  ): ExportedAttachment[] {
    if (!Array.isArray(attachments)) return [];

    return attachments.map((att) => ({
      id: att.id || att.file_id,
      fileName: att.file_name || att.name,
      fileType: att.file_type || att.type,
      fileSize: att.file_size || att.size,
      url: att.url,
      uploadedAt: att.uploaded_at || att.created_at,
      // embedData would be populated by separate file download logic if needed
    }));
  }

  /**
   * Process reactions
   */
  private processReactions(reactions: any[]): ExportedReaction[] {
    return reactions.map((reaction) => ({
      emoji: reaction.emoji,
      userId: reaction.user_id,
      username: reaction.user?.username || "Unknown",
      displayName: reaction.user?.display_name || "Unknown",
      createdAt: reaction.created_at,
    }));
  }

  /**
   * Process thread replies
   */
  private processThread(replies: any[]): ExportedThread {
    return {
      totalReplies: replies.length,
      replies: replies.map((reply) => ({
        id: reply.id,
        content: reply.content,
        userId: reply.user_id,
        username: reply.user?.username || "Unknown",
        createdAt: reply.created_at,
      })),
    };
  }

  /**
   * Add edit history to messages
   */
  private async addEditHistory(messages: ExportedMessage[]): Promise<void> {
    const editedMessageIds = messages
      .filter((m) => m.isEdited)
      .map((m) => m.id);

    if (editedMessageIds.length === 0) return;

    const { data } = await this.client.query({
      query: GET_MESSAGE_HISTORY,
      variables: { messageIds: editedMessageIds },
    });

    const historyByMessageId = new Map<string, any[]>();
    for (const history of data.nchat_message_history) {
      const existing = historyByMessageId.get(history.message_id) || [];
      existing.push(history);
      historyByMessageId.set(history.message_id, existing);
    }

    for (const message of messages) {
      const history = historyByMessageId.get(message.id);
      if (history) {
        message.editHistory = history.map((h) => ({
          content: h.content,
          editedAt: h.edited_at,
          editedBy: h.editor?.username || "Unknown",
        }));
      }
    }
  }

  /**
   * Fetch channels
   */
  private async fetchChannels(
    channelIds: string[],
  ): Promise<ExportedChannel[]> {
    if (channelIds.length === 0) return [];

    const { data } = await this.client.query({
      query: GET_CHANNELS_FOR_EXPORT,
      variables: { channelIds },
    });

    return data.nchat_channels.map((channel: any) => ({
      id: channel.id,
      name: channel.name,
      slug: channel.slug,
      description: channel.description,
      type: channel.type,
      isPrivate: channel.is_private,
      createdAt: channel.created_at,
      createdBy: {
        id: channel.creator?.id || "",
        username: channel.creator?.username || "Unknown",
      },
      memberCount: channel.members_aggregate?.aggregate?.count || 0,
      messageCount: channel.messages_aggregate?.aggregate?.count || 0,
    }));
  }

  /**
   * Fetch users
   */
  private async fetchUsers(userIds: string[]): Promise<ExportedUser[]> {
    if (userIds.length === 0) return [];

    const { data } = await this.client.query({
      query: GET_USERS_FOR_EXPORT,
      variables: { userIds },
    });

    return data.nchat_users.map((user: any) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      createdAt: user.created_at,
      avatarUrl: user.avatar_url,
      status: user.status,
    }));
  }

  /**
   * Anonymize data for GDPR compliance
   */
  private anonymizeData(
    messages: ExportedMessage[],
    users?: ExportedUser[],
  ): void {
    // Create anonymization map
    const userMap = new Map<string, string>();
    let counter = 1;

    for (const message of messages) {
      if (!userMap.has(message.userId)) {
        userMap.set(message.userId, `User ${counter++}`);
      }

      const anonymousName = userMap.get(message.userId)!;
      message.username = anonymousName;
      message.displayName = anonymousName;

      // Anonymize reactions
      if (message.reactions) {
        for (const reaction of message.reactions) {
          if (!userMap.has(reaction.userId)) {
            userMap.set(reaction.userId, `User ${counter++}`);
          }
          const anonName = userMap.get(reaction.userId)!;
          reaction.username = anonName;
          reaction.displayName = anonName;
        }
      }

      // Anonymize thread replies
      if (message.thread) {
        for (const reply of message.thread.replies) {
          if (!userMap.has(reply.userId)) {
            userMap.set(reply.userId, `User ${counter++}`);
          }
          reply.username = userMap.get(reply.userId)!;
        }
      }
    }

    // Anonymize user data
    if (users) {
      for (const user of users) {
        if (userMap.has(user.id)) {
          const anonName = userMap.get(user.id)!;
          user.email = `${anonName.toLowerCase().replace(" ", "")}@anonymized.local`;
          user.username = anonName;
          user.displayName = anonName;
          user.avatarUrl = undefined;
        }
      }
    }
  }

  /**
   * Build export metadata
   */
  private buildMetadata(
    messages: ExportedMessage[],
    channels: ExportedChannel[] | undefined,
    users: ExportedUser[] | undefined,
    options: ExportOptions,
    userId: string,
  ): ExportMetadata {
    const uniqueUsers = new Set(messages.map((m) => m.userId));
    const uniqueChannels = new Set(messages.map((m) => m.channelId));
    const totalFiles = messages.reduce(
      (sum, m) => sum + (m.attachments?.length || 0),
      0,
    );
    const totalReactions = messages.reduce(
      (sum, m) => sum + (m.reactions?.length || 0),
      0,
    );
    const totalThreads = messages.filter((m) => m.thread?.totalReplies).length;

    // Get user info (would come from auth context in real implementation)
    const exportedBy = {
      id: userId,
      email:
        users?.find((u) => u.id === userId)?.email || "unknown@example.com",
      username: users?.find((u) => u.id === userId)?.username || "Unknown",
    };

    return {
      exportId: `export-${Date.now()}`,
      exportedAt: new Date(),
      exportedBy,
      scope: options.scope,
      format: options.format,
      dateRange: {
        from: options.fromDate || null,
        to: options.toDate || null,
      },
      stats: {
        totalMessages: messages.length,
        totalFiles,
        totalUsers: uniqueUsers.size,
        totalChannels: uniqueChannels.size,
        totalReactions,
        totalThreads,
      },
      options,
    };
  }
}
