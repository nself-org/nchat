/**
 * Type-Safe LocalStorage Wrapper
 *
 * Provides type-safe access to localStorage with TTL support,
 * automatic serialization, and error handling.
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface StorageItem<T> {
  value: T;
  expiresAt?: number;
}

export interface StorageOptions {
  /** Time to live in milliseconds */
  ttl?: number;
  /** Custom serializer */
  serializer?: (value: unknown) => string;
  /** Custom deserializer */
  deserializer?: (value: string) => unknown;
}

// ============================================================================
// Storage Manager Class
// ============================================================================

export class LocalStorageManager {
  private prefix: string;

  constructor(prefix = "nchat") {
    this.prefix = prefix;
  }

  /**
   * Get prefixed key
   */
  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Check if localStorage is available
   */
  private isAvailable(): boolean {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return false;
    }

    try {
      const testKey = "__storage_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get item from storage with type safety
   */
  get<T>(key: string, defaultValue?: T): T | null {
    if (!this.isAvailable()) {
      return defaultValue ?? null;
    }

    try {
      const item = localStorage.getItem(this.getKey(key));

      if (item === null) {
        return defaultValue ?? null;
      }

      const parsed = JSON.parse(item) as StorageItem<T>;

      // Check expiration
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        this.remove(key);
        return defaultValue ?? null;
      }

      return parsed.value;
    } catch (error) {
      logger.error("Failed to get from localStorage", error as Error, { key });
      return defaultValue ?? null;
    }
  }

  /**
   * Set item in storage
   */
  set<T>(key: string, value: T, options?: StorageOptions): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const item: StorageItem<T> = {
        value,
        expiresAt: options?.ttl ? Date.now() + options.ttl : undefined,
      };

      const serialized = options?.serializer
        ? options.serializer(item)
        : JSON.stringify(item);

      localStorage.setItem(this.getKey(key), serialized);
      return true;
    } catch (error) {
      logger.error("Failed to set in localStorage", error as Error, { key });
      return false;
    }
  }

  /**
   * Remove item from storage
   */
  remove(key: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      logger.error("Failed to remove from localStorage", error as Error, {
        key,
      });
      return false;
    }
  }

  /**
   * Check if key exists (and not expired)
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all items with this prefix
   */
  clear(): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const keys = Object.keys(localStorage);
      const prefixedKeys = keys.filter((k) => k.startsWith(`${this.prefix}:`));

      prefixedKeys.forEach((k) => localStorage.removeItem(k));
      return true;
    } catch (error) {
      logger.error("Failed to clear localStorage", error as Error);
      return false;
    }
  }

  /**
   * Get all keys with this prefix
   */
  keys(): string[] {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter((k) => k.startsWith(`${this.prefix}:`))
        .map((k) => k.replace(`${this.prefix}:`, ""));
    } catch (error) {
      logger.error("Failed to get keys from localStorage", error as Error);
      return [];
    }
  }

  /**
   * Get storage size in bytes
   */
  size(): number {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      let size = 0;
      const keys = Object.keys(localStorage);
      const prefixedKeys = keys.filter((k) => k.startsWith(`${this.prefix}:`));

      prefixedKeys.forEach((key) => {
        const value = localStorage.getItem(key);
        size += key.length + (value?.length || 0);
      });

      return size;
    } catch (error) {
      logger.error("Failed to calculate localStorage size", error as Error);
      return 0;
    }
  }

  /**
   * Clean up expired items
   */
  cleanup(): number {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      let cleaned = 0;
      const keys = this.keys();

      keys.forEach((key) => {
        const value = this.get(key);
        if (value === null) {
          cleaned++;
        }
      });

      logger.debug("LocalStorage cleanup completed", { cleaned });
      return cleaned;
    } catch (error) {
      logger.error("Failed to cleanup localStorage", error as Error);
      return 0;
    }
  }

  /**
   * Update existing item
   */
  update<T>(
    key: string,
    updater: (current: T | null) => T,
    options?: StorageOptions,
  ): boolean {
    const current = this.get<T>(key);
    const updated = updater(current);
    return this.set(key, updated, options);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const storage = new LocalStorageManager("nchat");

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get item from storage
 */
export function getItem<T>(key: string, defaultValue?: T): T | null {
  return storage.get(key, defaultValue);
}

/**
 * Set item in storage
 */
export function setItem<T>(
  key: string,
  value: T,
  options?: StorageOptions,
): boolean {
  return storage.set(key, value, options);
}

/**
 * Remove item from storage
 */
export function removeItem(key: string): boolean {
  return storage.remove(key);
}

/**
 * Check if item exists
 */
export function hasItem(key: string): boolean {
  return storage.has(key);
}

/**
 * Clear all storage
 */
export function clearStorage(): boolean {
  return storage.clear();
}

// ============================================================================
// Hooks (React)
// ============================================================================

import { useState, useEffect, useCallback } from "react";

/**
 * React hook for localStorage with automatic sync
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [theme, setTheme] = useLocalStorage('theme', 'dark')
 *
 *   return <button onClick={() => setTheme('light')}>Toggle</button>
 * }
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options?: StorageOptions,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Initialize state from localStorage
  const [value, setValue] = useState<T>(() => {
    return storage.get(key, defaultValue) ?? defaultValue;
  });

  // Update localStorage when value changes
  useEffect(() => {
    storage.set(key, value, options);
  }, [key, value, options]);

  // Update function
  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const updated =
        typeof newValue === "function"
          ? (newValue as (prev: T) => T)(prev)
          : newValue;
      return updated;
    });
  }, []);

  // Remove function
  const removeValue = useCallback(() => {
    storage.remove(key);
    setValue(defaultValue);
  }, [key, defaultValue]);

  // Sync with other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storage["getKey"](key) && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as StorageItem<T>;
          setValue(parsed.value);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key]);

  return [value, updateValue, removeValue];
}

/**
 * Hook for storage with expiration check
 */
export function useExpiringStorage<T>(
  key: string,
  defaultValue: T,
  ttl: number,
): [T | null, (value: T) => void, () => void] {
  const [value, setValue, removeValue] = useLocalStorage<T | null>(
    key,
    storage.get(key, defaultValue),
    { ttl },
  );

  const setValueWithTTL = useCallback(
    (newValue: T) => {
      setValue(newValue);
    },
    [setValue],
  );

  return [value, setValueWithTTL, removeValue];
}
