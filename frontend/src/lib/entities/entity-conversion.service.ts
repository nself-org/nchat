/**
 * Entity Conversion Service
 *
 * Handles conversion between entity types:
 * - Group -> Supergroup upgrade
 * - Supergroup -> Group downgrade (with conditions)
 * - DM -> Group (add participants)
 *
 * @module lib/entities/entity-conversion
 */

import type {
  ChatEntity,
  GroupEntity,
  SupergroupEntity,
  DirectMessageEntity,
  ChatEntityType,
  EntityMember,
  SupergroupSettings,
  DEFAULT_SUPERGROUP_SETTINGS,
  GroupSettings,
  DEFAULT_GROUP_SETTINGS,
  EntityStatus,
  EntityVisibility,
} from "@/types/entities";

import {
  canUpgradeToSupergroup,
  canDowngradeToGroup,
  validateMemberCount,
  ValidationResult,
} from "./entity-validators";

// =============================================================================
// CONVERSION RESULT TYPES
// =============================================================================

export interface ConversionResult<T extends ChatEntity> {
  success: boolean;
  entity: T | null;
  errors: string[];
  warnings: string[];
  migrationLog: MigrationLogEntry[];
}

export interface MigrationLogEntry {
  timestamp: string;
  action: string;
  details: Record<string, unknown>;
}

export interface ConversionOptions {
  /** Preserve original entity in archived state */
  preserveOriginal: boolean;

  /** Notify all members about the conversion */
  notifyMembers: boolean;

  /** Migration reason for audit log */
  reason?: string;

  /** User ID performing the conversion */
  performedBy: string;
}

// =============================================================================
// GROUP -> SUPERGROUP CONVERSION
// =============================================================================

/**
 * Convert a group to a supergroup
 */
export function upgradeGroupToSupergroup(
  group: GroupEntity,
  options: ConversionOptions,
): ConversionResult<SupergroupEntity> {
  const log: MigrationLogEntry[] = [];
  const warnings: string[] = [];
  const now = new Date().toISOString();

  // Log start
  log.push({
    timestamp: now,
    action: "UPGRADE_STARTED",
    details: {
      groupId: group.id,
      groupName: group.name,
      performedBy: options.performedBy,
    },
  });

  // Validate
  const validation = canUpgradeToSupergroup(group);
  if (!validation.valid) {
    log.push({
      timestamp: now,
      action: "UPGRADE_FAILED",
      details: { reason: "validation_failed", errors: validation.errors },
    });
    return {
      success: false,
      entity: null,
      errors: validation.errors,
      warnings: [],
      migrationLog: log,
    };
  }

  // Map group settings to supergroup settings
  const supergroupSettings: SupergroupSettings = mapGroupToSupergroupSettings(
    group.groupSettings,
  );

  // Build the supergroup entity
  const supergroup: SupergroupEntity = {
    // Base entity fields
    id: group.id, // Keep same ID for continuity
    type: "supergroup",
    name: group.name,
    slug: group.slug,
    description: group.description,
    avatarUrl: group.avatarUrl,
    bannerUrl: group.bannerUrl,
    visibility: group.visibility as EntityVisibility,
    status: "active" as EntityStatus,
    ownerId: group.ownerId,
    workspaceId: group.workspaceId,
    memberCount: group.memberCount,
    createdAt: group.createdAt,
    updatedAt: now,
    settings: group.settings,
    features: {
      ...group.features,
      // Enable supergroup-specific features
      slowMode: true,
      autoModeration: true,
      discoverability: true,
      roles: true,
    },
    metadata: {
      ...group.metadata,
      upgradedFrom: "group",
      upgradeDate: now,
      upgradeReason: options.reason,
    },

    // Supergroup-specific fields
    supergroupSettings,
    username: null, // Can be set later
    joinLink: group.joinLink,
    admins: group.adminIds.map((adminId) => ({
      userId: adminId,
      title: null,
      addedBy: group.ownerId,
      addedAt: now,
      permissions: getDefaultAdminPermissions(),
    })),
    pinnedMessageIds: group.pinnedMessageIds || [],
    linkedChannelId: null,
    lastMessage: group.lastMessage,
    upgradedFromGroupId: group.id,
    upgradedAt: now,
  };

  // Add warnings for features that behave differently
  if (group.memberCount > 200) {
    warnings.push(
      "Read receipts and typing indicators are disabled for large supergroups",
    );
  }

  log.push({
    timestamp: now,
    action: "UPGRADE_COMPLETED",
    details: {
      newEntityId: supergroup.id,
      memberCount: supergroup.memberCount,
      adminCount: supergroup.admins.length,
    },
  });

  return {
    success: true,
    entity: supergroup,
    errors: [],
    warnings,
    migrationLog: log,
  };
}

/**
 * Map group settings to supergroup settings
 */
