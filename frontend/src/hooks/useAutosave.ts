"use client";

/**
 * useAutosave Hook - Auto-save functionality with status tracking
 *
 * Provides debounced auto-save with visual feedback
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useDraftsStore, selectAutoSaveState } from "@/stores/drafts-store";
import type { AutoSaveStatus } from "@/lib/drafts/draft-types";
import { formatLastSaveTime, getAutoSaveStatusText } from "@/lib/drafts";

// ============================================================================
// Types
// ============================================================================

export interface UseAutosaveOptions {
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
  /** Minimum content length to trigger save (default: 1) */
  minContentLength?: number;
  /** Callback when save starts */
  onSaveStart?: () => void;
  /** Callback when save completes */
  onSaveComplete?: () => void;
  /** Callback when save fails */
  onSaveError?: (error: string) => void;
  /** Enable/disable auto-save (default: true) */
  enabled?: boolean;
}

export interface UseAutosaveReturn {
  /** Current auto-save status */
  status: AutoSaveStatus;
  /** Whether currently saving */
  isSaving: boolean;
  /** Whether there was an error */
  hasError: boolean;
  /** Error message if any */
  error: string | null;
  /** Last save timestamp */
  lastSaveTime: number | null;
  /** Formatted last save time */
  lastSaveTimeFormatted: string;
  /** Human-readable status text */
  statusText: string;
  /** Whether auto-save is enabled */
  isEnabled: boolean;
  /** Whether there are pending changes */
  hasPendingChanges: boolean;

  /** Schedule a save (debounced) */
  scheduleSave: (content: string) => void;
  /** Save immediately (bypass debounce) */
  saveNow: () => Promise<void>;
  /** Cancel pending save */
  cancelSave: () => void;
  /** Enable auto-save */
  enable: () => void;
  /** Disable auto-save */
  disable: () => void;
  /** Toggle auto-save */
  toggle: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useAutosave({
  debounceMs = 500,
  minContentLength = 1,
  onSaveStart,
  onSaveComplete,
  onSaveError,
  enabled = true,
}: UseAutosaveOptions = {}): UseAutosaveReturn {
  // Local state for pending changes
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [localEnabled, setLocalEnabled] = useState(enabled);

  // Refs for debouncing
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<string>("");
  const saveCallbackRef = useRef<((content: string) => Promise<void>) | null>(
    null,
  );

  // Store state
  const autoSaveState = useDraftsStore(selectAutoSaveState);
  const setAutoSaveEnabled = useDraftsStore(
    (state) => state.setAutoSaveEnabled,
  );
  const setAutoSaveDebounce = useDraftsStore(
    (state) => state.setAutoSaveDebounce,
  );

  // Sync with store
  useEffect(() => {
    setAutoSaveEnabled(localEnabled);
  }, [localEnabled, setAutoSaveEnabled]);

  useEffect(() => {
    setAutoSaveDebounce(debounceMs);
  }, [debounceMs, setAutoSaveDebounce]);

  // Track status changes for callbacks
  useEffect(() => {
    if (autoSaveState.status === "saving") {
      onSaveStart?.();
    } else if (autoSaveState.status === "saved") {
      onSaveComplete?.();
      setHasPendingChanges(false);
    } else if (autoSaveState.status === "error" && autoSaveState.error) {
      onSaveError?.(autoSaveState.error);
    }
  }, [
    autoSaveState.status,
    autoSaveState.error,
    onSaveStart,
    onSaveComplete,
    onSaveError,
  ]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Set save callback
  const setSaveCallback = useCallback(
    (callback: (content: string) => Promise<void>) => {
      saveCallbackRef.current = callback;
    },
    [],
  );

  // Schedule save with debounce
  const scheduleSave = useCallback(
    (content: string) => {
      if (!localEnabled) return;
      if (content.length < minContentLength) return;

      pendingContentRef.current = content;
      setHasPendingChanges(true);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Schedule new save
      debounceTimerRef.current = setTimeout(async () => {
        if (saveCallbackRef.current) {
          await saveCallbackRef.current(pendingContentRef.current);
        }
        setHasPendingChanges(false);
      }, debounceMs);
    },
    [localEnabled, minContentLength, debounceMs],
  );

  // Save immediately
  const saveNow = useCallback(async () => {
    // Cancel any pending debounced save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (saveCallbackRef.current && pendingContentRef.current) {
      await saveCallbackRef.current(pendingContentRef.current);
    }

    setHasPendingChanges(false);
  }, []);

  // Cancel pending save
  const cancelSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setHasPendingChanges(false);
  }, []);

  // Enable auto-save
  const enable = useCallback(() => {
    setLocalEnabled(true);
  }, []);

  // Disable auto-save
  const disable = useCallback(() => {
    setLocalEnabled(false);
    cancelSave();
  }, [cancelSave]);

  // Toggle auto-save
  const toggle = useCallback(() => {
    setLocalEnabled((prev) => !prev);
  }, []);

  return {
    status: autoSaveState.status,
    isSaving: autoSaveState.status === "saving",
    hasError: autoSaveState.status === "error",
    error: autoSaveState.error,
    lastSaveTime: autoSaveState.lastSaveTime,
    lastSaveTimeFormatted: formatLastSaveTime(autoSaveState.lastSaveTime),
    statusText: getAutoSaveStatusText({
      status: autoSaveState.status,
      lastSaveTime: autoSaveState.lastSaveTime,
      error: autoSaveState.error,
      pendingChanges: hasPendingChanges,
    }),
    isEnabled: localEnabled,
    hasPendingChanges,
    scheduleSave,
    saveNow,
    cancelSave,
    enable,
    disable,
    toggle,
  };
}

// ============================================================================
// Context Auto-save Hook
// ============================================================================

export interface UseContextAutosaveOptions {
  /** Context key for the draft */
  contextKey: string;
  /** Save function */
  saveFn: (content: string) => Promise<void>;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Enable auto-save */
  enabled?: boolean;
}

/**
 * Hook for auto-saving a specific context
 */
export function useContextAutosave({
  contextKey,
  saveFn,
  debounceMs = 500,
  enabled = true,
}: UseContextAutosaveOptions) {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Cleanup on unmount or context change
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [contextKey]);

  const scheduleSave = useCallback(
    (content: string) => {
      if (!enabled) return;

      setIsPending(true);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        try {
          await saveFn(content);
        } finally {
          setIsPending(false);
        }
      }, debounceMs);
    },
    [enabled, debounceMs, saveFn],
  );

  const saveNow = useCallback(
    async (content: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      setIsPending(true);
      try {
        await saveFn(content);
      } finally {
        setIsPending(false);
      }
    },
    [saveFn],
  );

  const cancel = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsPending(false);
  }, []);

  return {
    scheduleSave,
    saveNow,
    cancel,
    isPending,
  };
}
