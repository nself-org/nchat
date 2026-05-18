/**
 * Analytics Collector - Collects raw analytics data from various sources
 *
 * Handles data fetching from GraphQL and aggregates raw data for processing
 */

import type {
  DateRange,
  TimeGranularity,
  AnalyticsFilters,
  MessageVolumeData,
  UserActivityData,
  ChannelActivityData,
  ReactionData,
  FileUploadData,
  SearchQueryData,
  PeakHoursData,
  TopMessageData,
  InactiveUserData,
  BotActivityData,
  ResponseTimeData,
  UserGrowthData,
  ChannelGrowthData,
} from "./analytics-types";
import { captureError } from "@/lib/sentry-utils";

// ============================================================================
// Raw Data Types (from database)
// ============================================================================

interface RawMessage {
  id: string;
  content: string;
  channel_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  reply_count: number;
  has_attachments: boolean;
  thread_id: string | null;
}

interface RawUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  last_active_at: string;
  is_bot: boolean;
}

interface RawChannel {
  id: string;
  name: string;
  type: "public" | "private" | "direct";
  created_at: string;
  member_count: number;
}

interface RawReaction {
  id: string;
  emoji: string;
  message_id: string;
  user_id: string;
  created_at: string;
}

interface RawFile {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  user_id: string;
  created_at: string;
}

interface RawSearchLog {
  id: string;
  query: string;
  user_id: string;
  result_count: number;
  created_at: string;
}

// ============================================================================
// Collector Class
// ============================================================================

export class AnalyticsCollector {
  private graphqlEndpoint: string;
  private authToken: string | null;

  constructor(graphqlEndpoint: string, authToken?: string) {
    this.graphqlEndpoint = graphqlEndpoint;
    this.authToken = authToken || null;
  }

  // --------------------------------------------------------------------------
  // GraphQL Query Helper
  // --------------------------------------------------------------------------

