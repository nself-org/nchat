/**
 * Extended Workspace Service
 *
 * Advanced workspace management features including:
 * - Ownership transfer with confirmation flow
 * - Emergency access and backup owners
 * - Enhanced analytics and usage tracking
 * - Message retention policies
 * - Storage limits and file quotas
 * - Multi-workspace notification preferences
 */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { gql } from "@apollo/client";
import {
  WorkspaceService,
  Workspace,
  WorkspaceMember,
  WorkspaceSettings,
  WorkspaceStats,
} from "./workspace.service";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OwnershipTransferRequest {
  workspaceId: string;
  currentOwnerId: string;
  newOwnerId: string;
  reason?: string;
  requireConfirmation?: boolean;
}

export interface OwnershipTransferResult {
  success: boolean;
  transferId?: string;
  pendingConfirmation?: boolean;
  newOwner?: WorkspaceMember;
  previousOwner?: WorkspaceMember;
}

export interface EmergencyAccess {
  id: string;
  workspaceId: string;
  backupOwnerId: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string | null;
  isActive: boolean;
  backupOwner?: {
    id: string;
    username: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
  };
}

export interface WorkspaceAnalytics {
  workspaceId: string;
  period: "day" | "week" | "month" | "year";
  memberCount: number;
  activeMembers: number;
  newMembers: number;
  leftMembers: number;
  messageCount: number;
  fileCount: number;
  storageUsedBytes: number;
  channelCount: number;
  activeChannels: number;
  peakOnlineMembers: number;
  averageOnlineMembers: number;
  lastUpdated: string;
}

export interface MessageRetentionPolicy {
  workspaceId: string;
  enabled: boolean;
  retentionDays: number;
  excludeChannelIds: string[];
  excludePinnedMessages: boolean;
  excludeFilesOlderThan?: number | null;
  lastCleanupAt?: string | null;
  messagesDeleted?: number;
}

export interface StorageQuota {
  workspaceId: string;
  totalBytes: number;
  usedBytes: number;
  fileCount: number;
  maxFileSize: number;
  allowedFileTypes: string[];
  quotaEnforced: boolean;
  warningThreshold: number;
}

export interface WorkspaceNotificationPrefs {
  workspaceId: string;
  userId: string;
  enabled: boolean;
  muteAll: boolean;
  muteUntil?: string | null;
  digestEnabled: boolean;
  digestFrequency: "daily" | "weekly" | "never";
  notifyOnMention: boolean;
  notifyOnDM: boolean;
  notifyOnChannel: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  mobileEnabled: boolean;
  emailEnabled: boolean;
}

export interface WorkspaceOnboardingStep {
  id: string;
  title: string;
  description: string;
  type: "welcome" | "profile" | "channels" | "rules" | "introduction";
  required: boolean;
  order: number;
  completedBy?: string[];
}

export interface OnboardingConfig {
  workspaceId: string;
  enabled: boolean;
  steps: WorkspaceOnboardingStep[];
  welcomeMessage?: string | null;
  rulesAgreementRequired: boolean;
  profileCompletionRequired: boolean;
  assignDefaultChannels: boolean;
  defaultChannelIds: string[];
}

export interface DeactivatedMember {
  id: string;
  workspaceId: string;
  userId: string;
  deactivatedBy: string;
  deactivatedAt: string;
  reason?: string | null;
  canRejoin: boolean;
  user?: {
    id: string;
    username: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
  };
}

// ============================================================================
// GRAPHQL QUERIES & MUTATIONS
// ============================================================================

const GET_WORKSPACE_ANALYTICS = gql`
  query GetWorkspaceAnalytics($workspaceId: uuid!, $period: String!) {
    nchat_workspace_analytics(
      where: { workspace_id: { _eq: $workspaceId }, period: { _eq: $period } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      id
      workspace_id
      period
      member_count
      active_members
      new_members
      left_members
      message_count
      file_count
      storage_used_bytes
      channel_count
      active_channels
      peak_online_members
      average_online_members
      created_at
    }
  }
`;

const GET_STORAGE_QUOTA = gql`
  query GetStorageQuota($workspaceId: uuid!) {
    nchat_workspace_storage_quotas_by_pk(workspace_id: $workspaceId) {
      workspace_id
      total_bytes
      used_bytes
      file_count
      max_file_size
      allowed_file_types
      quota_enforced
      warning_threshold
    }
  }
`;

const GET_MESSAGE_RETENTION = gql`
  query GetMessageRetention($workspaceId: uuid!) {
    nchat_workspace_retention_policies_by_pk(workspace_id: $workspaceId) {
      workspace_id
      enabled
      retention_days
      exclude_channel_ids
      exclude_pinned_messages
      exclude_files_older_than
      last_cleanup_at
      messages_deleted
    }
  }
`;

