/**
 * Analytics Plugin Hooks
 * React hooks for using Analytics plugin functionality
 */

import useSWR from "swr";
import { useState, useCallback } from "react";
import {
  analyticsService,
  type AnalyticsDashboard,
  type UserAnalytics,
  type ChannelAnalytics,
  type MessageAnalytics,
  type AnalyticsEvent,
  type AnalyticsInsight,
  type AnalyticsReport,
  type CreateReportRequest,
  type ExportOptions,
  type HealthCheck,
} from "@/services/plugins/analytics.service";

interface UseAnalyticsDashboardOptions {
  period?: string;
  refreshInterval?: number;
}

export function useAnalyticsDashboard(
  options: UseAnalyticsDashboardOptions = {},
) {
  const { period = "30d", refreshInterval = 30000 } = options;

  const { data, error, isLoading, mutate } = useSWR<AnalyticsDashboard>(
    `/analytics/dashboard/${period}`,
    () => analyticsService.getDashboard(period),
    { refreshInterval },
  );

  return {
    dashboard: data,
    isLoading,
    error,
    refresh: mutate,
  };
}

interface UseUserAnalyticsOptions {
  period?: string;
  limit?: number;
  refreshInterval?: number;
}

export function useUserAnalytics(options: UseUserAnalyticsOptions = {}) {
  const { period = "7d", limit = 100, refreshInterval = 60000 } = options;

  const { data, error, isLoading, mutate } = useSWR<UserAnalytics[]>(
    `/analytics/users/${period}/${limit}`,
    () => analyticsService.getUserAnalytics(period, limit),
    { refreshInterval },
  );

  return {
    users: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

interface UseChannelAnalyticsOptions {
  limit?: number;
  refreshInterval?: number;
}

export function useChannelAnalytics(options: UseChannelAnalyticsOptions = {}) {
  const { limit = 20, refreshInterval = 60000 } = options;

  const { data, error, isLoading, mutate } = useSWR<ChannelAnalytics[]>(
    `/analytics/channels/${limit}`,
    () => analyticsService.getChannelAnalytics(limit),
    { refreshInterval },
  );

  return {
    channels: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useAnalyticsTracking() {
  const [isTracking, setIsTracking] = useState(false);

  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    setIsTracking(true);
    try {
      const result = await analyticsService.trackEvent(event);
      return result;
    } catch (error) {
      console.error("Failed to track event:", error);
      throw error;
    } finally {
      setIsTracking(false);
    }
  }, []);

  const trackEvents = useCallback(async (events: AnalyticsEvent[]) => {
    setIsTracking(true);
    try {
      const result = await analyticsService.trackEvents(events);
      return result;
    } catch (error) {
      console.error("Failed to track events:", error);
      throw error;
    } finally {
      setIsTracking(false);
    }
  }, []);

  return {
    trackEvent,
    trackEvents,
    isTracking,
  };
}

export function useAnalyticsHealth() {
  const { data, error, isLoading, mutate } = useSWR<HealthCheck>(
    "/analytics/health",
    () => analyticsService.checkHealth(),
    { refreshInterval: 30000 },
  );

  return {
    health: data,
    isHealthy: data?.status === "healthy",
    isLoading,
    error,
    checkHealth: mutate,
  };
}

// Message Analytics Hook
interface UseMessageAnalyticsOptions {
  period?: string;
  groupBy?: string;
  channelId?: string;
  refreshInterval?: number;
}

export function useMessageAnalytics(options: UseMessageAnalyticsOptions = {}) {
  const {
    period = "30d",
    groupBy = "day",
    channelId,
    refreshInterval = 60000,
  } = options;

  const { data, error, isLoading, mutate } = useSWR<MessageAnalytics>(
    `/analytics/messages/${period}/${groupBy}/${channelId || "all"}`,
    () => analyticsService.getMessageAnalytics(period, groupBy, channelId),
    { refreshInterval },
  );

  return {
    messages: data,
    isLoading,
    error,
    refresh: mutate,
  };
}

// AI Insights Hook
interface UseAnalyticsInsightsOptions {
  period?: string;
  type?: "trend" | "anomaly" | "recommendation" | "milestone";
  limit?: number;
  refreshInterval?: number;
}

export function useAnalyticsInsights(
  options: UseAnalyticsInsightsOptions = {},
) {
  const { period = "30d", type, limit = 10, refreshInterval = 60000 } = options;

  const { data, error, isLoading, mutate } = useSWR<AnalyticsInsight[]>(
    `/analytics/insights/${period}/${type || "all"}/${limit}`,
    () => analyticsService.getInsights(period, type, limit),
    { refreshInterval },
  );

  return {
    insights: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// Reports Management Hook
export function useAnalyticsReports() {
  const { data, error, isLoading, mutate } = useSWR<AnalyticsReport[]>(
    "/analytics/reports",
    () => analyticsService.getReports(),
    { refreshInterval: 30000 },
  );

  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [operationError, setOperationError] = useState<Error | null>(null);

  const createReport = useCallback(
    async (request: CreateReportRequest): Promise<AnalyticsReport | null> => {
      setIsCreating(true);
      setOperationError(null);

      try {
        const report = await analyticsService.createReport(request);
        mutate(); // Refresh the list
        return report;
      } catch (err) {
        setOperationError(
          err instanceof Error ? err : new Error("Failed to create report"),
        );
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [mutate],
  );

  const deleteReport = useCallback(
    async (reportId: string): Promise<boolean> => {
      setIsDeleting(true);
      setOperationError(null);

      try {
        await analyticsService.deleteReport(reportId);
        mutate(); // Refresh the list
        return true;
      } catch (err) {
        setOperationError(
          err instanceof Error ? err : new Error("Failed to delete report"),
        );
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [mutate],
  );

  return {
    reports: data || [],
    isLoading,
    error,
    refresh: mutate,
    createReport,
    deleteReport,
    isCreating,
    isDeleting,
    operationError,
  };
}

// Data Export Hook
export function useAnalyticsExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportData = useCallback(
    async (options: ExportOptions): Promise<Blob | object | null> => {
      setIsExporting(true);
      setError(null);

      try {
        const data = await analyticsService.exportData(options);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Export failed"));
        return null;
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  const downloadExport = useCallback(
    async (options: ExportOptions): Promise<boolean> => {
      setIsExporting(true);
      setError(null);

      try {
        await analyticsService.downloadExport(options);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Download failed"));
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  return {
    exportData,
    downloadExport,
    isExporting,
    error,
  };
}
