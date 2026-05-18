/**
 * Mention Service
 *
 * Parse, resolve, and notify for message mentions.
 * Supports user mentions (@user), channel mentions (#channel), and special mentions (@everyone, @here).
 */

import { ApolloClient, NormalizedCacheObject, gql } from "@apollo/client";
import { logger } from "@/lib/logger";
import type { MessageMention, MentionType } from "@/types/message";
import type { APIResponse } from "@/types/api";

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

const GET_USERS_BY_USERNAME = gql`
  query GetUsersByUsername($usernames: [String!]!) {
    nchat_users(where: { username: { _in: $usernames } }) {
      id
      username
      display_name
      avatar_url
    }
  }
`;

const GET_CHANNELS_BY_SLUG = gql`
  query GetChannelsBySlug($slugs: [String!]!, $workspaceId: uuid) {
    nchat_channels(
      where: { slug: { _in: $slugs }, workspace_id: { _eq: $workspaceId } }
    ) {
      id
      name
      slug
      type
    }
  }
`;

const GET_CHANNEL_MEMBERS = gql`
  query GetChannelMembers($channelId: uuid!) {
    nchat_channel_members(where: { channel_id: { _eq: $channelId } }) {
      user_id
      user {
        id
        username
        display_name
      }
    }
  }
`;

const GET_ONLINE_CHANNEL_MEMBERS = gql`
  query GetOnlineChannelMembers($channelId: uuid!) {
    nchat_channel_members(
      where: {
        channel_id: { _eq: $channelId }
        user: { presence: { status: { _in: ["online", "away", "dnd"] } } }
      }
    ) {
      user_id
      user {
        id
        username
        display_name
      }
    }
  }
`;

const CREATE_MENTION_NOTIFICATION = gql`
  mutation CreateMentionNotification(
    $userId: uuid!
    $actorId: uuid!
    $channelId: uuid!
    $messageId: uuid!
    $title: String!
    $body: String!
  ) {
    insert_nchat_notifications_one(
      object: {
        user_id: $userId
        actor_id: $actorId
        channel_id: $channelId
        message_id: $messageId
        type: "mention"
        title: $title
        body: $body
      }
    ) {
      id
      user_id
      type
      created_at
    }
  }
`;

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedMention {
  type: MentionType;
  raw: string;
  value: string;
  startIndex: number;
  endIndex: number;
}

export interface ResolvedMention extends ParsedMention {
  id?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface MentionNotificationInput {
  messageId: string;
  channelId: string;
  actorId: string;
  actorName: string;
  messagePreview: string;
}

export interface MentionServiceConfig {
  apolloClient: ApolloClient<NormalizedCacheObject>;
}

// ============================================================================
// MENTION PATTERNS
// ============================================================================

// Pattern for @username mentions
const USER_MENTION_PATTERN = /@([a-zA-Z0-9_-]+)/g;

// Pattern for #channel mentions
const CHANNEL_MENTION_PATTERN = /#([a-zA-Z0-9_-]+)/g;

// Pattern for @everyone and @here
const SPECIAL_MENTION_PATTERN = /@(everyone|here)\b/gi;

// ============================================================================
// MENTION SERVICE CLASS
// ============================================================================

export class MentionService {
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(config: MentionServiceConfig) {
    this.client = config.apolloClient;
  }

  // ==========================================================================
  // PARSING
  // ==========================================================================

