/**
 * Workspace GraphQL Mutations
 *
 * Comprehensive mutations for workspace CRUD, membership management, and invites.
 * Connects to the Hasura GraphQL backend with nchat_workspaces, nchat_workspace_members,
 * and nchat_workspace_invites tables.
 */

import { gql } from "@apollo/client";
import {
  WORKSPACE_FULL_FRAGMENT,
  WORKSPACE_MEMBER_FRAGMENT,
  WORKSPACE_INVITE_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  description?: string | null;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  settings?: WorkspaceSettings;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string | null;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  defaultChannelId?: string | null;
  settings?: WorkspaceSettings;
}

export interface WorkspaceSettings {
  verificationLevel?: "none" | "email" | "phone";
  defaultNotifications?: "all" | "mentions" | "none";
  explicitContentFilter?: "disabled" | "members_without_roles" | "all_members";
  require2FA?: boolean;
  discoverable?: boolean;
  allowInvites?: boolean;
}

export interface CreateInviteInput {
  workspaceId: string;
  maxUses?: number | null;
  expiresAt?: string | null;
  createdBy: string;
}

export interface AddMemberInput {
  workspaceId: string;
  userId: string;
  role?: "admin" | "moderator" | "member" | "guest";
  nickname?: string | null;
}

export interface UpdateMemberInput {
  workspaceId: string;
  userId: string;
  role?: string;
  nickname?: string | null;
}

// ============================================================================
// WORKSPACE CRUD MUTATIONS
// ============================================================================

/**
 * Create a new workspace with default channel
 */
export const INSERT_WORKSPACE = gql`
  mutation InsertWorkspace(
    $name: String!
    $slug: String!
    $description: String
    $iconUrl: String
    $bannerUrl: String
    $ownerId: uuid!
    $settings: jsonb
  ) {
    insert_nchat_workspaces_one(
      object: {
        name: $name
        slug: $slug
        description: $description
        icon_url: $iconUrl
        banner_url: $bannerUrl
        owner_id: $ownerId
        settings: $settings
        member_count: 1
        members: { data: [{ user_id: $ownerId, role: "owner" }] }
        channels: {
          data: [
            {
              name: "general"
              slug: "general"
              description: "General discussion"
              type: "public"
              is_default: true
              created_by: $ownerId
              member_count: 1
              members: { data: [{ user_id: $ownerId, role: "owner" }] }
            }
          ]
        }
      }
    ) {
      ...WorkspaceFull
      channels {
        id
        name
        slug
        is_default
      }
    }
  }
  ${WORKSPACE_FULL_FRAGMENT}
`;

/**
 * Update workspace details
 */
export const UPDATE_WORKSPACE = gql`
  mutation UpdateWorkspace(
    $workspaceId: uuid!
    $name: String
    $description: String
    $iconUrl: String
    $bannerUrl: String
    $defaultChannelId: uuid
    $settings: jsonb
  ) {
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $workspaceId }
      _set: {
        name: $name
        description: $description
        icon_url: $iconUrl
        banner_url: $bannerUrl
        default_channel_id: $defaultChannelId
        settings: $settings
        updated_at: "now()"
      }
    ) {
      ...WorkspaceFull
    }
  }
  ${WORKSPACE_FULL_FRAGMENT}
`;

/**
 * Update workspace settings only
 */
export const UPDATE_WORKSPACE_SETTINGS = gql`
  mutation UpdateWorkspaceSettings($workspaceId: uuid!, $settings: jsonb!) {
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $workspaceId }
      _append: { settings: $settings }
    ) {
      id
      settings
      updated_at
    }
  }
`;

/**
 * Delete a workspace (hard delete)
 */
export const DELETE_WORKSPACE = gql`
  mutation DeleteWorkspace($workspaceId: uuid!) {
    # Delete all workspace invites
    delete_nchat_workspace_invites(
      where: { workspace_id: { _eq: $workspaceId } }
    ) {
      affected_rows
    }
    # Delete all workspace members
    delete_nchat_workspace_members(
      where: { workspace_id: { _eq: $workspaceId } }
    ) {
      affected_rows
    }
    # Delete all channels in workspace
    delete_nchat_channels(where: { workspace_id: { _eq: $workspaceId } }) {
      affected_rows
    }
    # Delete the workspace
    delete_nchat_workspaces_by_pk(id: $workspaceId) {
      id
      name
      slug
    }
  }
`;

