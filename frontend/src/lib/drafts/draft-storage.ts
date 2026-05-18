/**
 * Draft Storage - Handles persistence of drafts to localStorage and IndexedDB
 *
 * Provides a unified storage API with fallback from IndexedDB to localStorage
 */

import type {
  Draft,
  DraftStorageAdapter,
  DraftStorageOptions,
} from "./draft-types";

import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STORAGE_OPTIONS: DraftStorageOptions = {
  storageKey: "nchat-drafts",
  maxDrafts: 100,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  useIndexedDB: true,
};

const INDEXEDDB_NAME = "nchat-drafts-db";
const INDEXEDDB_VERSION = 1;
const INDEXEDDB_STORE_NAME = "drafts";

// ============================================================================
// LocalStorage Adapter
// ============================================================================

/**
 * LocalStorage-based draft storage adapter
 */
export class LocalStorageDraftAdapter implements DraftStorageAdapter {
  private storageKey: string;

  constructor(storageKey: string = DEFAULT_STORAGE_OPTIONS.storageKey) {
    this.storageKey = storageKey;
  }

  private getDraftsMap(): Map<string, Draft> {
    if (typeof window === "undefined") return new Map();

    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return new Map();

      const parsed = JSON.parse(data) as Record<string, Draft>;
      return new Map(Object.entries(parsed));
    } catch (error) {
      logger.warn("Error reading drafts from localStorage:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return new Map();
    }
  }

