/**
 * Media Viewer Components - Full-screen media viewing with gestures
 *
 * Exports all components for the enhanced media viewing experience:
 * - FullscreenMediaViewer: Complete modal viewer with gallery navigation
 * - ZoomableImage: Image with pinch-to-zoom and pan support
 * - EnhancedVideoPlayer: Full-featured video player
 * - ThumbnailStrip: Horizontal thumbnail navigation
 */

// ============================================================================
// Main Viewer
// ============================================================================

export { FullscreenMediaViewer } from "./FullscreenMediaViewer";
export type { FullscreenMediaViewerProps } from "./FullscreenMediaViewer";

// ============================================================================
// Image Components
// ============================================================================

export { ZoomableImage } from "./ZoomableImage";
export type { ZoomableImageProps } from "./ZoomableImage";

// ============================================================================
// Video Components
// ============================================================================

export { EnhancedVideoPlayer } from "./EnhancedVideoPlayer";
export type { EnhancedVideoPlayerProps } from "./EnhancedVideoPlayer";

// ============================================================================
// Navigation Components
// ============================================================================

export { ThumbnailStrip } from "./ThumbnailStrip";
export type { ThumbnailStripProps } from "./ThumbnailStrip";
