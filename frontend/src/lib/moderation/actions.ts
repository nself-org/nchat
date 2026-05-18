/**
 * Moderation Actions
 * Handles all moderation actions with audit trail
 */

import type { ApolloClient } from "@apollo/client";
import { gql } from "@apollo/client";

import { logger } from "@/lib/logger";

export type ModerationActionType =
  | "flag"
  | "hide"
  | "delete"
  | "warn"
  | "mute"
  | "unmute"
  | "ban"
  | "unban"
  | "shadowban"
  | "approve"
  | "reject"
  | "edit"
  | "restore";

export interface ModerationAction {
  id: string;
  actionType: ModerationActionType;
  targetType: "message" | "user" | "channel" | "file" | "profile";
  targetId: string;
  targetUserId: string;
  moderatorId: string;
  moderatorRole: string;
  reason: string;
  isAutomated: boolean;
  automationType?: "ai" | "rule_based" | "manual";
  duration?: number; // Duration in minutes for temporary actions
  expiresAt?: Date;
  metadata?: Record<string, any>;
  reversible: boolean;
  reversedBy?: string;
  reversedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionResult {
  success: boolean;
  actionId?: string;
  error?: string;
  affectedItems?: string[];
}

export interface BulkActionResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  results: ActionResult[];
  errors: string[];
}

export interface ActionAuditLog {
  actionId: string;
  action: ModerationAction;
  before?: any;
  after?: any;
  impact: {
    usersAffected: number;
    messagesAffected: number;
    channelsAffected: number;
  };
}

// GraphQL mutations
const CREATE_ACTION = gql`
  mutation CreateModerationAction($input: ModerationActionInput!) {
    insert_nchat_moderation_actions_one(object: $input) {
      id
      action_type
      created_at
    }
  }
`;

const UPDATE_MESSAGE_VISIBILITY = gql`
  mutation UpdateMessageVisibility(
    $messageId: uuid!
    $isHidden: Boolean!
    $hiddenReason: String
  ) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { is_hidden: $isHidden, hidden_reason: $hiddenReason }
    ) {
      id
      is_hidden
    }
  }
`;

const DELETE_MESSAGE = gql`
  mutation DeleteMessage($messageId: uuid!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { is_deleted: true, deleted_at: "now()" }
    ) {
      id
      is_deleted
    }
  }
`;

const MUTE_USER = gql`
  mutation MuteUser($userId: uuid!, $mutedUntil: timestamptz, $reason: String) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { is_muted: true, muted_until: $mutedUntil, mute_reason: $reason }
    ) {
      id
      is_muted
      muted_until
    }
  }
`;

const UNMUTE_USER = gql`
  mutation UnmuteUser($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { is_muted: false, muted_until: null, mute_reason: null }
    ) {
      id
      is_muted
    }
  }
`;

const BAN_USER = gql`
  mutation BanUser($userId: uuid!, $bannedUntil: timestamptz, $reason: String) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { is_banned: true, banned_until: $bannedUntil, ban_reason: $reason }
    ) {
      id
      is_banned
      banned_until
    }
  }
`;

const UNBAN_USER = gql`
  mutation UnbanUser($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { is_banned: false, banned_until: null, ban_reason: null }
    ) {
      id
      is_banned
    }
  }
`;

const WARN_USER = gql`
  mutation WarnUser($userId: uuid!, $reason: String!) {
    insert_nchat_user_warnings_one(
      object: { user_id: $userId, reason: $reason }
    ) {
      id
      created_at
    }
  }
`;

const GET_USER_WARNINGS = gql`
  query GetUserWarnings($userId: uuid!) {
    nchat_user_warnings(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
    ) {
      id
      reason
      created_at
      moderator_id
    }
  }
`;

export class ModerationActions {
  private apolloClient: ApolloClient<any>;
  private auditLog: ActionAuditLog[] = [];

  constructor(apolloClient: ApolloClient<any>) {
    this.apolloClient = apolloClient;
  }

