/**
 * Realtime Integration Service
 *
 * Main orchestration service that wires together all realtime functionality:
 * - Connection management
 * - Presence tracking
 * - Typing indicators
 * - Delivery receipts
 * - Offline queue
 * - Room management
 * - Event dispatching
 *
 * This is the single entry point for initializing and managing all realtime features.
 *
 * @module services/realtime/realtime-integration
 * @version 1.0.0
 */

import { realtimeClient, type RealtimeClientConfig } from "./realtime-client";
import {
  getPresenceService,
  initializePresenceService,
} from "./presence.service";
import { getTypingService, initializeTypingService } from "./typing.service";
import { getRoomsService, initializeRoomsService } from "./rooms.service";
import { getDeliveryEventHandler, initializeDeliveryHandler } from "./delivery";
import {
  getOfflineQueueService,
  initializeOfflineQueue,
} from "./offline-queue";
import {
  getEventDispatcher,
  initializeEventDispatcher,
} from "./event-dispatcher.service";
import { getRoomManager, initializeRoomManager } from "./room-manager.service";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Realtime integration configuration
 */
export interface RealtimeIntegrationConfig {
  /** Current user ID */
  userId?: string;
  /** Auth token for connection */
  token?: string;
  /** Enable presence tracking */
  enablePresence?: boolean;
  /** Enable typing indicators */
  enableTyping?: boolean;
  /** Enable delivery receipts */
  enableDeliveryReceipts?: boolean;
  /** Enable offline queue */
  enableOfflineQueue?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /** Auto-connect on initialization */
  autoConnect?: boolean;
  /** WebSocket URL override */
  realtimeUrl?: string;
}

/**
 * Integration status
 */
export interface IntegrationStatus {
  connected: boolean;
  authenticated: boolean;
  presenceEnabled: boolean;
  typingEnabled: boolean;
  deliveryReceiptsEnabled: boolean;
  offlineQueueEnabled: boolean;
  queuedMessageCount: number;
  connectionQuality: "excellent" | "good" | "fair" | "poor" | "unknown";
  reconnectAttempts: number;
}

/**
 * Status change listener
 */
export type StatusChangeListener = (status: IntegrationStatus) => void;

// ============================================================================
// Realtime Integration Service Class
// ============================================================================

/**
 * RealtimeIntegrationService - Main orchestrator for all realtime features
 */
class RealtimeIntegrationService {
  private config: RealtimeIntegrationConfig = {};
  private isInitialized = false;
  private statusListeners = new Set<StatusChangeListener>();
  private unsubscribers: Array<() => void> = [];
  private currentUserId: string | null = null;

