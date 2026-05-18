/**
 * Media GraphQL Operations
 *
 * GraphQL queries, mutations, and subscriptions for media management.
 * Connects to the Hasura GraphQL backend via nchat_media table.
 */

import { gql } from "@apollo/client";

// ============================================================================
// FRAGMENTS
// ============================================================================

/**
 * Basic media fields fragment
 */
export const MEDIA_BASIC_FRAGMENT = gql`
  fragment MediaBasic on nchat_media {
    id
    user_id
    channel_id
    name
    original_name
    mime_type
    size
    url
    thumbnail_url
    created_at
    updated_at
  }
`;

/**
 * Full media fields fragment with metadata
 */
export const MEDIA_FULL_FRAGMENT = gql`
  fragment MediaFull on nchat_media {
    id
    user_id
    channel_id
    name
    original_name
    mime_type
    size
    url
    thumbnail_url
    metadata
    created_at
    updated_at
    user {
      id
      display_name
      avatar_url
    }
    channel {
      id
      name
      slug
    }
  }
`;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MediaRecord {
  id: string;
  user_id: string;
  channel_id?: string | null;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url?: string | null;
  metadata?: MediaMetadata | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  channel?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  description?: string;
  alt_text?: string;
  tags?: string[];
  processing_status?: "pending" | "processing" | "completed" | "failed";
  processing_job_id?: string;
  content_hash?: string;
  storage_path?: string;
  bucket?: string;
  [key: string]: unknown;
}

export interface GetUserMediaVariables {
  userId: string;
  limit?: number;
  offset?: number;
  mimeTypeFilter?: string;
  channelId?: string;
  orderBy?: "created_at" | "name" | "size";
  orderDirection?: "asc" | "desc";
}

export interface GetMediaByIdVariables {
  id: string;
}

export interface GetMediaByChannelVariables {
  channelId: string;
  limit?: number;
  offset?: number;
  mimeTypeFilter?: string;
}

export interface InsertMediaVariables {
  userId: string;
  channelId?: string | null;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string | null;
  metadata?: MediaMetadata | null;
}

export interface UpdateMediaVariables {
  id: string;
  name?: string;
  metadata?: MediaMetadata | null;
}

