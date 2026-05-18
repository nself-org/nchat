/**
 * Community Groups API Route
 *
 * GET /api/channels/communities/[id]/groups - List groups in community
 * POST /api/channels/communities/[id]/groups - Add group to community
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

const addGroupSchema = z.object({
  channelId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
});

// =============================================================================
// Helper Functions
// =============================================================================

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

function validateCommunityId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// =============================================================================
// GET /api/channels/communities/[id]/groups
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: communityId } = await params;

    logger.info(
      "GET /api/channels/communities/[id]/groups - List community groups",
      { communityId },
    );

    if (!validateCommunityId(communityId)) {
      return NextResponse.json(
        { success: false, error: "Invalid community ID" },
        { status: 400 },
      );
    }

    // Verify community exists
    const { data: communityData } = await apolloClient.query({
      query: CHECK_COMMUNITY_EXISTS_QUERY,
      variables: { communityId },
      fetchPolicy: "network-only",
    });

    if (!communityData?.nchat_communities_by_pk) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 },
      );
    }

    // Fetch groups
    const { data } = await apolloClient.query({
      query: GET_COMMUNITY_GROUPS_QUERY,
      variables: { communityId },
      fetchPolicy: "network-only",
    });

    const groups = (data?.nchat_community_groups || []).map(
      (g: Record<string, unknown>) => ({
        communityId: g.community_id,
        channelId: g.channel_id,
        position: g.position,
        addedAt: g.added_at,
        addedBy: g.added_by,
        channel: g.channel
          ? {
              id: (g.channel as Record<string, unknown>).id,
              name: (g.channel as Record<string, unknown>).name,
              slug: (g.channel as Record<string, unknown>).slug,
              description: (g.channel as Record<string, unknown>).description,
              icon: (g.channel as Record<string, unknown>).icon,
              type: (g.channel as Record<string, unknown>).type,
              memberCount: (g.channel as Record<string, unknown>).member_count,
              lastMessageAt: (g.channel as Record<string, unknown>)
                .last_message_at,
            }
          : null,
      }),
    );

    logger.info("GET /api/channels/communities/[id]/groups - Success", {
      communityId,
      groupCount: groups.length,
    });

    return NextResponse.json({
      success: true,
      groups,
      total: groups.length,
    });
  } catch (error) {
    const { id: communityId } = await params;
    logger.error("Error fetching community groups", error as Error, {
      communityId,
    });
    return NextResponse.json(
      { success: false, error: "Failed to fetch community groups" },
      { status: 500 },
    );
  }
}

// =============================================================================
// POST /api/channels/communities/[id]/groups
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: communityId } = await params;

    logger.info(
      "POST /api/channels/communities/[id]/groups - Add group to community",
      { communityId },
    );

    if (!validateCommunityId(communityId)) {
      return NextResponse.json(
        { success: false, error: "Invalid community ID" },
        { status: 400 },
      );
    }

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = addGroupSchema.safeParse(body);

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

    // Verify community exists and check permissions
    const { data: communityData } = await apolloClient.query({
      query: GET_COMMUNITY_PERMISSIONS_QUERY,
      variables: { communityId },
      fetchPolicy: "network-only",
    });

    const community = communityData?.nchat_communities_by_pk;
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 },
      );
    }

    // Check if user can add groups
    const isCreator = community.created_by === userId;
    const canAddGroups =
      community.add_groups_permission === "member" || isCreator;

    if (!canAddGroups) {
      return NextResponse.json(
        {
          success: false,
          error: "Only admins can add groups to this community",
        },
        { status: 403 },
      );
    }

    // Check if community has reached max groups
    if (community.group_count >= community.max_groups) {
      return NextResponse.json(
        {
          success: false,
          error: "Community has reached maximum number of groups",
        },
        { status: 400 },
      );
    }

    // Verify the channel exists and is in the same workspace
    const { data: channelData } = await apolloClient.query({
      query: CHECK_CHANNEL_EXISTS_QUERY,
      variables: { channelId: data.channelId },
      fetchPolicy: "network-only",
    });

    const channel = channelData?.nchat_channels_by_pk;
    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    if (channel.workspace_id !== community.workspace_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Channel must be in the same workspace as the community",
        },
        { status: 400 },
      );
    }

    // Check if channel is already in this community
    const { data: existingData } = await apolloClient.query({
      query: CHECK_GROUP_EXISTS_QUERY,
      variables: { communityId, channelId: data.channelId },
      fetchPolicy: "network-only",
    });

    if (existingData?.nchat_community_groups?.length > 0) {
      return NextResponse.json(
        { success: false, error: "Channel is already in this community" },
        { status: 409 },
      );
    }

    // Determine position if not provided
    const position = data.position ?? community.group_count;

    // Add the group
    const { data: insertData } = await apolloClient.mutate({
      mutation: ADD_COMMUNITY_GROUP_MUTATION,
      variables: {
        communityId,
        channelId: data.channelId,
        position,
        addedBy: userId,
      },
    });

    // Update community group count
    await apolloClient.mutate({
      mutation: INCREMENT_GROUP_COUNT_MUTATION,
      variables: { communityId },
    });

    const group = insertData?.insert_nchat_community_groups_one;

    logger.info("POST /api/channels/communities/[id]/groups - Success", {
      communityId,
      channelId: data.channelId,
      addedBy: userId,
    });

    return NextResponse.json(
      {
        success: true,
        group: {
          communityId: group.community_id,
          channelId: group.channel_id,
          position: group.position,
          addedAt: group.added_at,
          addedBy: group.added_by,
          channel: {
            id: channel.id,
            name: channel.name,
            slug: channel.slug,
            type: channel.type,
          },
        },
        message: "Group added to community successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    const { id: communityId } = await params;
    logger.error("Error adding group to community", error as Error, {
      communityId,
    });
    return NextResponse.json(
      { success: false, error: "Failed to add group to community" },
      { status: 500 },
    );
  }
}

// =============================================================================
// DELETE /api/channels/communities/[id]/groups
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: communityId } = await params;

    logger.info(
      "DELETE /api/channels/communities/[id]/groups - Remove group from community",
      {
        communityId,
      },
    );

    if (!validateCommunityId(communityId)) {
      return NextResponse.json(
        { success: false, error: "Invalid community ID" },
        { status: 400 },
      );
    }

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get channelId from query params
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json(
        { success: false, error: "channelId is required" },
        { status: 400 },
      );
    }

    // Verify community exists and user is creator
    const { data: communityData } = await apolloClient.query({
      query: GET_COMMUNITY_PERMISSIONS_QUERY,
      variables: { communityId },
      fetchPolicy: "network-only",
    });

    const community = communityData?.nchat_communities_by_pk;
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 },
      );
    }

    // Only creator can remove groups (or the one who added it)
    const { data: groupData } = await apolloClient.query({
      query: CHECK_GROUP_EXISTS_QUERY,
      variables: { communityId, channelId },
      fetchPolicy: "network-only",
    });

    if (!groupData?.nchat_community_groups?.length) {
      return NextResponse.json(
        { success: false, error: "Group not found in community" },
        { status: 404 },
      );
    }

    const group = groupData.nchat_community_groups[0];
    const isCreator = community.created_by === userId;
    const isAdder = group.added_by === userId;

    if (!isCreator && !isAdder) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only the community creator or group adder can remove this group",
        },
        { status: 403 },
      );
    }

    // Remove the group
    await apolloClient.mutate({
      mutation: REMOVE_COMMUNITY_GROUP_MUTATION,
      variables: { communityId, channelId },
    });

    // Decrement community group count
    await apolloClient.mutate({
      mutation: DECREMENT_GROUP_COUNT_MUTATION,
      variables: { communityId },
    });

    logger.info("DELETE /api/channels/communities/[id]/groups - Success", {
      communityId,
      channelId,
      removedBy: userId,
    });

    return NextResponse.json({
      success: true,
      message: "Group removed from community successfully",
      communityId,
      channelId,
    });
  } catch (error) {
    const { id: communityId } = await params;
    logger.error("Error removing group from community", error as Error, {
      communityId,
    });
    return NextResponse.json(
      { success: false, error: "Failed to remove group from community" },
      { status: 500 },
    );
  }
}

// =============================================================================
// GraphQL Queries and Mutations
// =============================================================================

const CHECK_COMMUNITY_EXISTS_QUERY = gql`
  query CheckCommunityExists($communityId: uuid!) {
    nchat_communities_by_pk(id: $communityId) {
      id
    }
  }
`;

const GET_COMMUNITY_GROUPS_QUERY = gql`
  query GetCommunityGroups($communityId: uuid!) {
    nchat_community_groups(
      where: { community_id: { _eq: $communityId } }
      order_by: { position: asc }
    ) {
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
`;

const GET_COMMUNITY_PERMISSIONS_QUERY = gql`
  query GetCommunityPermissions($communityId: uuid!) {
    nchat_communities_by_pk(id: $communityId) {
      id
      workspace_id
      created_by
      add_groups_permission
      group_count
      max_groups
    }
  }
`;

const CHECK_CHANNEL_EXISTS_QUERY = gql`
  query CheckChannelExists($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      id
      name
      slug
      type
      workspace_id
    }
  }
`;

const CHECK_GROUP_EXISTS_QUERY = gql`
  query CheckGroupExists($communityId: uuid!, $channelId: uuid!) {
    nchat_community_groups(
      where: {
        community_id: { _eq: $communityId }
        channel_id: { _eq: $channelId }
      }
    ) {
      community_id
      channel_id
      added_by
    }
  }
`;

const ADD_COMMUNITY_GROUP_MUTATION = gql`
  mutation AddCommunityGroup(
    $communityId: uuid!
    $channelId: uuid!
    $position: Int!
    $addedBy: uuid!
  ) {
    insert_nchat_community_groups_one(
      object: {
        community_id: $communityId
        channel_id: $channelId
        position: $position
        added_by: $addedBy
      }
    ) {
      community_id
      channel_id
      position
      added_at
      added_by
    }
  }
`;

const REMOVE_COMMUNITY_GROUP_MUTATION = gql`
  mutation RemoveCommunityGroup($communityId: uuid!, $channelId: uuid!) {
    delete_nchat_community_groups(
      where: {
        community_id: { _eq: $communityId }
        channel_id: { _eq: $channelId }
      }
    ) {
      affected_rows
    }
  }
`;

const INCREMENT_GROUP_COUNT_MUTATION = gql`
  mutation IncrementGroupCount($communityId: uuid!) {
    update_nchat_communities_by_pk(
      pk_columns: { id: $communityId }
      _inc: { group_count: 1 }
    ) {
      id
      group_count
    }
  }
`;

const DECREMENT_GROUP_COUNT_MUTATION = gql`
  mutation DecrementGroupCount($communityId: uuid!) {
    update_nchat_communities_by_pk(
      pk_columns: { id: $communityId }
      _inc: { group_count: -1 }
    ) {
      id
      group_count
    }
  }
`;
