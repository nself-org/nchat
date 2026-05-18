"use client";

/**
 * useDrafts Hook - Manage all drafts
 *
 * Provides access to all drafts, filtering, sorting, and bulk operations
 */

import { useCallback, useEffect, useMemo } from "react";
import { useDraftsStore } from "@/stores/drafts-store";
import type {
  Draft,
  DraftMetadata,
  DraftContextType,
  DraftFilterOptions,
  DraftSortOptions,
} from "@/lib/drafts/draft-types";
import { hasDraftContent } from "@/lib/drafts";

// ============================================================================
// Types
// ============================================================================

export interface UseDraftsOptions {
  /** Filter drafts by context type */
  contextType?: DraftContextType;
  /** Sort options */
  sortBy?: DraftSortOptions;
  /** Auto-initialize store */
  autoInitialize?: boolean;
}

export interface UseDraftsReturn {
  /** All drafts (with content) */
  drafts: Draft[];
  /** Draft metadata for listing */
  metadata: DraftMetadata[];
  /** Total draft count */
  count: number;
  /** Whether there are any drafts */
  hasDrafts: boolean;

  /** Channel drafts */
  channelDrafts: Draft[];
  /** Thread drafts */
  threadDrafts: Draft[];
  /** DM drafts */
  dmDrafts: Draft[];

  /** Loading state */
  isLoading: boolean;
  /** Initialization state */
  isInitialized: boolean;
  /** Error state */
  error: string | null;

  /** Filter drafts */
  filter: (options: DraftFilterOptions) => Draft[];
  /** Sort drafts */
  sort: (options: DraftSortOptions) => Draft[];
  /** Search drafts by content */
  search: (term: string) => Draft[];

  /** Delete a draft */
  deleteDraft: (contextKey: string) => Promise<boolean>;
  /** Delete multiple drafts */
  deleteMultiple: (contextKeys: string[]) => Promise<number>;
  /** Clear all drafts */
  clearAll: () => Promise<void>;

  /** Refresh drafts from storage */
  refresh: () => Promise<void>;
  /** Initialize store */
  initialize: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useDrafts({
  contextType,
  sortBy = { field: "lastModified", direction: "desc" },
  autoInitialize = true,
}: UseDraftsOptions = {}): UseDraftsReturn {
  // Store state
  const draftsMap = useDraftsStore((state) => state.drafts);
  const metadata = useDraftsStore((state) => state.draftMetadata);
  const isLoading = useDraftsStore((state) => state.isLoading);
  const isInitialized = useDraftsStore((state) => state.isInitialized);
  const error = useDraftsStore((state) => state.error);

  // Store actions
  const initialize = useDraftsStore((state) => state.initialize);
  const deleteDraftFromStore = useDraftsStore((state) => state.deleteDraft);
  const clearAllFromStore = useDraftsStore((state) => state.clearAllDrafts);
  const refreshFromStore = useDraftsStore((state) => state.refreshDrafts);
  const getFilteredDrafts = useDraftsStore((state) => state.getFilteredDrafts);
  const getSortedDrafts = useDraftsStore((state) => state.getSortedDrafts);

  // Auto-initialize
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      initialize();
    }
  }, [autoInitialize, isInitialized, initialize]);

  // Compute filtered and sorted drafts
  const drafts = useMemo(() => {
    let result = Array.from(draftsMap.values()).filter(hasDraftContent);

    // Filter by context type if specified
    if (contextType) {
      result = result.filter((d) => d.contextType === contextType);
    }

    // Sort
    return result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy.field) {
        case "lastModified":
          comparison = a.lastModified - b.lastModified;
          break;
        case "createdAt":
          comparison = a.createdAt - b.createdAt;
          break;
        case "contextName":
          comparison = a.contextKey.localeCompare(b.contextKey);
          break;
      }

      return sortBy.direction === "desc" ? -comparison : comparison;
    });
  }, [draftsMap, contextType, sortBy]);

  // Compute drafts by type
  const channelDrafts = useMemo(
    () => drafts.filter((d) => d.contextType === "channel"),
    [drafts],
  );

  const threadDrafts = useMemo(
    () => drafts.filter((d) => d.contextType === "thread"),
    [drafts],
  );

  const dmDrafts = useMemo(
    () => drafts.filter((d) => d.contextType === "dm"),
    [drafts],
  );

  // Filter function
  const filter = useCallback(
    (options: DraftFilterOptions) => {
      return getFilteredDrafts(options);
    },
    [getFilteredDrafts],
  );

  // Sort function
  const sort = useCallback(
    (options: DraftSortOptions) => {
      return getSortedDrafts(options);
    },
    [getSortedDrafts],
  );

  // Search function
  const search = useCallback(
    (term: string) => {
      if (!term.trim()) return drafts;

      const lowerTerm = term.toLowerCase();
      return drafts.filter((d) => d.content.toLowerCase().includes(lowerTerm));
    },
    [drafts],
  );

  // Delete draft
  const deleteDraft = useCallback(
    async (contextKey: string) => {
      return await deleteDraftFromStore(contextKey);
    },
    [deleteDraftFromStore],
  );

  // Delete multiple drafts
  const deleteMultiple = useCallback(
    async (contextKeys: string[]) => {
      let deletedCount = 0;

      for (const key of contextKeys) {
        const success = await deleteDraftFromStore(key);
        if (success) deletedCount++;
      }

      return deletedCount;
    },
    [deleteDraftFromStore],
  );

  // Clear all
  const clearAll = useCallback(async () => {
    await clearAllFromStore();
  }, [clearAllFromStore]);

  // Refresh
  const refresh = useCallback(async () => {
    await refreshFromStore();
  }, [refreshFromStore]);

  return {
    drafts,
    metadata,
    count: drafts.length,
    hasDrafts: drafts.length > 0,
    channelDrafts,
    threadDrafts,
    dmDrafts,
    isLoading,
    isInitialized,
    error,
    filter,
    sort,
    search,
    deleteDraft,
    deleteMultiple,
    clearAll,
    refresh,
    initialize,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for channel drafts only
 */
export function useChannelDrafts(
  options?: Omit<UseDraftsOptions, "contextType">,
) {
  return useDrafts({ ...options, contextType: "channel" });
}

/**
 * Hook for thread drafts only
 */
export function useThreadDrafts(
  options?: Omit<UseDraftsOptions, "contextType">,
) {
  return useDrafts({ ...options, contextType: "thread" });
}

/**
 * Hook for DM drafts only
 */
export function useDMDrafts(options?: Omit<UseDraftsOptions, "contextType">) {
  return useDrafts({ ...options, contextType: "dm" });
}

/**
 * Hook for draft count only
 */
export function useDraftCount(): number {
  const count = useDraftsStore((state) => state.getDraftCount());
  return count;
}

/**
 * Hook for checking if a context has a draft
 */
export function useHasDraft(contextKey: string): boolean {
  const hasDraft = useDraftsStore((state) => state.hasDraft(contextKey));
  return hasDraft;
}

/**
 * Hook for checking if any drafts exist
 */
export function useHasAnyDrafts(): boolean {
  const hasDrafts = useDraftsStore((state) => state.getDraftCount() > 0);
  return hasDrafts;
}
