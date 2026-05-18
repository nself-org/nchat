/**
 * Unified Entity API
 *
 * GET /api/entities - List all entities for current user
 * POST /api/entities - Create a new entity
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  validateCreateGroupInput,
  validateCreateSupergroupInput,
  validateCreateCommunityInput,
  validateCreateChannelInput,
  generateSlug,
} from "@/lib/entities";
import type {
  ChatEntityType,
  EntityVisibility,
  CreateGroupInput,
  CreateSupergroupInput,
  CreateCommunityInput,
  CreateChannelInput,
} from "@/types/entities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =============================================================================
// SCHEMAS
// =============================================================================

const entityFilterSchema = z.object({
  types: z
    .string()
    .optional()
    .transform((v) => v?.split(",") as ChatEntityType[] | undefined),
  status: z.enum(["active", "archived", "deleted", "suspended"]).optional(),
  visibility: z.enum(["private", "public", "discoverable"]).optional(),
  search: z.string().max(100).optional(),
  hasUnread: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  isPinned: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50))
    .pipe(z.number().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 0))
    .pipe(z.number().min(0)),
});

const createEntitySchema = z.discriminatedUnion("type", [
  // DM creation
  z.object({
    type: z.literal("dm"),
    participantId: z.string().uuid(),
  }),
  // Group creation
  z.object({
    type: z.literal("group"),
    name: z.string().min(1).max(100),
    description: z.string().max(2000).optional(),
    avatarUrl: z.string().url().optional(),
    participantIds: z.array(z.string().uuid()).min(1).max(255),
    settings: z.record(z.unknown()).optional(),
  }),
  // Supergroup creation
  z.object({
    type: z.literal("supergroup"),
    name: z.string().min(1).max(100),
    description: z.string().max(2000).optional(),
    avatarUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    username: z.string().min(5).max(32).optional(),
    visibility: z
      .enum(["private", "public", "discoverable"])
      .default("private"),
    settings: z.record(z.unknown()).optional(),
  }),
  // Community creation
  z.object({
    type: z.literal("community"),
    name: z.string().min(1).max(100),
    description: z.string().max(2000).optional(),
    avatarUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    vanityUrl: z.string().min(2).max(50).optional(),
    template: z
      .enum(["blank", "default", "community", "gaming", "study"])
      .default("default"),
    visibility: z
      .enum(["private", "public", "discoverable"])
      .default("private"),
    settings: z.record(z.unknown()).optional(),
  }),
  // Channel creation
  z.object({
    type: z.literal("channel"),
    name: z.string().min(1).max(100),
    description: z.string().max(2000).optional(),
    avatarUrl: z.string().url().optional(),
    username: z.string().min(5).max(32).optional(),
    visibility: z.enum(["private", "public", "discoverable"]).default("public"),
    settings: z.record(z.unknown()).optional(),
  }),
]);

// =============================================================================
// HELPERS
// =============================================================================

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

function getWorkspaceIdFromRequest(request: NextRequest): string {
  return (
    request.headers.get("x-workspace-id") ||
    "ffffffff-ffff-ffff-ffff-ffffffffffff"
  );
}

// =============================================================================
// GET /api/entities
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/entities - List entities");

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const filters = entityFilterSchema.parse(Object.fromEntries(searchParams));

    const workspaceId = getWorkspaceIdFromRequest(request);

    // In a real implementation, this would query the database
    // For now, return mock structure
    const entities: unknown[] = [];
    const total = 0;

    logger.info("GET /api/entities - Success", {
      userId,
      filters,
      returned: entities.length,
    });

    return NextResponse.json({
      success: true,
      entities,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total,
        hasMore: filters.offset + filters.limit < total,
      },
    });
  } catch (error) {
    logger.error("Error fetching entities:", error as Error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: error.errors,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch entities" },
      { status: 500 },
    );
  }
}

// =============================================================================
// POST /api/entities
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/entities - Create entity");

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const workspaceId = getWorkspaceIdFromRequest(request);
    const body = await request.json();

    // Parse and validate the request body
    const parseResult = createEntitySchema.safeParse(body);
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

    const data = parseResult.data;
    const now = new Date().toISOString();

    // Create entity based on type
    let entity: Record<string, unknown>;
    let validationErrors: string[] = [];

    switch (data.type) {
      case "dm": {
        // Create DM - find or create
        entity = {
          id: `dm-${Date.now()}`,
          type: "dm",
          name: "",
          slug: `dm-${userId}-${data.participantId}`,
          description: null,
          avatarUrl: null,
          bannerUrl: null,
          visibility: "private",
          status: "active",
          ownerId: userId,
          workspaceId,
          memberCount: 2,
          createdAt: now,
          updatedAt: now,
          participantIds: [userId, data.participantId],
          isEncrypted: true,
        };
        break;
      }

      case "group": {
        const validation = validateCreateGroupInput({
          name: data.name,
          description: data.description,
          avatarUrl: data.avatarUrl,
          participantIds: data.participantIds,
        });

        if (!validation.valid) {
          validationErrors = validation.errors.map((e) => e.message);
          break;
        }

        entity = {
          id: `group-${Date.now()}`,
          type: "group",
          name: data.name,
          slug: generateSlug(data.name),
          description: data.description || null,
          avatarUrl: data.avatarUrl || null,
          bannerUrl: null,
          visibility: "private",
          status: "active",
          ownerId: userId,
          workspaceId,
          memberCount: data.participantIds.length + 1,
          createdAt: now,
          updatedAt: now,
          adminIds: [userId],
          pinnedMessageIds: [],
          canUpgradeToSupergroup: true,
          groupSettings: {
            sendMessagesPermission: "everyone",
            addMembersPermission: "admins",
            changeInfoPermission: "admins",
            pinMessagesPermission: "admins",
            membersCanShareLink: true,
            approvalRequired: false,
          },
        };
        break;
      }

      case "supergroup": {
        const validation = validateCreateSupergroupInput({
          name: data.name,
          description: data.description,
          avatarUrl: data.avatarUrl,
          bannerUrl: data.bannerUrl,
          username: data.username,
          visibility: data.visibility as EntityVisibility,
        });

        if (!validation.valid) {
          validationErrors = validation.errors.map((e) => e.message);
          break;
        }

        entity = {
          id: `supergroup-${Date.now()}`,
          type: "supergroup",
          name: data.name,
          slug: generateSlug(data.name),
          description: data.description || null,
          avatarUrl: data.avatarUrl || null,
          bannerUrl: data.bannerUrl || null,
          visibility: data.visibility,
          status: "active",
          ownerId: userId,
          workspaceId,
          memberCount: 1,
          createdAt: now,
          updatedAt: now,
          username: data.username || null,
          admins: [
            {
              userId,
              title: "Owner",
              addedBy: userId,
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
        };
        break;
      }

      case "community": {
        const validation = validateCreateCommunityInput({
          name: data.name,
          description: data.description,
          avatarUrl: data.avatarUrl,
          bannerUrl: data.bannerUrl,
          vanityUrl: data.vanityUrl,
          template: data.template,
          visibility: data.visibility as EntityVisibility,
        });

        if (!validation.valid) {
          validationErrors = validation.errors.map((e) => e.message);
          break;
        }

        entity = {
          id: `community-${Date.now()}`,
          type: "community",
          name: data.name,
          slug: generateSlug(data.name),
          description: data.description || null,
          avatarUrl: data.avatarUrl || null,
          bannerUrl: data.bannerUrl || null,
          visibility: data.visibility,
          status: "active",
          ownerId: userId,
          workspaceId,
          memberCount: 1,
          createdAt: now,
          updatedAt: now,
          vanityUrl: data.vanityUrl || null,
          categories: [],
          roles: [
            {
              id: `role-${Date.now()}-default`,
              communityId: `community-${Date.now()}`,
              name: "@everyone",
              color: null,
              icon: null,
              position: 0,
              permissions: 0n,
              isDefault: true,
              isMentionable: false,
              isHoisted: false,
              memberCount: 1,
            },
          ],
          verificationLevel: "none",
          contentFilterLevel: "disabled",
          boostTier: 0,
          boostCount: 0,
          channelCount: 0,
          communitySettings: {
            createChannelsPermission: "admins",
            createCategoriesPermission: "admins",
            createEventsPermission: "moderators",
            discoverable: false,
            communityEnabled: true,
            welcomeScreen: {
              enabled: false,
              description: null,
              channels: [],
            },
            defaultNotifications: "mentions",
            everyoneRestricted: true,
            maxFileSizeMb: 25,
          },
        };
        break;
      }

      case "channel": {
        const validation = validateCreateChannelInput({
          name: data.name,
          description: data.description,
          avatarUrl: data.avatarUrl,
          username: data.username,
          visibility: data.visibility as EntityVisibility,
        });

        if (!validation.valid) {
          validationErrors = validation.errors.map((e) => e.message);
          break;
        }

        entity = {
          id: `channel-${Date.now()}`,
          type: "channel",
          name: data.name,
          slug: generateSlug(data.name),
          description: data.description || null,
          avatarUrl: data.avatarUrl || null,
          bannerUrl: null,
          visibility: data.visibility,
          status: "active",
          ownerId: userId,
          workspaceId,
          memberCount: 1,
          createdAt: now,
          updatedAt: now,
          username: data.username || null,
          subscriberCount: 0,
          admins: [
            {
              userId,
              title: "Owner",
              addedBy: userId,
              addedAt: now,
              permissions: {
                postMessages: true,
                editMessages: true,
                deleteMessages: true,
                inviteSubscribers: true,
                manageDiscussion: true,
                addAdmins: true,
              },
            },
          ],
          isVerified: false,
          signatureEnabled: true,
          contentRestriction: "none",
          channelSettings: {
            allowReactions: true,
            showSignature: true,
            discussionEnabled: false,
            discussionSlowMode: 0,
            subscriberListVisibility: "public",
            schedulingEnabled: true,
            silentBroadcast: false,
          },
        };
        break;
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationErrors,
        },
        { status: 400 },
      );
    }

    logger.info("POST /api/entities - Entity created", {
      entityId: entity!.id,
      type: data.type,
      createdBy: userId,
    });

    return NextResponse.json(
      {
        success: true,
        entity: entity!,
        message: `${data.type} created successfully`,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating entity:", error as Error);
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
      { success: false, error: "Failed to create entity" },
      { status: 500 },
    );
  }
}