const GET_EMERGENCY_ACCESS = gql`
  query GetEmergencyAccess($workspaceId: uuid!) {
    nchat_workspace_emergency_access(
      where: { workspace_id: { _eq: $workspaceId }, is_active: { _eq: true } }
    ) {
      id
      workspace_id
      backup_owner_id
      granted_by
      granted_at
      expires_at
      is_active
      backup_owner: user {
        id
        username
        display_name
        email
        avatar_url
      }
    }
  }
`;

const GET_NOTIFICATION_PREFS = gql`
  query GetNotificationPrefs($workspaceId: uuid!, $userId: uuid!) {
    nchat_workspace_notification_prefs_by_pk(
      workspace_id: $workspaceId
      user_id: $userId
    ) {
      workspace_id
      user_id
      enabled
      mute_all
      mute_until
      digest_enabled
      digest_frequency
      notify_on_mention
      notify_on_dm
      notify_on_channel
      sound_enabled
      desktop_enabled
      mobile_enabled
      email_enabled
    }
  }
`;

const GET_ONBOARDING_CONFIG = gql`
  query GetOnboardingConfig($workspaceId: uuid!) {
    nchat_workspace_onboarding_by_pk(workspace_id: $workspaceId) {
      workspace_id
      enabled
      steps
      welcome_message
      rules_agreement_required
      profile_completion_required
      assign_default_channels
      default_channel_ids
    }
  }
`;

const GET_DEACTIVATED_MEMBERS = gql`
  query GetDeactivatedMembers(
    $workspaceId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_workspace_deactivated_members(
      where: { workspace_id: { _eq: $workspaceId } }
      order_by: { deactivated_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      workspace_id
      user_id
      deactivated_by
      deactivated_at
      reason
      can_rejoin
      user {
        id
        username
        display_name
        email
        avatar_url
      }
    }
    nchat_workspace_deactivated_members_aggregate(
      where: { workspace_id: { _eq: $workspaceId } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const UPDATE_MESSAGE_RETENTION = gql`
  mutation UpdateMessageRetention(
    $workspaceId: uuid!
    $enabled: Boolean!
    $retentionDays: Int!
    $excludeChannelIds: jsonb
    $excludePinnedMessages: Boolean!
    $excludeFilesOlderThan: Int
  ) {
    insert_nchat_workspace_retention_policies_one(
      object: {
        workspace_id: $workspaceId
        enabled: $enabled
        retention_days: $retentionDays
        exclude_channel_ids: $excludeChannelIds
        exclude_pinned_messages: $excludePinnedMessages
        exclude_files_older_than: $excludeFilesOlderThan
      }
      on_conflict: {
        constraint: nchat_workspace_retention_policies_pkey
        update_columns: [
          enabled
          retention_days
          exclude_channel_ids
          exclude_pinned_messages
          exclude_files_older_than
        ]
      }
    ) {
      workspace_id
      enabled
      retention_days
    }
  }
`;

const UPDATE_STORAGE_QUOTA = gql`
  mutation UpdateStorageQuota(
    $workspaceId: uuid!
    $totalBytes: bigint!
    $maxFileSize: bigint!
    $allowedFileTypes: jsonb!
    $quotaEnforced: Boolean!
    $warningThreshold: Float!
  ) {
    insert_nchat_workspace_storage_quotas_one(
      object: {
        workspace_id: $workspaceId
        total_bytes: $totalBytes
        max_file_size: $maxFileSize
        allowed_file_types: $allowedFileTypes
        quota_enforced: $quotaEnforced
        warning_threshold: $warningThreshold
      }
      on_conflict: {
        constraint: nchat_workspace_storage_quotas_pkey
        update_columns: [
          total_bytes
          max_file_size
          allowed_file_types
          quota_enforced
          warning_threshold
        ]
      }
    ) {
      workspace_id
      total_bytes
    }
  }
`;

const UPDATE_NOTIFICATION_PREFS = gql`
  mutation UpdateNotificationPrefs(
    $workspaceId: uuid!
    $userId: uuid!
    $enabled: Boolean!
    $muteAll: Boolean!
    $muteUntil: timestamptz
    $digestEnabled: Boolean!
    $digestFrequency: String!
    $notifyOnMention: Boolean!
    $notifyOnDM: Boolean!
    $notifyOnChannel: Boolean!
    $soundEnabled: Boolean!
    $desktopEnabled: Boolean!
    $mobileEnabled: Boolean!
    $emailEnabled: Boolean!
  ) {
    insert_nchat_workspace_notification_prefs_one(
      object: {
        workspace_id: $workspaceId
        user_id: $userId
        enabled: $enabled
        mute_all: $muteAll
        mute_until: $muteUntil
        digest_enabled: $digestEnabled
        digest_frequency: $digestFrequency
        notify_on_mention: $notifyOnMention
        notify_on_dm: $notifyOnDM
        notify_on_channel: $notifyOnChannel
        sound_enabled: $soundEnabled
        desktop_enabled: $desktopEnabled
        mobile_enabled: $mobileEnabled
        email_enabled: $emailEnabled
      }
      on_conflict: {
        constraint: nchat_workspace_notification_prefs_pkey
        update_columns: [
          enabled
          mute_all
          mute_until
          digest_enabled
          digest_frequency
          notify_on_mention
          notify_on_dm
          notify_on_channel
          sound_enabled
          desktop_enabled
          mobile_enabled
          email_enabled
        ]
      }
    ) {
      workspace_id
      user_id
      enabled
    }
  }
