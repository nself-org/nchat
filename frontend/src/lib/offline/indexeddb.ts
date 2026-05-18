/**
 * IndexedDB Offline Storage Layer
 *
 * Provides structured storage for offline operations:
 * - Message queue (pending sends)
 * - Upload queue (pending files)
 * - Cache (messages, channels, users)
 * - Settings sync
 * - Conflict resolution metadata
 */

export interface QueuedMessage {
  id: string;
  channelId: string;
  content: string;
  contentType: "text" | "markdown" | "code";
  attachments?: string[]; // References to uploads
  replyTo?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  lastAttempt?: number;
  error?: string;
  status: "pending" | "syncing" | "failed" | "synced";
}

export interface QueuedUpload {
  id: string;
  file: File;
  channelId: string;
  messageId?: string;
  progress: number;
  attempts: number;
  lastAttempt?: number;
  error?: string;
  status: "pending" | "uploading" | "failed" | "uploaded";
  uploadUrl?: string;
}

export interface CachedMessage {
  id: string;
  channelId: string;
  content: string;
  userId: string;
  createdAt: number;
  updatedAt?: number;
  version: number; // For conflict resolution
  lastSynced: number;
}

export interface SyncMetadata {
  entityType: "message" | "channel" | "user" | "settings";
  entityId: string;
  localVersion: number;
  serverVersion: number;
  lastSynced: number;
  hasConflict: boolean;
  conflictData?: unknown;
}

export interface UserSettings {
  userId: string;
  theme: Record<string, unknown>;
  notifications: Record<string, unknown>;
  preferences: Record<string, unknown>;
  version: number;
  lastSynced: number;
}

const DB_NAME = "nchat-offline";
const DB_VERSION = 1;

const STORES = {
  MESSAGE_QUEUE: "messageQueue",
  UPLOAD_QUEUE: "uploadQueue",
  MESSAGE_CACHE: "messageCache",
  CHANNEL_CACHE: "channelCache",
  USER_CACHE: "userCache",
  SYNC_METADATA: "syncMetadata",
  SETTINGS: "settings",
} as const;

class OfflineDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Message queue - pending messages to send
        if (!db.objectStoreNames.contains(STORES.MESSAGE_QUEUE)) {
          const messageQueue = db.createObjectStore(STORES.MESSAGE_QUEUE, {
            keyPath: "id",
          });
          messageQueue.createIndex("status", "status", { unique: false });
          messageQueue.createIndex("channelId", "channelId", { unique: false });
          messageQueue.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Upload queue - pending file uploads
        if (!db.objectStoreNames.contains(STORES.UPLOAD_QUEUE)) {
          const uploadQueue = db.createObjectStore(STORES.UPLOAD_QUEUE, {
            keyPath: "id",
          });
          uploadQueue.createIndex("status", "status", { unique: false });
          uploadQueue.createIndex("messageId", "messageId", { unique: false });
        }

        // Message cache - recent messages for offline viewing
        if (!db.objectStoreNames.contains(STORES.MESSAGE_CACHE)) {
          const messageCache = db.createObjectStore(STORES.MESSAGE_CACHE, {
            keyPath: "id",
          });
          messageCache.createIndex("channelId", "channelId", { unique: false });
          messageCache.createIndex("createdAt", "createdAt", { unique: false });
          messageCache.createIndex("version", "version", { unique: false });
        }

        // Channel cache
        if (!db.objectStoreNames.contains(STORES.CHANNEL_CACHE)) {
          db.createObjectStore(STORES.CHANNEL_CACHE, { keyPath: "id" });
        }

        // User cache
        if (!db.objectStoreNames.contains(STORES.USER_CACHE)) {
          db.createObjectStore(STORES.USER_CACHE, { keyPath: "id" });
        }

        // Sync metadata - conflict resolution data
        if (!db.objectStoreNames.contains(STORES.SYNC_METADATA)) {
          const syncMetadata = db.createObjectStore(STORES.SYNC_METADATA, {
            keyPath: ["entityType", "entityId"],
          });
          syncMetadata.createIndex("hasConflict", "hasConflict", {
            unique: false,
          });
        }

        // Settings - user preferences sync
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: "userId" });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInit(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    return this.db;
  }

  /**
   * Generic method to add/update record
   */
  private async put<T>(storeName: string, data: T): Promise<IDBValidKey> {
    const db = await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to get record
   */
  private async get<T>(
    storeName: string,
    key: IDBValidKey | IDBKeyRange,
  ): Promise<T | undefined> {
    const db = await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to get all records
   */
  private async getAll<T>(
    storeName: string,
    query?: IDBValidKey | IDBKeyRange,
  ): Promise<T[]> {
    const db = await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll(query);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to delete record
   */
  private async delete(
    storeName: string,
    key: IDBValidKey | IDBKeyRange,
  ): Promise<void> {
    const db = await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic method to query by index
   */
  private async getByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBValidKey | IDBKeyRange,
  ): Promise<T[]> {
    const db = await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(query);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================================================
  // Message Queue Operations
  // ============================================================================

  async addToMessageQueue(message: QueuedMessage): Promise<void> {
    await this.put(STORES.MESSAGE_QUEUE, message);
  }

  async getMessageQueue(
    status?: QueuedMessage["status"],
  ): Promise<QueuedMessage[]> {
    if (status) {
      return this.getByIndex(STORES.MESSAGE_QUEUE, "status", status);
    }
    return this.getAll(STORES.MESSAGE_QUEUE);
  }

  async updateMessageQueueItem(
    id: string,
    updates: Partial<QueuedMessage>,
  ): Promise<void> {
    const existing = await this.get<QueuedMessage>(STORES.MESSAGE_QUEUE, id);
    if (existing) {
      await this.put(STORES.MESSAGE_QUEUE, { ...existing, ...updates });
    }
  }

  async removeFromMessageQueue(id: string): Promise<void> {
    await this.delete(STORES.MESSAGE_QUEUE, id);
  }

  async clearMessageQueue(): Promise<void> {
    const db = await this.ensureInit();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.MESSAGE_QUEUE, "readwrite");
      const store = transaction.objectStore(STORES.MESSAGE_QUEUE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================================================
  // Upload Queue Operations
  // ============================================================================

  async addToUploadQueue(upload: QueuedUpload): Promise<void> {
    await this.put(STORES.UPLOAD_QUEUE, upload);
  }

  async getUploadQueue(
    status?: QueuedUpload["status"],
  ): Promise<QueuedUpload[]> {
    if (status) {
      return this.getByIndex(STORES.UPLOAD_QUEUE, "status", status);
    }
    return this.getAll(STORES.UPLOAD_QUEUE);
  }

  async updateUploadQueueItem(
    id: string,
    updates: Partial<QueuedUpload>,
  ): Promise<void> {
    const existing = await this.get<QueuedUpload>(STORES.UPLOAD_QUEUE, id);
    if (existing) {
      await this.put(STORES.UPLOAD_QUEUE, { ...existing, ...updates });
    }
  }

  async removeFromUploadQueue(id: string): Promise<void> {
    await this.delete(STORES.UPLOAD_QUEUE, id);
  }

  // ============================================================================
  // Message Cache Operations
  // ============================================================================

  async cacheMessage(message: CachedMessage): Promise<void> {
    await this.put(STORES.MESSAGE_CACHE, message);
  }

  async getCachedMessages(channelId: string): Promise<CachedMessage[]> {
    return this.getByIndex(STORES.MESSAGE_CACHE, "channelId", channelId);
  }

  async getCachedMessage(id: string): Promise<CachedMessage | undefined> {
    return this.get(STORES.MESSAGE_CACHE, id);
  }

  // ============================================================================
  // Sync Metadata Operations
  // ============================================================================

  async setSyncMetadata(metadata: SyncMetadata): Promise<void> {
    await this.put(STORES.SYNC_METADATA, metadata);
  }

  async getSyncMetadata(
    entityType: SyncMetadata["entityType"],
    entityId: string,
  ): Promise<SyncMetadata | undefined> {
    return this.get(STORES.SYNC_METADATA, [entityType, entityId]);
  }

  async getConflicts(): Promise<SyncMetadata[]> {
    // @ts-expect-error - IndexedDB accepts boolean but types expect IDBValidKey
    return this.getByIndex(STORES.SYNC_METADATA, "hasConflict", true);
  }

  async resolveConflict(
    entityType: SyncMetadata["entityType"],
    entityId: string,
  ): Promise<void> {
    const metadata = await this.getSyncMetadata(entityType, entityId);
    if (metadata) {
      metadata.hasConflict = false;
      metadata.conflictData = undefined;
      await this.setSyncMetadata(metadata);
    }
  }

  // ============================================================================
  // Settings Operations
  // ============================================================================

  async saveSettings(settings: UserSettings): Promise<void> {
    await this.put(STORES.SETTINGS, settings);
  }

  async getSettings(userId: string): Promise<UserSettings | undefined> {
    return this.get(STORES.SETTINGS, userId);
  }

  // ============================================================================
  // Utility Operations
  // ============================================================================

  /**
   * Get database size estimate
   */
  async getStorageEstimate(): Promise<{
    usage: number;
    quota: number;
    percent: number;
  }> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      return {
        usage,
        quota,
        percent: quota > 0 ? (usage / quota) * 100 : 0,
      };
    }
    return { usage: 0, quota: 0, percent: 0 };
  }

  /**
   * Clear all offline data
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureInit();
    const storeNames = Object.values(STORES);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, "readwrite");

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      storeNames.forEach((storeName) => {
        transaction.objectStore(storeName).clear();
      });
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Singleton instance
export const offlineDB = new OfflineDB();