  /**
   * Flag content for review
   */
  async flagContent(
    targetType: ModerationAction["targetType"],
    targetId: string,
    targetUserId: string,
    moderatorId: string,
    reason: string,
    isAutomated: boolean = false,
  ): Promise<ActionResult> {
    try {
      const result = await this.createAction({
        actionType: "flag",
        targetType,
        targetId,
        targetUserId,
        moderatorId,
        moderatorRole: "system",
        reason,
        isAutomated,
        automationType: isAutomated ? "ai" : "manual",
        reversible: true,
      });

      return {
        success: true,
        actionId: result.data?.insert_nchat_moderation_actions_one?.id,
      };
    } catch (error) {
      logger.error("Flag content error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Hide content
   */
  async hideContent(
    targetType: ModerationAction["targetType"],
    targetId: string,
    targetUserId: string,
    moderatorId: string,
    reason: string,
    isAutomated: boolean = false,
  ): Promise<ActionResult> {
    try {
      // Create action record
      const actionResult = await this.createAction({
        actionType: "hide",
        targetType,
        targetId,
        targetUserId,
        moderatorId,
        moderatorRole: "system",
        reason,
        isAutomated,
        automationType: isAutomated ? "ai" : "manual",
        reversible: true,
      });

      // Update content visibility
      if (targetType === "message") {
        await this.apolloClient.mutate({
          mutation: UPDATE_MESSAGE_VISIBILITY,
          variables: {
            messageId: targetId,
            isHidden: true,
            hiddenReason: reason,
          },
        });
      }

      return {
        success: true,
        actionId: actionResult.data?.insert_nchat_moderation_actions_one?.id,
        affectedItems: [targetId],
      };
    } catch (error) {
      logger.error("Hide content error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete content
   */
  async deleteContent(
    targetType: ModerationAction["targetType"],
    targetId: string,
    targetUserId: string,
    moderatorId: string,
    reason: string,
    isAutomated: boolean = false,
  ): Promise<ActionResult> {
    try {
      // Create action record
      const actionResult = await this.createAction({
        actionType: "delete",
        targetType,
        targetId,
        targetUserId,
        moderatorId,
        moderatorRole: "system",
        reason,
        isAutomated,
        automationType: isAutomated ? "ai" : "manual",
        reversible: false, // Deletion is permanent
      });

      // Delete content
      if (targetType === "message") {
        await this.apolloClient.mutate({
          mutation: DELETE_MESSAGE,
          variables: { messageId: targetId },
        });
      }

      return {
        success: true,
        actionId: actionResult.data?.insert_nchat_moderation_actions_one?.id,
        affectedItems: [targetId],
      };
    } catch (error) {
      logger.error("Delete content error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Warn user
   */
  async warnUser(
    userId: string,
    moderatorId: string,
    reason: string,
    isAutomated: boolean = false,
  ): Promise<ActionResult> {
    try {
      // Create warning
      await this.apolloClient.mutate({
        mutation: WARN_USER,
        variables: { userId, reason },
      });

      // Create action record
      const actionResult = await this.createAction({
        actionType: "warn",
        targetType: "user",
        targetId: userId,
        targetUserId: userId,
        moderatorId,
        moderatorRole: "system",
        reason,
        isAutomated,
        automationType: isAutomated ? "ai" : "manual",
        reversible: false,
      });

      return {
        success: true,
        actionId: actionResult.data?.insert_nchat_moderation_actions_one?.id,
      };
    } catch (error) {
      logger.error("Warn user error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Mute user
   */
  async muteUser(
    userId: string,
    moderatorId: string,
    reason: string,
    durationMinutes?: number,
    isAutomated: boolean = false,
  ): Promise<ActionResult> {
    try {
      const expiresAt = durationMinutes
        ? new Date(Date.now() + durationMinutes * 60 * 1000)
        : undefined;

      // Mute user
      await this.apolloClient.mutate({
        mutation: MUTE_USER,
        variables: {
          userId,
          mutedUntil: expiresAt?.toISOString(),
          reason,
        },
      });

      // Create action record
      const actionResult = await this.createAction({
        actionType: "mute",
        targetType: "user",
        targetId: userId,
        targetUserId: userId,
        moderatorId,
        moderatorRole: "system",
        reason,
        isAutomated,
        automationType: isAutomated ? "ai" : "manual",
        duration: durationMinutes,
        expiresAt,
        reversible: true,
      });

      return {
        success: true,
        actionId: actionResult.data?.insert_nchat_moderation_actions_one?.id,
      };
    } catch (error) {
      logger.error("Mute user error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Unmute user
   */
  async unmuteUser(
    userId: string,
    moderatorId: string,
    reason: string,
  ): Promise<ActionResult> {
    try {
      // Unmute user
      await this.apolloClient.mutate({
        mutation: UNMUTE_USER,
        variables: { userId },
      });

      // Create action record
      const actionResult = await this.createAction({
        actionType: "unmute",
        targetType: "user",
        targetId: userId,
        targetUserId: userId,
        moderatorId,
        moderatorRole: "system",
        reason,
        isAutomated: false,
        reversible: false,
      });

      return {
        success: true,
        actionId: actionResult.data?.insert_nchat_moderation_actions_one?.id,
      };
    } catch (error) {
      logger.error("Unmute user error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Ban user
   */
  async banUser(
    userId: string,
    moderatorId: string,
    reason: string,
    durationMinutes?: number,
    isAutomated: boolean = false,
  ): Promise<ActionResult> {
    try {
      const expiresAt = durationMinutes
        ? new Date(Date.now() + durationMinutes * 60 * 1000)
        : undefined;

      // Ban user
      await this.apolloClient.mutate({
        mutation: BAN_USER,
        variables: {
          userId,
          bannedUntil: expiresAt?.toISOString(),
          reason,
        },
      });

      // Create action record
      const actionResult = await this.createAction({
        actionType: "ban",
        targetType: "user",
        targetId: userId,
        targetUserId: userId,
        moderatorId,
        moderatorRole: "system",
        reason,
        isAutomated,
        automationType: isAutomated ? "ai" : "manual",
        duration: durationMinutes,
        expiresAt,
        reversible: true,
      });

      return {
        success: true,
        actionId: actionResult.data?.insert_nchat_moderation_actions_one?.id,
      };
    } catch (error) {
      logger.error("Ban user error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Unban user
   */
  async unbanUser(
    userId: string,
    moderatorId: string,
    reason: string,
  ): Promise<ActionResult> {
    try {
      // Unban user
      await this.apolloClient.mutate({
        mutation: UNBAN_USER,
        variables: { userId },
      });

      // Create action record
      const actionResult = await this.createAction({
        actionType: "unban",
        targetType: "user",
        targetId: userId,
        targetUserId: userId,
        moderatorId,
        moderatorRole: "system",
        reason,
        isAutomated: false,
        reversible: false,
      });

      return {
        success: true,
        actionId: actionResult.data?.insert_nchat_moderation_actions_one?.id,
      };
    } catch (error) {
      logger.error("Unban user error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Approve content (remove from moderation queue)
   */
  async approveContent(
    targetType: ModerationAction["targetType"],
    targetId: string,
    targetUserId: string,
    moderatorId: string,
    reason: string,
  ): Promise<ActionResult> {
    try {
      // Create action record
      const actionResult = await this.createAction({
        actionType: "approve",
        targetType,
        targetId,
        targetUserId,
        moderatorId,
        moderatorRole: "system",
        reason,
        isAutomated: false,
        reversible: false,
      });

      // If content was hidden, restore it
      if (targetType === "message") {
        await this.apolloClient.mutate({
          mutation: UPDATE_MESSAGE_VISIBILITY,
          variables: {
            messageId: targetId,
            isHidden: false,
            hiddenReason: null,
          },
        });
      }

      return {
        success: true,
        actionId: actionResult.data?.insert_nchat_moderation_actions_one?.id,
      };
    } catch (error) {
      logger.error("Approve content error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Bulk action on multiple items
   */
  async bulkAction(
    actionType: ModerationActionType,
    targets: Array<{
      targetType: ModerationAction["targetType"];
      targetId: string;
      targetUserId: string;
    }>,
    moderatorId: string,
    reason: string,
    options?: {
      duration?: number;
      isAutomated?: boolean;
    },
  ): Promise<BulkActionResult> {
    const results: ActionResult[] = [];
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const target of targets) {
      try {
        let result: ActionResult;

        switch (actionType) {
          case "flag":
            result = await this.flagContent(
              target.targetType,
              target.targetId,
              target.targetUserId,
              moderatorId,
              reason,
              options?.isAutomated,
            );
            break;
          case "hide":
            result = await this.hideContent(
              target.targetType,
              target.targetId,
              target.targetUserId,
              moderatorId,
              reason,
              options?.isAutomated,
            );
            break;
          case "delete":
            result = await this.deleteContent(
              target.targetType,
              target.targetId,
              target.targetUserId,
              moderatorId,
              reason,
              options?.isAutomated,
            );
            break;
          case "mute":
            result = await this.muteUser(
              target.targetUserId,
              moderatorId,
              reason,
              options?.duration,
              options?.isAutomated,
            );
            break;
          case "ban":
            result = await this.banUser(
              target.targetUserId,
              moderatorId,
              reason,
              options?.duration,
              options?.isAutomated,
            );
            break;
          default:
            result = {
              success: false,
              error: `Unsupported bulk action: ${actionType}`,
            };
        }

        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          if (result.error) {
            errors.push(result.error);
          }
        }
      } catch (error) {
        failureCount++;
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(errorMsg);
        results.push({ success: false, error: errorMsg });
      }
    }

    return {
      success: failureCount === 0,
      successCount,
      failureCount,
      results,
      errors,
    };
  }

  /**
   * Get user warnings
   */
  async getUserWarnings(userId: string): Promise<any[]> {
    const result = await this.apolloClient.query({
      query: GET_USER_WARNINGS,
      variables: { userId },
      fetchPolicy: "network-only",
    });

    return result.data?.nchat_user_warnings || [];
  }

  /**
   * Get action audit log
   */
  getAuditLog(): ActionAuditLog[] {
    return [...this.auditLog];
  }

  /**
   * Create action record
   */
  private async createAction(action: Partial<ModerationAction>): Promise<any> {
    const input = {
      action_type: action.actionType,
      target_type: action.targetType,
      target_id: action.targetId,
      target_user_id: action.targetUserId,
      moderator_id: action.moderatorId,
      moderator_role: action.moderatorRole,
      reason: action.reason,
      is_automated: action.isAutomated || false,
      automation_type: action.automationType || "manual",
      duration: action.duration,
      expires_at: action.expiresAt?.toISOString(),
      reversible: action.reversible !== false,
      metadata: action.metadata || {},
    };

    return this.apolloClient.mutate({
      mutation: CREATE_ACTION,
      variables: { input },
    });
  }
}
