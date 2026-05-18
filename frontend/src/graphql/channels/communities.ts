/**
 * GraphQL operations for communities (WhatsApp-style)
 * Phase 6: Tasks 60-65
 */

import { gql } from "@apollo/client";

// ============================================================================
// FRAGMENTS
// ============================================================================

export const COMMUNITY_FRAGMENT = gql`
  fragment CommunityFragment on nchat_communities {
    id
    workspace_id
    name
    description
    icon_url
    announcement_channel_id
    add_groups_permission
    members_can_invite
    approval_required
    events_enabled
    max_groups
    max_members
    group_count
    total_member_count
    created_by
    created_at
    updated_at
  }
`;

export const COMMUNITY_GROUP_FRAGMENT = gql`
  fragment CommunityGroupFragment on nchat_community_groups {
    community_id
    channel_id
    position
    added_at
    added_by
    channel: nchat_channel {
      id
      name
      slug
      description
      icon
      type
      member_count
      last_message_at
    }
  }
`;

export const COMMUNITY_WITH_GROUPS_FRAGMENT = gql`
  ${COMMUNITY_FRAGMENT}
  ${COMMUNITY_GROUP_FRAGMENT}
  fragment CommunityWithGroupsFragment on nchat_communities {
    ...CommunityFragment
    announcement_channel: nchat_channel {
      id
      name
      slug
      description
      type
      subtype
    }
    groups: nchat_community_groups(order_by: { position: asc }) {
      ...CommunityGroupFragment
    }
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_COMMUNITIES = gql`
  ${COMMUNITY_FRAGMENT}
  query GetCommunities($workspace_id: uuid!) {
    nchat_communities(
      where: { workspace_id: { _eq: $workspace_id } }
      order_by: { created_at: desc }
    ) {
      ...CommunityFragment
    }
  }
`;

export const GET_COMMUNITY = gql`
  ${COMMUNITY_WITH_GROUPS_FRAGMENT}
  query GetCommunity($id: uuid!) {
    nchat_communities_by_pk(id: $id) {
      ...CommunityWithGroupsFragment
    }
  }
`;

export const GET_COMMUNITY_GROUPS = gql`
  ${COMMUNITY_GROUP_FRAGMENT}
  query GetCommunityGroups($community_id: uuid!) {
    nchat_community_groups(
      where: { community_id: { _eq: $community_id } }
      order_by: { position: asc }
    ) {
      ...CommunityGroupFragment
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREATE_COMMUNITY = gql`
  ${COMMUNITY_FRAGMENT}
  mutation CreateCommunity(
    $workspace_id: uuid!
    $name: String!
    $description: String
    $icon_url: String
    $announcement_channel_id: uuid!
    $add_groups_permission: String
    $members_can_invite: Boolean
    $approval_required: Boolean
    $events_enabled: Boolean
    $max_groups: Int
    $max_members: Int
    $created_by: uuid!
  ) {
    insert_nchat_communities_one(
      object: {
        workspace_id: $workspace_id
        name: $name
        description: $description
        icon_url: $icon_url
        announcement_channel_id: $announcement_channel_id
        add_groups_permission: $add_groups_permission
        members_can_invite: $members_can_invite
        approval_required: $approval_required
        events_enabled: $events_enabled
        max_groups: $max_groups
        max_members: $max_members
        created_by: $created_by
      }
    ) {
      ...CommunityFragment
    }
  }
`;

export const UPDATE_COMMUNITY = gql`
  ${COMMUNITY_FRAGMENT}
  mutation UpdateCommunity(
    $id: uuid!
    $name: String
    $description: String
    $icon_url: String
    $add_groups_permission: String
    $members_can_invite: Boolean
    $approval_required: Boolean
    $events_enabled: Boolean
    $max_groups: Int
    $max_members: Int
  ) {
    update_nchat_communities_by_pk(
      pk_columns: { id: $id }
      _set: {
        name: $name
        description: $description
        icon_url: $icon_url
        add_groups_permission: $add_groups_permission
        members_can_invite: $members_can_invite
        approval_required: $approval_required
        events_enabled: $events_enabled
        max_groups: $max_groups
        max_members: $max_members
      }
    ) {
      ...CommunityFragment
    }
  }
`;

export const DELETE_COMMUNITY = gql`
  mutation DeleteCommunity($id: uuid!) {
    delete_nchat_communities_by_pk(id: $id) {
      id
    }
  }
`;

export const ADD_COMMUNITY_GROUP = gql`
  ${COMMUNITY_GROUP_FRAGMENT}
  mutation AddCommunityGroup(
    $community_id: uuid!
    $channel_id: uuid!
    $position: Int
    $added_by: uuid!
  ) {
    insert_nchat_community_groups_one(
      object: {
        community_id: $community_id
        channel_id: $channel_id
        position: $position
        added_by: $added_by
      }
    ) {
      ...CommunityGroupFragment
    }
  }
`;

export const REMOVE_COMMUNITY_GROUP = gql`
  mutation RemoveCommunityGroup($community_id: uuid!, $channel_id: uuid!) {
    delete_nchat_community_groups(
      where: {
        community_id: { _eq: $community_id }
        channel_id: { _eq: $channel_id }
      }
    ) {
      affected_rows
    }
  }
`;

export const REORDER_COMMUNITY_GROUPS = gql`
  mutation ReorderCommunityGroups(
    $updates: [nchat_community_groups_updates!]!
  ) {
    update_nchat_community_groups_many(updates: $updates) {
      affected_rows
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export const SUBSCRIBE_TO_COMMUNITIES = gql`
  ${COMMUNITY_FRAGMENT}
  subscription SubscribeToCommunities($workspace_id: uuid!) {
    nchat_communities(
      where: { workspace_id: { _eq: $workspace_id } }
      order_by: { created_at: desc }
    ) {
      ...CommunityFragment
    }
  }
`;

export const SUBSCRIBE_TO_COMMUNITY_GROUPS = gql`
  ${COMMUNITY_GROUP_FRAGMENT}
  subscription SubscribeToCommunityGroups($community_id: uuid!) {
    nchat_community_groups(
      where: { community_id: { _eq: $community_id } }
      order_by: { position: asc }
    ) {
      ...CommunityGroupFragment
    }
  }
`;
