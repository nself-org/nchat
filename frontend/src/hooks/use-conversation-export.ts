/**
 * useConversationExport Hook
 *
 * Client-side hook for managing conversation export operations.
 * Provides progress tracking, format selection, and download handling.
 */

import { useState, useCallback } from "react";
import type {
  ExportFormat,
  ExportScope,
  MediaHandling,
  ExportOptions,
  ExportProgress,
  ExportStats,
  ExportJob,
} from "@/services/export";

// ============================================================================
// TYPES
// ============================================================================

export interface UseConversationExportOptions {
  onProgress?: (progress: ExportProgress) => void;
  onComplete?: (stats: ExportStats, downloadUrl: string) => void;
  onError?: (error: Error) => void;
}

export interface UseConversationExportReturn {
  // State
  isExporting: boolean;
  progress: ExportProgress | null;
  stats: ExportStats | null;
  error: Error | null;
  downloadUrl: string | null;
  activeJobs: ExportJob[];

  // Actions
  startExport: (options: ExportOptions) => Promise<void>;
  cancelExport: (jobId?: string) => void;
  downloadExport: (jobId: string) => Promise<void>;
  getJobStatus: (jobId: string) => Promise<ExportJob | null>;
  clearCompleted: () => void;

  // Utilities
  estimateExportSize: (channelIds: string[]) => Promise<number>;
  getSupportedFormats: () => typeof SUPPORTED_FORMATS;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPPORTED_FORMATS: Array<{
  value: ExportFormat;
  label: string;
  mimeType: string;
  extension: string;
  description: string;
}> = [
  {
    value: "json",
    label: "JSON",
    mimeType: "application/json",
    extension: "json",
    description: "Full fidelity, machine-readable format",
  },
  {
    value: "html",
    label: "HTML",
    mimeType: "text/html",
    extension: "html",
    description: "Human-readable archive with styling",
  },
  {
    value: "text",
    label: "Plain Text",
    mimeType: "text/plain",
    extension: "txt",
    description: "Simple text transcript",
  },
  {
    value: "csv",
    label: "CSV",
    mimeType: "text/csv",
    extension: "csv",
    description: "Spreadsheet-compatible format",
  },
];

const POLL_INTERVAL = 1000; // 1 second

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useConversationExport(
  options: UseConversationExportOptions = {},
): UseConversationExportReturn {
  const { onProgress, onComplete, onError } = options;

  // State
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<ExportJob[]>([]);
  const [pollIntervalId, setPollIntervalId] = useState<NodeJS.Timeout | null>(
    null,
  );

  /**
   * Start an export operation
   */
  const startExport = useCallback(
    async (exportOptions: ExportOptions) => {
      setIsExporting(true);
      setProgress({
        status: "processing",
        progress: 0,
        currentPhase: "Starting export...",
        itemsProcessed: 0,
        totalItems: 0,
      });
      setError(null);
      setDownloadUrl(null);

      try {
        // For small exports, use direct download
        // For large exports, use job-based processing
        const response = await fetch("/api/conversations/export", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(exportOptions),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Export failed: ${response.statusText}`,
          );
        }

        // Check if this is a job-based response or direct download
        const contentType = response.headers.get("Content-Type");

        if (contentType?.includes("application/json")) {
          // Job-based response - start polling
          const jobData = await response.json();

          if (jobData.jobId) {
            const job: ExportJob = {
              id: jobData.jobId,
              userId: "",
              status: "pending",
              progress: 0,
              options: exportOptions,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            };

            setActiveJobs((prev) => [...prev, job]);
            startPolling(jobData.jobId);
          } else if (jobData.downloadUrl) {
            // Direct download URL
            setDownloadUrl(jobData.downloadUrl);
            setProgress({
              status: "completed",
              progress: 100,
              currentPhase: "Complete",
              itemsProcessed: jobData.stats?.totalMessages || 0,
              totalItems: jobData.stats?.totalMessages || 0,
            });
            setStats(jobData.stats);
            onComplete?.(jobData.stats, jobData.downloadUrl);
          }
        } else {
          // Direct file download
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);

          // Extract filename from Content-Disposition header
          const disposition = response.headers.get("Content-Disposition");
          const filenameMatch = disposition?.match(/filename="(.+)"/);
          const filename =
            filenameMatch?.[1] || `export.${exportOptions.format}`;

          // Trigger download
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          const exportStats: ExportStats = {
            totalMessages: parseInt(
              response.headers.get("X-Export-Messages") || "0",
            ),
            totalThreads: 0,
            totalReactions: 0,
            totalMedia: 0,
            totalPins: 0,
            totalEdits: 0,
            totalDeleted: 0,
            channels: exportOptions.channelIds.length,
            users: 0,
            fileSizeBytes: blob.size,
            duration: 0,
          };

          setDownloadUrl(url);
          setStats(exportStats);
          setProgress({
            status: "completed",
            progress: 100,
            currentPhase: "Complete",
            itemsProcessed: exportStats.totalMessages,
            totalItems: exportStats.totalMessages,
          });

          onComplete?.(exportStats, url);
        }
      } catch (err) {
        const exportError =
          err instanceof Error ? err : new Error("Export failed");
        setError(exportError);
        setProgress({
          status: "failed",
          progress: 0,
          currentPhase: "Failed",
          itemsProcessed: 0,
          totalItems: 0,
        });
        onError?.(exportError);
      } finally {
        setIsExporting(false);
      }
    },
    [onComplete, onError],
  );

  /**
   * Start polling for job status
   */
  const startPolling = useCallback(
    (jobId: string) => {
      const intervalId = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/conversations/export?jobId=${jobId}`,
          );

          if (!response.ok) {
            throw new Error("Failed to get job status");
          }

          const job: ExportJob = await response.json();

          // Update active jobs
          setActiveJobs((prev) => prev.map((j) => (j.id === jobId ? job : j)));

          // Update progress
          const newProgress: ExportProgress = {
            status:
              job.status === "completed"
                ? "completed"
                : job.status === "failed"
                  ? "failed"
                  : "processing",
            progress: job.progress,
            currentPhase: job.status,
            itemsProcessed: job.stats?.totalMessages || 0,
            totalItems: job.stats?.totalMessages || 0,
          };

          setProgress(newProgress);
          onProgress?.(newProgress);

          // Check if complete
          if (job.status === "completed" && job.downloadUrl) {
            clearInterval(intervalId);
            setPollIntervalId(null);
            setDownloadUrl(job.downloadUrl);
            setStats(job.stats || null);
            setIsExporting(false);
            onComplete?.(job.stats!, job.downloadUrl);
          } else if (job.status === "failed") {
            clearInterval(intervalId);
            setPollIntervalId(null);
            setError(new Error(job.errorMessage || "Export failed"));
            setIsExporting(false);
            onError?.(new Error(job.errorMessage || "Export failed"));
          }
        } catch (err) {
          // Continue polling on error
          console.error("Polling error:", err);
        }
      }, POLL_INTERVAL);

      setPollIntervalId(intervalId);
    },
    [onProgress, onComplete, onError],
  );

  /**
   * Cancel an export operation
   */
  const cancelExport = useCallback(
    (jobId?: string) => {
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        setPollIntervalId(null);
      }

      setIsExporting(false);
      setProgress(null);

      if (jobId) {
        setActiveJobs((prev) => prev.filter((j) => j.id !== jobId));

        // Optionally notify server to cancel
        fetch(`/api/conversations/export/${jobId}`, {
          method: "DELETE",
        }).catch(() => {
          // Ignore cancellation errors
        });
      }
    },
    [pollIntervalId],
  );

  /**
   * Download a completed export
   */
  const downloadExport = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(
        `/api/conversations/export?jobId=${jobId}&download=true`,
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || "export";

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Download failed"));
      throw err;
    }
  }, []);

  /**
   * Get status of a specific job
   */
  const getJobStatus = useCallback(
    async (jobId: string): Promise<ExportJob | null> => {
      try {
        const response = await fetch(
          `/api/conversations/export?jobId=${jobId}`,
        );

        if (!response.ok) {
          return null;
        }

        return await response.json();
      } catch {
        return null;
      }
    },
    [],
  );

  /**
   * Clear completed jobs from the list
   */
  const clearCompleted = useCallback(() => {
    setActiveJobs((prev) =>
      prev.filter((j) => j.status !== "completed" && j.status !== "failed"),
    );
  }, []);

  /**
   * Estimate export size for given channels
   */
  const estimateExportSize = useCallback(
    async (channelIds: string[]): Promise<number> => {
      try {
        const response = await fetch("/api/conversations/export/estimate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ channelIds }),
        });

        if (!response.ok) {
          return 0;
        }

        const data = await response.json();
        return data.estimatedSize || 0;
      } catch {
        return 0;
      }
    },
    [],
  );

  /**
   * Get list of supported formats
   */
  const getSupportedFormats = useCallback(() => SUPPORTED_FORMATS, []);

  return {
    // State
    isExporting,
    progress,
    stats,
    error,
    downloadUrl,
    activeJobs,

    // Actions
    startExport,
    cancelExport,
    downloadExport,
    getJobStatus,
    clearCompleted,

    // Utilities
    estimateExportSize,
    getSupportedFormats,
  };
}

export default useConversationExport;
