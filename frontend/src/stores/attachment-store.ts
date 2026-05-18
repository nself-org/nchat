/**
 * Attachment Store - Manages file upload state for the nself-chat application
 *
 * Handles file uploads, upload progress, previews, and upload queuing
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type UploadStatus =
  | "pending"
  | "queued"
  | "uploading"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type FileType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "other";

export interface UploadProgress {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileType: FileType;
  mimeType: string;
  status: UploadStatus;
  progress: number; // 0-100
  uploadedBytes: number;
  error: string | null;
  retryCount: number;
  maxRetries: number;

  // Context
  channelId: string | null;
  threadId: string | null;
  messageId: string | null; // For message edits

  // Preview
  previewUrl: string | null; // Blob URL for local preview
  thumbnailUrl: string | null;

  // Server response
  uploadedUrl: string | null;
  uploadedId: string | null;

  // Metadata
  width?: number;
  height?: number;
  duration?: number; // For audio/video
  metadata?: Record<string, unknown>;

  // Timestamps
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface UploadQueueItem {
  id: string;
  priority: number;
  addedAt: number;
}

export interface AttachmentState {
  // All uploads by ID
  uploads: Map<string, UploadProgress>;

  // Upload queue (for managing concurrent uploads)
  queue: UploadQueueItem[];

  // Active uploads
  activeUploads: Set<string>;

  // Configuration
  maxConcurrentUploads: number;
  maxFileSize: number; // bytes
  maxFilesPerMessage: number;
  allowedFileTypes: string[]; // MIME types or extensions

  // UI state
  dragActive: boolean;
  previewModalOpen: boolean;
  previewModalFileId: string | null;

  // Statistics
  totalUploaded: number;
  totalFailed: number;
}

export interface AttachmentActions {
  // Upload management
  startUpload: (
    file: File,
    context: { channelId?: string; threadId?: string; messageId?: string },
  ) => string; // Returns upload ID
  updateProgress: (
    uploadId: string,
    progress: number,
    uploadedBytes: number,
  ) => void;
  completeUpload: (
    uploadId: string,
    result: { url: string; id: string; thumbnailUrl?: string },
  ) => void;
  failUpload: (uploadId: string, error: string) => void;
  cancelUpload: (uploadId: string) => void;
  retryUpload: (uploadId: string) => void;
  removeUpload: (uploadId: string) => void;

  // Queue management
  addToQueue: (uploadId: string, priority?: number) => void;
  removeFromQueue: (uploadId: string) => void;
  processQueue: () => void;
  clearQueue: () => void;
  reorderQueue: (uploadId: string, newPriority: number) => void;

  // Batch operations
  startUploads: (
    files: File[],
    context: { channelId?: string; threadId?: string; messageId?: string },
  ) => string[]; // Returns upload IDs
  cancelAllUploads: () => void;
  clearCompletedUploads: () => void;
  clearFailedUploads: () => void;

  // Get uploads
  getUpload: (uploadId: string) => UploadProgress | undefined;
  getUploadsByChannel: (channelId: string) => UploadProgress[];
  getUploadsByThread: (threadId: string) => UploadProgress[];
  getUploadsByStatus: (status: UploadStatus) => UploadProgress[];
  getPendingUploads: () => UploadProgress[];
  getActiveUploads: () => UploadProgress[];
  getCompletedUploads: () => UploadProgress[];
  getFailedUploads: () => UploadProgress[];

  // Validation
  validateFile: (file: File) => { valid: boolean; error?: string };
  validateFiles: (files: File[]) => {
    valid: File[];
    invalid: { file: File; error: string }[];
  };

  // Configuration
  setMaxConcurrentUploads: (max: number) => void;
  setMaxFileSize: (size: number) => void;
  setMaxFilesPerMessage: (max: number) => void;
  setAllowedFileTypes: (types: string[]) => void;

  // UI state
  setDragActive: (active: boolean) => void;
  openPreviewModal: (fileId: string) => void;
  closePreviewModal: () => void;

  // Utility
  reset: () => void;
}

export type AttachmentStore = AttachmentState & AttachmentActions;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_CONCURRENT = 3;
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_RETRIES = 3;

const DEFAULT_ALLOWED_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "text/csv",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/gzip",
];

// ============================================================================
// Helper Functions
// ============================================================================

const generateUploadId = (): string =>
  `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getFileType = (mimeType: string): FileType => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z") ||
    mimeType.includes("gzip")
  ) {
    return "archive";
  }
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("text/")
  ) {
    return "document";
  }
  return "other";
};

const createPreviewUrl = (file: File): string | null => {
  const type = getFileType(file.type);
  if (type === "image" || type === "video") {
    return URL.createObjectURL(file);
  }
  return null;
};

// ============================================================================
// Initial State
// ============================================================================

const initialState: AttachmentState = {
  uploads: new Map(),
  queue: [],
  activeUploads: new Set(),
  maxConcurrentUploads: DEFAULT_MAX_CONCURRENT,
  maxFileSize: DEFAULT_MAX_FILE_SIZE,
  maxFilesPerMessage: DEFAULT_MAX_FILES,
  allowedFileTypes: DEFAULT_ALLOWED_TYPES,
  dragActive: false,
  previewModalOpen: false,
  previewModalFileId: null,
  totalUploaded: 0,
  totalFailed: 0,
};

// ============================================================================
// Store
// ============================================================================

export const useAttachmentStore = create<AttachmentStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Upload management
        startUpload: (file, context) => {
          const id = generateUploadId();
          const previewUrl = createPreviewUrl(file);

          const upload: UploadProgress = {
            id,
            file,
            fileName: file.name,
            fileSize: file.size,
            fileType: getFileType(file.type),
            mimeType: file.type,
            status: "pending",
            progress: 0,
            uploadedBytes: 0,
            error: null,
            retryCount: 0,
            maxRetries: DEFAULT_MAX_RETRIES,
            channelId: context.channelId ?? null,
            threadId: context.threadId ?? null,
            messageId: context.messageId ?? null,
            previewUrl,
            thumbnailUrl: null,
            uploadedUrl: null,
            uploadedId: null,
            createdAt: Date.now(),
            startedAt: null,
            completedAt: null,
          };

          set(
            (state) => {
              state.uploads.set(id, upload);
            },
            false,
            "attachment/startUpload",
          );

          // Add to queue
          get().addToQueue(id);

          return id;
        },

        updateProgress: (uploadId, progress, uploadedBytes) =>
          set(
            (state) => {
              const upload = state.uploads.get(uploadId);
              if (upload) {
                upload.progress = progress;
                upload.uploadedBytes = uploadedBytes;
                upload.status = "uploading";
                if (!upload.startedAt) {
                  upload.startedAt = Date.now();
                }
              }
            },
            false,
            "attachment/updateProgress",
          ),

        completeUpload: (uploadId, result) =>
          set(
            (state) => {
              const upload = state.uploads.get(uploadId);
              if (upload) {
                upload.status = "completed";
                upload.progress = 100;
                upload.uploadedUrl = result.url;
                upload.uploadedId = result.id;
                upload.thumbnailUrl = result.thumbnailUrl ?? null;
                upload.completedAt = Date.now();
                state.activeUploads.delete(uploadId);
                state.totalUploaded++;
              }
            },
            false,
            "attachment/completeUpload",
          ),

        failUpload: (uploadId, error) =>
          set(
            (state) => {
              const upload = state.uploads.get(uploadId);
              if (upload) {
                upload.status = "failed";
                upload.error = error;
                state.activeUploads.delete(uploadId);
                state.totalFailed++;
              }
            },
            false,
            "attachment/failUpload",
          ),

        cancelUpload: (uploadId) =>
          set(
            (state) => {
              const upload = state.uploads.get(uploadId);
              if (upload) {
                upload.status = "cancelled";
                state.activeUploads.delete(uploadId);
                // Remove from queue
                state.queue = state.queue.filter((q) => q.id !== uploadId);
              }
            },
            false,
            "attachment/cancelUpload",
          ),

        retryUpload: (uploadId) =>
          set(
            (state) => {
              const upload = state.uploads.get(uploadId);
              if (upload && upload.retryCount < upload.maxRetries) {
                upload.status = "pending";
                upload.progress = 0;
                upload.uploadedBytes = 0;
                upload.error = null;
                upload.retryCount++;
                // Re-add to queue
                state.queue.push({
                  id: uploadId,
                  priority: 0,
                  addedAt: Date.now(),
                });
              }
            },
            false,
            "attachment/retryUpload",
          ),

        removeUpload: (uploadId) =>
          set(
            (state) => {
              const upload = state.uploads.get(uploadId);
              if (upload) {
                // Revoke blob URL if exists
                if (upload.previewUrl) {
                  URL.revokeObjectURL(upload.previewUrl);
                }
                state.uploads.delete(uploadId);
                state.activeUploads.delete(uploadId);
                state.queue = state.queue.filter((q) => q.id !== uploadId);
              }
            },
            false,
            "attachment/removeUpload",
          ),

        // Queue management
        addToQueue: (uploadId, priority = 0) =>
          set(
            (state) => {
              if (!state.queue.find((q) => q.id === uploadId)) {
                state.queue.push({
                  id: uploadId,
                  priority,
                  addedAt: Date.now(),
                });
                // Sort by priority (higher first) then by time (earlier first)
                state.queue.sort((a, b) => {
                  if (a.priority !== b.priority) return b.priority - a.priority;
                  return a.addedAt - b.addedAt;
                });
              }
            },
            false,
            "attachment/addToQueue",
          ),

        removeFromQueue: (uploadId) =>
          set(
            (state) => {
              state.queue = state.queue.filter((q) => q.id !== uploadId);
            },
            false,
            "attachment/removeFromQueue",
          ),

        processQueue: () =>
          set(
            (state) => {
              const availableSlots =
                state.maxConcurrentUploads - state.activeUploads.size;

              for (
                let i = 0;
                i < availableSlots && state.queue.length > 0;
                i++
              ) {
                const next = state.queue.shift();
                if (next) {
                  const upload = state.uploads.get(next.id);
                  if (upload && upload.status === "pending") {
                    upload.status = "queued";
                    state.activeUploads.add(next.id);
                  }
                }
              }
            },
            false,
            "attachment/processQueue",
          ),

        clearQueue: () =>
          set(
            (state) => {
              state.queue = [];
            },
            false,
            "attachment/clearQueue",
          ),

        reorderQueue: (uploadId, newPriority) =>
          set(
            (state) => {
              const item = state.queue.find((q) => q.id === uploadId);
              if (item) {
                item.priority = newPriority;
                state.queue.sort((a, b) => {
                  if (a.priority !== b.priority) return b.priority - a.priority;
                  return a.addedAt - b.addedAt;
                });
              }
            },
            false,
            "attachment/reorderQueue",
          ),

        // Batch operations
        startUploads: (files, context) => {
          return files.map((file) => get().startUpload(file, context));
        },

        cancelAllUploads: () =>
          set(
            (state) => {
              state.uploads.forEach((upload) => {
                if (
                  upload.status === "pending" ||
                  upload.status === "uploading" ||
                  upload.status === "queued"
                ) {
                  upload.status = "cancelled";
                  if (upload.previewUrl) {
                    URL.revokeObjectURL(upload.previewUrl);
                  }
                }
              });
              state.activeUploads.clear();
              state.queue = [];
            },
            false,
            "attachment/cancelAllUploads",
          ),

        clearCompletedUploads: () =>
          set(
            (state) => {
              const completed = Array.from(state.uploads.values()).filter(
                (u) => u.status === "completed",
              );
              completed.forEach((upload) => {
                if (upload.previewUrl) {
                  URL.revokeObjectURL(upload.previewUrl);
                }
                state.uploads.delete(upload.id);
              });
            },
            false,
            "attachment/clearCompletedUploads",
          ),

        clearFailedUploads: () =>
          set(
            (state) => {
              const failed = Array.from(state.uploads.values()).filter(
                (u) => u.status === "failed",
              );
              failed.forEach((upload) => {
                if (upload.previewUrl) {
                  URL.revokeObjectURL(upload.previewUrl);
                }
                state.uploads.delete(upload.id);
              });
            },
            false,
            "attachment/clearFailedUploads",
          ),

        // Get uploads
        getUpload: (uploadId) => get().uploads.get(uploadId),

        getUploadsByChannel: (channelId) =>
          Array.from(get().uploads.values()).filter(
            (u) => u.channelId === channelId,
          ),

        getUploadsByThread: (threadId) =>
          Array.from(get().uploads.values()).filter(
            (u) => u.threadId === threadId,
          ),

        getUploadsByStatus: (status) =>
          Array.from(get().uploads.values()).filter((u) => u.status === status),

        getPendingUploads: () =>
          Array.from(get().uploads.values()).filter(
            (u) => u.status === "pending" || u.status === "queued",
          ),

        getActiveUploads: () =>
          Array.from(get().uploads.values()).filter(
            (u) => u.status === "uploading",
          ),

        getCompletedUploads: () =>
          Array.from(get().uploads.values()).filter(
            (u) => u.status === "completed",
          ),

        getFailedUploads: () =>
          Array.from(get().uploads.values()).filter(
            (u) => u.status === "failed",
          ),

        // Validation
        validateFile: (file) => {
          const state = get();

          // Check file size
          if (file.size > state.maxFileSize) {
            return {
              valid: false,
              error: `File size exceeds maximum of ${formatFileSize(state.maxFileSize)}`,
            };
          }

          // Check file type
          if (state.allowedFileTypes.length > 0) {
            const isAllowed = state.allowedFileTypes.some((type) => {
              if (type.includes("/")) {
                return file.type === type;
              }
              return file.name.toLowerCase().endsWith(type.toLowerCase());
            });

            if (!isAllowed) {
              return {
                valid: false,
                error: "File type not allowed",
              };
            }
          }

          return { valid: true };
        },

        validateFiles: (files) => {
          const valid: File[] = [];
          const invalid: { file: File; error: string }[] = [];

          files.forEach((file) => {
            const result = get().validateFile(file);
            if (result.valid) {
              valid.push(file);
            } else {
              invalid.push({ file, error: result.error! });
            }
          });

          return { valid, invalid };
        },

        // Configuration
        setMaxConcurrentUploads: (max) =>
          set(
            (state) => {
              state.maxConcurrentUploads = max;
            },
            false,
            "attachment/setMaxConcurrentUploads",
          ),

        setMaxFileSize: (size) =>
          set(
            (state) => {
              state.maxFileSize = size;
            },
            false,
            "attachment/setMaxFileSize",
          ),

        setMaxFilesPerMessage: (max) =>
          set(
            (state) => {
              state.maxFilesPerMessage = max;
            },
            false,
            "attachment/setMaxFilesPerMessage",
          ),

        setAllowedFileTypes: (types) =>
          set(
            (state) => {
              state.allowedFileTypes = types;
            },
            false,
            "attachment/setAllowedFileTypes",
          ),

        // UI state
        setDragActive: (active) =>
          set(
            (state) => {
              state.dragActive = active;
            },
            false,
            "attachment/setDragActive",
          ),

        openPreviewModal: (fileId) =>
          set(
            (state) => {
              state.previewModalOpen = true;
              state.previewModalFileId = fileId;
            },
            false,
            "attachment/openPreviewModal",
          ),

        closePreviewModal: () =>
          set(
            (state) => {
              state.previewModalOpen = false;
              state.previewModalFileId = null;
            },
            false,
            "attachment/closePreviewModal",
          ),

        // Utility
        reset: () =>
          set(
            (state) => {
              // Cleanup blob URLs
              state.uploads.forEach((upload) => {
                if (upload.previewUrl) {
                  URL.revokeObjectURL(upload.previewUrl);
                }
              });
              return {
                ...initialState,
                uploads: new Map(),
                activeUploads: new Set(),
              };
            },
            false,
            "attachment/reset",
          ),
      })),
    ),
    { name: "attachment-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectAllUploads = (state: AttachmentStore) =>
  Array.from(state.uploads.values());

export const selectUploadsByChannel =
  (channelId: string) => (state: AttachmentStore) =>
    Array.from(state.uploads.values()).filter((u) => u.channelId === channelId);

export const selectUploadsByThread =
  (threadId: string) => (state: AttachmentStore) =>
    Array.from(state.uploads.values()).filter((u) => u.threadId === threadId);

export const selectPendingUploads = (state: AttachmentStore) =>
  Array.from(state.uploads.values()).filter(
    (u) =>
      u.status === "pending" ||
      u.status === "queued" ||
      u.status === "uploading",
  );

export const selectCompletedUploads = (state: AttachmentStore) =>
  Array.from(state.uploads.values()).filter((u) => u.status === "completed");

export const selectFailedUploads = (state: AttachmentStore) =>
  Array.from(state.uploads.values()).filter((u) => u.status === "failed");

export const selectUploadProgress =
  (uploadId: string) => (state: AttachmentStore) =>
    state.uploads.get(uploadId);

export const selectIsUploading = (state: AttachmentStore) =>
  state.activeUploads.size > 0;

export const selectQueueLength = (state: AttachmentStore) => state.queue.length;

export const selectDragActive = (state: AttachmentStore) => state.dragActive;

export const selectTotalUploadProgress = (state: AttachmentStore) => {
  const pending = selectPendingUploads(state);
  if (pending.length === 0) return 100;

  const totalBytes = pending.reduce((sum, u) => sum + u.fileSize, 0);
  const uploadedBytes = pending.reduce((sum, u) => sum + u.uploadedBytes, 0);

  return totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
};

/**
 * Get file icon based on type
 */
export const getFileIcon = (fileType: FileType): string => {
  switch (fileType) {
    case "image":
      return "image";
    case "video":
      return "video";
    case "audio":
      return "audio";
    case "document":
      return "file-text";
    case "archive":
      return "archive";
    default:
      return "file";
  }
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (fileName: string): string => {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
};

/**
 * Check if file is previewable
 */
export const isPreviewable = (fileType: FileType): boolean => {
  return fileType === "image" || fileType === "video" || fileType === "audio";
};

/**
 * Estimate upload time remaining
 */
export const estimateTimeRemaining = (
  uploadedBytes: number,
  totalBytes: number,
  startTime: number,
): number | null => {
  if (uploadedBytes === 0) return null;

  const elapsed = Date.now() - startTime;
  const bytesPerMs = uploadedBytes / elapsed;
  const remainingBytes = totalBytes - uploadedBytes;

  return Math.round(remainingBytes / bytesPerMs);
};
