/**
 * Storage utilities for nself-chat
 * @module utils/storage
 */

import { logger } from "@/lib/logger";

/**
 * Check if we're in a browser environment
 */
const isBrowser = typeof window !== "undefined";

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (!isBrowser) return false;

  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if sessionStorage is available
 */
function isSessionStorageAvailable(): boolean {
  if (!isBrowser) return false;

  try {
    const test = "__storage_test__";
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Storage options
 */
export interface StorageOptions<T> {
  /** Default value if key doesn't exist */
  defaultValue?: T;
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Serialize function (default: JSON.stringify) */
  serialize?: (value: T) => string;
  /** Deserialize function (default: JSON.parse) */
  deserialize?: (value: string) => T;
}

/**
 * Stored value with metadata
 */
interface StoredValue<T> {
  value: T;
  timestamp: number;
  ttl?: number;
}

/**
 * Create a type-safe localStorage wrapper
 * @param prefix - Key prefix for namespacing
 * @returns Storage wrapper object
 * @example
 * const storage = createLocalStorage<{ theme: string; user: User }>('nchat');
 * storage.set('theme', 'dark');
 * const theme = storage.get('theme'); // 'dark'
 */
export function createLocalStorage<T extends Record<string, unknown>>(
  prefix: string,
) {
  const available = isLocalStorageAvailable();
  const fullKey = (key: keyof T) => `${prefix}:${String(key)}`;

  return {
    /**
     * Check if localStorage is available
     */
    isAvailable: () => available,

    /**
     * Get a value from localStorage
     * @param key - Storage key
     * @param options - Storage options
     * @returns Stored value or default
     */
    get<K extends keyof T>(
      key: K,
      options: StorageOptions<T[K]> = {},
    ): T[K] | undefined {
      if (!available) {
        return options.defaultValue;
      }

      try {
        const raw = localStorage.getItem(fullKey(key));
        if (raw === null) {
          return options.defaultValue;
        }

        const deserialize = options.deserialize || JSON.parse;
        const stored = deserialize(raw) as StoredValue<T[K]> | T[K];

        // Check if it's a wrapped value with TTL
        if (
          stored &&
          typeof stored === "object" &&
          "value" in stored &&
          "timestamp" in stored
        ) {
          const wrapper = stored as StoredValue<T[K]>;
          // Check TTL
          if (wrapper.ttl && Date.now() - wrapper.timestamp > wrapper.ttl) {
            localStorage.removeItem(fullKey(key));
            return options.defaultValue;
          }
          return wrapper.value;
        }

        return stored as T[K];
      } catch (error) {
        logger.warn(`Error reading from localStorage: ${String(key)}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return options.defaultValue;
      }
    },

    /**
     * Set a value in localStorage
     * @param key - Storage key
     * @param value - Value to store
     * @param options - Storage options
     * @returns Whether the operation succeeded
     */
    set<K extends keyof T>(
      key: K,
      value: T[K],
      options: StorageOptions<T[K]> = {},
    ): boolean {
      if (!available) {
        return false;
      }

      try {
        const serialize = options.serialize || JSON.stringify;

        let toStore: string;
        if (options.ttl) {
          const wrapper: StoredValue<T[K]> = {
            value,
            timestamp: Date.now(),
            ttl: options.ttl,
          };
          toStore = serialize(wrapper as T[K]);
        } else {
          toStore = serialize(value);
        }

        localStorage.setItem(fullKey(key), toStore);
        return true;
      } catch (error) {
        logger.warn(`Error writing to localStorage: ${String(key)}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    },

    /**
     * Remove a value from localStorage
     * @param key - Storage key
     */
    remove<K extends keyof T>(key: K): void {
      if (!available) return;
      localStorage.removeItem(fullKey(key));
    },

    /**
     * Clear all values with this prefix
     */
    clear(): void {
      if (!available) return;

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${prefix}:`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    },

    /**
     * Get all keys with this prefix
     * @returns Array of keys (without prefix)
     */
    keys(): (keyof T)[] {
      if (!available) return [];

      const result: (keyof T)[] = [];
      const prefixWithColon = `${prefix}:`;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefixWithColon)) {
          result.push(key.slice(prefixWithColon.length) as keyof T);
        }
      }

      return result;
    },

    /**
     * Check if a key exists
     * @param key - Storage key
     * @returns Whether the key exists
     */
    has<K extends keyof T>(key: K): boolean {
      if (!available) return false;
      return localStorage.getItem(fullKey(key)) !== null;
    },

    /**
     * Subscribe to changes (storage event)
     * @param key - Key to watch (or null for all)
     * @param callback - Change callback
     * @returns Unsubscribe function
     */
    subscribe<K extends keyof T>(
      key: K | null,
      callback: (
        newValue: T[K] | undefined,
        oldValue: T[K] | undefined,
      ) => void,
    ): () => void {
      if (!available) {
        return () => {};
      }

      const handler = (event: StorageEvent) => {
        if (!event.key) return;

        const watchKey = key ? fullKey(key) : null;
        if (watchKey && event.key !== watchKey) return;
        if (!watchKey && !event.key.startsWith(`${prefix}:`)) return;

        try {
          const newValue = event.newValue
            ? JSON.parse(event.newValue)
            : undefined;
          const oldValue = event.oldValue
            ? JSON.parse(event.oldValue)
            : undefined;
          callback(newValue, oldValue);
        } catch {
          callback(undefined, undefined);
        }
      };

      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
}

/**
 * Create a type-safe sessionStorage wrapper
 * @param prefix - Key prefix for namespacing
 * @returns Storage wrapper object
 */
export function createSessionStorage<T extends Record<string, unknown>>(
  prefix: string,
) {
  const available = isSessionStorageAvailable();
  const fullKey = (key: keyof T) => `${prefix}:${String(key)}`;

  return {
    /**
     * Check if sessionStorage is available
     */
    isAvailable: () => available,

    /**
     * Get a value from sessionStorage
     */
    get<K extends keyof T>(
      key: K,
      options: StorageOptions<T[K]> = {},
    ): T[K] | undefined {
      if (!available) {
        return options.defaultValue;
      }

      try {
        const raw = sessionStorage.getItem(fullKey(key));
        if (raw === null) {
          return options.defaultValue;
        }

        const deserialize = options.deserialize || JSON.parse;
        return deserialize(raw);
      } catch (error) {
        logger.warn(`Error reading from sessionStorage: ${String(key)}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return options.defaultValue;
      }
    },

    /**
     * Set a value in sessionStorage
     */
    set<K extends keyof T>(
      key: K,
      value: T[K],
      options: StorageOptions<T[K]> = {},
    ): boolean {
      if (!available) {
        return false;
      }

      try {
        const serialize = options.serialize || JSON.stringify;
        sessionStorage.setItem(fullKey(key), serialize(value));
        return true;
      } catch (error) {
        logger.warn(`Error writing to sessionStorage: ${String(key)}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    },

    /**
     * Remove a value from sessionStorage
     */
    remove<K extends keyof T>(key: K): void {
      if (!available) return;
      sessionStorage.removeItem(fullKey(key));
    },

    /**
     * Clear all values with this prefix
     */
    clear(): void {
      if (!available) return;

      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(`${prefix}:`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    },

    /**
     * Check if a key exists
     */
    has<K extends keyof T>(key: K): boolean {
      if (!available) return false;
      return sessionStorage.getItem(fullKey(key)) !== null;
    },
  };
}

/**
 * IndexedDB database config
 */
export interface IDBConfig {
  /** Database name */
  name: string;
  /** Database version */
  version?: number;
  /** Object stores to create */
  stores?: {
    name: string;
    keyPath?: string;
    autoIncrement?: boolean;
    indexes?: {
      name: string;
      keyPath: string | string[];
      unique?: boolean;
    }[];
  }[];
}

/**
 * Create an IndexedDB wrapper for large data storage
 * @param config - Database configuration
 * @returns IndexedDB wrapper object
 * @example
 * const db = createIndexedDB({
 *   name: 'nchat-db',
 *   stores: [{ name: 'messages', keyPath: 'id' }]
 * });
 * await db.put('messages', { id: '1', text: 'Hello' });
 * const message = await db.get('messages', '1');
 */
export function createIndexedDB(config: IDBConfig) {
  const { name, version = 1, stores = [] } = config;

  let dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Open the database
   */
  function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    if (!isBrowser || !("indexedDB" in window)) {
      return Promise.reject(new Error("IndexedDB is not available"));
    }

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);

      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        for (const store of stores) {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath,
              autoIncrement: store.autoIncrement,
            });

            if (store.indexes) {
              for (const index of store.indexes) {
                objectStore.createIndex(index.name, index.keyPath, {
                  unique: index.unique,
                });
              }
            }
          }
        }
      };
    });

    return dbPromise;
  }

  return {
    /**
     * Get a value by key
     * @param storeName - Object store name
     * @param key - Record key
     * @returns Promise resolving to the value
     */
    async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    },

    /**
     * Get all values from a store
     * @param storeName - Object store name
     * @param query - Optional query (key range)
     * @returns Promise resolving to all values
     */
    async getAll<T>(storeName: string, query?: IDBKeyRange): Promise<T[]> {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll(query);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    },

    /**
     * Put (insert or update) a value
     * @param storeName - Object store name
     * @param value - Value to store
     * @param key - Optional key (if not using keyPath)
     * @returns Promise resolving to the key
     */
    async put<T>(
      storeName: string,
      value: T,
      key?: IDBValidKey,
    ): Promise<IDBValidKey> {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = key ? store.put(value, key) : store.put(value);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    },

    /**
     * Add a new value (fails if key exists)
     * @param storeName - Object store name
     * @param value - Value to store
     * @param key - Optional key
     * @returns Promise resolving to the key
     */
    async add<T>(
      storeName: string,
      value: T,
      key?: IDBValidKey,
    ): Promise<IDBValidKey> {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = key ? store.add(value, key) : store.add(value);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    },

    /**
     * Delete a value by key
     * @param storeName - Object store name
     * @param key - Record key
     */
    async delete(storeName: string, key: IDBValidKey): Promise<void> {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    },

    /**
     * Clear all values from a store
     * @param storeName - Object store name
     */
    async clear(storeName: string): Promise<void> {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    },

    /**
     * Count records in a store
     * @param storeName - Object store name
     * @param query - Optional query
     * @returns Promise resolving to count
     */
    async count(storeName: string, query?: IDBKeyRange): Promise<number> {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.count(query);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    },

    /**
     * Query by index
     * @param storeName - Object store name
     * @param indexName - Index name
     * @param query - Query value or range
     * @returns Promise resolving to matching records
     */
    async getByIndex<T>(
      storeName: string,
      indexName: string,
      query: IDBValidKey | IDBKeyRange,
    ): Promise<T[]> {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(query);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    },

    /**
     * Close the database connection
     */
    async close(): Promise<void> {
      if (dbPromise) {
        const db = await dbPromise;
        db.close();
        dbPromise = null;
      }
    },

    /**
     * Delete the entire database
     */
    async deleteDatabase(): Promise<void> {
      await this.close();
      return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    },
  };
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  /** Total quota in bytes */
  quota: number;
  /** Used storage in bytes */
  usage: number;
  /** Available storage in bytes */
  available: number;
  /** Usage percentage (0-100) */
  percentUsed: number;
}

/**
 * Get storage quota estimate
 * @returns Promise resolving to storage quota info
 */
export async function getStorageQuota(): Promise<StorageQuota | null> {
  if (!isBrowser || !navigator.storage || !navigator.storage.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const usage = estimate.usage || 0;

    return {
      quota,
      usage,
      available: quota - usage,
      percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Request persistent storage
 * @returns Promise resolving to whether persistent storage was granted
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!isBrowser || !navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Check if storage is persisted
 * @returns Promise resolving to whether storage is persisted
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (!isBrowser || !navigator.storage || !navigator.storage.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/**
 * Memory cache with optional TTL
 */
export function createMemoryCache<T extends Record<string, unknown>>() {
  const cache = new Map<
    keyof T,
    { value: T[keyof T]; timestamp: number; ttl?: number }
  >();

  return {
    /**
     * Get a value from cache
     */
    get<K extends keyof T>(key: K): T[K] | undefined {
      const entry = cache.get(key);
      if (!entry) return undefined;

      // Check TTL
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        cache.delete(key);
        return undefined;
      }

      return entry.value as T[K];
    },

    /**
     * Set a value in cache
     */
    set<K extends keyof T>(key: K, value: T[K], ttl?: number): void {
      cache.set(key, { value, timestamp: Date.now(), ttl });
    },

    /**
     * Remove a value from cache
     */
    delete<K extends keyof T>(key: K): void {
      cache.delete(key);
    },

    /**
     * Clear all cached values
     */
    clear(): void {
      cache.clear();
    },

    /**
     * Check if a key exists
     */
    has<K extends keyof T>(key: K): boolean {
      const entry = cache.get(key);
      if (!entry) return false;

      // Check TTL
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        cache.delete(key);
        return false;
      }

      return true;
    },

    /**
     * Get cache size
     */
    size(): number {
      return cache.size;
    },

    /**
     * Clean up expired entries
     */
    cleanup(): void {
      const now = Date.now();
      for (const [key, entry] of cache.entries()) {
        if (entry.ttl && now - entry.timestamp > entry.ttl) {
          cache.delete(key);
        }
      }
    },
  };
}
