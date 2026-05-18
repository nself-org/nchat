/**
 * GIF Components - Export barrel
 *
 * All GIF picker related components for the nself-chat application.
 *
 * @example
 * ```tsx
 * import { GifPicker, GifPickerTrigger, GifButton } from '@/components/gif'
 *
 * function MessageInput() {
 *   const handleGifSelect = (gif: Gif) => {
 *     sendMessage({ content: gif.url, type: 'gif' })
 *   }
 *
 *   return (
 *     <div>
 *       <GifButton onSelect={handleGifSelect} />
 *     </div>
 *   )
 * }
 * ```
 */

// Main picker
export { GifPicker, CompactGifPicker } from "./gif-picker";
export type { GifPickerProps } from "@/types/gif";

// Trigger button
export {
  GifPickerTrigger,
  GifButton,
  GifToggle,
  GifIcon,
} from "./gif-picker-trigger";
export type { GifPickerTriggerProps } from "@/types/gif";

// Search
export {
  GifSearch,
  GifSearchSuggestions,
  GifSearchHistory,
} from "./gif-search";
export type { GifSearchProps } from "@/types/gif";

// Grid
export { GifGrid, GifGridWithFavorites, GifFlatGrid } from "./gif-grid";
export type { GifGridProps } from "@/types/gif";

// Preview
export {
  GifPreview,
  GifPreviewWithActions,
  GifPreviewSkeleton,
} from "./gif-preview";
export type { GifPreviewProps } from "@/types/gif";

// Categories
export {
  GifCategories,
  GifCategoryPills,
  PopularCategories,
} from "./gif-categories";
export type { GifCategoriesProps } from "@/types/gif";

// Re-export types
export type {
  Gif,
  GifCategory,
  GifProvider,
  GifSearchResponse,
  GifTrendingResponse,
} from "@/types/gif";
