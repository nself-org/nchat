/**
 * Message GraphQL Mutations
 *
 * Comprehensive mutations for message CRUD, reactions, pins, and threads.
 * Connects to the Hasura GraphQL backend via nchat_messages table.
 */

import { gql } from "@apollo/client";
import {
  MESSAGE_FULL_FRAGMENT,
  USER_BASIC_FRAGMENT,
  REACTION_FRAGMENT,
} from "../fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SendMessageVariables {
  channelId: string;
  userId: string;
  content: string;
  contentHtml?: string;
  type?: string;
  threadId?: string;
  parentMessageId?: string;
  mentions?: string[];
  mentionedRoles?: string[];
  mentionedChannels?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateMessageVariables {
  id: string;
  content: string;
  contentHtml?: string;
  mentions?: string[];
  metadata?: Record<string, unknown>;
}

export interface DeleteMessageVariables {
  id: string;
}

export interface PinMessageVariables {
  messageId: string;
  channelId: string;
  userId: string;
}

export interface UnpinMessageVariables {
  messageId: string;
  channelId: string;
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

export interface ForwardMessageVariables {
  originalMessageId: string;
  targetChannelId: string;
  userId: string;
  comment?: string;
}

// ============================================================================
// MESSAGE CRUD MUTATIONS
// ============================================================================

/**
 * Send a new message
 */
export const SEND_MESSAGE = gql`
  mutation SendMessage(
    $channelId: uuid!
    $userId: uuid!
    $content: String!
    $contentHtml: String
    $type: String = "text"
    $threadId: uuid
    $parentMessageId: uuid
    $mentions: _uuid
    $mentionedRoles: _text
    $mentionedChannels: _uuid
    $metadata: jsonb
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        content: $content
        content_html: $contentHtml
        type: $type
        thread_id: $threadId
        parent_message_id: $parentMessageId
        mentions: $mentions
        mentioned_roles: $mentionedRoles
        mentioned_channels: $mentionedChannels
        metadata: $metadata
      }
    ) {
      ...MessageFull
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Update an existing message
 */
export const UPDATE_MESSAGE = gql`
  mutation UpdateMessage(
    $id: uuid!
    $content: String!
    $contentHtml: String
    $mentions: _uuid
    $metadata: jsonb
  ) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $id }
      _set: {
        content: $content
        content_html: $contentHtml
        mentions: $mentions
        metadata: $metadata
        is_edited: true
        edited_at: "now()"
      }
    ) {
      ...MessageFull
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Soft delete a message (mark as deleted but keep in database)
 */
export const SOFT_DELETE_MESSAGE = gql`
  mutation SoftDeleteMessage($id: uuid!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $id }
      _set: {
        is_deleted: true
        deleted_at: "now()"
        content: "[This message has been deleted]"
      }
    ) {
      id
      is_deleted
      deleted_at
      channel_id
      thread_id
    }
  }
`;

/**
 * Hard delete a message (remove from database - admin only)
 */
export const HARD_DELETE_MESSAGE = gql`
  mutation HardDeleteMessage($id: uuid!) {
    delete_nchat_messages_by_pk(id: $id) {
      id
      channel_id
      thread_id
    }
  }
`;

/**
 * Bulk delete messages (admin/moderator)
 */
export const BULK_DELETE_MESSAGES = gql`
  mutation BulkDeleteMessages($ids: [uuid!]!) {
    update_nchat_messages(
      where: { id: { _in: $ids } }
      _set: {
        is_deleted: true
        deleted_at: "now()"
        content: "[This message has been deleted]"
      }
    ) {
      affected_rows
      returning {
        id
        channel_id
        thread_id
      }
    }
  }
`;

// ============================================================================
// PIN MUTATIONS
// ============================================================================

/**
 * Pin a message to a channel
 */
export const PIN_MESSAGE = gql`
  mutation PinMessage($messageId: uuid!, $channelId: uuid!, $userId: uuid!) {
    insert_nchat_pinned_messages_one(
      object: {
        message_id: $messageId
        channel_id: $channelId
        pinned_by: $userId
      }
      on_conflict: {
        constraint: nchat_pinned_messages_channel_id_message_id_key
        update_columns: [pinned_at, pinned_by]
      }
    ) {
      id
      message_id
      channel_id
      pinned_at
      pinned_by
      message {
        id
        content
        is_pinned
        user {
          ...UserBasic
        }
      }
    }
    # Also update the message's is_pinned flag
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { is_pinned: true }
    ) {
      id
      is_pinned
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Unpin a message from a channel
 */
export const UNPIN_MESSAGE = gql`
  mutation UnpinMessage($messageId: uuid!, $channelId: uuid!) {
    delete_nchat_pinned_messages(
      where: {
        message_id: { _eq: $messageId }
        channel_id: { _eq: $channelId }
      }
    ) {
      affected_rows
      returning {
        id
        message_id
      }
    }
    # Also update the message's is_pinned flag
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { is_pinned: false }
    ) {
      id
      is_pinned
    }
  }
