import { gql } from "@apollo/client";
import {
  ATTACHMENT_FRAGMENT,
  USER_BASIC_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AttachmentType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "other";

export interface GetAttachmentVariables {
  id: string;
}

export interface GetChannelFilesVariables {
  channelId: string;
  fileType?: string;
  limit?: number;
  offset?: number;
}

export interface CreateAttachmentVariables {
  messageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface DeleteAttachmentVariables {
  id: string;
}

export interface GetUploadUrlVariables {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  expiresAt: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a single attachment by ID
 */
export const GET_ATTACHMENT = gql`
  query GetAttachment($id: uuid!) {
    nchat_attachments_by_pk(id: $id) {
      ...Attachment
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
  ${ATTACHMENT_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Get all files/attachments in a channel
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
        message: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
        file_type: { _ilike: $fileType }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Attachment
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
        message: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
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
  ${ATTACHMENT_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get files by type (images, videos, documents, etc.)
 */
export const GET_CHANNEL_FILES_BY_TYPE = gql`
  query GetChannelFilesByType($channelId: uuid!, $limit: Int = 20) {
    images: nchat_attachments(
      where: {
        message: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
        file_type: { _ilike: "image/%" }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...Attachment
    }

    videos: nchat_attachments(
      where: {
        message: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
        file_type: { _ilike: "video/%" }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...Attachment
    }

    documents: nchat_attachments(
      where: {
        message: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
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
      ...Attachment
    }

    audio: nchat_attachments(
      where: {
        message: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
        file_type: { _ilike: "audio/%" }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...Attachment
    }
  }
  ${ATTACHMENT_FRAGMENT}
`;

/**
 * Get recent files shared by a user
 */
export const GET_USER_FILES = gql`
  query GetUserFiles($userId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_attachments(
      where: {
        message: { user_id: { _eq: $userId }, is_deleted: { _eq: false } }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Attachment
      message {
        id
        channel {
          ...ChannelBasic
        }
      }
    }
  }
  ${ATTACHMENT_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Get attachments for a specific message
 */
export const GET_MESSAGE_ATTACHMENTS = gql`
  query GetMessageAttachments($messageId: uuid!) {
    nchat_attachments(
      where: { message_id: { _eq: $messageId } }
      order_by: { created_at: asc }
    ) {
      ...Attachment
    }
  }
  ${ATTACHMENT_FRAGMENT}
`;

/**
 * Get file statistics for a channel
 */
export const GET_CHANNEL_FILE_STATS = gql`
  query GetChannelFileStats($channelId: uuid!) {
    total: nchat_attachments_aggregate(
      where: {
        message: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
      }
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
        message: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
        file_type: { _ilike: "image/%" }
      }
    ) {
      aggregate {
        count
      }
    }

    videos: nchat_attachments_aggregate(
      where: {
        message: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
        file_type: { _ilike: "video/%" }
      }
    ) {
      aggregate {
        count
      }
    }

    documents: nchat_attachments_aggregate(
      where: {
        message: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
        file_type: {
          _in: ["application/pdf", "application/msword", "text/plain"]
        }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get storage usage for workspace
 */
export const GET_STORAGE_USAGE = gql`
  query GetStorageUsage {
    nchat_attachments_aggregate {
      aggregate {
        count
        sum {
          file_size
        }
      }
    }
    # By type
    by_type: nchat_attachments(distinct_on: file_type) {
      file_type
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create an attachment record after file upload
 */
export const CREATE_ATTACHMENT = gql`
  mutation CreateAttachment(
    $messageId: uuid!
    $fileName: String!
    $fileType: String!
    $fileSize: Int!
    $fileUrl: String!
    $thumbnailUrl: String
    $width: Int
    $height: Int
    $duration: Int
    $metadata: jsonb
  ) {
    insert_nchat_attachments_one(
      object: {
        message_id: $messageId
        file_name: $fileName
        file_type: $fileType
        file_size: $fileSize
        file_url: $fileUrl
        thumbnail_url: $thumbnailUrl
        width: $width
        height: $height
        duration: $duration
        metadata: $metadata
      }
    ) {
      ...Attachment
    }
  }
  ${ATTACHMENT_FRAGMENT}
`;

/**
 * Create multiple attachments at once
 */
export const CREATE_ATTACHMENTS = gql`
  mutation CreateAttachments($attachments: [nchat_attachments_insert_input!]!) {
    insert_nchat_attachments(objects: $attachments) {
      affected_rows
      returning {
        ...Attachment
      }
    }
  }
  ${ATTACHMENT_FRAGMENT}
`;

/**
 * Delete an attachment
 */
export const DELETE_ATTACHMENT = gql`
  mutation DeleteAttachment($id: uuid!) {
    delete_nchat_attachments_by_pk(id: $id) {
      id
      file_url
      thumbnail_url
    }
  }
`;

/**
 * Delete all attachments for a message
 */
export const DELETE_MESSAGE_ATTACHMENTS = gql`
  mutation DeleteMessageAttachments($messageId: uuid!) {
    delete_nchat_attachments(where: { message_id: { _eq: $messageId } }) {
      affected_rows
      returning {
        id
        file_url
        thumbnail_url
      }
    }
  }
`;

/**
 * Update attachment metadata
 */
export const UPDATE_ATTACHMENT_METADATA = gql`
  mutation UpdateAttachmentMetadata($id: uuid!, $metadata: jsonb!) {
    update_nchat_attachments_by_pk(
      pk_columns: { id: $id }
      _append: { metadata: $metadata }
    ) {
      id
      metadata
    }
  }
`;

/**
 * Get a signed upload URL (via Hasura action connecting to MinIO/S3)
 */
export const GET_UPLOAD_URL = gql`
  mutation GetUploadUrl(
    $fileName: String!
    $fileType: String!
    $fileSize: Int!
  ) {
    get_upload_url(
      args: { file_name: $fileName, file_type: $fileType, file_size: $fileSize }
    ) {
      upload_url
      file_url
      expires_at
    }
  }
`;

/**
 * Alternative: Request presigned URL for direct upload
 */
export const REQUEST_UPLOAD_URL = gql`
  mutation RequestUploadUrl(
    $fileName: String!
    $contentType: String!
    $channelId: uuid!
  ) {
    request_upload_url(
      file_name: $fileName
      content_type: $contentType
      channel_id: $channelId
    ) {
      presigned_url
      file_key
      file_url
      expires_in
    }
  }
`;

/**
 * Confirm upload completion (finalize attachment)
 */
export const CONFIRM_UPLOAD = gql`
  mutation ConfirmUpload(
    $fileKey: String!
    $messageId: uuid!
    $metadata: jsonb
  ) {
    confirm_upload(
      file_key: $fileKey
      message_id: $messageId
      metadata: $metadata
    ) {
      attachment {
        ...Attachment
      }
    }
  }
  ${ATTACHMENT_FRAGMENT}
`;

/**
 * Generate thumbnail for image/video
 */
export const GENERATE_THUMBNAIL = gql`
  mutation GenerateThumbnail($attachmentId: uuid!) {
    generate_thumbnail(attachment_id: $attachmentId) {
      thumbnail_url
    }
  }
`;

/**
 * Bulk delete attachments (admin cleanup)
 */
export const BULK_DELETE_ATTACHMENTS = gql`
  mutation BulkDeleteAttachments($ids: [uuid!]!) {
    delete_nchat_attachments(where: { id: { _in: $ids } }) {
      affected_rows
      returning {
        id
        file_url
        thumbnail_url
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new attachments in a channel
 */
export const CHANNEL_ATTACHMENTS_SUBSCRIPTION = gql`
  subscription ChannelAttachmentsSubscription($channelId: uuid!) {
    nchat_attachments(
      where: { message: { channel_id: { _eq: $channelId } } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...Attachment
      message {
        id
        user {
          ...UserBasic
        }
      }
    }
  }
  ${ATTACHMENT_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to attachment stream
 */
export const ATTACHMENTS_STREAM_SUBSCRIPTION = gql`
  subscription AttachmentsStreamSubscription($channelId: uuid!) {
    nchat_attachments_stream(
      cursor: { initial_value: { created_at: "now()" } }
      batch_size: 10
      where: { message: { channel_id: { _eq: $channelId } } }
    ) {
      ...Attachment
      message {
        id
        channel_id
        user {
          ...UserBasic
        }
      }
    }
  }
  ${ATTACHMENT_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;
