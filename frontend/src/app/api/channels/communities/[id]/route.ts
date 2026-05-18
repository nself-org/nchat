/**
 * Single Community API Route (WhatsApp-style)
 *
 * GET /api/channels/communities/[id] - Get community details
 * PATCH /api/channels/communities/[id] - Update community
 * DELETE /api/channels/communities/[id] - Delete community
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

const updateCommunitySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  iconUrl: z.string().url().optional().nullable(),
  addGroupsPermission: z.enum(["admin", "member"]).optional(),
  membersCanInvite: z.boolean().optional(),
  approvalRequired: z.boolean().optional(),
  eventsEnabled: z.boolean().optional(),
  maxGroups: z.number().int().min(1).max(100).optional(),
  maxMembers: z.number().int().min(10).max(100000).optional(),
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
// GET /api/channels/communities/[id]
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: communityId } = await params;

    logger.info("GET /api/channels/communities/[id] - Get community details", {
      communityId,
    });

    if (!validateCommunityId(communityId)) {
      return NextResponse.json(
        { success: false, error: "Invalid community ID" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const includeGroups = searchParams.get("includeGroups") === "true";

    // Fetch community from database
    const { data } = await apolloClient.query({
      query: includeGroups
        ? GET_COMMUNITY_WITH_GROUPS_QUERY
        : GET_COMMUNITY_QUERY,
      variables: { communityId },
      fetchPolicy: "network-only",
    });

    const community = data?.nchat_communities_by_pk;
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 },
      );
    }

    const transformedCommunity = transformCommunity(community);

    // Add groups if included
    if (includeGroups && community.groups) {
      (transformedCommunity as Record<string, unknown>).groups =
        community.groups.map((g: Record<string, unknown>) => ({
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
                memberCount: (g.channel as Record<string, unknown>)
                  .member_count,
                lastMessageAt: (g.channel as Record<string, unknown>)
                  .last_message_at,
              }
            : null,
        }));
    }

    // Add announcement channel info
    if (community.announcement_channel) {
      (transformedCommunity as Record<string, unknown>).announcementChannel = {
        id: community.announcement_channel.id,
        name: community.announcement_channel.name,
        slug: community.announcement_channel.slug,
        description: community.announcement_channel.description,
      };
    }

    logger.info("GET /api/channels/communities/[id] - Success", {
      communityId,
    });

    return NextResponse.json({
      success: true,
      community: transformedCommunity,
    });
  } catch (error) {
    const { id: communityId } = await params;
    logger.error("Error fetching community", error as Error, { communityId });
    return NextResponse.json(
      { success: false, error: "Failed to fetch community" },
      { status: 500 },
    );
  }
}

// =============================================================================
// PATCH /api/channels/communities/[id]
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: communityId } = await params;

    logger.info("PATCH /api/channels/communities/[id] - Update community", {
      communityId,
    });

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
    const validation = updateCommunitySchema.safeParse(body);

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

    const updates = validation.data;

    // Verify community exists and user is creator
    const { data: checkData } = await apolloClient.query({
      query: GET_COMMUNITY_CREATOR_QUERY,
      variables: { communityId },
      fetchPolicy: "network-only",
    });

    const community = checkData?.nchat_communities_by_pk;
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 },
      );
    }

    if (community.created_by !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the community creator can update it" },
        { status: 403 },
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.iconUrl !== undefined) updateData.icon_url = updates.iconUrl;
    if (updates.addGroupsPermission !== undefined)
      updateData.add_groups_permission = updates.addGroupsPermission;
    if (updates.membersCanInvite !== undefined)
      updateData.members_can_invite = updates.membersCanInvite;
    if (updates.approvalRequired !== undefined)
      updateData.approval_required = updates.approvalRequired;
    if (updates.eventsEnabled !== undefined)
      updateData.events_enabled = updates.eventsEnabled;
    if (updates.maxGroups !== undefined)
      updateData.max_groups = updates.maxGroups;
    if (updates.maxMembers !== undefined)
      updateData.max_members = updates.maxMembers;

    // Update community
    const { data: updateResult } = await apolloClient.mutate({
      mutation: UPDATE_COMMUNITY_MUTATION,
      variables: { communityId, updates: updateData },
    });

    const updatedCommunity = updateResult?.update_nchat_communities_by_pk;

    logger.info("PATCH /api/channels/communities/[id] - Success", {
      communityId,
      updatedBy: userId,
      fields: Object.keys(updates),
    });

    return NextResponse.json({
      success: true,
      community: transformCommunity(updatedCommunity),
      message: "Community updated successfully",
    });
  } catch (error) {
    const { id: communityId } = await params;
    logger.error("Error updating community", error as Error, { communityId });
    return NextResponse.json(
      { success: false, error: "Failed to update community" },
      { status: 500 },
    );
  }
}

// =============================================================================
// DELETE /api/channels/communities/[id]
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: communityId } = await params;

    logger.info("DELETE /api/channels/communities/[id] - Delete community", {
      communityId,
    });

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

    // Verify community exists and user is creator
    const { data: checkData } = await apolloClient.query({
      query: GET_COMMUNITY_CREATOR_QUERY,
      variables: { communityId },
      fetchPolicy: "network-only",
    });

    const community = checkData?.nchat_communities_by_pk;
    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 },
      );
    }

    if (community.created_by !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the community creator can delete it" },
        { status: 403 },
      );
    }

    // Delete community groups first
    await apolloClient.mutate({
      mutation: DELETE_COMMUNITY_GROUPS_MUTATION,
      variables: { communityId },
    });

    // Delete the community
    await apolloClient.mutate({
      mutation: DELETE_COMMUNITY_MUTATION,
      variables: { communityId },
    });

    // Optionally delete the announcement channel
    if (community.announcement_channel_id) {
      await apolloClient.mutate({
        mutation: DELETE_ANNOUNCEMENT_CHANNEL_MUTATION,
        variables: { channelId: community.announcement_channel_id },
      });
    }

    logger.info("DELETE /api/channels/communities/[id] - Success", {
      communityId,
      name: community.name,
      deletedBy: userId,
    });

    return NextResponse.json({
      success: true,
      message: "Community deleted successfully",
      communityId,
      communityName: community.name,
    });
  } catch (error) {
    const { id: communityId } = await params;
    logger.error("Error deleting community", error as Error, { communityId });
    return NextResponse.json(
      { success: false, error: "Failed to delete community" },
      { status: 500 },
    );
  }
}

// =============================================================================
// GraphQL Queries and Mutations
// =============================================================================

const GET_COMMUNITY_QUERY = gql`
  query GetCommunity($communityId: uuid!) {
    nchat_communities_by_pk(id: $communityId) {
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
    }
  }
`;

const GET_COMMUNITY_WITH_GROUPS_QUERY = gql`
  query GetCommunityWithGroups($communityId: uuid!) {
    nchat_communities_by_pk(id: $communityId) {
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
  }
`;

const GET_COMMUNITY_CREATOR_QUERY = gql`
  query GetCommunityCreator($communityId: uuid!) {
    nchat_communities_by_pk(id: $communityId) {
      id
      name
      created_by
      announcement_channel_id
    }
  }
`;

const UPDATE_COMMUNITY_MUTATION = gql`
  mutation UpdateCommunity(
    $communityId: uuid!
    $updates: nchat_communities_set_input!
  ) {
    update_nchat_communities_by_pk(
      pk_columns: { id: $communityId }
      _set: $updates
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

const DELETE_COMMUNITY_GROUPS_MUTATION = gql`
  mutation DeleteCommunityGroups($communityId: uuid!) {
    delete_nchat_community_groups(
      where: { community_id: { _eq: $communityId } }
    ) {
      affected_rows
    }
  }
`;

const DELETE_COMMUNITY_MUTATION = gql`
  mutation DeleteCommunity($communityId: uuid!) {
    delete_nchat_communities_by_pk(id: $communityId) {
      id
    }
  }
`;

const DELETE_ANNOUNCEMENT_CHANNEL_MUTATION = gql`
  mutation DeleteAnnouncementChannel($channelId: uuid!) {
    delete_nchat_channels_by_pk(id: $channelId) {
      id
    }
  }
`;
