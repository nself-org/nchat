/**
 * Communities API Route (WhatsApp-style)
 *
 * GET /api/channels/communities - List communities
 * POST /api/channels/communities - Create community
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gql } from "@apollo/client";
import { logger } from "@/lib/logger";
import { apolloClient } from "@/lib/apollo-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =============================================================================
// Schema Validation
// =============================================================================

const createCommunitySchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url().optional(),
  addGroupsPermission: z.enum(["admin", "member"]).default("admin"),
  membersCanInvite: z.boolean().default(true),
  approvalRequired: z.boolean().default(false),
  eventsEnabled: z.boolean().default(false),
  maxGroups: z.number().int().min(1).max(100).default(20),
  maxMembers: z.number().int().min(10).max(100000).default(5000),
});

const communityFiltersSchema = z.object({
  workspaceId: z.string().uuid(),
  includeGroups: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// =============================================================================
// Helper Functions
// =============================================================================

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

function transformCommunity(raw: Record<string, unknown>) {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    name: raw.name,
    description: raw.description,
    iconUrl: raw.icon_url,
    announcementChannelId: raw.announcement_channel_id,
    addGroupsPermission: raw.add_groups_permission,
    membersCanInvite: raw.members_can_invite,
    approvalRequired: raw.approval_required,
    eventsEnabled: raw.events_enabled,
    maxGroups: raw.max_groups,
    maxMembers: raw.max_members,
    groupCount: raw.group_count,
    totalMemberCount: raw.total_member_count,
    createdBy: raw.created_by,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

// =============================================================================
// GET /api/channels/communities
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/channels/communities - List communities");

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 },
      );
    }

    const filters = communityFiltersSchema.parse({
      workspaceId,
      includeGroups: searchParams.get("includeGroups") === "true",
      limit: Number(searchParams.get("limit")) || 20,
      offset: Number(searchParams.get("offset")) || 0,
    });

    const userId = getUserIdFromRequest(request);

    // Fetch communities from database
    const { data } = await apolloClient.query({
      query: filters.includeGroups
        ? GET_COMMUNITIES_WITH_GROUPS_QUERY
        : GET_COMMUNITIES_QUERY,
      variables: {
        workspaceId: filters.workspaceId,
        limit: filters.limit,
        offset: filters.offset,
      },
      fetchPolicy: "network-only",
    });

    const communities = (data?.nchat_communities || []).map(transformCommunity);
    const total =
      data?.nchat_communities_aggregate?.aggregate?.count || communities.length;

    logger.info("GET /api/channels/communities - Success", {
      total,
      returned: communities.length,
    });

    return NextResponse.json({
      success: true,
      communities,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total,
        hasMore: filters.offset + filters.limit < total,
      },
    });
  } catch (error) {
    logger.error("Error fetching communities:", error as Error);
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
      { success: false, error: "Failed to fetch communities" },
      { status: 500 },
    );
  }
}

// =============================================================================
// POST /api/channels/communities
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/channels/communities - Create community");

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createCommunitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // First, create the announcement channel for this community
    const { data: channelData } = await apolloClient.mutate({
      mutation: CREATE_ANNOUNCEMENT_CHANNEL_MUTATION,
      variables: {
        workspaceId: data.workspaceId,
        name: `${data.name} Announcements`,
        slug: `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-announcements`,
        description: `Announcement channel for ${data.name} community`,
        createdBy: userId,
      },
    });

    const announcementChannel = channelData?.insert_nchat_channels_one;
    if (!announcementChannel) {
      throw new Error("Failed to create announcement channel");
    }

    // Create the community
    const { data: communityData } = await apolloClient.mutate({
      mutation: CREATE_COMMUNITY_MUTATION,
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

    const community = communityData?.insert_nchat_communities_one;
    if (!community) {
      throw new Error("Failed to create community");
    }

    logger.info("POST /api/channels/communities - Success", {
      communityId: community.id,
      name: data.name,
      createdBy: userId,
    });

    return NextResponse.json(
      {
        success: true,
        community: {
          ...transformCommunity(community),
          announcementChannel: {
            id: announcementChannel.id,
            name: announcementChannel.name,
            slug: announcementChannel.slug,
          },
        },
        message: "Community created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating community:", error as Error);
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
      { success: false, error: "Failed to create community" },
      { status: 500 },
    );
  }
}

// =============================================================================
// GraphQL Queries and Mutations
// =============================================================================

const GET_COMMUNITIES_QUERY = gql`
  query GetCommunities($workspaceId: uuid!, $limit: Int!, $offset: Int!) {
    nchat_communities(
      where: { workspace_id: { _eq: $workspaceId } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
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
    nchat_communities_aggregate(
      where: { workspace_id: { _eq: $workspaceId } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const GET_COMMUNITIES_WITH_GROUPS_QUERY = gql`
  query GetCommunitiesWithGroups(
    $workspaceId: uuid!
    $limit: Int!
    $offset: Int!
  ) {
    nchat_communities(
      where: { workspace_id: { _eq: $workspaceId } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
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
      announcement_channel: nchat_channel {
        id
        name
        slug
        description
      }
      groups: nchat_community_groups(order_by: { position: asc }) {
        community_id
        channel_id
        position
        added_at
        added_by
        channel: nchat_channel {
          id
          name
          slug
          description
          icon
          type
          member_count
          last_message_at
        }
      }
    }
    nchat_communities_aggregate(
      where: { workspace_id: { _eq: $workspaceId } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const CREATE_ANNOUNCEMENT_CHANNEL_MUTATION = gql`
  mutation CreateAnnouncementChannel(
    $workspaceId: uuid!
    $name: String!
    $slug: String!
    $description: String
    $createdBy: uuid!
  ) {
    insert_nchat_channels_one(
      object: {
        workspace_id: $workspaceId
        name: $name
        slug: $slug
        description: $description
        type: "announcement"
        subtype: "community_announcement"
        is_readonly: true
        created_by: $createdBy
      }
    ) {
      id
      name
      slug
    }
  }
`;

const CREATE_COMMUNITY_MUTATION = gql`
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
    insert_nchat_communities_one(
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
        group_count: 0
        total_member_count: 1
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
