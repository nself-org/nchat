import { gql } from "@apollo/client";
import { CHANNEL_BASIC_FRAGMENT, USER_BASIC_FRAGMENT } from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type InviteType = "channel" | "workspace";

export interface Invite {
  id: string;
  code: string;
  type: InviteType;
  channelId: string | null;
  channel: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    type: string;
    isPrivate: boolean;
    membersCount: number;
  } | null;
  creatorId: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInviteVariables {
  code: string;
  type: InviteType;
  channelId?: string | null;
  creatorId: string;
  maxUses?: number | null;
  expiresAt?: string | null;
}

export interface GetInviteVariables {
  code: string;
}

export interface AcceptInviteVariables {
  inviteId: string;
  userId: string;
}

export interface RevokeInviteVariables {
  id: string;
}

export interface GetChannelInvitesVariables {
  channelId: string;
  limit?: number;
  offset?: number;
}

export interface GetWorkspaceInvitesVariables {
  limit?: number;
  offset?: number;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const INVITE_FRAGMENT = gql`
  fragment Invite on nchat_invites {
    id
    code
    type
    channel_id
    creator_id
    max_uses
    use_count
    expires_at
    is_active
    created_at
    updated_at
    channel {
      ...ChannelBasic
      members_aggregate {
        aggregate {
          count
        }
      }
    }
    creator {
      ...UserBasic
    }
  }
  ${CHANNEL_BASIC_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

export const INVITE_USAGE_FRAGMENT = gql`
  fragment InviteUsage on nchat_invite_usages {
    id
    invite_id
    user_id
    used_at
    user {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get invite by code (for preview before accepting)
 */
export const GET_INVITE = gql`
  query GetInvite($code: String!) {
    nchat_invites(
      where: { code: { _eq: $code }, is_active: { _eq: true } }
      limit: 1
    ) {
      ...Invite
    }
  }
  ${INVITE_FRAGMENT}
`;

/**
 * Get invite by ID
 */
export const GET_INVITE_BY_ID = gql`
  query GetInviteById($id: uuid!) {
    nchat_invites_by_pk(id: $id) {
      ...Invite
    }
  }
  ${INVITE_FRAGMENT}
`;

/**
 * Get all invites for a channel
 */
export const GET_CHANNEL_INVITES = gql`
  query GetChannelInvites(
    $channelId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_invites(
      where: { channel_id: { _eq: $channelId }, type: { _eq: "channel" } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Invite
    }
    nchat_invites_aggregate(
      where: { channel_id: { _eq: $channelId }, type: { _eq: "channel" } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${INVITE_FRAGMENT}
`;

/**
 * Get all workspace invites
 */
export const GET_WORKSPACE_INVITES = gql`
  query GetWorkspaceInvites($limit: Int = 50, $offset: Int = 0) {
    nchat_invites(
      where: { type: { _eq: "workspace" } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Invite
    }
    nchat_invites_aggregate(where: { type: { _eq: "workspace" } }) {
      aggregate {
        count
      }
    }
  }
  ${INVITE_FRAGMENT}
`;

/**
 * Get invites created by a user
 */
export const GET_USER_INVITES = gql`
  query GetUserInvites($userId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_invites(
      where: { creator_id: { _eq: $userId } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Invite
    }
  }
  ${INVITE_FRAGMENT}
`;

/**
 * Get invite usage history
 */
export const GET_INVITE_USAGE = gql`
  query GetInviteUsage($inviteId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_invite_usages(
      where: { invite_id: { _eq: $inviteId } }
      order_by: { used_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...InviteUsage
    }
    nchat_invite_usages_aggregate(where: { invite_id: { _eq: $inviteId } }) {
      aggregate {
        count
      }
    }
  }
  ${INVITE_USAGE_FRAGMENT}
`;

/**
 * Check if user has already used an invite
 */
export const CHECK_INVITE_USAGE = gql`
  query CheckInviteUsage($inviteId: uuid!, $userId: uuid!) {
    nchat_invite_usages(
      where: { invite_id: { _eq: $inviteId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      id
      used_at
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new invite
 */
export const CREATE_INVITE = gql`
  mutation CreateInvite(
    $code: String!
    $type: String!
    $channelId: uuid
    $creatorId: uuid!
    $maxUses: Int
    $expiresAt: timestamptz
  ) {
    insert_nchat_invites_one(
      object: {
        code: $code
        type: $type
        channel_id: $channelId
        creator_id: $creatorId
        max_uses: $maxUses
        expires_at: $expiresAt
        is_active: true
        use_count: 0
      }
    ) {
      ...Invite
    }
  }
  ${INVITE_FRAGMENT}
`;

/**
 * Accept an invite (join channel/workspace)
 */
export const ACCEPT_INVITE = gql`
  mutation AcceptInvite($inviteId: uuid!, $userId: uuid!) {
    # Record the usage
    insert_nchat_invite_usages_one(
      object: { invite_id: $inviteId, user_id: $userId }
      on_conflict: {
        constraint: nchat_invite_usages_invite_id_user_id_key
        update_columns: []
      }
    ) {
      id
      invite_id
      user_id
      used_at
    }
    # Increment use count
    update_nchat_invites_by_pk(
      pk_columns: { id: $inviteId }
      _inc: { use_count: 1 }
    ) {
      id
      use_count
    }
  }
`;

/**
 * Accept a channel invite and add user as member
 */
export const ACCEPT_CHANNEL_INVITE = gql`
  mutation AcceptChannelInvite(
    $inviteId: uuid!
    $userId: uuid!
    $channelId: uuid!
  ) {
    # Record the usage
    insert_nchat_invite_usages_one(
      object: { invite_id: $inviteId, user_id: $userId }
      on_conflict: {
        constraint: nchat_invite_usages_invite_id_user_id_key
        update_columns: []
      }
    ) {
      id
      used_at
    }
    # Add user to channel
    insert_nchat_channel_members_one(
      object: { channel_id: $channelId, user_id: $userId, role: "member" }
      on_conflict: {
        constraint: nchat_channel_members_channel_id_user_id_key
        update_columns: []
      }
    ) {
      id
      channel_id
      user_id
      role
      channel {
        ...ChannelBasic
      }
    }
    # Increment use count
    update_nchat_invites_by_pk(
      pk_columns: { id: $inviteId }
      _inc: { use_count: 1 }
    ) {
      id
      use_count
    }
  }
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Revoke an invite (deactivate it)
 */
export const REVOKE_INVITE = gql`
  mutation RevokeInvite($id: uuid!) {
    update_nchat_invites_by_pk(
      pk_columns: { id: $id }
      _set: { is_active: false, updated_at: "now()" }
    ) {
      id
      is_active
      updated_at
    }
  }
`;

/**
 * Delete an invite permanently
 */
export const DELETE_INVITE = gql`
  mutation DeleteInvite($id: uuid!) {
    delete_nchat_invites_by_pk(id: $id) {
      id
    }
  }
`;

/**
 * Update invite settings
 */
export const UPDATE_INVITE = gql`
  mutation UpdateInvite(
    $id: uuid!
    $maxUses: Int
    $expiresAt: timestamptz
    $isActive: Boolean
  ) {
    update_nchat_invites_by_pk(
      pk_columns: { id: $id }
      _set: {
        max_uses: $maxUses
        expires_at: $expiresAt
        is_active: $isActive
        updated_at: "now()"
      }
    ) {
      ...Invite
    }
  }
  ${INVITE_FRAGMENT}
`;

/**
 * Reactivate an expired or revoked invite
 */
export const REACTIVATE_INVITE = gql`
  mutation ReactivateInvite($id: uuid!, $expiresAt: timestamptz) {
    update_nchat_invites_by_pk(
      pk_columns: { id: $id }
      _set: { is_active: true, expires_at: $expiresAt, updated_at: "now()" }
    ) {
      ...Invite
    }
  }
  ${INVITE_FRAGMENT}
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to invite updates
 */
export const INVITE_SUBSCRIPTION = gql`
  subscription InviteSubscription($id: uuid!) {
    nchat_invites_by_pk(id: $id) {
      ...Invite
    }
  }
  ${INVITE_FRAGMENT}
`;

/**
 * Subscribe to channel invites
 */
export const CHANNEL_INVITES_SUBSCRIPTION = gql`
  subscription ChannelInvitesSubscription($channelId: uuid!) {
    nchat_invites(
      where: { channel_id: { _eq: $channelId }, type: { _eq: "channel" } }
      order_by: { created_at: desc }
    ) {
      ...Invite
    }
  }
  ${INVITE_FRAGMENT}
`;
