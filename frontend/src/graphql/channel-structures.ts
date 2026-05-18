/**
 * GraphQL Operations for Advanced Channel Structures
 * Guilds, Communities, Broadcast Lists, Categories, and Permissions
 */

import { gql } from "@apollo/client";

// ============================================================================
// FRAGMENTS
// ============================================================================

export const CATEGORY_FRAGMENT = gql`
  fragment CategoryFields on ChannelCategory {
    id
    workspaceId
    name
    description
    icon
    color
    position
    defaultPermissions
    syncPermissions
    isSystem
    createdAt
    updatedAt
  }
`;

export const GUILD_FRAGMENT = gql`
  fragment GuildFields on Workspace {
    id
    organizationId
    name
    slug
    description
    iconUrl
    bannerUrl
    vanityUrl
    splashUrl
    discoverySplashUrl
    isDiscoverable
    verificationLevel
    explicitContentFilter
    systemChannelId
    rulesChannelId
    memberCount
    boostTier
    boostCount
    maxMembers
    maxChannels
    maxFileSizeMb
    ownerId
    isActive
    createdAt
    updatedAt
  }
`;

export const BROADCAST_LIST_FRAGMENT = gql`
  fragment BroadcastListFields on BroadcastList {
    id
    workspaceId
    name
    description
    icon
    ownerId
    subscriptionMode
    allowReplies
    showSenderName
    trackDelivery
    trackReads
    maxSubscribers
    subscriberCount
    totalMessagesSent
    lastBroadcastAt
    createdAt
    updatedAt
  }
`;

export const BROADCAST_MESSAGE_FRAGMENT = gql`
  fragment BroadcastMessageFields on BroadcastMessage {
    id
    broadcastListId
    content
    attachments
    sentBy
    sentAt
    scheduledFor
    isScheduled
    totalRecipients
    deliveredCount
    readCount
    failedCount
  }
`;

export const PERMISSION_OVERRIDE_FRAGMENT = gql`
  fragment PermissionOverrideFields on ChannelPermissionOverride {
    id
    channelId
    targetType
    targetId
    allowPermissions
    denyPermissions
    createdAt
    createdBy
    expiresAt
  }
`;

// ============================================================================
// CATEGORY QUERIES
// ============================================================================

export const GET_CATEGORIES = gql`
  ${CATEGORY_FRAGMENT}
  query GetCategories($workspaceId: uuid!, $includeSystem: Boolean) {
    nchat_channel_categories(
      where: {
        workspace_id: { _eq: $workspaceId }
        is_system: { _eq: $includeSystem }
      }
      order_by: { position: asc }
    ) {
      ...CategoryFields
      channels: nchat_channels_aggregate(where: { category_id: { _eq: id } }) {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_CATEGORY_WITH_CHANNELS = gql`
  ${CATEGORY_FRAGMENT}
  query GetCategoryWithChannels($categoryId: uuid!) {
    nchat_channel_categories_by_pk(id: $categoryId) {
      ...CategoryFields
      channels: nchat_channels(
        order_by: { position: asc }
        where: { is_archived: { _eq: false } }
      ) {
        id
        name
        slug
        type
        subtype
        position
        isPrivate
        memberCount
      }
    }
  }
`;

// ============================================================================
// CATEGORY MUTATIONS
// ============================================================================

export const CREATE_CATEGORY = gql`
  ${CATEGORY_FRAGMENT}
  mutation CreateCategory($input: nchat_channel_categories_insert_input!) {
    insert_nchat_channel_categories_one(object: $input) {
      ...CategoryFields
    }
  }
`;

export const UPDATE_CATEGORY = gql`
  ${CATEGORY_FRAGMENT}
  mutation UpdateCategory(
    $id: uuid!
    $updates: nchat_channel_categories_set_input!
  ) {
    update_nchat_channel_categories_by_pk(
      pk_columns: { id: $id }
      _set: $updates
    ) {
      ...CategoryFields
    }
  }
`;

export const DELETE_CATEGORY = gql`
  mutation DeleteCategory($id: uuid!) {
    delete_nchat_channel_categories_by_pk(id: $id) {
      id
    }
  }
`;

export const REORDER_CATEGORIES = gql`
  mutation ReorderCategories($updates: [nchat_channel_categories_updates!]!) {
    update_nchat_channel_categories_many(updates: $updates) {
      affected_rows
    }
  }
`;

// ============================================================================
// GUILD QUERIES
// ============================================================================

export const GET_GUILDS = gql`
  ${GUILD_FRAGMENT}
  query GetGuilds($organizationId: uuid!, $isDiscoverable: Boolean) {
    nchat_workspaces(
      where: {
        organization_id: { _eq: $organizationId }
        is_discoverable: { _eq: $isDiscoverable }
        is_active: { _eq: true }
      }
      order_by: { created_at: desc }
    ) {
      ...GuildFields
    }
  }
