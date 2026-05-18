import { gql } from "@apollo/client";
import {
  BOOKMARK_FRAGMENT,
  MESSAGE_FULL_FRAGMENT,
  USER_BASIC_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GetBookmarksVariables {
  userId: string;
  limit?: number;
  offset?: number;
  channelId?: string;
}

export interface AddBookmarkVariables {
  userId: string;
  messageId: string;
  note?: string;
}

export interface RemoveBookmarkVariables {
  bookmarkId?: string;
  userId?: string;
  messageId?: string;
}

export interface UpdateBookmarkVariables {
  bookmarkId: string;
  note: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all bookmarks for a user
 */
export const GET_BOOKMARKS = gql`
  query GetBookmarks(
    $userId: uuid!
    $limit: Int = 50
    $offset: Int = 0
    $channelId: uuid
  ) {
    nchat_bookmarks(
      where: {
        user_id: { _eq: $userId }
        message: { is_deleted: { _eq: false }, channel_id: { _eq: $channelId } }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Bookmark
    }
    nchat_bookmarks_aggregate(
      where: {
        user_id: { _eq: $userId }
        message: { is_deleted: { _eq: false } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${BOOKMARK_FRAGMENT}
`;

/**
 * Get bookmark count for a user
 */
export const GET_BOOKMARK_COUNT = gql`
  query GetBookmarkCount($userId: uuid!) {
    nchat_bookmarks_aggregate(
      where: {
        user_id: { _eq: $userId }
        message: { is_deleted: { _eq: false } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Check if a message is bookmarked by user
 */
export const CHECK_BOOKMARK = gql`
  query CheckBookmark($userId: uuid!, $messageId: uuid!) {
    nchat_bookmarks(
      where: { user_id: { _eq: $userId }, message_id: { _eq: $messageId } }
      limit: 1
    ) {
      id
      note
      created_at
    }
  }
`;

/**
 * Get bookmarks grouped by channel
 */
export const GET_BOOKMARKS_BY_CHANNEL = gql`
  query GetBookmarksByChannel($userId: uuid!) {
    nchat_channel_members(where: { user_id: { _eq: $userId } }) {
      channel {
        id
        name
        slug
        bookmarked_messages: messages(
          where: {
            bookmarks: { user_id: { _eq: $userId } }
            is_deleted: { _eq: false }
          }
          order_by: { created_at: desc }
          limit: 5
        ) {
          id
          content
          created_at
          user {
            ...UserBasic
          }
          bookmarks(where: { user_id: { _eq: $userId } }) {
            id
            note
            created_at
          }
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Search bookmarks by note or message content
 */
export const SEARCH_BOOKMARKS = gql`
  query SearchBookmarks($userId: uuid!, $query: String!, $limit: Int = 20) {
    nchat_bookmarks(
      where: {
        user_id: { _eq: $userId }
        _or: [
          { note: { _ilike: $query } }
          { message: { content: { _ilike: $query } } }
        ]
        message: { is_deleted: { _eq: false } }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...Bookmark
    }
  }
  ${BOOKMARK_FRAGMENT}
`;

/**
 * Get recent bookmarks
 */
export const GET_RECENT_BOOKMARKS = gql`
  query GetRecentBookmarks($userId: uuid!, $limit: Int = 10) {
    nchat_bookmarks(
      where: {
        user_id: { _eq: $userId }
        message: { is_deleted: { _eq: false } }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      note
      created_at
      message {
        id
        content
        type
        created_at
        user {
          ...UserBasic
        }
        channel {
          id
          name
          slug
        }
        attachments {
          id
          file_name
          file_type
          thumbnail_url
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Add a bookmark (save a message)
 */
export const ADD_BOOKMARK = gql`
  mutation AddBookmark($userId: uuid!, $messageId: uuid!, $note: String) {
    insert_nchat_bookmarks_one(
      object: { user_id: $userId, message_id: $messageId, note: $note }
      on_conflict: {
        constraint: nchat_bookmarks_user_id_message_id_key
        update_columns: [note]
      }
    ) {
      id
      note
      created_at
      message {
        id
        content
        channel {
          id
          name
          slug
        }
      }
    }
  }
`;

/**
 * Remove a bookmark
 */
export const REMOVE_BOOKMARK = gql`
  mutation RemoveBookmark($bookmarkId: uuid!) {
    delete_nchat_bookmarks_by_pk(id: $bookmarkId) {
      id
      message_id
    }
  }
`;

/**
 * Remove bookmark by user and message
 */
export const REMOVE_BOOKMARK_BY_MESSAGE = gql`
  mutation RemoveBookmarkByMessage($userId: uuid!, $messageId: uuid!) {
    delete_nchat_bookmarks(
      where: { user_id: { _eq: $userId }, message_id: { _eq: $messageId } }
    ) {
      affected_rows
      returning {
        id
      }
    }
  }
`;

/**
 * Toggle bookmark (add if not exists, remove if exists)
 */
export const TOGGLE_BOOKMARK = gql`
  mutation ToggleBookmark($userId: uuid!, $messageId: uuid!, $note: String) {
    toggle_bookmark(
      args: { p_user_id: $userId, p_message_id: $messageId, p_note: $note }
    ) {
      action
      bookmark {
        id
        note
        created_at
      }
    }
  }
`;

/**
 * Update bookmark note
 */
export const UPDATE_BOOKMARK = gql`
  mutation UpdateBookmark($bookmarkId: uuid!, $note: String!) {
    update_nchat_bookmarks_by_pk(
      pk_columns: { id: $bookmarkId }
      _set: { note: $note }
    ) {
      id
      note
    }
  }
`;

/**
 * Delete all bookmarks for a user
 */
export const DELETE_ALL_BOOKMARKS = gql`
  mutation DeleteAllBookmarks($userId: uuid!) {
    delete_nchat_bookmarks(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }
  }
`;

/**
 * Bulk add bookmarks (for importing)
 */
export const BULK_ADD_BOOKMARKS = gql`
  mutation BulkAddBookmarks($bookmarks: [nchat_bookmarks_insert_input!]!) {
    insert_nchat_bookmarks(
      objects: $bookmarks
      on_conflict: {
        constraint: nchat_bookmarks_user_id_message_id_key
        update_columns: []
      }
    ) {
      affected_rows
      returning {
        id
        message_id
      }
    }
  }
`;

/**
 * Bulk remove bookmarks
 */
export const BULK_REMOVE_BOOKMARKS = gql`
  mutation BulkRemoveBookmarks($bookmarkIds: [uuid!]!) {
    delete_nchat_bookmarks(where: { id: { _in: $bookmarkIds } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to bookmark changes for a user
 */
export const BOOKMARKS_SUBSCRIPTION = gql`
  subscription BookmarksSubscription($userId: uuid!) {
    nchat_bookmarks(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
    ) {
      id
      note
      created_at
      message {
        id
        content
        channel {
          id
          name
        }
      }
    }
  }
`;

/**
 * Subscribe to bookmark count
 */
export const BOOKMARK_COUNT_SUBSCRIPTION = gql`
  subscription BookmarkCountSubscription($userId: uuid!) {
    nchat_bookmarks_aggregate(
      where: {
        user_id: { _eq: $userId }
        message: { is_deleted: { _eq: false } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Subscribe to bookmark changes for a specific message
 */
export const MESSAGE_BOOKMARK_SUBSCRIPTION = gql`
  subscription MessageBookmarkSubscription($messageId: uuid!) {
    nchat_bookmarks(where: { message_id: { _eq: $messageId } }) {
      id
      user_id
      note
      created_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;
