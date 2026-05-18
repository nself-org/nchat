/**
 * Offline Types - TypeScript type definitions for offline mode functionality
 *
 * Defines types for connection state, offline storage, queued actions,
 * and sync operations.
 */

// =============================================================================
// Connection Types
// =============================================================================

/**
 * Connection state enumeration
 */
export type ConnectionState =
  | "online"
  | "offline"
  | "connecting"
  | "reconnecting"
  | "error";

/**
 * Network quality levels
 */
export type NetworkQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

/**
 * Connection type (from Network Information API)
 */
export type ConnectionType =
  | "wifi"
  | "cellular"
  | "ethernet"
  | "bluetooth"
  | "wimax"
  | "other"
  | "none"
  | "unknown";

/**
 * Effective connection type (from Network Information API)
 */
export type EffectiveConnectionType =
  | "slow-2g"
  | "2g"
  | "3g"
  | "4g"
  | "unknown";

/**
 * Connection information
 */
export interface ConnectionInfo {
  state: ConnectionState;
  quality: NetworkQuality;
  type: ConnectionType;
  effectiveType: EffectiveConnectionType;
  downlink: number | null; // Mbps
  rtt: number | null; // Round-trip time in ms
  saveData: boolean;
  lastOnline: Date | null;
  lastOffline: Date | null;
  offlineDuration: number | null; // ms since offline
}

/**
 * Socket connection state
 */
export interface SocketConnectionState {
  connected: boolean;
  socketId: string | null;
  reconnectAttempts: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  disconnectReason: string | null;
}

// =============================================================================
// Offline Queue Types
// =============================================================================

/**
 * Type of queued action
 */
export type QueuedActionType =
  | "send_message"
  | "edit_message"
  | "delete_message"
  | "add_reaction"
  | "remove_reaction"
  | "mark_read"
  | "update_typing"
  | "join_channel"
  | "leave_channel"
  | "create_channel"
  | "update_presence"
  | "upload_file";

/**
 * Priority levels for queued actions
 */
export type QueuePriority = "high" | "normal" | "low";

/**
 * Status of a queued action
 */
export type QueueItemStatus = "pending" | "processing" | "failed" | "completed";

/**
 * Base queued action interface
 */
export interface QueuedAction<T = unknown> {
  id: string;
  type: QueuedActionType;
  payload: T;
  priority: QueuePriority;
  status: QueueItemStatus;
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  channelId?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Queued message action
 */
export interface QueuedSendMessage {
  channelId: string;
  content: string;
  replyToId?: string;
  attachments?: QueuedAttachment[];
  tempId: string; // Temporary ID for optimistic UI
}

export interface QueuedEditMessage {
  channelId: string;
  messageId: string;
  content: string;
}

export interface QueuedDeleteMessage {
  channelId: string;
  messageId: string;
}

export interface QueuedReaction {
  channelId: string;
  messageId: string;
  emoji: string;
}

export interface QueuedAttachment {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  dataUrl?: string; // For preview
}

// =============================================================================
// Cache Types
// =============================================================================

/**
 * Cache entry metadata
 */
export interface CacheMetadata {
  key: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  version: number;
  size: number;
  accessCount: number;
  lastAccessedAt: Date;
}

/**
 * Cached channel data
 */
export interface CachedChannel {
  id: string;
  name: string;
  type: "public" | "private" | "direct";
  description?: string;
  memberCount: number;
  unreadCount: number;
  lastMessageAt: Date | null;
  cachedAt: Date;
}

/**
 * Cached message data
 */
export interface CachedMessage {
  id: string;
  channelId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  createdAt: Date;
  updatedAt?: Date;
  replyToId?: string;
  reactions: CachedReaction[];
  attachments: CachedAttachmentMeta[];
  isPending?: boolean; // True if message is queued for sending
  tempId?: string; // Temporary ID for pending messages
}

export interface CachedReaction {
  emoji: string;
  count: number;
  userIds: string[];
  hasReacted: boolean;
}

export interface CachedAttachmentMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  thumbnailUrl?: string;
}

/**
 * Cached user data
 */
export interface CachedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: "online" | "away" | "busy" | "offline";
  lastSeenAt?: Date;
  cachedAt: Date;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  channelCount: number;
  messageCount: number;
  userCount: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  hitRate: number;
  missRate: number;
}

