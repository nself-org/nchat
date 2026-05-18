/**
 * Upload Hook - React hook for file upload management
 *
 * Provides a convenient interface for:
 * - File selection and validation
 * - Upload with progress tracking
 * - Multiple file handling
 * - Upload cancellation
 * - Error handling
 */

"use client";

import { useCallback, useRef, useState, useMemo } from "react";
import {
  useAttachmentStore,
  UploadProgress,
  FileType,
} from "@/stores/attachment-store";
import { getUploadService, UploadResult, UploadConfig } from "./upload-service";
import {
  validateFile,
  validateFiles,
  FileValidationOptions,
  getFileType,
  createPreviewUrl,
  revokePreviewUrl,
  getImageDimensions,
  getVideoDimensions,
  getAudioDuration,
} from "./file-utils";

// ============================================================================
// Types
// ============================================================================

export interface UseUploadOptions {
  /** Channel ID for context */
  channelId?: string;
  /** Thread ID for context */
  threadId?: string;
  /** Message ID for context (for edits) */
  messageId?: string;
  /** File validation options */
  validation?: FileValidationOptions;
  /** Upload service configuration */
  uploadConfig?: UploadConfig;
  /** Auto-upload files immediately after selection */
  autoUpload?: boolean;
  /** Callback when upload starts */
  onUploadStart?: (uploadId: string, file: File) => void;
  /** Callback when upload progresses */
  onUploadProgress?: (
    uploadId: string,
    progress: number,
    uploadedBytes: number,
  ) => void;
  /** Callback when upload completes */
  onUploadComplete?: (uploadId: string, result: UploadResult) => void;
  /** Callback when upload fails */
  onUploadError?: (uploadId: string, error: Error) => void;
  /** Callback when file is validated and rejected */
  onValidationError?: (file: File, error: string) => void;
}

export interface UploadState {
  /** Currently selected files (not yet uploaded) */
  selectedFiles: SelectedFile[];
  /** Whether files are being processed */
  isProcessing: boolean;
  /** Total upload progress (0-100) */
  totalProgress: number;
  /** Whether any uploads are in progress */
  isUploading: boolean;
  /** Validation errors from last selection */
  validationErrors: { file: File; error: string }[];
}

export interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  fileType: FileType;
  dimensions?: { width: number; height: number };
  duration?: number;
}

