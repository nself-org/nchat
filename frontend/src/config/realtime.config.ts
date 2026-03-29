/**
 * Realtime Configuration
 *
 * Central configuration for the realtime system including connection settings,
 * feature flags, and service configurations.
 *
 * @module config/realtime
 * @version 1.0.0
 */

// ============================================================================
// Connection Configuration
// ============================================================================

/**
 * Get realtime server URL from environment
 */
function getRealtimeUrl(): string {
  if (typeof window === 'undefined') {
    return (
      process.env.NEXT_PUBLIC_REALTIME_URL ||
      process.env.NEXT_PUBLIC_REALTIME_WS_URL ||
      'http://realtime.localhost:3101'
    )
  }
  return (
    process.env.NEXT_PUBLIC_REALTIME_URL ||
    process.env.NEXT_PUBLIC_REALTIME_WS_URL ||
    'http://realtime.localhost:3101'
  )
}

/**
 * Realtime connection configuration
 */
export const REALTIME_CONNECTION = {
  /** Server URL */
  url: getRealtimeUrl(),

  /** Socket.io transports */
  transports: ['websocket', 'polling'] as const,

  /** Auto-reconnection */
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,

  /** Connection timeout */
  timeout: 20000,

  /** Debug mode */
  debug: process.env.NODE_ENV === 'development',
}

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Feature flags for realtime system
 */
export const REALTIME_FEATURES = {
  /** Enable user presence tracking */
  presence: process.env.NEXT_PUBLIC_FEATURE_USER_PRESENCE !== 'false',

  /** Enable typing indicators */
  typing: process.env.NEXT_PUBLIC_FEATURE_TYPING_INDICATORS !== 'false',

  /** Enable delivery receipts */
  deliveryReceipts: process.env.NEXT_PUBLIC_FEATURE_DELIVERY_RECEIPTS !== 'false',

  /** Enable offline message queue */
  offlineQueue: process.env.NEXT_PUBLIC_FEATURE_OFFLINE_QUEUE !== 'false',

  /** Enable auto-sync on reconnection */
  autoSync: process.env.NEXT_PUBLIC_FEATURE_AUTO_SYNC !== 'false',
}

// ============================================================================
// Service Configurations
// ============================================================================

/**
 * Presence service configuration
 */
export const PRESENCE_CONFIG = {
  /** Heartbeat interval (30 seconds) */
  heartbeatInterval: 30000,

  /** Idle timeout (5 minutes) */
  idleTimeout: 5 * 60 * 1000,

  /** Enable automatic idle detection */
  enableIdleDetection: true,

  /** Enable privacy filtering */
  enablePrivacyFiltering: true,

  /** GraphQL endpoint for presence settings */
  graphqlEndpoint: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://api.localhost/v1/graphql',

  /** Debug mode */
  debug: process.env.NODE_ENV === 'development',
}

/**
 * Typing service configuration
 */
export const TYPING_CONFIG = {
  /** Typing indicator timeout (5 seconds) */
  typingTimeout: 5000,

  /** Debounce interval for input changes (300ms) */
  debounceInterval: 300,

  /** Throttle interval for server emissions (1 second) */
  throttleInterval: 1000,

  /** Enable privacy filtering */
  enablePrivacyFiltering: true,

  /** Batch update interval (500ms) */
  batchUpdateInterval: 500,

  /** Debug mode */
  debug: process.env.NODE_ENV === 'development',
}

/**
 * Delivery receipts configuration
 */
export const DELIVERY_CONFIG = {
  /** Auto-sync on reconnect */
  autoSyncOnReconnect: true,

  /** Batch read acknowledgements */
  batchReadAck: true,

  /** Batch read interval (1 second) */
  batchReadInterval: 1000,

  /** Debug mode */
  debug: process.env.NODE_ENV === 'development',
}

/**
 * Offline queue configuration
 */
export const OFFLINE_QUEUE_CONFIG = {
  /** Maximum queue size */
  maxQueueSize: 100,

  /** Maximum retry attempts per message */
  maxRetries: 5,

  /** Base retry delay (1 second) */
  baseRetryDelay: 1000,

  /** Maximum retry delay (30 seconds) */
  maxRetryDelay: 30000,

  /** LocalStorage key */
  storageKey: 'nchat:offline-queue',

  /** Debug mode */
  debug: process.env.NODE_ENV === 'development',
}