/**
 * Transfer workspace ownership
 */
export const TRANSFER_WORKSPACE_OWNERSHIP = gql`
  mutation TransferWorkspaceOwnership(
    $workspaceId: uuid!
    $currentOwnerId: uuid!
    $newOwnerId: uuid!
  ) {
    # Demote current owner to admin
    update_current_owner: update_nchat_workspace_members(
      where: {
        workspace_id: { _eq: $workspaceId }
        user_id: { _eq: $currentOwnerId }
      }
      _set: { role: "admin" }
    ) {
      affected_rows
    }
    # Promote new owner
    update_new_owner: update_nchat_workspace_members(
      where: {
        workspace_id: { _eq: $workspaceId }
        user_id: { _eq: $newOwnerId }
      }
      _set: { role: "owner" }
    ) {
      affected_rows
      returning {
        ...WorkspaceMember
      }
    }
    # Update workspace owner_id
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $workspaceId }
      _set: { owner_id: $newOwnerId, updated_at: "now()" }
    ) {
      id
      owner_id
    }
  }
  ${WORKSPACE_MEMBER_FRAGMENT}
`;

// ============================================================================
// MEMBERSHIP MUTATIONS
// ============================================================================

/**
 * Join a workspace (public or via invite)
 */
export const JOIN_WORKSPACE = gql`
  mutation JoinWorkspace(
    $workspaceId: uuid!
    $userId: uuid!
    $role: String = "member"
  ) {
    insert_nchat_workspace_members_one(
      object: { workspace_id: $workspaceId, user_id: $userId, role: $role }
      on_conflict: {
        constraint: nchat_workspace_members_workspace_id_user_id_key
        update_columns: []
      }
    ) {
      ...WorkspaceMember
      workspace {
        ...WorkspaceFull
      }
    }
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $workspaceId }
      _inc: { member_count: 1 }
    ) {
      id
      member_count
    }
  }
  ${WORKSPACE_MEMBER_FRAGMENT}
  ${WORKSPACE_FULL_FRAGMENT}
`;

/**
 * Leave a workspace
 */
export const LEAVE_WORKSPACE = gql`
  mutation LeaveWorkspace($workspaceId: uuid!, $userId: uuid!) {
    delete_nchat_workspace_members(
      where: { workspace_id: { _eq: $workspaceId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
    # Also remove from all channels in workspace
    delete_nchat_channel_members(
      where: {
        user_id: { _eq: $userId }
        channel: { workspace_id: { _eq: $workspaceId } }
      }
    ) {
      affected_rows
    }
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $workspaceId }
      _inc: { member_count: -1 }
    ) {
      id
      member_count
    }
  }
`;

/**
 * Add a member to workspace (admin action)
 */
export const ADD_WORKSPACE_MEMBER = gql`
  mutation AddWorkspaceMember(
    $workspaceId: uuid!
    $userId: uuid!
    $role: String = "member"
    $nickname: String
  ) {
    insert_nchat_workspace_members_one(
      object: {
        workspace_id: $workspaceId
        user_id: $userId
        role: $role
        nickname: $nickname
      }
      on_conflict: {
        constraint: nchat_workspace_members_workspace_id_user_id_key
        update_columns: [role, nickname]
      }
    ) {
      ...WorkspaceMember
    }
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $workspaceId }
      _inc: { member_count: 1 }
    ) {
      id
      member_count
    }
  }
  ${WORKSPACE_MEMBER_FRAGMENT}
`;

/**
 * Remove a member from workspace
 */
export const REMOVE_WORKSPACE_MEMBER = gql`
  mutation RemoveWorkspaceMember($workspaceId: uuid!, $userId: uuid!) {
    delete_nchat_workspace_members(
      where: { workspace_id: { _eq: $workspaceId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
      returning {
        id
        user_id
        workspace_id
      }
    }
    # Also remove from all channels in workspace
    delete_nchat_channel_members(
      where: {
        user_id: { _eq: $userId }
        channel: { workspace_id: { _eq: $workspaceId } }
      }
    ) {
      affected_rows
    }
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $workspaceId }
      _inc: { member_count: -1 }
    ) {
      id
      member_count
    }
  }
`;

