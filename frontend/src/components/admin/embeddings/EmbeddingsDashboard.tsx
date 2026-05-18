/**
 * Embeddings Dashboard - Admin UI for embedding management
 *
 * Features:
 * - Coverage statistics
 * - Index health metrics
 * - Job management
 * - Performance monitoring
 * - Bulk operations
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";
import {
  Database,
  Play,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  DollarSign,
} from "lucide-react";

// ========================================
// Types
// ========================================

interface EmbeddingStats {
  coverage: {
    totalMessages: number;
    messagesWithEmbeddings: number;
    coveragePercentage: number;
    pendingEmbeddings: number;
    failedEmbeddings: number;
    oldestUnembeddedMessage?: string;
  };
  indexHealth: {
    indexName: string;
    indexSize: string;
    totalVectors: number;
    indexEfficiency: number;
  };
  performance: {
    totalEmbeddings: number;
    totalTokens: number;
    totalCost: string;
    avgCostPerEmbedding: string;
    cacheHitRate: string;
    errorRate: string;
  };
  queue: {
    pending: number;
    processing: number;
    failed: number;
  };
  cache: {
    totalEntries: number;
    totalUsage: number;
    recentlyUsed: number;
    avgUsagePerEntry: number;
  };
  dailyStats: Array<{
    date: string;
    total_embeddings: number;
    estimated_cost: number;
  }>;
}

interface Job {
  id: string;
  job_type: string;
  status: string;
  total_messages: number;
  processed_messages: number;
  successful_embeddings: number;
  failed_embeddings: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  percentage?: number;
  estimatedTimeRemaining?: number;
}

// ========================================
// Component
// ========================================

export function EmbeddingsDashboard() {
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats on mount and every 30 seconds
  useEffect(() => {
    fetchStats();
    fetchJobs();

    const interval = setInterval(() => {
      fetchStats();
      fetchJobs();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Poll active job every 5 seconds
  useEffect(() => {
    if (!activeJob || activeJob.status !== "running") {
      return;
    }

    const interval = setInterval(() => {
      fetchJobStatus(activeJob.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeJob]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/embeddings/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/admin/embeddings/status?limit=5");
      if (!response.ok) throw new Error("Failed to fetch jobs");
      const data = await response.json();
      setJobs(data.jobs);

      // Update active job if running
      const running = data.jobs.find((j: Job) => j.status === "running");
      if (running) {
        setActiveJob(running);
      } else if (activeJob?.status === "running") {
        setActiveJob(null);
      }
    } catch (err) {
      logger.error("Failed to fetch jobs:", err);
    }
  };

  const fetchJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(
        `/api/admin/embeddings/status?jobId=${jobId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch job status");
      const data = await response.json();
      setActiveJob(data.job);

      // Update in jobs list
      setJobs((prev) => prev.map((j) => (j.id === jobId ? data.job : j)));
    } catch (err) {
      logger.error("Failed to fetch job status:", err);
    }
  };

  const startEmbeddingGeneration = async (type: "initial" | "repair") => {
    try {
      const response = await fetch("/api/admin/embeddings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) throw new Error("Failed to start generation");

      const data = await response.json();
      await fetchJobStatus(data.jobId);
      await fetchJobs();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start generation",
      );
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const response = await fetch("/api/admin/embeddings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) throw new Error("Failed to cancel job");

      await fetchJobs();
      if (activeJob?.id === jobId) {
        setActiveJob(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel job");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading embeddings data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Vector Search Embeddings
          </h1>
          <p className="text-muted-foreground">
            Manage semantic search embeddings and monitor performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => startEmbeddingGeneration("initial")}
            disabled={!!activeJob}
          >
            <Play className="mr-2 h-4 w-4" />
            Generate All
          </Button>
          <Button
            variant="outline"
            onClick={() => startEmbeddingGeneration("repair")}
            disabled={!!activeJob}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Failed
          </Button>
        </div>
      </div>

      {/* Active Job */}
      {activeJob && activeJob.status === "running" && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 animate-pulse text-primary" />
                Active Job: {activeJob.job_type}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelJob(activeJob.id)}
              >
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>
                  {activeJob.processed_messages} / {activeJob.total_messages}{" "}
                  messages
                </span>
                <span>{activeJob.percentage}%</span>
              </div>
              <Progress value={activeJob.percentage || 0} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Successful</p>
                <p className="text-lg font-semibold text-green-600">
                  {activeJob.successful_embeddings}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Failed</p>
                <p className="text-lg font-semibold text-red-600">
                  {activeJob.failed_embeddings}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Time Remaining</p>
                <p className="text-lg font-semibold">
                  {activeJob.estimatedTimeRemaining
                    ? formatDuration(activeJob.estimatedTimeRemaining)
                    : "Calculating..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.coverage.coveragePercentage}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.coverage.messagesWithEmbeddings.toLocaleString()} of{" "}
              {stats.coverage.totalMessages.toLocaleString()} messages
            </p>
            <Progress
              value={stats.coverage.coveragePercentage}
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cache Hit Rate
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.performance.cacheHitRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.cache.totalEntries.toLocaleString()} cached embeddings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.performance.totalCost}
            </div>
            <p className="text-xs text-muted-foreground">
              ${stats.performance.avgCostPerEmbedding} avg per embedding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.queue.pending}</div>
            <p className="text-xs text-muted-foreground">
              {stats.queue.processing} processing, {stats.queue.failed} failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Index Health and Recent Jobs */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Index Health */}
        <Card>
          <CardHeader>
            <CardTitle>Index Health</CardTitle>
            <CardDescription>Vector index performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Index Size</p>
                <p className="text-2xl font-bold">
                  {stats.indexHealth.indexSize}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Vectors</p>
                <p className="text-2xl font-bold">
                  {stats.indexHealth.totalVectors.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Efficiency</p>
                <p className="text-2xl font-bold">
                  {stats.indexHealth.indexEfficiency}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Index Name</p>
                <p className="font-mono text-sm">
                  {stats.indexHealth.indexName}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>Latest embedding generation jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jobs.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No jobs found
                </p>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getJobStatusVariant(job.status)}>
                          {job.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {job.job_type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {job.processed_messages} / {job.total_messages} messages
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {formatRelativeTime(job.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ========================================
// Helper Functions
// ========================================

function getJobStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "running":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMins > 0) {
    return `${diffMins}m ago`;
  } else {
    return "Just now";
  }
}
