/**
 * Media Components - Export all media-related components
 *
 * Central export point for all media components including viewers,
 * players, galleries, and utilities.
 */

// ============================================================================
// Main Preview System
// ============================================================================

export { FilePreview } from "./FilePreview";
export type { FilePreviewProps } from "./FilePreview";

export { PDFViewer } from "./PDFViewer";
export type { PDFViewerProps } from "./PDFViewer";

export { DocumentPreview } from "./DocumentPreview";
export type { DocumentPreviewProps } from "./DocumentPreview";

// ============================================================================
// Media Viewers (Already Existing)
// ============================================================================

export { ImageViewer } from "./ImageViewer";
export type { ImageViewerProps } from "./ImageViewer";

export { VideoPlayer } from "./VideoPlayer";
export type { VideoPlayerProps } from "./VideoPlayer";

export { AudioPlayer } from "./AudioPlayer";
export type { AudioPlayerProps } from "./AudioPlayer";

// ============================================================================
// Gallery Components (Already Existing)
// ============================================================================

export { MediaViewer } from "./MediaViewer";

export { MediaGallery } from "./media-gallery";

export { MediaGrid } from "./MediaGrid";
export type { MediaGridProps } from "./MediaGrid";

export { MediaItem } from "./MediaItem";
export type { MediaItemProps } from "./MediaItem";

export { MediaInfo } from "./MediaInfo";
export type { MediaInfoProps } from "./MediaInfo";

// ============================================================================
// Utility Components (Already Existing)
// ============================================================================

export { ImageEditor } from "./ImageEditor";
export { ImagePicker } from "./ImagePicker";
export { VideoPicker } from "./VideoPicker";
export { VoiceRecorder } from "./VoiceRecorder";

// ============================================================================
// Enhanced Media Viewer System (Pinch-to-Zoom, Full-Screen)
// ============================================================================

export {
  FullscreenMediaViewer,
  ZoomableImage,
  EnhancedVideoPlayer,
  ThumbnailStrip,
} from "./media-viewer";

export type {
  FullscreenMediaViewerProps,
  ZoomableImageProps,
  EnhancedVideoPlayerProps,
  ThumbnailStripProps,
} from "./media-viewer";

// ============================================================================
// Example Component
// ============================================================================

export { FilePreviewExample } from "./FilePreviewExample";
