/**
 * Storage Adapter Module
 *
 * Provides a unified storage interface across platforms.
 * Supports web (localStorage/IndexedDB), mobile (Capacitor Preferences),
 * and desktop (Electron Store) storage backends.
 */

import {
  Platform,
  detectPlatform,
  hasLocalStorage,
  hasIndexedDB,
  isBrowser,
} from "./platform-detector";

// ============================================================================
// Types
// ============================================================================

/**
 * Storage adapter interface
 */
export interface StorageAdapter {
  /** Get a value by key */
  get<T>(key: string): Promise<T | null>;
  /** Set a value by key */
  set<T>(key: string, value: T): Promise<void>;
  /** Remove a value by key */
  remove(key: string): Promise<void>;
  /** Clear all stored values */
  clear(): Promise<void>;
  /** Get all keys */
  keys(): Promise<string[]>;
  /** Check if key exists */
  has(key: string): Promise<boolean>;
  /** Get storage size in bytes (if available) */
  size?(): Promise<number>;
}

/**
 * Storage backend type
 */
export type StorageBackend =
  | "localStorage"
  | "indexedDB"
  | "capacitor"
  | "electron"
  | "tauri"
  | "memory";

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Preferred storage backend */
  backend?: StorageBackend;
  /** Namespace prefix for keys */
  namespace?: string;
  /** Database name for IndexedDB */
  dbName?: string;
  /** Store name for IndexedDB */
  storeName?: string;
  /** Enable encryption (if supported by backend) */
  encrypt?: boolean;
}

/**
 * Storage window properties (used with type intersection, not extension)
 */
interface StorageWindowExtras {
  Capacitor?: {
    isNativePlatform: () => boolean;
    Plugins?: {
      Preferences?: {
        get: (opts: { key: string }) => Promise<{ value: string | null }>;
        set: (opts: { key: string; value: string }) => Promise<void>;
        remove: (opts: { key: string }) => Promise<void>;
        clear: () => Promise<void>;
        keys: () => Promise<{ keys: string[] }>;
      };
    };
  };
  electron?: {
    store?: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<void>;
      delete: (key: string) => Promise<void>;
      clear: () => Promise<void>;
      keys: () => Promise<string[]>;
      has: (key: string) => Promise<boolean>;
    };
  };
  __TAURI__?: {
    core: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
    event: {
      listen: <T>(
        event: string,
        handler: (event: { payload: T }) => void,
      ) => Promise<() => void>;
      emit: (event: string, payload?: unknown) => Promise<void>;
    };
    tauri?: {
      path: {
        appDir: () => Promise<string>;
      };
    };
  };
}

type StorageWindow = Window & StorageWindowExtras;

// ============================================================================
// Web Storage Adapter (localStorage)
// ============================================================================

/**
 * localStorage-based storage adapter for web
 */
export class WebStorageAdapter implements StorageAdapter {
  private namespace: string;

  constructor(namespace: string = "nchat") {
    this.namespace = namespace;
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!hasLocalStorage()) {
      return null;
    }

    try {
      const value = localStorage.getItem(this.getKey(key));
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!hasLocalStorage()) {
      throw new Error("localStorage is not available");
    }

    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      if (error instanceof Error && error.name === "QuotaExceededError") {
        throw new Error("Storage quota exceeded");
      }
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    if (!hasLocalStorage()) {
      return;
    }

    localStorage.removeItem(this.getKey(key));
  }

  async clear(): Promise<void> {
    if (!hasLocalStorage()) {
      return;
    }

    const prefix = `${this.namespace}:`;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  async keys(): Promise<string[]> {
    if (!hasLocalStorage()) {
      return [];
    }

    const prefix = `${this.namespace}:`;
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    }

    return keys;
  }

  async has(key: string): Promise<boolean> {
    if (!hasLocalStorage()) {
      return false;
    }

    return localStorage.getItem(this.getKey(key)) !== null;
  }

  async size(): Promise<number> {
    if (!hasLocalStorage()) {
      return 0;
    }

    const prefix = `${this.namespace}:`;
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }

    return totalSize * 2; // UTF-16 uses 2 bytes per character
  }
}

// ============================================================================
// IndexedDB Storage Adapter
// ============================================================================

/**
 * IndexedDB-based storage adapter for web
 */
export class IndexedDBStorageAdapter implements StorageAdapter {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(
    dbName: string = "nchat-storage",
    storeName: string = "keyvalue",
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (!hasIndexedDB()) {
        reject(new Error("IndexedDB is not available"));
        return;
      }

      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(
    mode: IDBTransactionMode = "readonly",
  ): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const transaction = this.db.transaction(this.storeName, mode);
    return transaction.objectStore(this.storeName);
  }

