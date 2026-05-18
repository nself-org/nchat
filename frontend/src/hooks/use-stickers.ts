/**
 * Hook for fetching and managing stickers
 */

import { useQuery, useMutation, useApolloClient } from "@apollo/client";
import { gql } from "@apollo/client";

// GraphQL queries
const GET_STICKER_PACKS = gql`
  query GetStickerPacks {
    nchat_sticker_packs(
      where: { is_enabled: { _eq: true } }
      order_by: { sort_order: asc, created_at: asc }
    ) {
      id
      name
      slug
      description
      icon_url
      is_default
      sort_order
      stickers(order_by: { sort_order: asc }) {
        id
        name
        slug
        file_url
        thumbnail_url
        keywords
        sort_order
      }
    }
  }
`;

const GET_STICKER_BY_ID = gql`
  query GetStickerById($id: uuid!) {
    nchat_stickers_by_pk(id: $id) {
      id
      name
      slug
      file_url
      thumbnail_url
      keywords
      pack {
        id
        name
        slug
      }
    }
  }
`;

// TypeScript interfaces
export interface Sticker {
  id: string;
  name: string;
  slug: string;
  file_url: string;
  thumbnail_url?: string;
  keywords: string[];
  sort_order: number;
}

export interface StickerPack {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
  is_default: boolean;
  sort_order: number;
  stickers: Sticker[];
}

export interface UseStickerPacksResult {
  packs: StickerPack[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseStickerResult {
  sticker: Sticker | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch all enabled sticker packs
 */
export function useStickerPacks(): UseStickerPacksResult {
  const { data, loading, error, refetch } = useQuery(GET_STICKER_PACKS, {
    fetchPolicy: "cache-first",
  });

  return {
    packs: data?.nchat_sticker_packs || [],
    isLoading: loading,
    error: error || null,
    refetch,
  };
}

/**
 * Hook to fetch a single sticker by ID
 */
export function useSticker(stickerId: string): UseStickerResult {
  const { data, loading, error } = useQuery(GET_STICKER_BY_ID, {
    variables: { id: stickerId },
    skip: !stickerId,
  });

  return {
    sticker: data?.nchat_stickers_by_pk || null,
    isLoading: loading,
    error: error || null,
  };
}

/**
 * Hook to search stickers by keyword
 */
export function useSearchStickers(query: string) {
  const { packs, isLoading, error } = useStickerPacks();

  // Client-side filtering by keywords
  const filteredStickers = query
    ? packs.flatMap((pack) =>
        pack.stickers
          .filter((sticker) =>
            sticker.keywords.some((keyword) =>
              keyword.toLowerCase().includes(query.toLowerCase()),
            ),
          )
          .map((sticker) => ({ ...sticker, pack })),
      )
    : [];

  return {
    stickers: filteredStickers,
    isLoading,
    error,
  };
}
