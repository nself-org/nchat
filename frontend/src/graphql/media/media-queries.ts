/**
 * Media GraphQL Queries and Mutations
 *
 * GraphQL operations for the media gallery system.
 */

import { gql } from "@apollo/client";

// ============================================================================
// Fragments
// ============================================================================

export const MEDIA_USER_FRAGMENT = gql`
  fragment MediaUserFragment on nchat_users {
    id
    username
    display_name
    avatar_url
  }
`;

export const MEDIA_ITEM_FRAGMENT = gql`
  fragment MediaItemFragment on nchat_media {
    id
    file_name
    file_type
    mime_type
    file_size
    file_extension
    url
    thumbnail_url
    preview_url
    download_url
    channel_id
    thread_id
    message_id
    uploaded_by_id
    width
    height
    duration
    metadata
    is_deleted
    created_at
    updated_at
    uploaded_by {
      ...MediaUserFragment
    }
    channel {
      id
      name
      slug
    }
  }
  ${MEDIA_USER_FRAGMENT}
`;

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all media items with pagination and filters
 */
export const GET_MEDIA = gql`
  query GetMedia(
    $limit: Int = 50
    $offset: Int = 0
    $where: nchat_media_bool_exp
    $orderBy: [nchat_media_order_by!]
  ) {
    nchat_media(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $orderBy
    ) {
      ...MediaItemFragment
    }
    nchat_media_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
  ${MEDIA_ITEM_FRAGMENT}
`;

/**
 * Get media items by channel
 */
export const GET_CHANNEL_MEDIA = gql`
  query GetChannelMedia(
    $channelId: uuid!
    $limit: Int = 50
    $offset: Int = 0
    $fileType: String
  ) {
    nchat_media(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: { _eq: $fileType }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MediaItemFragment
    }
    nchat_media_aggregate(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: { _eq: $fileType }
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MEDIA_ITEM_FRAGMENT}
`;

/**
 * Get media items by thread
 */
export const GET_THREAD_MEDIA = gql`
  query GetThreadMedia($threadId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_media(
      where: { thread_id: { _eq: $threadId }, is_deleted: { _eq: false } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MediaItemFragment
    }
    nchat_media_aggregate(
      where: { thread_id: { _eq: $threadId }, is_deleted: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MEDIA_ITEM_FRAGMENT}
`;

/**
 * Get media items by user
 */
export const GET_USER_MEDIA = gql`
  query GetUserMedia(
    $userId: uuid!
    $limit: Int = 50
    $offset: Int = 0
    $fileType: String
  ) {
    nchat_media(
      where: {
        uploaded_by_id: { _eq: $userId }
        is_deleted: { _eq: false }
        file_type: { _eq: $fileType }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MediaItemFragment
    }
    nchat_media_aggregate(
      where: {
        uploaded_by_id: { _eq: $userId }
        is_deleted: { _eq: false }
        file_type: { _eq: $fileType }
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MEDIA_ITEM_FRAGMENT}
`;

/**
 * Get single media item by ID
 */
export const GET_MEDIA_BY_ID = gql`
  query GetMediaById($id: uuid!) {
    nchat_media_by_pk(id: $id) {
      ...MediaItemFragment
    }
  }
  ${MEDIA_ITEM_FRAGMENT}
`;

/**
 * Search media by filename
 */
export const SEARCH_MEDIA = gql`
  query SearchMedia(
    $searchQuery: String!
    $limit: Int = 50
    $offset: Int = 0
    $channelId: uuid
    $fileType: String
  ) {
    nchat_media(
      where: {
        _and: [
          { is_deleted: { _eq: false } }
          { file_name: { _ilike: $searchQuery } }
          { channel_id: { _eq: $channelId } }
          { file_type: { _eq: $fileType } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MediaItemFragment
    }
    nchat_media_aggregate(
      where: {
        _and: [
          { is_deleted: { _eq: false } }
          { file_name: { _ilike: $searchQuery } }
          { channel_id: { _eq: $channelId } }
          { file_type: { _eq: $fileType } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MEDIA_ITEM_FRAGMENT}
`;

/**
 * Get media statistics by type
 */