function mapGroupToSupergroupSettings(
  groupSettings: GroupSettings,
): SupergroupSettings {
  return {
    slowModeSeconds: 0,
    restrictedMode: groupSettings.sendMessagesPermission === "admins",
    hideMemberList: false,
    approvalRequired: groupSettings.approvalRequired,
    forumMode: false,
    invitePermission: groupSettings.membersCanShareLink ? "everyone" : "admins",
    antiSpam: {
      enabled: true,
      deleteSpam: true,
      banSpammers: false,
      minAccountAge: 0,
    },
    restrictions: {
      stickersDisabled: false,
      gifsDisabled: false,
      mediaDisabled: false,
      pollsDisabled: false,
      linksDisabled: false,
    },
  };
}

/**
 * Get default admin permissions
 */
function getDefaultAdminPermissions() {
  return {
    changeInfo: true,
    deleteMessages: true,
    banUsers: true,
    inviteUsers: true,
    pinMessages: true,
    addAdmins: false,
    manageTopics: false,
    manageVideoChats: true,
    anonymous: false,
  };
}

// =============================================================================
// SUPERGROUP -> GROUP DOWNGRADE
// =============================================================================

/**
 * Downgrade a supergroup back to a group
 * This is rare and has strict requirements
 */
export function downgradeSupergrouplToGroup(
  supergroup: SupergroupEntity,
  options: ConversionOptions,
): ConversionResult<GroupEntity> {
  const log: MigrationLogEntry[] = [];
  const warnings: string[] = [];
  const now = new Date().toISOString();

  log.push({
    timestamp: now,
    action: "DOWNGRADE_STARTED",
    details: { supergroupId: supergroup.id, performedBy: options.performedBy },
  });

  // Validate
  const validation = canDowngradeToGroup(supergroup);
  if (!validation.valid) {
    log.push({
      timestamp: now,
      action: "DOWNGRADE_FAILED",
      details: { reason: "validation_failed", errors: validation.errors },
    });
    return {
      success: false,
      entity: null,
      errors: validation.errors,
      warnings: [],
      migrationLog: log,
    };
  }

  // Map supergroup settings to group settings
  const groupSettings: GroupSettings = mapSupergroupToGroupSettings(
    supergroup.supergroupSettings,
  );

  // Build the group entity
  const group: GroupEntity = {
    // Base entity fields
    id: supergroup.id,
    type: "group",
    name: supergroup.name,
    slug: supergroup.slug,
    description: supergroup.description,
    avatarUrl: supergroup.avatarUrl,
    bannerUrl: supergroup.bannerUrl,
    visibility: supergroup.visibility,
    status: "active",
    ownerId: supergroup.ownerId,
    workspaceId: supergroup.workspaceId,
    memberCount: supergroup.memberCount,
    createdAt: supergroup.createdAt,
    updatedAt: now,
    settings: supergroup.settings,
    features: {
      ...supergroup.features,
      // Disable supergroup-specific features
      autoModeration: false,
      discoverability: false,
      roles: false,
    },
    metadata: {
      ...supergroup.metadata,
      downgradedFrom: "supergroup",
      downgradeDate: now,
      downgradeReason: options.reason,
    },

    // Group-specific fields
    groupSettings,
    joinLink: supergroup.joinLink,
    joinLinkExpiresAt: null,
    lastMessage: supergroup.lastMessage,
    adminIds: supergroup.admins.map((a) => a.userId),
    pinnedMessageIds: supergroup.pinnedMessageIds.slice(0, 50), // Limit to group max
    canUpgradeToSupergroup: true,
  };

  // Warnings for lost features
  if (supergroup.supergroupSettings.forumMode) {
    warnings.push("Forum mode topics will be converted to regular threads");
  }

  if (supergroup.admins.length > 10) {
    warnings.push(
      `Admin count (${supergroup.admins.length}) exceeds group limit. Only first 10 will be retained as admins.`,
    );
    group.adminIds = group.adminIds.slice(0, 10);
  }

  if (supergroup.pinnedMessageIds.length > 50) {
    warnings.push(
      `Pinned messages (${supergroup.pinnedMessageIds.length}) exceed group limit. Only first 50 will be retained.`,
    );
  }

  log.push({
    timestamp: now,
    action: "DOWNGRADE_COMPLETED",
    details: { newEntityId: group.id },
  });

  return {
    success: true,
    entity: group,
    errors: [],
    warnings,
    migrationLog: log,
  };
}

/**
 * Map supergroup settings to group settings
 */
function mapSupergroupToGroupSettings(
  supergroupSettings: SupergroupSettings,
): GroupSettings {
  return {
    sendMessagesPermission: supergroupSettings.restrictedMode
      ? "admins"
      : "everyone",
    addMembersPermission:
      supergroupSettings.invitePermission === "admins" ? "admins" : "everyone",
    changeInfoPermission: "admins",
    pinMessagesPermission: "admins",
    membersCanShareLink: supergroupSettings.invitePermission === "everyone",
    approvalRequired: supergroupSettings.approvalRequired,
  };
}

// =============================================================================
// DM -> GROUP CONVERSION
// =============================================================================

export interface DMToGroupInput {
  dm: DirectMessageEntity;
  groupName: string;
  additionalParticipantIds?: string[];
}

/**
 * Convert a DM to a group by adding participants
 */
