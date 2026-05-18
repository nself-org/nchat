/**
 * File Management GraphQL Operations
 *
 * Handles file uploads, downloads, and file management.
 * Uses nchat_attachments table for file records.
 */

import { gql } from "@apollo/client";
import {
  ATTACHMENT_FRAGMENT,
  USER_BASIC_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type FileType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "code"
  | "other";

export type FileCategory =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "video/mp4"
  | "video/webm"
  | "audio/mpeg"
  | "audio/wav"
  | "application/pdf"
  | "application/msword"
  | "application/zip"
  | "text/plain"
  | "text/csv";

export interface UploadFileVariables {
  fileName: string;
  fileType: string;
  fileSize: number;
  channelId?: string;
  messageId?: string;
}

export interface CreateFileRecordVariables {
  id?: string;
  messageId: string;
  userId: string;
  channelId?: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  fileUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface DeleteFileVariables {
  id: string;
}

export interface GetFilesVariables {
  channelId?: string;
  userId?: string;
  fileType?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateFileMetadataVariables {
  id: string;
  metadata: Record<string, unknown>;
}

export interface GenerateThumbnailVariables {
  fileId: string;
}

export interface UploadUrlResponse {
  presignedUrl: string;
  fileKey: string;
  fileUrl: string;
  expiresIn: number;
}

export interface FileUploadProgress {
  fileKey: string;
  progress: number;
  status: "uploading" | "processing" | "complete" | "failed";
  error?: string;
}

// ============================================================================
// EXTENDED ATTACHMENT FRAGMENT
// ============================================================================

export const ATTACHMENT_FULL_FRAGMENT = gql`
  fragment AttachmentFull on nchat_attachments {
    id
    message_id
    user_id
    channel_id
    file_name
    original_name
    file_type
    file_size
    storage_path
    file_url
    thumbnail_url
    width
    height
    duration
    metadata
    processing_status
    processing_job_id
    content_hash
    is_deleted
    deleted_at
    created_at
    updated_at
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a single file by ID
 */
export const GET_FILE_BY_ID = gql`
  query GetFileById($id: uuid!) {
    nchat_attachments_by_pk(id: $id) {
      ...AttachmentFull
      message {
        id
        content
        created_at
        user {
          ...UserBasic
        }
        channel {
          ...ChannelBasic
        }
      }
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Get file by storage path
 */
export const GET_FILE_BY_STORAGE_PATH = gql`
  query GetFileByStoragePath($storagePath: String!) {
    nchat_attachments(
      where: { storage_path: { _eq: $storagePath } }
      limit: 1
    ) {
      ...AttachmentFull
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
`;

/**
 * Get all files in a channel
 */
export const GET_CHANNEL_FILES = gql`
  query GetChannelFiles(
    $channelId: uuid!
    $fileType: String
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_attachments(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: { _ilike: $fileType }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AttachmentFull
      message {
        id
        created_at
        user {
          ...UserBasic
        }
      }
    }
    nchat_attachments_aggregate(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: { _ilike: $fileType }
      }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get files by type (images, videos, documents, etc.)
 */
export const GET_FILES_BY_TYPE = gql`
  query GetFilesByType($channelId: uuid!, $limit: Int = 20) {
    images: nchat_attachments(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: { _ilike: "image/%" }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...AttachmentFull
    }

    videos: nchat_attachments(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: { _ilike: "video/%" }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...AttachmentFull
    }

    documents: nchat_attachments(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: {
          _in: [
            "application/pdf"
            "application/msword"
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            "text/plain"
          ]
        }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...AttachmentFull
    }

    audio: nchat_attachments(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: { _ilike: "audio/%" }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...AttachmentFull
    }

    archives: nchat_attachments(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: {
          _in: [
            "application/zip"
            "application/x-rar-compressed"
            "application/x-7z-compressed"
            "application/x-tar"
          ]
        }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...AttachmentFull
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
`;

/**
 * Get recent files shared by a user
 */
export const GET_USER_FILES = gql`
  query GetUserFiles($userId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_attachments(
      where: { user_id: { _eq: $userId }, is_deleted: { _eq: false } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AttachmentFull
      message {
        id
        channel {
          ...ChannelBasic
        }
      }
    }
    nchat_attachments_aggregate(
      where: { user_id: { _eq: $userId }, is_deleted: { _eq: false } }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Get attachments for a specific message
 */
export const GET_MESSAGE_FILES = gql`
  query GetMessageFiles($messageId: uuid!) {
    nchat_attachments(
      where: { message_id: { _eq: $messageId }, is_deleted: { _eq: false } }
      order_by: { created_at: asc }
    ) {
      ...AttachmentFull
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
`;

/**
 * Get file statistics for a channel
 */
export const GET_CHANNEL_FILE_STATS = gql`
  query GetChannelFileStats($channelId: uuid!) {
    total: nchat_attachments_aggregate(
      where: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }

    images: nchat_attachments_aggregate(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: { _ilike: "image/%" }
      }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }

    videos: nchat_attachments_aggregate(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: { _ilike: "video/%" }
      }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }

    documents: nchat_attachments_aggregate(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: {
          _in: ["application/pdf", "application/msword", "text/plain"]
        }
      }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }

    audio: nchat_attachments_aggregate(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        file_type: { _ilike: "audio/%" }
      }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }
  }
`;

/**
 * Get storage usage for user
 */
export const GET_USER_STORAGE_USAGE = gql`
  query GetUserStorageUsage($userId: uuid!) {
    nchat_attachments_aggregate(
      where: { user_id: { _eq: $userId }, is_deleted: { _eq: false } }
    ) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }
  }
`;

/**
 * Get storage usage for workspace
 */
export const GET_STORAGE_USAGE = gql`
  query GetStorageUsage {
    total: nchat_attachments_aggregate(where: { is_deleted: { _eq: false } }) {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }
  }
`;

/**
 * Search files by name or type
 */
export const SEARCH_FILES = gql`
  query SearchFiles(
    $query: String!
    $channelId: uuid
    $fileType: String
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_attachments(
      where: {
        _and: [
          {
            _or: [
              { file_name: { _ilike: $query } }
              { original_name: { _ilike: $query } }
            ]
          }
          { file_type: { _ilike: $fileType } }
          { channel_id: { _eq: $channelId } }
          { is_deleted: { _eq: false } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AttachmentFull
      message {
        id
        created_at
        user {
          ...UserBasic
        }
        channel {
          ...ChannelBasic
        }
      }
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Get recent files (workspace-wide)
 */
export const GET_RECENT_FILES = gql`
  query GetRecentFiles($limit: Int = 20) {
    nchat_attachments(
      where: { is_deleted: { _eq: false } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...AttachmentFull
      message {
        id
        created_at
        user {
          ...UserBasic
        }
        channel {
          ...ChannelBasic
        }
      }
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Check if file exists by content hash (for deduplication)
 */
export const GET_FILE_BY_HASH = gql`
  query GetFileByHash($contentHash: String!, $userId: uuid!) {
    nchat_attachments(
      where: {
        content_hash: { _eq: $contentHash }
        user_id: { _eq: $userId }
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
      id
      storage_path
      file_url
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Insert a new file record
 */
export const INSERT_FILE = gql`
  mutation InsertFile(
    $id: uuid
    $messageId: uuid
    $userId: uuid!
    $channelId: uuid
    $fileName: String!
    $originalName: String!
    $fileType: String!
    $fileSize: Int!
    $storagePath: String!
    $fileUrl: String!
    $thumbnailUrl: String
    $width: Int
    $height: Int
    $duration: Int
    $metadata: jsonb
    $processingStatus: String
    $processingJobId: String
    $contentHash: String
  ) {
    insert_nchat_attachments_one(
      object: {
        id: $id
        message_id: $messageId
        user_id: $userId
        channel_id: $channelId
        file_name: $fileName
        original_name: $originalName
        file_type: $fileType
        file_size: $fileSize
        storage_path: $storagePath
        file_url: $fileUrl
        thumbnail_url: $thumbnailUrl
        width: $width
        height: $height
        duration: $duration
        metadata: $metadata
        processing_status: $processingStatus
        processing_job_id: $processingJobId
        content_hash: $contentHash
      }
      on_conflict: {
        constraint: nchat_attachments_pkey
        update_columns: [
          file_url
          thumbnail_url
          processing_status
          metadata
          updated_at
        ]
      }
    ) {
      ...AttachmentFull
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
`;

/**
 * Create file record after upload (alias)
 */
export const CREATE_FILE = INSERT_FILE;

/**
 * Create multiple files at once
 */
export const CREATE_FILES = gql`
  mutation CreateFiles($files: [nchat_attachments_insert_input!]!) {
    insert_nchat_attachments(objects: $files) {
      affected_rows
      returning {
        ...AttachmentFull
      }
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
`;

/**
 * Update file metadata
 */
export const UPDATE_FILE = gql`
  mutation UpdateFile(
    $id: uuid!
    $fileName: String
    $thumbnailUrl: String
    $width: Int
    $height: Int
    $duration: Int
    $metadata: jsonb
    $processingStatus: String
  ) {
    update_nchat_attachments_by_pk(
      pk_columns: { id: $id }
      _set: {
        file_name: $fileName
        thumbnail_url: $thumbnailUrl
        width: $width
        height: $height
        duration: $duration
        processing_status: $processingStatus
        updated_at: "now()"
      }
      _append: { metadata: $metadata }
    ) {
      ...AttachmentFull
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
`;

/**
 * Update file metadata only
 */
export const UPDATE_FILE_METADATA = gql`
  mutation UpdateFileMetadata($id: uuid!, $metadata: jsonb!) {
    update_nchat_attachments_by_pk(
      pk_columns: { id: $id }
      _append: { metadata: $metadata }
    ) {
      id
      metadata
      updated_at
    }
  }
`;

/**
 * Update processing status
 */
export const UPDATE_PROCESSING_STATUS = gql`
  mutation UpdateProcessingStatus(
    $id: uuid!
    $status: String!
    $thumbnailUrl: String
    $width: Int
    $height: Int
    $duration: Int
    $metadata: jsonb
  ) {
    update_nchat_attachments_by_pk(
      pk_columns: { id: $id }
      _set: {
        processing_status: $status
        thumbnail_url: $thumbnailUrl
        width: $width
        height: $height
        duration: $duration
        updated_at: "now()"
      }
      _append: { metadata: $metadata }
    ) {
      ...AttachmentFull
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
`;

/**
 * Soft delete a file
 */
export const DELETE_FILE = gql`
  mutation DeleteFile($id: uuid!) {
    update_nchat_attachments_by_pk(
      pk_columns: { id: $id }
      _set: { is_deleted: true, deleted_at: "now()" }
    ) {
      id
      is_deleted
      deleted_at
    }
  }
`;

/**
 * Hard delete a file (permanent)
 */
export const HARD_DELETE_FILE = gql`
  mutation HardDeleteFile($id: uuid!) {
    delete_nchat_attachments_by_pk(id: $id) {
      id
      storage_path
      file_url
      thumbnail_url
      file_name
    }
  }
`;

/**
 * Delete all files for a message
 */
export const DELETE_MESSAGE_FILES = gql`
  mutation DeleteMessageFiles($messageId: uuid!) {
    update_nchat_attachments(
      where: { message_id: { _eq: $messageId } }
      _set: { is_deleted: true, deleted_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        storage_path
        file_url
        thumbnail_url
      }
    }
  }
`;

/**
 * Bulk delete files
 */
export const BULK_DELETE_FILES = gql`
  mutation BulkDeleteFiles($ids: [uuid!]!) {
    update_nchat_attachments(
      where: { id: { _in: $ids } }
      _set: { is_deleted: true, deleted_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        storage_path
        file_url
        thumbnail_url
        file_name
      }
    }
  }
`;

/**
 * Restore soft-deleted file
 */
export const RESTORE_FILE = gql`
  mutation RestoreFile($id: uuid!) {
    update_nchat_attachments_by_pk(
      pk_columns: { id: $id }
      _set: { is_deleted: false, deleted_at: null }
    ) {
      id
      is_deleted
    }
  }
`;

/**
 * Update file name
 */
export const UPDATE_FILE_NAME = gql`
  mutation UpdateFileName($id: uuid!, $fileName: String!) {
    update_nchat_attachments_by_pk(
      pk_columns: { id: $id }
      _set: { file_name: $fileName, updated_at: "now()" }
    ) {
      id
      file_name
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new files in a channel
 */
export const CHANNEL_FILES_SUBSCRIPTION = gql`
  subscription ChannelFilesSubscription($channelId: uuid!) {
    nchat_attachments(
      where: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...AttachmentFull
      message {
        id
        user {
          ...UserBasic
        }
      }
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to file processing status
 */
export const FILE_PROCESSING_SUBSCRIPTION = gql`
  subscription FileProcessingSubscription($fileId: uuid!) {
    nchat_attachments_by_pk(id: $fileId) {
      id
      processing_status
      processing_job_id
      thumbnail_url
      width
      height
      duration
      metadata
      updated_at
    }
  }
`;

/**
 * Subscribe to file stream
 */
export const FILES_STREAM_SUBSCRIPTION = gql`
  subscription FilesStreamSubscription($channelId: uuid) {
    nchat_attachments_stream(
      cursor: { initial_value: { created_at: "now()" } }
      batch_size: 10
      where: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
    ) {
      ...AttachmentFull
      message {
        id
        channel_id
        user {
          ...UserBasic
        }
      }
    }
  }
  ${ATTACHMENT_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;
