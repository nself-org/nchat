/**
 * Media Types - TypeScript definitions for the media gallery system
 *
 * Provides comprehensive type definitions for media items, filters,
 * gallery state, and viewer functionality.
 */

// ============================================================================
// Base Media Types
// ============================================================================

export type MediaType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "other";

export type MediaViewMode = "grid" | "list" | "masonry";

export type MediaSortBy =
  | "date_asc"
  | "date_desc"
  | "name_asc"
  | "name_desc"
  | "size_asc"
  | "size_desc"
  | "type";

export type MediaFilterTab =
  | "all"
  | "images"
  | "videos"
  | "audio"
  | "documents";

// ============================================================================
// Media Item
// ============================================================================

export interface MediaUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface MediaDimensions {
  width: number;
  height: number;
}

export interface MediaMetadata {
  // Common
  duration?: number; // seconds (audio/video)
  dimensions?: MediaDimensions;

  // Image specific
  exif?: {
    camera?: string;
    lens?: string;
    iso?: number;
    aperture?: string;
    shutterSpeed?: string;
    dateTaken?: string;
    location?: { lat: number; lng: number };
  };

  // Document specific
  pageCount?: number;
  wordCount?: number;

  // Audio/Video specific
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;

  // Generic metadata
  [key: string]: unknown;
}

export interface MediaItem {
  id: string;

  // File information
  fileName: string;
  fileType: MediaType;
  mimeType: string;
  fileSize: number; // bytes
  fileExtension: string;

  // URLs
  url: string;
  thumbnailUrl: string | null;
  previewUrl?: string | null; // For videos - animated preview
  downloadUrl?: string;

  // Context
  channelId: string | null;
  channelName?: string | null;
  threadId: string | null;
  messageId: string | null;

  // User who uploaded
  uploadedBy: MediaUser;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Metadata
  metadata: MediaMetadata;

  // Permissions
  canDelete: boolean;
  canShare: boolean;
  canDownload: boolean;

  // UI state
  isSelected?: boolean;
  isFavorite?: boolean;
}

// ============================================================================
// Gallery Filters
// ============================================================================

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface MediaFilters {
  // Type filter
  type: MediaFilterTab;
  types?: MediaType[]; // Multiple type selection

  // Context filters
  channelId?: string | null;
  threadId?: string | null;
  userId?: string | null;

  // Search
  searchQuery: string;

  // Date filter
  dateRange: DateRange;

  // Size filter
  minSize?: number; // bytes
  maxSize?: number; // bytes

  // MIME type filter
  mimeTypes?: string[];

  // Extension filter
  extensions?: string[];

  // Other
  favoritesOnly?: boolean;
}

export const defaultMediaFilters: MediaFilters = {
  type: "all",
  searchQuery: "",
  dateRange: {
    start: null,
    end: null,
  },
};

// ============================================================================
// Pagination & Sorting
// ============================================================================

export interface MediaPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  cursor?: string | null;
}

export interface MediaSorting {
  sortBy: MediaSortBy;
  direction: "asc" | "desc";
}

// ============================================================================
// Gallery State
// ============================================================================

export interface GalleryState {
  // Items
  items: MediaItem[];

  // Loading state
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Filters
  filters: MediaFilters;

  // Sorting
  sorting: MediaSorting;

  // Pagination
  pagination: MediaPagination;

  // View
  viewMode: MediaViewMode;

  // Selection
  selectedItems: Set<string>;
  isSelectMode: boolean;
}

export const defaultGalleryState: GalleryState = {
  items: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  filters: defaultMediaFilters,
  sorting: {
    sortBy: "date_desc",
    direction: "desc",
  },
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false,
    cursor: null,
  },
  viewMode: "grid",
  selectedItems: new Set(),
  isSelectMode: false,
};

// ============================================================================
// Viewer State
// ============================================================================

export interface ViewerState {
  isOpen: boolean;
  currentItem: MediaItem | null;
  currentIndex: number;
  items: MediaItem[];

  // Zoom/Pan for images
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;

  // Video/Audio player state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isFullscreen: boolean;

  // Carousel mode
  isCarouselMode: boolean;
  carouselAutoplay: boolean;
  carouselInterval: number; // ms

  // UI state
  showInfo: boolean;
  showControls: boolean;
}

