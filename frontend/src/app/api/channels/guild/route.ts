/**
 * Guild/Server Management API (Discord-style)
 * GET /api/channels/guild - List guilds
 * POST /api/channels/guild - Create guild
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { apolloClient } from "@/lib/apollo-client";
import {
  createGuildStructure,
  validateGuildSettings,
  generateGuildSlug,
} from "@/services/channels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Schema validation
const createGuildSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  vanityUrl: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  template: z
    .enum(["default", "community", "gaming", "study", "blank"])
    .default("default"),
  isDiscoverable: z.boolean().default(false),
  verificationLevel: z.number().int().min(0).max(4).default(0),
  explicitContentFilter: z.number().int().min(0).max(2).default(0),
  maxMembers: z.number().int().min(10).max(500000).default(5000),
  maxChannels: z.number().int().min(10).max(500).default(100),
  maxFileSizeMb: z.number().int().min(8).max(1024).default(25),
});

const guildFiltersSchema = z.object({
  organizationId: z.string().uuid().optional(),
  isDiscoverable: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// Helper functions
function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

function getOrganizationIdFromRequest(request: NextRequest): string {
  return (
    request.headers.get("x-organization-id") ||
    "ffffffff-ffff-ffff-ffff-ffffffffffff"
  );
}

/**
 * GET /api/channels/guild
 * List guilds/servers
 */
