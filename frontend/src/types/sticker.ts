/**
 * Sticker Types for nself-chat
 *
 * Type definitions for stickers, sticker packs, and sticker management.
 * Supports static and animated stickers similar to Telegram.
 */

import type { UserBasicInfo } from "./user";

// ============================================================================
// Sticker Type Definitions
// ============================================================================

/**
 * Sticker format types.
 */
export type StickerType = "static" | "animated" | "video";

/**
 * Sticker format details.
 */
export type StickerFormat = "png" | "apng" | "gif" | "webp" | "webm" | "lottie";

/**
 * Sticker visibility options.
 */
export type StickerVisibility = "public" | "private" | "unlisted";

// ============================================================================
// Main Sticker Interface
// ============================================================================

/**
 * Core Sticker interface.
 */
export interface Sticker {
  /** Unique sticker ID */
  id: string;
  /** Sticker pack ID */
  packId: string;
  /** Sticker name/identifier */
  name: string;
  /** Sticker description */
  description?: string;
  /** Sticker type */
  type: StickerType;
  /** Sticker format */
  format: StickerFormat;
  /** Sticker URL */
  url: string;
  /** Thumbnail URL (static preview) */
  thumbnailUrl: string;
  /** Sticker width in pixels */
  width: number;
  /** Sticker height in pixels */
  height: number;
  /** File size in bytes */
  size: number;
  /** Duration in seconds (for animated/video) */
  duration?: number;
  /** Related emoji */
  emoji?: string;
  /** Search keywords */
  keywords?: string[];
  /** Position in pack */
  position: number;
  /** Usage count */
  usageCount: number;
  /** When sticker was created */
  createdAt: Date;
  /** When sticker was last updated */
  updatedAt: Date;
  /** Whether sticker is available */
  isAvailable: boolean;
}

/**
 * Sticker with pack info.
 */
export interface StickerWithPack extends Sticker {
  /** Sticker pack */
  pack: StickerPackBasic;
}

// ============================================================================
// Sticker Pack Types
// ============================================================================

/**
 * Sticker pack basic info.
 */
export interface StickerPackBasic {
  /** Pack ID */
  id: string;
  /** Pack name */
  name: string;
  /** Pack thumbnail URL */
  thumbnailUrl: string;
  /** Sticker count */
  stickerCount: number;
  /** Whether pack is animated */
  isAnimated: boolean;
}

/**
 * Full sticker pack interface.
 */
export interface StickerPack {
  /** Unique pack ID */
  id: string;
  /** Pack name */
  name: string;
  /** Pack title (display name) */
  title: string;
  /** Pack description */
  description?: string;
  /** Pack thumbnail URL */
  thumbnailUrl: string;
  /** Pack banner URL */
  bannerUrl?: string;
  /** Stickers in the pack */
  stickers: Sticker[];
  /** Number of stickers */
  stickerCount: number;
  /** Sticker type (all stickers must match) */
  type: StickerType;
  /** Pack visibility */
  visibility: StickerVisibility;
  /** Who created the pack */
  createdBy: string;
  /** Creator info */
  creator?: UserBasicInfo;
  /** Whether pack is official */
  isOfficial: boolean;
  /** Whether pack is verified */
  isVerified: boolean;
  /** Whether pack is featured */
  isFeatured: boolean;
  /** Install count */
  installCount: number;
  /** Tags for discovery */
  tags?: string[];
  /** Website/artist URL */
  websiteUrl?: string;
  /** When pack was created */
  createdAt: Date;
  /** When pack was last updated */
  updatedAt: Date;
  /** Whether pack is installed by current user */
  isInstalled?: boolean;
  /** Pack order in user's collection */
  userOrder?: number;
}

/**
 * Sticker pack installation record.
 */
export interface StickerPackInstallation {
  /** Installation ID */
  id: string;
  /** User ID */
  userId: string;
  /** Pack ID */
  packId: string;
  /** Display order */
  order: number;
  /** When installed */
  installedAt: Date;
  /** Whether pack is favorited */
  isFavorite: boolean;
}

