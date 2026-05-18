import { gql } from "@apollo/client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StickerPack {
  id: string;
  name: string;
  description?: string;
  thumbnail_url: string;
  author?: string;
  sticker_count: number;
  is_animated: boolean;
  is_official: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sticker {
  id: string;
  pack_id: string;
  name?: string;
  url: string;
  thumbnail_url?: string;
  emoji?: string;
  width: number;
  height: number;
  is_animated: boolean;
  file_size?: number;
  created_at: string;
}

export interface UserStickerPack {
  id: string;
  user_id: string;
  pack_id: string;
  position: number;
  added_at: string;
  pack: StickerPack;
}

export interface RecentSticker {
  id: string;
  user_id: string;
  sticker_id: string;
  used_at: string;
  use_count: number;
  sticker: Sticker;
}

export interface FavoriteSticker {
  id: string;
  user_id: string;
  sticker_id: string;
  position: number;
  added_at: string;
  sticker: Sticker;
}

// Variables
export interface GetStickerPacksVariables {
  limit?: number;
  offset?: number;
  searchQuery?: string;
}

export interface GetPackStickersVariables {
  packId: string;
}

export interface AddStickerPackVariables {
  userId: string;
  packId: string;
  position?: number;
}

export interface RemoveStickerPackVariables {
  userId: string;
  packId: string;
}

export interface GetUserStickerPacksVariables {
  userId: string;
}

export interface SearchStickersVariables {
  searchQuery: string;
  limit?: number;
}

export interface AddRecentStickerVariables {
  userId: string;
  stickerId: string;
}

export interface AddFavoriteStickerVariables {
  userId: string;
  stickerId: string;
  position?: number;
}

export interface RemoveFavoriteStickerVariables {
  userId: string;
  stickerId: string;
}