  async get<T>(key: string): Promise<T | null> {
    const store = await this.getStore("readonly");

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    const store = await this.getStore("readwrite");

    return new Promise((resolve, reject) => {
      const request = store.put(value, key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async remove(key: string): Promise<void> {
    const store = await this.getStore("readwrite");

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    const store = await this.getStore("readwrite");

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async keys(): Promise<string[]> {
    const store = await this.getStore("readonly");

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  }

  async has(key: string): Promise<boolean> {
    const store = await this.getStore("readonly");

    return new Promise((resolve, reject) => {
      const request = store.count(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result > 0);
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// ============================================================================
// Capacitor Storage Adapter
// ============================================================================

/**
 * Capacitor Preferences-based storage adapter for mobile
 */
export class CapacitorStorageAdapter implements StorageAdapter {
  private namespace: string;

  constructor(namespace: string = "nchat") {
    this.namespace = namespace;
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private getPreferences():
    | NonNullable<
        NonNullable<StorageWindow["Capacitor"]>["Plugins"]
      >["Preferences"]
    | null {
    const win =
      typeof window !== "undefined" ? (window as StorageWindow) : null;
    return win?.Capacitor?.Plugins?.Preferences ?? null;
  }

  async get<T>(key: string): Promise<T | null> {
    const Preferences = this.getPreferences();
    if (!Preferences) {
      return null;
    }

    try {
      const { value } = await Preferences.get({ key: this.getKey(key) });
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const Preferences = this.getPreferences();
    if (!Preferences) {
      throw new Error("Capacitor Preferences is not available");
    }

    await Preferences.set({
      key: this.getKey(key),
      value: JSON.stringify(value),
    });
  }

  async remove(key: string): Promise<void> {
    const Preferences = this.getPreferences();
    if (!Preferences) {
      return;
    }

    await Preferences.remove({ key: this.getKey(key) });
  }

  async clear(): Promise<void> {
    const Preferences = this.getPreferences();
    if (!Preferences) {
      return;
    }

    // Get all keys and remove those with our namespace
    const { keys } = await Preferences.keys();
    const prefix = `${this.namespace}:`;

    for (const key of keys) {
      if (key.startsWith(prefix)) {
        await Preferences.remove({ key });
      }
    }
  }

  async keys(): Promise<string[]> {
    const Preferences = this.getPreferences();
    if (!Preferences) {
      return [];
    }

    const { keys } = await Preferences.keys();
    const prefix = `${this.namespace}:`;

    return keys
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.substring(prefix.length));
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
}

// ============================================================================
// Electron Storage Adapter
// ============================================================================

/**
 * Electron Store-based storage adapter for desktop
 */
export class ElectronStorageAdapter implements StorageAdapter {
  private namespace: string;

  constructor(namespace: string = "nchat") {
    this.namespace = namespace;
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private getStore(): NonNullable<StorageWindow["electron"]>["store"] | null {
    const win =
      typeof window !== "undefined" ? (window as StorageWindow) : null;
    return win?.electron?.store ?? null;
  }

  async get<T>(key: string): Promise<T | null> {
    const store = this.getStore();
    if (!store) {
      return null;
    }

    try {
      const value = await store.get(this.getKey(key));
      return value as T | null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const store = this.getStore();
    if (!store) {
      throw new Error("Electron store is not available");
    }

    await store.set(this.getKey(key), value);
  }

  async remove(key: string): Promise<void> {
    const store = this.getStore();
    if (!store) {
      return;
    }

    await store.delete(this.getKey(key));
  }

  async clear(): Promise<void> {
    const store = this.getStore();
    if (!store) {
      return;
    }

    const keys = await store.keys();
    const prefix = `${this.namespace}:`;

    for (const key of keys) {
      if (key.startsWith(prefix)) {
        await store.delete(key);
      }
    }
  }

  async keys(): Promise<string[]> {
    const store = this.getStore();
    if (!store) {
      return [];
    }

    const allKeys = await store.keys();
    const prefix = `${this.namespace}:`;

    return allKeys
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.substring(prefix.length));
  }

  async has(key: string): Promise<boolean> {
    const store = this.getStore();
    if (!store) {
      return false;
    }

    return store.has(this.getKey(key));
  }
}

// ============================================================================
// Tauri Storage Adapter
// ============================================================================

/**
 * Tauri-based storage adapter for desktop
 */
export class TauriStorageAdapter implements StorageAdapter {
  private namespace: string;

  constructor(namespace: string = "nchat") {
    this.namespace = namespace;
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private getTauriInvoke():
    | ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>)
    | null {
    const win =
      typeof window !== "undefined" ? (window as StorageWindow) : null;
    return win?.__TAURI__?.core?.invoke ?? null;
  }

  async get<T>(key: string): Promise<T | null> {
    const invoke = this.getTauriInvoke();
    if (!invoke) {
      return null;
    }

    try {
      const value = await invoke("plugin:store|get", { key: this.getKey(key) });
      if (value === null || value === undefined) {
        return null;
      }
      return value as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const invoke = this.getTauriInvoke();
    if (!invoke) {
      throw new Error("Tauri is not available");
    }

    await invoke("plugin:store|set", { key: this.getKey(key), value });
  }

  async remove(key: string): Promise<void> {
    const invoke = this.getTauriInvoke();
    if (!invoke) {
      return;
    }

    await invoke("plugin:store|delete", { key: this.getKey(key) });
  }

  async clear(): Promise<void> {
    const invoke = this.getTauriInvoke();
    if (!invoke) {
      return;
    }

    const keys = await this.keys();
    for (const key of keys) {
      await this.remove(key);
    }
  }

  async keys(): Promise<string[]> {
    const invoke = this.getTauriInvoke();
    if (!invoke) {
      return [];
    }

    try {
      const allKeys = (await invoke("plugin:store|keys")) as string[];
      const prefix = `${this.namespace}:`;

      return allKeys
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.substring(prefix.length));
    } catch {
      return [];
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
}

// ============================================================================
// Memory Storage Adapter
// ============================================================================

/**
 * In-memory storage adapter (for testing or SSR)
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, unknown> = new Map();
  private namespace: string;

  constructor(namespace: string = "nchat") {
    this.namespace = namespace;
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.storage.get(this.getKey(key));
    return (value as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.storage.set(this.getKey(key), value);
  }

  async remove(key: string): Promise<void> {
    this.storage.delete(this.getKey(key));
  }

  async clear(): Promise<void> {
    const prefix = `${this.namespace}:`;
    for (const key of this.storage.keys()) {
      if (key.startsWith(prefix)) {
        this.storage.delete(key);
      }
    }
  }

  async keys(): Promise<string[]> {
    const prefix = `${this.namespace}:`;
    const keys: string[] = [];

    for (const key of this.storage.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    }

    return keys;
  }

  async has(key: string): Promise<boolean> {
    return this.storage.has(this.getKey(key));
  }

  async size(): Promise<number> {
    const prefix = `${this.namespace}:`;
    let totalSize = 0;

    for (const [key, value] of this.storage.entries()) {
      if (key.startsWith(prefix)) {
        totalSize += key.length + JSON.stringify(value).length;
      }
    }

    return totalSize * 2;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Detect the best storage backend for the current platform
 */
export function detectStorageBackend(): StorageBackend {
  const platform = detectPlatform();

  switch (platform) {
    case Platform.ELECTRON:
      return "electron";
    case Platform.TAURI:
      return "tauri";
    case Platform.IOS:
    case Platform.ANDROID:
      // Check if Capacitor is available
      const win =
        typeof window !== "undefined" ? (window as StorageWindow) : null;
      if (win?.Capacitor?.Plugins?.Preferences) {
        return "capacitor";
      }
      // Fallback to localStorage
      return hasLocalStorage() ? "localStorage" : "memory";
    case Platform.WEB:
    default:
      if (hasIndexedDB()) {
        return "indexedDB";
      }
      if (hasLocalStorage()) {
        return "localStorage";
      }
      return "memory";
  }
}

/**
 * Create a storage adapter based on configuration
 */
export function createStorageAdapter(
  config: StorageConfig = {},
): StorageAdapter {
  const backend = config.backend ?? detectStorageBackend();
  const namespace = config.namespace ?? "nchat";

  switch (backend) {
    case "localStorage":
      return new WebStorageAdapter(namespace);
    case "indexedDB":
      return new IndexedDBStorageAdapter(config.dbName, config.storeName);
    case "capacitor":
      return new CapacitorStorageAdapter(namespace);
    case "electron":
      return new ElectronStorageAdapter(namespace);
    case "tauri":
      return new TauriStorageAdapter(namespace);
    case "memory":
    default:
      return new MemoryStorageAdapter(namespace);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultAdapter: StorageAdapter | null = null;

/**
 * Get the default storage adapter
 */
export function getStorageAdapter(config?: StorageConfig): StorageAdapter {
  if (!defaultAdapter || config) {
    defaultAdapter = createStorageAdapter(config);
  }
  return defaultAdapter;
}

/**
 * Reset the default storage adapter
 */
export function resetStorageAdapter(): void {
  defaultAdapter = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get a value from storage
 */
export async function storageGet<T>(key: string): Promise<T | null> {
  return getStorageAdapter().get<T>(key);
}

/**
 * Set a value in storage
 */
export async function storageSet<T>(key: string, value: T): Promise<void> {
  return getStorageAdapter().set(key, value);
}

/**
 * Remove a value from storage
 */
export async function storageRemove(key: string): Promise<void> {
  return getStorageAdapter().remove(key);
}

/**
 * Clear all values from storage
 */
export async function storageClear(): Promise<void> {
  return getStorageAdapter().clear();
}

/**
 * Check if key exists in storage
 */
export async function storageHas(key: string): Promise<boolean> {
  return getStorageAdapter().has(key);
}

/**
 * Get all keys from storage
 */
export async function storageKeys(): Promise<string[]> {
  return getStorageAdapter().keys();
}

// ============================================================================
// Exports
// ============================================================================

export const Storage = {
  // Adapters
  WebStorageAdapter,
  IndexedDBStorageAdapter,
  CapacitorStorageAdapter,
  ElectronStorageAdapter,
  TauriStorageAdapter,
  MemoryStorageAdapter,

  // Factory
  createStorageAdapter,
  detectStorageBackend,
  getStorageAdapter,
  resetStorageAdapter,

  // Convenience functions
  get: storageGet,
  set: storageSet,
  remove: storageRemove,
  clear: storageClear,
  has: storageHas,
  keys: storageKeys,
};

export default Storage;
