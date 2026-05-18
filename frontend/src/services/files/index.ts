/**
 * File Services Index
 *
 * Exports all file-related services for upload, download, processing,
 * access control, and validation.
 */

// Types
export * from "./types";

// Configuration
export * from "./config";

// Upload Service
export {
  UploadService,
  getUploadService,
  createS3Client,
  generateStoragePath,
  calculateFileHash,
  getImageDimensions,
  getVideoMetadata,
  getAudioDuration,
} from "./upload.service";

// Download Service
export {
  DownloadService,
  getDownloadService,
  isUrlExpired,
  extractFilenameFromHeaders,
  formatFileSize,
  getFileExtension,
  getFileIcon,
  canPreviewInline,
  supportsThumbnail,
} from "./download.service";

// Processing Service
export {
  ProcessingService,
  getProcessingService,
  isProcessingComplete,
  isProcessingSuccessful,
  getStatusMessage,
  estimateProcessingTime,
} from "./processing.service";

// Access Control Service
export {
  FileAccessService,
  getFileAccessService,
  canAccessFile,
  canDeleteFile,
  canUploadToChannel,
  getMaxFileSize,
  type UserRole,
  type FileAccessContext,
  type FileInfo,
  type ChannelInfo,
  type AccessCheckResult,
} from "./access.service";

// Validation Service
export {
  validateFile as validateFileWithOptions,
  validateImageFile,
  validateVideoFile,
  validateDocumentFile,
  scanFileForViruses,
  stripExifMetadata,
  getExtension,
  getMimeCategory,
  isSafeMimeType,
  formatBytes,
  sanitizeFilename,
  generateSafeFilename,
  SIZE_LIMITS,
  SAFE_MIME_TYPES,
  type ValidationResult,
  type FileValidationOptions,
} from "./validation.service";
