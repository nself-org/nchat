/**
 * GIF Library - Export barrel
 *
 * All GIF-related services, hooks, and stores for the nself-chat application.
 *
 * @example
 * ```tsx
 * import { useGif, gifClientService, useGifStore } from '@/lib/gif'
 *
 * function MyComponent() {
 *   const { search, trending, recentGifs } = useGif()
 *
 *   // Or use the store directly
 *   const { addRecentGif } = useGifStore()
 * }
 * ```
 */

// Service
export {
  gifService,
  gifClientService,
  getGifProvider,
  isGifServiceAvailable,
  proxyGifSearch,
  proxyGifTrending,
  proxyGifCategories,
  proxyGifRandom,
  DEFAULT_GIF_CATEGORIES,
} from "./gif-service";
export type { GifService } from "./gif-service";

// Hooks
export {
  useGif,
  useGifSearch,
  useGifTrending,
  useGifCategories,
} from "./use-gif";
export type {
  UseGifResult,
  UseGifSearchResult,
  UseGifSearchOptions,
  UseGifTrendingResult,
  UseGifTrendingOptions,
  UseGifCategoriesResult,
} from "./use-gif";

// Store
export {
  useGifStore,
  selectRecentGifs,
  selectFavoriteGifs,
  selectSearchHistory,
  selectPickerState,
  selectIsPickerOpen,
  selectActiveTab,
  selectSearchQuery,
  selectSelectedCategory,
  getFormattedSearchHistory,
  isRecentGif,
  getMostUsedGifs,
} from "./gif-store";
export type {
  GifState,
  GifActions,
  GifStore,
  GifPickerState,
} from "./gif-store";

// Re-export types for convenience
export type {
  Gif,
  GifProvider,
  GifCategory,
  GifSearchParams,
  GifSearchResponse,
  GifTrendingParams,
  GifTrendingResponse,
  GifCategoriesResponse,
  GifHistoryItem,
  GifSearchHistoryItem,
} from "@/types/gif";
