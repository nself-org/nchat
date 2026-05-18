"use client";

/**
 * useJobStatus Hook
 *
 * Hook for tracking job progress and status in real-time.
 * Provides polling-based updates until job completes or fails.
 *
 * @module hooks/use-job-status
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Job status values
 */
export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "stuck"
  | "paused"
  | "unknown";

/**
 * Job details from API
 */
export interface JobDetails {
  id: string;
  queue: string;
  type: string;
  status: JobStatus;
  payload: unknown;
  progress: number;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  processedAt: string | null;
  finishedAt: string | null;
  delay?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
  failedReason?: string;
  returnValue?: unknown;
  logs?: string[];
}

/**
 * Hook options
 */
export interface UseJobStatusOptions {
  /** Polling interval in milliseconds (default: 2000) */
  pollInterval?: number;
  /** Enable automatic polling (default: true) */
  autoPoll?: boolean;
  /** Stop polling on completion (default: true) */
  stopOnComplete?: boolean;
  /** Maximum poll attempts before giving up (default: 100) */
  maxPollAttempts?: number;
  /** Queue name hint for faster lookup */
  queueHint?: string;
  /** Callback when job completes */
  onComplete?: (job: JobDetails) => void;
  /** Callback when job fails */
  onFailed?: (job: JobDetails) => void;
  /** Callback when job progress updates */
  onProgress?: (progress: number, job: JobDetails) => void;
}

/**
 * Hook return value
 */
