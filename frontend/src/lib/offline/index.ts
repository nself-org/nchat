/**
 * Offline Module - Central export for all offline functionality
 *
 * Provides offline mode support including:
 * - Network detection
 * - Connection management
 * - Offline storage (IndexedDB)
 * - Cache management
 * - Action queue
 * - Sync management
 * - Retry logic
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Connection types
  ConnectionState,
  NetworkQuality,
  ConnectionType,
  EffectiveConnectionType,
  ConnectionInfo,
  SocketConnectionState,

  // Queue types
  QueuedActionType,
  QueuePriority,
  QueueItemStatus,
  QueuedAction,
  QueuedSendMessage,
  QueuedEditMessage,
  QueuedDeleteMessage,
  QueuedReaction,
  QueuedAttachment,

  // Cache types
  CacheMetadata,
  CachedChannel,
  CachedMessage,
  CachedReaction,
  CachedAttachmentMeta,
  CachedUser,
  CacheStats,

  // Sync types
  SyncOperationType,
  SyncStatus,
  SyncState,
  SyncResult,
  SyncError,

  // Storage types
  StoreName,
  DatabaseConfig,
  StoreConfig,
  IndexConfig,

  // Retry types
  RetryStrategy,
  RetryConfig,
  RetryState,

  // Event types
  OfflineEventType,
  OfflineEvent,

  // Config types
  OfflineConfig,
} from "./offline-types";

export { DEFAULT_OFFLINE_CONFIG } from "./offline-types";

// =============================================================================
// Network Detection
// =============================================================================

export {
  NetworkDetector,
  getNetworkDetector,
  cleanupNetworkDetector,
  formatOfflineDuration,
  getConnectionStateText,
  getNetworkQualityText,
  type NetworkChangeListener,
} from "./network-detector";

// =============================================================================
// Connection Management
// =============================================================================

export {
  ConnectionManager,
  getConnectionManager,
  initializeConnectionManager,
  cleanupConnectionManager,
  type CombinedConnectionState,
  type ConnectionStateListener,
  type ConnectionManagerOptions,
} from "./connection-manager";

// =============================================================================
// Retry Management
// =============================================================================

export {
  RetryManager,
  createRetryManager,
  withRetry,
  makeRetryable,
  sleep,
  calculateRetryDelay,
  formatRetryDelay,
  type RetryResult,
  type RetryOperation,
  type RetryCondition,
  type RetryProgressCallback,
  type RetryOptions,
} from "./retry-manager";

// =============================================================================
// Offline Storage
// =============================================================================

export {
  // Database
  openDatabase,
  closeDatabase,
  deleteDatabase,
  DATABASE_CONFIG,

  // Generic operations
  get,
  getAll,
  getByIndex,
  put,
  putMany,
  remove,
  removeMany,
  clear,
  count,

  // Typed storage
  channelStorage,
  messageStorage,
  userStorage,
  queueStorage,
  cacheMetaStorage,
  settingsStorage,

  // Stats
  getStorageStats,
} from "./offline-storage";

// =============================================================================
// Offline Cache
// =============================================================================

export {
  OfflineCache,
  getOfflineCache,
  initializeOfflineCache,
  cleanupOfflineCache,
  type CacheEventType,
  type CacheEventListener,
} from "./offline-cache";

// =============================================================================
// Offline Queue
// =============================================================================

export {
  OfflineQueue,
  getOfflineQueue,
  initializeOfflineQueue,
  cleanupOfflineQueue,
  type QueueEventType,
  type QueueEventListener,
  type ActionProcessor,
} from "./offline-queue";

// =============================================================================
// Offline Sync
// =============================================================================

export {
  OfflineSync,
  getOfflineSync,
  initializeOfflineSync,
  cleanupOfflineSync,
  type SyncEventType,
  type SyncEventListener,
  type DataFetchers,
  type SyncOptions,
} from "./offline-sync";

// =============================================================================
// Sync Manager (v0.8.0)
// =============================================================================

export {
  SyncManager,
  getSyncManager,
  resetSyncManager,
  type SyncManagerConfig,
  type SyncProgress,
  type SyncEvent,
  type SyncEventListener as SyncManagerEventListener,
} from "./sync-manager";

// =============================================================================
// Conflict Resolution (v0.8.0)
// =============================================================================

export {
  ConflictResolver,
  TombstoneStore,
  getConflictResolver,
  getTombstoneStore,
  resetConflictResolver,
  resetTombstoneStore,
  type Conflict,
  type ConflictType,
  type ResolutionStrategy,
  type ConflictResolution,
  type Tombstone,
  type UserChoiceCallback,
} from "./conflict-resolver";

// =============================================================================
// Attachment Cache (v0.8.0)
// =============================================================================

export {
  AttachmentCache,
  getAttachmentCache,
  resetAttachmentCache,
  type CachedAttachment,
  type AttachmentCacheConfig,
  type AttachmentCacheStats,
  type DownloadProgress,
  type DownloadProgressCallback,
} from "./attachment-cache";

// =============================================================================
// Sync Queue (v0.8.0)
// =============================================================================

export {
  SyncQueue,
  getSyncQueue,
  resetSyncQueue,
  type SyncQueueConfig,
  type SyncQueueItem,
  type SyncResult as SyncQueueResult,
  type SyncProcessor,
  type SyncItemType,
  type SyncItemOperation,
  type SyncItemStatus,
} from "./sync-queue";

// =============================================================================
// Reconciliation Manager (v0.9.0)
// =============================================================================

export {
  ReconciliationManager,
  getReconciliationManager,
  resetReconciliationManager,
  type PendingOperation,
  type ConflictInfo,
  type ReconciliationEvent,
  type ReconciliationEventType,
  type ReconciliationEventListener,
  type ReconciliationConfig,
} from "./reconciliation-manager";

// =============================================================================
// Optimistic Updates (v0.9.0)
// =============================================================================

export {
  OptimisticUpdatesManager,
  MessageOptimisticUpdates,
  getMessageOptimisticUpdates,
  resetMessageOptimisticUpdates,
  type OptimisticUpdate,
  type OptimisticState,
  type PendingMessageData,
  type RollbackCallback,
  type ConfirmCallback,
  type UpdateCallbacks,
  type OptimisticUpdatesOptions,
} from "./optimistic-updates";

// =============================================================================
// Storage Quota Manager (v0.9.0)
// =============================================================================

export {
  StorageQuotaManager,
  getStorageQuotaManager,
  resetStorageQuotaManager,
  type StorageStats,
  type StorageStatus,
  type EvictionResult,
  type StorageEvent,
  type StorageEventType,
  type StorageEventListener,
  type StorageQuotaOptions,
} from "./storage-quota-manager";

// =============================================================================
// Initialization Helper
// =============================================================================

import {
  initializeConnectionManager,
  cleanupConnectionManager,
} from "./connection-manager";
import { initializeOfflineCache, cleanupOfflineCache } from "./offline-cache";
import { initializeOfflineQueue, cleanupOfflineQueue } from "./offline-queue";
import {
  initializeOfflineSync,
  cleanupOfflineSync,
  type DataFetchers,
} from "./offline-sync";
import type { OfflineConfig } from "./offline-types";
import type { ConnectionManagerOptions } from "./connection-manager";

export interface OfflineSystemOptions {
  config?: Partial<OfflineConfig>;
  connectionOptions?: Partial<ConnectionManagerOptions>;
  fetchers?: DataFetchers;
  token?: string;
}

/**
 * Initialize the complete offline system
 */
export function initializeOfflineSystem(
  options: OfflineSystemOptions = {},
): void {
  // Initialize connection manager
  initializeConnectionManager(options.token, options.connectionOptions);

  // Initialize cache
  initializeOfflineCache(options.config);

  // Initialize queue
  initializeOfflineQueue(options.config);

  // Initialize sync (if fetchers provided)
  if (options.fetchers) {
    initializeOfflineSync(options.fetchers);
  }
}

/**
 * Cleanup the complete offline system
 */
export function cleanupOfflineSystem(): void {
  cleanupOfflineSync();
  cleanupOfflineQueue();
  cleanupOfflineCache();
  cleanupConnectionManager();
}