  private async query<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0]?.message || "GraphQL query failed");
    }

    return result.data;
  }

  // --------------------------------------------------------------------------
  // Message Collection
  // --------------------------------------------------------------------------

  async collectMessageVolume(
    filters: AnalyticsFilters,
  ): Promise<MessageVolumeData[]> {
    const { dateRange, granularity, channelIds } = filters;

    // Generate time buckets based on granularity
    const buckets = this.generateTimeBuckets(dateRange, granularity);

    const query = `
      query GetMessageVolume($start: timestamptz!, $end: timestamptz!, $channelIds: [uuid!]) {
        nchat_messages(
          where: {
            created_at: { _gte: $start, _lte: $end }
            ${channelIds?.length ? "channel_id: { _in: $channelIds }" : ""}
          }
          order_by: { created_at: asc }
        ) {
          id
          channel_id
          created_at
        }
      }
    `;

    try {
      const data = await this.query<{ nchat_messages: RawMessage[] }>(query, {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        channelIds,
      });

      // Group messages into time buckets
      return this.groupMessagesByTimeBucket(
        data.nchat_messages,
        buckets,
        granularity,
      );
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectMessageVolume" },
      });
      throw new Error(
        `Failed to collect message volume: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async collectTopMessages(
    filters: AnalyticsFilters,
    limit: number = 10,
  ): Promise<TopMessageData[]> {
    const { dateRange } = filters;

    const query = `
      query GetTopMessages($start: timestamptz!, $end: timestamptz!, $limit: Int!) {
        nchat_messages(
          where: {
            created_at: { _gte: $start, _lte: $end }
            deleted_at: { _is_null: true }
          }
          order_by: [
            { reactions_aggregate: { count: desc } }
            { reply_count: desc }
          ]
          limit: $limit
        ) {
          id
          content
          channel_id
          created_at
          reply_count
          channel {
            id
            name
          }
          user {
            id
            username
            display_name
            avatar_url
          }
          reactions_aggregate {
            aggregate {
              count
            }
          }
        }
      }
    `;

    try {
      const data = await this.query<{
        nchat_messages: Array<{
          id: string;
          content: string;
          channel_id: string;
          created_at: string;
          reply_count: number;
          channel: { id: string; name: string };
          user: {
            id: string;
            username: string;
            display_name: string;
            avatar_url: string | null;
          };
          reactions_aggregate: { aggregate: { count: number } };
        }>;
      }>(query, {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        limit,
      });

      return data.nchat_messages.map((msg) => ({
        messageId: msg.id,
        content: msg.content.substring(0, 200),
        channelId: msg.channel.id,
        channelName: msg.channel.name,
        authorId: msg.user.id,
        authorName: msg.user.display_name || msg.user.username,
        authorAvatar: msg.user.avatar_url || undefined,
        reactionCount: msg.reactions_aggregate.aggregate.count,
        replyCount: msg.reply_count,
        timestamp: new Date(msg.created_at),
      }));
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectTopMessages" },
      });
      throw new Error(
        `Failed to collect top messages: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // User Collection
  // --------------------------------------------------------------------------

  async collectUserActivity(
    filters: AnalyticsFilters,
    limit: number = 50,
  ): Promise<UserActivityData[]> {
    const { dateRange, includeBots } = filters;

    const query = `
      query GetUserActivity($start: timestamptz!, $end: timestamptz!, $limit: Int!, $includeBots: Boolean!) {
        nchat_users(
          where: {
            ${!includeBots ? "is_bot: { _eq: false }" : ""}
            messages: {
              created_at: { _gte: $start, _lte: $end }
            }
          }
          limit: $limit
        ) {
          id
          username
          display_name
          avatar_url
          last_active_at
          messages_aggregate(where: { created_at: { _gte: $start, _lte: $end } }) {
            aggregate {
              count
            }
          }
          reactions_aggregate(where: { created_at: { _gte: $start, _lte: $end } }) {
            aggregate {
              count
            }
          }
          files_aggregate(where: { created_at: { _gte: $start, _lte: $end } }) {
            aggregate {
              count
            }
          }
        }
      }
    `;

    try {
      const data = await this.query<{
        nchat_users: Array<{
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          last_active_at: string;
          messages_aggregate: { aggregate: { count: number } };
          reactions_aggregate: { aggregate: { count: number } };
          files_aggregate: { aggregate: { count: number } };
        }>;
      }>(query, {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        limit,
        includeBots: includeBots || false,
      });

      return data.nchat_users.map((user) => ({
        userId: user.id,
        username: user.username,
        displayName: user.display_name || user.username,
        avatarUrl: user.avatar_url || undefined,
        lastActive: new Date(user.last_active_at),
        messageCount: user.messages_aggregate.aggregate.count,
        reactionCount: user.reactions_aggregate.aggregate.count,
        fileCount: user.files_aggregate.aggregate.count,
        threadCount: 0, // Would need additional query
        engagementScore: this.calculateEngagementScore(
          user.messages_aggregate.aggregate.count,
          user.reactions_aggregate.aggregate.count,
          user.files_aggregate.aggregate.count,
        ),
      }));
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectUserActivity" },
      });
      throw new Error(
        `Failed to collect user activity: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async collectInactiveUsers(
    days: number = 30,
    limit: number = 50,
  ): Promise<InactiveUserData[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const query = `
      query GetInactiveUsers($cutoff: timestamptz!, $limit: Int!) {
        nchat_users(
          where: {
            is_bot: { _eq: false }
            last_active_at: { _lt: $cutoff }
          }
          order_by: { last_active_at: desc }
          limit: $limit
        ) {
          id
          username
          display_name
          avatar_url
          last_active_at
          messages_aggregate {
            aggregate {
              count
            }
          }
        }
      }
    `;

    try {
      const data = await this.query<{
        nchat_users: Array<{
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          last_active_at: string;
          messages_aggregate: { aggregate: { count: number } };
        }>;
      }>(query, {
        cutoff: cutoffDate.toISOString(),
        limit,
      });

      const now = new Date();
      return data.nchat_users.map((user) => {
        const lastActive = new Date(user.last_active_at);
        const daysSinceActive = Math.floor(
          (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          userId: user.id,
          username: user.username,
          displayName: user.display_name || user.username,
          avatarUrl: user.avatar_url || undefined,
          lastActive,
          daysSinceActive,
          totalMessages: user.messages_aggregate.aggregate.count,
        };
      });
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectInactiveUsers" },
      });
      throw new Error(
        `Failed to collect inactive users: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async collectUserGrowth(
    filters: AnalyticsFilters,
  ): Promise<UserGrowthData[]> {
    const { dateRange, granularity } = filters;
    const buckets = this.generateTimeBuckets(dateRange, granularity);

    const query = `
      query GetUserGrowth($start: timestamptz!, $end: timestamptz!) {
        nchat_users(
          where: {
            created_at: { _gte: $start, _lte: $end }
          }
          order_by: { created_at: asc }
        ) {
          id
          created_at
        }
        total_users: nchat_users_aggregate(
          where: { created_at: { _lt: $start } }
        ) {
          aggregate {
            count
          }
        }
      }
    `;

    try {
      const data = await this.query<{
        nchat_users: Array<{ id: string; created_at: string }>;
        total_users: { aggregate: { count: number } };
      }>(query, {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      });

      let runningTotal = data.total_users.aggregate.count;

      return buckets.map((bucket) => {
        const newUsers = data.nchat_users.filter((user) => {
          const createdAt = new Date(user.created_at);
          return createdAt >= bucket.start && createdAt < bucket.end;
        }).length;

        runningTotal += newUsers;

        return {
          timestamp: bucket.start,
          newUsers,
          totalUsers: runningTotal,
          churnedUsers: 0, // Would need additional tracking
          netGrowth: newUsers,
        };
      });
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectUserGrowth" },
      });
      throw new Error(
        `Failed to collect user growth: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Channel Collection
  // --------------------------------------------------------------------------

  async collectChannelActivity(
    filters: AnalyticsFilters,
    limit: number = 20,
  ): Promise<ChannelActivityData[]> {
    const { dateRange, channelTypes } = filters;

    const query = `
      query GetChannelActivity($start: timestamptz!, $end: timestamptz!, $limit: Int!) {
        nchat_channels(
          where: {
            is_archived: { _eq: false }
            ${channelTypes?.length ? `type: { _in: ${JSON.stringify(channelTypes)} }` : ""}
          }
          limit: $limit
        ) {
          id
          name
          type
          members_aggregate {
            aggregate {
              count
            }
          }
          messages_aggregate(where: { created_at: { _gte: $start, _lte: $end } }) {
            aggregate {
              count
            }
          }
          messages(
            where: { created_at: { _gte: $start, _lte: $end } }
            distinct_on: user_id
          ) {
            user_id
          }
        }
      }
    `;

    try {
      const data = await this.query<{
        nchat_channels: Array<{
          id: string;
          name: string;
          type: "public" | "private" | "direct";
          members_aggregate: { aggregate: { count: number } };
          messages_aggregate: { aggregate: { count: number } };
          messages: Array<{ user_id: string }>;
        }>;
      }>(query, {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        limit,
      });

      return data.nchat_channels.map((channel) => {
        const memberCount = channel.members_aggregate.aggregate.count;
        const activeUsers = channel.messages.length;

        return {
          channelId: channel.id,
          channelName: channel.name,
          channelType: channel.type,
          memberCount,
          messageCount: channel.messages_aggregate.aggregate.count,
          activeUsers,
          lastActivity: new Date(), // Would need additional query
          engagementRate:
            memberCount > 0 ? (activeUsers / memberCount) * 100 : 0,
          growthRate: 0, // Would need historical data
        };
      });
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectChannelActivity" },
      });
      throw new Error(
        `Failed to collect channel activity: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async collectChannelGrowth(
    channelId: string,
    filters: AnalyticsFilters,
  ): Promise<ChannelGrowthData[]> {
    const { dateRange, granularity } = filters;
    const buckets = this.generateTimeBuckets(dateRange, granularity);

    const query = `
      query GetChannelGrowth($channelId: uuid!, $start: timestamptz!, $end: timestamptz!) {
        nchat_channel_member_events(
          where: {
            channel_id: { _eq: $channelId }
            created_at: { _gte: $start, _lte: $end }
          }
          order_by: { created_at: asc }
        ) {
          id
          event_type
          created_at
        }
        channel: nchat_channels_by_pk(id: $channelId) {
          name
          members_aggregate(where: { joined_at: { _lt: $start } }) {
            aggregate {
              count
            }
          }
        }
      }
    `;

    try {
      const data = await this.query<{
        nchat_channel_member_events: Array<{
          id: string;
          event_type: "joined" | "left";
          created_at: string;
        }>;
        channel: {
          name: string;
          members_aggregate: { aggregate: { count: number } };
        } | null;
      }>(query, {
        channelId,
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      });

      if (!data.channel) {
        throw new Error(`Channel ${channelId} not found`);
      }

      let runningTotal = data.channel.members_aggregate.aggregate.count;
      const channelName = data.channel.name;

      return buckets.map((bucket) => {
        const eventsInBucket = data.nchat_channel_member_events.filter(
          (event) => {
            const createdAt = new Date(event.created_at);
            return createdAt >= bucket.start && createdAt < bucket.end;
          },
        );

        const newMembers = eventsInBucket.filter(
          (e) => e.event_type === "joined",
        ).length;
        const leftMembers = eventsInBucket.filter(
          (e) => e.event_type === "left",
        ).length;
        runningTotal += newMembers - leftMembers;

        return {
          timestamp: bucket.start,
          channelId,
          channelName,
          newMembers,
          leftMembers,
          totalMembers: runningTotal,
        };
      });
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectChannelGrowth" },
      });
      throw new Error(
        `Failed to collect channel growth: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Reaction Collection
  // --------------------------------------------------------------------------

  async collectReactions(
    filters: AnalyticsFilters,
    limit: number = 20,
  ): Promise<ReactionData[]> {
    const { dateRange } = filters;

    const query = `
      query GetReactions($start: timestamptz!, $end: timestamptz!) {
        nchat_reactions(
          where: {
            created_at: { _gte: $start, _lte: $end }
          }
        ) {
          emoji
          user_id
        }
      }
    `;

    try {
      const data = await this.query<{ nchat_reactions: RawReaction[] }>(query, {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      });

      // Aggregate reactions by emoji
      const emojiCounts = new Map<
        string,
        { count: number; users: Set<string> }
      >();

      data.nchat_reactions.forEach((reaction) => {
        const existing = emojiCounts.get(reaction.emoji);
        if (existing) {
          existing.count++;
          existing.users.add(reaction.user_id);
        } else {
          emojiCounts.set(reaction.emoji, {
            count: 1,
            users: new Set([reaction.user_id]),
          });
        }
      });

      const totalReactions = data.nchat_reactions.length;

      return Array.from(emojiCounts.entries())
        .map(([emoji, data]) => ({
          emoji,
          emojiName: emoji, // Would need emoji name mapping
          count: data.count,
          percentage:
            totalReactions > 0 ? (data.count / totalReactions) * 100 : 0,
          users: data.users.size,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectReactions" },
      });
      throw new Error(
        `Failed to collect reactions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // File Collection
  // --------------------------------------------------------------------------

  async collectFileUploads(
    filters: AnalyticsFilters,
  ): Promise<FileUploadData[]> {
    const { dateRange, granularity } = filters;
    const buckets = this.generateTimeBuckets(dateRange, granularity);

    const query = `
      query GetFileUploads($start: timestamptz!, $end: timestamptz!) {
        nchat_files(
          where: {
            created_at: { _gte: $start, _lte: $end }
          }
          order_by: { created_at: asc }
        ) {
          id
          mime_type
          size
          created_at
        }
      }
    `;

    try {
      const data = await this.query<{ nchat_files: RawFile[] }>(query, {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      });

      return buckets.map((bucket) => {
        const filesInBucket = data.nchat_files.filter((file) => {
          const createdAt = new Date(file.created_at);
          return createdAt >= bucket.start && createdAt < bucket.end;
        });

        const fileTypes: Record<string, number> = {};
        let totalSize = 0;

        filesInBucket.forEach((file) => {
          const type = this.categorizeFileType(file.mime_type);
          fileTypes[type] = (fileTypes[type] || 0) + 1;
          totalSize += file.size;
        });

        return {
          timestamp: bucket.start,
          count: filesInBucket.length,
          totalSize,
          fileTypes,
        };
      });
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectFileUploads" },
      });
      throw new Error(
        `Failed to collect file uploads: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Search Collection
  // --------------------------------------------------------------------------

  async collectSearchQueries(
    filters: AnalyticsFilters,
    limit: number = 50,
  ): Promise<SearchQueryData[]> {
    const { dateRange } = filters;

    const query = `
      query GetSearchQueries($start: timestamptz!, $end: timestamptz!) {
        nchat_search_logs(
          where: {
            created_at: { _gte: $start, _lte: $end }
          }
          order_by: { created_at: desc }
        ) {
          query
          result_count
          created_at
        }
      }
    `;

    try {
      const data = await this.query<{ nchat_search_logs: RawSearchLog[] }>(
        query,
        {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        },
      );

      // Aggregate by query
      const queryCounts = new Map<
        string,
        {
          count: number;
          totalResults: number;
          lastSearched: Date;
        }
      >();

      data.nchat_search_logs.forEach((log) => {
        const normalizedQuery = log.query.toLowerCase().trim();
        const existing = queryCounts.get(normalizedQuery);
        const searchDate = new Date(log.created_at);

        if (existing) {
          existing.count++;
          existing.totalResults += log.result_count;
          if (searchDate > existing.lastSearched) {
            existing.lastSearched = searchDate;
          }
        } else {
          queryCounts.set(normalizedQuery, {
            count: 1,
            totalResults: log.result_count,
            lastSearched: searchDate,
          });
        }
      });

      return Array.from(queryCounts.entries())
        .map(([query, data]) => ({
          query,
          count: data.count,
          resultCount: Math.round(data.totalResults / data.count),
          clickThroughRate: 0, // Would need click tracking
          lastSearched: data.lastSearched,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectSearchQueries" },
      });
      throw new Error(
        `Failed to collect search queries: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Peak Hours Collection
  // --------------------------------------------------------------------------

  async collectPeakHours(filters: AnalyticsFilters): Promise<PeakHoursData[]> {
    const { dateRange } = filters;

    const query = `
      query GetMessagesByHour($start: timestamptz!, $end: timestamptz!) {
        nchat_messages(
          where: {
            created_at: { _gte: $start, _lte: $end }
          }
        ) {
          created_at
          user_id
        }
      }
    `;

    try {
      const data = await this.query<{
        nchat_messages: Array<{
          created_at: string;
          user_id: string;
        }>;
      }>(query, {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      });

      // Group by hour
      const hourlyData = new Array(24).fill(null).map(() => ({
        messages: 0,
        users: new Set<string>(),
      }));

      data.nchat_messages.forEach((msg) => {
        const hour = new Date(msg.created_at).getHours();
        hourlyData[hour].messages++;
        hourlyData[hour].users.add(msg.user_id);
      });

      return hourlyData.map((data, hour) => ({
        hour,
        messageCount: data.messages,
        activeUsers: data.users.size,
        averageResponseTime: 0, // Would need response time tracking
      }));
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectPeakHours" },
      });
      throw new Error(
        `Failed to collect peak hours: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Bot Collection
  // --------------------------------------------------------------------------

  async collectBotActivity(
    filters: AnalyticsFilters,
    limit: number = 20,
  ): Promise<BotActivityData[]> {
    const { dateRange } = filters;

    const query = `
      query GetBotActivity($start: timestamptz!, $end: timestamptz!, $limit: Int!) {
        nchat_users(
          where: {
            is_bot: { _eq: true }
          }
          limit: $limit
        ) {
          id
          username
          display_name
          avatar_url
          last_active_at
          messages_aggregate(where: { created_at: { _gte: $start, _lte: $end } }) {
            aggregate {
              count
            }
          }
        }
      }
    `;

    try {
      const data = await this.query<{
        nchat_users: Array<{
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          last_active_at: string;
          messages_aggregate: { aggregate: { count: number } };
        }>;
      }>(query, {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        limit,
      });

      return data.nchat_users.map((bot) => ({
        botId: bot.id,
        botName: bot.display_name || bot.username,
        avatarUrl: bot.avatar_url || undefined,
        messageCount: bot.messages_aggregate.aggregate.count,
        commandCount: 0, // Would need command tracking
        errorCount: 0, // Would need error tracking
        lastActive: new Date(bot.last_active_at),
        channels: [], // Would need channel membership query
      }));
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectBotActivity" },
      });
      throw new Error(
        `Failed to collect bot activity: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Response Time Collection
  // --------------------------------------------------------------------------

  async collectResponseTimes(
    filters: AnalyticsFilters,
  ): Promise<ResponseTimeData[]> {
    const { dateRange, granularity, channelIds } = filters;
    const buckets = this.generateTimeBuckets(dateRange, granularity);

    // Query messages and their replies to calculate response times
    const query = `
      query GetResponseTimes($start: timestamptz!, $end: timestamptz!, $channelIds: [uuid!]) {
        nchat_messages(
          where: {
            created_at: { _gte: $start, _lte: $end }
            thread_id: { _is_not_null: true }
            ${channelIds?.length ? "channel_id: { _in: $channelIds }" : ""}
          }
          order_by: { created_at: asc }
        ) {
          id
          channel_id
          created_at
          thread_id
          thread {
            created_at
          }
          channel {
            id
            name
          }
        }
      }
    `;

    try {
      const data = await this.query<{
        nchat_messages: Array<{
          id: string;
          channel_id: string;
          created_at: string;
          thread_id: string;
          thread: { created_at: string };
          channel: { id: string; name: string };
        }>;
      }>(query, {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        channelIds,
      });

      return buckets.map((bucket) => {
        const repliesInBucket = data.nchat_messages.filter((msg) => {
          const createdAt = new Date(msg.created_at);
          return createdAt >= bucket.start && createdAt < bucket.end;
        });

        // Calculate response times (time between thread creation and reply)
        const responseTimes = repliesInBucket.map((reply) => {
          const replyTime = new Date(reply.created_at).getTime();
          const threadTime = new Date(reply.thread.created_at).getTime();
          return (replyTime - threadTime) / 1000; // Convert to seconds
        });

        const averageTime =
          responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        // Calculate median
        const sortedTimes = [...responseTimes].sort((a, b) => a - b);
        const medianTime =
          sortedTimes.length > 0
            ? sortedTimes[Math.floor(sortedTimes.length / 2)]
            : 0;

        // Get channel info (use first channel if multiple, or 'all')
        const channelId = channelIds?.[0] || "all";
        const channelName = repliesInBucket[0]?.channel?.name || "All Channels";

        return {
          timestamp: bucket.start,
          channelId,
          channelName,
          averageTime,
          medianTime,
          messageCount: repliesInBucket.length,
        };
      });
    } catch (error) {
      captureError(error as Error, {
        tags: { collector: "analytics", method: "collectResponseTimes" },
      });
      throw new Error(
        `Failed to collect response times: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private generateTimeBuckets(
    dateRange: DateRange,
    granularity: TimeGranularity,
  ): Array<{ start: Date; end: Date }> {
    const buckets: Array<{ start: Date; end: Date }> = [];
    const current = new Date(dateRange.start);

    while (current < dateRange.end) {
      const bucketStart = new Date(current);
      let bucketEnd: Date;

      switch (granularity) {
        case "hour":
          bucketEnd = new Date(current.getTime() + 60 * 60 * 1000);
          break;
        case "day":
          bucketEnd = new Date(current);
          bucketEnd.setDate(bucketEnd.getDate() + 1);
          break;
        case "week":
          bucketEnd = new Date(current);
          bucketEnd.setDate(bucketEnd.getDate() + 7);
          break;
        case "month":
          bucketEnd = new Date(current);
          bucketEnd.setMonth(bucketEnd.getMonth() + 1);
          break;
        case "year":
          bucketEnd = new Date(current);
          bucketEnd.setFullYear(bucketEnd.getFullYear() + 1);
          break;
      }

      buckets.push({
        start: bucketStart,
        end: bucketEnd > dateRange.end ? new Date(dateRange.end) : bucketEnd,
      });

      current.setTime(bucketEnd.getTime());
    }

    return buckets;
  }

  private groupMessagesByTimeBucket(
    messages: RawMessage[],
    buckets: Array<{ start: Date; end: Date }>,
    _granularity: TimeGranularity,
  ): MessageVolumeData[] {
    return buckets.map((bucket) => {
      const messagesInBucket = messages.filter((msg) => {
        const createdAt = new Date(msg.created_at);
        return createdAt >= bucket.start && createdAt < bucket.end;
      });

      // Count by channel
      const channelBreakdown: Record<string, number> = {};
      messagesInBucket.forEach((msg) => {
        channelBreakdown[msg.channel_id] =
          (channelBreakdown[msg.channel_id] || 0) + 1;
      });

      return {
        timestamp: bucket.start,
        count: messagesInBucket.length,
        channelBreakdown,
      };
    });
  }

  private calculateEngagementScore(
    messages: number,
    reactions: number,
    files: number,
  ): number {
    // Weighted engagement score
    return messages * 1 + reactions * 0.5 + files * 2;
  }

  private categorizeFileType(mimeType: string): string {
    if (mimeType.startsWith("image/")) return "Images";
    if (mimeType.startsWith("video/")) return "Videos";
    if (mimeType.startsWith("audio/")) return "Audio";
    if (mimeType.includes("pdf")) return "Documents";
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
      return "Spreadsheets";
    if (mimeType.includes("document") || mimeType.includes("word"))
      return "Documents";
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
      return "Presentations";
    if (mimeType.includes("zip") || mimeType.includes("archive"))
      return "Archives";
    return "Other";
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let collectorInstance: AnalyticsCollector | null = null;

export function getAnalyticsCollector(): AnalyticsCollector {
  if (!collectorInstance) {
    const graphqlUrl =
      process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql";
    collectorInstance = new AnalyticsCollector(graphqlUrl);
  }
  return collectorInstance;
}

export function setAnalyticsCollectorAuth(token: string): void {
  const graphqlUrl =
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql";
  collectorInstance = new AnalyticsCollector(graphqlUrl, token);
}