export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/channels/guild - List guilds");

    const { searchParams } = new URL(request.url);
    const filters = guildFiltersSchema.parse({
      organizationId: searchParams.get("organizationId") || undefined,
      isDiscoverable: searchParams.get("isDiscoverable") === "true",
      limit: Number(searchParams.get("limit")) || 20,
      offset: Number(searchParams.get("offset")) || 0,
    });

    const userId = getUserIdFromRequest(request);

    // Query guilds from database via GraphQL
    const { data } = await apolloClient.query({
      query: GET_GUILDS_QUERY,
      variables: {
        organizationId: filters.organizationId,
        isDiscoverable: filters.isDiscoverable || undefined,
        userId: userId,
        limit: filters.limit,
        offset: filters.offset,
      },
      fetchPolicy: "network-only",
    });

    const guilds = (data?.nchat_workspaces || []).map(transformGuild);
    const total =
      data?.nchat_workspaces_aggregate?.aggregate?.count || guilds.length;

    logger.info("GET /api/channels/guild - Success", {
      total,
      returned: guilds.length,
    });

    return NextResponse.json({
      success: true,
      guilds,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total,
        hasMore: filters.offset + filters.limit < total,
      },
    });
  } catch (error) {
    logger.error("Error fetching guilds:", error as Error);
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
      { success: false, error: "Failed to fetch guilds" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/channels/guild
 * Create a new guild/server with default channels and categories
 */
export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/channels/guild - Create guild");

    // Get user from auth
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const organizationId = getOrganizationIdFromRequest(request);

    // Parse and validate request body
    const body = await request.json();
    const validation = createGuildSchema.safeParse(body);

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

    // Validate guild settings
    const settingsValidation = validateGuildSettings({
      name: data.name,
      slug: data.slug,
      vanityUrl: data.vanityUrl,
      ownerId: userId,
      organizationId,
      template: data.template,
      verificationLevel: data.verificationLevel,
      explicitContentFilter: data.explicitContentFilter,
      isDiscoverable: data.isDiscoverable,
      maxMembers: data.maxMembers,
      maxChannels: data.maxChannels,
      maxFileSizeMb: data.maxFileSizeMb,
    });

    if (!settingsValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid guild settings",
          details: settingsValidation.errors,
        },
        { status: 400 },
      );
    }

    // Generate slug if not provided
    const slug = data.slug || generateGuildSlug(data.name);

    // Check if slug is unique
    const { data: existingData } = await apolloClient.query({
      query: CHECK_GUILD_SLUG_QUERY,
      variables: { slug, organizationId },
      fetchPolicy: "network-only",
    });

    if (existingData?.nchat_workspaces?.length > 0) {
      return NextResponse.json(
        { success: false, error: "Guild slug already exists" },
        { status: 409 },
      );
    }

    // Check if vanity URL is unique (if provided)
    if (data.vanityUrl) {
      const { data: vanityData } = await apolloClient.query({
        query: CHECK_VANITY_URL_QUERY,
        variables: { vanityUrl: data.vanityUrl },
        fetchPolicy: "network-only",
      });

      if (vanityData?.nchat_workspaces?.length > 0) {
        return NextResponse.json(
          { success: false, error: "Vanity URL already taken" },
          { status: 409 },
        );
      }
    }

    // Create guild structure from template
    const guildStructure = createGuildStructure({
      name: data.name,
      slug,
      description: data.description,
      iconUrl: data.iconUrl,
      bannerUrl: data.bannerUrl,
      vanityUrl: data.vanityUrl,
      ownerId: userId,
      organizationId,
      template: data.template,
      verificationLevel: data.verificationLevel,
      explicitContentFilter: data.explicitContentFilter,
      isDiscoverable: data.isDiscoverable,
      maxMembers: data.maxMembers,
      maxChannels: data.maxChannels,
      maxFileSizeMb: data.maxFileSizeMb,
    });

    // Insert guild, categories, channels, and owner membership in a transaction
    const { data: insertData } = await apolloClient.mutate({
      mutation: CREATE_GUILD_MUTATION,
      variables: {
        guild: {
          organization_id: organizationId,
          name: guildStructure.guild.name,
          slug: guildStructure.guild.slug,
          description: guildStructure.guild.description,
          icon_url: guildStructure.guild.iconUrl,
          banner_url: guildStructure.guild.bannerUrl,
          vanity_url: guildStructure.guild.vanityUrl,
          is_discoverable: guildStructure.guild.isDiscoverable,
          verification_level: guildStructure.guild.verificationLevel,
          explicit_content_filter: guildStructure.guild.explicitContentFilter,
          max_members: guildStructure.guild.maxMembers,
          max_channels: guildStructure.guild.maxChannels,
          max_file_size_mb: guildStructure.guild.maxFileSizeMb,
          owner_id: userId,
          member_count: 1,
          boost_tier: 0,
          boost_count: 0,
          is_active: true,
          settings: {},
          features: {},
        },
      },
    });

    const createdGuild = insertData?.insert_nchat_workspaces_one;
    if (!createdGuild) {
      throw new Error("Failed to create guild");
    }

    const guildId = createdGuild.id;

    // Create categories
    const categoryInserts = guildStructure.categories.map((cat) => ({
      workspace_id: guildId,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      position: cat.position,
      sync_permissions: true,
      is_system: false,
    }));

    let categoryMap = new Map<string, string>();

    if (categoryInserts.length > 0) {
      const { data: catData } = await apolloClient.mutate({
        mutation: CREATE_CATEGORIES_MUTATION,
        variables: { categories: categoryInserts },
      });

      const createdCategories =
        catData?.insert_nchat_categories?.returning || [];
      createdCategories.forEach((cat: { id: string; name: string }) => {
        categoryMap.set(cat.name, cat.id);
      });
    }

    // Create channels
    const channelInserts = guildStructure.channels.map((ch) => {
      const catId = ch.categoryId
        ? categoryMap.get(ch.categoryId) || null
        : null;
      return {
        workspace_id: guildId,
        category_id: catId,
        name: ch.name,
        slug: ch.slug,
        topic: ch.topic,
        type: ch.type,
        position: ch.position,
        is_default: ch.isDefault,
        is_readonly: ch.isReadonly,
        is_nsfw: ch.isNsfw,
        max_members: ch.maxMembers,
        slowmode_seconds: ch.slowmodeSeconds,
        created_by: userId,
        member_count: 1,
        message_count: 0,
      };
    });

    let systemChannelId: string | null = null;
    let rulesChannelId: string | null = null;

    if (channelInserts.length > 0) {
      const { data: chData } = await apolloClient.mutate({
        mutation: CREATE_CHANNELS_MUTATION,
        variables: { channels: channelInserts },
      });

      const createdChannels = chData?.insert_nchat_channels?.returning || [];

      // Find default and rules channels
      const defaultChannel = createdChannels.find(
        (c: { is_default: boolean }) => c.is_default,
      );
      const rulesChannel = createdChannels.find(
        (c: { name: string }) => c.name === "rules",
      );

      systemChannelId = defaultChannel?.id || createdChannels[0]?.id;
      rulesChannelId = rulesChannel?.id;
    }

    // Update guild with system and rules channel IDs
    if (systemChannelId || rulesChannelId) {
      await apolloClient.mutate({
        mutation: UPDATE_GUILD_CHANNELS_MUTATION,
        variables: {
          guildId,
          systemChannelId,
          rulesChannelId,
        },
      });
    }

    // Add creator as owner member
    await apolloClient.mutate({
      mutation: ADD_GUILD_MEMBER_MUTATION,
      variables: {
        workspaceId: guildId,
        userId,
        role: "owner",
      },
    });

    logger.info("POST /api/channels/guild - Guild created", {
      guildId,
      name: data.name,
      template: data.template,
      createdBy: userId,
    });

    return NextResponse.json(
      {
        success: true,
        guild: {
          ...transformGuild(createdGuild),
          systemChannelId,
          rulesChannelId,
        },
        message: "Guild created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating guild:", error as Error);
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
      { success: false, error: "Failed to create guild" },
      { status: 500 },
    );
  }
}

