/**
 * Reaction Service
 *
 * Operations for message reactions including add, remove, and toggle.
 */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { logger } from "@/lib/logger";
import type { Reaction } from "@/types/message";
import type { APIResponse } from "@/types/api";

import {
  GET_MESSAGE_REACTIONS,
  GET_MESSAGE_REACTIONS_GROUPED,
  GET_MESSAGES_REACTIONS,
  CHECK_USER_REACTION,
  GET_POPULAR_REACTIONS,
  GET_USER_FREQUENT_REACTIONS,
  ADD_REACTION,
  REMOVE_REACTION,
  CLEAR_MESSAGE_REACTIONS,
  REMOVE_USER_REACTIONS,
  BULK_ADD_REACTIONS,
} from "@/graphql/reactions";

// ============================================================================
// TYPES
// ============================================================================

export interface ReactionCount {
  emoji: string;
  count: number;
  users: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  }>;
  hasReacted: boolean;
}

export interface AddReactionInput {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface RemoveReactionInput {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface ReactionServiceConfig {
  apolloClient: ApolloClient<NormalizedCacheObject>;
}

// ============================================================================
// REACTION SERVICE CLASS
// ============================================================================

export class ReactionService {
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(config: ReactionServiceConfig) {
    this.client = config.apolloClient;
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get all reactions for a message
   */
  async getMessageReactions(
    messageId: string,
  ): Promise<APIResponse<ReactionCount[]>> {
    try {
      logger.debug("ReactionService.getMessageReactions", { messageId });

      const { data, error } = await this.client.query({
        query: GET_MESSAGE_REACTIONS_GROUPED,
        variables: { messageId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const reactions = this.groupReactions(data.nchat_reactions || []);

      return {
        success: true,
        data: reactions,
      };
    } catch (error) {
      logger.error(
        "ReactionService.getMessageReactions failed",
        error as Error,
        { messageId },
      );
      return this.handleError(error);
    }
  }

  /**
   * Get reactions for multiple messages (batch)
   */
  async getMessagesReactions(
    messageIds: string[],
  ): Promise<APIResponse<Map<string, ReactionCount[]>>> {
    try {
      logger.debug("ReactionService.getMessagesReactions", {
        count: messageIds.length,
      });

      const { data, error } = await this.client.query({
        query: GET_MESSAGES_REACTIONS,
        variables: { messageIds },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      // Group reactions by message ID
      const reactionsByMessage = new Map<string, Record<string, unknown>[]>();
      for (const reaction of data.nchat_reactions || []) {
        const messageId = reaction.message_id;
        if (!reactionsByMessage.has(messageId)) {
          reactionsByMessage.set(messageId, []);
        }
        reactionsByMessage.get(messageId)!.push(reaction);
      }

      // Transform to ReactionCount format
      const result = new Map<string, ReactionCount[]>();
      for (const [messageId, reactions] of reactionsByMessage) {
        result.set(messageId, this.groupReactions(reactions));
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error(
        "ReactionService.getMessagesReactions failed",
        error as Error,
      );
      return this.handleError(error);
    }
  }

  /**
   * Check if a user has reacted with a specific emoji
   */
  async hasUserReacted(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<APIResponse<boolean>> {
    try {
      logger.debug("ReactionService.hasUserReacted", {
        messageId,
        userId,
        emoji,
      });

      const { data, error } = await this.client.query({
        query: CHECK_USER_REACTION,
        variables: { messageId, userId, emoji },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: (data.nchat_reactions?.length || 0) > 0,
      };
    } catch (error) {
      logger.error("ReactionService.hasUserReacted failed", error as Error, {
        messageId,
        userId,
        emoji,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get popular reactions in a channel
   */
  async getPopularReactions(
    channelId: string,
    limit: number = 10,
  ): Promise<APIResponse<string[]>> {
    try {
      logger.debug("ReactionService.getPopularReactions", { channelId, limit });

      const { data, error } = await this.client.query({
        query: GET_POPULAR_REACTIONS,
        variables: { channelId, limit },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const emojis = (data.nchat_reactions || []).map(
        (r: Record<string, unknown>) => r.emoji as string,
      );

      return {
        success: true,
        data: emojis,
      };
    } catch (error) {
      logger.error(
        "ReactionService.getPopularReactions failed",
        error as Error,
        { channelId },
      );
      return this.handleError(error);
    }
  }

  /**
   * Get a user's frequently used reactions
   */
  async getUserFrequentReactions(
    userId: string,
    limit: number = 10,
  ): Promise<APIResponse<string[]>> {
    try {
      logger.debug("ReactionService.getUserFrequentReactions", {
        userId,
        limit,
      });

      const { data, error } = await this.client.query({
        query: GET_USER_FREQUENT_REACTIONS,
        variables: { userId, limit },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const emojis = (data.nchat_reactions || []).map(
        (r: Record<string, unknown>) => r.emoji as string,
      );

      return {
        success: true,
        data: emojis,
      };
    } catch (error) {
      logger.error(
        "ReactionService.getUserFrequentReactions failed",
        error as Error,
        { userId },
      );
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  /**
   * Add a reaction to a message
   */
  async addReaction(
    input: AddReactionInput,
  ): Promise<APIResponse<{ added: boolean }>> {
    try {
      logger.debug("ReactionService.addReaction", {
        messageId: input.messageId,
        emoji: input.emoji,
      });

      const { errors } = await this.client.mutate({
        mutation: ADD_REACTION,
        variables: {
          messageId: input.messageId,
          userId: input.userId,
          emoji: input.emoji,
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      logger.info("ReactionService.addReaction success", {
        messageId: input.messageId,
        emoji: input.emoji,
      });

      return {
        success: true,
        data: { added: true },
      };
    } catch (error) {
      logger.error("ReactionService.addReaction failed", error as Error, {
        messageId: input.messageId,
        emoji: input.emoji,
      });
      return this.handleError(error);
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    input: RemoveReactionInput,
  ): Promise<APIResponse<{ removed: boolean }>> {
    try {
      logger.debug("ReactionService.removeReaction", {
        messageId: input.messageId,
        emoji: input.emoji,
      });

      const { errors } = await this.client.mutate({
        mutation: REMOVE_REACTION,
        variables: {
          messageId: input.messageId,
          userId: input.userId,
          emoji: input.emoji,
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      logger.info("ReactionService.removeReaction success", {
        messageId: input.messageId,
        emoji: input.emoji,
      });

      return {
        success: true,
        data: { removed: true },
      };
    } catch (error) {
      logger.error("ReactionService.removeReaction failed", error as Error, {
        messageId: input.messageId,
        emoji: input.emoji,
      });
      return this.handleError(error);
    }
  }

  /**
   * Toggle a reaction (add if not exists, remove if exists)
   */
  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<APIResponse<{ action: "added" | "removed" }>> {
    try {
      logger.debug("ReactionService.toggleReaction", {
        messageId,
        userId,
        emoji,
      });

      // Check if user has already reacted
      const hasReactedResult = await this.hasUserReacted(
        messageId,
        userId,
        emoji,
      );

      if (!hasReactedResult.success) {
        throw new Error("Failed to check existing reaction");
      }

      if (hasReactedResult.data) {
        // Remove the reaction
        const removeResult = await this.removeReaction({
          messageId,
          userId,
          emoji,
        });
        if (!removeResult.success) {
          throw new Error("Failed to remove reaction");
        }
        return {
          success: true,
          data: { action: "removed" },
        };
      } else {
        // Add the reaction
        const addResult = await this.addReaction({ messageId, userId, emoji });
        if (!addResult.success) {
          throw new Error("Failed to add reaction");
        }
        return {
          success: true,
          data: { action: "added" },
        };
      }
    } catch (error) {
      logger.error("ReactionService.toggleReaction failed", error as Error, {
        messageId,
        userId,
        emoji,
      });
      return this.handleError(error);
    }
  }

  /**
   * Clear all reactions from a message (moderator action)
   */
  async clearReactions(
    messageId: string,
  ): Promise<APIResponse<{ cleared: boolean }>> {
    try {
      logger.debug("ReactionService.clearReactions", { messageId });

      const { errors } = await this.client.mutate({
        mutation: CLEAR_MESSAGE_REACTIONS,
        variables: { messageId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      logger.info("ReactionService.clearReactions success", { messageId });

      return {
        success: true,
        data: { cleared: true },
      };
    } catch (error) {
      logger.error("ReactionService.clearReactions failed", error as Error, {
        messageId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Remove all of a user's reactions from a message
   */
  async removeUserReactions(
    messageId: string,
    userId: string,
  ): Promise<APIResponse<{ removed: boolean }>> {
    try {
      logger.debug("ReactionService.removeUserReactions", {
        messageId,
        userId,
      });

      const { errors } = await this.client.mutate({
        mutation: REMOVE_USER_REACTIONS,
        variables: { messageId, userId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return {
        success: true,
        data: { removed: true },
      };
    } catch (error) {
      logger.error(
        "ReactionService.removeUserReactions failed",
        error as Error,
        {
          messageId,
          userId,
        },
      );
      return this.handleError(error);
    }
  }

  /**
   * Bulk add reactions (for importing/syncing)
   */
  async bulkAddReactions(
    reactions: Array<{ messageId: string; userId: string; emoji: string }>,
  ): Promise<APIResponse<{ addedCount: number }>> {
    try {
      logger.debug("ReactionService.bulkAddReactions", {
        count: reactions.length,
      });

      const formattedReactions = reactions.map((r) => ({
        message_id: r.messageId,
        user_id: r.userId,
        emoji: r.emoji,
      }));

      const { data, errors } = await this.client.mutate({
        mutation: BULK_ADD_REACTIONS,
        variables: { reactions: formattedReactions },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return {
        success: true,
        data: { addedCount: data.insert_nchat_reactions.affected_rows },
      };
    } catch (error) {
      logger.error("ReactionService.bulkAddReactions failed", error as Error);
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Group raw reaction data into ReactionCount format
   */
  private groupReactions(
    reactions: Record<string, unknown>[],
    currentUserId?: string,
  ): ReactionCount[] {
    const grouped = new Map<
      string,
      { emoji: string; users: ReactionCount["users"]; userIds: Set<string> }
    >();

    for (const r of reactions) {
      const emoji = r.emoji as string;
      const user = r.user as Record<string, unknown>;
      const userId = r.user_id as string;

      const userInfo = {
        id: user?.id as string,
        username: user?.username as string,
        displayName:
          (user?.display_name as string) || (user?.username as string),
        avatarUrl: user?.avatar_url as string | undefined,
      };

      if (grouped.has(emoji)) {
        const group = grouped.get(emoji)!;
        if (!group.userIds.has(userId)) {
          group.users.push(userInfo);
          group.userIds.add(userId);
        }
      } else {
        grouped.set(emoji, {
          emoji,
          users: [userInfo],
          userIds: new Set([userId]),
        });
      }
    }

    return Array.from(grouped.values()).map(({ emoji, users, userIds }) => ({
      emoji,
      count: users.length,
      users,
      hasReacted: currentUserId ? userIds.has(currentUserId) : false,
    }));
  }

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

let reactionServiceInstance: ReactionService | null = null;

/**
 * Get or create the reaction service singleton
 */
export function getReactionService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): ReactionService {
  if (!reactionServiceInstance) {
    reactionServiceInstance = new ReactionService({ apolloClient });
  }
  return reactionServiceInstance;
}

/**
 * Create a new reaction service instance
 */
export function createReactionService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): ReactionService {
  return new ReactionService({ apolloClient });
}

export default ReactionService;
