/**
 * Media Library - Central export for all media utilities
 */

// Types
export * from "./media-types";

// Manager (core operations)
export * from "./media-manager";

// Processor (file processing)
export * from "./media-processor";

// Thumbnails
export * from "./media-thumbnails";

// Metadata
export * from "./media-metadata";

// Gallery logic
export * from "./media-gallery";

// Search
export * from "./media-search";

// Albums
export * from "./albums";

// Document Preview
export * from "./document-preview";

// Media Browser (shared browser service)
// Note: media-browser re-exports albums and document-preview for convenience
// Import from media-browser directly for the full browser API
export {
  browseMedia,
  createBrowserConfig,
  createBrowserState,
  getPlatformBehavior,
} from "./media-browser";
export type {
  MediaBrowserConfig,
  MediaBrowserState,
  BrowseResult,
  BrowserTab,
  GroupingMode,
} from "./media-browser";