/**
 * Sync service configuration
 */
export const SYNC_CONFIG = {
  /** Maximum messages to sync per channel */
  maxMessagesPerChannel: 50,

  /** Auto-sync on reconnection */
  autoSyncOnReconnect: true,

  /** Sync timeout (30 seconds) */
  syncTimeout: 30000,

  /** LocalStorage key for sync state */
  storageKey: 'nchat:sync-state',

  /** Debug mode */
  debug: process.env.NODE_ENV === 'development',
}

/**
 * Rooms service configuration
 */
export const ROOMS_CONFIG = {
  /** Enable automatic room joining on channel navigation */
  autoJoinOnNavigate: true,

  /** Leave rooms automatically when navigating away */
  autoLeaveOnNavigate: false,

  /** Cache room data locally */
  cacheRoomData: true,

  /** Debug mode */
  debug: process.env.NODE_ENV === 'development',
}

// ============================================================================
// Default Privacy Settings
// ============================================================================

/**
 * Default presence privacy settings for new users
 */
export const DEFAULT_PRESENCE_PRIVACY = {
  visibility: 'everyone' as const,
  showLastSeen: true,
  showOnlineStatus: true,
  allowReadReceipts: true,
  invisibleMode: false,
}

/**
 * Default typing privacy settings for new users
 */
export const DEFAULT_TYPING_PRIVACY = {
  broadcastTyping: true,
  typingVisibility: 'everyone' as const,
}

// ============================================================================
// Event Names
// ============================================================================

/**
 * Socket event names used by the realtime system
 */
export const REALTIME_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  ERROR: 'error',

  // Authentication events
  AUTH: 'auth',
  AUTH_SUCCESS: 'auth:success',
  AUTH_ERROR: 'auth:error',

  // Message events
  MESSAGE_NEW: 'message:new',
  MESSAGE_UPDATE: 'message:update',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_SENT_ACK: 'message:sent_ack',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ_BY: 'message:read_by',
  MESSAGE_FAILED: 'message:failed',

  // Presence events
  PRESENCE_UPDATE: 'presence:update',
  PRESENCE_CHANGED: 'presence:changed',
  PRESENCE_SUBSCRIBE: 'presence:subscribe',
  PRESENCE_UNSUBSCRIBE: 'presence:unsubscribe',
  PRESENCE_BULK: 'presence:bulk',

  // Typing events
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  TYPING_EVENT: 'typing:event',
  TYPING_BATCH: 'typing:batch',

  // Room events
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_JOINED: 'room:joined',
  ROOM_LEFT: 'room:left',

  // Sync events
  SYNC_MESSAGES: 'sync:messages',
  SYNC_CHANNELS: 'sync:channels',
  SYNC_PRESENCE: 'sync:presence',
} as const

// ============================================================================
// Connection Quality Thresholds
// ============================================================================

/**
 * Latency thresholds for connection quality assessment
 */
export const CONNECTION_QUALITY_THRESHOLDS = {
  excellent: 100, // < 100ms
  good: 300, // 100-300ms
  fair: 600, // 300-600ms
  poor: Infinity, // > 600ms
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Complete realtime configuration object
 */
export const REALTIME_CONFIG = {
  connection: REALTIME_CONNECTION,
  features: REALTIME_FEATURES,
  services: {
    presence: PRESENCE_CONFIG,
    typing: TYPING_CONFIG,
    delivery: DELIVERY_CONFIG,
    offlineQueue: OFFLINE_QUEUE_CONFIG,
    sync: SYNC_CONFIG,
    rooms: ROOMS_CONFIG,
  },
  privacy: {
    presence: DEFAULT_PRESENCE_PRIVACY,
    typing: DEFAULT_TYPING_PRIVACY,
  },
  events: REALTIME_EVENTS,
  connectionQuality: CONNECTION_QUALITY_THRESHOLDS,
}

export default REALTIME_CONFIG
