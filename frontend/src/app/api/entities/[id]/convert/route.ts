/**
 * Entity Conversion API
 *
 * POST /api/entities/[id]/convert - Convert entity to different type
 *
 * Supported conversions:
 * - group -> supergroup (upgrade)
 * - supergroup -> group (downgrade, with conditions)
 * - dm -> group (add participants)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  upgradeGroupToSupergroup,
  downgradeSupergrouplToGroup,
  convertDMToGroup,
  canConvertTo,
  getConversionTargets,
  getConversionRecommendation,
} from "@/lib/entities";
import type {
  ChatEntityType,
  GroupEntity,
  SupergroupEntity,
  DirectMessageEntity,
} from "@/types/entities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =============================================================================
// SCHEMAS
// =============================================================================

const convertEntitySchema = z.object({
  targetType: z.enum(["dm", "group", "supergroup", "community", "channel"]),
  reason: z.string().max(500).optional(),
  // For DM -> Group
  groupName: z.string().min(1).max(100).optional(),
  additionalParticipantIds: z.array(z.string().uuid()).optional(),
  // Options
  preserveOriginal: z.boolean().default(false),
  notifyMembers: z.boolean().default(true),
});

// =============================================================================
// HELPERS
// =============================================================================

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// =============================================================================
// GET /api/entities/[id]/convert
// Get conversion options for an entity
// =============================================================================

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: entityId } = await context.params;
    logger.info("GET /api/entities/[id]/convert - Get conversion options", {
      entityId,
    });

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // In a real implementation, fetch the entity from database
    // For now, return a mock response based on entity ID pattern
    const entityType = entityId.split("-")[0] as ChatEntityType;

    // Mock entity for demonstration
    const mockEntity = {
      id: entityId,
      type: entityType,
      memberCount: 150,
      status: "active",
    };

    const availableTargets = getConversionTargets(
      mockEntity as unknown as GroupEntity,
    );
    const recommendation = getConversionRecommendation(
      mockEntity as unknown as GroupEntity,
    );

    return NextResponse.json({
      success: true,
      entityId,
      currentType: entityType,
      availableConversions: availableTargets,
      recommendation,
      requirements: getConversionRequirements(entityType, availableTargets),
    });
  } catch (error) {
    logger.error("Error getting conversion options:", error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to get conversion options" },
      { status: 500 },
    );
  }
}

// =============================================================================
// POST /api/entities/[id]/convert
// Perform entity conversion
// =============================================================================

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: entityId } = await context.params;
    logger.info("POST /api/entities/[id]/convert - Convert entity", {
      entityId,
    });

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parseResult = convertEntitySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: parseResult.error.errors,
        },
        { status: 400 },
      );
    }

    const {
      targetType,
      reason,
      groupName,
      additionalParticipantIds,
      preserveOriginal,
      notifyMembers,
    } = parseResult.data;

    // In a real implementation, fetch the entity from database
    // For now, determine type from ID pattern and create mock entity
    const entityType = entityId.split("-")[0] as ChatEntityType;

    // Validate conversion is allowed
    const mockEntity = {
      id: entityId,
      type: entityType,
      ownerId: userId,
      memberCount: 150,
      status: "active",
    };

    const canConvert = canConvertTo(
      mockEntity as unknown as GroupEntity,
      targetType,
    );
    if (!canConvert.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Conversion not allowed",
          details: canConvert.errors,
        },
        { status: 400 },
      );
    }

    // Perform conversion based on source and target type
    let result;

    if (entityType === "group" && targetType === "supergroup") {
      // Group -> Supergroup upgrade
      const mockGroup: GroupEntity = createMockGroup(entityId, userId);
      result = upgradeGroupToSupergroup(mockGroup, {
        preserveOriginal,
        notifyMembers,
        reason,
        performedBy: userId,
      });
    } else if (entityType === "supergroup" && targetType === "group") {
      // Supergroup -> Group downgrade
      const mockSupergroup: SupergroupEntity = createMockSupergroup(
        entityId,
        userId,
      );
      result = downgradeSupergrouplToGroup(mockSupergroup, {
        preserveOriginal,
        notifyMembers,
        reason,
        performedBy: userId,
      });
    } else if (entityType === "dm" && targetType === "group") {
      // DM -> Group conversion
      if (!groupName) {
        return NextResponse.json(
          {
            success: false,
            error: "groupName is required for DM to Group conversion",
          },
          { status: 400 },
        );
      }

      const mockDM: DirectMessageEntity = createMockDM(entityId, userId);
      result = convertDMToGroup(
        {
          dm: mockDM,
          groupName,
          additionalParticipantIds,
        },
        {
          preserveOriginal: true, // Always preserve DM
          notifyMembers,
          reason,
          performedBy: userId,
        },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Conversion from ${entityType} to ${targetType} is not supported`,
        },
        { status: 400 },
      );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Conversion failed",
          details: result.errors,
          migrationLog: result.migrationLog,
        },
        { status: 400 },
      );
    }

    logger.info("POST /api/entities/[id]/convert - Conversion successful", {
      entityId,
      fromType: entityType,
      toType: targetType,
      newEntityId: result.entity?.id,
    });

    return NextResponse.json({
      success: true,
      entity: result.entity,
      warnings: result.warnings,
      migrationLog: result.migrationLog,
      message: `Successfully converted from ${entityType} to ${targetType}`,
    });
  } catch (error) {
    logger.error("Error converting entity:", error as Error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: error.errors,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to convert entity" },
      { status: 500 },
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getConversionRequirements(
  currentType: ChatEntityType,
  targets: ChatEntityType[],
): Record<string, string[]> {
  const requirements: Record<string, string[]> = {};

  for (const target of targets) {
    if (currentType === "dm" && target === "group") {
      requirements.group = [
        "At least 3 total participants (including you)",
        "A name for the new group",
      ];
    }

    if (currentType === "group" && target === "supergroup") {
      requirements.supergroup = [
        "You must be the group owner",
        "Group must be active (not archived)",
      ];
    }

    if (currentType === "supergroup" && target === "group") {
      requirements.group = [
        "Member count must be 256 or fewer",
        "Forum mode must be disabled",
        "You must be the supergroup owner",
      ];
    }
  }

  return requirements;
}

function createMockGroup(id: string, ownerId: string): GroupEntity {
  const now = new Date().toISOString();
  return {
    id,
    type: "group",
    name: "Mock Group",
    slug: "mock-group",
    description: null,
    avatarUrl: null,
    bannerUrl: null,
    visibility: "private",
    status: "active",
    ownerId,
    workspaceId: "mock-workspace",
    memberCount: 150,
    createdAt: now,
    updatedAt: now,
    settings: {
      slowModeSeconds: 0,
      muteNewMembers: false,
      minAccountAgeDays: 0,
      isNsfw: false,
      defaultNotificationLevel: "all",
      whoCanSendMessages: "everyone",
      whoCanAddMembers: "admins",
      whoCanEditInfo: "admins",
      messageRetentionDays: 0,
      showMemberList: true,
    },
    features: {},
    metadata: {},
    groupSettings: {
      sendMessagesPermission: "everyone",
      addMembersPermission: "admins",
      changeInfoPermission: "admins",
      pinMessagesPermission: "admins",
      membersCanShareLink: true,
      approvalRequired: false,
    },
    joinLink: null,
    joinLinkExpiresAt: null,
    lastMessage: null,
    adminIds: [ownerId],
    pinnedMessageIds: [],
    canUpgradeToSupergroup: true,
  };
}

function createMockSupergroup(id: string, ownerId: string): SupergroupEntity {
  const now = new Date().toISOString();
  return {
    id,
    type: "supergroup",
    name: "Mock Supergroup",
    slug: "mock-supergroup",
    description: null,
    avatarUrl: null,
    bannerUrl: null,
    visibility: "private",
    status: "active",
    ownerId,
    workspaceId: "mock-workspace",
    memberCount: 100,
    createdAt: now,
    updatedAt: now,
    settings: {
      slowModeSeconds: 0,
      muteNewMembers: false,
      minAccountAgeDays: 0,
      isNsfw: false,
      defaultNotificationLevel: "all",
      whoCanSendMessages: "everyone",
      whoCanAddMembers: "admins",
      whoCanEditInfo: "admins",
      messageRetentionDays: 0,
      showMemberList: true,
    },
    features: {},
    metadata: {},
    supergroupSettings: {
      slowModeSeconds: 0,
      restrictedMode: false,
      hideMemberList: false,
      approvalRequired: false,
      forumMode: false,
      invitePermission: "admins",
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
    },
    username: null,
    joinLink: null,
    admins: [
      {
        userId: ownerId,
        title: "Owner",
        addedBy: ownerId,
        addedAt: now,
        permissions: {
          changeInfo: true,
          deleteMessages: true,
          banUsers: true,
          inviteUsers: true,
          pinMessages: true,
          addAdmins: true,
          manageTopics: true,
          manageVideoChats: true,
          anonymous: false,
        },
      },
    ],
    pinnedMessageIds: [],
    linkedChannelId: null,
    lastMessage: null,
    upgradedFromGroupId: null,
    upgradedAt: null,
  };
}

function createMockDM(id: string, ownerId: string): DirectMessageEntity {
  const now = new Date().toISOString();
  const otherUserId = "other-user-id";

  return {
    id,
    type: "dm",
    name: "Direct Message",
    slug: `dm-${ownerId}-${otherUserId}`,
    description: null,
    avatarUrl: null,
    bannerUrl: null,
    visibility: "private",
    status: "active",
    ownerId,
    workspaceId: "mock-workspace",
    memberCount: 2,
    createdAt: now,
    updatedAt: now,
    settings: {
      slowModeSeconds: 0,
      muteNewMembers: false,
      minAccountAgeDays: 0,
      isNsfw: false,
      defaultNotificationLevel: "all",
      whoCanSendMessages: "everyone",
      whoCanAddMembers: "no_one",
      whoCanEditInfo: "owner",
      messageRetentionDays: 0,
      showMemberList: true,
    },
    features: {},
    metadata: {},
    otherParticipant: {
      id: "member-1",
      entityId: id,
      userId: otherUserId,
      role: "member",
      joinedAt: now,
      lastReadAt: null,
      lastReadMessageId: null,
      notificationLevel: "all",
      isMuted: false,
      mutedUntil: null,
      isBanned: false,
      bannedAt: null,
      bannedBy: null,
      banReason: null,
      user: {
        id: otherUserId,
        username: "otheruser",
        displayName: "Other User",
        avatarUrl: null,
        status: "offline",
        lastSeenAt: null,
      },
    },
    participantIds: [ownerId, otherUserId],
    lastMessage: null,
    archivedByUserId: null,
    isPinned: false,
    isEncrypted: true,
  };
}