// ============================================================================
// Sticker Usage Types
// ============================================================================

/**
 * Recently used sticker record.
 */
export interface RecentSticker {
  /** Sticker */
  sticker: Sticker;
  /** Last used timestamp */
  lastUsedAt: Date;
  /** Usage count */
  usageCount: number;
}

/**
 * Frequently used sticker with statistics.
 */
export interface FrequentSticker extends RecentSticker {
  /** Frequency score */
  frequencyScore: number;
}

/**
 * Sticker suggestion for autocomplete.
 */
export interface StickerSuggestion {
  /** Sticker */
  sticker: Sticker;
  /** Match score */
  score: number;
  /** Matched term */
  matchedTerm?: string;
}

// ============================================================================
// Sticker Picker Types
// ============================================================================

/**
 * Sticker picker category.
 */
export interface StickerPickerCategory {
  /** Category ID */
  id: string;
  /** Category name */
  name: string;
  /** Category type */
  type: "recent" | "favorites" | "pack" | "trending";
  /** Stickers in category */
  stickers: Sticker[];
  /** Pack info (if pack category) */
  pack?: StickerPackBasic;
  /** Icon URL or emoji */
  icon?: string;
}

/**
 * Sticker picker state.
 */
export interface StickerPickerState {
  /** Search query */
  searchQuery: string;
  /** Selected category ID */
  selectedCategoryId: string;
  /** Available categories */
  categories: StickerPickerCategory[];
  /** Installed packs */
  installedPacks: StickerPackBasic[];
  /** Recent stickers */
  recentStickers: RecentSticker[];
  /** Favorite stickers */
  favoriteStickers: Sticker[];
  /** Is loading */
  isLoading: boolean;
}

// ============================================================================
// Sticker Search Types
// ============================================================================

/**
 * Sticker search query.
 */
