/**
 * Channel GraphQL Subscriptions
 *
 * Real-time subscriptions for channel updates, membership changes, and activity.
 * Connects to the Hasura GraphQL backend via WebSocket.
 */

import { gql } from "@apollo/client";
import {
  CHANNEL_BASIC_FRAGMENT,
  CHANNEL_FULL_FRAGMENT,
  CHANNEL_MEMBER_FRAGMENT,
  USER_BASIC_FRAGMENT,
} from "../fragments";

// ============================================================================
// CHANNEL SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to a single channel's updates
 */
export const CHANNEL_SUBSCRIPTION = gql`
  subscription ChannelSubscription($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      ...ChannelFull
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Subscribe to all channels updates (for sidebar)
 */
export const CHANNELS_LIST_SUBSCRIPTION = gql`
  subscription ChannelsListSubscription($includeArchived: Boolean = false) {
    nchat_channels(
      where: { is_archived: { _eq: $includeArchived } }
      order_by: [
        { category_id: asc_nulls_last }
        { position: asc }
        { name: asc }
      ]
    ) {
      ...ChannelBasic
      member_count
      last_message_at
    }
  }
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Subscribe to channel updates within a category
 */
export const CATEGORY_CHANNELS_SUBSCRIPTION = gql`
  subscription CategoryChannelsSubscription($categoryId: uuid!) {
    nchat_channels(
      where: { category_id: { _eq: $categoryId }, is_archived: { _eq: false } }
      order_by: { position: asc }
    ) {
      ...ChannelBasic
      member_count
      last_message_at
    }
  }
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Subscribe to channel activity (last message, member count)
 */
export const CHANNEL_ACTIVITY_SUBSCRIPTION = gql`
  subscription ChannelActivitySubscription($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      id
      member_count
      message_count
      last_message_at
      last_message_id
    }
  }
`;

// ============================================================================
// CHANNEL MEMBERS SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to channel member changes
 */
export const CHANNEL_MEMBERS_SUBSCRIPTION = gql`
  subscription ChannelMembersSubscription($channelId: uuid!) {
    nchat_channel_members(
      where: { channel_id: { _eq: $channelId } }
      order_by: [{ role: asc }, { joined_at: asc }]
    ) {
      ...ChannelMember
    }
  }
  ${CHANNEL_MEMBER_FRAGMENT}
`;

/**
 * Subscribe to a specific member's status in a channel
 */
export const CHANNEL_MEMBER_SUBSCRIPTION = gql`
  subscription ChannelMemberSubscription($channelId: uuid!, $userId: uuid!) {
    nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      id
      role
      is_muted
      muted_until
      is_pinned
      notification_level
      last_read_at
      last_read_message_id
      unread_count
      mention_count
    }
  }
