/**
 * Offline Storage - IndexedDB wrapper for offline data persistence
 *
 * Provides a typed interface to IndexedDB for storing channels, messages,
 * users, and queued actions while offline.
 */

import type {
  StoreName,
  DatabaseConfig,
  StoreConfig,
  CachedChannel,
  CachedMessage,
  CachedUser,
  QueuedAction,
  CacheMetadata,
} from "./offline-types";
import { logger } from "@/lib/logger";

// =============================================================================
// Database Configuration
// =============================================================================

const DB_NAME = "nchat-offline";
const DB_VERSION = 1;

const STORES: StoreConfig[] = [
  {
    name: "channels",
    keyPath: "id",
    indexes: [
      { name: "by-type", keyPath: "type" },
      { name: "by-cachedAt", keyPath: "cachedAt" },
      { name: "by-lastMessageAt", keyPath: "lastMessageAt" },
    ],
  },
  {
    name: "messages",
    keyPath: "id",
    indexes: [
      { name: "by-channelId", keyPath: "channelId" },
      { name: "by-channelId-createdAt", keyPath: ["channelId", "createdAt"] },
      { name: "by-senderId", keyPath: "senderId" },
      { name: "by-isPending", keyPath: "isPending" },
    ],
  },
  {
    name: "users",
    keyPath: "id",
    indexes: [
      { name: "by-username", keyPath: "username", unique: true },
      { name: "by-status", keyPath: "status" },
      { name: "by-cachedAt", keyPath: "cachedAt" },
    ],
  },
  {
    name: "queue",
    keyPath: "id",
    indexes: [
      { name: "by-type", keyPath: "type" },
      { name: "by-status", keyPath: "status" },
      { name: "by-priority", keyPath: "priority" },
      { name: "by-createdAt", keyPath: "createdAt" },
      { name: "by-channelId", keyPath: "channelId" },
    ],
  },
  {
    name: "cache_meta",
    keyPath: "key",
    indexes: [
      { name: "by-expiresAt", keyPath: "expiresAt" },
      { name: "by-lastAccessedAt", keyPath: "lastAccessedAt" },
    ],
  },
  {
    name: "attachments",
    keyPath: "id",
    indexes: [{ name: "by-messageId", keyPath: "messageId" }],
  },
  {
    name: "settings",
    keyPath: "key",
    indexes: [],
  },
];

const DATABASE_CONFIG: DatabaseConfig = {
  name: DB_NAME,
  version: DB_VERSION,
  stores: STORES,
};

// =============================================================================
// Database Connection
// =============================================================================

let db: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open the database connection
 */
function openDatabase(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = indexedDB.open(
      DATABASE_CONFIG.name,
      DATABASE_CONFIG.version,
    );

    request.onerror = () => {
      logger.error("[OfflineStorage] Failed to open database:", request.error);
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;

      // Handle connection close
      db.onclose = () => {
        db = null;
        dbPromise = null;
      };

      // Handle version change (another tab updated the DB)
      db.onversionchange = () => {
        db?.close();
        db = null;
        dbPromise = null;
      };

      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      createStores(database);
    };
  });

  return dbPromise;
}

/**
 * Create object stores and indexes
 */
function createStores(database: IDBDatabase): void {
  for (const store of DATABASE_CONFIG.stores) {
    // Delete existing store if it exists
    if (database.objectStoreNames.contains(store.name)) {
      database.deleteObjectStore(store.name);
    }

    // Create store
    const objectStore = database.createObjectStore(store.name, {
      keyPath: store.keyPath,
    });

    // Create indexes
    for (const index of store.indexes) {
      objectStore.createIndex(index.name, index.keyPath, {
        unique: index.unique ?? false,
        multiEntry: index.multiEntry ?? false,
      });
    }
  }
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    dbPromise = null;
  }
}

/**
 * Delete the database
 */
