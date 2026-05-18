import { gql } from "@apollo/client";
import {
  MESSAGE_FULL_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
  USER_BASIC_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ForwardMessageVariables {
  originalMessageId: string;
  targetChannelId: string;
  userId: string;
  comment?: string;
}

export interface ForwardMessageToMultipleVariables {
  originalMessageId: string;
  targetChannelIds: string[];
  userId: string;
  comment?: string;
}

export interface GetForwardDestinationsVariables {
  search?: string;
  limit?: number;
  offset?: number;
  userId?: string;
}

export interface GetRecentForwardDestinationsVariables {
  userId: string;
  limit?: number;
}

export interface ForwardedMessageData {
  id: string;
  content: string;
  type: string;
  created_at: string;
  channel_id: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  forwarded_from: {
    id: string;
    content: string;
    type: string;
    created_at: string;
    channel_id: string;
    user: {
      id: string;
      username: string;
      display_name: string;
      avatar_url?: string;
    };
    channel: {
      id: string;
      name: string;
      slug: string;
      type: string;
    };
  };
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Forward a message to a single destination channel/DM
 *
 * Creates a new message of type "forwarded" that references the original message.
 * The forwarded message includes an optional comment and links back to the original.
 */
export const FORWARD_MESSAGE = gql`
  mutation ForwardMessage(
    $originalMessageId: uuid!
    $targetChannelId: uuid!
    $userId: uuid!
    $comment: String
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $targetChannelId
        user_id: $userId
        content: $comment
        type: "forwarded"
        forwarded_from_id: $originalMessageId
        metadata: { forwarded: true, forwarded_at: "now()" }
      }
    ) {
      ...MessageFull
      forwarded_from {
        id
        content
        type
        created_at
        channel_id
        user {
          ...UserBasic
        }
        channel {
          ...ChannelBasic
        }
        attachments {
          id
          file_name
          file_type
          file_url
          thumbnail_url
        }
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Forward a message to multiple destinations at once
 *
 * Uses a bulk insert to create forwarded messages in all target channels.
 * Note: This requires constructing the objects array on the client side.
 */
export const FORWARD_MESSAGE_TO_MULTIPLE = gql`
  mutation ForwardMessageToMultiple($objects: [nchat_messages_insert_input!]!) {
    insert_nchat_messages(objects: $objects) {
      affected_rows
      returning {
        id
        channel_id
        content
        type
        created_at
        forwarded_from_id
        channel {
          ...ChannelBasic
        }
        forwarded_from {
          id
          content
          type
          created_at
          user {
            ...UserBasic
          }
          channel {
            ...ChannelBasic
          }
        }
      }
    }
  }
  ${CHANNEL_BASIC_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get available destinations for forwarding (channels and DMs)
 *
 * Returns channels the user has access to, filtered by optional search query.
 * Includes recent activity for sorting purposes.
 */
export const GET_FORWARD_DESTINATIONS = gql`
  query GetForwardDestinations(
    $search: String
    $limit: Int = 50
    $offset: Int = 0
    $userId: uuid
  ) {
    nchat_channels(
      where: {
        _and: [
          { is_archived: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $search } }
              { description: { _ilike: $search } }
            ]
          }
        ]
      }
      order_by: [{ updated_at: desc }, { name: asc }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      slug
      type
      icon
      is_private
      updated_at
      members(limit: 5) {
        user {
          id
          display_name
          avatar_url
        }
      }
      members_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

/**
 * Get channels where the user recently sent forwards
 *
 * Queries forwarded messages sent by the user to get their recent destinations.
 */
export const GET_RECENT_FORWARD_DESTINATIONS = gql`
  query GetRecentForwardDestinations($userId: uuid!, $limit: Int = 10) {
    nchat_messages(
      where: {
        user_id: { _eq: $userId }
        type: { _eq: "forwarded" }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: $limit
      distinct_on: channel_id
    ) {
      channel {
        id
        name
        slug
        type
        icon
        is_private
        updated_at
        members(limit: 5) {
          user {
            id
            display_name
            avatar_url
          }
        }
      }
    }
  }
`;

/**
 * Get the original message with full details for the forwarded message display
 */
export const GET_FORWARDED_MESSAGE_DETAILS = gql`
  query GetForwardedMessageDetails($messageId: uuid!) {
    nchat_messages_by_pk(id: $messageId) {
      id
      content
      type
      created_at
      channel_id
      user {
        id
        username
        display_name
        avatar_url
      }
      channel {
        id
        name
        slug
        type
        is_private
      }
      attachments {
        id
        file_name
        file_type
        file_url
        thumbnail_url
        file_size
        width
        height
      }
      reactions {
        id
        emoji
        user_id
      }
    }
  }
`;

/**
 * Get forwarded messages count for analytics
 */
export const GET_FORWARD_COUNT = gql`
  query GetForwardCount($messageId: uuid!) {
    nchat_messages_aggregate(
      where: {
        forwarded_from_id: { _eq: $messageId }
        is_deleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to forwarded messages in a channel
 *
 * Useful for real-time updates when messages are forwarded to a channel.
 */
export const FORWARDED_MESSAGES_SUBSCRIPTION = gql`
  subscription ForwardedMessagesSubscription($channelId: uuid!) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        type: { _eq: "forwarded" }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: 1
    ) {
      id
      content
      type
      created_at
      user {
        ...UserBasic
      }
      forwarded_from {
        id
        content
        type
        created_at
        user {
          ...UserBasic
        }
        channel {
          ...ChannelBasic
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;
