/**
 * Channel Category Assignment API
 *
 * PUT /api/channels/[id]/category - Assign channel to category
 * DELETE /api/channels/[id]/category - Remove channel from category
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import type { UserRole } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AssignCategorySchema = z.object({
  categoryId: z.string().uuid("Invalid category ID"),
  position: z.number().int().min(0).optional(),
  reorderExisting: z.boolean().default(true),
});

// ============================================================================
// GRAPHQL OPERATIONS
// ============================================================================

const UPDATE_CHANNEL_CATEGORY = gql`
  mutation UpdateChannelCategory(
    $channelId: uuid!
    $categoryId: uuid!
    $position: Int
  ) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: {
        category_id: $categoryId
        position: $position
        updated_at: "now()"
      }
    ) {
      id
      name
      slug
      category_id
      position
      updated_at
    }
  }
`;

const REMOVE_CHANNEL_CATEGORY = gql`
  mutation RemoveChannelCategory($channelId: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { category_id: null, updated_at: "now()" }
    ) {
      id
      name
      slug
      category_id
      updated_at
    }
  }
`;

const GET_CHANNEL_WITH_CATEGORY = gql`
  query GetChannelWithCategory($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      id
      name
      slug
      category_id
      position
      workspace_id
      category {
        id
        name
        workspace_id
      }
    }
  }
`;

const GET_CATEGORY_CHANNELS = gql`
  query GetCategoryChannels($categoryId: uuid!) {
    nchat_channels(
      where: { category_id: { _eq: $categoryId }, is_archived: { _eq: false } }
      order_by: { position: asc }
    ) {
      id
      position
    }
  }
`;

const REORDER_CHANNELS_IN_CATEGORY = gql`
  mutation ReorderChannelsInCategory($updates: [nchat_channels_updates!]!) {
    update_nchat_channels_many(updates: $updates) {
      affected_rows
    }
  }
`;

const VERIFY_CATEGORY_EXISTS = gql`
  query VerifyCategoryExists($categoryId: uuid!, $workspaceId: uuid) {
    nchat_channel_categories(
      where: { id: { _eq: $categoryId }, workspace_id: { _eq: $workspaceId } }
      limit: 1
    ) {
      id
      workspace_id
      name
    }
  }
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user ID from request headers
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get("x-user-id");
  if (userId) return userId;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    // Placeholder - implement proper JWT decoding
    return null;
  }

  return null;
}

/**
 * Get user role from request headers
 */
function getUserRoleFromRequest(request: NextRequest): UserRole {
  return (request.headers.get("x-user-role") as UserRole) || "guest";
}

/**
 * Check if user can manage channel categories
 */
function canManageChannelCategories(role: UserRole): boolean {
  return ["admin", "owner", "moderator"].includes(role);
}

/**
 * Reorder channels within a category to maintain sequential positions
 */
async function reorderCategoryChannels(
  categoryId: string,
  newChannelId: string,
  requestedPosition?: number,
): Promise<void> {
  // Get all channels in the category
  const { data } = await apolloClient.query({
    query: GET_CATEGORY_CHANNELS,
    variables: { categoryId },
    fetchPolicy: "network-only",
  });

  const channels = data.nchat_channels || [];

  // Filter out the newly assigned channel if it's already in the list
  const existingChannels = channels.filter(
    (ch: { id: string }) => ch.id !== newChannelId,
  );

  // Determine the target position
  const targetPosition = requestedPosition ?? existingChannels.length;

  // Build the new ordered list
  const reorderedChannels = [
    ...existingChannels.slice(0, targetPosition),
    { id: newChannelId, position: targetPosition },
    ...existingChannels.slice(targetPosition),
  ];

  // Update positions for all channels
  const updates = reorderedChannels.map((channel, index) => ({
    where: { id: { _eq: channel.id } },
    _set: { position: index },
  }));

  if (updates.length > 0) {
    await apolloClient.mutate({
      mutation: REORDER_CHANNELS_IN_CATEGORY,
      variables: { updates },
    });
  }
}

// ============================================================================
// PUT /api/channels/[id]/category - Assign channel to category
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const channelId = id;

    logger.info(
      "PUT /api/channels/[id]/category - Assign channel to category",
      {
        channelId,
      },
    );

    // Validate channel ID format
    if (!z.string().uuid().safeParse(channelId).success) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
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

    // Check permissions
    if (!canManageChannelCategories(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions to manage channel categories",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = AssignCategorySchema.safeParse(body);
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

    const { categoryId, position, reorderExisting } = validation.data;

    // Verify channel exists
    const { data: channelData } = await apolloClient.query({
      query: GET_CHANNEL_WITH_CATEGORY,
      variables: { channelId },
      fetchPolicy: "network-only",
    });

    if (!channelData.nchat_channels_by_pk) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    const channel = channelData.nchat_channels_by_pk;

    // Verify category exists and belongs to the same workspace
    const { data: categoryData } = await apolloClient.query({
      query: VERIFY_CATEGORY_EXISTS,
      variables: { categoryId, workspaceId: channel.workspace_id },
      fetchPolicy: "network-only",
    });

    if (!categoryData.nchat_channel_categories?.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Category not found or not in the same workspace",
        },
        { status: 404 },
      );
    }

    // Reorder channels if requested
    if (reorderExisting) {
      await reorderCategoryChannels(categoryId, channelId, position);
    }

    // Update the channel's category
    const { data: updateData } = await apolloClient.mutate({
      mutation: UPDATE_CHANNEL_CATEGORY,
      variables: {
        channelId,
        categoryId,
        position: position ?? 0,
      },
    });

    const updatedChannel = updateData.update_nchat_channels_by_pk;

    logger.info("PUT /api/channels/[id]/category - Success", {
      channelId,
      categoryId,
      position: updatedChannel.position,
    });

    return NextResponse.json({
      success: true,
      channel: updatedChannel,
      message: "Channel assigned to category successfully",
    });
  } catch (error) {
    logger.error("PUT /api/channels/[id]/category - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to assign channel to category",
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

// ============================================================================
// DELETE /api/channels/[id]/category - Remove channel from category
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const channelId = id;

    logger.info(
      "DELETE /api/channels/[id]/category - Remove channel from category",
      {
        channelId,
      },
    );

    // Validate channel ID format
    if (!z.string().uuid().safeParse(channelId).success) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
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

    // Check permissions
    if (!canManageChannelCategories(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions to manage channel categories",
        },
        { status: 403 },
      );
    }

    // Verify channel exists
    const { data: channelData } = await apolloClient.query({
      query: GET_CHANNEL_WITH_CATEGORY,
      variables: { channelId },
      fetchPolicy: "network-only",
    });

    if (!channelData.nchat_channels_by_pk) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    const channel = channelData.nchat_channels_by_pk;

    if (!channel.category_id) {
      return NextResponse.json(
        { success: false, error: "Channel is not assigned to any category" },
        { status: 400 },
      );
    }

    // Remove the channel from its category
    const { data: updateData } = await apolloClient.mutate({
      mutation: REMOVE_CHANNEL_CATEGORY,
      variables: { channelId },
    });

    const updatedChannel = updateData.update_nchat_channels_by_pk;

    logger.info("DELETE /api/channels/[id]/category - Success", {
      channelId,
      removedFromCategory: channel.category_id,
    });

    return NextResponse.json({
      success: true,
      channel: updatedChannel,
      message: "Channel removed from category successfully",
    });
  } catch (error) {
    logger.error("DELETE /api/channels/[id]/category - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove channel from category",
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
