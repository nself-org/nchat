/**
 * Storage Utilities
 *
 * File upload and storage management for nself-chat.
 *
 * @example
 * ```tsx
 * import {
 *   uploadFile,
 *   uploadFileWithProgress,
 *   deleteFile,
 *   formatFileSize,
 *   validateFile,
 * } from '@/lib/storage'
 *
 * // Upload a file
 * const result = await uploadFileWithProgress(file, {
 *   onProgress: (p) => // console.log(`${p.percentage}%`),
 * })
 *
 * // console.log('Uploaded to:', result.url)
 * ```
 */

export {
  // Upload functions
  uploadFile,
  uploadFileWithProgress,
  uploadFiles,
  deleteFile,

  // URL functions
  getDownloadUrl,
  getPresignedUrl,
  createPreviewUrl,
  revokePreviewUrl,

  // Validation
  validateFile,

  // Utilities
  formatFileSize,
  getFileExtension,
  getFileCategory,
  generateUniqueFileName,

  // Constants
  DEFAULT_BUCKET,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALL_ALLOWED_MIME_TYPES,
} from "./upload";

export type {
  UploadOptions,
  UploadProgress,
  UploadResult,
  UploadError,
} from "./upload";
