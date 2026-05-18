/**
 * File Upload Hook
 *
 * React hook for handling file uploads with progress tracking,
 * validation, and integration with the file-processing plugin.
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/auth-context";
import {
  validateFile,
  getDefaultOperations,
  formatBytes,
  DEFAULT_FILE_CONFIG,
} from "@/services/files/types";
import type {
  FileRecord,
  UploadProgress,
  ProcessingStatus,
  FileTypeConfig,
  ProcessingOperation,
} from "@/services/files/types";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface UseFileUploadOptions {
  /** Channel ID for the upload */
  channelId?: string;
  /** Message ID (for editing) */
  messageId?: string;
  /** Custom file validation config */
  fileConfig?: FileTypeConfig;
  /** Maximum concurrent uploads */
  maxConcurrent?: number;
  /** Auto-start uploads when files are added */
  autoUpload?: boolean;
  /** Callback when upload completes */
  onComplete?: (file: FileRecord) => void;
  /** Callback when upload fails */
  onError?: (fileId: string, error: Error) => void;
  /** Callback when all uploads complete */
  onAllComplete?: (files: FileRecord[]) => void;
}

export interface QueuedFile {
  id: string;
  file: File;
  progress: UploadProgress;
  result?: FileRecord;
  error?: string;
  retryCount: number;
}