`;

// ============================================================================
// REACTION MUTATIONS
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
      message_id
      user_id
      created_at
      user {
        ...UserBasic
      }
    }
    # Update message reaction count
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _inc: { reaction_count: 1 }
    ) {
      id
      reaction_count
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
    # Update message reaction count
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _inc: { reaction_count: -1 }
    ) {
      id
      reaction_count
    }
  }
`;

/**
 * Get all reactions for a message (for toggling)
 */
export const GET_USER_REACTION = gql`
  query GetUserReaction($messageId: uuid!, $userId: uuid!, $emoji: String!) {
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
 * Clear all reactions from a message (moderator action)
 */
export const CLEAR_REACTIONS = gql`
  mutation ClearReactions($messageId: uuid!) {
    delete_nchat_reactions(where: { message_id: { _eq: $messageId } }) {
      affected_rows
    }
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { reaction_count: 0 }
    ) {
      id
      reaction_count
    }
  }
`;

// ============================================================================
// FORWARD MUTATIONS
// ============================================================================

/**
 * Forward a message to another channel
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
        type: "text"
        metadata: { forwarded: true, original_message_id: $originalMessageId }
      }
    ) {
      ...MessageFull
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

// ============================================================================
// BOOKMARK MUTATIONS
// ============================================================================

/**
 * Bookmark a message
 */
export const BOOKMARK_MESSAGE = gql`
  mutation BookmarkMessage($messageId: uuid!, $userId: uuid!, $note: String) {
    insert_nchat_bookmarks_one(
      object: { message_id: $messageId, user_id: $userId, note: $note }
      on_conflict: {
        constraint: nchat_bookmarks_user_id_message_id_key
        update_columns: [note]
      }
    ) {
      id
      message_id
      note
      created_at
      message {
        id
        content
        channel_id
      }
    }
  }
`;

/**
 * Remove bookmark from a message
 */
export const REMOVE_BOOKMARK = gql`
  mutation RemoveBookmark($messageId: uuid!, $userId: uuid!) {
    delete_nchat_bookmarks(
      where: { message_id: { _eq: $messageId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// READ STATE MUTATIONS
// ============================================================================

/**
 * Mark a message as read
 */
export const MARK_MESSAGE_READ = gql`
  mutation MarkMessageRead(
    $channelId: uuid!
    $userId: uuid!
    $messageId: uuid!
  ) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: {
        last_read_message_id: $messageId
        last_read_at: "now()"
        unread_count: 0
        mention_count: 0
      }
    ) {
      affected_rows
      returning {
        id
        last_read_message_id
        last_read_at
        unread_count
      }
    }
  }
`;

/**
 * Update channel last message info
 */
export const UPDATE_CHANNEL_LAST_MESSAGE = gql`
  mutation UpdateChannelLastMessage($channelId: uuid!, $messageId: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { last_message_id: $messageId, last_message_at: "now()" }
      _inc: { message_count: 1 }
    ) {
      id
      last_message_id
      last_message_at
      message_count
    }
  }
`;