`;

/**
 * Subscribe to online members in a channel
 */
export const CHANNEL_ONLINE_MEMBERS_SUBSCRIPTION = gql`
  subscription ChannelOnlineMembersSubscription($channelId: uuid!) {
    nchat_channel_members(
      where: {
        channel_id: { _eq: $channelId }
        user: { presence: { status: { _neq: "offline" } } }
      }
    ) {
      user_id
      user {
        ...UserBasic
        presence {
          status
          last_heartbeat_at
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to member count changes
 */
export const CHANNEL_MEMBER_COUNT_SUBSCRIPTION = gql`
  subscription ChannelMemberCountSubscription($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      id
      member_count
      members_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

// ============================================================================
// USER CHANNEL SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to user's channel membership changes
 */
export const USER_CHANNELS_SUBSCRIPTION = gql`
  subscription UserChannelsSubscription($userId: uuid!) {
    nchat_channel_members(
      where: {
        user_id: { _eq: $userId }
        channel: { is_archived: { _eq: false } }
      }
      order_by: [
        { is_pinned: desc }
        { channel: { last_message_at: desc_nulls_last } }
      ]
    ) {
      channel {
        ...ChannelFull
      }
      role
      is_muted
      muted_until
      is_pinned
      notification_level
      last_read_at
      unread_count
      mention_count
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Subscribe to user's unread counts across all channels
 */
export const USER_UNREAD_COUNTS_SUBSCRIPTION = gql`
  subscription UserUnreadCountsSubscription($userId: uuid!) {
    nchat_channel_members(
      where: {
        user_id: { _eq: $userId }
        channel: { is_archived: { _eq: false } }
      }
    ) {
      channel_id
      unread_count
      mention_count
      is_muted
      channel {
        id
        name
        type
      }
    }
  }
`;

/**
 * Subscribe to user's DM channel updates
 */
export const USER_DM_CHANNELS_SUBSCRIPTION = gql`
  subscription UserDMChannelsSubscription($userId: uuid!) {
    nchat_channel_members(
      where: {
        user_id: { _eq: $userId }
        channel: {
          type: { _in: ["direct", "group"] }
          is_archived: { _eq: false }
        }
      }
      order_by: { channel: { last_message_at: desc_nulls_last } }
    ) {
      channel {
        ...ChannelBasic
        last_message_at
        members {
          user {
            ...UserBasic
            presence {
              status
            }
          }
        }
      }
      unread_count
      last_read_at
    }
  }
  ${CHANNEL_BASIC_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to a user's membership in a specific channel
 */
export const USER_CHANNEL_MEMBERSHIP_SUBSCRIPTION = gql`
  subscription UserChannelMembershipSubscription(
    $channelId: uuid!
    $userId: uuid!
  ) {
    nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      id
      channel_id
      user_id
      role
      nickname
      can_read
      can_write
      can_manage
      can_invite
      can_pin
      can_delete_messages
      can_mention_everyone
      is_muted
      muted_until
      is_pinned
      notification_level
      last_read_message_id
      last_read_at
      unread_count
      mention_count
      joined_at
    }
  }
`;

// ============================================================================
// TYPING INDICATORS
// ============================================================================

/**
 * Subscribe to typing indicators in a channel
 */
export const CHANNEL_TYPING_SUBSCRIPTION = gql`
  subscription ChannelTypingSubscription($channelId: uuid!) {
    nchat_typing_indicators(
      where: { channel_id: { _eq: $channelId }, expires_at: { _gt: "now()" } }
    ) {
      user_id
      started_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// CHANNEL EVENTS
// ============================================================================

/**
 * Subscribe to channel creation events
 */
export const NEW_CHANNELS_SUBSCRIPTION = gql`
  subscription NewChannelsSubscription($since: timestamptz!) {
    nchat_channels(
      where: {
        created_at: { _gt: $since }
        type: { _eq: "public" }
        is_archived: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: 10
    ) {
      ...ChannelFull
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Subscribe to channel archive/unarchive events
 */
export const CHANNEL_ARCHIVE_EVENTS_SUBSCRIPTION = gql`
  subscription ChannelArchiveEventsSubscription {
    nchat_channels(
      where: { archived_at: { _is_null: false } }
      order_by: { archived_at: desc }
      limit: 10
    ) {
      id
      name
      is_archived
      archived_at
    }
  }
`;

// ============================================================================
// PINNED MESSAGES
// ============================================================================

/**
 * Subscribe to pinned messages in a channel
 */
export const CHANNEL_PINNED_MESSAGES_SUBSCRIPTION = gql`
  subscription ChannelPinnedMessagesSubscription($channelId: uuid!) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        is_pinned: { _eq: true }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
    ) {
      id
      content
      created_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// CHANNEL PRESENCE
// ============================================================================

/**
 * Subscribe to users currently viewing a channel
 */
export const CHANNEL_PRESENCE_SUBSCRIPTION = gql`
  subscription ChannelPresenceSubscription($channelId: uuid!) {
    nchat_presence(where: { current_channel_id: { _eq: $channelId } }) {
      user_id
      status
      last_heartbeat_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;
