/**
 * Bookmark GraphQL Mutations
 *
 * Mutations for creating, updating, and deleting bookmarks, collections, and saved messages.
 */

import { gql } from "@apollo/client";

// ============================================================================
// Bookmark Mutations
// ============================================================================

export const ADD_BOOKMARK = gql`
  mutation AddBookmark(
    $messageId: uuid!
    $userId: uuid!
    $note: String
    $tags: jsonb
    $collectionIds: jsonb
  ) {
    insert_nchat_bookmarks_one(
      object: {
        message_id: $messageId
        user_id: $userId
        note: $note
        tags: $tags
        collection_ids: $collectionIds
      }
      on_conflict: {
        constraint: bookmarks_message_id_user_id_key
        update_columns: [bookmarked_at, note, tags, collection_ids]
      }
    ) {
      id
      message_id
      user_id
      bookmarked_at
      note
      tags
      collection_ids
      message {
        id
        content
        created_at
        user {
          id
          display_name
          avatar_url
        }
        channel {
          id
          name
        }
      }
    }
  }
`;

export const REMOVE_BOOKMARK = gql`
  mutation RemoveBookmark($bookmarkId: uuid!) {
    delete_nchat_bookmarks_by_pk(id: $bookmarkId) {
      id
      message_id
      user_id
    }
  }
`;

export const REMOVE_BOOKMARK_BY_MESSAGE = gql`
  mutation RemoveBookmarkByMessage($userId: uuid!, $messageId: uuid!) {
    delete_nchat_bookmarks(
      where: { user_id: { _eq: $userId }, message_id: { _eq: $messageId } }
    ) {
      affected_rows
      returning {
        id
        message_id
      }
    }
  }
`;

export const UPDATE_BOOKMARK = gql`
  mutation UpdateBookmark(
    $bookmarkId: uuid!
    $note: String
    $tags: jsonb
    $collectionIds: jsonb
  ) {
    update_nchat_bookmarks_by_pk(
      pk_columns: { id: $bookmarkId }
      _set: { note: $note, tags: $tags, collection_ids: $collectionIds }
    ) {
      id
      message_id
      note
      tags
      collection_ids
      bookmarked_at
    }
  }
`;

export const ADD_BOOKMARK_TAG = gql`
  mutation AddBookmarkTag($bookmarkId: uuid!, $tag: String!) {
    update_nchat_bookmarks_by_pk(
      pk_columns: { id: $bookmarkId }
      _append: { tags: [$tag] }
    ) {
      id
      tags
    }
  }
`;

export const REMOVE_BOOKMARK_TAG = gql`
  mutation RemoveBookmarkTag($bookmarkId: uuid!, $tag: String!) {
    update_nchat_bookmarks_by_pk(
      pk_columns: { id: $bookmarkId }
      _delete_elem: { tags: $tag }
    ) {
      id
      tags
    }
  }
`;

export const ADD_TO_COLLECTION = gql`
  mutation AddToCollection($bookmarkId: uuid!, $collectionId: uuid!) {
    update_nchat_bookmarks_by_pk(
      pk_columns: { id: $bookmarkId }
      _append: { collection_ids: [$collectionId] }
    ) {
      id
      collection_ids
    }
  }
`;

export const REMOVE_FROM_COLLECTION = gql`
  mutation RemoveFromCollection($bookmarkId: uuid!, $collectionId: uuid!) {
    update_nchat_bookmarks_by_pk(
      pk_columns: { id: $bookmarkId }
      _delete_elem: { collection_ids: $collectionId }
    ) {
      id
      collection_ids
    }
  }
`;

export const BATCH_ADD_BOOKMARKS = gql`
  mutation BatchAddBookmarks($bookmarks: [nchat_bookmarks_insert_input!]!) {
    insert_nchat_bookmarks(
      objects: $bookmarks
      on_conflict: {
        constraint: bookmarks_message_id_user_id_key
        update_columns: [bookmarked_at]
      }
    ) {
      affected_rows
      returning {
        id
        message_id
        bookmarked_at
      }
    }
  }
`;