  private saveDraftsMap(drafts: Map<string, Draft>): void {
    if (typeof window === "undefined") return;

    try {
      const obj = Object.fromEntries(drafts);
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch (error) {
      logger.warn("Error saving drafts to localStorage:", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Try to clear old drafts if storage is full
      if (
        error instanceof DOMException &&
        error.name === "QuotaExceededError"
      ) {
        this.cleanupOldDrafts(drafts);
      }
    }
  }

  private cleanupOldDrafts(drafts: Map<string, Draft>): void {
    // Sort by lastModified and remove oldest half
    const sorted = Array.from(drafts.entries()).sort(
      (a, b) => b[1].lastModified - a[1].lastModified,
    );
    const keepCount = Math.floor(sorted.length / 2);
    const newDrafts = new Map(sorted.slice(0, keepCount));
    this.saveDraftsMap(newDrafts);
  }

  async get(contextKey: string): Promise<Draft | null> {
    const drafts = this.getDraftsMap();
    return drafts.get(contextKey) || null;
  }

  async set(contextKey: string, draft: Draft): Promise<void> {
    const drafts = this.getDraftsMap();
    drafts.set(contextKey, draft);
    this.saveDraftsMap(drafts);
  }

  async remove(contextKey: string): Promise<void> {
    const drafts = this.getDraftsMap();
    drafts.delete(contextKey);
    this.saveDraftsMap(drafts);
  }

  async getAll(): Promise<Draft[]> {
    const drafts = this.getDraftsMap();
    return Array.from(drafts.values());
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.storageKey);
  }

  async getKeys(): Promise<string[]> {
    const drafts = this.getDraftsMap();
    return Array.from(drafts.keys());
  }
}

// ============================================================================
// IndexedDB Adapter
// ============================================================================

/**
 * IndexedDB-based draft storage adapter
 * Better for larger drafts and attachments
 */
export class IndexedDBDraftAdapter implements DraftStorageAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        reject(new Error("IndexedDB not available"));
        return;
      }

      const request = indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create drafts store if it doesn't exist
        if (!db.objectStoreNames.contains(INDEXEDDB_STORE_NAME)) {
          const store = db.createObjectStore(INDEXEDDB_STORE_NAME, {
            keyPath: "contextKey",
          });

          // Create indexes for querying
          store.createIndex("contextType", "contextType", { unique: false });
          store.createIndex("lastModified", "lastModified", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  async get(contextKey: string): Promise<Draft | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(INDEXEDDB_STORE_NAME, "readonly");
      const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
      const request = store.get(contextKey);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async set(contextKey: string, draft: Draft): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(INDEXEDDB_STORE_NAME, "readwrite");
      const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
      const request = store.put({ ...draft, contextKey });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async remove(contextKey: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(INDEXEDDB_STORE_NAME, "readwrite");
      const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
      const request = store.delete(contextKey);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAll(): Promise<Draft[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(INDEXEDDB_STORE_NAME, "readonly");
      const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async clear(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(INDEXEDDB_STORE_NAME, "readwrite");
      const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getKeys(): Promise<string[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(INDEXEDDB_STORE_NAME, "readonly");
      const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get drafts by context type
   */
  async getByContextType(contextType: string): Promise<Draft[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(INDEXEDDB_STORE_NAME, "readonly");
      const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
      const index = store.index("contextType");
      const request = index.getAll(contextType);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get drafts modified after a certain time
   */
  async getModifiedAfter(timestamp: number): Promise<Draft[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(INDEXEDDB_STORE_NAME, "readonly");
      const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
      const index = store.index("lastModified");
      const range = IDBKeyRange.lowerBound(timestamp, true);
      const request = index.getAll(range);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// ============================================================================
// Unified Draft Storage
// ============================================================================

/**
 * Unified draft storage with automatic fallback
 */
export class DraftStorage implements DraftStorageAdapter {
  private primaryAdapter: DraftStorageAdapter;
  private fallbackAdapter: DraftStorageAdapter;
  private options: DraftStorageOptions;

  constructor(options: Partial<DraftStorageOptions> = {}) {
    this.options = { ...DEFAULT_STORAGE_OPTIONS, ...options };

    // Use IndexedDB as primary if available and enabled
    if (this.options.useIndexedDB && this.isIndexedDBAvailable()) {
      this.primaryAdapter = new IndexedDBDraftAdapter();
      this.fallbackAdapter = new LocalStorageDraftAdapter(
        this.options.storageKey,
      );
    } else {
      this.primaryAdapter = new LocalStorageDraftAdapter(
        this.options.storageKey,
      );
      this.fallbackAdapter = this.primaryAdapter;
    }
  }

  private isIndexedDBAvailable(): boolean {
    if (typeof window === "undefined") return false;
    return !!window.indexedDB;
  }

  async get(contextKey: string): Promise<Draft | null> {
    try {
      return await this.primaryAdapter.get(contextKey);
    } catch {
      logger.warn("Primary storage failed, using fallback");
      return await this.fallbackAdapter.get(contextKey);
    }
  }

  async set(contextKey: string, draft: Draft): Promise<void> {
    try {
      await this.primaryAdapter.set(contextKey, draft);
    } catch {
      logger.warn("Primary storage failed, using fallback");
      await this.fallbackAdapter.set(contextKey, draft);
    }
  }

  async remove(contextKey: string): Promise<void> {
    try {
      await this.primaryAdapter.remove(contextKey);
    } catch {
      logger.warn("Primary storage failed, using fallback");
      await this.fallbackAdapter.remove(contextKey);
    }
  }

  async getAll(): Promise<Draft[]> {
    try {
      return await this.primaryAdapter.getAll();
    } catch {
      logger.warn("Primary storage failed, using fallback");
      return await this.fallbackAdapter.getAll();
    }
  }

  async clear(): Promise<void> {
    try {
      await this.primaryAdapter.clear();
    } catch {
      logger.warn("Primary storage failed, using fallback");
      await this.fallbackAdapter.clear();
    }
  }

  async getKeys(): Promise<string[]> {
    try {
      return await this.primaryAdapter.getKeys();
    } catch {
      logger.warn("Primary storage failed, using fallback");
      return await this.fallbackAdapter.getKeys();
    }
  }

  /**
   * Get count of stored drafts
   */
  async getCount(): Promise<number> {
    const keys = await this.getKeys();
    return keys.length;
  }

  /**
   * Check if a draft exists
   */
  async exists(contextKey: string): Promise<boolean> {
    const draft = await this.get(contextKey);
    return draft !== null;
  }

  /**
   * Get drafts that are older than maxAge
   */
  async getOldDrafts(): Promise<Draft[]> {
    const drafts = await this.getAll();
    const cutoff = Date.now() - this.options.maxAge;
    return drafts.filter((draft) => draft.lastModified < cutoff);
  }

  /**
   * Cleanup old drafts based on maxAge
   */
  async cleanup(): Promise<number> {
    const oldDrafts = await this.getOldDrafts();
    for (const draft of oldDrafts) {
      await this.remove(draft.contextKey);
    }
    return oldDrafts.length;
  }

  /**
   * Enforce max drafts limit by removing oldest
   */
  async enforceLimit(): Promise<number> {
    const drafts = await this.getAll();
    if (drafts.length <= this.options.maxDrafts) return 0;

    // Sort by lastModified (newest first) and remove excess
    const sorted = drafts.sort((a, b) => b.lastModified - a.lastModified);
    const toRemove = sorted.slice(this.options.maxDrafts);

    for (const draft of toRemove) {
      await this.remove(draft.contextKey);
    }

    return toRemove.length;
  }

  /**
   * Get storage size estimate (localStorage only)
   */
  getStorageSizeEstimate(): number {
    if (typeof window === "undefined") return 0;

    try {
      const data = localStorage.getItem(this.options.storageKey);
      return data ? new Blob([data]).size : 0;
    } catch {
      return 0;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let draftStorageInstance: DraftStorage | null = null;

/**
 * Get the singleton draft storage instance
 */
export function getDraftStorage(
  options?: Partial<DraftStorageOptions>,
): DraftStorage {
  if (!draftStorageInstance) {
    draftStorageInstance = new DraftStorage(options);
  }
  return draftStorageInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetDraftStorage(): void {
  draftStorageInstance = null;
}
