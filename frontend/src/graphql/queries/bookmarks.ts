/**
 * Bookmark GraphQL Queries
 *
 * Queries for fetching bookmarks, collections, and saved messages.
 */

import { gql } from "@apollo/client";

// ============================================================================
// Bookmark Fragments
// ============================================================================

export const BOOKMARK_FRAGMENT = gql`
  fragment BookmarkFields on nchat_bookmarks {
    id
    message_id
    user_id
    bookmarked_at
    note
    tags
    collection_ids
  }
`;

export const BOOKMARK_WITH_MESSAGE_FRAGMENT = gql`
  fragment BookmarkWithMessageFields on nchat_bookmarks {
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
      channel_id
      user_id
      attachments
      is_edited
      is_deleted
      user {
        id
        username
        display_name
        avatar_url
        role
      }
      channel {
        id
        name
        type
      }
      reactions_aggregate {
        aggregate {
          count
        }
      }
      thread_replies_aggregate: replies_aggregate(
        where: { is_deleted: { _eq: false } }
      ) {
        aggregate {
          count
        }
      }
    }
  }
`;

export const BOOKMARK_COLLECTION_FRAGMENT = gql`
  fragment BookmarkCollectionFields on nchat_bookmark_collections {
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
`;

export const SAVED_MESSAGE_FRAGMENT = gql`
  fragment SavedMessageFields on nchat_saved_messages {
    id
    user_id
    original_message_id
    content
    saved_at
    note
    source_channel_id
    attachments
    tags
    source_channel {
      id
      name
      type
    }
    original_message {
      id
      user {
        id
        username
        display_name
        avatar_url
      }
    }
  }
`;

// ============================================================================
// Bookmark Queries
// ============================================================================

export const GET_BOOKMARKS = gql`
  ${BOOKMARK_WITH_MESSAGE_FRAGMENT}
  query GetBookmarks($userId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_bookmarks(
      where: { user_id: { _eq: $userId } }
      order_by: { bookmarked_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...BookmarkWithMessageFields
    }
  }
`;

export const GET_BOOKMARK_BY_ID = gql`
  ${BOOKMARK_WITH_MESSAGE_FRAGMENT}
  query GetBookmarkById($bookmarkId: uuid!) {
    nchat_bookmarks_by_pk(id: $bookmarkId) {
      ...BookmarkWithMessageFields
    }
  }
`;

export const GET_BOOKMARK_BY_MESSAGE = gql`
  ${BOOKMARK_FRAGMENT}
  query GetBookmarkByMessage($userId: uuid!, $messageId: uuid!) {
    nchat_bookmarks(
      where: { user_id: { _eq: $userId }, message_id: { _eq: $messageId } }
      limit: 1
    ) {
      ...BookmarkFields
    }
  }
`;

export const GET_BOOKMARKS_BY_CHANNEL = gql`
  ${BOOKMARK_WITH_MESSAGE_FRAGMENT}
  query GetBookmarksByChannel(
    $userId: uuid!
    $channelId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_bookmarks(
      where: {
        user_id: { _eq: $userId }
        message: { channel_id: { _eq: $channelId } }
      }
      order_by: { bookmarked_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...BookmarkWithMessageFields
    }
  }
`;

export const GET_BOOKMARKS_BY_COLLECTION = gql`
  ${BOOKMARK_WITH_MESSAGE_FRAGMENT}
  query GetBookmarksByCollection(
    $userId: uuid!
    $collectionId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_bookmarks(
      where: {
        user_id: { _eq: $userId }
        collection_ids: { _contains: $collectionId }
      }
      order_by: { bookmarked_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...BookmarkWithMessageFields
    }
  }
`;

export const GET_BOOKMARKS_BY_TAG = gql`
  ${BOOKMARK_WITH_MESSAGE_FRAGMENT}
  query GetBookmarksByTag(
    $userId: uuid!
    $tag: String!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_bookmarks(
      where: { user_id: { _eq: $userId }, tags: { _contains: $tag } }
      order_by: { bookmarked_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...BookmarkWithMessageFields
    }
  }
`;

export const SEARCH_BOOKMARKS = gql`
  ${BOOKMARK_WITH_MESSAGE_FRAGMENT}
  query SearchBookmarks(
    $userId: uuid!
    $searchQuery: String!
    $channelId: uuid
    $collectionId: uuid
    $fromDate: timestamptz
    $toDate: timestamptz
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_bookmarks(
      where: {
        _and: [
          { user_id: { _eq: $userId } }
          {
            _or: [
              { message: { content: { _ilike: $searchQuery } } }
              { note: { _ilike: $searchQuery } }
            ]
          }
          { message: { channel_id: { _eq: $channelId } } }
          { collection_ids: { _contains: $collectionId } }
          { bookmarked_at: { _gte: $fromDate } }
          { bookmarked_at: { _lte: $toDate } }
        ]
      }
      order_by: { bookmarked_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...BookmarkWithMessageFields
    }
  }
`;