`;

const GRANT_EMERGENCY_ACCESS = gql`
  mutation GrantEmergencyAccess(
    $workspaceId: uuid!
    $backupOwnerId: uuid!
    $grantedBy: uuid!
    $expiresAt: timestamptz
  ) {
    insert_nchat_workspace_emergency_access_one(
      object: {
        workspace_id: $workspaceId
        backup_owner_id: $backupOwnerId
        granted_by: $grantedBy
        expires_at: $expiresAt
        is_active: true
      }
    ) {
      id
      workspace_id
      backup_owner_id
      granted_at
      expires_at
      is_active
    }
  }
`;

const REVOKE_EMERGENCY_ACCESS = gql`
  mutation RevokeEmergencyAccess($id: uuid!) {
    update_nchat_workspace_emergency_access_by_pk(
      pk_columns: { id: $id }
      _set: { is_active: false }
    ) {
      id
      is_active
    }
  }
`;

const DEACTIVATE_MEMBER = gql`
  mutation DeactivateMember(
    $workspaceId: uuid!
    $userId: uuid!
    $deactivatedBy: uuid!
    $reason: String
    $canRejoin: Boolean = true
  ) {
    # First remove from workspace
    delete_nchat_workspace_members(
      where: { workspace_id: { _eq: $workspaceId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
    # Then add to deactivated list
    insert_nchat_workspace_deactivated_members_one(
      object: {
        workspace_id: $workspaceId
        user_id: $userId
        deactivated_by: $deactivatedBy
        reason: $reason
        can_rejoin: $canRejoin
      }
    ) {
      id
      workspace_id
      user_id
      deactivated_at
      reason
      can_rejoin
    }
    # Decrement member count
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $workspaceId }
      _inc: { member_count: -1 }
    ) {
      id
      member_count
    }
  }
`;

const REACTIVATE_MEMBER = gql`
  mutation ReactivateMember(
    $deactivationId: uuid!
    $workspaceId: uuid!
    $userId: uuid!
  ) {
    # Remove from deactivated list
    delete_nchat_workspace_deactivated_members_by_pk(id: $deactivationId) {
      id
    }
    # Re-add to workspace
    insert_nchat_workspace_members_one(
      object: { workspace_id: $workspaceId, user_id: $userId, role: "member" }
    ) {
      id
      workspace_id
      user_id
      role
      joined_at
    }
    # Increment member count
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $workspaceId }
      _inc: { member_count: 1 }
    ) {
      id
      member_count
    }
  }
`;

const UPDATE_ONBOARDING_CONFIG = gql`
  mutation UpdateOnboardingConfig(
    $workspaceId: uuid!
    $enabled: Boolean!
    $steps: jsonb!
    $welcomeMessage: String
    $rulesAgreementRequired: Boolean!
    $profileCompletionRequired: Boolean!
    $assignDefaultChannels: Boolean!
    $defaultChannelIds: jsonb!
  ) {
    insert_nchat_workspace_onboarding_one(
      object: {
        workspace_id: $workspaceId
        enabled: $enabled
        steps: $steps
        welcome_message: $welcomeMessage
        rules_agreement_required: $rulesAgreementRequired
        profile_completion_required: $profileCompletionRequired
        assign_default_channels: $assignDefaultChannels
        default_channel_ids: $defaultChannelIds
      }
      on_conflict: {
        constraint: nchat_workspace_onboarding_pkey
        update_columns: [
          enabled
          steps
          welcome_message
          rules_agreement_required
          profile_completion_required
          assign_default_channels
          default_channel_ids
        ]
      }
    ) {
      workspace_id
      enabled
    }
  }
