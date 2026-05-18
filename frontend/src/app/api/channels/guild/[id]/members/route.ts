/**
 * Guild Members API Route
 * GET /api/channels/guild/[id]/members - List guild members
 * POST /api/channels/guild/[id]/members - Add/invite member
 * PATCH /api/channels/guild/[id]/members - Update member role
 * DELETE /api/channels/guild/[id]/members - Remove member
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

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z
    .enum(["owner", "admin", "moderator", "member", "guest"])
    .default("member"),
});

const addMembersBulkSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
  role: z
    .enum(["owner", "admin", "moderator", "member", "guest"])
    .default("member"),
});

const updateMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "moderator", "member", "guest"]),
  nickname: z.string().max(100).optional().nullable(),
});

const removeMemberSchema = z.object({
  userId: z.string().uuid(),
});

const listMembersSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  role: z.enum(["owner", "admin", "moderator", "member", "guest"]).optional(),
  search: z.string().optional(),
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

function validateGuildId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function canManageMembers(role: UserRole): boolean {
  return ["owner", "admin", "moderator"].includes(role);
}

function canAssignRole(actorRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: Record<string, number> = {
    owner: 4,
    admin: 3,
    moderator: 2,
    member: 1,
    guest: 0,
  };
  return roleHierarchy[actorRole] > roleHierarchy[targetRole];
}

function transformMember(raw: Record<string, unknown>) {
  const user = raw.user as Record<string, unknown> | undefined;
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    userId: raw.user_id,
    role: raw.role,
    nickname: raw.nickname,
    permissions: raw.permissions,
    joinedAt: raw.joined_at,
    invitedBy: raw.invited_by,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    user: user
      ? {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          email: user.email,
          avatarUrl: user.avatar_url,
        }
      : undefined,
  };
}

// =============================================================================
// GET /api/channels/guild/[id]/members
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: guildId } = await params;

    logger.info("GET /api/channels/guild/[id]/members - List guild members", {
      guildId,
    });

    if (!validateGuildId(guildId)) {
      return NextResponse.json(
        { success: false, error: "Invalid guild ID" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const validation = listMembersSchema.safeParse({
      limit: Number(searchParams.get("limit")) || 50,
      offset: Number(searchParams.get("offset")) || 0,
      role: searchParams.get("role") || undefined,
      search: searchParams.get("search") || undefined,
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

    const { limit, offset, role: filterRole, search } = validation.data;

    // Verify guild exists
    const { data: guildData } = await apolloClient.query({
      query: CHECK_GUILD_EXISTS_QUERY,
      variables: { guildId },
      fetchPolicy: "network-only",
    });

    if (!guildData?.nchat_workspaces_by_pk) {
      return NextResponse.json(
        { success: false, error: "Guild not found" },
        { status: 404 },
      );
    }

    // Fetch members
    const { data } = await apolloClient.query({
      query: GET_GUILD_MEMBERS_QUERY,
      variables: {
        guildId,
        limit,
        offset,
        role: filterRole,
        search: search ? `%${search}%` : undefined,
      },
      fetchPolicy: "network-only",
    });

    const members = (data?.nchat_workspace_members || []).map(transformMember);
    const total =
      data?.nchat_workspace_members_aggregate?.aggregate?.count ||
      members.length;

    logger.info("GET /api/channels/guild/[id]/members - Success", {
      guildId,
      total,
      returned: members.length,
    });

    return NextResponse.json({
      success: true,
      members,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    const { id: guildId } = await params;
    logger.error("Error fetching guild members", error as Error, { guildId });
    return NextResponse.json(
      { success: false, error: "Failed to fetch guild members" },
      { status: 500 },
    );
  }
}

// =============================================================================
// POST /api/channels/guild/[id]/members - Add/invite member
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: guildId } = await params;

    logger.info("POST /api/channels/guild/[id]/members - Add member", {
      guildId,
    });

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

    // Verify guild exists and check permissions
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

    const actorMembership = guild.members?.[0];
    const isOwner = guild.owner_id === userId;
    const actorRole = isOwner ? "owner" : actorMembership?.role || "guest";

    if (!canManageMembers(actorRole as UserRole)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions to add members" },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Try bulk add first
    const bulkValidation = addMembersBulkSchema.safeParse(body);
    if (bulkValidation.success) {
      const { userIds, role } = bulkValidation.data;

      // Check if actor can assign this role
      if (!canAssignRole(actorRole as UserRole, role as UserRole)) {
        return NextResponse.json(
          { success: false, error: `Cannot assign role: ${role}` },
          { status: 403 },
        );
      }

      // Check max members
      if (guild.member_count + userIds.length > guild.max_members) {
        return NextResponse.json(
          { success: false, error: "Guild member limit would be exceeded" },
          { status: 400 },
        );
      }

      // Add members in bulk
      const members = userIds.map((uid) => ({
        workspace_id: guildId,
        user_id: uid,
        role,
        invited_by: userId,
      }));

      const { data: insertData } = await apolloClient.mutate({
        mutation: ADD_GUILD_MEMBERS_BULK_MUTATION,
        variables: { members, guildId, count: userIds.length },
      });

      const addedCount =
        insertData?.insert_nchat_workspace_members?.affected_rows || 0;

      logger.info(
        "POST /api/channels/guild/[id]/members - Members added (bulk)",
        {
          guildId,
          addedCount,
          addedBy: userId,
        },
      );

      return NextResponse.json(
        {
          success: true,
          message: `${addedCount} member(s) added successfully`,
          addedCount,
        },
        { status: 201 },
      );
    }

    // Try single add
    const singleValidation = addMemberSchema.safeParse(body);
    if (!singleValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: singleValidation.error.errors,
        },
        { status: 400 },
      );
    }

    const { userId: targetUserId, role } = singleValidation.data;

    // Check if actor can assign this role
    if (!canAssignRole(actorRole as UserRole, role as UserRole)) {
      return NextResponse.json(
        { success: false, error: `Cannot assign role: ${role}` },
        { status: 403 },
      );
    }

    // Check if user is already a member
    const { data: existingData } = await apolloClient.query({
      query: CHECK_GUILD_MEMBERSHIP_QUERY,
      variables: { guildId, userId: targetUserId },
      fetchPolicy: "network-only",
    });

    if (existingData?.nchat_workspace_members?.length > 0) {
      return NextResponse.json(
        { success: false, error: "User is already a member of this guild" },
        { status: 409 },
      );
    }

    // Check max members
    if (guild.member_count >= guild.max_members) {
      return NextResponse.json(
        { success: false, error: "Guild has reached member limit" },
        { status: 400 },
      );
    }

    // Add member
    const { data: insertData } = await apolloClient.mutate({
      mutation: ADD_GUILD_MEMBER_MUTATION,
      variables: {
        guildId,
        userId: targetUserId,
        role,
        invitedBy: userId,
      },
    });

    const member = insertData?.insert_nchat_workspace_members_one;

    // Update member count
    await apolloClient.mutate({
      mutation: INCREMENT_GUILD_MEMBER_COUNT_MUTATION,
      variables: { guildId },
    });

    logger.info("POST /api/channels/guild/[id]/members - Member added", {
      guildId,
      userId: targetUserId,
      role,
      addedBy: userId,
    });

    return NextResponse.json(
      {
        success: true,
        member: transformMember(member),
        message: "Member added successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    const { id: guildId } = await params;
    logger.error("Error adding guild member", error as Error, { guildId });
    return NextResponse.json(
      { success: false, error: "Failed to add guild member" },
      { status: 500 },
    );
  }
}

// =============================================================================
// PATCH /api/channels/guild/[id]/members - Update member role
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: guildId } = await params;

    logger.info("PATCH /api/channels/guild/[id]/members - Update member", {
      guildId,
    });

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

    const body = await request.json();
    const validation = updateMemberSchema.safeParse(body);

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

    const { userId: targetUserId, role: newRole, nickname } = validation.data;

    // Verify guild exists and check permissions
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

    const actorMembership = guild.members?.[0];
    const isOwner = guild.owner_id === userId;
    const actorRole = isOwner ? "owner" : actorMembership?.role || "guest";

    // Get target member's current role
    const { data: targetData } = await apolloClient.query({
      query: GET_GUILD_MEMBER_QUERY,
      variables: { guildId, userId: targetUserId },
      fetchPolicy: "network-only",
    });

    const targetMember = targetData?.nchat_workspace_members?.[0];
    if (!targetMember) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 },
      );
    }

    // Check if actor can modify target's role
    if (!canAssignRole(actorRole as UserRole, targetMember.role as UserRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot modify member with equal or higher role",
        },
        { status: 403 },
      );
    }

    if (!canAssignRole(actorRole as UserRole, newRole as UserRole)) {
      return NextResponse.json(
        { success: false, error: `Cannot assign role: ${newRole}` },
        { status: 403 },
      );
    }

    // Update member
    const { data: updateData } = await apolloClient.mutate({
      mutation: UPDATE_GUILD_MEMBER_MUTATION,
      variables: {
        guildId,
        userId: targetUserId,
        role: newRole,
        nickname,
      },
    });

    const updatedMember =
      updateData?.update_nchat_workspace_members?.returning?.[0];

    logger.info("PATCH /api/channels/guild/[id]/members - Member updated", {
      guildId,
      targetUserId,
      newRole,
      updatedBy: userId,
    });

    return NextResponse.json({
      success: true,
      member: transformMember(updatedMember),
      message: "Member updated successfully",
    });
  } catch (error) {
    const { id: guildId } = await params;
    logger.error("Error updating guild member", error as Error, { guildId });
    return NextResponse.json(
      { success: false, error: "Failed to update guild member" },
      { status: 500 },
    );
  }
}

// =============================================================================
// DELETE /api/channels/guild/[id]/members - Remove member
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: guildId } = await params;

    logger.info("DELETE /api/channels/guild/[id]/members - Remove member", {
      guildId,
    });

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

    const body = await request.json();
    const validation = removeMemberSchema.safeParse(body);

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

    const { userId: targetUserId } = validation.data;

    // Verify guild exists and check permissions
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

    // Can't remove the owner
    if (targetUserId === guild.owner_id) {
      return NextResponse.json(
        { success: false, error: "Cannot remove the guild owner" },
        { status: 403 },
      );
    }

    const actorMembership = guild.members?.[0];
    const isOwner = guild.owner_id === userId;
    const actorRole = isOwner ? "owner" : actorMembership?.role || "guest";

    // User can remove themselves (leave)
    const isSelfRemoval = targetUserId === userId;

    if (!isSelfRemoval && !canManageMembers(actorRole as UserRole)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions to remove members" },
        { status: 403 },
      );
    }

    // Get target member's current role
    const { data: targetData } = await apolloClient.query({
      query: GET_GUILD_MEMBER_QUERY,
      variables: { guildId, userId: targetUserId },
      fetchPolicy: "network-only",
    });

    const targetMember = targetData?.nchat_workspace_members?.[0];
    if (!targetMember) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 },
      );
    }

    // Check role hierarchy (can't remove equal or higher role)
    if (
      !isSelfRemoval &&
      !canAssignRole(actorRole as UserRole, targetMember.role as UserRole)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot remove member with equal or higher role",
        },
        { status: 403 },
      );
    }

    // Remove member
    await apolloClient.mutate({
      mutation: REMOVE_GUILD_MEMBER_MUTATION,
      variables: { guildId, userId: targetUserId },
    });

    // Decrement member count
    await apolloClient.mutate({
      mutation: DECREMENT_GUILD_MEMBER_COUNT_MUTATION,
      variables: { guildId },
    });

    logger.info("DELETE /api/channels/guild/[id]/members - Member removed", {
      guildId,
      targetUserId,
      removedBy: userId,
      isSelfRemoval,
    });

    return NextResponse.json({
      success: true,
      message: isSelfRemoval
        ? "You have left the guild"
        : "Member removed successfully",
      userId: targetUserId,
    });
  } catch (error) {
    const { id: guildId } = await params;
    logger.error("Error removing guild member", error as Error, { guildId });
    return NextResponse.json(
      { success: false, error: "Failed to remove guild member" },
      { status: 500 },
    );
  }
}

// =============================================================================
// GraphQL Queries and Mutations
// =============================================================================

const CHECK_GUILD_EXISTS_QUERY = gql`
  query CheckGuildExists($guildId: uuid!) {
    nchat_workspaces_by_pk(id: $guildId) {
      id
    }
  }
`;

const GET_GUILD_WITH_MEMBERSHIP_QUERY = gql`
  query GetGuildWithMembership($guildId: uuid!, $userId: uuid!) {
    nchat_workspaces_by_pk(id: $guildId) {
      id
      owner_id
      member_count
      max_members
      members: nchat_workspace_members(where: { user_id: { _eq: $userId } }) {
        user_id
        role
      }
    }
  }
`;

const GET_GUILD_MEMBERS_QUERY = gql`
  query GetGuildMembers(
    $guildId: uuid!
    $limit: Int!
    $offset: Int!
    $role: String
    $search: String
  ) {
    nchat_workspace_members(
      where: {
        workspace_id: { _eq: $guildId }
        role: { _eq: $role }
        _or: [
          { user: { username: { _ilike: $search } } }
          { user: { display_name: { _ilike: $search } } }
        ]
      }
      order_by: { joined_at: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      workspace_id
      user_id
      role
      nickname
      permissions
      joined_at
      invited_by
      created_at
      updated_at
      user: nchat_user {
        id
        username
        display_name
        email
        avatar_url
      }
    }
    nchat_workspace_members_aggregate(
      where: { workspace_id: { _eq: $guildId }, role: { _eq: $role } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const GET_GUILD_MEMBER_QUERY = gql`
  query GetGuildMember($guildId: uuid!, $userId: uuid!) {
    nchat_workspace_members(
      where: { workspace_id: { _eq: $guildId }, user_id: { _eq: $userId } }
    ) {
      id
      workspace_id
      user_id
      role
      nickname
      permissions
      joined_at
    }
  }
`;

const CHECK_GUILD_MEMBERSHIP_QUERY = gql`
  query CheckGuildMembership($guildId: uuid!, $userId: uuid!) {
    nchat_workspace_members(
      where: { workspace_id: { _eq: $guildId }, user_id: { _eq: $userId } }
    ) {
      id
    }
  }
`;

const ADD_GUILD_MEMBER_MUTATION = gql`
  mutation AddGuildMember(
    $guildId: uuid!
    $userId: uuid!
    $role: String!
    $invitedBy: uuid
  ) {
    insert_nchat_workspace_members_one(
      object: {
        workspace_id: $guildId
        user_id: $userId
        role: $role
        invited_by: $invitedBy
      }
    ) {
      id
      workspace_id
      user_id
      role
      nickname
      permissions
      joined_at
      invited_by
      created_at
      updated_at
    }
  }
`;

const ADD_GUILD_MEMBERS_BULK_MUTATION = gql`
  mutation AddGuildMembersBulk(
    $members: [nchat_workspace_members_insert_input!]!
    $guildId: uuid!
    $count: Int!
  ) {
    insert_nchat_workspace_members(
      objects: $members
      on_conflict: {
        constraint: nchat_workspace_members_pkey
        update_columns: []
      }
    ) {
      affected_rows
    }
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $guildId }
      _inc: { member_count: $count }
    ) {
      id
      member_count
    }
  }
`;

const UPDATE_GUILD_MEMBER_MUTATION = gql`
  mutation UpdateGuildMember(
    $guildId: uuid!
    $userId: uuid!
    $role: String!
    $nickname: String
  ) {
    update_nchat_workspace_members(
      where: { workspace_id: { _eq: $guildId }, user_id: { _eq: $userId } }
      _set: { role: $role, nickname: $nickname }
    ) {
      returning {
        id
        workspace_id
        user_id
        role
        nickname
        permissions
        joined_at
        invited_by
        created_at
        updated_at
      }
    }
  }
`;

const REMOVE_GUILD_MEMBER_MUTATION = gql`
  mutation RemoveGuildMember($guildId: uuid!, $userId: uuid!) {
    delete_nchat_workspace_members(
      where: { workspace_id: { _eq: $guildId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

const INCREMENT_GUILD_MEMBER_COUNT_MUTATION = gql`
  mutation IncrementGuildMemberCount($guildId: uuid!) {
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $guildId }
      _inc: { member_count: 1 }
    ) {
      id
      member_count
    }
  }
`;

const DECREMENT_GUILD_MEMBER_COUNT_MUTATION = gql`
  mutation DecrementGuildMemberCount($guildId: uuid!) {
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $guildId }
      _inc: { member_count: -1 }
    ) {
      id
      member_count
    }
  }
`;
