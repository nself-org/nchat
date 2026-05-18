"use client";

import * as React from "react";
import {
  uploadFileWithProgress,
  validateFile,
  type UploadProgress,
  type UploadResult,
  type UploadError,
  type UploadOptions,
} from "@/lib/storage/upload";
import type { FileUploadState } from "./file-preview-list";
import type { UploadStatus } from "./upload-progress";

// ============================================================================
// TYPES
// ============================================================================

export interface UseFileUploadOptions {
  /** Auto-upload files when added */
  autoUpload?: boolean;
  /** Maximum concurrent uploads */
  maxConcurrent?: number;
  /** Maximum total files */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allowed MIME types */
  allowedTypes?: string[];
  /** Bucket ID for uploads */
  bucketId?: string;
  /** Callback when all uploads complete */
  onAllComplete?: (results: UploadResult[], errors: UploadError[]) => void;
  /** Callback when a file upload completes */
  onFileComplete?: (file: File, result: UploadResult) => void;
  /** Callback when a file upload fails */
  onFileError?: (file: File, error: UploadError) => void;
  /** Callback when files are added */
  onFilesAdded?: (files: File[]) => void;
  /** Callback when a file is removed */
  onFileRemoved?: (id: string) => void;
}

export interface UseFileUploadReturn {
  /** Current file states */
  files: FileUploadState[];
  /** Add files to the queue */
  addFiles: (files: File[]) => void;
  /** Remove a file from the queue */
  removeFile: (id: string) => void;
  /** Clear all files */
  clearFiles: () => void;
  /** Start uploading all pending files */
  startUpload: () => void;
  /** Retry failed uploads */
  retryFailed: () => void;
  /** Retry a specific file */
  retryFile: (id: string) => void;
  /** Cancel a specific upload */
  cancelUpload: (id: string) => void;
  /** Cancel all uploads */
  cancelAll: () => void;
  /** Whether any upload is in progress */
  isUploading: boolean;
  /** Overall progress (0-100) */
  overallProgress: number;
  /** Number of completed uploads */
  completedCount: number;
  /** Number of failed uploads */
  failedCount: number;
  /** Whether all uploads are complete */
  isComplete: boolean;
  /** Get uploaded file URLs */
  getUploadedUrls: () => string[];
  /** Get uploaded file results */
  getUploadedResults: () => UploadResult[];
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useFileUpload - Comprehensive hook for file upload management
 *
 * @example
 * ```tsx
 * const {
 *   files,
 *   addFiles,
 *   removeFile,
 *   startUpload,
 *   isUploading,
 *   overallProgress,
 * } = useFileUpload({
 *   autoUpload: true,
 *   maxFiles: 10,
 *   onAllComplete: (results) => /* console.log 'All done!', results),
 * })
 * ```
 */
export function useFileUpload(
  options: UseFileUploadOptions = {},
): UseFileUploadReturn {
  const {
    autoUpload = false,
    maxConcurrent = 3,
    maxFiles,
    maxSize,
    allowedTypes,
    bucketId,
    onAllComplete,
    onFileComplete,
    onFileError,
    onFilesAdded,
    onFileRemoved,
  } = options;

  // State
  const [files, setFiles] = React.useState<FileUploadState[]>([]);
  const [uploadQueue, setUploadQueue] = React.useState<string[]>([]);
  const [activeUploads, setActiveUploads] = React.useState<Set<string>>(
    new Set(),
  );
  const [completedResults, setCompletedResults] = React.useState<
    Map<string, UploadResult>
  >(new Map());
  const [errors, setErrors] = React.useState<Map<string, UploadError>>(
    new Map(),
  );

  // Refs for abort controllers
  const abortControllers = React.useRef<Map<string, AbortController>>(
    new Map(),
  );

  // Computed values
  const isUploading = activeUploads.size > 0;
  const completedCount = files.filter((f) => f.status === "completed").length;
  const failedCount = files.filter((f) => f.status === "error").length;
  const isComplete =
    files.length > 0 && completedCount + failedCount === files.length;

  const overallProgress = React.useMemo(() => {
    if (files.length === 0) return 0;
    const total = files.reduce((sum, f) => sum + f.progress, 0);
    return Math.round(total / files.length);
  }, [files]);

  // Generate unique ID
  const generateId = () =>
    `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add files
  const addFiles = React.useCallback(
    (newFiles: File[]) => {
      // Filter out invalid files
      const validFiles: { file: File; id: string }[] = [];
      const rejectedFiles: { file: File; error: UploadError }[] = [];

      for (const file of newFiles) {
        // Check max files limit
        if (maxFiles && files.length + validFiles.length >= maxFiles) {
          rejectedFiles.push({
            file,
            error: {
              code: "FILE_TOO_LARGE",
              message: `Maximum ${maxFiles} files allowed`,
            },
          });
          continue;
        }

        // Validate file
        const validation = validateFile(file, { maxSize, allowedTypes });
        if (!validation.valid && validation.error) {
          rejectedFiles.push({ file, error: validation.error });
          continue;
        }

        validFiles.push({ file, id: generateId() });
      }

      // Report rejected files
      for (const { file, error } of rejectedFiles) {
        onFileError?.(file, error);
      }

      if (validFiles.length === 0) return;

      // Add to state
      const newFileStates: FileUploadState[] = validFiles.map(
        ({ file, id }) => ({
          id,
          file,
          progress: 0,
          status: "pending" as UploadStatus,
        }),
      );

      setFiles((prev) => [...prev, ...newFileStates]);

      // Add to upload queue
      const newIds = validFiles.map((f) => f.id);
      setUploadQueue((prev) => [...prev, ...newIds]);

      // Notify
      onFilesAdded?.(validFiles.map((f) => f.file));

      // Auto-upload if enabled
      if (autoUpload) {
        // Schedule upload start for next tick to ensure state is updated
        setTimeout(() => {
          processQueue();
        }, 0);
      }
    },
    [
      files.length,
      maxFiles,
      maxSize,
      allowedTypes,
      autoUpload,
      onFilesAdded,
      onFileError,
    ],
  );

  // Remove file
  const removeFile = React.useCallback(
    (id: string) => {
      // Cancel if uploading
      const controller = abortControllers.current.get(id);
      if (controller) {
        controller.abort();
        abortControllers.current.delete(id);
      }

      setFiles((prev) => prev.filter((f) => f.id !== id));
      setUploadQueue((prev) => prev.filter((qId) => qId !== id));
      setActiveUploads((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setCompletedResults((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      setErrors((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });

      onFileRemoved?.(id);
    },
    [onFileRemoved],
  );

  // Clear all files
  const clearFiles = React.useCallback(() => {
    // Cancel all active uploads
    abortControllers.current.forEach((controller) => controller.abort());
    abortControllers.current.clear();

    setFiles([]);
    setUploadQueue([]);
    setActiveUploads(new Set());
    setCompletedResults(new Map());
    setErrors(new Map());
  }, []);

  // Upload a single file
  const uploadFile = React.useCallback(
    async (id: string) => {
      const fileState = files.find((f) => f.id === id);
      if (!fileState || fileState.status === "uploading") return;

      // Create abort controller
      const controller = new AbortController();
      abortControllers.current.set(id, controller);

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: "uploading" as UploadStatus, progress: 0 }
            : f,
        ),
      );
      setActiveUploads((prev) => new Set(prev).add(id));

      try {
        const result = await uploadFileWithProgress(fileState.file, {
          bucketId,
          signal: controller.signal,
          onProgress: (progress: UploadProgress) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === id ? { ...f, progress: progress.percentage } : f,
              ),
            );
          },
        });

        // Success
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: "completed" as UploadStatus,
                  progress: 100,
                  url: result.url,
                }
              : f,
          ),
        );
        setCompletedResults((prev) => new Map(prev).set(id, result));
        setErrors((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });

        onFileComplete?.(fileState.file, result);
      } catch (err) {
        const error = err as UploadError;

        // Handle cancellation
        if (error.code === "CANCELED") {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? { ...f, status: "pending" as UploadStatus, progress: 0 }
                : f,
            ),
          );
        } else {
          // Error
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    status: "error" as UploadStatus,
                    errorMessage: error.message,
                  }
                : f,
            ),
          );
          setErrors((prev) => new Map(prev).set(id, error));
          onFileError?.(fileState.file, error);
        }
      } finally {
        abortControllers.current.delete(id);
        setActiveUploads((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        // Process next in queue
        processQueue();
      }
    },
    [files, bucketId, onFileComplete, onFileError],
  );

  // Process upload queue
  const processQueue = React.useCallback(() => {
    setUploadQueue((currentQueue) => {
      setActiveUploads((currentActive) => {
        // Calculate how many we can start
        const availableSlots = maxConcurrent - currentActive.size;
        if (availableSlots <= 0 || currentQueue.length === 0) {
          return currentActive;
        }

        // Get pending files from queue
        const pendingIds = currentQueue.filter((id) => {
          const file = files.find((f) => f.id === id);
          return file && file.status === "pending" && !currentActive.has(id);
        });

        // Start uploads for available slots
        const toStart = pendingIds.slice(0, availableSlots);
        toStart.forEach((id) => {
          uploadFile(id);
        });

        return currentActive;
      });

      return currentQueue;
    });
  }, [maxConcurrent, files, uploadFile]);

  // Start uploading
  const startUpload = React.useCallback(() => {
    // Add all pending files to queue
    const pendingIds = files
      .filter((f) => f.status === "pending")
      .map((f) => f.id);

    setUploadQueue((prev) => {
      const newQueue = [...prev];
      for (const id of pendingIds) {
        if (!newQueue.includes(id)) {
          newQueue.push(id);
        }
      }
      return newQueue;
    });

    // Process queue
    processQueue();
  }, [files, processQueue]);

  // Retry failed uploads
  const retryFailed = React.useCallback(() => {
    const failedIds = files
      .filter((f) => f.status === "error")
      .map((f) => f.id);

    // Reset status to pending
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "error"
          ? {
              ...f,
              status: "pending" as UploadStatus,
              progress: 0,
              errorMessage: undefined,
            }
          : f,
      ),
    );

    // Add to queue
    setUploadQueue((prev) => [...prev, ...failedIds]);

    // Process queue
    processQueue();
  }, [files, processQueue]);

  // Retry specific file
  const retryFile = React.useCallback(
    (id: string) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: "pending" as UploadStatus,
                progress: 0,
                errorMessage: undefined,
              }
            : f,
        ),
      );

      setUploadQueue((prev) => [...prev, id]);
      processQueue();
    },
    [processQueue],
  );

  // Cancel specific upload
  const cancelUpload = React.useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
    }
  }, []);

  // Cancel all uploads
  const cancelAll = React.useCallback(() => {
    abortControllers.current.forEach((controller) => controller.abort());
    setUploadQueue([]);
  }, []);

  // Get uploaded URLs
  const getUploadedUrls = React.useCallback(() => {
    return files
      .filter((f) => f.status === "completed" && f.url)
      .map((f) => f.url!);
  }, [files]);

  // Get uploaded results
  const getUploadedResults = React.useCallback(() => {
    return Array.from(completedResults.values());
  }, [completedResults]);

  // Check for completion
  React.useEffect(() => {
    if (isComplete && files.length > 0) {
      const results = Array.from(completedResults.values());
      const errorList = Array.from(errors.values());
      onAllComplete?.(results, errorList);
    }
  }, [isComplete, files.length, completedResults, errors, onAllComplete]);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    startUpload,
    retryFailed,
    retryFile,
    cancelUpload,
    cancelAll,
    isUploading,
    overallProgress,
    completedCount,
    failedCount,
    isComplete,
    getUploadedUrls,
    getUploadedResults,
  };
}

/**
 * Simple hook for single file upload
 */
export function useSingleFileUpload(
  options: Omit<UseFileUploadOptions, "maxFiles"> = {},
) {
  const upload = useFileUpload({ ...options, maxFiles: 1 });

  const file = upload.files[0] || null;
  const result = upload.getUploadedResults()[0] || null;

  const setFile = React.useCallback(
    (newFile: File | null) => {
      upload.clearFiles();
      if (newFile) {
        upload.addFiles([newFile]);
      }
    },
    [upload],
  );

  return {
    file,
    result,
    setFile,
    removeFile: () => file && upload.removeFile(file.id),
    startUpload: upload.startUpload,
    retryUpload: () => file && upload.retryFile(file.id),
    cancelUpload: () => file && upload.cancelUpload(file.id),
    isUploading: upload.isUploading,
    progress: file?.progress || 0,
    status: file?.status || "pending",
    error: file?.errorMessage,
    url: file?.url || result?.url,
  };
}
