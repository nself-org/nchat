/**
 * Channel Category Assignment API
 * PUT /api/channels/[id]/categories - Move channel to category
 * DELETE /api/channels/[id]/categories - Remove from category
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gql } from "@apollo/client";
import { logger } from "@/lib/logger";
import { apolloClient } from "@/lib/apollo-client";
import type { UserRole } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =============================================================================
// Schema Validation
// =============================================================================

const moveChannelSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  position: z.number().int().min(0).optional(),
});

// =============================================================================
// Helper Functions
// =============================================================================

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

function getUserRoleFromRequest(request: NextRequest): UserRole {
  return (request.headers.get("x-user-role") as UserRole) || "guest";
}

function canManageChannels(role: UserRole): boolean {
  return ["admin", "owner", "moderator"].includes(role);
}

function validateChannelId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// =============================================================================
// PUT /api/channels/[id]/categories
// Move channel to a category (or remove from category if categoryId is null)
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: channelId } = await params;

    logger.info(
      "PUT /api/channels/[id]/categories - Move channel to category",
      { channelId },
    );

    // Validate channel ID
    if (!validateChannelId(channelId)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID" },
        { status: 400 },
      );
    }

    // Get user from auth
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const userRole = getUserRoleFromRequest(request);
    if (!canManageChannels(userRole)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = moveChannelSchema.safeParse(body);

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

    const { categoryId, position } = validation.data;

    // Verify channel exists
    const { data: channelData } = await apolloClient.query({
      query: GET_CHANNEL_QUERY,
      variables: { channelId },
      fetchPolicy: "network-only",
    });

    const channel = channelData?.nchat_channels_by_pk;
    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    // If categoryId provided, verify it exists and belongs to same workspace
    if (categoryId) {
      const { data: categoryData } = await apolloClient.query({
        query: GET_CATEGORY_QUERY,
        variables: { categoryId },
        fetchPolicy: "network-only",
      });

      const category = categoryData?.nchat_categories_by_pk;
      if (!category) {
        return NextResponse.json(
          { success: false, error: "Category not found" },
          { status: 404 },
        );
      }

      if (category.workspace_id !== channel.workspace_id) {
        return NextResponse.json(
          {
            success: false,
            error: "Channel and category must be in the same workspace",
          },
          { status: 400 },
        );
      }
    }

    // Determine position if not provided
    let newPosition = position;
    if (newPosition === undefined) {
      if (categoryId) {
        // Get max position in target category
        const { data: posData } = await apolloClient.query({
          query: GET_MAX_CHANNEL_POSITION_IN_CATEGORY_QUERY,
          variables: { categoryId },
          fetchPolicy: "network-only",
        });
        newPosition =
          (posData?.nchat_channels_aggregate?.aggregate?.max?.position ?? -1) +
          1;
      } else {
        // Get max position for uncategorized channels
        const { data: posData } = await apolloClient.query({
          query: GET_MAX_UNCATEGORIZED_CHANNEL_POSITION_QUERY,
          variables: { workspaceId: channel.workspace_id },
          fetchPolicy: "network-only",
        });
        newPosition =
          (posData?.nchat_channels_aggregate?.aggregate?.max?.position ?? -1) +
          1;
      }
    }

    // Update channel's category and position
    const { data: updateData } = await apolloClient.mutate({
      mutation: UPDATE_CHANNEL_CATEGORY_MUTATION,
      variables: {
        channelId,
        categoryId: categoryId || null,
        position: newPosition,
      },
    });

    const updatedChannel = updateData?.update_nchat_channels_by_pk;

    logger.info("PUT /api/channels/[id]/categories - Success", {
      channelId,
      categoryId: categoryId || null,
      position: newPosition,
      updatedBy: userId,
    });

    return NextResponse.json({
      success: true,
      channel: {
        id: updatedChannel.id,
        name: updatedChannel.name,
        categoryId: updatedChannel.category_id,
        position: updatedChannel.position,
        updatedAt: updatedChannel.updated_at,
      },
      message: categoryId
        ? "Channel moved to category"
        : "Channel removed from category",
    });
  } catch (error) {
    const { id: channelId } = await params;
    logger.error("Error moving channel to category", error as Error, {
      channelId,
    });
    return NextResponse.json(
      { success: false, error: "Failed to move channel" },
      { status: 500 },
    );
  }
}

// =============================================================================
// DELETE /api/channels/[id]/categories
// Remove channel from its category
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: channelId } = await params;

    logger.info(
      "DELETE /api/channels/[id]/categories - Remove channel from category",
      { channelId },
    );

    // Validate channel ID
    if (!validateChannelId(channelId)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID" },
        { status: 400 },
      );
    }

    // Get user from auth
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const userRole = getUserRoleFromRequest(request);
    if (!canManageChannels(userRole)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Verify channel exists
    const { data: channelData } = await apolloClient.query({
      query: GET_CHANNEL_QUERY,
      variables: { channelId },
      fetchPolicy: "network-only",
    });

    const channel = channelData?.nchat_channels_by_pk;
    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    if (!channel.category_id) {
      return NextResponse.json(
        { success: false, error: "Channel is not in any category" },
        { status: 400 },
      );
    }

    // Get position for uncategorized channels
    const { data: posData } = await apolloClient.query({
      query: GET_MAX_UNCATEGORIZED_CHANNEL_POSITION_QUERY,
      variables: { workspaceId: channel.workspace_id },
      fetchPolicy: "network-only",
    });
    const newPosition =
      (posData?.nchat_channels_aggregate?.aggregate?.max?.position ?? -1) + 1;

    // Remove channel from category
    const { data: updateData } = await apolloClient.mutate({
      mutation: UPDATE_CHANNEL_CATEGORY_MUTATION,
      variables: {
        channelId,
        categoryId: null,
        position: newPosition,
      },
    });

    const updatedChannel = updateData?.update_nchat_channels_by_pk;

    logger.info("DELETE /api/channels/[id]/categories - Success", {
      channelId,
      previousCategoryId: channel.category_id,
      removedBy: userId,
    });

    return NextResponse.json({
      success: true,
      channel: {
        id: updatedChannel.id,
        name: updatedChannel.name,
        categoryId: null,
        position: updatedChannel.position,
        updatedAt: updatedChannel.updated_at,
      },
      message: "Channel removed from category",
    });
  } catch (error) {
    const { id: channelId } = await params;
    logger.error("Error removing channel from category", error as Error, {
      channelId,
    });
    return NextResponse.json(
      { success: false, error: "Failed to remove channel from category" },
      { status: 500 },
    );
  }
}

// =============================================================================
// GraphQL Queries and Mutations
// =============================================================================

const GET_CHANNEL_QUERY = gql`
  query GetChannel($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      id
      name
      workspace_id
      category_id
      position
    }
  }
`;

const GET_CATEGORY_QUERY = gql`
  query GetCategory($categoryId: uuid!) {
    nchat_categories_by_pk(id: $categoryId) {
      id
      workspace_id
      name
    }
  }
`;

const GET_MAX_CHANNEL_POSITION_IN_CATEGORY_QUERY = gql`
  query GetMaxChannelPositionInCategory($categoryId: uuid!) {
    nchat_channels_aggregate(where: { category_id: { _eq: $categoryId } }) {
      aggregate {
        max {
          position
        }
      }
    }
  }
`;

const GET_MAX_UNCATEGORIZED_CHANNEL_POSITION_QUERY = gql`
  query GetMaxUncategorizedChannelPosition($workspaceId: uuid!) {
    nchat_channels_aggregate(
      where: {
        workspace_id: { _eq: $workspaceId }
        category_id: { _is_null: true }
      }
    ) {
      aggregate {
        max {
          position
        }
      }
    }
  }
`;

const UPDATE_CHANNEL_CATEGORY_MUTATION = gql`
  mutation UpdateChannelCategory(
    $channelId: uuid!
    $categoryId: uuid
    $position: Int!
  ) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { category_id: $categoryId, position: $position }
    ) {
      id
      name
      category_id
      position
      updated_at
    }
  }
`;
