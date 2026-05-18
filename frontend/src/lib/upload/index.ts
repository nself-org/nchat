/**
 * Upload Library - Barrel export file
 *
 * Exports all upload-related utilities, services, and hooks
 */

// Upload Service
export {
  UploadService,
  getUploadService,
  createUploadService,
} from "./upload-service";
export type {
  UploadConfig,
  PresignedUrlResponse,
  UploadResult,
  UploadProgressCallback,
  UploadOptions,
} from "./upload-service";

// Upload Hook
export { useUpload, useFileInput } from "./use-upload";
export type {
  UseUploadOptions,
  UploadState,
  SelectedFile,
  UseUploadReturn,
  UseFileInputOptions,
  UseFileInputReturn,
} from "./use-upload";

// File Utilities
export {
  // Constants
  FILE_ICONS,
  FILE_TYPE_LABELS,
  PREVIEWABLE_TYPES,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  SPREADSHEET_EXTENSIONS,
  PRESENTATION_EXTENSIONS,
  ARCHIVE_EXTENSIONS,

  // Type Detection
  getFileTypeFromMime,
  getFileTypeFromExtension,
  getFileType,

  // File Extension & Name Utilities
  getFileExtension,
  getFileBaseName,
  truncateFileName,
  sanitizeFileName,

  // File Size Formatting
  formatFileSize,
  parseFileSize,

  // File Icon Utilities
  getFileIcon,
  getFileTypeIcon,
  getFileTypeColor,

  // File Validation
  validateFile,
  validateFiles,

  // Media Dimensions
  getImageDimensions,
  getVideoDimensions,
  getAudioDuration,

  // Thumbnail Generation
  generateImageThumbnail,
  generateVideoThumbnail,

  // Duration Formatting
  formatDuration,

  // Preview URL Utilities
  createPreviewUrl,
  revokePreviewUrl,

  // MIME Type Utilities
  getMimeTypeFromExtension,
  isPreviewable,
  isImage,
  isVideo,
  isAudio,
  isDocument,
} from "./file-utils";

export type {
  FileValidationResult,
  FileValidationOptions,
  MediaDimensions,
  ThumbnailOptions,
} from "./file-utils";
