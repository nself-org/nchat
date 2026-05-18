/**
 * Workspace GraphQL Fragments
 *
 * Reusable fragments for workspace-related queries and mutations.
 */

import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT, USER_PROFILE_FRAGMENT } from "../fragments";

// ============================================================================
// WORKSPACE FRAGMENTS
// ============================================================================

/**
 * Basic workspace fields
 */
export const WORKSPACE_BASIC_FRAGMENT = gql`
  fragment WorkspaceBasic on nchat_workspaces {
    id
    name
    slug
    description
    icon_url
    owner_id
    member_count
    created_at
  }
`;

/**
 * Full workspace details
 */
export const WORKSPACE_FULL_FRAGMENT = gql`
  fragment WorkspaceFull on nchat_workspaces {
    id
    name
    slug
    description
    icon_url
    banner_url
    owner_id
    default_channel_id
    member_count
    settings
    created_at
    updated_at
    owner {
      ...UserBasic
    }
    default_channel {
      id
      name
      slug
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Workspace with member stats
 */
export const WORKSPACE_WITH_STATS_FRAGMENT = gql`
  fragment WorkspaceWithStats on nchat_workspaces {
    ...WorkspaceFull
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
  }
  ${WORKSPACE_FULL_FRAGMENT}
`;

// ============================================================================
// WORKSPACE MEMBER FRAGMENTS
// ============================================================================

/**
 * Basic workspace member fields
 */
export const WORKSPACE_MEMBER_BASIC_FRAGMENT = gql`
  fragment WorkspaceMemberBasic on nchat_workspace_members {
    id
    workspace_id
    user_id
    role
    joined_at
    nickname
  }
`;

/**
 * Full workspace member with user details
 */
export const WORKSPACE_MEMBER_FRAGMENT = gql`
  fragment WorkspaceMember on nchat_workspace_members {
    id
    workspace_id
    user_id
    role
    joined_at
    nickname
    user {
      ...UserProfile
    }
  }
  ${USER_PROFILE_FRAGMENT}
`;

// ============================================================================
// WORKSPACE INVITE FRAGMENTS
// ============================================================================

/**
 * Workspace invite fields
 */
export const WORKSPACE_INVITE_FRAGMENT = gql`
  fragment WorkspaceInvite on nchat_workspace_invites {
    id
    workspace_id
    code
    uses
    max_uses
    expires_at
    created_by
    created_at
    creator {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;
