/**
 * GIF Types for nself-chat
 *
 * Type definitions for GIF picker integration with Giphy and Tenor APIs.
 * Supports both providers with a unified interface.
 */

// ============================================================================
// Provider Types
// ============================================================================

export type GifProvider = "giphy" | "tenor";

// ============================================================================
// GIF Object Types
// ============================================================================

/**
 * Unified GIF object representing a single GIF from any provider
 */
export interface Gif {
  /** Unique identifier from the provider */
  id: string;
  /** Title or alt text for the GIF */
  title: string;
  /** Source provider */
  provider: GifProvider;
  /** URL to the full-size GIF */
  url: string;
  /** URL to a preview/thumbnail (static image) */
  previewUrl: string;
  /** URL to a smaller preview GIF */
  previewGifUrl: string;
  /** URL to the original high-quality GIF */
  originalUrl: string;
  /** Width of the original GIF in pixels */
  width: number;
  /** Height of the original GIF in pixels */
  height: number;
  /** File size in bytes (if available) */
  size?: number;
  /** Aspect ratio (width / height) */
  aspectRatio: number;
  /** Background color hint (hex) */
  backgroundColor?: string;
  /** Content rating (g, pg, pg-13, r) */
  rating?: string;
  /** Tags/keywords associated with the GIF */
  tags?: string[];
  /** Source URL (attribution) */
  sourceUrl?: string;
  /** Import datetime from provider */
  importDatetime?: string;
}

/**
 * GIF variant sizes for different use cases
 */
export interface GifVariants {
  /** Thumbnail for grid display (static) */
  thumbnail: GifImage;
  /** Small preview (animated) */
  preview: GifImage;
  /** Fixed height version */
  fixedHeight: GifImage;
  /** Fixed width version */
  fixedWidth: GifImage;
  /** Original full-size version */
  original: GifImage;
  /** Downsampled for lower bandwidth */
  downsized: GifImage;
}

export interface GifImage {
  url: string;
  width: number;
  height: number;
  size?: number;
  mp4Url?: string;
  webpUrl?: string;
}

// ============================================================================
// Search Types
// ============================================================================

export interface GifSearchParams {
  /** Search query string */
  query: string;
  /** Number of results to return (default: 25) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Content rating filter (default: 'pg-13') */
  rating?: "g" | "pg" | "pg-13" | "r";
  /** Language code (default: 'en') */
  lang?: string;
  /** Random ID for analytics (optional) */
  randomId?: string;
}

export interface GifSearchResponse {
  /** Array of GIF results */
  gifs: Gif[];
  /** Pagination info */
  pagination: GifPagination;
  /** Provider that served the request */
  provider: GifProvider;
}

export interface GifPagination {
  /** Total number of results available */
  totalCount: number;
  /** Number of results returned */
  count: number;
  /** Current offset */
  offset: number;
  /** Whether there are more results */
  hasMore: boolean;
}

// ============================================================================
// Trending Types
// ============================================================================

export interface GifTrendingParams {
  /** Number of results to return (default: 25) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Content rating filter */
  rating?: "g" | "pg" | "pg-13" | "r";
}

export interface GifTrendingResponse {
  /** Array of trending GIFs */
  gifs: Gif[];
  /** Pagination info */
  pagination: GifPagination;
  /** Provider that served the request */
  provider: GifProvider;
}

// ============================================================================
// Category Types
// ============================================================================

export interface GifCategory {
  /** Category identifier */
  id: string;
  /** Display name */
  name: string;
  /** Category slug for API calls */
  slug: string;
  /** Preview GIF for the category */
  previewGif?: Gif;
  /** Subcategories (if any) */
  subcategories?: GifCategory[];
}

export interface GifCategoriesResponse {
  /** Array of categories */
  categories: GifCategory[];
  /** Provider that served the request */
  provider: GifProvider;
}

// ============================================================================
// Giphy-Specific Types (for API transformation)
// ============================================================================

export interface GiphyGif {
  id: string;
  title: string;
  url: string;
  slug: string;
  rating: string;
  source: string;
  source_post_url: string;
  import_datetime: string;
  images: {
    original: {
      url: string;
      width: string;
      height: string;
      size: string;
      mp4?: string;
      webp?: string;
    };
    fixed_height: {
      url: string;
      width: string;
      height: string;
      size: string;
    };
    fixed_width: {
      url: string;
      width: string;
      height: string;
      size: string;
    };
    fixed_height_still: {
      url: string;
      width: string;
      height: string;
    };
    preview_gif: {
      url: string;
      width: string;
      height: string;
    };
    downsized: {
      url: string;
      width: string;
      height: string;
      size: string;
    };
  };
}