export interface StickerSearchQuery {
  /** Search text */
  query: string;
  /** Filter by pack ID */
  packId?: string;
  /** Filter by type */
  type?: StickerType;
  /** Filter by format */
  format?: StickerFormat;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Sticker search response.
 */
export interface StickerSearchResponse {
  /** Search results */
  stickers: StickerWithPack[];
  /** Total count */
  totalCount: number;
  /** Has more results */
  hasMore: boolean;
}

/**
 * Trending sticker info.
 */
export interface TrendingSticker {
  /** Sticker */
  sticker: Sticker;
  /** Pack info */
  pack: StickerPackBasic;
  /** Trend score */
  trendScore: number;
  /** Usage delta (change in usage) */
  usageDelta: number;
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for creating a sticker pack.
 */
export interface CreateStickerPackInput {
  /** Pack name (unique identifier) */
  name: string;
  /** Pack title (display name) */
  title: string;
  /** Pack description */
  description?: string;
  /** Pack visibility */
  visibility?: StickerVisibility;
  /** Sticker files to upload */
  stickers: CreateStickerInput[];
  /** Tags */
  tags?: string[];
  /** Website URL */
  websiteUrl?: string;
}

/**
 * Input for creating a sticker.
 */
export interface CreateStickerInput {
  /** Sticker name */
  name: string;
  /** Sticker file */
  file: File;
  /** Related emoji */
  emoji?: string;
  /** Keywords for search */
  keywords?: string[];
}

/**
 * Input for updating a sticker pack.
 */
export interface UpdateStickerPackInput {
  /** Pack title */
  title?: string;
  /** Pack description */
  description?: string;
  /** Pack visibility */
  visibility?: StickerVisibility;
  /** Tags */
  tags?: string[];
  /** Website URL */
  websiteUrl?: string;
}

/**
 * Input for updating a sticker.
 */
export interface UpdateStickerInput {
  /** Sticker name */
  name?: string;
  /** Description */
  description?: string;
  /** Related emoji */
  emoji?: string;
  /** Keywords */
  keywords?: string[];
  /** Position in pack */
  position?: number;
  /** Is available */
  isAvailable?: boolean;
}

/**
 * Input for reordering stickers.
 */
export interface ReorderStickersInput {
  /** Pack ID */
  packId: string;
  /** Sticker ID to position mapping */
  positions: { stickerId: string; position: number }[];
}

// ============================================================================
// Sticker Upload Types
// ============================================================================

/**
 * Sticker upload validation result.
 */
export interface StickerUploadValidation {
  /** Is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Warnings */
  warnings: string[];
  /** Detected format */
  format?: StickerFormat;
  /** Detected type */
  type?: StickerType;
  /** Dimensions */
  dimensions?: { width: number; height: number };
  /** File size */
  fileSize?: number;
  /** Duration (for animated) */
  duration?: number;
}

/**
 * Sticker upload constraints.
 */
export interface StickerUploadConstraints {
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Maximum dimensions (pixels) */
  maxDimensions: number;
  /** Minimum dimensions (pixels) */
  minDimensions: number;
  /** Allowed formats */
  allowedFormats: StickerFormat[];
  /** Maximum duration for animated (seconds) */
  maxDuration: number;
  /** Maximum stickers per pack */
  maxStickersPerPack: number;
  /** Maximum packs per user */
  maxPacksPerUser: number;
}

/**
 * Default sticker upload constraints.
 */
export const DefaultStickerUploadConstraints: StickerUploadConstraints = {
  maxFileSize: 512 * 1024, // 512KB
  maxDimensions: 512,
  minDimensions: 64,
  allowedFormats: ["png", "webp", "gif", "lottie"],
  maxDuration: 3,
  maxStickersPerPack: 120,
  maxPacksPerUser: 10,
};

// ============================================================================
// Sticker Events
// ============================================================================

/**
 * Sticker pack created event.
 */
export interface StickerPackCreatedEvent {
  pack: StickerPack;
  creator: UserBasicInfo;
  timestamp: Date;
}

/**
 * Sticker pack updated event.
 */
export interface StickerPackUpdatedEvent {
  packId: string;
  updates: Partial<StickerPack>;
  updatedBy: UserBasicInfo;
  timestamp: Date;
}

/**
 * Sticker pack installed event.
 */
export interface StickerPackInstalledEvent {
  packId: string;
  userId: string;
  timestamp: Date;
}

/**
 * Sticker used event (for analytics).
 */
export interface StickerUsedEvent {
  stickerId: string;
  packId: string;
  userId: string;
  channelId: string;
  timestamp: Date;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get sticker type from format.
 */
export function getStickerTypeFromFormat(format: StickerFormat): StickerType {
  switch (format) {
    case "png":
    case "webp":
      return "static";
    case "apng":
    case "gif":
    case "lottie":
      return "animated";
    case "webm":
      return "video";
    default:
      return "static";
  }
}

/**
 * Check if sticker format is animated.
 */
export function isAnimatedStickerFormat(format: StickerFormat): boolean {
  return ["apng", "gif", "lottie", "webm"].includes(format);
}

/**
 * Get sticker MIME type from format.
 */
export function getStickerMimeType(format: StickerFormat): string {
  const mimeTypes: Record<StickerFormat, string> = {
    png: "image/png",
    apng: "image/apng",
    gif: "image/gif",
    webp: "image/webp",
    webm: "video/webm",
    lottie: "application/json",
  };
  return mimeTypes[format] || "application/octet-stream";
}

/**
 * Validate sticker name.
 */
export function isValidStickerName(name: string): boolean {
  // Must be 1-64 characters, alphanumeric with underscores
  return /^[a-zA-Z0-9_]{1,64}$/.test(name);
}

/**
 * Validate pack name.
 */
export function isValidPackName(name: string): boolean {
  // Must be 3-64 characters, alphanumeric with underscores, start with letter
  return /^[a-zA-Z][a-zA-Z0-9_]{2,63}$/.test(name);
}

/**
 * Generate sticker pack URL.
 */
export function getStickerPackUrl(packName: string): string {
  return `/stickers/${encodeURIComponent(packName)}`;
}

/**
 * Format sticker file size for display.
 */
export function formatStickerSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
