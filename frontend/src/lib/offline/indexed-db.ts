/**
 * IndexedDB Wrapper - Low-level IndexedDB operations
 *
 * Provides a Promise-based interface to IndexedDB with support for
 * database initialization, CRUD operations, and migrations.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Database schema definition
 */
export interface DBSchema {
  name: string;
  version: number;
  stores: StoreSchema[];
}

/**
 * Object store schema
 */
export interface StoreSchema {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: IndexSchema[];
}

/**
 * Index schema
 */
export interface IndexSchema {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
  multiEntry?: boolean;
}

/**
 * Default database schema for nchat
 */
export const DB_SCHEMA: DBSchema = {
  name: "nchat-offline",
  version: 1,
  stores: [
    {
      name: "messages",
      keyPath: "id",
      indexes: [
        { name: "channelId", keyPath: "channelId" },
        { name: "createdAt", keyPath: "createdAt" },
        { name: "authorId", keyPath: "authorId" },
      ],
    },
    {
      name: "channels",
      keyPath: "id",
      indexes: [
        { name: "type", keyPath: "type" },
        { name: "updatedAt", keyPath: "updatedAt" },
      ],
    },
    {
      name: "users",
      keyPath: "id",
      indexes: [
        { name: "username", keyPath: "username" },
        { name: "email", keyPath: "email" },
      ],
    },
    {
      name: "syncQueue",
      keyPath: "id",
      indexes: [
        { name: "type", keyPath: "type" },
        { name: "createdAt", keyPath: "createdAt" },
        { name: "status", keyPath: "status" },
      ],
    },
  ],
};

// =============================================================================
// IndexedDB Wrapper Class
// =============================================================================

/**
 * IndexedDBWrapper - Wrapper class for IndexedDB operations
 */
export class IndexedDBWrapper {
  private db: IDBDatabase | null = null;
  private schema: DBSchema;
  private initPromise: Promise<IDBDatabase> | null = null;

  constructor(schema: DBSchema = DB_SCHEMA) {
    this.schema = schema;
  }

  /**
   * Check if IndexedDB is supported
   */
  public static isSupported(): boolean {
    return typeof indexedDB !== "undefined";
  }

  /**
   * Open or create the database
   */
  public async open(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    if (!IndexedDBWrapper.isSupported()) {
      throw new Error("IndexedDB is not supported in this environment");
    }

    this.initPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.schema.name, this.schema.version);

