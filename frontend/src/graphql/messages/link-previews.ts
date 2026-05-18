/**
 * Link Preview GraphQL Operations
 *
 * GraphQL queries and mutations for link preview caching and management.
 * Uses the nchat_link_previews table for persistent storage.
 */

import { gql } from "@apollo/client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LinkPreviewVariables {
  urlHash: string;
}

export interface InsertLinkPreviewVariables {
  urlHash: string;
  url: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  imageAlt?: string | null;
  siteName?: string | null;
  faviconUrl?: string | null;
  type: string;
  videoUrl?: string | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
  audioUrl?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  domain: string;
  themeColor?: string | null;
  fetchedAt: string;
  expiresAt: string;
}

export interface DeleteExpiredPreviewsVariables {
  now: string;
}

export interface LinkPreviewRecord {
  id: string;
  url_hash: string;
  url: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  image_alt?: string | null;
  site_name?: string | null;
  favicon_url?: string | null;
  type: string;
  video_url?: string | null;
  video_width?: number | null;
  video_height?: number | null;
  audio_url?: string | null;
  author?: string | null;
  published_at?: string | null;
  domain: string;
  theme_color?: string | null;
  fetched_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

/**
 * Full link preview fragment with all fields
 */
export const LINK_PREVIEW_FRAGMENT = gql`
  fragment LinkPreviewFull on nchat_link_previews {
    id
    url_hash
    url
    title
    description
    image_url
    image_width
    image_height
    image_alt
    site_name
    favicon_url
    type
    video_url
    video_width
    video_height
    audio_url
    author
    published_at
    domain
    theme_color
    fetched_at
    expires_at
    created_at
    updated_at
  }
`;

/**
 * Minimal link preview fragment for message display
 */
export const LINK_PREVIEW_BASIC_FRAGMENT = gql`
  fragment LinkPreviewBasic on nchat_link_previews {
    id
    url
    title
    description
    image_url
    site_name
    favicon_url
    domain
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get cached link preview by URL hash
 */
export const GET_LINK_PREVIEW = gql`
  query GetLinkPreview($urlHash: String!) {
    nchat_link_previews(where: { url_hash: { _eq: $urlHash } }, limit: 1) {
      ...LinkPreviewFull
    }
  }
  ${LINK_PREVIEW_FRAGMENT}
`;

/**
 * Get link preview by URL hash, checking if not expired
 */
export const GET_VALID_LINK_PREVIEW = gql`
  query GetValidLinkPreview($urlHash: String!, $now: timestamptz!) {
    nchat_link_previews(
      where: { url_hash: { _eq: $urlHash }, expires_at: { _gt: $now } }
      limit: 1
    ) {
      ...LinkPreviewFull
    }
  }
  ${LINK_PREVIEW_FRAGMENT}
`;

/**
 * Get multiple link previews by URL hashes
 */
export const GET_LINK_PREVIEWS_BY_HASHES = gql`
  query GetLinkPreviewsByHashes($urlHashes: [String!]!) {
    nchat_link_previews(where: { url_hash: { _in: $urlHashes } }) {
      ...LinkPreviewFull
    }
  }
  ${LINK_PREVIEW_FRAGMENT}
`;

/**
 * Get link previews for a specific domain
 */
export const GET_LINK_PREVIEWS_BY_DOMAIN = gql`
  query GetLinkPreviewsByDomain($domain: String!, $limit: Int = 20) {
    nchat_link_previews(
      where: { domain: { _eq: $domain } }
      order_by: { fetched_at: desc }
      limit: $limit
    ) {
      ...LinkPreviewFull
    }
  }
  ${LINK_PREVIEW_FRAGMENT}
`;

/**
 * Get expired link previews (for cleanup)
 */
export const GET_EXPIRED_LINK_PREVIEWS = gql`
  query GetExpiredLinkPreviews($now: timestamptz!, $limit: Int = 100) {
    nchat_link_previews(where: { expires_at: { _lte: $now } }, limit: $limit) {
      id
      url_hash
      url
      domain
      expires_at
    }
  }
`;

/**
 * Get link preview statistics
 */
export const GET_LINK_PREVIEW_STATS = gql`
  query GetLinkPreviewStats {
    total: nchat_link_previews_aggregate {
      aggregate {
        count
      }
    }
    byDomain: nchat_link_previews(distinct_on: domain) {
      domain
      previews: nchat_link_previews_aggregate(
        where: { domain: { _eq: domain } }
      ) {
        aggregate {
          count
        }
      }
    }
    byType: nchat_link_previews(distinct_on: type) {
      type
      previews: nchat_link_previews_aggregate(where: { type: { _eq: type } }) {
        aggregate {
          count
        }
      }
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Insert or update a link preview (upsert)
 */
export const INSERT_LINK_PREVIEW = gql`
  mutation InsertLinkPreview(
    $urlHash: String!
    $url: String!
    $title: String!
    $description: String
    $imageUrl: String
    $imageWidth: Int
    $imageHeight: Int
    $imageAlt: String
    $siteName: String
    $faviconUrl: String
    $type: String!
    $videoUrl: String
    $videoWidth: Int
    $videoHeight: Int
    $audioUrl: String
    $author: String
    $publishedAt: String
    $domain: String!
    $themeColor: String
    $fetchedAt: timestamptz!
    $expiresAt: timestamptz!
  ) {
    insert_nchat_link_previews_one(
      object: {
        url_hash: $urlHash
        url: $url
        title: $title
        description: $description
        image_url: $imageUrl
        image_width: $imageWidth
        image_height: $imageHeight
        image_alt: $imageAlt
        site_name: $siteName
        favicon_url: $faviconUrl
        type: $type
        video_url: $videoUrl
        video_width: $videoWidth
        video_height: $videoHeight
        audio_url: $audioUrl
        author: $author
        published_at: $publishedAt
        domain: $domain
        theme_color: $themeColor
        fetched_at: $fetchedAt
        expires_at: $expiresAt
      }
      on_conflict: {
        constraint: nchat_link_previews_url_hash_key
        update_columns: [
          title
          description
          image_url
          image_width
          image_height
          image_alt
          site_name
          favicon_url
          type
          video_url
          video_width
          video_height
          audio_url
          author
          published_at
          theme_color
          fetched_at
          expires_at
        ]
      }
    ) {
      ...LinkPreviewFull
    }
  }
  ${LINK_PREVIEW_FRAGMENT}
`;

/**
 * Delete expired link previews (cleanup job)
 */
export const DELETE_EXPIRED_PREVIEWS = gql`
  mutation DeleteExpiredPreviews($now: timestamptz!) {
    delete_nchat_link_previews(where: { expires_at: { _lte: $now } }) {
      affected_rows
      returning {
        id
        url_hash
        domain
      }
    }
  }
`;

/**
 * Delete link preview by URL hash
 */
export const DELETE_LINK_PREVIEW = gql`
  mutation DeleteLinkPreview($urlHash: String!) {
    delete_nchat_link_previews(where: { url_hash: { _eq: $urlHash } }) {
      affected_rows
    }
  }
`;

/**
 * Delete all link previews for a domain
 */
export const DELETE_LINK_PREVIEWS_BY_DOMAIN = gql`
  mutation DeleteLinkPreviewsByDomain($domain: String!) {
    delete_nchat_link_previews(where: { domain: { _eq: $domain } }) {
      affected_rows
    }
  }
`;

/**
 * Update link preview expiry
 */
export const UPDATE_LINK_PREVIEW_EXPIRY = gql`
  mutation UpdateLinkPreviewExpiry(
    $urlHash: String!
    $expiresAt: timestamptz!
  ) {
    update_nchat_link_previews(
      where: { url_hash: { _eq: $urlHash } }
      _set: { expires_at: $expiresAt }
    ) {
      affected_rows
      returning {
        id
        url_hash
        expires_at
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to link preview updates for a URL
 */
export const SUBSCRIBE_LINK_PREVIEW = gql`
  subscription SubscribeLinkPreview($urlHash: String!) {
    nchat_link_previews(where: { url_hash: { _eq: $urlHash } }, limit: 1) {
      ...LinkPreviewFull
    }
  }
  ${LINK_PREVIEW_FRAGMENT}
`;

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Transform database record to service format
 */
export function transformLinkPreviewRecord(record: LinkPreviewRecord) {
  return {
    id: record.id,
    urlHash: record.url_hash,
    url: record.url,
    title: record.title,
    description: record.description || undefined,
    imageUrl: record.image_url || undefined,
    imageWidth: record.image_width || undefined,
    imageHeight: record.image_height || undefined,
    imageAlt: record.image_alt || undefined,
    siteName: record.site_name || undefined,
    faviconUrl: record.favicon_url || undefined,
    type: record.type,
    videoUrl: record.video_url || undefined,
    videoWidth: record.video_width || undefined,
    videoHeight: record.video_height || undefined,
    audioUrl: record.audio_url || undefined,
    author: record.author || undefined,
    publishedAt: record.published_at || undefined,
    domain: record.domain,
    themeColor: record.theme_color || undefined,
    fetchedAt: new Date(record.fetched_at),
    expiresAt: new Date(record.expires_at),
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  };
}
