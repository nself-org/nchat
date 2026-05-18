/**
 * Communities API (WhatsApp-style)
 *
 * GET /api/communities - List communities
 * POST /api/communities - Create community (with announcement channel)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const CreateCommunitySchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url().optional(),
  addGroupsPermission: z.enum(["admin", "member"]).default("admin"),
  membersCanInvite: z.boolean().default(true),
  approvalRequired: z.boolean().default(false),
  eventsEnabled: z.boolean().default(true),
  maxGroups: z.number().int().min(1).max(100).default(100),
  maxMembers: z.number().int().min(1).max(5000).default(2000),
});

const ListCommunitiesSchema = z.object({
  workspaceId: z.string().uuid(),
  includeGroups: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// =============================================================================
// GRAPHQL
// =============================================================================

const LIST_COMMUNITIES = gql`
  query ListCommunities($workspaceId: uuid!, $limit: Int!, $offset: Int!) {
    communities(
      where: { workspace_id: { _eq: $workspaceId } }
      limit: $limit
      offset: $offset
      order_by: { created_at: desc }
    ) {
      id
      workspace_id
      name
      description
      icon_url
      announcement_channel_id
      add_groups_permission
      members_can_invite
      approval_required
      events_enabled
      max_groups
      max_members
      group_count
      total_member_count
      created_by
      created_at
      updated_at
    }
    communities_aggregate(where: { workspace_id: { _eq: $workspaceId } }) {
      aggregate {
        count
      }
    }
  }
`;

const LIST_COMMUNITIES_WITH_GROUPS = gql`
  query ListCommunitiesWithGroups(
    $workspaceId: uuid!
    $limit: Int!
    $offset: Int!
  ) {
    communities(
      where: { workspace_id: { _eq: $workspaceId } }
      limit: $limit
      offset: $offset
      order_by: { created_at: desc }
    ) {
      id
      workspace_id
      name
      description
      icon_url
      announcement_channel_id
      announcement_channel {
        id
        name
        slug
        type
        icon
      }
      add_groups_permission
      members_can_invite
      approval_required
      events_enabled
      max_groups
      max_members
      group_count
      total_member_count
      created_by
      created_at
      updated_at
      community_groups(order_by: { position: asc }) {
        community_id
        channel_id
        position
        added_at
        added_by
        channel {
          id
          name
          slug
          type
          icon
          member_count
        }
      }
    }
    communities_aggregate(where: { workspace_id: { _eq: $workspaceId } }) {
      aggregate {
        count
      }
    }
  }
`;

const CREATE_COMMUNITY = gql`
  mutation CreateCommunity(
    $workspaceId: uuid!
    $name: String!
    $description: String
    $iconUrl: String
    $announcementChannelId: uuid!
    $addGroupsPermission: String!
    $membersCanInvite: Boolean!
    $approvalRequired: Boolean!
    $eventsEnabled: Boolean!
    $maxGroups: Int!
    $maxMembers: Int!
    $createdBy: uuid!
  ) {
    insert_communities_one(
      object: {
        workspace_id: $workspaceId
        name: $name
        description: $description
        icon_url: $iconUrl
        announcement_channel_id: $announcementChannelId
        add_groups_permission: $addGroupsPermission
        members_can_invite: $membersCanInvite
        approval_required: $approvalRequired
        events_enabled: $eventsEnabled
        max_groups: $maxGroups
        max_members: $maxMembers
        created_by: $createdBy
      }
    ) {
      id
      workspace_id
      name
      description
      icon_url
      announcement_channel_id
      add_groups_permission
      members_can_invite
      approval_required
      events_enabled
      max_groups
      max_members
      group_count
      total_member_count
      created_by
      created_at
      updated_at
    }
  }
`;

const CREATE_ANNOUNCEMENT_CHANNEL = gql`
  mutation CreateAnnouncementChannel(
    $workspaceId: uuid!
    $name: String!
    $slug: String!
    $description: String
    $creatorId: uuid!
  ) {
    insert_channels_one(
      object: {
        workspace_id: $workspaceId
        name: $name
        slug: $slug
        description: $description
        type: "announcement"
        subtype: "community_announcement"
        is_private: false
        is_default: false
        is_readonly: true
        creator_id: $creatorId
        position: 0
      }
    ) {
      id
      name
      slug
      type
      subtype
    }
  }
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// =============================================================================
// GET /api/communities - List communities
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/communities - List communities");

    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      workspaceId: searchParams.get("workspaceId") || "",
      includeGroups: searchParams.get("includeGroups") || "false",
      limit: searchParams.get("limit") || "50",
      offset: searchParams.get("offset") || "0",
    };

    const validation = ListCommunitiesSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { workspaceId, includeGroups, limit, offset } = validation.data;

    const query = includeGroups
      ? LIST_COMMUNITIES_WITH_GROUPS
      : LIST_COMMUNITIES;

    const { data } = await apolloClient.query({
      query,
      variables: { workspaceId, limit, offset },
      fetchPolicy: "network-only",
    });

    const communities = data.communities || [];
    const total = data.communities_aggregate?.aggregate?.count || 0;

    logger.info("GET /api/communities - Success", {
      count: communities.length,
      total,
      workspaceId,
    });

    return NextResponse.json({
      success: true,
      communities,
      pagination: {
        total,
        offset,
        limit,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error("GET /api/communities - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch communities",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// =============================================================================
// POST /api/communities - Create community
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/communities - Create community");

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const validation = CreateCommunitySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Step 1: Create announcement channel
    const channelName = `${data.name} Announcements`;
    const channelSlug = slugify(channelName);

    const { data: channelResult } = await apolloClient.mutate({
      mutation: CREATE_ANNOUNCEMENT_CHANNEL,
      variables: {
        workspaceId: data.workspaceId,
        name: channelName,
        slug: channelSlug,
        description: `Announcement channel for ${data.name} community`,
        creatorId: userId,
      },
    });

    const announcementChannel = channelResult.insert_channels_one;

    // Step 2: Create community with announcement channel
    const { data: communityResult } = await apolloClient.mutate({
      mutation: CREATE_COMMUNITY,
      variables: {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        iconUrl: data.iconUrl,
        announcementChannelId: announcementChannel.id,
        addGroupsPermission: data.addGroupsPermission,
        membersCanInvite: data.membersCanInvite,
        approvalRequired: data.approvalRequired,
        eventsEnabled: data.eventsEnabled,
        maxGroups: data.maxGroups,
        maxMembers: data.maxMembers,
        createdBy: userId,
      },
    });

    const community = communityResult.insert_communities_one;

    logger.info("POST /api/communities - Community created", {
      communityId: community.id,
      name: community.name,
      announcementChannelId: announcementChannel.id,
      createdBy: userId,
    });

    return NextResponse.json(
      {
        success: true,
        community,
        announcementChannel,
        message: "Community created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("POST /api/communities - Error", error as Error);

    if (error instanceof Error) {
      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "unique constraint",
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Community with this name already exists",
            message: "Please choose a different name",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create community",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