export interface UseJobStatusReturn {
  /** Current job details */
  job: JobDetails | null;
  /** Current job status */
  status: JobStatus;
  /** Job progress (0-100) */
  progress: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Whether job has completed (successfully or failed) */
  isComplete: boolean;
  /** Whether job completed successfully */
  isSuccess: boolean;
  /** Whether job failed */
  isFailed: boolean;
  /** Refetch job status */
  refetch: () => Promise<void>;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Retry a failed job */
  retry: () => Promise<boolean>;
  /** Cancel a pending job */
  cancel: () => Promise<boolean>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_POLL_INTERVAL = 2000;
const DEFAULT_MAX_POLL_ATTEMPTS = 100;
const TERMINAL_STATUSES: JobStatus[] = ["completed", "failed"];

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for tracking job status
 *
 * @example
 * ```tsx
 * function JobTracker({ jobId }: { jobId: string }) {
 *   const {
 *     job,
 *     status,
 *     progress,
 *     isLoading,
 *     isComplete,
 *     isSuccess,
 *     isFailed,
 *   } = useJobStatus(jobId, {
 *     pollInterval: 1000,
 *     onComplete: (job) => /* console.log 'Job completed:', job),
 *     onFailed: (job) => /* console.log 'Job failed:', job.failedReason),
 *   })
 *
 *   if (isLoading) return <div>Loading...</div>
 *
 *   return (
 *     <div>
 *       <p>Status: {status}</p>
 *       <progress value={progress} max={100} />
 *       {isSuccess && <p>Completed!</p>}
 *       {isFailed && <p>Failed: {job?.failedReason}</p>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useJobStatus(
  jobId: string | null | undefined,
  options?: UseJobStatusOptions,
): UseJobStatusReturn {
  const {
    pollInterval = DEFAULT_POLL_INTERVAL,
    autoPoll = true,
    stopOnComplete = true,
    maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
    queueHint,
    onComplete,
    onFailed,
    onProgress,
  } = options || {};

  // State
  const [job, setJob] = useState<JobDetails | null>(null);
  const [status, setStatus] = useState<JobStatus>("unknown");
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const isPollingRef = useRef(false);
  const lastProgressRef = useRef(0);

  // Derived state
  const isComplete = TERMINAL_STATUSES.includes(status);
  const isSuccess = status === "completed";
  const isFailed = status === "failed";

  // Fetch job status
  const fetchJobStatus = useCallback(async (): Promise<JobDetails | null> => {
    if (!jobId) return null;

    try {
      const params = new URLSearchParams();
      if (queueHint) {
        params.set("queue", queueHint);
      }

      const url = `/api/jobs/${jobId}${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Job not found");
        }
        throw new Error(`Failed to fetch job status: ${response.statusText}`);
      }

      const data = await response.json();
      return data as JobDetails;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch job status";
      logger.error(
        "Failed to fetch job status",
        err instanceof Error ? err : new Error(message),
      );
      throw err;
    }
  }, [jobId, queueHint]);

  // Update state from job data
  const updateFromJob = useCallback(
    (jobData: JobDetails) => {
      setJob(jobData);
      setStatus(jobData.status);
      setProgress(jobData.progress);
      setError(null);

      // Trigger progress callback if progress changed
      if (jobData.progress !== lastProgressRef.current) {
        lastProgressRef.current = jobData.progress;
        onProgress?.(jobData.progress, jobData);
      }

      // Trigger completion callbacks
      if (jobData.status === "completed") {
        onComplete?.(jobData);
      } else if (jobData.status === "failed") {
        onFailed?.(jobData);
      }
    },
    [onComplete, onFailed, onProgress],
  );

  // Refetch job status
  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const jobData = await fetchJobStatus();
      if (jobData) {
        updateFromJob(jobData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch job status",
      );
    } finally {
      setIsLoading(false);
    }
  }, [fetchJobStatus, updateFromJob]);

  // Polling functions
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    isPollingRef.current = false;
    pollCountRef.current = 0;
  }, []);

  const startPolling = useCallback(() => {
    if (isPollingRef.current) return;
    if (!jobId) return;

    isPollingRef.current = true;
    pollCountRef.current = 0;

    const poll = async () => {
      if (!isPollingRef.current) return;

      pollCountRef.current++;

      // Check max attempts
      if (pollCountRef.current > maxPollAttempts) {
        logger.warn("Max poll attempts reached", {
          jobId,
          attempts: pollCountRef.current,
        });
        stopPolling();
        setError("Max poll attempts reached");
        return;
      }

      try {
        const jobData = await fetchJobStatus();
        if (jobData) {
          updateFromJob(jobData);

          // Stop polling if complete and stopOnComplete is true
          if (stopOnComplete && TERMINAL_STATUSES.includes(jobData.status)) {
            stopPolling();
          }
        }
      } catch {
        // Continue polling on error (transient failures)
      }
    };

    // Initial fetch
    poll();

    // Set up interval
    pollIntervalRef.current = setInterval(poll, pollInterval);
  }, [
    jobId,
    pollInterval,
    maxPollAttempts,
    stopOnComplete,
    fetchJobStatus,
    updateFromJob,
    stopPolling,
  ]);

  // Retry job
  const retry = useCallback(async (): Promise<boolean> => {
    if (!jobId) return false;

    try {
      const params = new URLSearchParams();
      if (queueHint) {
        params.set("queue", queueHint);
      }

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: queueHint }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to retry job");
      }

      // Reset status and start polling
      setStatus("waiting");
      setProgress(0);
      startPolling();

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to retry job";
      setError(message);
      return false;
    }
  }, [jobId, queueHint, startPolling]);

  // Cancel job
  const cancel = useCallback(async (): Promise<boolean> => {
    if (!jobId) return false;

    try {
      const params = new URLSearchParams();
      if (queueHint) {
        params.set("queue", queueHint);
      }

      const qs = params.toString();
      const cancelUrl = `/api/jobs/${jobId}${qs ? `?${qs}` : ""}`;
      const response = await fetch(cancelUrl, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel job");
      }

      // Stop polling and update status
      stopPolling();
      setStatus("failed");
      setError("Job cancelled");

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel job";
      setError(message);
      return false;
    }
  }, [jobId, queueHint, stopPolling]);

  // Start polling when jobId changes and autoPoll is enabled
  useEffect(() => {
    if (autoPoll && jobId) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [jobId, autoPoll, startPolling, stopPolling]);

  return {
    job,
    status,
    progress,
    isLoading,
    error,
    isComplete,
    isSuccess,
    isFailed,
    refetch,
    startPolling,
    stopPolling,
    retry,
    cancel,
  };
}