/**
 * Update member role
 */
export const UPDATE_WORKSPACE_MEMBER_ROLE = gql`
  mutation UpdateWorkspaceMemberRole(
    $workspaceId: uuid!
    $userId: uuid!
    $role: String!
  ) {
    update_nchat_workspace_members(
      where: { workspace_id: { _eq: $workspaceId }, user_id: { _eq: $userId } }
      _set: { role: $role }
    ) {
      affected_rows
      returning {
        ...WorkspaceMember
      }
    }
  }
  ${WORKSPACE_MEMBER_FRAGMENT}
`;

/**
 * Update member nickname
 */
export const UPDATE_WORKSPACE_MEMBER_NICKNAME = gql`
  mutation UpdateWorkspaceMemberNickname(
    $workspaceId: uuid!
    $userId: uuid!
    $nickname: String
  ) {
    update_nchat_workspace_members(
      where: { workspace_id: { _eq: $workspaceId }, user_id: { _eq: $userId } }
      _set: { nickname: $nickname }
    ) {
      affected_rows
      returning {
        id
        user_id
        nickname
      }
    }
  }
`;

/**
 * Add multiple members to workspace (bulk)
 */
export const ADD_WORKSPACE_MEMBERS_BULK = gql`
  mutation AddWorkspaceMembersBulk(
    $members: [nchat_workspace_members_insert_input!]!
    $workspaceId: uuid!
    $memberCount: Int!
  ) {
    insert_nchat_workspace_members(
      objects: $members
      on_conflict: {
        constraint: nchat_workspace_members_workspace_id_user_id_key
        update_columns: []
      }
    ) {
      affected_rows
      returning {
        id
        user_id
        workspace_id
        role
        joined_at
      }
    }
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $workspaceId }
      _inc: { member_count: $memberCount }
    ) {
      id
      member_count
    }
  }
`;

// ============================================================================
// INVITE MUTATIONS
// ============================================================================

/**
 * Create a workspace invite
 */
export const CREATE_INVITE = gql`
  mutation CreateWorkspaceInvite(
    $workspaceId: uuid!
    $code: String!
    $maxUses: Int
    $expiresAt: timestamptz
    $createdBy: uuid!
  ) {
    insert_nchat_workspace_invites_one(
      object: {
        workspace_id: $workspaceId
        code: $code
        max_uses: $maxUses
        expires_at: $expiresAt
        created_by: $createdBy
        uses: 0
      }
    ) {
      ...WorkspaceInvite
    }
  }
  ${WORKSPACE_INVITE_FRAGMENT}
`;

/**
 * Use an invite (increment uses count)
 */
export const USE_INVITE = gql`
  mutation UseWorkspaceInvite($inviteId: uuid!) {
    update_nchat_workspace_invites_by_pk(
      pk_columns: { id: $inviteId }
      _inc: { uses: 1 }
    ) {
      id
      uses
      max_uses
    }
  }
`;

/**
 * Delete an invite
 */
export const DELETE_INVITE = gql`
  mutation DeleteWorkspaceInvite($inviteId: uuid!) {
    delete_nchat_workspace_invites_by_pk(id: $inviteId) {
      id
      code
      workspace_id
    }
  }
`;

/**
 * Delete all expired invites for a workspace
 */
export const DELETE_EXPIRED_INVITES = gql`
  mutation DeleteExpiredWorkspaceInvites($workspaceId: uuid!) {
    delete_nchat_workspace_invites(
      where: {
        workspace_id: { _eq: $workspaceId }
        expires_at: { _lt: "now()" }
      }
    ) {
      affected_rows
    }
  }
`;

/**
 * Revoke all invites for a workspace
 */
export const REVOKE_ALL_INVITES = gql`
  mutation RevokeAllWorkspaceInvites($workspaceId: uuid!) {
    delete_nchat_workspace_invites(
      where: { workspace_id: { _eq: $workspaceId } }
    ) {
      affected_rows
    }
  }
`;
