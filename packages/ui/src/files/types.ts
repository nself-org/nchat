/**
 * Files domain types.
 *
 * @module files/types
 */

// ============================================================================
// File types
// ============================================================================

export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'other'

export interface AttachedFile {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  url: string
  thumbnailUrl?: string
  category: FileCategory
  createdAt: string
  uploadedBy?: string
}

// ============================================================================
// Upload
// ============================================================================

export type UploadStatus = 'pending' | 'uploading' | 'complete' | 'error'

export interface UploadItem {
  id: string
  file: File
  name: string
  sizeBytes: number
  status: UploadStatus
  progress: number
  error?: string
  /** Resolved URL after upload completes */
  url?: string
  thumbnailUrl?: string
  previewUrl?: string
}

// ============================================================================
// Forward
// ============================================================================

export interface ForwardDestination {
  id: string
  type: 'channel' | 'dm' | 'group'
  name: string
  avatarUrl?: string
}
