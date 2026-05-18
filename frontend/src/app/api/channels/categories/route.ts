/**
 * Channel Categories API
 * GET /api/channels/categories - List categories
 * POST /api/channels/categories - Create category
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

const createCategorySchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  position: z.number().int().min(0).optional(),
  syncPermissions: z.boolean().default(true),
});

const listCategoriesSchema = z.object({
  workspaceId: z.string().uuid(),
  includeChannels: z.boolean().default(false),
  includeCollapsed: z.boolean().default(true),
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

function canManageCategories(role: UserRole): boolean {
  return ["admin", "owner"].includes(role);
}

function transformCategory(raw: Record<string, unknown>) {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    name: raw.name,
    description: raw.description,
    icon: raw.icon,
    color: raw.color,
    position: raw.position,
    syncPermissions: raw.sync_permissions,
    isSystem: raw.is_system,
    isCollapsed: raw.is_collapsed,
    defaultPermissions: raw.default_permissions,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    channels: raw.channels
      ? (raw.channels as Record<string, unknown>[]).map((ch) => ({
          id: ch.id,
          name: ch.name,
          slug: ch.slug,
          type: ch.type,
          position: ch.position,
          isDefault: ch.is_default,
          isReadonly: ch.is_readonly,
          topic: ch.topic,
          memberCount: ch.member_count,
        }))
      : undefined,
  };
}

// =============================================================================
// GET /api/channels/categories
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/channels/categories - List categories");

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 },
      );
    }

    const validation = listCategoriesSchema.safeParse({
      workspaceId,
      includeChannels: searchParams.get("includeChannels") === "true",
      includeCollapsed: searchParams.get("includeCollapsed") !== "false",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { includeChannels, includeCollapsed } = validation.data;

    // Fetch categories from database via GraphQL
    const { data } = await apolloClient.query({
      query: includeChannels
        ? GET_CATEGORIES_WITH_CHANNELS_QUERY
        : GET_CATEGORIES_QUERY,
      variables: {
        workspaceId,
        includeCollapsed,
      },
      fetchPolicy: "network-only",
    });

    const categories = (data?.nchat_categories || []).map(transformCategory);

    logger.info("GET /api/channels/categories - Success", {
      workspaceId,
      count: categories.length,
    });

    return NextResponse.json({
      success: true,
      categories,
      total: categories.length,
    });
  } catch (error) {
    logger.error("Error fetching categories:", error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

// =============================================================================
// POST /api/channels/categories
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/channels/categories - Create category");

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const userRole = getUserRoleFromRequest(request);
    if (!canManageCategories(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions to create categories",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validation = createCategorySchema.safeParse(body);

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

    // Get the next position if not provided
    let position = data.position;
    if (position === undefined) {
      const { data: positionData } = await apolloClient.query({
        query: GET_MAX_CATEGORY_POSITION_QUERY,
        variables: { workspaceId: data.workspaceId },
        fetchPolicy: "network-only",
      });
      const maxPosition =
        positionData?.nchat_categories_aggregate?.aggregate?.max?.position ??
        -1;
      position = maxPosition + 1;
    }

    // Create category via GraphQL mutation
    const { data: insertData } = await apolloClient.mutate({
      mutation: CREATE_CATEGORY_MUTATION,
      variables: {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        position,
        syncPermissions: data.syncPermissions,
        createdBy: userId,
      },
    });

    const category = insertData?.insert_nchat_categories_one;
    if (!category) {
      throw new Error("Failed to create category");
    }

    logger.info("POST /api/channels/categories - Success", {
      categoryId: category.id,
      name: data.name,
      createdBy: userId,
    });

    return NextResponse.json(
      {
        success: true,
        category: transformCategory(category),
        message: "Category created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating category:", error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to create category" },
      { status: 500 },
    );
  }
}

// =============================================================================
// GraphQL Queries and Mutations
// =============================================================================

const GET_CATEGORIES_QUERY = gql`
  query GetCategories($workspaceId: uuid!, $includeCollapsed: Boolean!) {
    nchat_categories(
      where: {
        workspace_id: { _eq: $workspaceId }
        _or: [
          { is_collapsed: { _eq: false } }
          { is_collapsed: { _eq: $includeCollapsed } }
        ]
      }
      order_by: { position: asc }
    ) {
      id
      workspace_id
      name
      description
      icon
      color
      position
      sync_permissions
      is_system
      is_collapsed
      default_permissions
      created_at
      updated_at
    }
  }
`;

const GET_CATEGORIES_WITH_CHANNELS_QUERY = gql`
  query GetCategoriesWithChannels(
    $workspaceId: uuid!
    $includeCollapsed: Boolean!
  ) {
    nchat_categories(
      where: {
        workspace_id: { _eq: $workspaceId }
        _or: [
          { is_collapsed: { _eq: false } }
          { is_collapsed: { _eq: $includeCollapsed } }
        ]
      }
      order_by: { position: asc }
    ) {
      id
      workspace_id
      name
      description
      icon
      color
      position
      sync_permissions
      is_system
      is_collapsed
      default_permissions
      created_at
      updated_at
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
      }
    }
  }
`;

const GET_MAX_CATEGORY_POSITION_QUERY = gql`
  query GetMaxCategoryPosition($workspaceId: uuid!) {
    nchat_categories_aggregate(where: { workspace_id: { _eq: $workspaceId } }) {
      aggregate {
        max {
          position
        }
      }
    }
  }
`;

const CREATE_CATEGORY_MUTATION = gql`
  mutation CreateCategory(
    $workspaceId: uuid!
    $name: String!
    $description: String
    $icon: String
    $color: String
    $position: Int!
    $syncPermissions: Boolean!
    $createdBy: uuid!
  ) {
    insert_nchat_categories_one(
      object: {
        workspace_id: $workspaceId
        name: $name
        description: $description
        icon: $icon
        color: $color
        position: $position
        sync_permissions: $syncPermissions
        is_system: false
        is_collapsed: false
        created_by: $createdBy
      }
    ) {
      id
      workspace_id
      name
      description
      icon
      color
      position
      sync_permissions
      is_system
      is_collapsed
      default_permissions
      created_at
      updated_at
    }
  }
`;