export interface ReorderUserPacksVariables {
  userId: string;
  packIds: string[];
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const STICKER_PACK_FRAGMENT = gql`
  fragment StickerPack on nchat_sticker_packs {
    id
    name
    description
    thumbnail_url
    author
    sticker_count
    is_animated
    is_official
    created_at
    updated_at
  }
`;

export const STICKER_FRAGMENT = gql`
  fragment Sticker on nchat_stickers {
    id
    pack_id
    name
    url
    thumbnail_url
    emoji
    width
    height
    is_animated
    file_size
    created_at
  }
`;

export const USER_STICKER_PACK_FRAGMENT = gql`
  fragment UserStickerPack on nchat_user_sticker_packs {
    id
    user_id
    pack_id
    position
    added_at
    pack {
      ...StickerPack
    }
  }
  ${STICKER_PACK_FRAGMENT}
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all available sticker packs
 */
export const GET_STICKER_PACKS = gql`
  query GetStickerPacks(
    $limit: Int = 50
    $offset: Int = 0
    $searchQuery: String
  ) {
    nchat_sticker_packs(
      where: {
        _or: [
          { name: { _ilike: $searchQuery } }
          { description: { _ilike: $searchQuery } }
        ]
      }
      order_by: [{ is_official: desc }, { name: asc }]
      limit: $limit
      offset: $offset
    ) {
      ...StickerPack
    }
    nchat_sticker_packs_aggregate(
      where: {
        _or: [
          { name: { _ilike: $searchQuery } }
          { description: { _ilike: $searchQuery } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${STICKER_PACK_FRAGMENT}
`;

/**
 * Get all stickers from a specific pack
 */
export const GET_PACK_STICKERS = gql`
  query GetPackStickers($packId: uuid!) {
    nchat_stickers(
      where: { pack_id: { _eq: $packId } }
      order_by: { created_at: asc }
    ) {
      ...Sticker
    }
    nchat_sticker_packs_by_pk(id: $packId) {
      ...StickerPack
    }
  }
  ${STICKER_FRAGMENT}
  ${STICKER_PACK_FRAGMENT}
`;

/**
 * Get user's installed sticker packs
 */
export const GET_USER_STICKER_PACKS = gql`
  query GetUserStickerPacks($userId: uuid!) {
    nchat_user_sticker_packs(
      where: { user_id: { _eq: $userId } }
      order_by: { position: asc }
    ) {
      ...UserStickerPack
    }
  }
  ${USER_STICKER_PACK_FRAGMENT}
`;

/**
 * Get user's recently used stickers
 */
export const GET_RECENT_STICKERS = gql`
  query GetRecentStickers($userId: uuid!, $limit: Int = 30) {
    nchat_recent_stickers(
      where: { user_id: { _eq: $userId } }
      order_by: { used_at: desc }
      limit: $limit
    ) {
      id
      user_id
      sticker_id
      used_at
      use_count
      sticker {
        ...Sticker
      }
    }
  }
  ${STICKER_FRAGMENT}
`;

/**
 * Get user's favorite stickers
 */
export const GET_FAVORITE_STICKERS = gql`
  query GetFavoriteStickers($userId: uuid!) {
    nchat_favorite_stickers(
      where: { user_id: { _eq: $userId } }
      order_by: { position: asc }
    ) {
      id
      user_id
      sticker_id
      position
      added_at
      sticker {
        ...Sticker
      }
    }
  }
  ${STICKER_FRAGMENT}
`;

/**
 * Search stickers by name or emoji
 */
export const SEARCH_STICKERS = gql`
  query SearchStickers($searchQuery: String!, $limit: Int = 50) {
    nchat_stickers(
      where: {
        _or: [
          { name: { _ilike: $searchQuery } }
          { emoji: { _ilike: $searchQuery } }
        ]
      }
      limit: $limit
    ) {
      ...Sticker
      pack {
        id
        name
        thumbnail_url
      }
    }
  }
  ${STICKER_FRAGMENT}
`;

/**
 * Get a single sticker pack by ID
 */
export const GET_STICKER_PACK = gql`
  query GetStickerPack($packId: uuid!) {
    nchat_sticker_packs_by_pk(id: $packId) {
      ...StickerPack
      stickers(order_by: { created_at: asc }) {
        ...Sticker
      }
    }
  }
  ${STICKER_PACK_FRAGMENT}
  ${STICKER_FRAGMENT}
`;

/**
 * Check if user has installed a specific pack
 */
export const CHECK_USER_HAS_PACK = gql`
  query CheckUserHasPack($userId: uuid!, $packId: uuid!) {
    nchat_user_sticker_packs(
      where: { user_id: { _eq: $userId }, pack_id: { _eq: $packId } }
      limit: 1
    ) {
      id
    }
  }
`;

/**
 * Get trending/popular sticker packs
 */
export const GET_TRENDING_PACKS = gql`
  query GetTrendingPacks($limit: Int = 10) {
    nchat_sticker_packs(
      order_by: { sticker_count: desc }
      where: { is_official: { _eq: true } }
      limit: $limit
    ) {
      ...StickerPack
    }
  }
  ${STICKER_PACK_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Add a sticker pack to user's collection
 */
export const ADD_STICKER_PACK = gql`
  mutation AddStickerPack($userId: uuid!, $packId: uuid!, $position: Int = 0) {
    insert_nchat_user_sticker_packs_one(
      object: { user_id: $userId, pack_id: $packId, position: $position }
      on_conflict: {
        constraint: nchat_user_sticker_packs_user_id_pack_id_key
        update_columns: []
      }
    ) {
      ...UserStickerPack
    }
  }
  ${USER_STICKER_PACK_FRAGMENT}
`;

/**
 * Remove a sticker pack from user's collection
 */
export const REMOVE_STICKER_PACK = gql`
  mutation RemoveStickerPack($userId: uuid!, $packId: uuid!) {
    delete_nchat_user_sticker_packs(
      where: { user_id: { _eq: $userId }, pack_id: { _eq: $packId } }
    ) {
      affected_rows
      returning {
        id
        pack_id
      }
    }
  }
`;

/**
 * Reorder user's sticker packs
 */
export const REORDER_USER_PACKS = gql`
  mutation ReorderUserPacks($updates: [nchat_user_sticker_packs_updates!]!) {
    update_nchat_user_sticker_packs_many(updates: $updates) {
      affected_rows
      returning {
        id
        position
      }
    }
  }
`;

/**
 * Add or update a recent sticker
 */
export const ADD_RECENT_STICKER = gql`
  mutation AddRecentSticker($userId: uuid!, $stickerId: uuid!) {
    insert_nchat_recent_stickers_one(
      object: { user_id: $userId, sticker_id: $stickerId, use_count: 1 }
      on_conflict: {
        constraint: nchat_recent_stickers_user_id_sticker_id_key
        update_columns: [used_at, use_count]
      }
    ) {
      id
      used_at
      use_count
    }
  }
`;

/**
 * Increment recent sticker use count (using custom function or direct update)
 */
export const INCREMENT_STICKER_USE = gql`
  mutation IncrementStickerUse($userId: uuid!, $stickerId: uuid!) {
    update_nchat_recent_stickers(
      where: { user_id: { _eq: $userId }, sticker_id: { _eq: $stickerId } }
      _inc: { use_count: 1 }
      _set: { used_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        use_count
        used_at
      }
    }
  }
`;

/**
 * Add a sticker to favorites
 */
export const ADD_FAVORITE_STICKER = gql`
  mutation AddFavoriteSticker(
    $userId: uuid!
    $stickerId: uuid!
    $position: Int = 0
  ) {
    insert_nchat_favorite_stickers_one(
      object: { user_id: $userId, sticker_id: $stickerId, position: $position }
      on_conflict: {
        constraint: nchat_favorite_stickers_user_id_sticker_id_key
        update_columns: [position]
      }
    ) {
      id
      position
      added_at
      sticker {
        ...Sticker
      }
    }
  }
  ${STICKER_FRAGMENT}
`;

/**
 * Remove a sticker from favorites
 */
export const REMOVE_FAVORITE_STICKER = gql`
  mutation RemoveFavoriteSticker($userId: uuid!, $stickerId: uuid!) {
    delete_nchat_favorite_stickers(
      where: { user_id: { _eq: $userId }, sticker_id: { _eq: $stickerId } }
    ) {
      affected_rows
      returning {
        id
        sticker_id
      }
    }
  }
`;

/**
 * Clear all recent stickers for a user
 */
export const CLEAR_RECENT_STICKERS = gql`
  mutation ClearRecentStickers($userId: uuid!) {
    delete_nchat_recent_stickers(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to user's sticker packs changes
 */
export const USER_STICKER_PACKS_SUBSCRIPTION = gql`
  subscription UserStickerPacksSubscription($userId: uuid!) {
    nchat_user_sticker_packs(
      where: { user_id: { _eq: $userId } }
      order_by: { position: asc }
    ) {
      ...UserStickerPack
    }
  }
  ${USER_STICKER_PACK_FRAGMENT}
`;

/**
 * Subscribe to new sticker packs being added (for discovery)
 */
export const NEW_STICKER_PACKS_SUBSCRIPTION = gql`
  subscription NewStickerPacksSubscription {
    nchat_sticker_packs(order_by: { created_at: desc }, limit: 10) {
      ...StickerPack
    }
  }
  ${STICKER_PACK_FRAGMENT}
`;