export async function deleteDatabase(): Promise<void> {
  closeDatabase();

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_CONFIG.name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// =============================================================================
// Generic CRUD Operations
// =============================================================================

/**
 * Get a single record by key
 */
export async function get<T>(
  storeName: StoreName,
  key: IDBValidKey,
): Promise<T | undefined> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all records from a store
 */
export async function getAll<T>(
  storeName: StoreName,
  query?: IDBKeyRange,
  count?: number,
): Promise<T[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll(query, count);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get records by index
 */
export async function getByIndex<T>(
  storeName: StoreName,
  indexName: string,
  query: IDBValidKey | IDBKeyRange,
  count?: number,
): Promise<T[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(query, count);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Put a record (insert or update)
 */
export async function put<T>(
  storeName: StoreName,
  data: T,
): Promise<IDBValidKey> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Put multiple records
 */
export async function putMany<T>(
  storeName: StoreName,
  items: T[],
): Promise<void> {
  if (items.length === 0) return;

  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    for (const item of items) {
      store.put(item);
    }
  });
}

/**
 * Delete a record by key
 */
export async function remove(
  storeName: StoreName,
  key: IDBValidKey,
): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete multiple records by keys
 */
export async function removeMany(
  storeName: StoreName,
  keys: IDBValidKey[],
): Promise<void> {
  if (keys.length === 0) return;

  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    for (const key of keys) {
      store.delete(key);
    }
  });
}

/**
 * Clear all records from a store
 */
export async function clear(storeName: StoreName): Promise<void> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Count records in a store
 */
export async function count(
  storeName: StoreName,
  query?: IDBKeyRange,
): Promise<number> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.count(query);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// =============================================================================
// Channel Operations
// =============================================================================

export const channelStorage = {
  async get(id: string): Promise<CachedChannel | undefined> {
    return get<CachedChannel>("channels", id);
  },

  async getAll(): Promise<CachedChannel[]> {
    return getAll<CachedChannel>("channels");
  },

  async getByType(type: string): Promise<CachedChannel[]> {
    return getByIndex<CachedChannel>("channels", "by-type", type);
  },

  async save(channel: CachedChannel): Promise<void> {
    await put("channels", { ...channel, cachedAt: new Date() });
  },

  async saveMany(channels: CachedChannel[]): Promise<void> {
    const now = new Date();
    const withTimestamp = channels.map((c) => ({ ...c, cachedAt: now }));
    await putMany("channels", withTimestamp);
  },

  async remove(id: string): Promise<void> {
    await remove("channels", id);
  },

  async clear(): Promise<void> {
    await clear("channels");
  },

  async count(): Promise<number> {
    return count("channels");
  },
};

// =============================================================================
// Message Operations
// =============================================================================

export const messageStorage = {
  async get(id: string): Promise<CachedMessage | undefined> {
    return get<CachedMessage>("messages", id);
  },

  async getByChannel(
    channelId: string,
    limit?: number,
  ): Promise<CachedMessage[]> {
    const messages = await getByIndex<CachedMessage>(
      "messages",
      "by-channelId",
      channelId,
    );

    // Sort by createdAt descending and limit
    messages.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return limit ? messages.slice(0, limit) : messages;
  },

  async getPending(): Promise<CachedMessage[]> {
    return getByIndex<CachedMessage>("messages", "by-isPending", 1);
  },

  async save(message: CachedMessage): Promise<void> {
    await put("messages", message);
  },

  async saveMany(messages: CachedMessage[]): Promise<void> {
    await putMany("messages", messages);
  },

  async remove(id: string): Promise<void> {
    await remove("messages", id);
  },

  async removeByChannel(channelId: string): Promise<void> {
    const messages = await this.getByChannel(channelId);
    await removeMany(
      "messages",
      messages.map((m) => m.id),
    );
  },

  async clear(): Promise<void> {
    await clear("messages");
  },

  async count(): Promise<number> {
    return count("messages");
  },

  async countByChannel(channelId: string): Promise<number> {
    const messages = await this.getByChannel(channelId);
    return messages.length;
  },
};

// =============================================================================
// User Operations
// =============================================================================

export const userStorage = {
  async get(id: string): Promise<CachedUser | undefined> {
    return get<CachedUser>("users", id);
  },

  async getAll(): Promise<CachedUser[]> {
    return getAll<CachedUser>("users");
  },

  async getByUsername(username: string): Promise<CachedUser | undefined> {
    const users = await getByIndex<CachedUser>(
      "users",
      "by-username",
      username,
    );
    return users[0];
  },

  async getOnline(): Promise<CachedUser[]> {
    return getByIndex<CachedUser>("users", "by-status", "online");
  },

  async save(user: CachedUser): Promise<void> {
    await put("users", { ...user, cachedAt: new Date() });
  },

  async saveMany(users: CachedUser[]): Promise<void> {
    const now = new Date();
    const withTimestamp = users.map((u) => ({ ...u, cachedAt: now }));
    await putMany("users", withTimestamp);
  },

  async remove(id: string): Promise<void> {
    await remove("users", id);
  },

  async clear(): Promise<void> {
    await clear("users");
  },

  async count(): Promise<number> {
    return count("users");
  },
};