export const GET_MEDIA_STATS = gql`
  query GetMediaStats($channelId: uuid, $userId: uuid) {
    images: nchat_media_aggregate(
      where: {
        file_type: { _eq: "image" }
        is_deleted: { _eq: false }
        channel_id: { _eq: $channelId }
        uploaded_by_id: { _eq: $userId }
      }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }
    videos: nchat_media_aggregate(
      where: {
        file_type: { _eq: "video" }
        is_deleted: { _eq: false }
        channel_id: { _eq: $channelId }
        uploaded_by_id: { _eq: $userId }
      }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }
    audio: nchat_media_aggregate(
      where: {
        file_type: { _eq: "audio" }
        is_deleted: { _eq: false }
        channel_id: { _eq: $channelId }
        uploaded_by_id: { _eq: $userId }
      }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }
    documents: nchat_media_aggregate(
      where: {
        file_type: { _eq: "document" }
        is_deleted: { _eq: false }
        channel_id: { _eq: $channelId }
        uploaded_by_id: { _eq: $userId }
      }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }
    total: nchat_media_aggregate(
      where: {
        is_deleted: { _eq: false }
        channel_id: { _eq: $channelId }
        uploaded_by_id: { _eq: $userId }
      }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }
  }
`;

// ============================================================================
// Mutations
// ============================================================================

/**
 * Insert a new media item
 */
export const INSERT_MEDIA = gql`
  mutation InsertMedia($object: nchat_media_insert_input!) {
    insert_nchat_media_one(object: $object) {
      ...MediaItemFragment
    }
  }
  ${MEDIA_ITEM_FRAGMENT}
`;

/**
 * Insert multiple media items
 */
export const INSERT_MEDIA_BULK = gql`
  mutation InsertMediaBulk($objects: [nchat_media_insert_input!]!) {
    insert_nchat_media(objects: $objects) {
      returning {
        ...MediaItemFragment
      }
    }
  }
  ${MEDIA_ITEM_FRAGMENT}
`;

/**
 * Update a media item
 */
export const UPDATE_MEDIA = gql`
  mutation UpdateMedia($id: uuid!, $set: nchat_media_set_input!) {
    update_nchat_media_by_pk(pk_columns: { id: $id }, _set: $set) {
      ...MediaItemFragment
    }
  }
  ${MEDIA_ITEM_FRAGMENT}
`;

/**
 * Soft delete a media item
 */
export const DELETE_MEDIA = gql`
  mutation DeleteMedia($id: uuid!) {
    update_nchat_media_by_pk(
      pk_columns: { id: $id }
      _set: { is_deleted: true }
    ) {
      id
      is_deleted
    }
  }
`;

/**
 * Soft delete multiple media items
 */
export const DELETE_MEDIA_BULK = gql`
  mutation DeleteMediaBulk($ids: [uuid!]!) {
    update_nchat_media(
      where: { id: { _in: $ids } }
      _set: { is_deleted: true }
    ) {
      affected_rows
      returning {
        id
      }
    }
  }
`;

/**
 * Hard delete a media item (permanent)
 */
export const HARD_DELETE_MEDIA = gql`
  mutation HardDeleteMedia($id: uuid!) {
    delete_nchat_media_by_pk(id: $id) {
      id
    }
  }
`;

/**
 * Restore a soft-deleted media item
 */
export const RESTORE_MEDIA = gql`
  mutation RestoreMedia($id: uuid!) {
    update_nchat_media_by_pk(
      pk_columns: { id: $id }
      _set: { is_deleted: false }
    ) {
      ...MediaItemFragment
    }
  }
  ${MEDIA_ITEM_FRAGMENT}
`;

// ============================================================================
// Subscriptions
// ============================================================================

/**
 * Subscribe to new media in a channel
 */
export const SUBSCRIBE_CHANNEL_MEDIA = gql`
  subscription SubscribeChannelMedia($channelId: uuid!) {
    nchat_media(
      where: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...MediaItemFragment
    }
  }
  ${MEDIA_ITEM_FRAGMENT}
`;

/**
 * Subscribe to media updates
 */
export const SUBSCRIBE_MEDIA_UPDATES = gql`
  subscription SubscribeMediaUpdates($ids: [uuid!]!) {
    nchat_media(where: { id: { _in: $ids } }) {
      ...MediaItemFragment
    }
  }
  ${MEDIA_ITEM_FRAGMENT}
`;

// ============================================================================
// Type Definitions for Query Results
// ============================================================================

export interface MediaQueryResult {
  nchat_media: MediaItemResult[];
  nchat_media_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface MediaItemResult {
  id: string;
  file_name: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  file_extension: string;
  url: string;
  thumbnail_url: string | null;
  preview_url: string | null;
  download_url: string | null;
  channel_id: string | null;
  thread_id: string | null;
  message_id: string | null;
  uploaded_by_id: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  metadata: Record<string, unknown> | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  uploaded_by: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  channel: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface MediaStatsResult {
  images: { aggregate: { count: number; sum: { file_size: number } } };
  videos: { aggregate: { count: number; sum: { file_size: number } } };
  audio: { aggregate: { count: number; sum: { file_size: number } } };
  documents: { aggregate: { count: number; sum: { file_size: number } } };
  total: { aggregate: { count: number; sum: { file_size: number } } };
}
