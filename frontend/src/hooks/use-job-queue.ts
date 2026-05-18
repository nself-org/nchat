"use client";

/**
 * useJobQueue Hook
 *
 * Hook for interacting with the jobs queue from client components.
 * Provides methods to create, list, and manage background jobs.
 *
 * @module hooks/use-job-queue
 * @version 1.0.0
 */

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import type {
  NchatJobType,
  QueueName,
  JobPayload,
  CreateJobOptions,
  JobStatus,
} from "@/services/jobs/types";

// ============================================================================
// Types
// ============================================================================

/**
 * Job listing entry
 */
export interface JobListEntry {
  id: string;
  queue: string;
  type: string;
  status: JobStatus;
  payload: unknown;
  progress: number;
  attempts: number;
  createdAt: string;
  processedAt: string | null;
  finishedAt: string | null;
  delay?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Job list filters
 */
export interface JobListFilters {
  queue?: QueueName;
  status?: JobStatus | JobStatus[];
  type?: NchatJobType;
  limit?: number;
  offset?: number;
}

/**
 * Create job result
 */
export interface CreateJobResult {
  jobId: string;
  queue: string;
  type: string;
}

/**
 * Hook return value
 */
export interface UseJobQueueReturn {
  /** List of jobs */
  jobs: JobListEntry[];
  /** Total count of matching jobs */
  total: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Create a new job */
  createJob: <T extends JobPayload>(
    type: NchatJobType,
    payload: T,
    options?: CreateJobOptions,
  ) => Promise<CreateJobResult | null>;
  /** List jobs with optional filters */
  listJobs: (filters?: JobListFilters) => Promise<void>;
  /** Refresh job list */
  refresh: () => Promise<void>;
  /** Retry a failed job */
  retryJob: (jobId: string) => Promise<boolean>;
  /** Cancel a pending job */
  cancelJob: (jobId: string) => Promise<boolean>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for queue operations
 *
 * @example
 * ```tsx
 * function JobManager() {
 *   const {
 *     jobs,
 *     isLoading,
 *     createJob,
 *     listJobs,
 *     retryJob,
 *     cancelJob,
 *   } = useJobQueue()
 *
 *   // Create a job
 *   const handleScheduleMessage = async () => {
 *     const result = await createJob('scheduled-message', {
 *       scheduledMessageId: 'msg123',
 *       channelId: 'chan456',
 *       userId: 'user789',
 *       content: 'Hello!',
 *     }, {
 *       delay: 60000, // 1 minute
 *       priority: 'high',
 *     })
 *
 *     if (result) {
 *       /* console.log 'Job created:', result.jobId)
 *     }
 *   }
 *
 *   // List jobs
 *   useEffect(() => {
 *     listJobs({ status: 'waiting', limit: 20 })
 *   }, [listJobs])
 *
 *   return (
 *     <ul>
 *       {jobs.map(job => (
 *         <li key={job.id}>
 *           {job.type} - {job.status}
 *           {job.status === 'failed' && (
 *             <button onClick={() => retryJob(job.id)}>Retry</button>
 *           )}
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useJobQueue(): UseJobQueueReturn {
  const { toast } = useToast();

  // State
  const [jobs, setJobs] = useState<JobListEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFilters, setLastFilters] = useState<JobListFilters>({});

  // Create a job
  const createJob = useCallback(
    async <T extends JobPayload>(
      type: NchatJobType,
      payload: T,
      options?: CreateJobOptions,
    ): Promise<CreateJobResult | null> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            payload,
            ...options,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create job");
        }

        const data = await response.json();

        logger.info("Job created", { jobId: data.jobId, type });

        toast({
          title: "Job created",
          description: `Job ${data.jobId} has been queued`,
        });

        return {
          jobId: data.jobId,
          queue: data.queue,
          type: data.type,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create job";
        setError(message);

        logger.error(
          "Failed to create job",
          err instanceof Error ? err : new Error(message),
        );

        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  // List jobs
  const listJobs = useCallback(
    async (filters?: JobListFilters): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        setLastFilters(filters || {});

        const params = new URLSearchParams();

        if (filters?.queue) {
          params.set("queue", filters.queue);
        }

        if (filters?.status) {
          const statuses = Array.isArray(filters.status)
            ? filters.status.join(",")
            : filters.status;
          params.set("status", statuses);
        }

        if (filters?.type) {
          params.set("type", filters.type);
        }

        if (filters?.limit) {
          params.set("limit", filters.limit.toString());
        }

        if (filters?.offset) {
          params.set("offset", filters.offset.toString());
        }

        const jobsUrl = `/api/jobs?${params.toString()}`;
        const response = await fetch(jobsUrl);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch jobs");
        }

        const data = await response.json();

        setJobs(data.jobs);
        setTotal(data.total);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch jobs";
        setError(message);

        logger.error(
          "Failed to fetch jobs",
          err instanceof Error ? err : new Error(message),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Refresh with last filters
  const refresh = useCallback(async (): Promise<void> => {
    await listJobs(lastFilters);
  }, [listJobs, lastFilters]);

  // Retry a job
  const retryJob = useCallback(
    async (jobId: string): Promise<boolean> => {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/jobs/${jobId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to retry job");
        }

        logger.info("Job retried", { jobId });

        toast({
          title: "Job retried",
          description: `Job ${jobId} has been queued for retry`,
        });

        // Refresh list
        await refresh();

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to retry job";
        setError(message);

        logger.error(
          "Failed to retry job",
          err instanceof Error ? err : new Error(message),
        );

        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [toast, refresh],
  );

  // Cancel a job
  const cancelJob = useCallback(
    async (jobId: string): Promise<boolean> => {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/jobs/${jobId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to cancel job");
        }

        logger.info("Job cancelled", { jobId });

        toast({
          title: "Job cancelled",
          description: `Job ${jobId} has been cancelled`,
        });

        // Refresh list
        await refresh();

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to cancel job";
        setError(message);

        logger.error(
          "Failed to cancel job",
          err instanceof Error ? err : new Error(message),
        );

        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [toast, refresh],
  );

  return {
    jobs,
    total,
    isLoading,
    error,
    createJob,
    listJobs,
    refresh,
    retryJob,
    cancelJob,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for scheduling messages via the job queue
 */
export function useScheduleMessageJob() {
  const { createJob } = useJobQueue();

  const scheduleMessage = useCallback(
    async (
      channelId: string,
      userId: string,
      content: string,
      scheduledAt: Date,
      options?: {
        threadId?: string;
        replyToId?: string;
        attachments?: Array<{
          id: string;
          name: string;
          type: string;
          url: string;
        }>;
        mentions?: string[];
      },
    ): Promise<{ jobId: string; scheduledMessageId: string } | null> => {
      const scheduledMessageId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const delay = scheduledAt.getTime() - Date.now();

      if (delay < 0) {
        logger.warn("Cannot schedule message in the past");
        return null;
      }

      const result = await createJob(
        "scheduled-message",
        {
          scheduledMessageId,
          channelId,
          userId,
          content,
          threadId: options?.threadId,
          replyToId: options?.replyToId,
          attachments: options?.attachments,
          mentions: options?.mentions,
        },
        {
          delay,
          queue: "scheduled",
          priority: "normal",
          tags: ["scheduled-message", `channel:${channelId}`, `user:${userId}`],
          metadata: {
            scheduledAt: scheduledAt.toISOString(),
            channelId,
            userId,
          },
        },
      );

      if (result) {
        return {
          jobId: result.jobId,
          scheduledMessageId,
        };
      }

      return null;
    },
    [createJob],
  );

  return { scheduleMessage };
}

/**
 * Hook for queuing notifications via the job queue
 */
export function useNotificationJob() {
  const { createJob } = useJobQueue();

  const sendNotification = useCallback(
    async (
      userIds: string[],
      title: string,
      body: string,
      options?: {
        type?: "push" | "email" | "in-app" | "sms";
        url?: string;
        iconUrl?: string;
        data?: Record<string, unknown>;
        priority?: "critical" | "high" | "normal" | "low";
      },
    ): Promise<string | null> => {
      const result = await createJob(
        "send-notification",
        {
          notificationType: options?.type || "push",
          userIds,
          title,
          body,
          url: options?.url,
          iconUrl: options?.iconUrl,
          data: options?.data,
        },
        {
          queue: "high-priority",
          priority: options?.priority || "normal",
          tags: ["notification", options?.type || "push"],
        },
      );

      return result?.jobId || null;
    },
    [createJob],
  );

  return { sendNotification };
}

/**
 * Hook for queuing search indexing via the job queue
 */
export function useSearchIndexJob() {
  const { createJob } = useJobQueue();

  const indexContent = useCallback(
    async (
      operation: "index" | "update" | "delete" | "reindex",
      entityType: "message" | "channel" | "user" | "file",
      entityIds: string[],
      options?: {
        channelId?: string;
        fullReindex?: boolean;
      },
    ): Promise<string | null> => {
      const result = await createJob(
        "index-search",
        {
          operation,
          entityType,
          entityIds,
          channelId: options?.channelId,
          fullReindex: options?.fullReindex,
        },
        {
          queue: "low-priority",
          priority: "low",
          tags: ["search-index", entityType, operation],
        },
      );

      return result?.jobId || null;
    },
    [createJob],
  );

  return { indexContent };
}

export default useJobQueue;