export interface UseFileUploadReturn {
  /** Currently queued files */
  files: QueuedFile[];
  /** Whether any upload is in progress */
  isUploading: boolean;
  /** Total progress across all uploads (0-100) */
  totalProgress: number;
  /** Add files to upload queue */
  addFiles: (files: File[]) => string[];
  /** Remove a file from queue */
  removeFile: (fileId: string) => void;
  /** Clear all files from queue */
  clearFiles: () => void;
  /** Start uploading queued files */
  startUpload: () => Promise<void>;
  /** Cancel all uploads */
  cancelAll: () => void;
  /** Cancel a specific upload */
  cancelUpload: (fileId: string) => void;
  /** Retry a failed upload */
  retryUpload: (fileId: string) => void;
  /** Get completed file records */
  completedFiles: FileRecord[];
  /** Get failed uploads */
  failedFiles: QueuedFile[];
  /** Validate a file before adding */
  validateFile: (file: File) => { valid: boolean; error?: string };
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRIES = 3;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFileUpload(
  options: UseFileUploadOptions = {},
): UseFileUploadReturn {
  const {
    channelId,
    messageId,
    fileConfig = DEFAULT_FILE_CONFIG,
    maxConcurrent = 3,
    autoUpload = false,
    onComplete,
    onError,
    onAllComplete,
  } = options;

  const { user } = useAuth();

  // State
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Refs for abort controllers
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // ============================================================================
  // Computed Values
  // ============================================================================

  const totalProgress =
    files.length > 0
      ? Math.round(
          files.reduce((sum, f) => sum + f.progress.progress, 0) / files.length,
        )
      : 0;

  const completedFiles = files
    .filter((f) => f.progress.status === "completed" && f.result)
    .map((f) => f.result!);

  const failedFiles = files.filter((f) => f.progress.status === "failed");

  // ============================================================================
  // File Validation
  // ============================================================================

  const validateFileLocal = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      return validateFile(file, fileConfig);
    },
    [fileConfig],
  );

  // ============================================================================
  // Add Files
  // ============================================================================

  const addFiles = useCallback(
    (newFiles: File[]): string[] => {
      const fileIds: string[] = [];

      const queuedFiles: QueuedFile[] = newFiles
        .map((file) => {
          // Validate
          const validation = validateFileLocal(file);
          if (!validation.valid) {
            logger.warn(`File rejected: ${file.name} - ${validation.error}`);
            return null;
          }

          const id = uuidv4();
          fileIds.push(id);

          return {
            id,
            file,
            progress: {
              fileId: id,
              fileName: file.name,
              status: "pending" as ProcessingStatus,
              progress: 0,
              bytesUploaded: 0,
              bytesTotal: file.size,
              startedAt: new Date(),
            },
            retryCount: 0,
          };
        })
        .filter((f): f is QueuedFile => f !== null);

      setFiles((prev) => [...prev, ...queuedFiles]);

      return fileIds;
    },
    [validateFileLocal],
  );

  // ============================================================================
  // Remove File
  // ============================================================================

  const removeFile = useCallback((fileId: string) => {
    // Cancel if uploading
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(fileId);
    }

    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // ============================================================================
  // Clear Files
  // ============================================================================

  const clearFiles = useCallback(() => {
    // Cancel all uploads
    abortControllers.current.forEach((controller) => controller.abort());
    abortControllers.current.clear();

    setFiles([]);
    setIsUploading(false);
  }, []);

  // ============================================================================
  // Upload Single File
  // ============================================================================

  const uploadFile = useCallback(
    async (queuedFile: QueuedFile): Promise<FileRecord | null> => {
      const { id, file } = queuedFile;

      // Create abort controller
      const controller = new AbortController();
      abortControllers.current.set(id, controller);

      // Update status
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                progress: { ...f.progress, status: "uploading" },
              }
            : f,
        ),
      );

      try {
        // Create form data
        const formData = new FormData();
        formData.append("file", file);
        if (channelId) formData.append("channelId", channelId);
        if (messageId) formData.append("messageId", messageId);
        if (user?.id) formData.append("userId", user.id);

        // Upload with progress tracking
        const response = await uploadWithProgress(
          "/api/files/upload",
          formData,
          (loaded, total) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === id
                  ? {
                      ...f,
                      progress: {
                        ...f.progress,
                        bytesUploaded: loaded,
                        progress: Math.round((loaded / total) * 100),
                        speed: calculateSpeed(f.progress.startedAt, loaded),
                      },
                    }
                  : f,
              ),
            );
          },
          controller.signal,
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const result = await response.json();
        const fileRecord: FileRecord = result.file;

        // Update with processing status if applicable
        if (result.jobId) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    progress: { ...f.progress, status: "processing" },
                    result: fileRecord,
                  }
                : f,
            ),
          );

          // Poll for processing completion
          await pollProcessingStatus(id, result.jobId, fileRecord);
        } else {
          // Mark as completed
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    progress: {
                      ...f.progress,
                      status: "completed",
                      progress: 100,
                      completedAt: new Date(),
                    },
                    result: fileRecord,
                  }
                : f,
            ),
          );

          onComplete?.(fileRecord);
        }

        return fileRecord;
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? {
                    ...f,
                    progress: { ...f.progress, status: "cancelled" },
                  }
                : f,
            ),
          );
          return null;
        }

        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  progress: {
                    ...f.progress,
                    status: "failed",
                    error: errorMessage,
                  },
                  error: errorMessage,
                }
              : f,
          ),
        );

        onError?.(id, error instanceof Error ? error : new Error(errorMessage));
        return null;
      } finally {
        abortControllers.current.delete(id);
      }
    },
    [channelId, messageId, user?.id, onComplete, onError],
  );

  // ============================================================================
  // Poll Processing Status
  // ============================================================================

  const pollProcessingStatus = useCallback(
    async (
      fileId: string,
      jobId: string,
      fileRecord: FileRecord,
    ): Promise<void> => {
      const maxAttempts = 120; // 2 minutes with 1s interval
      let attempts = 0;

      while (attempts < maxAttempts) {
        try {
          const response = await fetch(`/api/files/${fileRecord.id}`);
          if (response.ok) {
            const data = await response.json();

            if (data.processingStatus === "completed") {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileId
                    ? {
                        ...f,
                        progress: {
                          ...f.progress,
                          status: "completed",
                          progress: 100,
                          completedAt: new Date(),
                        },
                        result: { ...fileRecord, ...data },
                      }
                    : f,
                ),
              );

              onComplete?.({ ...fileRecord, ...data });
              return;
            }

            if (data.processingStatus === "failed") {
              throw new Error("File processing failed");
            }
          }
        } catch (error) {
          logger.error("Error polling processing status:", error);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      // Timeout - mark as completed anyway
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                progress: {
                  ...f.progress,
                  status: "completed",
                  completedAt: new Date(),
                },
              }
            : f,
        ),
      );

      onComplete?.(fileRecord);
    },
    [onComplete],
  );

  // ============================================================================
  // Start Upload
  // ============================================================================

  const startUpload = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.progress.status === "pending");

    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    const results: FileRecord[] = [];
    const queue = [...pendingFiles];

    // Process in batches
    while (queue.length > 0) {
      const batch = queue.splice(0, maxConcurrent);
      const batchResults = await Promise.all(batch.map(uploadFile));
      results.push(...batchResults.filter((r): r is FileRecord => r !== null));
    }

    setIsUploading(false);
    onAllComplete?.(results);
  }, [files, maxConcurrent, uploadFile, onAllComplete]);

  // ============================================================================
  // Cancel Operations
  // ============================================================================

  const cancelAll = useCallback(() => {
    abortControllers.current.forEach((controller) => controller.abort());
    abortControllers.current.clear();

    setFiles((prev) =>
      prev.map((f) =>
        f.progress.status === "uploading"
          ? { ...f, progress: { ...f.progress, status: "cancelled" } }
          : f,
      ),
    );

    setIsUploading(false);
  }, []);

  const cancelUpload = useCallback((fileId: string) => {
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(fileId);
    }

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, progress: { ...f.progress, status: "cancelled" } }
          : f,
      ),
    );
  }, []);

  // ============================================================================
  // Retry Upload
  // ============================================================================

  const retryUpload = useCallback(
    async (fileId: string) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                progress: {
                  ...f.progress,
                  status: "pending",
                  error: undefined,
                },
                error: undefined,
                retryCount: f.retryCount + 1,
              }
            : f,
        ),
      );

      const queuedFile = files.find((f) => f.id === fileId);
      if (queuedFile && queuedFile.retryCount < MAX_RETRIES) {
        await uploadFile(queuedFile);
      }
    },
    [files, uploadFile],
  );

  // ============================================================================
  // Auto-upload Effect
  // ============================================================================

  useEffect(() => {
    if (autoUpload && files.some((f) => f.progress.status === "pending")) {
      startUpload();
    }
  }, [autoUpload, files, startUpload]);

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      abortControllers.current.forEach((controller) => controller.abort());
    };
  }, []);

  return {
    files,
    isUploading,
    totalProgress,
    addFiles,
    removeFile,
    clearFiles,
    startUpload,
    cancelAll,
    cancelUpload,
    retryUpload,
    completedFiles,
    failedFiles,
    validateFile: validateFileLocal,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Upload with XMLHttpRequest for progress tracking
 */
function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (loaded: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      }
    });

    xhr.addEventListener("load", () => {
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers({
            "Content-Type": xhr.getResponseHeader("Content-Type") || "",
          }),
        }),
      );
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error"));
    });

    xhr.addEventListener("abort", () => {
      reject(new DOMException("Aborted", "AbortError"));
    });

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort());
    }

    xhr.open("POST", url);
    xhr.send(formData);
  });
}

/**
 * Calculate upload speed
 */
function calculateSpeed(startedAt: Date, bytesUploaded: number): number {
  const elapsed = (Date.now() - startedAt.getTime()) / 1000;
  return elapsed > 0 ? bytesUploaded / elapsed : 0;
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Simple hook for single file upload
 */
export function useSingleFileUpload(options: UseFileUploadOptions = {}) {
  const uploadHook = useFileUpload({ ...options, maxConcurrent: 1 });

  const uploadSingleFile = useCallback(
    async (file: File): Promise<FileRecord | null> => {
      const [fileId] = uploadHook.addFiles([file]);
      await uploadHook.startUpload();

      const queuedFile = uploadHook.files.find((f) => f.id === fileId);
      return queuedFile?.result || null;
    },
    [uploadHook],
  );

  return {
    ...uploadHook,
    uploadSingleFile,
    file: uploadHook.files[0] || null,
  };
}