export const BATCH_REMOVE_BOOKMARKS = gql`
  mutation BatchRemoveBookmarks($bookmarkIds: [uuid!]!) {
    delete_nchat_bookmarks(where: { id: { _in: $bookmarkIds } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// Bookmark Collection Mutations
// ============================================================================

export const CREATE_BOOKMARK_COLLECTION = gql`
  mutation CreateBookmarkCollection(
    $userId: uuid!
    $name: String!
    $description: String
    $icon: String
    $color: String
    $isPrivate: Boolean
    $sortOrder: Int
  ) {
    insert_nchat_bookmark_collections_one(
      object: {
        user_id: $userId
        name: $name
        description: $description
        icon: $icon
        color: $color
        is_private: $isPrivate
        sort_order: $sortOrder
      }
    ) {
      id
      name
      description
      user_id
      icon
      color
      is_private
      sort_order
      created_at
      updated_at
      bookmarks_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const UPDATE_BOOKMARK_COLLECTION = gql`
  mutation UpdateBookmarkCollection(
    $collectionId: uuid!
    $name: String
    $description: String
    $icon: String
    $color: String
    $isPrivate: Boolean
    $sortOrder: Int
  ) {
    update_nchat_bookmark_collections_by_pk(
      pk_columns: { id: $collectionId }
      _set: {
        name: $name
        description: $description
        icon: $icon
        color: $color
        is_private: $isPrivate
        sort_order: $sortOrder
        updated_at: "now()"
      }
    ) {
      id
      name
      description
      icon
      color
      is_private
      sort_order
      updated_at
    }
  }
`;

export const DELETE_BOOKMARK_COLLECTION = gql`
  mutation DeleteBookmarkCollection($collectionId: uuid!) {
    delete_nchat_bookmark_collections_by_pk(id: $collectionId) {
      id
      name
    }
  }
`;

export const REORDER_BOOKMARK_COLLECTIONS = gql`
  mutation ReorderBookmarkCollections(
    $updates: [nchat_bookmark_collections_updates!]!
  ) {
    update_nchat_bookmark_collections_many(updates: $updates) {
      affected_rows
    }
  }
`;

// ============================================================================
// Saved Messages Mutations
// ============================================================================

export const SAVE_MESSAGE = gql`
  mutation SaveMessage(
    $userId: uuid!
    $content: String!
    $originalMessageId: uuid
    $sourceChannelId: uuid
    $note: String
    $tags: jsonb
    $attachments: jsonb
  ) {
    insert_nchat_saved_messages_one(
      object: {
        user_id: $userId
        content: $content
        original_message_id: $originalMessageId
        source_channel_id: $sourceChannelId
        note: $note
        tags: $tags
        attachments: $attachments
      }
    ) {
      id
      user_id
      content
      saved_at
      note
      tags
      source_channel_id
      original_message_id
      attachments
      source_channel {
        id
        name
        type
      }
      original_message {
        id
        user {
          id
          display_name
          avatar_url
        }
      }
    }
  }
`;

export const UPDATE_SAVED_MESSAGE = gql`
  mutation UpdateSavedMessage(
    $savedMessageId: uuid!
    $content: String
    $note: String
    $tags: jsonb
  ) {
    update_nchat_saved_messages_by_pk(
      pk_columns: { id: $savedMessageId }
      _set: { content: $content, note: $note, tags: $tags }
    ) {
      id
      content
      note
      tags
      saved_at
    }
  }
`;

export const DELETE_SAVED_MESSAGE = gql`
  mutation DeleteSavedMessage($savedMessageId: uuid!) {
    delete_nchat_saved_messages_by_pk(id: $savedMessageId) {
      id
      user_id
    }
  }
`;

export const BATCH_DELETE_SAVED_MESSAGES = gql`
  mutation BatchDeleteSavedMessages($savedMessageIds: [uuid!]!) {
    delete_nchat_saved_messages(where: { id: { _in: $savedMessageIds } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// Input Types (TypeScript)
// ============================================================================

export interface AddBookmarkInput {
  messageId: string;
  userId: string;
  note?: string;
  tags?: string[];
  collectionIds?: string[];
}

export interface UpdateBookmarkInput {
  bookmarkId: string;
  note?: string;
  tags?: string[];
  collectionIds?: string[];
}

export interface RemoveBookmarkInput {
  bookmarkId: string;
}

export interface CreateBookmarkCollectionInput {
  userId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isPrivate?: boolean;
  sortOrder?: number;
}

export interface UpdateBookmarkCollectionInput {
  collectionId: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  isPrivate?: boolean;
  sortOrder?: number;
}

export interface SaveMessageInput {
  userId: string;
  content: string;
  originalMessageId?: string;
  sourceChannelId?: string;
  note?: string;
  tags?: string[];
  attachments?: unknown[];
}

export interface UpdateSavedMessageInput {
  savedMessageId: string;
  content?: string;
  note?: string;
  tags?: string[];
}

export interface BatchAddBookmarksInput {
  bookmarks: Array<{
    messageId: string;
    userId: string;
    note?: string;
    tags?: string[];
    collectionIds?: string[];
  }>;
}