export interface UseUploadReturn extends UploadState {
  /** Select files from input or drop */
  selectFiles: (files: FileList | File[]) => Promise<void>;
  /** Remove a selected file */
  removeSelectedFile: (fileId: string) => void;
  /** Clear all selected files */
  clearSelectedFiles: () => void;
  /** Upload selected files */
  uploadSelectedFiles: () => Promise<string[]>;
  /** Upload a single file */
  uploadFile: (file: File) => Promise<string>;
  /** Cancel an upload */
  cancelUpload: (uploadId: string) => void;
  /** Cancel all uploads */
  cancelAllUploads: () => void;
  /** Retry a failed upload */
  retryUpload: (uploadId: string) => void;
  /** Remove an upload from the store */
  removeUpload: (uploadId: string) => void;
  /** Get upload by ID */
  getUpload: (uploadId: string) => UploadProgress | undefined;
  /** Get all uploads for current context */
  getUploads: () => UploadProgress[];
  /** Get pending uploads */
  getPendingUploads: () => UploadProgress[];
  /** Get completed uploads */
  getCompletedUploads: () => UploadProgress[];
  /** Get failed uploads */
  getFailedUploads: () => UploadProgress[];
  /** Open file picker dialog */
  openFilePicker: (accept?: string) => void;
  /** File input ref for controlled input */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

// ============================================================================
// Helper Functions
// ============================================================================

const generateSelectedFileId = (): string =>
  `selected_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// ============================================================================
// Hook
// ============================================================================

export function useUpload(options: UseUploadOptions = {}): UseUploadReturn {
  const {
    channelId,
    threadId,
    messageId,
    validation,
    uploadConfig,
    autoUpload = false,
    onUploadStart,
    onUploadProgress,
    onUploadComplete,
    onUploadError,
    onValidationError,
  } = options;

  // State
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    { file: File; error: string }[]
  >([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Store
  const store = useAttachmentStore();

  // Upload service
  const uploadService = useMemo(
    () => getUploadService(uploadConfig),
    [uploadConfig],
  );

  // Get uploads for current context
  const getUploads = useCallback((): UploadProgress[] => {
    const uploads = Array.from(store.uploads.values());
    return uploads.filter((u) => {
      if (channelId && u.channelId !== channelId) return false;
      if (threadId && u.threadId !== threadId) return false;
      if (messageId && u.messageId !== messageId) return false;
      return true;
    });
  }, [store.uploads, channelId, threadId, messageId]);

  // Calculate total progress
  const totalProgress = useMemo(() => {
    const pending = getUploads().filter(
      (u) =>
        u.status === "pending" ||
        u.status === "queued" ||
        u.status === "uploading",
    );
    if (pending.length === 0) return 100;

    const totalBytes = pending.reduce((sum, u) => sum + u.fileSize, 0);
    const uploadedBytes = pending.reduce((sum, u) => sum + u.uploadedBytes, 0);

    return totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;
  }, [getUploads]);

  // Check if uploading
  const isUploading = useMemo(() => {
    return getUploads().some(
      (u) => u.status === "uploading" || u.status === "queued",
    );
  }, [getUploads]);

  // Select files
  const selectFiles = useCallback(
    async (files: FileList | File[]): Promise<void> => {
      setIsProcessing(true);
      setValidationErrors([]);

      const fileArray = Array.from(files);

      // Validate files
      const { valid, invalid } = validation
        ? validateFiles(fileArray, validation)
        : { valid: fileArray, invalid: [] };

      // Report validation errors
      if (invalid.length > 0) {
        setValidationErrors(invalid);
        invalid.forEach(({ file, error }) => {
          onValidationError?.(file, error);
        });
      }

      // Process valid files
      const newSelectedFiles: SelectedFile[] = [];

      for (const file of valid) {
        const id = generateSelectedFileId();
        const fileType = getFileType(file);
        const previewUrl = createPreviewUrl(file);

        const selectedFile: SelectedFile = {
          id,
          file,
          previewUrl,
          fileType,
        };

        // Get dimensions for images/videos
        if (fileType === "image") {
          try {
            selectedFile.dimensions = await getImageDimensions(file);
          } catch {
            // Ignore dimension errors
          }
        } else if (fileType === "video") {
          try {
            const { width, height, duration } = await getVideoDimensions(file);
            selectedFile.dimensions = { width, height };
            selectedFile.duration = duration;
          } catch {
            // Ignore dimension errors
          }
        } else if (fileType === "audio") {
          try {
            selectedFile.duration = await getAudioDuration(file);
          } catch {
            // Ignore duration errors
          }
        }

        newSelectedFiles.push(selectedFile);
      }

      setSelectedFiles((prev) => [...prev, ...newSelectedFiles]);
      setIsProcessing(false);

      // Auto-upload if enabled
      if (autoUpload && newSelectedFiles.length > 0) {
        // Use setTimeout to ensure state is updated
        setTimeout(() => {
          newSelectedFiles.forEach((sf) => {
            uploadFileInternal(sf.file);
          });
        }, 0);
      }
    },
    [validation, autoUpload, onValidationError],
  );

  // Remove selected file
  const removeSelectedFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file?.previewUrl) {
        revokePreviewUrl(file.previewUrl);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  // Clear selected files
  const clearSelectedFiles = useCallback(() => {
    setSelectedFiles((prev) => {
      prev.forEach((file) => {
        if (file.previewUrl) {
          revokePreviewUrl(file.previewUrl);
        }
      });
      return [];
    });
    setValidationErrors([]);
  }, []);

  // Upload a single file (internal)
  const uploadFileInternal = useCallback(
    async (file: File): Promise<string> => {
      // Start upload in store
      const uploadId = store.startUpload(file, {
        channelId,
        threadId,
        messageId,
      });
      onUploadStart?.(uploadId, file);

      // Create abort controller
      const abortController = new AbortController();
      abortControllersRef.current.set(uploadId, abortController);

      try {
        // Start actual upload
        const result = await uploadService.uploadWithRetry(file, {
          signal: abortController.signal,
          onProgress: (progress, uploadedBytes) => {
            store.updateProgress(uploadId, progress, uploadedBytes);
            onUploadProgress?.(uploadId, progress, uploadedBytes);
          },
        });

        // Complete upload in store
        store.completeUpload(uploadId, {
          url: result.url,
          id: result.id,
          thumbnailUrl: result.thumbnailUrl,
        });

        onUploadComplete?.(uploadId, result);
        return uploadId;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Upload failed");

        // Don't report cancellation as error
        if (err.message !== "Upload cancelled") {
          store.failUpload(uploadId, err.message);
          onUploadError?.(uploadId, err);
        }

        throw error;
      } finally {
        abortControllersRef.current.delete(uploadId);
      }
    },
    [
      store,
      uploadService,
      channelId,
      threadId,
      messageId,
      onUploadStart,
      onUploadProgress,
      onUploadComplete,
      onUploadError,
    ],
  );

  // Upload a single file (public)
  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      // Validate file
      if (validation) {
        const result = validateFile(file, validation);
        if (!result.valid) {
          onValidationError?.(file, result.error!);
          throw new Error(result.error);
        }
      }

      return uploadFileInternal(file);
    },
    [validation, uploadFileInternal, onValidationError],
  );

  // Upload selected files
  const uploadSelectedFiles = useCallback(async (): Promise<string[]> => {
    const uploadIds: string[] = [];

    for (const selectedFile of selectedFiles) {
      try {
        const uploadId = await uploadFileInternal(selectedFile.file);
        uploadIds.push(uploadId);

        // Remove from selected files
        removeSelectedFile(selectedFile.id);
      } catch {
        // Continue with other files
      }
    }

    return uploadIds;
  }, [selectedFiles, uploadFileInternal, removeSelectedFile]);

  // Cancel upload
  const cancelUpload = useCallback(
    (uploadId: string) => {
      const controller = abortControllersRef.current.get(uploadId);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(uploadId);
      }
      store.cancelUpload(uploadId);
    },
    [store],
  );

  // Cancel all uploads
  const cancelAllUploads = useCallback(() => {
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    store.cancelAllUploads();
  }, [store]);

  // Retry upload
  const retryUpload = useCallback(
    (uploadId: string) => {
      const upload = store.getUpload(uploadId);
      if (upload && upload.file) {
        store.retryUpload(uploadId);

        // Re-upload
        const abortController = new AbortController();
        abortControllersRef.current.set(uploadId, abortController);

        uploadService
          .uploadWithRetry(upload.file, {
            signal: abortController.signal,
            onProgress: (progress, uploadedBytes) => {
              store.updateProgress(uploadId, progress, uploadedBytes);
              onUploadProgress?.(uploadId, progress, uploadedBytes);
            },
          })
          .then((result) => {
            store.completeUpload(uploadId, {
              url: result.url,
              id: result.id,
              thumbnailUrl: result.thumbnailUrl,
            });
            onUploadComplete?.(uploadId, result);
          })
          .catch((error) => {
            const err =
              error instanceof Error ? error : new Error("Upload failed");
            if (err.message !== "Upload cancelled") {
              store.failUpload(uploadId, err.message);
              onUploadError?.(uploadId, err);
            }
          })
          .finally(() => {
            abortControllersRef.current.delete(uploadId);
          });
      }
    },
    [store, uploadService, onUploadProgress, onUploadComplete, onUploadError],
  );

  // Remove upload
  const removeUpload = useCallback(
    (uploadId: string) => {
      // Cancel if in progress
      const controller = abortControllersRef.current.get(uploadId);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(uploadId);
      }
      store.removeUpload(uploadId);
    },
    [store],
  );

  // Get upload by ID
  const getUpload = useCallback(
    (uploadId: string): UploadProgress | undefined => {
      return store.getUpload(uploadId);
    },
    [store],
  );

  // Get pending uploads
  const getPendingUploads = useCallback((): UploadProgress[] => {
    return getUploads().filter(
      (u) =>
        u.status === "pending" ||
        u.status === "queued" ||
        u.status === "uploading",
    );
  }, [getUploads]);

  // Get completed uploads
  const getCompletedUploads = useCallback((): UploadProgress[] => {
    return getUploads().filter((u) => u.status === "completed");
  }, [getUploads]);

  // Get failed uploads
  const getFailedUploads = useCallback((): UploadProgress[] => {
    return getUploads().filter((u) => u.status === "failed");
  }, [getUploads]);

  // Open file picker
  const openFilePicker = useCallback((accept?: string) => {
    if (fileInputRef.current) {
      if (accept) {
        fileInputRef.current.accept = accept;
      }
      fileInputRef.current.click();
    }
  }, []);

  return {
    // State
    selectedFiles,
    isProcessing,
    totalProgress,
    isUploading,
    validationErrors,

    // Actions
    selectFiles,
    removeSelectedFile,
    clearSelectedFiles,
    uploadSelectedFiles,
    uploadFile,
    cancelUpload,
    cancelAllUploads,
    retryUpload,
    removeUpload,
    getUpload,
    getUploads,
    getPendingUploads,
    getCompletedUploads,
    getFailedUploads,
    openFilePicker,
    fileInputRef,
  };
}

// ============================================================================
// File Input Component Hook
// ============================================================================

export interface UseFileInputOptions {
  /** Accepted file types (e.g., 'image/*,video/*') */
  accept?: string;
  /** Allow multiple files */
  multiple?: boolean;
  /** Callback when files are selected */
  onSelect?: (files: File[]) => void;
}

export interface UseFileInputReturn {
  /** Input element ref */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Open file picker */
  open: () => void;
  /** Input element props */
  inputProps: {
    type: "file";
    ref: React.RefObject<HTMLInputElement | null>;
    accept?: string;
    multiple?: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    style: React.CSSProperties;
  };
}

export function useFileInput(
  options: UseFileInputOptions = {},
): UseFileInputReturn {
  const { accept, multiple = true, onSelect } = options;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const open = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        onSelect?.(Array.from(files));
      }
      // Reset input so same file can be selected again
      event.target.value = "";
    },
    [onSelect],
  );

  return {
    inputRef,
    open,
    inputProps: {
      type: "file",
      ref: inputRef,
      accept,
      multiple,
      onChange,
      style: { display: "none" },
    },
  };
}

export default useUpload;
