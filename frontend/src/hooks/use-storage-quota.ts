/**
 * React Hook for Storage Quota Management
 *
 * Provides real-time storage quota tracking and validation for uploads.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import type {
  StorageQuota,
  StorageUsageBreakdown,
  QuotaWarning,
} from "@/lib/storage/quota-manager";

import { logger } from "@/lib/logger";

interface UseStorageQuotaOptions {
  entityId?: string;
  entityType?: "user" | "channel" | "team";
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseStorageQuotaReturn {
  quota: StorageQuota | null;
  breakdown: StorageUsageBreakdown | null;
  warnings: QuotaWarning[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  canUpload: (
    fileSize: number,
  ) => Promise<{ allowed: boolean; reason?: string }>;
  acknowledgeWarning: (warningId: string) => Promise<void>;
}

/**
 * Hook to manage storage quota and usage
 */
export function useStorageQuota(
  options: UseStorageQuotaOptions = {},
): UseStorageQuotaReturn {
  const { user } = useAuth();
  const {
    entityId: providedEntityId,
    entityType = "user",
    autoRefresh = false,
    refreshInterval = 60000, // 1 minute
  } = options;

  const entityId = providedEntityId || user?.id || "";

  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [breakdown, setBreakdown] = useState<StorageUsageBreakdown | null>(
    null,
  );
  const [warnings, setWarnings] = useState<QuotaWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!entityId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch quota
      const quotaRes = await fetch(
        `/api/storage?action=quota&entityId=${entityId}&entityType=${entityType}`,
      );
      if (!quotaRes.ok) throw new Error("Failed to fetch quota");
      const quotaData = await quotaRes.json();
      setQuota(quotaData);

      // Fetch breakdown
      const breakdownRes = await fetch(
        `/api/storage?action=breakdown&entityId=${entityId}&entityType=${entityType}`,
      );
      if (!breakdownRes.ok) throw new Error("Failed to fetch breakdown");
      const breakdownData = await breakdownRes.json();
      setBreakdown(breakdownData);

      // Fetch warnings
      const warningsRes = await fetch(
        `/api/storage?action=warnings&entityId=${entityId}&entityType=${entityType}`,
      );
      if (!warningsRes.ok) throw new Error("Failed to fetch warnings");
      const warningsData = await warningsRes.json();
      setWarnings(warningsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  const canUpload = useCallback(
    async (
      fileSize: number,
    ): Promise<{ allowed: boolean; reason?: string }> => {
      if (!entityId) {
        return { allowed: false, reason: "No entity ID" };
      }

      try {
        const res = await fetch(
          `/api/storage?action=check-upload&entityId=${entityId}&entityType=${entityType}&fileSize=${fileSize}`,
        );
        if (!res.ok) throw new Error("Failed to check upload");
        return await res.json();
      } catch (err) {
        return {
          allowed: false,
          reason: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [entityId, entityType],
  );

  const acknowledgeWarning = useCallback(
    async (warningId: string) => {
      try {
        const res = await fetch("/api/storage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "acknowledge-warning",
            warningId,
          }),
        });
        if (!res.ok) throw new Error("Failed to acknowledge warning");
        await refresh();
      } catch (err) {
        logger.error("Failed to acknowledge warning:", err);
      }
    },
    [refresh],
  );

  // Initial load
  useEffect(() => {
    if (entityId) {
      refresh();
    }
  }, [entityId, refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !entityId) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, entityId, refresh]);

  return {
    quota,
    breakdown,
    warnings,
    loading,
    error,
    refresh,
    canUpload,
    acknowledgeWarning,
  };
}

/**
 * Hook for simple quota check (lightweight)
 */
export function useQuotaCheck(
  entityType: "user" | "channel" | "team" = "user",
) {
  const { user } = useAuth();
  const entityId = user?.id || "";

  const checkUpload = useCallback(
    async (
      fileSize: number,
    ): Promise<{ allowed: boolean; reason?: string }> => {
      if (!entityId) {
        return { allowed: false, reason: "Not authenticated" };
      }

      try {
        const res = await fetch(
          `/api/storage?action=check-upload&entityId=${entityId}&entityType=${entityType}&fileSize=${fileSize}`,
        );
        if (!res.ok) throw new Error("Failed to check quota");
        return await res.json();
      } catch (err) {
        return {
          allowed: false,
          reason: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [entityId, entityType],
  );

  const recordUpload = useCallback(
    async (fileSize: number): Promise<void> => {
      if (!entityId) return;

      try {
        await fetch("/api/storage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "record-upload",
            entityId,
            entityType,
            fileSize,
          }),
        });
      } catch (err) {
        logger.error("Failed to record upload:", err);
      }
    },
    [entityId, entityType],
  );

  const recordDeletion = useCallback(
    async (fileSize: number): Promise<void> => {
      if (!entityId) return;

      try {
        await fetch("/api/storage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "record-deletion",
            entityId,
            entityType,
            fileSize,
          }),
        });
      } catch (err) {
        logger.error("Failed to record deletion:", err);
      }
    },
    [entityId, entityType],
  );

  return {
    checkUpload,
    recordUpload,
    recordDeletion,
  };
}
