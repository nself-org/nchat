/**
 * Users API Route
 *
 * Handles CRUD operations for user management
 *
 * GET /api/users - List users (with search, filter, pagination)
 * POST /api/users - Create new user
 * PUT /api/users - Update user (requires userId in body)
 * DELETE /api/users - Delete user (requires userId in query)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { getServerApolloClient } from "@/lib/apollo-client";
import { getAuthenticatedUser } from "@/lib/api/middleware";
import { GET_USERS } from "@/graphql/users";
import { gql } from "@apollo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  displayName: z.string().min(1, "Display name is required").max(100),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens",
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  role: z
    .enum(["owner", "admin", "moderator", "member", "guest"])
    .default("member"),
  avatar: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  status: z
    .enum(["active", "inactive", "suspended", "deleted"])
    .default("active"),
  timezone: z.string().default("UTC"),
  locale: z.string().default("en"),
});

const UpdateUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  email: z.string().email("Invalid email address").optional(),
  displayName: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  role: z.enum(["owner", "admin", "moderator", "member", "guest"]).optional(),
  avatar: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  status: z.enum(["active", "inactive", "suspended", "deleted"]).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
});

const SearchQuerySchema = z.object({
  q: z.string().optional(), // search query for username, displayName, or email
  role: z.string().optional(), // filter by role name or ID
  status: z.enum(["active", "inactive"]).optional(), // active users only when filtering
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z
    .enum(["created_at", "display_name", "email", "last_seen_at"])
    .default("display_name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ============================================================================
// TYPES
// ============================================================================

interface User {
  id: string;
  email: string;
  display_name: string;
  username: string;
  role?: { id: string; name: string } | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_active: boolean;
  timezone: string;
  locale: string;
  created_at: string;
  updated_at: string;
  deactivated_at?: string | null;
  email_verified: boolean;
  presence?: { status: string; last_seen_at: string };
}

// ============================================================================
// GET /api/users - List users with search, filter, pagination
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/users - List users request");

    // Get authenticated user from request
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      q: searchParams.get("q") || undefined,
      role: searchParams.get("role") || undefined,
      status: searchParams.get("status") || undefined,
      limit: searchParams.get("limit") || "50",
      offset: searchParams.get("offset") || "0",
      sortBy: searchParams.get("sortBy") || "display_name",
      sortOrder: searchParams.get("sortOrder") || "asc",
    };

    const validation = SearchQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const params = validation.data;

    // Query database using GraphQL
    const client = getServerApolloClient();

    // Build GraphQL query with filters
    const query = gql`
      query GetUsers(
        $limit: Int
        $offset: Int
        $search: String
        $roleId: uuid
      ) {
        nchat_users(
          where: {
            _and: [
              {
                _or: [
                  { username: { _ilike: $search } }
                  { display_name: { _ilike: $search } }
                  { email: { _ilike: $search } }
                ]
              }
              { role_id: { _eq: $roleId } }
              { is_active: { _eq: true } }
            ]
          }
          order_by: { display_name: asc }
          limit: $limit
          offset: $offset
        ) {
          id
          email
          display_name
          username
          avatar_url
          bio
          is_active
          timezone
          locale
          created_at
          updated_at
          email_verified
          role {
            id
            name
          }
          presence {
            status
            last_seen_at
          }
        }
        nchat_users_aggregate(
          where: {
            _and: [
              {
                _or: [
                  { username: { _ilike: $search } }
                  { display_name: { _ilike: $search } }
                  { email: { _ilike: $search } }
                ]
              }
              { role_id: { _eq: $roleId } }
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

    const result = await client.query({
      query,
      variables: {
        limit: params.limit,
        offset: params.offset,
        search: params.q ? `%${params.q}%` : undefined,
        roleId: params.role || undefined,
      },
    });

    const users = result.data.nchat_users || [];
    const total = result.data.nchat_users_aggregate?.aggregate?.count || 0;

    logger.info("GET /api/users - Success", {
      total,
      returned: users.length,
      offset: params.offset,
      limit: params.limit,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        total,
        offset: params.offset,
        limit: params.limit,
        hasMore: params.offset + params.limit < total,
      },
    });
  } catch (error) {
    logger.error("GET /api/users - Error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to fetch users",
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
// POST /api/users - Create new user
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/users - Create user request");

    // Get authenticated user from request
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Check authorization - only admins and owners can create users
    if (user.role !== "owner" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins and owners can create users" },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = CreateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Create user in database via GraphQL mutation
    const client = getServerApolloClient();

    // Note: User creation should be handled through Nhost Auth service in production
    // This is a database-level mutation that assumes auth service has created the user
    const createUserMutation = gql`
      mutation CreateUser(
        $email: String!
        $displayName: String!
        $username: String!
        $role: String!
        $avatar: String
        $bio: String
        $timezone: String
        $locale: String
      ) {
        insert_nchat_users_one(
          object: {
            email: $email
            display_name: $displayName
            username: $username
            avatar_url: $avatar
            bio: $bio
            timezone: $timezone
            locale: $locale
            is_active: true
            email_verified: false
          }
        ) {
          id
          email
          display_name
          username
          avatar_url
          bio
          is_active
          timezone
          locale
          created_at
          updated_at
          email_verified
        }
      }
    `;

    const result = await client.mutate({
      mutation: createUserMutation,
      variables: {
        email: data.email,
        displayName: data.displayName,
        username: data.username,
        avatar: data.avatar || null,
        bio: data.bio || null,
        role: data.role,
        timezone: data.timezone,
        locale: data.locale,
      },
    });

    const newUser = result.data.insert_nchat_users_one;

    logger.info("POST /api/users - User created", {
      userId: newUser.id,
      email: newUser.email,
      createdBy: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        user: newUser,
        message: "User created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("POST /api/users - Error", error as Error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "unique",
        )
      ) {
        return NextResponse.json(
          {
            error: "User with this email or username already exists",
            message: "Please use a different email or username",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to create user",
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
// PUT /api/users - Update user
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    logger.info("PUT /api/users - Update user request");

    // Get authenticated user from request
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = UpdateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Check authorization - users can update themselves, admins can update anyone
    if (
      user.id !== data.userId &&
      user.role !== "owner" &&
      user.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Not authorized to update this user" },
        { status: 403 },
      );
    }

    // Update user in database via GraphQL mutation
    const client = getServerApolloClient();

    const updateUserMutation = gql`
      mutation UpdateUser(
        $userId: uuid!
        $email: String
        $displayName: String
        $username: String
        $avatar: String
        $bio: String
        $timezone: String
        $locale: String
        $role: String
      ) {
        update_nchat_users_by_pk(
          pk_columns: { id: $userId }
          _set: {
            email: $email
            display_name: $displayName
            username: $username
            avatar_url: $avatar
            bio: $bio
            timezone: $timezone
            locale: $locale
            updated_at: "now()"
          }
        ) {
          id
          email
          display_name
          username
          avatar_url
          bio
          is_active
          timezone
          locale
          created_at
          updated_at
          email_verified
          role {
            id
            name
          }
        }
      }
    `;

    const result = await client.mutate({
      mutation: updateUserMutation,
      variables: {
        userId: data.userId,
        email: data.email,
        displayName: data.displayName,
        username: data.username,
        avatar: data.avatar,
        bio: data.bio,
        timezone: data.timezone,
        locale: data.locale,
      },
    });

    const updatedUser = result.data.update_nchat_users_by_pk;

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    logger.info("PUT /api/users - User updated", {
      userId: data.userId,
      updatedBy: user.id,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    logger.error("PUT /api/users - Error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to update user",
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
// DELETE /api/users - Delete user
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    logger.info("DELETE /api/users - Delete user request");

    // Get authenticated user from request
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Check authorization - only admins and owners can delete users
    if (user.role !== "owner" && user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins and owners can delete users" },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 },
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 },
      );
    }

    // Prevent self-deletion
    if (user.id === userId && user.role === "owner") {
      return NextResponse.json(
        { error: "Cannot delete yourself as the last owner" },
        { status: 400 },
      );
    }

    // Soft delete: Mark user as inactive via mutation
    const client = getServerApolloClient();

    const deactivateUserMutation = gql`
      mutation DeactivateUser($userId: uuid!) {
        update_nchat_users_by_pk(
          pk_columns: { id: $userId }
          _set: { is_active: false, deactivated_at: "now()" }
        ) {
          id
          is_active
          deactivated_at
        }
      }
    `;

    const result = await client.mutate({
      mutation: deactivateUserMutation,
      variables: { userId },
    });

    const deletedUser = result.data.update_nchat_users_by_pk;

    if (!deletedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    logger.info("DELETE /api/users - User deleted", {
      userId,
      deletedBy: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
      userId,
    });
  } catch (error) {
    logger.error("DELETE /api/users - Error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to delete user",
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
