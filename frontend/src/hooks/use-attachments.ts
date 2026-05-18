/**
 * Attachments Hook
 *
 * React hook for managing message attachments including
 * file selection, upload, preview, and removal.
 */

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useFileUpload, type QueuedFile } from "./use-file-upload";
import {
  getDownloadService,
  formatFileSize,
  getFileIcon,
} from "@/services/files";
import type {
  FileRecord,
  ThumbnailSet,
  ProcessingStatus,
  FileTypeConfig,
} from "@/services/files/types";

import type { Attachment, AttachmentType } from "@/types/attachment";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface AttachmentItem {
  /** Unique ID */
  id: string;
  /** Type of attachment */
  type: AttachmentType;
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Preview URL (local blob or remote) */
  previewUrl?: string;
  /** Thumbnail URL (single, for compatibility) */
  thumbnailUrl?: string;
  /** Thumbnail URLs */
  thumbnails?: ThumbnailSet;
  /** Full URL (after upload) */
  url?: string;
  /** Upload status */
  status: "pending" | "uploading" | "processing" | "ready" | "failed";
  /** Upload progress (0-100) */
  progress: number;
  /** Error message */
  error?: string;
  /** Original file (before upload) */
  file?: File;
  /** File record (after upload) */
  fileRecord?: FileRecord;
  /** Width (for images/videos) */
  width?: number;
  /** Height (for images/videos) */
  height?: number;
  /** Duration (for audio/video) */
  duration?: number;
}

export interface UseAttachmentsOptions {
  /** Channel ID */
  channelId?: string;
  /** Message ID (for editing) */
  messageId?: string;
  /** Maximum number of attachments */
  maxAttachments?: number;
  /** Maximum total size in bytes */
  maxTotalSize?: number;
  /** Custom file config */
  fileConfig?: FileTypeConfig;
  /** Auto-upload when files are added */
  autoUpload?: boolean;
  /** Callback when attachments change */
  onChange?: (attachments: AttachmentItem[]) => void;
  /** Callback when all uploads complete */
  onAllComplete?: (attachments: AttachmentItem[]) => void;
}

