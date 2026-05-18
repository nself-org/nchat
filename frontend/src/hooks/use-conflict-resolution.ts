/**
 * useConflictResolution Hook
 *
 * React hook for conflict resolution functionality.
 * Provides conflict detection, resolution, and history access.
 *
 * @module hooks/use-conflict-resolution
 * @version 1.0.0
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getConflictResolutionService,
  type ConflictEntity,
  type ConflictDetectionResult,
  type ConflictResolutionResult,
  type ConflictHistoryEntry,
  type ConflictType,
  type ResolutionStrategy,
} from "@/services/realtime/conflict-resolution.service";

// ============================================================================
// Types
// ============================================================================

export interface UseConflictResolutionOptions {
  /** Auto-initialize service */
  autoInitialize?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UseConflictResolutionReturn {
  /** Detect a conflict */
  detectConflict: (entity: ConflictEntity) => ConflictDetectionResult;
  /** Resolve a conflict */
  resolveConflict: (
    detection: ConflictDetectionResult,
    strategy?: ResolutionStrategy,
    userChoice?: unknown,
  ) => ConflictResolutionResult;
  /** Auto-resolve if possible */
  autoResolve: (
    detection: ConflictDetectionResult,
  ) => ConflictResolutionResult | null;
  /** Get conflict history */
  history: ConflictHistoryEntry[];
  /** Get filtered history */
  getHistory: (filter?: {
    type?: ConflictType;
    limit?: number;
  }) => ConflictHistoryEntry[];
  /** Clear history */
  clearHistory: () => void;
  /** Get statistics */
  stats: {
    totalConflicts: number;
    resolvedConflicts: number;
    pendingConflicts: number;
    byType: Record<ConflictType, number>;
    byStrategy: Record<ResolutionStrategy, number>;
  };
  /** Current pending conflicts */
  pendingConflicts: ConflictDetectionResult[];
  /** Service initialized */
  initialized: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useConflictResolution - React hook for conflict resolution
 */
export function useConflictResolution(
  options: UseConflictResolutionOptions = {},
): UseConflictResolutionReturn {
  const { autoInitialize = true, debug = false } = options;

  const [initialized, setInitialized] = useState(false);
  const [history, setHistory] = useState<ConflictHistoryEntry[]>([]);
  const [pendingConflicts, setPendingConflicts] = useState<
    ConflictDetectionResult[]
  >([]);
  const [stats, setStats] = useState({
    totalConflicts: 0,
    resolvedConflicts: 0,
    pendingConflicts: 0,
    byType: {} as Record<ConflictType, number>,
    byStrategy: {} as Record<ResolutionStrategy, number>,
  });

  /**
   * Initialize service
   */
  useEffect(() => {
    if (!autoInitialize) {
      return;
    }

    const service = getConflictResolutionService({ debug });

    if (!service.initialized) {
      service.initialize();
    }

    setInitialized(service.initialized);

    // Load initial state
    setHistory(service.getHistory());
    setStats(service.getStats());

    // Subscribe to events
    const unsubscribe = service.subscribe((event, data) => {
      if (event === "conflict:detected") {
        if (data?.detection) {
          setPendingConflicts((prev) => [...prev, data.detection!]);
        }
      } else if (event === "conflict:resolved") {
        if (data?.resolution) {
          // Remove from pending if it was manual and now resolved
          setPendingConflicts((prev) =>
            prev.filter((c) => c.entity.id !== data.resolution!.id),
          );
        }
      } else if (event === "conflict:history-updated") {
        setHistory(service.getHistory());
        setStats(service.getStats());
      }
    });

    return () => {
      unsubscribe();
    };
  }, [autoInitialize, debug]);

  /**
   * Detect conflict
   */
  const detectConflict = useCallback(
    (entity: ConflictEntity): ConflictDetectionResult => {
      const service = getConflictResolutionService();
      return service.detectConflict(entity);
    },
    [],
  );

  /**
   * Resolve conflict
   */
  const resolveConflict = useCallback(
    (
      detection: ConflictDetectionResult,
      strategy?: ResolutionStrategy,
      userChoice?: unknown,
    ): ConflictResolutionResult => {
      const service = getConflictResolutionService();
      return service.resolveConflict(detection, strategy, userChoice);
    },
    [],
  );

  /**
   * Auto-resolve conflict
   */
  const autoResolve = useCallback(
    (detection: ConflictDetectionResult): ConflictResolutionResult | null => {
      const service = getConflictResolutionService();
      return service.autoResolve(detection);
    },
    [],
  );

  /**
   * Get history
   */
  const getHistory = useCallback(
    (filter?: {
      type?: ConflictType;
      limit?: number;
    }): ConflictHistoryEntry[] => {
      const service = getConflictResolutionService();
      return service.getHistory(filter);
    },
    [],
  );

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    const service = getConflictResolutionService();
    service.clearHistory();
    setHistory([]);
    setStats(service.getStats());
  }, []);

  return {
    detectConflict,
    resolveConflict,
    autoResolve,
    history,
    getHistory,
    clearHistory,
    stats,
    pendingConflicts,
    initialized,
  };
}

export default useConflictResolution;