  constructor() {
    // Service is constructed but not initialized
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize all realtime services
   */
  initialize(config: RealtimeIntegrationConfig): void {
    if (this.isInitialized) {
      logger.warn("[RealtimeIntegration] Already initialized");
      return;
    }

    this.config = {
      enablePresence: true,
      enableTyping: true,
      enableDeliveryReceipts: true,
      enableOfflineQueue: true,
      debug: false,
      autoConnect: true,
      ...config,
    };

    this.currentUserId = config.userId || null;

    logger.info("[RealtimeIntegration] Initializing with config:", {
      userId: this.currentUserId,
      enablePresence: this.config.enablePresence,
      enableTyping: this.config.enableTyping,
      enableDeliveryReceipts: this.config.enableDeliveryReceipts,
      enableOfflineQueue: this.config.enableOfflineQueue,
    });

    // Initialize realtime client
    const clientConfig: RealtimeClientConfig = {
      url:
        this.config.realtimeUrl ||
        process.env.NEXT_PUBLIC_REALTIME_URL ||
        "http://localhost:3101",
      token: this.config.token,
      debug: this.config.debug,
      autoReconnect: true,
      maxReconnectAttempts: 10,
    };
    realtimeClient.initialize(clientConfig);

    // Initialize core services
    initializeEventDispatcher({ debug: this.config.debug });
    initializeRoomManager({ debug: this.config.debug });

    // Initialize optional services
    if (this.config.enablePresence) {
      const presenceService = initializePresenceService({
        debug: this.config.debug,
        enableIdleDetection: true,
      });
      presenceService.setCurrentUserId(this.currentUserId);
    }

    if (this.config.enableTyping) {
      const typingService = initializeTypingService({
        debug: this.config.debug,
        typingTimeout: 5000,
        throttleInterval: 1000,
      });
      typingService.setCurrentUserId(this.currentUserId);
    }

    if (this.config.enableDeliveryReceipts) {
      initializeDeliveryHandler({
        debug: this.config.debug,
        autoSyncOnReconnect: true,
        batchReadAck: true,
      });
    }

    if (this.config.enableOfflineQueue) {
      initializeOfflineQueue({
        debug: this.config.debug,
        maxQueueSize: 100,
        maxRetries: 5,
      });
    }

    initializeRoomsService({
      debug: this.config.debug,
    });

    // Set up connection state monitoring
    this.setupConnectionMonitoring();

    // Set up reconnection handling
    this.setupReconnectionHandling();

    // Set up offline detection
    this.setupOfflineDetection();

    this.isInitialized = true;
    logger.info("[RealtimeIntegration] Initialization complete");

    // Auto-connect if configured
    if (this.config.autoConnect && this.config.token) {
      this.connect();
    }

    // Notify listeners of initial status
    this.notifyStatusListeners();
  }

  /**
   * Destroy all realtime services
   */
  destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    logger.info("[RealtimeIntegration] Destroying services");

    // Disconnect realtime client
    realtimeClient.disconnect();

    // Cleanup listeners
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.statusListeners.clear();

    // Destroy services
    if (this.config.enablePresence) {
      getPresenceService().destroy();
    }

    if (this.config.enableTyping) {
      getTypingService().destroy();
    }

    if (this.config.enableDeliveryReceipts) {
      getDeliveryEventHandler().destroy();
    }

    if (this.config.enableOfflineQueue) {
      getOfflineQueueService().destroy();
    }

    getRoomsService().destroy();
    getEventDispatcher().destroy();
    getRoomManager().destroy();

    this.isInitialized = false;
    logger.info("[RealtimeIntegration] Destruction complete");
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to realtime server
   */
  async connect(token?: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("RealtimeIntegrationService not initialized");
    }

    const authToken = token || this.config.token;
    if (!authToken) {
      throw new Error("No auth token provided");
    }

    logger.info("[RealtimeIntegration] Connecting to realtime server");

    try {
      await realtimeClient.connect(authToken);
      logger.info("[RealtimeIntegration] Connected successfully");

      // Start presence heartbeat
      if (this.config.enablePresence) {
        getPresenceService().startHeartbeat();
      }

      this.notifyStatusListeners();
    } catch (error) {
      logger.error("[RealtimeIntegration] Connection failed:", error);
      throw error;
    }
  }

  /**
   * Disconnect from realtime server
   */
  disconnect(): void {
    if (!this.isInitialized) {
      return;
    }

    logger.info("[RealtimeIntegration] Disconnecting from realtime server");

    // Stop presence heartbeat
    if (this.config.enablePresence) {
      getPresenceService().stopHeartbeat();
    }

    realtimeClient.disconnect();
    this.notifyStatusListeners();
  }

  /**
   * Reconnect to realtime server
   */
  async reconnect(): Promise<void> {
    logger.info("[RealtimeIntegration] Reconnecting to realtime server");
    await realtimeClient.reconnect();
  }

  /**
   * Update authentication token
   */
  updateToken(token: string): void {
    this.config.token = token;
    realtimeClient.updateToken(token);
  }

  /**
   * Update user ID
   */
  updateUserId(userId: string): void {
    this.currentUserId = userId;

    if (this.config.enablePresence) {
      getPresenceService().setCurrentUserId(userId);
    }

    if (this.config.enableTyping) {
      getTypingService().setCurrentUserId(userId);
    }
  }

  // ============================================================================
  // Status and Monitoring
  // ============================================================================