export interface UseAttachmentsReturn {
  /** Current attachments */
  attachments: AttachmentItem[];
  /** Whether any upload is in progress */
  isUploading: boolean;
  /** Total size of all attachments */
  totalSize: number;
  /** Remaining size capacity */
  remainingSize: number;
  /** Add files as attachments */
  addFiles: (files: File[]) => void;
  /** Add an existing file record as attachment */
  addFileRecord: (record: FileRecord) => void;
  /** Remove an attachment */
  removeAttachment: (id: string) => void;
  /** Clear all attachments */
  clearAttachments: () => void;
  /** Retry a failed upload */
  retryUpload: (id: string) => void;
  /** Start uploading all pending attachments */
  startUploads: () => Promise<void>;
  /** Get ready attachments as message attachments */
  getMessageAttachments: () => Attachment[];
  /** Validate if a file can be added */
  canAddFile: (file: File) => { allowed: boolean; reason?: string };
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_ATTACHMENTS = 10;
const DEFAULT_MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAttachments(
  options: UseAttachmentsOptions = {},
): UseAttachmentsReturn {
  const {
    channelId,
    messageId,
    maxAttachments = DEFAULT_MAX_ATTACHMENTS,
    maxTotalSize = DEFAULT_MAX_TOTAL_SIZE,
    fileConfig,
    autoUpload = false,
    onChange,
    onAllComplete,
  } = options;

  // State
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  // File upload hook
  const {
    files: uploadFiles,
    isUploading,
    addFiles: addUploadFiles,
    removeFile: removeUploadFile,
    clearFiles: clearUploadFiles,
    startUpload,
    retryUpload: retryFileUpload,
    validateFile,
  } = useFileUpload({
    channelId,
    messageId,
    fileConfig,
    autoUpload,
    onComplete: handleUploadComplete,
    onError: handleUploadError,
    onAllComplete: handleAllUploadsComplete,
  });

  // Download service for thumbnails
  const downloadService = useMemo(() => getDownloadService(), []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const totalSize = useMemo(
    () => attachments.reduce((sum, a) => sum + a.size, 0),
    [attachments],
  );

  const remainingSize = maxTotalSize - totalSize;

  // ============================================================================
  // File Validation
  // ============================================================================

  const canAddFile = useCallback(
    (file: File): { allowed: boolean; reason?: string } => {
      // Check attachment count
      if (attachments.length >= maxAttachments) {
        return {
          allowed: false,
          reason: `Maximum ${maxAttachments} attachments allowed`,
        };
      }

      // Check total size
      if (totalSize + file.size > maxTotalSize) {
        return {
          allowed: false,
          reason: `Would exceed maximum total size of ${formatFileSize(maxTotalSize)}`,
        };
      }

      // Validate file type and size - convert to expected return type
      const validation = validateFile(file);
      return {
        allowed: validation.valid,
        reason: validation.error,
      };
    },
    [attachments.length, maxAttachments, totalSize, maxTotalSize, validateFile],
  );

  // ============================================================================
  // Add Files
  // ============================================================================

  const addFiles = useCallback(
    (files: File[]) => {
      const validFiles: File[] = [];
      const newAttachments: AttachmentItem[] = [];

      for (const file of files) {
        const validation = canAddFile(file);
        if (!validation.allowed) {
          logger.warn(`File rejected: ${file.name} - ${validation.reason}`);
          continue;
        }

        validFiles.push(file);

        // Create preview URL
        const previewUrl = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;

        // Determine attachment type
        const type = getAttachmentType(file.type);

        newAttachments.push({
          id: crypto.randomUUID(),
          type,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          previewUrl,
          status: "pending",
          progress: 0,
          file,
        });
      }

      if (validFiles.length > 0) {
        // Add to upload queue
        const uploadIds = addUploadFiles(validFiles);

        // Map upload IDs to attachments
        newAttachments.forEach((attachment, index) => {
          if (uploadIds[index]) {
            attachment.id = uploadIds[index];
          }
        });

        setAttachments((prev) => [...prev, ...newAttachments]);
      }
    },
    [canAddFile, addUploadFiles],
  );

  // ============================================================================
  // Add Existing File Record
  // ============================================================================

  const addFileRecord = useCallback(
    async (record: FileRecord) => {
      const type = getAttachmentType(record.mimeType);

      // Fetch thumbnails if available
      let thumbnails: ThumbnailSet | undefined;
      if (type === "image" || type === "video") {
        try {
          thumbnails = await downloadService.getThumbnails(record.id);
        } catch {
          // Thumbnails not available
        }
      }

      const attachment: AttachmentItem = {
        id: record.id,
        type,
        name: record.name,
        size: record.size,
        mimeType: record.mimeType,
        url: record.url,
        thumbnails,
        status: "ready",
        progress: 100,
        fileRecord: record,
      };

      setAttachments((prev) => [...prev, attachment]);
    },
    [downloadService],
  );

  // ============================================================================
  // Remove Attachment
  // ============================================================================

  const removeAttachment = useCallback(
    (id: string) => {
      setAttachments((prev) => {
        const attachment = prev.find((a) => a.id === id);

        // Revoke preview URL if exists
        if (attachment?.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(attachment.previewUrl);
        }

        return prev.filter((a) => a.id !== id);
      });

      // Also remove from upload queue
      removeUploadFile(id);
    },
    [removeUploadFile],
  );

  // ============================================================================
  // Clear Attachments
  // ============================================================================

  const clearAttachments = useCallback(() => {
    // Revoke all preview URLs
    attachments.forEach((a) => {
      if (a.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(a.previewUrl);
      }
    });

    setAttachments([]);
    clearUploadFiles();
  }, [attachments, clearUploadFiles]);

  // ============================================================================
  // Retry Upload
  // ============================================================================

  const retryUpload = useCallback(
    (id: string) => {
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "pending", progress: 0, error: undefined }
            : a,
        ),
      );

      retryFileUpload(id);
    },
    [retryFileUpload],
  );

  // ============================================================================
  // Start Uploads
  // ============================================================================

  const startUploads = useCallback(async () => {
    await startUpload();
  }, [startUpload]);

  // ============================================================================
  // Upload Handlers
  // ============================================================================

  function handleUploadComplete(fileRecord: FileRecord) {
    setAttachments((prev) =>
      prev.map((a) => {
        if (a.id === fileRecord.id || a.file?.name === fileRecord.name) {
          return {
            ...a,
            id: fileRecord.id,
            url: fileRecord.url,
            status: "ready" as const,
            progress: 100,
            fileRecord,
          };
        }
        return a;
      }),
    );
  }

  function handleUploadError(fileId: string, error: Error) {
    setAttachments((prev) =>
      prev.map((a) =>
        a.id === fileId
          ? { ...a, status: "failed" as const, error: error.message }
          : a,
      ),
    );
  }

  function handleAllUploadsComplete(fileRecords: FileRecord[]) {
    const updatedAttachments = attachments.map((a) => {
      if (a.status === "ready") return a;

      const record = fileRecords.find(
        (r) => r.id === a.id || r.name === a.name,
      );
      if (record) {
        return {
          ...a,
          id: record.id,
          url: record.url,
          status: "ready" as const,
          progress: 100,
          fileRecord: record,
        };
      }
      return a;
    });

    setAttachments(updatedAttachments);
    onAllComplete?.(updatedAttachments);
  }

  // ============================================================================
  // Sync with Upload Files
  // ============================================================================

  useEffect(() => {
    // Update attachment progress from upload files
    setAttachments((prev) =>
      prev.map((attachment) => {
        const uploadFile = uploadFiles.find((f) => f.id === attachment.id);
        if (!uploadFile) return attachment;

        const status = mapUploadStatus(uploadFile.progress.status);

        return {
          ...attachment,
          status,
          progress: uploadFile.progress.progress,
          error: uploadFile.error,
        };
      }),
    );
  }, [uploadFiles]);

  // ============================================================================
  // Change Callback
  // ============================================================================

  useEffect(() => {
    onChange?.(attachments);
  }, [attachments, onChange]);

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      attachments.forEach((a) => {
        if (a.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(a.previewUrl);
        }
      });
    };
  }, []); // Only on unmount

  // ============================================================================
  // Get Message Attachments
  // ============================================================================

  const getMessageAttachments = useCallback((): Attachment[] => {
    return attachments
      .filter((a) => a.status === "ready" && a.url)
      .map((a) => ({
        id: a.id,
        type: a.type,
        url: a.url!,
        name: a.name,
        size: a.size,
        mimeType: a.mimeType,
        width: a.width,
        height: a.height,
        duration: a.duration,
        thumbnailUrl: a.thumbnails?.medium?.url || a.thumbnails?.small?.url,
        previewUrl: a.thumbnails?.large?.url || a.previewUrl,
        uploadedBy: a.fileRecord?.uploadedBy || "",
        uploadedAt: a.fileRecord?.uploadedAt || new Date(),
      }));
  }, [attachments]);

  return {
    attachments,
    isUploading,
    totalSize,
    remainingSize,
    addFiles,
    addFileRecord,
    removeAttachment,
    clearAttachments,
    retryUpload,
    startUploads,
    getMessageAttachments,
    canAddFile,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getAttachmentType(mimeType: string): AttachmentType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

function mapUploadStatus(
  status: ProcessingStatus,
): "pending" | "uploading" | "processing" | "ready" | "failed" {
  switch (status) {
    case "pending":
      return "pending";
    case "uploading":
      return "uploading";
    case "processing":
      return "processing";
    case "completed":
      return "ready";
    case "failed":
    case "cancelled":
      return "failed";
    default:
      return "pending";
  }
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook for displaying attachment previews
 */
export function useAttachmentPreview(attachment: AttachmentItem | null) {
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!attachment) {
      setImageSize(null);
      return;
    }

    if (attachment.type === "image" && attachment.previewUrl) {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
      };
      img.src = attachment.previewUrl;
    }
  }, [attachment]);

  return {
    previewUrl: attachment?.previewUrl || attachment?.thumbnails?.large?.url,
    thumbnailUrl:
      attachment?.thumbnails?.medium?.url || attachment?.thumbnails?.small?.url,
    isImage: attachment?.type === "image",
    isVideo: attachment?.type === "video",
    isAudio: attachment?.type === "audio",
    imageSize,
    icon: attachment ? getFileIcon(attachment.mimeType) : "file",
    sizeFormatted: attachment ? formatFileSize(attachment.size) : "",
  };
}