export const defaultViewerState: ViewerState = {
  isOpen: false,
  currentItem: null,
  currentIndex: 0,
  items: [],
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  isFullscreen: false,
  isCarouselMode: false,
  carouselAutoplay: false,
  carouselInterval: 5000,
  showInfo: false,
  showControls: true,
};

// ============================================================================
// Upload Types
// ============================================================================

export interface UploadOptions {
  channelId?: string;
  threadId?: string;
  messageId?: string;
  generateThumbnail?: boolean;
  extractMetadata?: boolean;
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

export interface UploadResult {
  success: boolean;
  mediaItem?: MediaItem;
  error?: string;
}

// ============================================================================
// Share Types
// ============================================================================

export interface ShareOptions {
  channelId?: string;
  threadId?: string;
  message?: string;
  expiresIn?: number; // ms
  password?: string;
}

export interface ShareResult {
  success: boolean;
  shareUrl?: string;
  expiresAt?: string;
  error?: string;
}

// ============================================================================
// Download Types
// ============================================================================

export interface DownloadOptions {
  fileName?: string;
  quality?: "original" | "high" | "medium" | "low";
}

// ============================================================================
// Delete Types
// ============================================================================

export interface DeleteOptions {
  deleteFromStorage?: boolean;
  reason?: string;
}

export interface DeleteResult {
  success: boolean;
  deletedCount: number;
  errors?: { id: string; error: string }[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface MediaQueryResult {
  items: MediaItem[];
  pagination: MediaPagination;
}

export interface MediaMutationResult {
  success: boolean;
  item?: MediaItem;
  error?: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface MediaGalleryProps {
  channelId?: string;
  threadId?: string;
  userId?: string;
  initialFilters?: Partial<MediaFilters>;
  showHeader?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  onItemClick?: (item: MediaItem) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  className?: string;
}

export interface MediaGridProps {
  items: MediaItem[];
  viewMode: MediaViewMode;
  isLoading?: boolean;
  hasMore?: boolean;
  selectedItems?: Set<string>;
  isSelectMode?: boolean;
  onItemClick?: (item: MediaItem) => void;
  onItemSelect?: (item: MediaItem) => void;
  onLoadMore?: () => void;
  className?: string;
}

export interface MediaItemProps {
  item: MediaItem;
  viewMode?: MediaViewMode;
  isSelected?: boolean;
  isSelectMode?: boolean;
  showInfo?: boolean;
  onClick?: (item: MediaItem) => void;
  onSelect?: (item: MediaItem) => void;
  className?: string;
}

export interface MediaViewerProps {
  item: MediaItem;
  items?: MediaItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  showInfo?: boolean;
  showCarouselControls?: boolean;
}

export interface MediaFiltersProps {
  filters: MediaFilters;
  onChange: (filters: MediaFilters) => void;
  onReset?: () => void;
  className?: string;
}

export interface MediaSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

export interface MediaUploadProps {
  channelId?: string;
  threadId?: string;
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  onUploadComplete?: (items: MediaItem[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export interface MediaDownloadProps {
  item: MediaItem;
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
  onDownloadError?: (error: string) => void;
}

export interface MediaShareProps {
  item: MediaItem;
  isOpen: boolean;
  onClose: () => void;
  onShare?: (result: ShareResult) => void;
}

export interface MediaDeleteProps {
  items: MediaItem[];
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (result: DeleteResult) => void;
}

export interface MediaInfoProps {
  item: MediaItem;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const MEDIA_TYPE_ICONS: Record<MediaType, string> = {
  image: "Image",
  video: "Video",
  audio: "Music",
  document: "FileText",
  archive: "Archive",
  other: "File",
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  document: "Document",
  archive: "Archive",
  other: "Other",
};

export const MEDIA_FILTER_TAB_LABELS: Record<MediaFilterTab, string> = {
  all: "All Media",
  images: "Images",
  videos: "Videos",
  audio: "Audio",
  documents: "Documents",
};

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
];

export const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
];

export const SUPPORTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
  "audio/flac",
];

export const SUPPORTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "text/csv",
];

export const DEFAULT_THUMBNAIL_SIZE = 200;
export const DEFAULT_PREVIEW_SIZE = 800;
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const GALLERY_PAGE_SIZE = 50;
export const INFINITE_SCROLL_THRESHOLD = 0.8;