export interface GiphySearchResponse {
  data: GiphyGif[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
  meta: {
    status: number;
    msg: string;
    response_id: string;
  };
}

export interface GiphyCategory {
  name: string;
  name_encoded: string;
  subcategories?: {
    name: string;
    name_encoded: string;
  }[];
  gif?: GiphyGif;
}

export interface GiphyCategoriesResponse {
  data: GiphyCategory[];
  meta: {
    status: number;
    msg: string;
  };
}

// ============================================================================
// Tenor-Specific Types (for API transformation)
// ============================================================================

export interface TenorGif {
  id: string;
  title: string;
  content_description: string;
  tags: string[];
  url: string;
  media_formats: {
    gif: {
      url: string;
      dims: [number, number];
      size: number;
    };
    tinygif: {
      url: string;
      dims: [number, number];
      size: number;
    };
    nanogif: {
      url: string;
      dims: [number, number];
      size: number;
    };
    mediumgif?: {
      url: string;
      dims: [number, number];
      size: number;
    };
    gifpreview?: {
      url: string;
      dims: [number, number];
    };
    mp4?: {
      url: string;
      dims: [number, number];
      size: number;
    };
    tinymp4?: {
      url: string;
      dims: [number, number];
      size: number;
    };
    webp?: {
      url: string;
      dims: [number, number];
      size: number;
    };
  };
  created: number;
  content_rating: string;
  itemurl: string;
  bg_color?: string;
}

export interface TenorSearchResponse {
  results: TenorGif[];
  next: string;
}

export interface TenorCategory {
  searchterm: string;
  path: string;
  image: string;
  name: string;
}

export interface TenorCategoriesResponse {
  tags: TenorCategory[];
}

// ============================================================================
// API Route Types
// ============================================================================

export interface GifApiRequest {
  action: "search" | "trending" | "categories" | "random";
  query?: string;
  limit?: number;
  offset?: number;
  rating?: string;
  lang?: string;
}

export interface GifApiResponse {
  success: boolean;
  data?: GifSearchResponse | GifTrendingResponse | GifCategoriesResponse | Gif;
  error?: string;
  provider?: GifProvider;
}

// ============================================================================
// Store Types
// ============================================================================

export interface GifHistoryItem {
  gif: Gif;
  usedAt: number;
}

export interface GifSearchHistoryItem {
  query: string;
  searchedAt: number;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface GifPickerProps {
  /** Callback when a GIF is selected */
  onSelect: (gif: Gif) => void;
  /** Callback when picker is closed */
  onClose?: () => void;
  /** Whether the picker is open */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Custom class name */
  className?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Default tab to show */
  defaultTab?: "trending" | "search" | "categories" | "recent";
  /** Content rating filter */
  rating?: "g" | "pg" | "pg-13" | "r";
}

export interface GifGridProps {
  /** Array of GIFs to display */
  gifs: Gif[];
  /** Callback when a GIF is selected */
  onSelect: (gif: Gif) => void;
  /** Whether the grid is loading */
  loading?: boolean;
  /** Callback for infinite scroll */
  onLoadMore?: () => void;
  /** Whether there are more results to load */
  hasMore?: boolean;
  /** Number of columns */
  columns?: number;
  /** Custom class name */
  className?: string;
}

export interface GifPreviewProps {
  /** The GIF to preview */
  gif: Gif;
  /** Callback when clicked */
  onClick?: (gif: Gif) => void;
  /** Custom class name */
  className?: string;
  /** Whether to show title tooltip */
  showTitle?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

export interface GifSearchProps {
  /** Search query value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Callback when search is submitted */
  onSearch?: (query: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether search is loading */
  loading?: boolean;
  /** Custom class name */
  className?: string;
}

export interface GifCategoriesProps {
  /** Array of categories to display */
  categories: GifCategory[];
  /** Callback when a category is selected */
  onSelect: (category: GifCategory) => void;
  /** Whether categories are loading */
  loading?: boolean;
  /** Custom class name */
  className?: string;
}

export interface GifPickerTriggerProps {
  /** Whether the picker is open */
  open?: boolean;
  /** Callback to toggle picker */
  onToggle?: () => void;
  /** Whether the trigger is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Children to render as trigger */
  children?: React.ReactNode;
}