export interface DeleteMediaVariables {
  id: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get user's media with pagination and filters
 */
export const GET_USER_MEDIA = gql`
  query GetUserMedia(
    $userId: uuid!
    $limit: Int = 50
    $offset: Int = 0
    $mimeTypeFilter: String
    $channelId: uuid
  ) {
    nchat_media(
      where: {
        user_id: { _eq: $userId }
        _and: [
          { mime_type: { _ilike: $mimeTypeFilter } }
          { channel_id: { _eq: $channelId } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MediaFull
    }
    nchat_media_aggregate(
      where: {
        user_id: { _eq: $userId }
        _and: [
          { mime_type: { _ilike: $mimeTypeFilter } }
          { channel_id: { _eq: $channelId } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MEDIA_FULL_FRAGMENT}
`;

/**
 * Get a single media item by ID
 */
export const GET_MEDIA_BY_ID = gql`
  query GetMediaById($id: uuid!) {
    nchat_media_by_pk(id: $id) {
      ...MediaFull
    }
  }
  ${MEDIA_FULL_FRAGMENT}
`;

/**
 * Get media for a specific channel with pagination
 */
export const GET_MEDIA_BY_CHANNEL = gql`
  query GetMediaByChannel(
    $channelId: uuid!
    $limit: Int = 50
    $offset: Int = 0
    $mimeTypeFilter: String
  ) {
    nchat_media(
      where: {
        channel_id: { _eq: $channelId }
        mime_type: { _ilike: $mimeTypeFilter }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MediaFull
    }
    nchat_media_aggregate(
      where: {
        channel_id: { _eq: $channelId }
        mime_type: { _ilike: $mimeTypeFilter }
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MEDIA_FULL_FRAGMENT}
`;

/**
 * Search media by name
 */
export const SEARCH_MEDIA = gql`
  query SearchMedia(
    $userId: uuid!
    $query: String!
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_media(
      where: {
        user_id: { _eq: $userId }
        _or: [
          { name: { _ilike: $query } }
          { original_name: { _ilike: $query } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MediaFull
    }
    nchat_media_aggregate(
      where: {
        user_id: { _eq: $userId }
        _or: [
          { name: { _ilike: $query } }
          { original_name: { _ilike: $query } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MEDIA_FULL_FRAGMENT}
`;

/**
 * Get media stats for a user
 */
export const GET_USER_MEDIA_STATS = gql`
  query GetUserMediaStats($userId: uuid!) {
    total: nchat_media_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        count
        sum {
          size
        }
      }
    }
    images: nchat_media_aggregate(
      where: { user_id: { _eq: $userId }, mime_type: { _ilike: "image/%" } }
    ) {
      aggregate {
        count
      }
    }
    videos: nchat_media_aggregate(
      where: { user_id: { _eq: $userId }, mime_type: { _ilike: "video/%" } }
    ) {
      aggregate {
        count
      }
    }
    audio: nchat_media_aggregate(
      where: { user_id: { _eq: $userId }, mime_type: { _ilike: "audio/%" } }
    ) {
      aggregate {
        count
      }
    }
    documents: nchat_media_aggregate(
      where: {
        user_id: { _eq: $userId }
        _or: [
          { mime_type: { _ilike: "application/pdf%" } }
          { mime_type: { _ilike: "%document%" } }
          { mime_type: { _ilike: "%word%" } }
          { mime_type: { _ilike: "%excel%" } }
          { mime_type: { _ilike: "%spreadsheet%" } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Insert a new media record
 */
export const INSERT_MEDIA = gql`
  mutation InsertMedia(
    $userId: uuid!
    $channelId: uuid
    $name: String!
    $originalName: String!
    $mimeType: String!
    $size: Int!
    $url: String!
    $thumbnailUrl: String
    $metadata: jsonb
  ) {
    insert_nchat_media_one(
      object: {
        user_id: $userId
        channel_id: $channelId
        name: $name
        original_name: $originalName
        mime_type: $mimeType
        size: $size
        url: $url
        thumbnail_url: $thumbnailUrl
        metadata: $metadata
      }
    ) {
      ...MediaFull
    }
  }
  ${MEDIA_FULL_FRAGMENT}
`;

/**
 * Update media metadata (name, description, etc.)
 */
export const UPDATE_MEDIA = gql`
  mutation UpdateMedia($id: uuid!, $name: String, $metadata: jsonb) {
    update_nchat_media_by_pk(
      pk_columns: { id: $id }
      _set: { name: $name, updated_at: "now()" }
      _append: { metadata: $metadata }
    ) {
      ...MediaFull
    }
  }
  ${MEDIA_FULL_FRAGMENT}
`;

/**
 * Update media metadata only
 */
export const UPDATE_MEDIA_METADATA = gql`
  mutation UpdateMediaMetadata($id: uuid!, $metadata: jsonb!) {
    update_nchat_media_by_pk(
      pk_columns: { id: $id }
      _set: { metadata: $metadata, updated_at: "now()" }
    ) {
      ...MediaBasic
    }
  }
  ${MEDIA_BASIC_FRAGMENT}
`;

/**
 * Delete a media record
 */
export const DELETE_MEDIA = gql`
  mutation DeleteMedia($id: uuid!) {
    delete_nchat_media_by_pk(id: $id) {
      id
      name
      url
      metadata
    }
  }
`;

/**
 * Bulk delete media records
 */
export const BULK_DELETE_MEDIA = gql`
  mutation BulkDeleteMedia($ids: [uuid!]!) {
    delete_nchat_media(where: { id: { _in: $ids } }) {
      affected_rows
      returning {
        id
        name
        url
      }
    }
  }
`;

/**
 * Update processing status in metadata
 */
export const UPDATE_PROCESSING_STATUS = gql`
  mutation UpdateProcessingStatus(
    $id: uuid!
    $status: String!
    $jobId: String
    $thumbnailUrl: String
  ) {
    update_nchat_media_by_pk(
      pk_columns: { id: $id }
      _set: { thumbnail_url: $thumbnailUrl, updated_at: "now()" }
      _append: {
        metadata: { processing_status: $status, processing_job_id: $jobId }
      }
    ) {
      ...MediaBasic
    }
  }
  ${MEDIA_BASIC_FRAGMENT}
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new media uploads for a user
 */
export const SUBSCRIBE_USER_MEDIA = gql`
  subscription SubscribeUserMedia($userId: uuid!) {
    nchat_media(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
      limit: 10
    ) {
      ...MediaBasic
    }
  }
  ${MEDIA_BASIC_FRAGMENT}
`;

/**
 * Subscribe to new media in a channel
 */
export const SUBSCRIBE_CHANNEL_MEDIA = gql`
  subscription SubscribeChannelMedia($channelId: uuid!) {
    nchat_media(
      where: { channel_id: { _eq: $channelId } }
      order_by: { created_at: desc }
      limit: 10
    ) {
      ...MediaBasic
    }
  }
  ${MEDIA_BASIC_FRAGMENT}
`;
