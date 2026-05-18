import { gql } from "@apollo/client";
import { REACTION_FRAGMENT, USER_BASIC_FRAGMENT } from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GetMessageReactionsVariables {
  messageId: string;
}

export interface AddReactionVariables {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface RemoveReactionVariables {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface ReactionSubscriptionVariables {
  messageId?: string;
  channelId?: string;
}

export interface ReactionCount {
  emoji: string;
  count: number;
  users: Array<{
    id: string;
    username: string;
    display_name: string;
  }>;
  hasReacted: boolean;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all reactions for a specific message
 */
export const GET_MESSAGE_REACTIONS = gql`
  query GetMessageReactions($messageId: uuid!) {
    nchat_reactions(
      where: { message_id: { _eq: $messageId } }
      order_by: { created_at: asc }
    ) {
      ...Reaction
    }
    # Also get aggregated counts by emoji
    nchat_reactions_aggregate(where: { message_id: { _eq: $messageId } }) {
      aggregate {
        count
      }
      nodes {
        emoji
      }
    }
  }
  ${REACTION_FRAGMENT}
`;

/**
 * Get reactions grouped by emoji for a message
 */
export const GET_MESSAGE_REACTIONS_GROUPED = gql`
  query GetMessageReactionsGrouped($messageId: uuid!) {
    nchat_reactions(
      where: { message_id: { _eq: $messageId } }
      order_by: { emoji: asc, created_at: asc }
    ) {
      id
      emoji
      created_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get reactions for multiple messages (batch)
 */
export const GET_MESSAGES_REACTIONS = gql`
  query GetMessagesReactions($messageIds: [uuid!]!) {
    nchat_reactions(
      where: { message_id: { _in: $messageIds } }
      order_by: { message_id: asc, emoji: asc }
    ) {
      id
      message_id
      emoji
      user_id
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Check if user has reacted with specific emoji
 */
export const CHECK_USER_REACTION = gql`
  query CheckUserReaction($messageId: uuid!, $userId: uuid!, $emoji: String!) {
    nchat_reactions(
      where: {
        message_id: { _eq: $messageId }
        user_id: { _eq: $userId }
        emoji: { _eq: $emoji }
      }
      limit: 1
    ) {
      id
    }
  }
`;

/**
 * Get popular reactions/emojis used in a channel
 */
export const GET_POPULAR_REACTIONS = gql`
  query GetPopularReactions($channelId: uuid!, $limit: Int = 10) {
    nchat_reactions(
      where: { message: { channel_id: { _eq: $channelId } } }
      distinct_on: emoji
      limit: $limit
    ) {
      emoji
    }
    # Get counts for each emoji
    nchat_reactions_aggregate(
      where: { message: { channel_id: { _eq: $channelId } } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get user's frequently used reactions
 */
export const GET_USER_FREQUENT_REACTIONS = gql`
  query GetUserFrequentReactions($userId: uuid!, $limit: Int = 10) {
    nchat_reactions(
      where: { user_id: { _eq: $userId } }
      distinct_on: emoji
      order_by: [{ emoji: asc }]
      limit: $limit
    ) {
      emoji
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Add a reaction to a message
 */
export const ADD_REACTION = gql`
  mutation AddReaction($messageId: uuid!, $userId: uuid!, $emoji: String!) {
    insert_nchat_reactions_one(
      object: { message_id: $messageId, user_id: $userId, emoji: $emoji }
      on_conflict: {
        constraint: nchat_reactions_message_id_user_id_emoji_key
        update_columns: []
      }
    ) {
      id
      emoji
      created_at
      user {
        ...UserBasic
      }
      message {
        id
        reactions_aggregate {
          aggregate {
            count
          }
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Remove a reaction from a message
 */
export const REMOVE_REACTION = gql`
  mutation RemoveReaction($messageId: uuid!, $userId: uuid!, $emoji: String!) {
    delete_nchat_reactions(
      where: {
        message_id: { _eq: $messageId }
        user_id: { _eq: $userId }
        emoji: { _eq: $emoji }
      }
    ) {
      affected_rows
      returning {
        id
        message_id
        emoji
      }
    }
  }
`;

/**
 * Toggle a reaction (add if not exists, remove if exists)
 * Note: This is typically handled client-side by calling ADD or REMOVE
 * But can be implemented with a custom action/function
 */
export const TOGGLE_REACTION = gql`
  mutation ToggleReaction($messageId: uuid!, $userId: uuid!, $emoji: String!) {
    toggle_reaction(
      args: { p_message_id: $messageId, p_user_id: $userId, p_emoji: $emoji }
    ) {
      id
      action
      reaction {
        id
        emoji
        user {
          ...UserBasic
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Remove all reactions from a message (admin/moderator)
 */
export const CLEAR_MESSAGE_REACTIONS = gql`
  mutation ClearMessageReactions($messageId: uuid!) {
    delete_nchat_reactions(where: { message_id: { _eq: $messageId } }) {
      affected_rows
    }
  }
`;

/**
 * Remove all of user's reactions from a message
 */
export const REMOVE_USER_REACTIONS = gql`
  mutation RemoveUserReactions($messageId: uuid!, $userId: uuid!) {
    delete_nchat_reactions(
      where: { message_id: { _eq: $messageId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
      returning {
        id
        emoji
      }
    }
  }
`;

/**
 * Bulk add reactions (for importing/syncing)
 */
export const BULK_ADD_REACTIONS = gql`
  mutation BulkAddReactions($reactions: [nchat_reactions_insert_input!]!) {
    insert_nchat_reactions(
      objects: $reactions
      on_conflict: {
        constraint: nchat_reactions_message_id_user_id_emoji_key
        update_columns: []
      }
    ) {
      affected_rows
      returning {
        id
        message_id
        emoji
        user_id
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to reactions on a specific message
 */
export const MESSAGE_REACTIONS_SUBSCRIPTION = gql`
  subscription MessageReactionsSubscription($messageId: uuid!) {
    nchat_reactions(
      where: { message_id: { _eq: $messageId } }
      order_by: { created_at: asc }
    ) {
      ...Reaction
    }
  }
  ${REACTION_FRAGMENT}
`;

/**
 * Subscribe to reaction changes in a channel
 */
export const CHANNEL_REACTIONS_SUBSCRIPTION = gql`
  subscription ChannelReactionsSubscription($channelId: uuid!) {
    nchat_reactions(
      where: { message: { channel_id: { _eq: $channelId } } }
      order_by: { created_at: desc }
      limit: 10
    ) {
      id
      message_id
      emoji
      created_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to new reactions (stream)
 */
export const REACTION_STREAM_SUBSCRIPTION = gql`
  subscription ReactionStreamSubscription($channelId: uuid!) {
    nchat_reactions_stream(
      cursor: { initial_value: { created_at: "now()" } }
      batch_size: 10
      where: { message: { channel_id: { _eq: $channelId } } }
    ) {
      id
      message_id
      emoji
      user_id
      created_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;
