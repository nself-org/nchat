/**
 * Moderation Queue Manager
 * Manages flagged content and moderation actions
 */

import { ApolloClient } from "@apollo/client";
import { gql } from "@apollo/client";
import type { ModerationResult } from "./moderation-service";

export interface QueueItem {
  id: string;
  contentType: "message" | "image" | "file" | "profile" | "channel_name";
  contentId: string;
  contentText?: string;
  contentUrl?: string;
  channelId?: string;
  userId: string;
  userDisplayName?: string;
  status: "pending" | "reviewing" | "approved" | "rejected" | "auto_resolved";
  priority: "low" | "medium" | "high" | "critical";
  aiFlags: string[];
  toxicScore: number;
  nsfwScore: number;
  spamScore: number;
  profanityDetected: boolean;
  profanityWords?: string[];
  modelVersion?: string;
  confidenceScore: number;
  autoAction?: "none" | "flagged" | "hidden" | "warned" | "muted" | "deleted";
  autoActionReason?: string;
  isHidden: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  moderatorDecision?: "approve" | "delete" | "warn" | "ban" | "edit";
  moderatorNotes?: string;
  appealStatus?: "none" | "appealed" | "appeal_approved" | "appeal_rejected";
  appealText?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationAction {
  id: string;
  queueId?: string;
  actionType:
    | "flagged"
    | "approved"
    | "rejected"
    | "deleted"
    | "edited"
    | "warned"
    | "muted"
    | "banned"
    | "appealed";
  actionReason?: string;
  isAutomated: boolean;
  automationType?: "ai" | "rule_based" | "manual";
  moderatorId?: string;
  moderatorRole?: string;
  targetUserId: string;
  actionDuration?: string;
  actionExpiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// GraphQL queries and mutations
const ADD_TO_QUEUE = gql`
  mutation AddToModerationQueue($input: ModerationQueueInput!) {
    insert_nchat_moderation_queue_one(object: $input) {
      id
      status
      created_at
    }
  }
`;

const GET_QUEUE_ITEMS = gql`
  query GetModerationQueue(
    $status: String
    $priority: String
    $limit: Int
    $offset: Int
  ) {
    nchat_moderation_queue(
      where: { status: { _eq: $status }, priority: { _eq: $priority } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      content_type
      content_id
      content_text
      content_url
      channel_id
      user_id
      user_display_name
      status
      priority
      ai_flags
      toxic_score
      nsfw_score
      spam_score
      profanity_detected
      profanity_words
      model_version
      confidence_score
      auto_action
      auto_action_reason
      is_hidden
      reviewed_by
      reviewed_at
      moderator_decision
      moderator_notes
      appeal_status
      appeal_text
      created_at
      updated_at
    }
  }
`;

const UPDATE_QUEUE_ITEM = gql`
  mutation UpdateQueueItem($id: uuid!, $updates: ModerationQueueSetInput!) {
    update_nchat_moderation_queue_by_pk(
      pk_columns: { id: $id }
      _set: $updates
    ) {
      id
      status
      updated_at
    }
  }
`;

const ADD_MODERATION_ACTION = gql`
  mutation AddModerationAction($input: ModerationActionInput!) {
    insert_nchat_moderation_actions_one(object: $input) {
      id
      created_at
    }
  }
`;

const GET_USER_HISTORY = gql`
  query GetUserModerationHistory($userId: uuid!) {
    nchat_user_moderation_history_by_pk(user_id: $userId) {
      user_id
      total_violations
      toxic_violations
      nsfw_violations
      spam_violations
      profanity_violations
      warnings_received
      mutes_received
      bans_received
      trust_score
      is_muted
      muted_until
      is_banned
      banned_until
      first_violation_at
      last_violation_at
    }
  }
`;

export class ModerationQueue {
  private apolloClient: ApolloClient<any>;
  private modelVersion = "v1.0.0";

  constructor(apolloClient: ApolloClient<any>) {
    this.apolloClient = apolloClient;
  }

  /**
   * Add item to moderation queue
   */
  async addToQueue(
    contentType: QueueItem["contentType"],
    contentId: string,
    userId: string,
    moderationResult: ModerationResult,
    metadata?: {
      contentText?: string;
      contentUrl?: string;
      channelId?: string;
      userDisplayName?: string;
    },
  ): Promise<string> {
    const input = {
      content_type: contentType,
      content_id: contentId,
      content_text: metadata?.contentText,
      content_url: metadata?.contentUrl,
      channel_id: metadata?.channelId,
      user_id: userId,
      user_display_name: metadata?.userDisplayName,
      status: "pending",
      priority: moderationResult.priority,
      ai_flags: moderationResult.detectedIssues,
      toxic_score: moderationResult.toxicScore,
      nsfw_score: moderationResult.nsfwScore,
      spam_score: moderationResult.spamScore,
      profanity_detected:
        moderationResult.profanityResult?.hasProfanity || false,
      profanity_words: moderationResult.profanityResult?.detectedWords || [],
      model_version: this.modelVersion,
      confidence_score: moderationResult.confidence,
      auto_action: moderationResult.autoAction,
      auto_action_reason: moderationResult.autoActionReason,
      is_hidden: moderationResult.shouldHide,
    };

    const result = await this.apolloClient.mutate({
      mutation: ADD_TO_QUEUE,
      variables: { input },
    });

    const queueId = result.data?.insert_nchat_moderation_queue_one?.id;

    // Record automated action if taken
    if (moderationResult.autoAction !== "none") {
      await this.recordAction({
        queueId,
        actionType: moderationResult.autoAction as any,
        actionReason: moderationResult.autoActionReason,
        isAutomated: true,
        automationType: "ai",
        targetUserId: userId,
      });
    }

    return queueId;
  }

  /**
   * Get queue items
   */
  async getQueueItems(filters?: {
    status?: QueueItem["status"];
    priority?: QueueItem["priority"];
    limit?: number;
    offset?: number;
  }): Promise<QueueItem[]> {
    const result = await this.apolloClient.query({
      query: GET_QUEUE_ITEMS,
      variables: {
        status: filters?.status,
        priority: filters?.priority,
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      },
      fetchPolicy: "network-only",
    });

    return result.data?.nchat_moderation_queue || [];
  }

  /**
   * Update queue item status
   */
  async updateQueueItem(
    itemId: string,
    updates: {
      status?: QueueItem["status"];
      moderatorDecision?: QueueItem["moderatorDecision"];
      moderatorNotes?: string;
      reviewedBy?: string;
      appealStatus?: QueueItem["appealStatus"];
      appealText?: string;
    },
  ): Promise<void> {
    const updateData: any = { ...updates };

    if (
      updates.moderatorDecision ||
      updates.status === "approved" ||
      updates.status === "rejected"
    ) {
      updateData.reviewed_at = new Date().toISOString();
    }

    await this.apolloClient.mutate({
      mutation: UPDATE_QUEUE_ITEM,
      variables: {
        id: itemId,
        updates: updateData,
      },
    });
  }

  /**
   * Record moderation action
   */
  async recordAction(action: {
    queueId?: string;
    actionType: ModerationAction["actionType"];
    actionReason?: string;
    isAutomated: boolean;
    automationType?: ModerationAction["automationType"];
    moderatorId?: string;
    moderatorRole?: string;
    targetUserId: string;
    actionDuration?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const input = {
      queue_id: action.queueId,
      action_type: action.actionType,
      action_reason: action.actionReason,
      is_automated: action.isAutomated,
      automation_type: action.automationType || "manual",
      moderator_id: action.moderatorId,
      moderator_role: action.moderatorRole,
      target_user_id: action.targetUserId,
      action_duration: action.actionDuration,
      metadata: action.metadata || {},
    };

    const result = await this.apolloClient.mutate({
      mutation: ADD_MODERATION_ACTION,
      variables: { input },
    });

    return result.data?.insert_nchat_moderation_actions_one?.id;
  }

  /**
   * Approve content
   */
  async approveContent(
    itemId: string,
    moderatorId: string,
    notes?: string,
  ): Promise<void> {
    const item = await this.getQueueItem(itemId);

    await this.updateQueueItem(itemId, {
      status: "approved",
      moderatorDecision: "approve",
      moderatorNotes: notes,
      reviewedBy: moderatorId,
    });

    await this.recordAction({
      queueId: itemId,
      actionType: "approved",
      actionReason: notes,
      isAutomated: false,
      moderatorId,
      targetUserId: item.userId,
    });
  }

  /**
   * Reject/delete content
   */
  async rejectContent(
    itemId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<void> {
    const item = await this.getQueueItem(itemId);

    await this.updateQueueItem(itemId, {
      status: "rejected",
      moderatorDecision: "delete",
      moderatorNotes: reason,
      reviewedBy: moderatorId,
    });

    await this.recordAction({
      queueId: itemId,
      actionType: "deleted",
      actionReason: reason,
      isAutomated: false,
      moderatorId,
      targetUserId: item.userId,
    });
  }

  /**
   * Warn user
   */
  async warnUser(
    itemId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<void> {
    const item = await this.getQueueItem(itemId);

    await this.updateQueueItem(itemId, {
      status: "approved",
      moderatorDecision: "warn",
      moderatorNotes: reason,
      reviewedBy: moderatorId,
    });

    await this.recordAction({
      queueId: itemId,
      actionType: "warned",
      actionReason: reason,
      isAutomated: false,
      moderatorId,
      targetUserId: item.userId,
    });
  }

  /**
   * Submit appeal
   */
  async submitAppeal(itemId: string, appealText: string): Promise<void> {
    await this.updateQueueItem(itemId, {
      appealStatus: "appealed",
      appealText,
    });

    const item = await this.getQueueItem(itemId);

    await this.recordAction({
      queueId: itemId,
      actionType: "appealed",
      actionReason: appealText,
      isAutomated: false,
      targetUserId: item.userId,
    });
  }

  /**
   * Get user moderation history
   */
  async getUserHistory(userId: string): Promise<any> {
    const result = await this.apolloClient.query({
      query: GET_USER_HISTORY,
      variables: { userId },
      fetchPolicy: "network-only",
    });

    return result.data?.nchat_user_moderation_history_by_pk;
  }

  /**
   * Get single queue item
   */
  private async getQueueItem(itemId: string): Promise<QueueItem> {
    const GET_ITEM = gql`
      query GetQueueItem($id: uuid!) {
        nchat_moderation_queue_by_pk(id: $id) {
          id
          user_id
          content_type
          content_id
        }
      }
    `;

    const result = await this.apolloClient.query({
      query: GET_ITEM,
      variables: { id: itemId },
    });

    return result.data?.nchat_moderation_queue_by_pk;
  }
}