      request.onerror = () => {
        this.initPromise = null;
        reject(
          new Error(
            `Failed to open database: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = () => {
        this.db = request.result;

        this.db.onclose = () => {
          this.db = null;
          this.initPromise = null;
        };

        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
          this.initPromise = null;
        };

        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        this.createStores(database);
      };
    });

    return this.initPromise;
  }

  /**
   * Create object stores during upgrade
   */
  private createStores(database: IDBDatabase): void {
    for (const storeSchema of this.schema.stores) {
      // Delete existing store if it exists
      if (database.objectStoreNames.contains(storeSchema.name)) {
        database.deleteObjectStore(storeSchema.name);
      }

      // Create the object store
      const store = database.createObjectStore(storeSchema.name, {
        keyPath: storeSchema.keyPath,
        autoIncrement: storeSchema.autoIncrement ?? false,
      });

      // Create indexes
      if (storeSchema.indexes) {
        for (const indexSchema of storeSchema.indexes) {
          store.createIndex(indexSchema.name, indexSchema.keyPath, {
            unique: indexSchema.unique ?? false,
            multiEntry: indexSchema.multiEntry ?? false,
          });
        }
      }
    }
  }

  /**
   * Close the database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * Delete the entire database
   */
  public async deleteDatabase(): Promise<void> {
    this.close();

    if (!IndexedDBWrapper.isSupported()) {
      throw new Error("IndexedDB is not supported in this environment");
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.schema.name);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to delete database: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = () => {
        resolve();
      };

      request.onblocked = () => {
        reject(new Error("Database deletion blocked by other connections"));
      };
    });
  }

  /**
   * Check if database is open
   */
  public isOpen(): boolean {
    return this.db !== null;
  }

  /**
   * Get the database instance
   */
  public getDatabase(): IDBDatabase | null {
    return this.db;
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  /**
   * Get a single record by key
   */
  public async get<T>(
    storeName: string,
    key: IDBValidKey,
  ): Promise<T | undefined> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get record: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = () => {
        resolve(request.result as T | undefined);
      };
    });
  }

  /**
   * Get all records from a store
   */
  public async getAll<T>(
    storeName: string,
    query?: IDBKeyRange,
    count?: number,
  ): Promise<T[]> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll(query, count);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get all records: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };
    });
  }

  /**
   * Get records by index
   */
  public async getByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBValidKey | IDBKeyRange,
  ): Promise<T[]> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(query);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get by index: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };
    });
  }

  /**
   * Put a record (insert or update)
   */
  public async put<T>(storeName: string, data: T): Promise<IDBValidKey> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to put record: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Put multiple records in a transaction
   */
  public async putMany<T>(storeName: string, items: T[]): Promise<void> {
    if (items.length === 0) {
      return;
    }

    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      transaction.onerror = () => {
        reject(
          new Error(
            `Failed to put records: ${transaction.error?.message || "Unknown error"}`,
          ),
        );
      };

      transaction.oncomplete = () => {
        resolve();
      };

      for (const item of items) {
        store.put(item);
      }
    });
  }

  /**
   * Add a new record (throws if key exists)
   */
  public async add<T>(storeName: string, data: T): Promise<IDBValidKey> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to add record: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Delete a record by key
   */
  public async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to delete record: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Delete multiple records by keys
   */
  public async deleteMany(
    storeName: string,
    keys: IDBValidKey[],
  ): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      transaction.onerror = () => {
        reject(
          new Error(
            `Failed to delete records: ${transaction.error?.message || "Unknown error"}`,
          ),
        );
      };

      transaction.oncomplete = () => {
        resolve();
      };

      for (const key of keys) {
        store.delete(key);
      }
    });
  }

  /**
   * Clear all records from a store
   */
  public async clear(storeName: string): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => {
        reject(
          new Error(
            `Failed to clear store: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Count records in a store
   */
  public async count(storeName: string, query?: IDBKeyRange): Promise<number> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.count(query);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to count records: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Count records by index
   */
  public async countByIndex(
    storeName: string,
    indexName: string,
    query: IDBValidKey | IDBKeyRange,
  ): Promise<number> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.count(query);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to count by index: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  // ===========================================================================
  // Cursor Operations
  // ===========================================================================

  /**
   * Iterate over records using a cursor
   */
  public async iterate<T>(
    storeName: string,
    callback: (value: T, cursor: IDBCursorWithValue) => void | Promise<void>,
    query?: IDBKeyRange,
    direction?: IDBCursorDirection,
  ): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.openCursor(query, direction);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to iterate: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = async () => {
        const cursor = request.result;
        if (cursor) {
          try {
            await callback(cursor.value as T, cursor);
            cursor.continue();
          } catch (error) {
            reject(error);
          }
        } else {
          resolve();
        }
      };
    });
  }

  /**
   * Iterate over records by index
   */
  public async iterateByIndex<T>(
    storeName: string,
    indexName: string,
    callback: (value: T, cursor: IDBCursorWithValue) => void | Promise<void>,
    query?: IDBValidKey | IDBKeyRange,
    direction?: IDBCursorDirection,
  ): Promise<void> {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.openCursor(query, direction);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to iterate by index: ${request.error?.message || "Unknown error"}`,
          ),
        );
      };

      request.onsuccess = async () => {
        const cursor = request.result;
        if (cursor) {
          try {
            await callback(cursor.value as T, cursor);
            cursor.continue();
          } catch (error) {
            reject(error);
          }
        } else {
          resolve();
        }
      };
    });
  }

  // ===========================================================================
  // Transaction Operations
  // ===========================================================================

  /**
   * Execute a custom transaction
   */
  public async transaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    callback: (transaction: IDBTransaction) => T | Promise<T>,
  ): Promise<T> {
    const db = await this.open();
    const transaction = db.transaction(storeNames, mode);

    return new Promise((resolve, reject) => {
      let result: T;

      transaction.onerror = () => {
        reject(
          new Error(
            `Transaction failed: ${transaction.error?.message || "Unknown error"}`,
          ),
        );
      };

      transaction.oncomplete = () => {
        resolve(result);
      };

      try {
        const maybePromise = callback(transaction);
        if (maybePromise instanceof Promise) {
          maybePromise
            .then((r) => {
              result = r;
            })
            .catch(reject);
        } else {
          result = maybePromise;
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let dbInstance: IndexedDBWrapper | null = null;

/**
 * Get the default IndexedDB instance
 */
export function getIndexedDB(schema?: DBSchema): IndexedDBWrapper {
  if (!dbInstance) {
    dbInstance = new IndexedDBWrapper(schema);
  }
  return dbInstance;
}

/**
 * Reset the default IndexedDB instance
 */
export function resetIndexedDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export default IndexedDBWrapper;