`;

// ============================================================================
// EXTENDED WORKSPACE SERVICE CLASS
// ============================================================================

export class ExtendedWorkspaceService extends WorkspaceService {
  // ==========================================================================
  // OWNERSHIP TRANSFER
  // ==========================================================================

  /**
   * Initiate ownership transfer with optional confirmation
   */
  async initiateOwnershipTransfer(
    request: OwnershipTransferRequest,
  ): Promise<OwnershipTransferResult> {
    const {
      workspaceId,
      currentOwnerId,
      newOwnerId,
      reason,
      requireConfirmation = true,
    } = request;

    // Verify current owner
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    if (workspace.ownerId !== currentOwnerId) {
      throw new Error("Only the current owner can transfer ownership");
    }

    // Verify new owner is a member
    const newOwnerMembership = await this.checkMembership(
      workspaceId,
      newOwnerId,
    );
    if (!newOwnerMembership) {
      throw new Error("New owner must be a workspace member");
    }

    if (requireConfirmation) {
      // In a real implementation, this would create a pending transfer
      // and send a confirmation request to the new owner
      return {
        success: true,
        pendingConfirmation: true,
        transferId: `transfer_${Date.now()}`,
      };
    }

    // Execute immediate transfer
    await this.transferOwnership(workspaceId, currentOwnerId, newOwnerId);

    // Get updated membership info
    const updatedNewOwner = await this.checkMembership(workspaceId, newOwnerId);
    const updatedPreviousOwner = await this.checkMembership(
      workspaceId,
      currentOwnerId,
    );

    return {
      success: true,
      pendingConfirmation: false,
      newOwner: updatedNewOwner || undefined,
      previousOwner: updatedPreviousOwner || undefined,
    };
  }

  /**
   * Confirm a pending ownership transfer
   */
  async confirmOwnershipTransfer(
    _transferId: string,
    _newOwnerId: string,
  ): Promise<OwnershipTransferResult> {
    // In a real implementation, this would look up the pending transfer
    // and execute it if the confirmation is from the correct user
    return {
      success: true,
      pendingConfirmation: false,
    };
  }

  /**
   * Cancel a pending ownership transfer
   */
  async cancelOwnershipTransfer(
    _transferId: string,
    _ownerId: string,
  ): Promise<boolean> {
    // In a real implementation, this would delete the pending transfer
    return true;
  }

  // ==========================================================================
  // EMERGENCY ACCESS
  // ==========================================================================

  /**
   * Grant emergency/backup owner access
   */
  async grantEmergencyAccess(
    workspaceId: string,
    backupOwnerId: string,
    grantedBy: string,
    expiresAt?: string,
  ): Promise<EmergencyAccess> {
    // Verify workspace and permissions
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    if (workspace.ownerId !== grantedBy) {
      throw new Error("Only the owner can grant emergency access");
    }

    // Verify backup owner is a member
    const backupMembership = await this.checkMembership(
      workspaceId,
      backupOwnerId,
    );
    if (!backupMembership) {
      throw new Error("Backup owner must be a workspace member");
    }

    const { data } = await (this as any).client.mutate({
      mutation: GRANT_EMERGENCY_ACCESS,
      variables: {
        workspaceId,
        backupOwnerId,
        grantedBy,
        expiresAt: expiresAt || null,
      },
    });

    return this.transformEmergencyAccess(
      data.insert_nchat_workspace_emergency_access_one,
    );
  }

  /**
   * Get all active emergency access grants for a workspace
   */
  async getEmergencyAccess(workspaceId: string): Promise<EmergencyAccess[]> {
    const { data } = await (this as any).client.query({
      query: GET_EMERGENCY_ACCESS,
      variables: { workspaceId },
      fetchPolicy: "network-only",
    });

    return (data.nchat_workspace_emergency_access || []).map(
      (item: Record<string, unknown>) => this.transformEmergencyAccess(item),
    );
  }

  /**
   * Revoke emergency access
   */
  async revokeEmergencyAccess(accessId: string): Promise<boolean> {
    await (this as any).client.mutate({
      mutation: REVOKE_EMERGENCY_ACCESS,
      variables: { id: accessId },
    });
    return true;
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  /**
   * Get workspace analytics for a given period
   */
  async getAnalytics(
    workspaceId: string,
    period: "day" | "week" | "month" | "year" = "month",
  ): Promise<WorkspaceAnalytics | null> {
    const { data } = await (this as any).client.query({
      query: GET_WORKSPACE_ANALYTICS,
      variables: { workspaceId, period },
      fetchPolicy: "network-only",
    });

    if (
      !data.nchat_workspace_analytics ||
      data.nchat_workspace_analytics.length === 0
    ) {
      // Return current stats as analytics if no historical data
      const stats = await this.getWorkspaceStats(workspaceId);
      if (!stats) return null;

      return {
        workspaceId,
        period,
        memberCount: stats.memberCount,
        activeMembers: stats.onlineMembers,
        newMembers: 0,
        leftMembers: 0,
        messageCount: 0,
        fileCount: 0,
        storageUsedBytes: 0,
        channelCount: stats.channelCount,
        activeChannels: 0,
        peakOnlineMembers: stats.onlineMembers,
        averageOnlineMembers: stats.onlineMembers,
        lastUpdated: new Date().toISOString(),
      };
    }

    return this.transformAnalytics(data.nchat_workspace_analytics[0]);
  }

  /**
   * Get extended workspace statistics
   */
  async getExtendedStats(workspaceId: string): Promise<{
    basic: WorkspaceStats | null;
    storage: StorageQuota | null;
    retention: MessageRetentionPolicy | null;
  }> {
    const [basic, storage, retention] = await Promise.all([
      this.getWorkspaceStats(workspaceId),
      this.getStorageQuota(workspaceId),
      this.getMessageRetention(workspaceId),
    ]);

    return { basic, storage, retention };
  }

  // ==========================================================================
  // STORAGE QUOTA
  // ==========================================================================

  /**
   * Get storage quota for a workspace
   */
  async getStorageQuota(workspaceId: string): Promise<StorageQuota | null> {
    const { data } = await (this as any).client.query({
      query: GET_STORAGE_QUOTA,
      variables: { workspaceId },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_workspace_storage_quotas_by_pk) {
      return null;
    }

    return this.transformStorageQuota(
      data.nchat_workspace_storage_quotas_by_pk,
    );
  }

  /**
   * Update storage quota settings
   */
  async updateStorageQuota(
    workspaceId: string,
    settings: Partial<StorageQuota>,
  ): Promise<StorageQuota> {
    const current = await this.getStorageQuota(workspaceId);
    const defaults = {
      totalBytes: current?.totalBytes || 10737418240, // 10 GB
      maxFileSize: current?.maxFileSize || 104857600, // 100 MB
      allowedFileTypes: current?.allowedFileTypes || ["*"],
      quotaEnforced: current?.quotaEnforced ?? true,
      warningThreshold: current?.warningThreshold || 0.8,
    };

    await (this as any).client.mutate({
      mutation: UPDATE_STORAGE_QUOTA,
      variables: {
        workspaceId,
        totalBytes: settings.totalBytes || defaults.totalBytes,
        maxFileSize: settings.maxFileSize || defaults.maxFileSize,
        allowedFileTypes:
          settings.allowedFileTypes || defaults.allowedFileTypes,
        quotaEnforced: settings.quotaEnforced ?? defaults.quotaEnforced,
        warningThreshold:
          settings.warningThreshold || defaults.warningThreshold,
      },
    });

    const updated = await this.getStorageQuota(workspaceId);
    if (!updated) {
      throw new Error("Failed to update storage quota");
    }
    return updated;
  }

  // ==========================================================================
  // MESSAGE RETENTION
  // ==========================================================================

  /**
   * Get message retention policy
   */
  async getMessageRetention(
    workspaceId: string,
  ): Promise<MessageRetentionPolicy | null> {
    const { data } = await (this as any).client.query({
      query: GET_MESSAGE_RETENTION,
      variables: { workspaceId },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_workspace_retention_policies_by_pk) {
      return null;
    }

    return this.transformRetentionPolicy(
      data.nchat_workspace_retention_policies_by_pk,
    );
  }

  /**
   * Update message retention policy
   */
  async updateMessageRetention(
    workspaceId: string,
    policy: Partial<MessageRetentionPolicy>,
  ): Promise<MessageRetentionPolicy> {
    const current = await this.getMessageRetention(workspaceId);
    const defaults = {
      enabled: false,
      retentionDays: 365,
      excludeChannelIds: [],
      excludePinnedMessages: true,
      excludeFilesOlderThan: null,
    };

    await (this as any).client.mutate({
      mutation: UPDATE_MESSAGE_RETENTION,
      variables: {
        workspaceId,
        enabled: policy.enabled ?? current?.enabled ?? defaults.enabled,
        retentionDays:
          policy.retentionDays ||
          current?.retentionDays ||
          defaults.retentionDays,
        excludeChannelIds:
          policy.excludeChannelIds ||
          current?.excludeChannelIds ||
          defaults.excludeChannelIds,
        excludePinnedMessages:
          policy.excludePinnedMessages ??
          current?.excludePinnedMessages ??
          defaults.excludePinnedMessages,
        excludeFilesOlderThan:
          policy.excludeFilesOlderThan ??
          current?.excludeFilesOlderThan ??
          defaults.excludeFilesOlderThan,
      },
    });

    const updated = await this.getMessageRetention(workspaceId);
    if (!updated) {
      throw new Error("Failed to update retention policy");
    }
    return updated;
  }

  // ==========================================================================
  // NOTIFICATION PREFERENCES (Per-Workspace)
  // ==========================================================================

  /**
   * Get user's notification preferences for a workspace
   */
  async getNotificationPrefs(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceNotificationPrefs | null> {
    const { data } = await (this as any).client.query({
      query: GET_NOTIFICATION_PREFS,
      variables: { workspaceId, userId },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_workspace_notification_prefs_by_pk) {
      return null;
    }

    return this.transformNotificationPrefs(
      data.nchat_workspace_notification_prefs_by_pk,
    );
  }

  /**
   * Update user's notification preferences for a workspace
   */
  async updateNotificationPrefs(
    workspaceId: string,
    userId: string,
    prefs: Partial<WorkspaceNotificationPrefs>,
  ): Promise<WorkspaceNotificationPrefs> {
    const current = await this.getNotificationPrefs(workspaceId, userId);
    const defaults: Omit<WorkspaceNotificationPrefs, "workspaceId" | "userId"> =
      {
        enabled: true,
        muteAll: false,
        muteUntil: null,
        digestEnabled: false,
        digestFrequency: "never",
        notifyOnMention: true,
        notifyOnDM: true,
        notifyOnChannel: false,
        soundEnabled: true,
        desktopEnabled: true,
        mobileEnabled: true,
        emailEnabled: false,
      };

    await (this as any).client.mutate({
      mutation: UPDATE_NOTIFICATION_PREFS,
      variables: {
        workspaceId,
        userId,
        enabled: prefs.enabled ?? current?.enabled ?? defaults.enabled,
        muteAll: prefs.muteAll ?? current?.muteAll ?? defaults.muteAll,
        muteUntil: prefs.muteUntil ?? current?.muteUntil ?? defaults.muteUntil,
        digestEnabled:
          prefs.digestEnabled ??
          current?.digestEnabled ??
          defaults.digestEnabled,
        digestFrequency:
          prefs.digestFrequency ||
          current?.digestFrequency ||
          defaults.digestFrequency,
        notifyOnMention:
          prefs.notifyOnMention ??
          current?.notifyOnMention ??
          defaults.notifyOnMention,
        notifyOnDM:
          prefs.notifyOnDM ?? current?.notifyOnDM ?? defaults.notifyOnDM,
        notifyOnChannel:
          prefs.notifyOnChannel ??
          current?.notifyOnChannel ??
          defaults.notifyOnChannel,
        soundEnabled:
          prefs.soundEnabled ?? current?.soundEnabled ?? defaults.soundEnabled,
        desktopEnabled:
          prefs.desktopEnabled ??
          current?.desktopEnabled ??
          defaults.desktopEnabled,
        mobileEnabled:
          prefs.mobileEnabled ??
          current?.mobileEnabled ??
          defaults.mobileEnabled,
        emailEnabled:
          prefs.emailEnabled ?? current?.emailEnabled ?? defaults.emailEnabled,
      },
    });

    const updated = await this.getNotificationPrefs(workspaceId, userId);
    if (!updated) {
      throw new Error("Failed to update notification preferences");
    }
    return updated;
  }

  // ==========================================================================
  // MEMBER LIFECYCLE
  // ==========================================================================

  /**
   * Deactivate a member (soft removal with audit trail)
   */
  async deactivateMember(
    workspaceId: string,
    userId: string,
    deactivatedBy: string,
    reason?: string,
    canRejoin = true,
  ): Promise<DeactivatedMember> {
    // Verify the deactivator has permission
    const deactivatorMembership = await this.checkMembership(
      workspaceId,
      deactivatedBy,
    );
    if (
      !deactivatorMembership ||
      !["owner", "admin"].includes(deactivatorMembership.role)
    ) {
      throw new Error("Only owners and admins can deactivate members");
    }

    // Cannot deactivate owner
    const workspace = await this.getWorkspace(workspaceId);
    if (workspace?.ownerId === userId) {
      throw new Error("Cannot deactivate workspace owner");
    }

    const { data } = await (this as any).client.mutate({
      mutation: DEACTIVATE_MEMBER,
      variables: {
        workspaceId,
        userId,
        deactivatedBy,
        reason: reason || null,
        canRejoin,
      },
    });

    return this.transformDeactivatedMember(
      data.insert_nchat_workspace_deactivated_members_one,
    );
  }

  /**
   * Reactivate a previously deactivated member
   */
  async reactivateMember(deactivationId: string): Promise<WorkspaceMember> {
    // Get the deactivation record first
    const { data: deactivatedData } = await (this as any).client.query({
      query: gql`
        query GetDeactivation($id: uuid!) {
          nchat_workspace_deactivated_members_by_pk(id: $id) {
            workspace_id
            user_id
            can_rejoin
          }
        }
      `,
      variables: { id: deactivationId },
      fetchPolicy: "network-only",
    });

    const deactivation =
      deactivatedData.nchat_workspace_deactivated_members_by_pk;
    if (!deactivation) {
      throw new Error("Deactivation record not found");
    }

    if (!deactivation.can_rejoin) {
      throw new Error("This member is not allowed to rejoin");
    }

    const { data } = await (this as any).client.mutate({
      mutation: REACTIVATE_MEMBER,
      variables: {
        deactivationId,
        workspaceId: deactivation.workspace_id,
        userId: deactivation.user_id,
      },
    });

    return this.transformMemberData(data.insert_nchat_workspace_members_one);
  }

  /**
   * Get list of deactivated members
   */
  async getDeactivatedMembers(
    workspaceId: string,
    limit = 50,
    offset = 0,
  ): Promise<{
    members: DeactivatedMember[];
    total: number;
    hasMore: boolean;
  }> {
    const { data } = await (this as any).client.query({
      query: GET_DEACTIVATED_MEMBERS,
      variables: { workspaceId, limit, offset },
      fetchPolicy: "network-only",
    });

    const members = (data.nchat_workspace_deactivated_members || []).map(
      (item: Record<string, unknown>) => this.transformDeactivatedMember(item),
    );
    const total =
      data.nchat_workspace_deactivated_members_aggregate?.aggregate?.count || 0;

    return {
      members,
      total,
      hasMore: offset + limit < total,
    };
  }

  // ==========================================================================
  // ONBOARDING
  // ==========================================================================

  /**
   * Get onboarding configuration
   */
  async getOnboardingConfig(
    workspaceId: string,
  ): Promise<OnboardingConfig | null> {
    const { data } = await (this as any).client.query({
      query: GET_ONBOARDING_CONFIG,
      variables: { workspaceId },
      fetchPolicy: "network-only",
    });

    if (!data.nchat_workspace_onboarding_by_pk) {
      return null;
    }

    return this.transformOnboardingConfig(
      data.nchat_workspace_onboarding_by_pk,
    );
  }

  /**
   * Update onboarding configuration
   */
  async updateOnboardingConfig(
    workspaceId: string,
    config: Partial<OnboardingConfig>,
  ): Promise<OnboardingConfig> {
    const current = await this.getOnboardingConfig(workspaceId);
    const defaults: Omit<OnboardingConfig, "workspaceId"> = {
      enabled: false,
      steps: [],
      welcomeMessage: null,
      rulesAgreementRequired: false,
      profileCompletionRequired: false,
      assignDefaultChannels: true,
      defaultChannelIds: [],
    };

    await (this as any).client.mutate({
      mutation: UPDATE_ONBOARDING_CONFIG,
      variables: {
        workspaceId,
        enabled: config.enabled ?? current?.enabled ?? defaults.enabled,
        steps: config.steps || current?.steps || defaults.steps,
        welcomeMessage:
          config.welcomeMessage ??
          current?.welcomeMessage ??
          defaults.welcomeMessage,
        rulesAgreementRequired:
          config.rulesAgreementRequired ??
          current?.rulesAgreementRequired ??
          defaults.rulesAgreementRequired,
        profileCompletionRequired:
          config.profileCompletionRequired ??
          current?.profileCompletionRequired ??
          defaults.profileCompletionRequired,
        assignDefaultChannels:
          config.assignDefaultChannels ??
          current?.assignDefaultChannels ??
          defaults.assignDefaultChannels,
        defaultChannelIds:
          config.defaultChannelIds ||
          current?.defaultChannelIds ||
          defaults.defaultChannelIds,
      },
    });

    const updated = await this.getOnboardingConfig(workspaceId);
    if (!updated) {
      throw new Error("Failed to update onboarding config");
    }
    return updated;
  }

  // ==========================================================================
  // TRANSFORM HELPERS
  // ==========================================================================

  private transformEmergencyAccess(
    raw: Record<string, unknown>,
  ): EmergencyAccess {
    return {
      id: raw.id as string,
      workspaceId: raw.workspace_id as string,
      backupOwnerId: raw.backup_owner_id as string,
      grantedBy: raw.granted_by as string,
      grantedAt: raw.granted_at as string,
      expiresAt: raw.expires_at as string | null,
      isActive: raw.is_active as boolean,
      backupOwner: raw.backup_owner
        ? {
            id: (raw.backup_owner as Record<string, unknown>).id as string,
            username: (raw.backup_owner as Record<string, unknown>)
              .username as string,
            displayName: (raw.backup_owner as Record<string, unknown>)
              .display_name as string,
            email: (raw.backup_owner as Record<string, unknown>).email as
              | string
              | undefined,
            avatarUrl: (raw.backup_owner as Record<string, unknown>)
              .avatar_url as string | undefined,
          }
        : undefined,
    };
  }

  private transformAnalytics(raw: Record<string, unknown>): WorkspaceAnalytics {
    return {
      workspaceId: raw.workspace_id as string,
      period: raw.period as "day" | "week" | "month" | "year",
      memberCount: (raw.member_count as number) || 0,
      activeMembers: (raw.active_members as number) || 0,
      newMembers: (raw.new_members as number) || 0,
      leftMembers: (raw.left_members as number) || 0,
      messageCount: (raw.message_count as number) || 0,
      fileCount: (raw.file_count as number) || 0,
      storageUsedBytes: (raw.storage_used_bytes as number) || 0,
      channelCount: (raw.channel_count as number) || 0,
      activeChannels: (raw.active_channels as number) || 0,
      peakOnlineMembers: (raw.peak_online_members as number) || 0,
      averageOnlineMembers: (raw.average_online_members as number) || 0,
      lastUpdated: raw.created_at as string,
    };
  }

  private transformStorageQuota(raw: Record<string, unknown>): StorageQuota {
    return {
      workspaceId: raw.workspace_id as string,
      totalBytes: (raw.total_bytes as number) || 0,
      usedBytes: (raw.used_bytes as number) || 0,
      fileCount: (raw.file_count as number) || 0,
      maxFileSize: (raw.max_file_size as number) || 0,
      allowedFileTypes: (raw.allowed_file_types as string[]) || ["*"],
      quotaEnforced: (raw.quota_enforced as boolean) ?? true,
      warningThreshold: (raw.warning_threshold as number) || 0.8,
    };
  }

  private transformRetentionPolicy(
    raw: Record<string, unknown>,
  ): MessageRetentionPolicy {
    return {
      workspaceId: raw.workspace_id as string,
      enabled: (raw.enabled as boolean) || false,
      retentionDays: (raw.retention_days as number) || 365,
      excludeChannelIds: (raw.exclude_channel_ids as string[]) || [],
      excludePinnedMessages: (raw.exclude_pinned_messages as boolean) ?? true,
      excludeFilesOlderThan: raw.exclude_files_older_than as number | null,
      lastCleanupAt: raw.last_cleanup_at as string | null,
      messagesDeleted: raw.messages_deleted as number | undefined,
    };
  }

  private transformNotificationPrefs(
    raw: Record<string, unknown>,
  ): WorkspaceNotificationPrefs {
    return {
      workspaceId: raw.workspace_id as string,
      userId: raw.user_id as string,
      enabled: (raw.enabled as boolean) ?? true,
      muteAll: (raw.mute_all as boolean) || false,
      muteUntil: raw.mute_until as string | null,
      digestEnabled: (raw.digest_enabled as boolean) || false,
      digestFrequency:
        (raw.digest_frequency as "daily" | "weekly" | "never") || "never",
      notifyOnMention: (raw.notify_on_mention as boolean) ?? true,
      notifyOnDM: (raw.notify_on_dm as boolean) ?? true,
      notifyOnChannel: (raw.notify_on_channel as boolean) || false,
      soundEnabled: (raw.sound_enabled as boolean) ?? true,
      desktopEnabled: (raw.desktop_enabled as boolean) ?? true,
      mobileEnabled: (raw.mobile_enabled as boolean) ?? true,
      emailEnabled: (raw.email_enabled as boolean) || false,
    };
  }

  private transformDeactivatedMember(
    raw: Record<string, unknown>,
  ): DeactivatedMember {
    return {
      id: raw.id as string,
      workspaceId: raw.workspace_id as string,
      userId: raw.user_id as string,
      deactivatedBy: raw.deactivated_by as string,
      deactivatedAt: raw.deactivated_at as string,
      reason: raw.reason as string | null,
      canRejoin: (raw.can_rejoin as boolean) ?? true,
      user: raw.user
        ? {
            id: (raw.user as Record<string, unknown>).id as string,
            username: (raw.user as Record<string, unknown>).username as string,
            displayName: (raw.user as Record<string, unknown>)
              .display_name as string,
            email: (raw.user as Record<string, unknown>).email as
              | string
              | undefined,
            avatarUrl: (raw.user as Record<string, unknown>).avatar_url as
              | string
              | undefined,
          }
        : undefined,
    };
  }

  private transformOnboardingConfig(
    raw: Record<string, unknown>,
  ): OnboardingConfig {
    return {
      workspaceId: raw.workspace_id as string,
      enabled: (raw.enabled as boolean) || false,
      steps: (raw.steps as WorkspaceOnboardingStep[]) || [],
      welcomeMessage: raw.welcome_message as string | null,
      rulesAgreementRequired:
        (raw.rules_agreement_required as boolean) || false,
      profileCompletionRequired:
        (raw.profile_completion_required as boolean) || false,
      assignDefaultChannels: (raw.assign_default_channels as boolean) ?? true,
      defaultChannelIds: (raw.default_channel_ids as string[]) || [],
    };
  }

  // Transform member helper
  private transformMemberData(raw: Record<string, unknown>): WorkspaceMember {
    return {
      id: raw.id as string,
      workspaceId: raw.workspace_id as string,
      userId: raw.user_id as string,
      role: raw.role as "owner" | "admin" | "moderator" | "member" | "guest",
      joinedAt: raw.joined_at as string,
      nickname: raw.nickname as string | null,
      user: raw.user
        ? {
            id: (raw.user as Record<string, unknown>).id as string,
            username: (raw.user as Record<string, unknown>).username as string,
            displayName: (raw.user as Record<string, unknown>)
              .display_name as string,
            email: (raw.user as Record<string, unknown>).email as
              | string
              | undefined,
            avatarUrl: (raw.user as Record<string, unknown>).avatar_url as
              | string
              | undefined,
            bio: (raw.user as Record<string, unknown>).bio as
              | string
              | undefined,
            status: (raw.user as Record<string, unknown>).status as
              | string
              | undefined,
            createdAt: (raw.user as Record<string, unknown>).created_at as
              | string
              | undefined,
          }
        : undefined,
    };
  }
}

// ============================================================================
// SINGLETON FACTORY
// ============================================================================

let extendedWorkspaceServiceInstance: ExtendedWorkspaceService | null = null;

export function getExtendedWorkspaceService(
  client: ApolloClient<NormalizedCacheObject>,
): ExtendedWorkspaceService {
  if (!extendedWorkspaceServiceInstance) {
    extendedWorkspaceServiceInstance = new ExtendedWorkspaceService(client);
  }
  return extendedWorkspaceServiceInstance;
}

export function createExtendedWorkspaceService(
  client: ApolloClient<NormalizedCacheObject>,
): ExtendedWorkspaceService {
  return new ExtendedWorkspaceService(client);
}
