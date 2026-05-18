/**
 * Single Guild/Server API
 * GET /api/channels/guild/[id] - Get guild details
 * PATCH /api/channels/guild/[id] - Update guild
 * DELETE /api/channels/guild/[id] - Delete guild
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gql } from "@apollo/client";
import { logger } from "@/lib/logger";
import { apolloClient } from "@/lib/apollo-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Schema validation
const updateGuildSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  iconUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  vanityUrl: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .nullable(),
  isDiscoverable: z.boolean().optional(),
  verificationLevel: z.number().int().min(0).max(4).optional(),
  explicitContentFilter: z.number().int().min(0).max(2).optional(),
  maxMembers: z.number().int().min(10).max(500000).optional(),
  maxChannels: z.number().int().min(10).max(500).optional(),
  maxFileSizeMb: z.number().int().min(8).max(1024).optional(),
  systemChannelId: z.string().uuid().optional().nullable(),
  rulesChannelId: z.string().uuid().optional().nullable(),
  settings: z.record(z.any()).optional(),
  features: z.record(z.any()).optional(),
});

// Helper functions
function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

function validateGuildId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * GET /api/channels/guild/[id]
 * Get guild details with all channels and categories
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: guildId } = await params;

    logger.info("GET /api/channels/guild/[id] - Get guild details", {
      guildId,
    });

    // Validate guild ID
    if (!validateGuildId(guildId)) {
      return NextResponse.json(
        { success: false, error: "Invalid guild ID" },
        { status: 400 },
      );
    }

    const userId = getUserIdFromRequest(request);

    // Fetch guild from database with all related data
    const { data } = await apolloClient.query({
      query: GET_GUILD_DETAILS_QUERY,
      variables: { guildId },
      fetchPolicy: "network-only",
    });

    const guild = data?.nchat_workspaces_by_pk;
    if (!guild) {
      return NextResponse.json(
        { success: false, error: "Guild not found" },
        { status: 404 },
      );
    }

    // Check if user has access (is member or guild is discoverable)
    if (userId) {
      const isMember = guild.members?.some(
        (m: { user_id: string }) => m.user_id === userId,
      );
      if (!isMember && !guild.is_discoverable) {
        return NextResponse.json(
          { success: false, error: "Access denied" },
          { status: 403 },
        );
      }
    } else if (!guild.is_discoverable) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Transform the guild data
    const transformedGuild = {
      id: guild.id,
      organizationId: guild.organization_id,
      name: guild.name,
      slug: guild.slug,
      description: guild.description,
      iconUrl: guild.icon_url,
      bannerUrl: guild.banner_url,
      vanityUrl: guild.vanity_url,
      isDiscoverable: guild.is_discoverable,
      verificationLevel: guild.verification_level,
      explicitContentFilter: guild.explicit_content_filter,
      systemChannelId: guild.system_channel_id,
      rulesChannelId: guild.rules_channel_id,
      memberCount: guild.member_count,
      onlineMemberCount: guild.members_aggregate?.aggregate?.count || 0,
      boostTier: guild.boost_tier,
      boostCount: guild.boost_count,
      maxMembers: guild.max_members,
      maxChannels: guild.max_channels,
      maxFileSizeMb: guild.max_file_size_mb,
      ownerId: guild.owner_id,
      isActive: guild.is_active,
      createdAt: guild.created_at,
      updatedAt: guild.updated_at,
      settings: guild.settings || {},
      features: guild.features || {},
      categories: (guild.categories || []).map(
        (cat: Record<string, unknown>) => ({
          id: cat.id,
          workspaceId: cat.workspace_id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          position: cat.position,
          isCollapsed: cat.is_collapsed || false,
          channels: ((cat.channels as Record<string, unknown>[]) || []).map(
            (ch) => ({
              id: ch.id,
              name: ch.name,
              slug: ch.slug,
              type: ch.type,
              position: ch.position,
              isDefault: ch.is_default,
              isReadonly: ch.is_readonly,
              topic: ch.topic,
              memberCount: ch.member_count,
              lastMessageAt: ch.last_message_at,
            }),
          ),
        }),
      ),
      uncategorizedChannels: (guild.uncategorized_channels || []).map(
        (ch: Record<string, unknown>) => ({
          id: ch.id,
          name: ch.name,
          slug: ch.slug,
          type: ch.type,
          position: ch.position,
          isDefault: ch.is_default,
          isReadonly: ch.is_readonly,
        }),
      ),
      roles: (guild.roles || []).map((role: Record<string, unknown>) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: role.permissions,
      })),
    };

    logger.info("GET /api/channels/guild/[id] - Success", { guildId });

    return NextResponse.json({
      success: true,
      guild: transformedGuild,
    });
  } catch (error) {
    const { id: guildId } = await params;
    logger.error("Error fetching guild", error as Error, { guildId });
    return NextResponse.json(
      { success: false, error: "Failed to fetch guild" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/channels/guild/[id]
 * Update guild settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: guildId } = await params;

    logger.info("PATCH /api/channels/guild/[id] - Update guild", { guildId });

    // Validate guild ID
    if (!validateGuildId(guildId)) {
      return NextResponse.json(
        { success: false, error: "Invalid guild ID" },
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
    const validation = updateGuildSchema.safeParse(body);

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

    // Fetch guild and verify permissions
    const { data: guildData } = await apolloClient.query({
      query: GET_GUILD_WITH_MEMBERSHIP_QUERY,
      variables: { guildId, userId },
      fetchPolicy: "network-only",
    });

    const guild = guildData?.nchat_workspaces_by_pk;
    if (!guild) {
      return NextResponse.json(
        { success: false, error: "Guild not found" },
        { status: 404 },
      );
    }

    // Check if user is owner or admin
    const membership = guild.members?.[0];
    const isOwner = guild.owner_id === userId;
    const isAdmin = membership?.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Check vanity URL uniqueness if being updated
    if (updates.vanityUrl && updates.vanityUrl !== guild.vanity_url) {
      const { data: vanityData } = await apolloClient.query({
        query: CHECK_VANITY_URL_QUERY,
        variables: { vanityUrl: updates.vanityUrl },
        fetchPolicy: "network-only",
      });

      if (vanityData?.nchat_workspaces?.length > 0) {
        return NextResponse.json(
          { success: false, error: "Vanity URL already taken" },
          { status: 409 },
        );
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.iconUrl !== undefined) updateData.icon_url = updates.iconUrl;
    if (updates.bannerUrl !== undefined)
      updateData.banner_url = updates.bannerUrl;
    if (updates.vanityUrl !== undefined)
      updateData.vanity_url = updates.vanityUrl;
    if (updates.isDiscoverable !== undefined)
      updateData.is_discoverable = updates.isDiscoverable;
    if (updates.verificationLevel !== undefined)
      updateData.verification_level = updates.verificationLevel;
    if (updates.explicitContentFilter !== undefined)
      updateData.explicit_content_filter = updates.explicitContentFilter;
    if (updates.maxMembers !== undefined)
      updateData.max_members = updates.maxMembers;
    if (updates.maxChannels !== undefined)
      updateData.max_channels = updates.maxChannels;
    if (updates.maxFileSizeMb !== undefined)
      updateData.max_file_size_mb = updates.maxFileSizeMb;
    if (updates.systemChannelId !== undefined)
      updateData.system_channel_id = updates.systemChannelId;
    if (updates.rulesChannelId !== undefined)
      updateData.rules_channel_id = updates.rulesChannelId;
    if (updates.settings !== undefined) updateData.settings = updates.settings;
    if (updates.features !== undefined) updateData.features = updates.features;

    // Update guild in database
    const { data: updateResult } = await apolloClient.mutate({
      mutation: UPDATE_GUILD_MUTATION,
      variables: { guildId, updates: updateData },
    });

    const updatedGuild = updateResult?.update_nchat_workspaces_by_pk;

    logger.info("PATCH /api/channels/guild/[id] - Success", {
      guildId,
      updatedBy: userId,
      fields: Object.keys(updates),
    });

    return NextResponse.json({
      success: true,
      guild: {
        id: updatedGuild.id,
        organizationId: updatedGuild.organization_id,
        name: updatedGuild.name,
        description: updatedGuild.description,
        iconUrl: updatedGuild.icon_url,
        bannerUrl: updatedGuild.banner_url,
        vanityUrl: updatedGuild.vanity_url,
        isDiscoverable: updatedGuild.is_discoverable,
        verificationLevel: updatedGuild.verification_level,
        explicitContentFilter: updatedGuild.explicit_content_filter,
        systemChannelId: updatedGuild.system_channel_id,
        rulesChannelId: updatedGuild.rules_channel_id,
        maxMembers: updatedGuild.max_members,
        maxChannels: updatedGuild.max_channels,
        maxFileSizeMb: updatedGuild.max_file_size_mb,
        settings: updatedGuild.settings,
        features: updatedGuild.features,
        updatedAt: updatedGuild.updated_at,
      },
      message: "Guild updated successfully",
    });
  } catch (error) {
    const { id: guildId } = await params;
    logger.error("Error updating guild", error as Error, { guildId });
    return NextResponse.json(
      { success: false, error: "Failed to update guild" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/channels/guild/[id]
 * Delete guild (owner only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: guildId } = await params;

    logger.info("DELETE /api/channels/guild/[id] - Delete guild", { guildId });

    // Validate guild ID
    if (!validateGuildId(guildId)) {
      return NextResponse.json(
        { success: false, error: "Invalid guild ID" },
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

    // Fetch guild and verify ownership
    const { data: guildData } = await apolloClient.query({
      query: GET_GUILD_OWNER_QUERY,
      variables: { guildId },
      fetchPolicy: "network-only",
    });

    const guild = guildData?.nchat_workspaces_by_pk;
    if (!guild) {
      return NextResponse.json(
        { success: false, error: "Guild not found" },
        { status: 404 },
      );
    }

    // Only owner can delete guild
    if (guild.owner_id !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the guild owner can delete the guild" },
        { status: 403 },
      );
    }

    // Check for hard delete flag
    const searchParams = request.nextUrl.searchParams;
    const hardDelete = searchParams.get("hardDelete") === "true";

    if (hardDelete) {
      // Hard delete: Remove all related data
      // First, delete channels
      await apolloClient.mutate({
        mutation: DELETE_GUILD_CHANNELS_MUTATION,
        variables: { workspaceId: guildId },
      });

      // Delete categories
      await apolloClient.mutate({
        mutation: DELETE_GUILD_CATEGORIES_MUTATION,
        variables: { workspaceId: guildId },
      });

      // Delete members
      await apolloClient.mutate({
        mutation: DELETE_GUILD_MEMBERS_MUTATION,
        variables: { workspaceId: guildId },
      });

      // Finally, delete the guild
      await apolloClient.mutate({
        mutation: DELETE_GUILD_MUTATION,
        variables: { guildId },
      });

      logger.warn("DELETE /api/channels/guild/[id] - Guild hard deleted", {
        guildId,
        guildName: guild.name,
        deletedBy: userId,
      });
    } else {
      // Soft delete: Set isActive = false
      await apolloClient.mutate({
        mutation: SOFT_DELETE_GUILD_MUTATION,
        variables: { guildId },
      });

      logger.info("DELETE /api/channels/guild/[id] - Guild soft deleted", {
        guildId,
        deletedBy: userId,
      });
    }

    return NextResponse.json({
      success: true,
      message: hardDelete
        ? "Guild deleted permanently"
        : "Guild deactivated successfully",
      guildId,
      guildName: guild.name,
    });
  } catch (error) {
    const { id: guildId } = await params;
    logger.error("Error deleting guild", error as Error, { guildId });
    return NextResponse.json(
      { success: false, error: "Failed to delete guild" },
      { status: 500 },
    );
  }
}

// =============================================================================
// GraphQL Queries and Mutations
// =============================================================================

const GET_GUILD_DETAILS_QUERY = gql`
  query GetGuildDetails($guildId: uuid!) {
    nchat_workspaces_by_pk(id: $guildId) {
      id
      organization_id
      name
      slug
      description
      icon_url
      banner_url
      vanity_url
      is_discoverable
      verification_level
      explicit_content_filter
      system_channel_id
      rules_channel_id
      member_count
      boost_tier
      boost_count
      max_members
      max_channels
      max_file_size_mb
      owner_id
      is_active
      settings
      features
      created_at
      updated_at
      members: nchat_workspace_members(limit: 1) {
        user_id
        role
      }
      members_aggregate {
        aggregate {
          count
        }
      }
      categories: nchat_categories(order_by: { position: asc }) {
        id
        workspace_id
        name
        description
        icon
        position
        is_collapsed
        channels: nchat_channels(order_by: { position: asc }) {
          id
          name
          slug
          type
          position
          is_default
          is_readonly
          topic
          member_count
          last_message_at
        }
      }
      uncategorized_channels: nchat_channels(
        where: { category_id: { _is_null: true } }
        order_by: { position: asc }
      ) {
        id
        name
        slug
        type
        position
        is_default
        is_readonly
      }
      roles: nchat_roles(order_by: { position: desc }) {
        id
        name
        color
        position
        permissions
      }
    }
  }
`;

const GET_GUILD_WITH_MEMBERSHIP_QUERY = gql`
  query GetGuildWithMembership($guildId: uuid!, $userId: uuid!) {
    nchat_workspaces_by_pk(id: $guildId) {
      id
      owner_id
      vanity_url
      members: nchat_workspace_members(where: { user_id: { _eq: $userId } }) {
        user_id
        role
      }
    }
  }
`;

const GET_GUILD_OWNER_QUERY = gql`
  query GetGuildOwner($guildId: uuid!) {
    nchat_workspaces_by_pk(id: $guildId) {
      id
      name
      owner_id
    }
  }
`;

const CHECK_VANITY_URL_QUERY = gql`
  query CheckVanityUrl($vanityUrl: String!) {
    nchat_workspaces(where: { vanity_url: { _eq: $vanityUrl } }) {
      id
    }
  }
`;

const UPDATE_GUILD_MUTATION = gql`
  mutation UpdateGuild($guildId: uuid!, $updates: nchat_workspaces_set_input!) {
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $guildId }
      _set: $updates
    ) {
      id
      organization_id
      name
      description
      icon_url
      banner_url
      vanity_url
      is_discoverable
      verification_level
      explicit_content_filter
      system_channel_id
      rules_channel_id
      max_members
      max_channels
      max_file_size_mb
      settings
      features
      updated_at
    }
  }
`;

const DELETE_GUILD_CHANNELS_MUTATION = gql`
  mutation DeleteGuildChannels($workspaceId: uuid!) {
    delete_nchat_channels(where: { workspace_id: { _eq: $workspaceId } }) {
      affected_rows
    }
  }
`;

const DELETE_GUILD_CATEGORIES_MUTATION = gql`
  mutation DeleteGuildCategories($workspaceId: uuid!) {
    delete_nchat_categories(where: { workspace_id: { _eq: $workspaceId } }) {
      affected_rows
    }
  }
`;

const DELETE_GUILD_MEMBERS_MUTATION = gql`
  mutation DeleteGuildMembers($workspaceId: uuid!) {
    delete_nchat_workspace_members(
      where: { workspace_id: { _eq: $workspaceId } }
    ) {
      affected_rows
    }
  }
`;

const DELETE_GUILD_MUTATION = gql`
  mutation DeleteGuild($guildId: uuid!) {
    delete_nchat_workspaces_by_pk(id: $guildId) {
      id
    }
  }
`;

const SOFT_DELETE_GUILD_MUTATION = gql`
  mutation SoftDeleteGuild($guildId: uuid!) {
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $guildId }
      _set: { is_active: false, deleted_at: "now()" }
    ) {
      id
    }
  }
`;