// ============================================================================
// Multiple Jobs Hook
// ============================================================================

/**
 * Hook for tracking multiple jobs
 */
export function useJobsStatus(
  jobIds: string[],
  options?: Omit<
    UseJobStatusOptions,
    "onComplete" | "onFailed" | "onProgress"
  > & {
    onAllComplete?: (jobs: JobDetails[]) => void;
    onAnyFailed?: (job: JobDetails) => void;
  },
): {
  jobs: Map<string, JobDetails>;
  isLoading: boolean;
  allComplete: boolean;
  anyFailed: boolean;
  completedCount: number;
  failedCount: number;
  totalProgress: number;
  refetchAll: () => Promise<void>;
} {
  const [jobs, setJobs] = useState<Map<string, JobDetails>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const {
    pollInterval = DEFAULT_POLL_INTERVAL,
    autoPoll = true,
    stopOnComplete = true,
    queueHint,
    onAllComplete,
    onAnyFailed,
  } = options || {};

  // Track completion
  const notifiedComplete = useRef(false);

  // Fetch all jobs
  const fetchAll = useCallback(async () => {
    const results = new Map<string, JobDetails>();

    await Promise.all(
      jobIds.map(async (jobId) => {
        try {
          const params = new URLSearchParams();
          if (queueHint) params.set("queue", queueHint);

          const jobQs = params.toString();
          const jobUrl = `/api/jobs/${jobId}${jobQs ? `?${jobQs}` : ""}`;
          const response = await fetch(jobUrl);

          if (response.ok) {
            const data = await response.json();
            results.set(jobId, data);

            // Check for failure
            if (data.status === "failed") {
              onAnyFailed?.(data);
            }
          }
        } catch {
          // Continue with other jobs
        }
      }),
    );

    return results;
  }, [jobIds, queueHint, onAnyFailed]);

  // Derived values
  const allComplete = Array.from(jobs.values()).every((j) =>
    TERMINAL_STATUSES.includes(j.status),
  );
  const anyFailed = Array.from(jobs.values()).some(
    (j) => j.status === "failed",
  );
  const completedCount = Array.from(jobs.values()).filter(
    (j) => j.status === "completed",
  ).length;
  const failedCount = Array.from(jobs.values()).filter(
    (j) => j.status === "failed",
  ).length;
  const totalProgress =
    jobs.size > 0
      ? Array.from(jobs.values()).reduce((sum, j) => sum + j.progress, 0) /
        jobs.size
      : 0;

  // Refetch all
  const refetchAll = useCallback(async () => {
    setIsLoading(true);
    const results = await fetchAll();
    setJobs(results);
    setIsLoading(false);
  }, [fetchAll]);

  // Polling effect
  useEffect(() => {
    if (!autoPoll || jobIds.length === 0) return;

    let intervalId: NodeJS.Timeout | null = null;

    const poll = async () => {
      const results = await fetchAll();
      setJobs(results);

      // Check for all complete
      const complete = Array.from(results.values()).every((j) =>
        TERMINAL_STATUSES.includes(j.status),
      );

      if (complete && !notifiedComplete.current) {
        notifiedComplete.current = true;
        onAllComplete?.(Array.from(results.values()));

        if (stopOnComplete && intervalId) {
          clearInterval(intervalId);
        }
      }
    };

    // Initial fetch
    poll();

    // Set up interval
    intervalId = setInterval(poll, pollInterval);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobIds, autoPoll, pollInterval, stopOnComplete, fetchAll, onAllComplete]);

  return {
    jobs,
    isLoading,
    allComplete,
    anyFailed,
    completedCount,
    failedCount,
    totalProgress,
    refetchAll,
  };
}

export default useJobStatus;