  /**
   * Parse all mentions from a message content
   */
  parseMentions(content: string): ParsedMention[] {
    const mentions: ParsedMention[] = [];

    // Parse user mentions (@username)
    let match: RegExpExecArray | null;
    const userPattern = new RegExp(USER_MENTION_PATTERN.source, "g");
    while ((match = userPattern.exec(content)) !== null) {
      mentions.push({
        type: "user",
        raw: match[0],
        value: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // Parse channel mentions (#channel)
    const channelPattern = new RegExp(CHANNEL_MENTION_PATTERN.source, "g");
    while ((match = channelPattern.exec(content)) !== null) {
      mentions.push({
        type: "channel",
        raw: match[0],
        value: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // Parse special mentions (@everyone, @here)
    const specialPattern = new RegExp(SPECIAL_MENTION_PATTERN.source, "gi");
    while ((match = specialPattern.exec(content)) !== null) {
      const mentionType = match[1].toLowerCase() as "everyone" | "here";
      mentions.push({
        type: mentionType,
        raw: match[0],
        value: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // Sort by position
    mentions.sort((a, b) => a.startIndex - b.startIndex);

    return mentions;
  }

  /**
   * Check if content contains any mentions
   */
  hasMentions(content: string): boolean {
    return (
      USER_MENTION_PATTERN.test(content) ||
      CHANNEL_MENTION_PATTERN.test(content) ||
      SPECIAL_MENTION_PATTERN.test(content)
    );
  }

  /**
   * Check if content mentions @everyone
   */
  mentionsEveryone(content: string): boolean {
    return /@everyone\b/i.test(content);
  }

  /**
   * Check if content mentions @here
   */
  mentionsHere(content: string): boolean {
    return /@here\b/i.test(content);
  }

  /**
   * Extract user IDs from parsed mentions
   */
  extractUserMentions(mentions: ParsedMention[]): string[] {
    return mentions.filter((m) => m.type === "user").map((m) => m.value);
  }

  /**
   * Extract channel slugs from parsed mentions
   */
  extractChannelMentions(mentions: ParsedMention[]): string[] {
    return mentions.filter((m) => m.type === "channel").map((m) => m.value);
  }

  // ==========================================================================
  // RESOLUTION
  // ==========================================================================

  /**
   * Resolve mentions to actual users and channels
   */
  async resolveMentions(
    mentions: ParsedMention[],
    workspaceId?: string,
  ): Promise<APIResponse<ResolvedMention[]>> {
    try {
      logger.debug("MentionService.resolveMentions", {
        mentionCount: mentions.length,
      });

      const usernames = this.extractUserMentions(mentions);
      const channelSlugs = this.extractChannelMentions(mentions);

      // Fetch users and channels in parallel
      const [usersResult, channelsResult] = await Promise.all([
        usernames.length > 0
          ? this.client.query({
              query: GET_USERS_BY_USERNAME,
              variables: { usernames },
              fetchPolicy: "network-only",
            })
          : { data: { nchat_users: [] } },
        channelSlugs.length > 0
          ? this.client.query({
              query: GET_CHANNELS_BY_SLUG,
              variables: { slugs: channelSlugs, workspaceId },
              fetchPolicy: "network-only",
            })
          : { data: { nchat_channels: [] } },
      ]);

      // Create lookup maps
      const userMap = new Map<string, Record<string, unknown>>();
      for (const user of usersResult.data.nchat_users || []) {
        userMap.set(user.username.toLowerCase(), user);
      }

      const channelMap = new Map<string, Record<string, unknown>>();
      for (const channel of channelsResult.data.nchat_channels || []) {
        channelMap.set(channel.slug.toLowerCase(), channel);
      }

      // Resolve mentions
      const resolved: ResolvedMention[] = mentions.map((mention) => {
        if (mention.type === "user") {
          const user = userMap.get(mention.value.toLowerCase());
          return {
            ...mention,
            id: user?.id as string | undefined,
            displayName: user?.display_name as string | undefined,
            avatarUrl: user?.avatar_url as string | undefined,
          };
        } else if (mention.type === "channel") {
          const channel = channelMap.get(mention.value.toLowerCase());
          return {
            ...mention,
            id: channel?.id as string | undefined,
            displayName: channel?.name as string | undefined,
          };
        } else {
          // @everyone or @here
          return mention;
        }
      });

      return {
        success: true,
        data: resolved,
      };
    } catch (error) {
      logger.error("MentionService.resolveMentions failed", error as Error);
      return this.handleError(error);
    }
  }

  /**
   * Get user IDs for @everyone in a channel
   */
  async getEveryoneUserIds(channelId: string): Promise<APIResponse<string[]>> {
    try {
      logger.debug("MentionService.getEveryoneUserIds", { channelId });

      const { data, error } = await this.client.query({
        query: GET_CHANNEL_MEMBERS,
        variables: { channelId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const userIds = (data.nchat_channel_members || []).map(
        (m: Record<string, unknown>) => m.user_id as string,
      );

      return {
        success: true,
        data: userIds,
      };
    } catch (error) {
      logger.error("MentionService.getEveryoneUserIds failed", error as Error, {
        channelId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get user IDs for @here (online users) in a channel
   */
  async getHereUserIds(channelId: string): Promise<APIResponse<string[]>> {
    try {
      logger.debug("MentionService.getHereUserIds", { channelId });

      const { data, error } = await this.client.query({
        query: GET_ONLINE_CHANNEL_MEMBERS,
        variables: { channelId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const userIds = (data.nchat_channel_members || []).map(
        (m: Record<string, unknown>) => m.user_id as string,
      );

      return {
        success: true,
        data: userIds,
      };
    } catch (error) {
      logger.error("MentionService.getHereUserIds failed", error as Error, {
        channelId,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  /**
   * Send notifications for mentions in a message
   */
  async notifyMentionedUsers(
    content: string,
    input: MentionNotificationInput,
  ): Promise<APIResponse<{ notifiedCount: number }>> {
    try {
      logger.debug("MentionService.notifyMentionedUsers", {
        messageId: input.messageId,
        channelId: input.channelId,
      });

      const mentions = this.parseMentions(content);
      const resolved = await this.resolveMentions(mentions);

      if (!resolved.success || !resolved.data) {
        throw new Error("Failed to resolve mentions");
      }

      // Collect user IDs to notify
      const userIdsToNotify = new Set<string>();

      // Add directly mentioned users
      for (const mention of resolved.data) {
        if (mention.type === "user" && mention.id) {
          userIdsToNotify.add(mention.id);
        }
      }

      // Handle @everyone
      if (this.mentionsEveryone(content)) {
        const everyoneResult = await this.getEveryoneUserIds(input.channelId);
        if (everyoneResult.success && everyoneResult.data) {
          for (const userId of everyoneResult.data) {
            userIdsToNotify.add(userId);
          }
        }
      }

      // Handle @here
      if (this.mentionsHere(content)) {
        const hereResult = await this.getHereUserIds(input.channelId);
        if (hereResult.success && hereResult.data) {
          for (const userId of hereResult.data) {
            userIdsToNotify.add(userId);
          }
        }
      }

      // Remove the actor from notifications (don't notify yourself)
      userIdsToNotify.delete(input.actorId);

      // Create notifications
      let notifiedCount = 0;
      for (const userId of userIdsToNotify) {
        try {
          await this.client.mutate({
            mutation: CREATE_MENTION_NOTIFICATION,
            variables: {
              userId,
              actorId: input.actorId,
              channelId: input.channelId,
              messageId: input.messageId,
              title: `${input.actorName} mentioned you`,
              body: input.messagePreview.substring(0, 100),
            },
          });
          notifiedCount++;
        } catch (notifyError) {
          logger.warn("Failed to create mention notification", {
            userId,
            messageId: input.messageId,
          });
        }
      }

      logger.info("MentionService.notifyMentionedUsers success", {
        messageId: input.messageId,
        notifiedCount,
      });

      return {
        success: true,
        data: { notifiedCount },
      };
    } catch (error) {
      logger.error(
        "MentionService.notifyMentionedUsers failed",
        error as Error,
        {
          messageId: input.messageId,
        },
      );
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // FORMATTING
  // ==========================================================================

  /**
   * Convert message content to HTML with highlighted mentions
   */
  formatMentionsAsHtml(content: string, mentions: ResolvedMention[]): string {
    if (mentions.length === 0) {
      return content;
    }

    let result = "";
    let lastIndex = 0;

    for (const mention of mentions) {
      // Add text before the mention
      result += this.escapeHtml(
        content.substring(lastIndex, mention.startIndex),
      );

      // Add the formatted mention
      if (mention.type === "user") {
        if (mention.id) {
          result += `<span class="mention mention-user" data-user-id="${mention.id}">@${mention.displayName || mention.value}</span>`;
        } else {
          result += `<span class="mention mention-unresolved">@${mention.value}</span>`;
        }
      } else if (mention.type === "channel") {
        if (mention.id) {
          result += `<a class="mention mention-channel" href="/chat/${mention.id}" data-channel-id="${mention.id}">#${mention.displayName || mention.value}</a>`;
        } else {
          result += `<span class="mention mention-unresolved">#${mention.value}</span>`;
        }
      } else {
        // @everyone or @here
        result += `<span class="mention mention-special">@${mention.value}</span>`;
      }

      lastIndex = mention.endIndex;
    }

    // Add remaining text
    result += this.escapeHtml(content.substring(lastIndex));

    return result;
  }

  /**
   * Convert HTML mentions back to plain text
   */
  stripMentionHtml(html: string): string {
    return html
      .replace(/<span class="mention[^"]*"[^>]*>([^<]+)<\/span>/g, "$1")
      .replace(/<a class="mention[^"]*"[^>]*>([^<]+)<\/a>/g, "$1");
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Handle errors
   */
  private handleError<T>(error: unknown): APIResponse<T> {
    const err = error as Error;

    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        status: 500,
        message: err.message || "An error occurred",
      },
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let mentionServiceInstance: MentionService | null = null;

/**
 * Get or create the mention service singleton
 */
export function getMentionService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): MentionService {
  if (!mentionServiceInstance) {
    mentionServiceInstance = new MentionService({ apolloClient });
  }
  return mentionServiceInstance;
}

/**
 * Create a new mention service instance
 */
export function createMentionService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): MentionService {
  return new MentionService({ apolloClient });
}

export default MentionService;