export function convertDMToGroup(
  input: DMToGroupInput,
  options: ConversionOptions,
): ConversionResult<GroupEntity> {
  const log: MigrationLogEntry[] = [];
  const warnings: string[] = [];
  const now = new Date().toISOString();

  log.push({
    timestamp: now,
    action: "DM_TO_GROUP_STARTED",
    details: { dmId: input.dm.id, performedBy: options.performedBy },
  });

  // Combine participants
  const allParticipantIds = new Set<string>([
    ...input.dm.participantIds,
    ...(input.additionalParticipantIds || []),
  ]);

  // Validate participant count
  const validation = validateMemberCount("group", allParticipantIds.size);
  if (!validation.valid) {
    log.push({
      timestamp: now,
      action: "DM_TO_GROUP_FAILED",
      details: { reason: "validation_failed", errors: validation.errors },
    });
    return {
      success: false,
      entity: null,
      errors: validation.errors,
      warnings: [],
      migrationLog: log,
    };
  }

  // Need at least 3 participants for a group (more than DM)
  if (allParticipantIds.size < 3) {
    const error = "Need at least 3 participants to create a group from a DM";
    log.push({
      timestamp: now,
      action: "DM_TO_GROUP_FAILED",
      details: {
        reason: "insufficient_participants",
        count: allParticipantIds.size,
      },
    });
    return {
      success: false,
      entity: null,
      errors: [error],
      warnings: [],
      migrationLog: log,
    };
  }

  // Create new group
  const group: GroupEntity = {
    id: `group-${Date.now()}`, // New ID since DM continues to exist
    type: "group",
    name: input.groupName,
    slug: input.groupName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: null,
    avatarUrl: null,
    bannerUrl: null,
    visibility: "private",
    status: "active",
    ownerId: options.performedBy, // Creator becomes owner
    workspaceId: input.dm.workspaceId,
    memberCount: allParticipantIds.size,
    createdAt: now,
    updatedAt: now,
    settings: {
      slowModeSeconds: 0,
      muteNewMembers: false,
      minAccountAgeDays: 0,
      isNsfw: false,
      defaultNotificationLevel: "all",
      whoCanSendMessages: "everyone",
      whoCanAddMembers: "everyone",
      whoCanEditInfo: "admins",
      messageRetentionDays: 0,
      showMemberList: true,
    },
    features: {},
    metadata: {
      createdFromDM: input.dm.id,
      createdAt: now,
    },
    groupSettings: {
      sendMessagesPermission: "everyone",
      addMembersPermission: "everyone",
      changeInfoPermission: "admins",
      pinMessagesPermission: "admins",
      membersCanShareLink: true,
      approvalRequired: false,
    },
    joinLink: null,
    joinLinkExpiresAt: null,
    lastMessage: null,
    adminIds: [options.performedBy],
    pinnedMessageIds: [],
    canUpgradeToSupergroup: true,
  };

  warnings.push("DM history is not transferred to the new group");

  log.push({
    timestamp: now,
    action: "DM_TO_GROUP_COMPLETED",
    details: { newGroupId: group.id, memberCount: group.memberCount },
  });

  return {
    success: true,
    entity: group,
    errors: [],
    warnings,
    migrationLog: log,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if an entity can be converted to another type
 */
export function canConvertTo(
  entity: ChatEntity,
  targetType: ChatEntityType,
): ValidationResult {
  const errors: string[] = [];

  // DM can only become a group
  if (entity.type === "dm") {
    if (targetType !== "group") {
      errors.push("Direct messages can only be converted to groups");
    }
  }

  // Group can only become a supergroup
  if (entity.type === "group") {
    if (targetType !== "supergroup") {
      errors.push("Groups can only be upgraded to supergroups");
    }
  }

  // Supergroup can become a group (with conditions) or stay supergroup
  if (entity.type === "supergroup") {
    if (targetType !== "group") {
      errors.push("Supergroups can only be downgraded to groups");
    }
  }

  // Communities and channels cannot be converted
  if (entity.type === "community") {
    errors.push("Communities cannot be converted to other types");
  }

  if (entity.type === "channel") {
    errors.push("Channels cannot be converted to other types");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get the target type an entity can be converted to
 */
export function getConversionTargets(entity: ChatEntity): ChatEntityType[] {
  switch (entity.type) {
    case "dm":
      return ["group"];
    case "group":
      return ["supergroup"];
    case "supergroup":
      return ["group"];
    default:
      return [];
  }
}

/**
 * Get recommended conversion based on entity state
 */
export function getConversionRecommendation(entity: ChatEntity): {
  recommended: boolean;
  targetType: ChatEntityType | null;
  reason: string | null;
} {
  if (entity.type === "group") {
    const group = entity as GroupEntity;
    // Recommend upgrade if approaching member limit
    if (group.memberCount > 200) {
      return {
        recommended: true,
        targetType: "supergroup",
        reason: `Group has ${group.memberCount} members. Upgrade to supergroup for higher limits and better moderation tools.`,
      };
    }
  }

  return {
    recommended: false,
    targetType: null,
    reason: null,
  };
}