// =============================================================================
// Sync Types
// =============================================================================

/**
 * Sync operation type
 */
export type SyncOperationType =
  | "full_sync"
  | "incremental_sync"
  | "channel_sync"
  | "message_sync"
  | "user_sync"
  | "queue_flush";

/**
 * Sync status
 */
export type SyncStatus =
  | "idle"
  | "syncing"
  | "completed"
  | "failed"
  | "partial";

/**
 * Sync operation state
 */
export interface SyncState {
  status: SyncStatus;
  operation: SyncOperationType | null;
  progress: number; // 0-100
  itemsProcessed: number;
  itemsTotal: number;
  lastSyncAt: Date | null;
  lastSuccessfulSyncAt: Date | null;
  error: string | null;
  pendingChanges: number;
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  operation: SyncOperationType;
  itemsSynced: number;
  itemsFailed: number;
  errors: SyncError[];
  duration: number;
  timestamp: Date;
}

/**
 * Sync error
 */
export interface SyncError {
  itemId: string;
  itemType: string;
  operation: string;
  error: string;
  timestamp: Date;
}

// =============================================================================
// IndexedDB Schema Types
// =============================================================================

/**
 * Database store names
 */
export type StoreName =
  | "channels"
  | "messages"
  | "users"
  | "queue"
  | "cache_meta"
  | "attachments"
  | "settings";

/**
 * Database configuration
 */
export interface DatabaseConfig {
  name: string;
  version: number;
  stores: StoreConfig[];
}

/**
 * Store configuration
 */
export interface StoreConfig {
  name: StoreName;
  keyPath: string;
  indexes: IndexConfig[];
}

/**
 * Index configuration
 */
export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
  multiEntry?: boolean;
}

// =============================================================================
// Retry Configuration
// =============================================================================

/**
 * Retry strategy
 */
export type RetryStrategy = "exponential" | "linear" | "fixed";

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  strategy: RetryStrategy;
  factor: number; // For exponential backoff
  jitter: boolean; // Add randomness to delays
  retryOn: number[]; // HTTP status codes to retry on
}

/**
 * Retry state for an operation
 */
export interface RetryState {
  attempt: number;
  nextRetryAt: Date | null;
  lastError: string | null;
  shouldRetry: boolean;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Offline event types
 */
export type OfflineEventType =
  | "connection_change"
  | "queue_item_added"
  | "queue_item_processed"
  | "queue_item_failed"
  | "sync_started"
  | "sync_completed"
  | "sync_failed"
  | "cache_updated"
  | "cache_cleared"
  | "storage_warning";

/**
 * Offline event
 */
export interface OfflineEvent<T = unknown> {
  type: OfflineEventType;
  payload: T;
  timestamp: Date;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Offline mode configuration
 */
export interface OfflineConfig {
  // Cache settings
  cacheEnabled: boolean;
  maxCacheSize: number; // bytes
  maxCacheAge: number; // ms
  cacheChannelMessages: number; // Max messages per channel
  cacheChannels: number; // Max channels to cache

  // Queue settings
  queueEnabled: boolean;
  maxQueueSize: number;
  maxQueueAge: number; // ms

  // Sync settings
  autoSync: boolean;
  syncInterval: number; // ms
  syncOnReconnect: boolean;
  backgroundSync: boolean;

  // Retry settings
  retry: RetryConfig;

  // Network settings
  networkCheckInterval: number; // ms
  networkCheckUrl: string;

  // Storage settings
  storageWarningThreshold: number; // bytes
  storageCriticalThreshold: number; // bytes
}

/**
 * Default offline configuration
 */
export const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
  cacheEnabled: true,
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  cacheChannelMessages: 100,
  cacheChannels: 50,

  queueEnabled: true,
  maxQueueSize: 100,
  maxQueueAge: 24 * 60 * 60 * 1000, // 24 hours

  autoSync: true,
  syncInterval: 30 * 1000, // 30 seconds
  syncOnReconnect: true,
  backgroundSync: true,

  retry: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    strategy: "exponential",
    factor: 2,
    jitter: true,
    retryOn: [408, 429, 500, 502, 503, 504],
  },

  networkCheckInterval: 10000,
  networkCheckUrl: "/api/health",

  storageWarningThreshold: 40 * 1024 * 1024, // 40MB
  storageCriticalThreshold: 48 * 1024 * 1024, // 48MB
};