// =============================================================================
// Queue Operations
// =============================================================================

export const queueStorage = {
  async get(id: string): Promise<QueuedAction | undefined> {
    return get<QueuedAction>("queue", id);
  },

  async getAll(): Promise<QueuedAction[]> {
    const items = await getAll<QueuedAction>("queue");
    // Sort by priority (high first) then by createdAt (oldest first)
    return items.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  },

  async getPending(): Promise<QueuedAction[]> {
    const items = await getByIndex<QueuedAction>(
      "queue",
      "by-status",
      "pending",
    );
    return items.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  },

  async getByType(type: string): Promise<QueuedAction[]> {
    return getByIndex<QueuedAction>("queue", "by-type", type);
  },

  async getByChannel(channelId: string): Promise<QueuedAction[]> {
    return getByIndex<QueuedAction>("queue", "by-channelId", channelId);
  },

  async add(action: QueuedAction): Promise<void> {
    await put("queue", action);
  },

  async update(id: string, updates: Partial<QueuedAction>): Promise<void> {
    const existing = await this.get(id);
    if (existing) {
      await put("queue", { ...existing, ...updates, updatedAt: new Date() });
    }
  },

  async remove(id: string): Promise<void> {
    await remove("queue", id);
  },

  async removeCompleted(): Promise<void> {
    const completed = await getByIndex<QueuedAction>(
      "queue",
      "by-status",
      "completed",
    );
    await removeMany(
      "queue",
      completed.map((a) => a.id),
    );
  },

  async clear(): Promise<void> {
    await clear("queue");
  },

  async count(): Promise<number> {
    return count("queue");
  },

  async countPending(): Promise<number> {
    const pending = await this.getPending();
    return pending.length;
  },
};

// =============================================================================
// Cache Metadata Operations
// =============================================================================

export const cacheMetaStorage = {
  async get(key: string): Promise<CacheMetadata | undefined> {
    return get<CacheMetadata>("cache_meta", key);
  },

  async set(key: string, metadata: Partial<CacheMetadata>): Promise<void> {
    const existing = await this.get(key);
    const now = new Date();

    await put("cache_meta", {
      key,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      expiresAt: metadata.expiresAt ?? null,
      version: (existing?.version ?? 0) + 1,
      size: metadata.size ?? 0,
      accessCount: (existing?.accessCount ?? 0) + 1,
      lastAccessedAt: now,
    });
  },

  async remove(key: string): Promise<void> {
    await remove("cache_meta", key);
  },

  async getExpired(): Promise<CacheMetadata[]> {
    const all = await getAll<CacheMetadata>("cache_meta");
    const now = Date.now();
    return all.filter(
      (m) => m.expiresAt && new Date(m.expiresAt).getTime() < now,
    );
  },

  async clear(): Promise<void> {
    await clear("cache_meta");
  },
};

// =============================================================================
// Settings Operations
// =============================================================================

export const settingsStorage = {
  async get<T>(key: string): Promise<T | undefined> {
    const result = await get<{ key: string; value: T }>("settings", key);
    return result?.value;
  },

  async set<T>(key: string, value: T): Promise<void> {
    await put("settings", { key, value });
  },

  async remove(key: string): Promise<void> {
    await remove("settings", key);
  },

  async clear(): Promise<void> {
    await clear("settings");
  },
};

// =============================================================================
// Storage Statistics
// =============================================================================

export async function getStorageStats(): Promise<{
  channels: number;
  messages: number;
  users: number;
  queue: number;
  estimatedSize: number;
}> {
  const [channels, messages, users, queue] = await Promise.all([
    channelStorage.count(),
    messageStorage.count(),
    userStorage.count(),
    queueStorage.count(),
  ]);

  // Rough estimate of storage size (this is just an approximation)
  const estimatedSize =
    channels * 500 + // ~500 bytes per channel
    messages * 1000 + // ~1KB per message
    users * 300 + // ~300 bytes per user
    queue * 500; // ~500 bytes per queue item

  return {
    channels,
    messages,
    users,
    queue,
    estimatedSize,
  };
}

// =============================================================================
// Export
// =============================================================================

export { openDatabase, DATABASE_CONFIG };