// =============================================================================
// GraphQL Queries and Mutations
// =============================================================================

import { gql } from "@apollo/client";

const GET_GUILDS_QUERY = gql`
  query GetGuilds(
    $organizationId: uuid
    $isDiscoverable: Boolean
    $userId: uuid
    $limit: Int!
    $offset: Int!
  ) {
    nchat_workspaces(
      where: {
        _and: [
          { organization_id: { _eq: $organizationId } }
          { is_active: { _eq: true } }
          {
            _or: [
              { is_discoverable: { _eq: $isDiscoverable } }
              { members: { user_id: { _eq: $userId } } }
            ]
          }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
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
    }
    nchat_workspaces_aggregate(
      where: {
        _and: [
          { organization_id: { _eq: $organizationId } }
          { is_active: { _eq: true } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const CHECK_GUILD_SLUG_QUERY = gql`
  query CheckGuildSlug($slug: String!, $organizationId: uuid!) {
    nchat_workspaces(
      where: { slug: { _eq: $slug }, organization_id: { _eq: $organizationId } }
    ) {
      id
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

const CREATE_GUILD_MUTATION = gql`
  mutation CreateGuild($guild: nchat_workspaces_insert_input!) {
    insert_nchat_workspaces_one(object: $guild) {
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
    }
  }
`;

const CREATE_CATEGORIES_MUTATION = gql`
  mutation CreateCategories($categories: [nchat_categories_insert_input!]!) {
    insert_nchat_categories(objects: $categories) {
      returning {
        id
        name
        position
      }
    }
  }
`;

const CREATE_CHANNELS_MUTATION = gql`
  mutation CreateChannels($channels: [nchat_channels_insert_input!]!) {
    insert_nchat_channels(objects: $channels) {
      returning {
        id
        name
        slug
        type
        is_default
        position
      }
    }
  }
`;

const UPDATE_GUILD_CHANNELS_MUTATION = gql`
  mutation UpdateGuildChannels(
    $guildId: uuid!
    $systemChannelId: uuid
    $rulesChannelId: uuid
  ) {
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $guildId }
      _set: {
        system_channel_id: $systemChannelId
        rules_channel_id: $rulesChannelId
      }
    ) {
      id
    }
  }
`;

const ADD_GUILD_MEMBER_MUTATION = gql`
  mutation AddGuildMember($workspaceId: uuid!, $userId: uuid!, $role: String!) {
    insert_nchat_workspace_members_one(
      object: { workspace_id: $workspaceId, user_id: $userId, role: $role }
    ) {
      id
    }
  }
`;

// =============================================================================
// Helper Functions
// =============================================================================

function transformGuild(raw: Record<string, unknown>) {
  return {
    id: raw.id,
    organizationId: raw.organization_id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    iconUrl: raw.icon_url,
    bannerUrl: raw.banner_url,
    vanityUrl: raw.vanity_url,
    isDiscoverable: raw.is_discoverable,
    verificationLevel: raw.verification_level,
    explicitContentFilter: raw.explicit_content_filter,
    systemChannelId: raw.system_channel_id,
    rulesChannelId: raw.rules_channel_id,
    memberCount: raw.member_count,
    boostTier: raw.boost_tier,
    boostCount: raw.boost_count,
    maxMembers: raw.max_members,
    maxChannels: raw.max_channels,
    maxFileSizeMb: raw.max_file_size_mb,
    ownerId: raw.owner_id,
    isActive: raw.is_active,
    settings: raw.settings,
    features: raw.features,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}
