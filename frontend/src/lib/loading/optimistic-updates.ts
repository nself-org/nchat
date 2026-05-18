/**
 * Optimistic Updates Utilities
 * Helper functions for managing optimistic UI updates
 */

import { useState, useCallback, useRef } from "react";

import { logger } from "@/lib/logger";

/**
 * Type for optimistic update state
 */
export interface OptimisticState<T> {
  /** Current data (includes optimistic updates) */
  data: T;
  /** Whether an optimistic update is in progress */
  isPending: boolean;
  /** Revert to previous state */
  revert: () => void;
}

/**
 * Hook for managing optimistic updates
 */
export function useOptimistic<T>(
  initialState: T,
): [OptimisticState<T>, (updater: (current: T) => T) => void] {
  const [state, setState] = useState<T>(initialState);
  const [isPending, setIsPending] = useState(false);
  const previousStateRef = useRef<T>(initialState);

  const update = useCallback(
    (updater: (current: T) => T) => {
      previousStateRef.current = state;
      setState(updater);
      setIsPending(true);
    },
    [state],
  );

  const revert = useCallback(() => {
    setState(previousStateRef.current);
    setIsPending(false);
  }, []);

  const optimisticState: OptimisticState<T> = {
    data: state,
    isPending,
    revert,
  };

  return [optimisticState, update];
}

/**
 * Hook for optimistic list operations (add, update, remove)
 */
export function useOptimisticList<T extends { id: string | number }>(
  initialList: T[],
) {
  const [list, setList] = useState<T[]>(initialList);
  const [pendingIds, setPendingIds] = useState<Set<string | number>>(new Set());
  const previousListRef = useRef<T[]>(initialList);

  const addOptimistic = useCallback(
    (item: T) => {
      previousListRef.current = list;
      setList((prev) => [...prev, item]);
      setPendingIds((prev) => new Set(prev).add(item.id));
    },
    [list],
  );

  const updateOptimistic = useCallback(
    (id: string | number, updates: Partial<T>) => {
      previousListRef.current = list;
      setList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      );
      setPendingIds((prev) => new Set(prev).add(id));
    },
    [list],
  );

  const removeOptimistic = useCallback(
    (id: string | number) => {
      previousListRef.current = list;
      setList((prev) => prev.filter((item) => item.id !== id));
      setPendingIds((prev) => new Set(prev).add(id));
    },
    [list],
  );

  const confirmUpdate = useCallback((id: string | number) => {
    setPendingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const revert = useCallback(() => {
    setList(previousListRef.current);
    setPendingIds(new Set());
  }, []);

  const revertItem = useCallback((id: string | number) => {
    setList(previousListRef.current);
    setPendingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  return {
    list,
    pendingIds,
    addOptimistic,
    updateOptimistic,
    removeOptimistic,
    confirmUpdate,
    revert,
    revertItem,
    isPending: (id: string | number) => pendingIds.has(id),
  };
}

/**
 * Execute an action with optimistic update
 */
export async function withOptimisticUpdate<T, R>(
  optimisticUpdate: () => void,
  action: () => Promise<R>,
  onSuccess?: (result: R) => void,
  onError?: (error: Error) => void,
  revert?: () => void,
): Promise<R | undefined> {
  // Apply optimistic update
  optimisticUpdate();

  try {
    // Execute action
    const result = await action();

    // Call success handler
    if (onSuccess) {
      onSuccess(result);
    }

    return result;
  } catch (error) {
    // Revert on error
    if (revert) {
      revert();
    }

    // Call error handler
    if (onError) {
      onError(error as Error);
    }

    throw error;
  }
}

/**
 * Optimistic message sender
 */
export class OptimisticMessageSender<
  T extends { id: string; isPending?: boolean },
> {
  private messages: T[] = [];
  private callbacks: Set<(messages: T[]) => void> = new Set();

  constructor(initialMessages: T[] = []) {
    this.messages = initialMessages;
  }

  subscribe(callback: (messages: T[]) => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notify() {
    this.callbacks.forEach((callback) => callback([...this.messages]));
  }

  addOptimistic(message: T) {
    this.messages.push({ ...message, isPending: true });
    this.notify();
  }

  confirm(tempId: string, finalMessage: T) {
    const index = this.messages.findIndex((m) => m.id === tempId);
    if (index !== -1) {
      this.messages[index] = { ...finalMessage, isPending: false };
      this.notify();
    }
  }

  revert(id: string) {
    this.messages = this.messages.filter((m) => m.id !== id);
    this.notify();
  }

  getMessages() {
    return [...this.messages];
  }

  clear() {
    this.messages = [];
    this.notify();
  }
}

/**
 * Debounced optimistic update
 * Waits for user to finish typing before applying
 */
export function createDebouncedOptimistic<T>(delay: number = 300) {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingUpdate: (() => void) | null = null;

  return {
    update: (optimisticUpdate: () => void, action: () => Promise<T>) => {
      // Store the optimistic update
      pendingUpdate = optimisticUpdate;

      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set new timeout
      timeoutId = setTimeout(async () => {
        if (pendingUpdate) {
          pendingUpdate();
          try {
            await action();
          } catch (error) {
            logger.error("Optimistic update failed:", error);
          }
          pendingUpdate = null;
        }
      }, delay);
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      pendingUpdate = null;
    },
  };
}

/**
 * Optimistic queue processor
 * Processes multiple optimistic updates in order
 */
export class OptimisticQueue<T> {
  private queue: Array<{
    id: string;
    optimisticUpdate: () => void;
    action: () => Promise<T>;
    revert: () => void;
  }> = [];
  private isProcessing = false;

  add(
    id: string,
    optimisticUpdate: () => void,
    action: () => Promise<T>,
    revert: () => void,
  ) {
    this.queue.push({ id, optimisticUpdate, action, revert });
    if (!this.isProcessing) {
      this.process();
    }
  }

  private async process() {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      // Apply optimistic update
      item.optimisticUpdate();

      try {
        // Execute action
        await item.action();
      } catch (error) {
        // Revert on error
        item.revert();
        logger.error(`Optimistic update ${item.id} failed:`, error);
      }
    }

    this.isProcessing = false;
  }

  clear() {
    this.queue = [];
  }

  size() {
    return this.queue.length;
  }
}

/**
 * Create an optimistic cache
 */
export function createOptimisticCache<K, V>() {
  const cache = new Map<K, V>();
  const pendingKeys = new Set<K>();

  return {
    get: (key: K): V | undefined => cache.get(key),
    set: (key: K, value: V, isPending = false) => {
      cache.set(key, value);
      if (isPending) {
        pendingKeys.add(key);
      }
    },
    confirm: (key: K) => {
      pendingKeys.delete(key);
    },
    revert: (key: K) => {
      cache.delete(key);
      pendingKeys.delete(key);
    },
    isPending: (key: K): boolean => pendingKeys.has(key),
    clear: () => {
      cache.clear();
      pendingKeys.clear();
    },
    entries: () => Array.from(cache.entries()),
  };
}

/**
 * Retry mechanism for failed optimistic updates
 */
export function createRetryableOptimistic<T>(
  maxRetries: number = 3,
  retryDelay: number = 1000,
) {
  return async (
    optimisticUpdate: () => void,
    action: () => Promise<T>,
    revert: () => void,
  ): Promise<T> => {
    // Apply optimistic update
    optimisticUpdate();

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Execute action
        return await action();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on last attempt
        if (attempt < maxRetries - 1) {
          // Wait before retrying
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * (attempt + 1)),
          );
        }
      }
    }

    // All retries failed - revert
    revert();
    throw lastError || new Error("All retry attempts failed");
  };
}