export const GET_BOOKMARK_COUNT = gql`
  query GetBookmarkCount($userId: uuid!) {
    nchat_bookmarks_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_BOOKMARK_STATS = gql`
  query GetBookmarkStats($userId: uuid!) {
    # Total count
    total: nchat_bookmarks_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        count
      }
    }

    # By channel
    by_channel: nchat_bookmarks(
      where: { user_id: { _eq: $userId } }
      distinct_on: channel_id
    ) {
      message {
        channel_id
        channel {
          id
          name
        }
      }
    }

    # Recent activity (last 30 days)
    recent: nchat_bookmarks_aggregate(
      where: {
        user_id: { _eq: $userId }
        bookmarked_at: { _gte: "now() - interval '30 days'" }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// Bookmark Collection Queries
// ============================================================================

export const GET_BOOKMARK_COLLECTIONS = gql`
  ${BOOKMARK_COLLECTION_FRAGMENT}
  query GetBookmarkCollections($userId: uuid!) {
    nchat_bookmark_collections(
      where: { user_id: { _eq: $userId } }
      order_by: { sort_order: asc, created_at: desc }
    ) {
      ...BookmarkCollectionFields
    }
  }
`;

export const GET_BOOKMARK_COLLECTION = gql`
  ${BOOKMARK_COLLECTION_FRAGMENT}
  query GetBookmarkCollection($collectionId: uuid!) {
    nchat_bookmark_collections_by_pk(id: $collectionId) {
      ...BookmarkCollectionFields
    }
  }
`;

export const GET_COLLECTION_WITH_BOOKMARKS = gql`
  ${BOOKMARK_COLLECTION_FRAGMENT}
  ${BOOKMARK_WITH_MESSAGE_FRAGMENT}
  query GetCollectionWithBookmarks(
    $collectionId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_bookmark_collections_by_pk(id: $collectionId) {
      ...BookmarkCollectionFields
      bookmarks(
        order_by: { bookmarked_at: desc }
        limit: $limit
        offset: $offset
      ) {
        ...BookmarkWithMessageFields
      }
    }
  }
`;

// ============================================================================
// Saved Messages Queries
// ============================================================================

export const GET_SAVED_MESSAGES = gql`
  ${SAVED_MESSAGE_FRAGMENT}
  query GetSavedMessages($userId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_saved_messages(
      where: { user_id: { _eq: $userId } }
      order_by: { saved_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...SavedMessageFields
    }
  }
`;

export const GET_SAVED_MESSAGE = gql`
  ${SAVED_MESSAGE_FRAGMENT}
  query GetSavedMessage($savedMessageId: uuid!) {
    nchat_saved_messages_by_pk(id: $savedMessageId) {
      ...SavedMessageFields
    }
  }
`;

export const SEARCH_SAVED_MESSAGES = gql`
  ${SAVED_MESSAGE_FRAGMENT}
  query SearchSavedMessages(
    $userId: uuid!
    $searchQuery: String!
    $channelId: uuid
    $fromDate: timestamptz
    $toDate: timestamptz
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_saved_messages(
      where: {
        _and: [
          { user_id: { _eq: $userId } }
          {
            _or: [
              { content: { _ilike: $searchQuery } }
              { note: { _ilike: $searchQuery } }
            ]
          }
          { source_channel_id: { _eq: $channelId } }
          { saved_at: { _gte: $fromDate } }
          { saved_at: { _lte: $toDate } }
        ]
      }
      order_by: { saved_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...SavedMessageFields
    }
  }
`;

export const GET_SAVED_MESSAGE_COUNT = gql`
  query GetSavedMessageCount($userId: uuid!) {
    nchat_saved_messages_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// Subscription Operations
// ============================================================================

export const BOOKMARK_SUBSCRIPTION = gql`
  ${BOOKMARK_WITH_MESSAGE_FRAGMENT}
  subscription BookmarkSubscription($userId: uuid!) {
    nchat_bookmarks(
      where: { user_id: { _eq: $userId } }
      order_by: { bookmarked_at: desc }
      limit: 1
    ) {
      ...BookmarkWithMessageFields
    }
  }
`;

export const SAVED_MESSAGE_SUBSCRIPTION = gql`
  ${SAVED_MESSAGE_FRAGMENT}
  subscription SavedMessageSubscription($userId: uuid!) {
    nchat_saved_messages(
      where: { user_id: { _eq: $userId } }
      order_by: { saved_at: desc }
      limit: 1
    ) {
      ...SavedMessageFields
    }
  }
`;
