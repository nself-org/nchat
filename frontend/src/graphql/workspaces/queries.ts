/**
 * Workspace GraphQL Queries
 *
 * Comprehensive queries for fetching workspaces, workspace details, and workspace members.
 * Connects to the Hasura GraphQL backend with nchat_workspaces, nchat_workspace_members,
 * and nchat_workspace_invites tables.
 */

import { gql } from "@apollo/client";
import {
  WORKSPACE_BASIC_FRAGMENT,
  WORKSPACE_FULL_FRAGMENT,
  WORKSPACE_WITH_STATS_FRAGMENT,
  WORKSPACE_MEMBER_FRAGMENT,
  WORKSPACE_INVITE_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GetWorkspacesVariables {
  userId: string;
  limit?: number;
  offset?: number;
}

export interface GetWorkspaceVariables {
  id: string;
}

export interface GetWorkspaceBySlugVariables {
  slug: string;
}

export interface GetWorkspaceMembersVariables {
  workspaceId: string;
  role?: string;
  limit?: number;
  offset?: number;
}

export interface SearchWorkspaceMembersVariables {
  workspaceId: string;
  searchQuery: string;
  limit?: number;
}

export interface GetWorkspaceInvitesVariables {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export interface ValidateInviteVariables {
  code: string;
}

// ============================================================================
// WORKSPACE LIST QUERIES
// ============================================================================

/**
 * Get all workspaces a user is a member of
 */
export const GET_WORKSPACES = gql`
  query GetWorkspaces($userId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_workspace_members(
      where: { user_id: { _eq: $userId } }
      order_by: [{ workspace: { name: asc } }]
      limit: $limit
      offset: $offset
    ) {
      workspace {
        ...WorkspaceFull
      }
      role
      joined_at
      nickname
    }
    nchat_workspace_members_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        count
      }
    }
  }
  ${WORKSPACE_FULL_FRAGMENT}
`;

/**
 * Get public/discoverable workspaces
 */
export const GET_PUBLIC_WORKSPACES = gql`
  query GetPublicWorkspaces($limit: Int = 50, $offset: Int = 0) {
    nchat_workspaces(
      where: { settings: { _contains: { discoverable: true } } }
      order_by: [{ member_count: desc }, { name: asc }]
      limit: $limit
      offset: $offset
    ) {
      ...WorkspaceBasic
    }
    nchat_workspaces_aggregate(
      where: { settings: { _contains: { discoverable: true } } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${WORKSPACE_BASIC_FRAGMENT}
`;

// ============================================================================
// SINGLE WORKSPACE QUERIES
// ============================================================================

/**
 * Get a single workspace by ID with full details
 */
export const GET_WORKSPACE = gql`
  query GetWorkspace($id: uuid!) {
    nchat_workspaces_by_pk(id: $id) {
      ...WorkspaceWithStats
    }
  }
  ${WORKSPACE_WITH_STATS_FRAGMENT}
`;

/**
 * Get a single workspace by slug
 */
export const GET_WORKSPACE_BY_SLUG = gql`
  query GetWorkspaceBySlug($slug: String!) {
    nchat_workspaces(where: { slug: { _eq: $slug } }, limit: 1) {
      ...WorkspaceWithStats
    }
  }
  ${WORKSPACE_WITH_STATS_FRAGMENT}
`;

/**
 * Check if user is a member of a workspace
 */
export const CHECK_WORKSPACE_MEMBERSHIP = gql`
  query CheckWorkspaceMembership($workspaceId: uuid!, $userId: uuid!) {
    nchat_workspace_members(
      where: { workspace_id: { _eq: $workspaceId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      id
      role
      joined_at
      nickname
    }
  }
`;

/**
 * Get user's membership for a workspace
 */
export const GET_USER_WORKSPACE_MEMBERSHIP = gql`
  query GetUserWorkspaceMembership($workspaceId: uuid!, $userId: uuid!) {
    nchat_workspace_members_by_pk(
      workspace_id: $workspaceId
      user_id: $userId
    ) {
      id
      workspace_id
      user_id
      role
      joined_at
      nickname
      workspace {
        ...WorkspaceFull
      }
    }
  }
  ${WORKSPACE_FULL_FRAGMENT}
`;

// ============================================================================
// WORKSPACE MEMBERS QUERIES
// ============================================================================

/**
 * Get workspace members with pagination
 */
export const GET_WORKSPACE_MEMBERS = gql`
  query GetWorkspaceMembers(
    $workspaceId: uuid!
    $role: String
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_workspace_members(
      where: {
        workspace_id: { _eq: $workspaceId }
        _and: [
          { _or: [{ role: { _eq: $role } }, { role: { _is_null: false } }] }
        ]
      }
      order_by: [{ role: asc }, { joined_at: asc }]
      limit: $limit
      offset: $offset
    ) {
      ...WorkspaceMember
    }
    nchat_workspace_members_aggregate(
      where: {
        workspace_id: { _eq: $workspaceId }
        _and: [
          { _or: [{ role: { _eq: $role } }, { role: { _is_null: false } }] }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${WORKSPACE_MEMBER_FRAGMENT}
`;

/**
 * Get workspace admins (owner, admin, moderator)
 */
export const GET_WORKSPACE_ADMINS = gql`
  query GetWorkspaceAdmins($workspaceId: uuid!) {
    nchat_workspace_members(
      where: {
        workspace_id: { _eq: $workspaceId }
        role: { _in: ["owner", "admin", "moderator"] }
      }
      order_by: { role: asc }
    ) {
      ...WorkspaceMember
    }
  }
  ${WORKSPACE_MEMBER_FRAGMENT}
`;

/**
 * Search workspace members
 */
export const SEARCH_WORKSPACE_MEMBERS = gql`
  query SearchWorkspaceMembers(
    $workspaceId: uuid!
    $searchQuery: String!
    $limit: Int = 20
  ) {
    nchat_workspace_members(
      where: {
        workspace_id: { _eq: $workspaceId }
        _or: [
          { nickname: { _ilike: $searchQuery } }
          { user: { username: { _ilike: $searchQuery } } }
          { user: { display_name: { _ilike: $searchQuery } } }
        ]
      }
      order_by: { joined_at: asc }
      limit: $limit
    ) {
      ...WorkspaceMember
    }
  }
  ${WORKSPACE_MEMBER_FRAGMENT}
`;

// ============================================================================
// WORKSPACE INVITES QUERIES
// ============================================================================

/**
 * Get workspace invites
 */
export const GET_WORKSPACE_INVITES = gql`
  query GetWorkspaceInvites(
    $workspaceId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_workspace_invites(
      where: { workspace_id: { _eq: $workspaceId } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...WorkspaceInvite
    }
    nchat_workspace_invites_aggregate(
      where: { workspace_id: { _eq: $workspaceId } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${WORKSPACE_INVITE_FRAGMENT}
`;

/**
 * Validate an invite code
 */
export const VALIDATE_INVITE = gql`
  query ValidateInvite($code: String!) {
    nchat_workspace_invites(
      where: {
        code: { _eq: $code }
        _and: [
          {
            _or: [
              { expires_at: { _gt: "now()" } }
              { expires_at: { _is_null: true } }
            ]
          }
          {
            _or: [
              { uses: { _lt: "max_uses" } }
              { max_uses: { _is_null: true } }
            ]
          }
        ]
      }
      limit: 1
    ) {
      ...WorkspaceInvite
      workspace {
        ...WorkspaceBasic
      }
    }
  }
  ${WORKSPACE_INVITE_FRAGMENT}
  ${WORKSPACE_BASIC_FRAGMENT}
`;

/**
 * Get invite by code (simpler validation)
 */
export const GET_INVITE_BY_CODE = gql`
  query GetInviteByCode($code: String!) {
    nchat_workspace_invites(where: { code: { _eq: $code } }, limit: 1) {
      ...WorkspaceInvite
      workspace {
        ...WorkspaceBasic
      }
    }
  }
  ${WORKSPACE_INVITE_FRAGMENT}
  ${WORKSPACE_BASIC_FRAGMENT}
`;

// ============================================================================
// WORKSPACE STATS QUERIES
// ============================================================================

/**
 * Get workspace statistics
 */
export const GET_WORKSPACE_STATS = gql`
  query GetWorkspaceStats($workspaceId: uuid!) {
    nchat_workspaces_by_pk(id: $workspaceId) {
      id
      member_count
      created_at
      members_aggregate {
        aggregate {
          count
        }
      }
      channels_aggregate {
        aggregate {
          count
        }
      }
      online_members: members_aggregate(
        where: { user: { presence: { status: { _eq: "online" } } } }
      ) {
        aggregate {
          count
        }
      }
    }
  }
`;