`;

export const GET_GUILD_BY_SLUG = gql`
  ${GUILD_FRAGMENT}
  query GetGuildBySlug($slug: String!, $organizationId: uuid!) {
    nchat_workspaces(
      where: {
        slug: { _eq: $slug }
        organization_id: { _eq: $organizationId }
        is_active: { _eq: true }
      }
      limit: 1
    ) {
      ...GuildFields
    }
  }
`;

export const GET_GUILD_STRUCTURE = gql`
  ${GUILD_FRAGMENT}
  ${CATEGORY_FRAGMENT}
  query GetGuildStructure($workspaceId: uuid!) {
    nchat_workspaces_by_pk(id: $workspaceId) {
      ...GuildFields
      categories: nchat_channel_categories(order_by: { position: asc }) {
        ...CategoryFields
        channels: nchat_channels(
          order_by: { position: asc }
          where: { is_archived: { _eq: false } }
        ) {
          id
          name
          slug
          type
          subtype
          position
          isPrivate
          isDefault
          memberCount
        }
      }
    }
  }
`;

// ============================================================================
// GUILD MUTATIONS
// ============================================================================

export const CREATE_GUILD = gql`
  ${GUILD_FRAGMENT}
  mutation CreateGuild($input: nchat_workspaces_insert_input!) {
    insert_nchat_workspaces_one(object: $input) {
      ...GuildFields
    }
  }
`;

export const UPDATE_GUILD = gql`
  ${GUILD_FRAGMENT}
  mutation UpdateGuild($id: uuid!, $updates: nchat_workspaces_set_input!) {
    update_nchat_workspaces_by_pk(pk_columns: { id: $id }, _set: $updates) {
      ...GuildFields
    }
  }
`;

export const DELETE_GUILD = gql`
  mutation DeleteGuild($id: uuid!) {
    update_nchat_workspaces_by_pk(
      pk_columns: { id: $id }
      _set: { is_active: false }
    ) {
      id
      isActive
    }
  }
`;

// ============================================================================
// BROADCAST LIST QUERIES
// ============================================================================

export const GET_BROADCAST_LISTS = gql`
  ${BROADCAST_LIST_FRAGMENT}
  query GetBroadcastLists($workspaceId: uuid!, $ownerId: uuid) {
    nchat_broadcast_lists(
      where: {
        workspace_id: { _eq: $workspaceId }
        owner_id: { _eq: $ownerId }
      }
      order_by: { created_at: desc }
    ) {
      ...BroadcastListFields
    }
  }
`;

export const GET_BROADCAST_LIST = gql`
  ${BROADCAST_LIST_FRAGMENT}
  query GetBroadcastList($id: uuid!) {
    nchat_broadcast_lists_by_pk(id: $id) {
      ...BroadcastListFields
      subscribers: nchat_broadcast_subscribers(
        where: { status: { _eq: "active" } }
      ) {
        userId
        subscribedAt
        notificationsEnabled
      }
    }
  }