  /**
   * Get current integration status
   */
  getStatus(): IntegrationStatus {
    const queueService = this.config.enableOfflineQueue
      ? getOfflineQueueService()
      : null;

    return {
      connected: realtimeClient.isConnected,
      authenticated: realtimeClient.isAuthenticated,
      presenceEnabled: this.config.enablePresence ?? false,
      typingEnabled: this.config.enableTyping ?? false,
      deliveryReceiptsEnabled: this.config.enableDeliveryReceipts ?? false,
      offlineQueueEnabled: this.config.enableOfflineQueue ?? false,
      queuedMessageCount: queueService?.getQueueLength() ?? 0,
      connectionQuality: realtimeClient.connectionQuality,
      reconnectAttempts: realtimeClient.reconnectAttemptCount,
    };
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(listener: StatusChangeListener): () => void {
    this.statusListeners.add(listener);
    // Immediately notify with current status
    listener(this.getStatus());
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Notify status listeners
   */
  private notifyStatusListeners(): void {
    const status = this.getStatus();
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        logger.error("[RealtimeIntegration] Status listener error:", error);
      }
    });
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return realtimeClient.isConnected;
  }

  /**
   * Check if authenticated
   */
  get isAuthenticated(): boolean {
    return realtimeClient.isAuthenticated;
  }

  /**
   * Check if online
   */
  get isOnline(): boolean {
    return realtimeClient.isOnline;
  }

  /**
   * Check if was offline
   */
  get wasOffline(): boolean {
    return realtimeClient.wasOffline;
  }

  /**
   * Clear offline flag
   */
  clearWasOffline(): void {
    realtimeClient.clearWasOffline();
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Set up connection state monitoring
   */
  private setupConnectionMonitoring(): void {
    const unsub = realtimeClient.onConnectionStateChange((state) => {
      logger.info("[RealtimeIntegration] Connection state changed:", { state });

      // Handle state-specific logic
      switch (state) {
        case "connected":
        case "authenticated":
          // Start presence heartbeat
          if (this.config.enablePresence) {
            getPresenceService().startHeartbeat();
          }
          break;

        case "disconnected":
        case "error":
          // Stop presence heartbeat
          if (this.config.enablePresence) {
            getPresenceService().stopHeartbeat();
          }
          break;
      }

      this.notifyStatusListeners();
    });

    this.unsubscribers.push(unsub);
  }

  /**
   * Set up reconnection handling
   */
  private setupReconnectionHandling(): void {
    const unsub = realtimeClient.onReconnection((attemptNumber, wasOffline) => {
      logger.info("[RealtimeIntegration] Reconnected", {
        attemptNumber,
        wasOffline,
      });

      // Sync presence after reconnection
      if (this.config.enablePresence) {
        const presenceService = getPresenceService();
        presenceService.startHeartbeat();
      }

      // Flush offline queue
      if (this.config.enableOfflineQueue) {
        const queueService = getOfflineQueueService();
        if (queueService.getQueueLength() > 0) {
          logger.info("[RealtimeIntegration] Flushing offline queue");
          queueService.flushQueue();
        }
      }

      this.notifyStatusListeners();
    });

    this.unsubscribers.push(unsub);
  }

  /**
   * Set up offline detection
   */
  private setupOfflineDetection(): void {
    const unsub = realtimeClient.onOfflineStatusChange((isOnline) => {
      logger.info("[RealtimeIntegration] Online status changed:", { isOnline });

      if (isOnline) {
        logger.info(
          "[RealtimeIntegration] Back online, attempting reconnection",
        );
        // Connection will automatically reconnect
      } else {
        logger.info("[RealtimeIntegration] Went offline");
        // Set presence to offline
        if (this.config.enablePresence) {
          getPresenceService().setStatus("offline");
        }
      }

      this.notifyStatusListeners();
    });

    this.unsubscribers.push(unsub);
  }

  // ============================================================================
  // Service Access
  // ============================================================================

  /**
   * Get presence service (if enabled)
   */
  getPresence() {
    if (!this.config.enablePresence) {
      throw new Error("Presence service is not enabled");
    }
    return getPresenceService();
  }

  /**
   * Get typing service (if enabled)
   */
  getTyping() {
    if (!this.config.enableTyping) {
      throw new Error("Typing service is not enabled");
    }
    return getTypingService();
  }

  /**
   * Get delivery handler (if enabled)
   */
  getDelivery() {
    if (!this.config.enableDeliveryReceipts) {
      throw new Error("Delivery receipts service is not enabled");
    }
    return getDeliveryEventHandler();
  }

  /**
   * Get offline queue (if enabled)
   */
  getOfflineQueue() {
    if (!this.config.enableOfflineQueue) {
      throw new Error("Offline queue service is not enabled");
    }
    return getOfflineQueueService();
  }

  /**
   * Get rooms service
   */
  getRooms() {
    return getRoomsService();
  }

  /**
   * Get event dispatcher
   */
  getDispatcher() {
    return getEventDispatcher();
  }

  /**
   * Get room manager
   */
  getRoomManager() {
    return getRoomManager();
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<RealtimeIntegrationConfig> {
    return { ...this.config };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let realtimeIntegrationInstance: RealtimeIntegrationService | null = null;

/**
 * Get the realtime integration service instance
 */
export function getRealtimeIntegration(): RealtimeIntegrationService {
  if (!realtimeIntegrationInstance) {
    realtimeIntegrationInstance = new RealtimeIntegrationService();
  }
  return realtimeIntegrationInstance;
}

/**
 * Initialize the realtime integration service
 */
export function initializeRealtimeIntegration(
  config: RealtimeIntegrationConfig,
): RealtimeIntegrationService {
  const service = getRealtimeIntegration();
  service.initialize(config);
  return service;
}

/**
 * Reset the realtime integration service
 */
export function resetRealtimeIntegration(): void {
  if (realtimeIntegrationInstance) {
    realtimeIntegrationInstance.destroy();
    realtimeIntegrationInstance = null;
  }
}

export { RealtimeIntegrationService };
export default RealtimeIntegrationService;