`;

export const GET_BROADCAST_MESSAGES = gql`
  ${BROADCAST_MESSAGE_FRAGMENT}
  query GetBroadcastMessages(
    $broadcastListId: uuid!
    $limit: Int
    $offset: Int
  ) {
    nchat_broadcast_messages(
      where: { broadcast_list_id: { _eq: $broadcastListId } }
      order_by: { sent_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...BroadcastMessageFields
    }
  }
`;

// ============================================================================
// BROADCAST LIST MUTATIONS
// ============================================================================

export const CREATE_BROADCAST_LIST = gql`
  ${BROADCAST_LIST_FRAGMENT}
  mutation CreateBroadcastList($input: nchat_broadcast_lists_insert_input!) {
    insert_nchat_broadcast_lists_one(object: $input) {
      ...BroadcastListFields
    }
  }
`;

export const UPDATE_BROADCAST_LIST = gql`
  ${BROADCAST_LIST_FRAGMENT}
  mutation UpdateBroadcastList(
    $id: uuid!
    $updates: nchat_broadcast_lists_set_input!
  ) {
    update_nchat_broadcast_lists_by_pk(
      pk_columns: { id: $id }
      _set: $updates
    ) {
      ...BroadcastListFields
    }
  }
`;

export const DELETE_BROADCAST_LIST = gql`
  mutation DeleteBroadcastList($id: uuid!) {
    delete_nchat_broadcast_lists_by_pk(id: $id) {
      id
    }
  }
`;

export const ADD_SUBSCRIBERS = gql`
  mutation AddSubscribers(
    $subscribers: [nchat_broadcast_subscribers_insert_input!]!
  ) {
    insert_nchat_broadcast_subscribers(
      objects: $subscribers
      on_conflict: {
        constraint: broadcast_subscribers_pkey
        update_columns: [status, subscribed_at]
      }
    ) {
      affected_rows
    }
  }
`;

export const REMOVE_SUBSCRIBER = gql`
  mutation RemoveSubscriber($broadcastListId: uuid!, $userId: uuid!) {
    update_nchat_broadcast_subscribers(
      where: {
        broadcast_list_id: { _eq: $broadcastListId }
        user_id: { _eq: $userId }
      }
      _set: { status: "unsubscribed", unsubscribed_at: "now()" }
    ) {
      affected_rows
    }
  }
`;

export const SEND_BROADCAST = gql`
  ${BROADCAST_MESSAGE_FRAGMENT}
  mutation SendBroadcast($message: nchat_broadcast_messages_insert_input!) {
    insert_nchat_broadcast_messages_one(object: $message) {
      ...BroadcastMessageFields
    }
  }
`;

// ============================================================================
// PERMISSION OVERRIDE QUERIES
// ============================================================================

export const GET_CHANNEL_PERMISSIONS = gql`
  ${PERMISSION_OVERRIDE_FRAGMENT}
  query GetChannelPermissions($channelId: uuid!) {
    nchat_channel_permission_overrides(
      where: { channel_id: { _eq: $channelId } }
    ) {
      ...PermissionOverrideFields
    }
  }
`;

export const GET_USER_CHANNEL_PERMISSIONS = gql`
  ${PERMISSION_OVERRIDE_FRAGMENT}
  query GetUserChannelPermissions($channelId: uuid!, $userId: uuid!) {
    nchat_channel_permission_overrides(
      where: {
        channel_id: { _eq: $channelId }
        _or: [
          { target_type: { _eq: "user" }, target_id: { _eq: $userId } }
          {
            target_type: { _eq: "role" }
            target_id: {
              _in: {
                select: "role_id"
                from: "nchat_user_roles"
                where: { user_id: { _eq: $userId } }
              }
            }
          }
        ]
      }
    ) {
      ...PermissionOverrideFields
    }
  }
`;

// ============================================================================
// PERMISSION OVERRIDE MUTATIONS
// ============================================================================

export const CREATE_PERMISSION_OVERRIDE = gql`
  ${PERMISSION_OVERRIDE_FRAGMENT}
  mutation CreatePermissionOverride(
    $input: nchat_channel_permission_overrides_insert_input!
  ) {
    insert_nchat_channel_permission_overrides_one(object: $input) {
      ...PermissionOverrideFields
    }
  }
`;

export const UPDATE_PERMISSION_OVERRIDE = gql`
  ${PERMISSION_OVERRIDE_FRAGMENT}
  mutation UpdatePermissionOverride(
    $id: uuid!
    $updates: nchat_channel_permission_overrides_set_input!
  ) {
    update_nchat_channel_permission_overrides_by_pk(
      pk_columns: { id: $id }
      _set: $updates
    ) {
      ...PermissionOverrideFields
    }
  }
`;

export const DELETE_PERMISSION_OVERRIDE = gql`
  mutation DeletePermissionOverride($id: uuid!) {
    delete_nchat_channel_permission_overrides_by_pk(id: $id) {
      id
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export const SUBSCRIBE_TO_GUILD_UPDATES = gql`
  ${GUILD_FRAGMENT}
  subscription SubscribeToGuildUpdates($workspaceId: uuid!) {
    nchat_workspaces_by_pk(id: $workspaceId) {
      ...GuildFields
    }
  }
`;

export const SUBSCRIBE_TO_CATEGORY_UPDATES = gql`
  ${CATEGORY_FRAGMENT}
  subscription SubscribeToCategoryUpdates($workspaceId: uuid!) {
    nchat_channel_categories(
      where: { workspace_id: { _eq: $workspaceId } }
      order_by: { position: asc }
    ) {
      ...CategoryFields
    }
  }
`;

export const SUBSCRIBE_TO_BROADCAST_DELIVERIES = gql`
  subscription SubscribeToBroadcastDeliveries($broadcastMessageId: uuid!) {
    nchat_broadcast_deliveries(
      where: { broadcast_message_id: { _eq: $broadcastMessageId } }
    ) {
      id
      userId
      status
      deliveredAt
      readAt
      failedAt
      errorMessage
    }
  }
`;

export const SUBSCRIBE_TO_PERMISSION_CHANGES = gql`
  ${PERMISSION_OVERRIDE_FRAGMENT}
  subscription SubscribeToPermissionChanges($channelId: uuid!) {
    nchat_channel_permission_overrides(
      where: { channel_id: { _eq: $channelId } }
    ) {
      ...PermissionOverrideFields
    }
  }
`;
