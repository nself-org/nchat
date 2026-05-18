/**
 * Presence Service
 *
 * Manages user presence status (online, away, busy, offline) and custom statuses.
 * Integrates with the nself-plugins realtime server.
 * Includes privacy controls for presence visibility.
 *
 * @module services/realtime/presence.service
 * @version 1.0.0
 */

import { realtimeClient, RealtimeError } from "./realtime-client";
import type {
  PresenceSettings,
  PresenceSettingsInput,
  PresenceVisibility,
  PresenceVisibilityResult,
} from "@/graphql/presence-settings";

import { DEFAULT_PRESENCE_SETTINGS } from "@/graphql/presence-settings";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Presence status values
 */
export type PresenceStatus = "online" | "away" | "busy" | "offline";

/**
 * Custom status configuration
 */
export interface CustomStatus {
  text?: string;
  emoji?: string;
  expiresAt?: Date | null;
}

/**
 * User presence data
 */
export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  customStatus?: CustomStatus;
  lastSeenAt?: Date;
  device?: string;
  /** Whether this presence was filtered due to privacy settings */
  isFiltered?: boolean;
}

/**
 * Filtered presence data (respects privacy settings)
 */
export interface FilteredUserPresence extends UserPresence {
  /** Whether the viewer can see actual online status */
  canViewOnlineStatus: boolean;
  /** Whether the viewer can see last seen time */
  canViewLastSeen: boolean;
  /** Whether this user is a contact of the viewer */
  isContact: boolean;
}

/**
 * Presence update payload to server
 */
interface PresenceUpdatePayload {
  status: PresenceStatus;
  customStatus?: {
    text?: string;
    emoji?: string;
  };
}

/**
 * Presence change event from server
 */
interface PresenceChangedEvent {
  userId: string;
  status: PresenceStatus;
  customStatus?: {
    text?: string;
    emoji?: string;
  };
  lastSeen?: string;
}

/**
 * Bulk presence response
 */
interface BulkPresenceResponse {
  presences: Array<{
    userId: string;
    status: PresenceStatus;
    customStatus?: { text?: string; emoji?: string };
    lastSeen?: string;
  }>;
}

/**
 * Presence subscription options
 */
export interface PresenceSubscriptionOptions {
  /** User IDs to subscribe to */
  userIds: string[];
  /** Callback when presence changes */
  onPresenceChange?: (presence: UserPresence) => void;
  /** Callback for bulk presence updates */
  onBulkPresence?: (presences: UserPresence[]) => void;
}

/**
 * Presence service configuration
 */
export interface PresenceServiceConfig {
  /** Enable idle detection for auto-away */
  enableIdleDetection?: boolean;
  /** Idle timeout in milliseconds (default: 5 minutes) */
  idleTimeout?: number;
  /** Heartbeat interval in milliseconds (default: 30 seconds) */
  heartbeatInterval?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Enable privacy filtering (default: true) */
  enablePrivacyFiltering?: boolean;
  /** GraphQL endpoint for presence settings */
  graphqlEndpoint?: string;
  /** Function to get auth token for GraphQL requests */
  getAuthToken?: () => string | null;
}

// ============================================================================
// Constants
// ============================================================================

const SOCKET_EVENTS = {
  PRESENCE_UPDATE: "presence:update",
  PRESENCE_CHANGED: "presence:changed",
  PRESENCE_SUBSCRIBE: "presence:subscribe",
  PRESENCE_UNSUBSCRIBE: "presence:unsubscribe",
  PRESENCE_BULK: "presence:bulk",
  PRESENCE_GET: "presence:get",
} as const;

const DEFAULT_CONFIG: Required<PresenceServiceConfig> = {
  enableIdleDetection: true,
  idleTimeout: 5 * 60 * 1000, // 5 minutes
  heartbeatInterval: 30 * 1000, // 30 seconds
  debug: false,
  enablePrivacyFiltering: true,
  graphqlEndpoint: process.env.NEXT_PUBLIC_GRAPHQL_URL || "/api/graphql",
  getAuthToken: () => null,
};

// ============================================================================
// Presence Service Class
// ============================================================================

/**
 * PresenceService - Manages user presence state
 */
class PresenceService {
  private config: Required<PresenceServiceConfig>;
  private currentStatus: PresenceStatus = "offline";
  private currentCustomStatus: CustomStatus | null = null;
  private subscribedUsers = new Set<string>();
  private presenceCache = new Map<string, UserPresence>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastActivityTime = Date.now();
  private isIdle = false;
  private presenceListeners = new Set<(presence: UserPresence) => void>();
  private unsubscribers: Array<() => void> = [];
  private isInitialized = false;

  // Privacy-related state
  private currentUserId: string | null = null;
  private presenceSettingsCache = new Map<string, PresenceSettings>();
  private contactsCache = new Set<string>();
  private ownPresenceSettings: PresenceSettings | null = null;
  private invisibleMode = false;

  constructor(config: PresenceServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the current user ID for privacy filtering
   */
  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
    if (userId) {
      // Load own presence settings
      this.loadOwnPresenceSettings();
      // Load contacts
      this.loadContacts();
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the presence service
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupEventListeners();

    if (this.config.enableIdleDetection && typeof window !== "undefined") {
      this.setupIdleDetection();
    }

    this.isInitialized = true;
    this.log("Presence service initialized");
  }

  /**
   * Destroy the presence service
   */
  destroy(): void {
    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Stop idle detection
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    // Remove event listeners
    if (typeof window !== "undefined") {
      window.removeEventListener("mousemove", this.handleActivity);
      window.removeEventListener("keydown", this.handleActivity);
      window.removeEventListener("click", this.handleActivity);
      window.removeEventListener("scroll", this.handleActivity);
      window.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }

    // Cleanup socket listeners
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Clear state
    this.presenceListeners.clear();
    this.subscribedUsers.clear();
    this.presenceCache.clear();

    this.isInitialized = false;
    this.log("Presence service destroyed");
  }

  // ============================================================================
  // Status Management
  // ============================================================================

  /**
   * Set own presence status
   */
  setStatus(status: PresenceStatus): void {
    this.currentStatus = status;
    this.broadcastPresence();
    this.log("Status set to:", status);
  }

  /**
   * Set custom status
   */
  setCustomStatus(customStatus: CustomStatus | null): void {
    this.currentCustomStatus = customStatus;
    this.broadcastPresence();
    this.log("Custom status set:", customStatus);
  }

  /**
   * Clear custom status
   */
  clearCustomStatus(): void {
    this.setCustomStatus(null);
  }

  /**
   * Get current status
   */
  getStatus(): PresenceStatus {
    return this.currentStatus;
  }

  /**
   * Get custom status
   */
  getCustomStatus(): CustomStatus | null {
    return this.currentCustomStatus;
  }

  /**
   * Broadcast presence update to server
   */
  private broadcastPresence(): void {
    if (!realtimeClient.isConnected) {
      return;
    }

    const payload: PresenceUpdatePayload = {
      status: this.currentStatus,
    };

    if (this.currentCustomStatus) {
      payload.customStatus = {
        text: this.currentCustomStatus.text,
        emoji: this.currentCustomStatus.emoji,
      };
    }

    realtimeClient.emit(SOCKET_EVENTS.PRESENCE_UPDATE, payload);
  }

  // ============================================================================
  // Subscriptions
  // ============================================================================

  /**
   * Subscribe to presence updates for specific users
   */
  subscribeToUsers(userIds: string[]): void {
    if (!realtimeClient.isConnected) {
      this.log("Cannot subscribe, not connected");
      return;
    }

    const newUserIds = userIds.filter((id) => !this.subscribedUsers.has(id));
    if (newUserIds.length === 0) {
      return;
    }

    newUserIds.forEach((id) => this.subscribedUsers.add(id));

    realtimeClient.emit(SOCKET_EVENTS.PRESENCE_SUBSCRIBE, {
      userIds: newUserIds,
    });
    this.log("Subscribed to users:", newUserIds);
  }

  /**
   * Unsubscribe from presence updates
   */
  unsubscribeFromUsers(userIds: string[]): void {
    if (!realtimeClient.isConnected) {
      return;
    }

    const toRemove = userIds.filter((id) => this.subscribedUsers.has(id));
    if (toRemove.length === 0) {
      return;
    }

    toRemove.forEach((id) => {
      this.subscribedUsers.delete(id);
      this.presenceCache.delete(id);
    });

    realtimeClient.emit(SOCKET_EVENTS.PRESENCE_UNSUBSCRIBE, {
      userIds: toRemove,
    });
    this.log("Unsubscribed from users:", toRemove);
  }

  /**
   * Get presence for a user
   */
  getPresence(userId: string): UserPresence | undefined {
    return this.presenceCache.get(userId);
  }

  /**
   * Get presence for multiple users
   */
  async fetchPresence(userIds: string[]): Promise<Map<string, UserPresence>> {
    if (!realtimeClient.isConnected) {
      return this.presenceCache;
    }

    try {
      const response = await realtimeClient.emitAsync<
        { userIds: string[] },
        BulkPresenceResponse
      >(SOCKET_EVENTS.PRESENCE_GET, { userIds });

      response.presences.forEach((p) => {
        const presence: UserPresence = {
          userId: p.userId,
          status: p.status,
          customStatus: p.customStatus,
          lastSeenAt: p.lastSeen ? new Date(p.lastSeen) : undefined,
        };
        this.presenceCache.set(p.userId, presence);
      });

      return this.presenceCache;
    } catch (error) {
      this.log("Failed to fetch presence:", error);
      return this.presenceCache;
    }
  }

  /**
   * Subscribe to presence change events
   */
  onPresenceChange(listener: (presence: UserPresence) => void): () => void {
    this.presenceListeners.add(listener);
    return () => this.presenceListeners.delete(listener);
  }

  // ============================================================================
  // Heartbeat
  // ============================================================================

  /**
   * Start presence heartbeat
   */
  startHeartbeat(): void {
    if (this.heartbeatTimer) {
      return;
    }

    // Send initial presence
    this.broadcastPresence();

    // Set up interval
    this.heartbeatTimer = setInterval(() => {
      this.broadcastPresence();
    }, this.config.heartbeatInterval);

    this.log("Heartbeat started");
  }

  /**
   * Stop presence heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      this.log("Heartbeat stopped");
    }
  }

  // ============================================================================
  // Idle Detection
  // ============================================================================

  /**
   * Set up idle detection
   */
  private setupIdleDetection(): void {
    if (typeof window === "undefined") return;

    // Track activity events
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => {
      window.addEventListener(event, this.handleActivity);
    });

    // Track visibility
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // Start idle timer
    this.resetIdleTimer();
  }

  /**
   * Handle user activity
   */
  private handleActivity = (): void => {
    this.lastActivityTime = Date.now();

    if (this.isIdle) {
      this.isIdle = false;
      // Restore previous status (if was auto-away)
      if (this.currentStatus === "away") {
        this.setStatus("online");
      }
    }

    this.resetIdleTimer();
  };

  /**
   * Handle visibility change
   */
  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Tab became hidden, start shorter idle timer
      this.resetIdleTimer(this.config.idleTimeout / 2);
    } else {
      // Tab became visible
      this.handleActivity();
    }
  };

  /**
   * Reset idle timer
   */
  private resetIdleTimer(timeout?: number): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.isIdle = true;
      if (this.currentStatus === "online") {
        this.setStatus("away");
        this.log("Auto-away due to idle");
      }
    }, timeout || this.config.idleTimeout);
  }

  // ============================================================================
  // Socket Event Handlers
  // ============================================================================

  /**
   * Set up socket event listeners
   */
  private setupEventListeners(): void {
    // Handle presence changes from other users
    const unsubPresenceChanged = realtimeClient.on<PresenceChangedEvent>(
      SOCKET_EVENTS.PRESENCE_CHANGED,
      this.handlePresenceChanged.bind(this),
    );
    this.unsubscribers.push(unsubPresenceChanged);

    // Handle bulk presence updates
    const unsubBulkPresence = realtimeClient.on<BulkPresenceResponse>(
      SOCKET_EVENTS.PRESENCE_BULK,
      this.handleBulkPresence.bind(this),
    );
    this.unsubscribers.push(unsubBulkPresence);

    // Handle connection state changes
    const unsubConnection = realtimeClient.onConnectionStateChange((state) => {
      if (state === "connected" || state === "authenticated") {
        this.startHeartbeat();
        // Re-subscribe to previously subscribed users
        if (this.subscribedUsers.size > 0) {
          realtimeClient.emit(SOCKET_EVENTS.PRESENCE_SUBSCRIBE, {
            userIds: Array.from(this.subscribedUsers),
          });
        }
      } else if (state === "disconnected") {
        this.stopHeartbeat();
      }
    });
    this.unsubscribers.push(unsubConnection);
  }

  /**
   * Handle presence change event
   */
  private handlePresenceChanged(event: PresenceChangedEvent): void {
    const presence: UserPresence = {
      userId: event.userId,
      status: event.status,
      customStatus: event.customStatus,
      lastSeenAt: event.lastSeen ? new Date(event.lastSeen) : undefined,
    };

    this.presenceCache.set(event.userId, presence);
    this.notifyPresenceListeners(presence);
    this.log("Presence changed:", event.userId, event.status);
  }

  /**
   * Handle bulk presence event
   */
  private handleBulkPresence(response: BulkPresenceResponse): void {
    response.presences.forEach((p) => {
      const presence: UserPresence = {
        userId: p.userId,
        status: p.status,
        customStatus: p.customStatus,
        lastSeenAt: p.lastSeen ? new Date(p.lastSeen) : undefined,
      };
      this.presenceCache.set(p.userId, presence);
      this.notifyPresenceListeners(presence);
    });
    this.log("Bulk presence update:", response.presences.length, "users");
  }

  /**
   * Notify presence listeners
   */
  private notifyPresenceListeners(presence: UserPresence): void {
    this.presenceListeners.forEach((listener) => {
      try {
        listener(presence);
      } catch (error) {
        logger.error("[PresenceService] Listener error:", error);
      }
    });
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Log message if debug enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[PresenceService]', ...args)
    }
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get all cached presences
   */
  getAllPresences(): Map<string, UserPresence> {
    return new Map(this.presenceCache);
  }

  /**
   * Get subscribed user IDs
   */
  getSubscribedUserIds(): string[] {
    return Array.from(this.subscribedUsers);
  }

  // ============================================================================
  // Privacy Settings Management
  // ============================================================================

  /**
   * Get user's presence settings
   */
  async getPresenceSettings(userId: string): Promise<PresenceSettings | null> {
    // Check cache first
    const cached = this.presenceSettingsCache.get(userId);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.graphqlRequest<{
        nchat_presence_settings_by_pk: PresenceSettings | null;
      }>(
        `
        query GetPresenceSettings($userId: uuid!) {
          nchat_presence_settings_by_pk(user_id: $userId) {
            id
            userId: user_id
            visibility
            showLastSeen: show_last_seen
            showOnlineStatus: show_online_status
            allowReadReceipts: allow_read_receipts
            invisibleMode: invisible_mode
          }
        }
      `,
        { userId },
      );

      const settings = response?.nchat_presence_settings_by_pk || null;
      if (settings) {
        this.presenceSettingsCache.set(userId, settings);
      }
      return settings;
    } catch (error) {
      this.log("Failed to get presence settings:", error);
      return null;
    }
  }

  /**
   * Update user's presence settings
   */
  async updatePresenceSettings(
    userId: string,
    settings: PresenceSettingsInput,
  ): Promise<PresenceSettings | null> {
    try {
      const response = await this.graphqlRequest<{
        insert_nchat_presence_settings_one: PresenceSettings | null;
      }>(
        `
        mutation UpdatePresenceSettings(
          $userId: uuid!
          $visibility: String
          $showLastSeen: Boolean
          $showOnlineStatus: Boolean
          $allowReadReceipts: Boolean
          $invisibleMode: Boolean
        ) {
          insert_nchat_presence_settings_one(
            object: {
              user_id: $userId
              visibility: $visibility
              show_last_seen: $showLastSeen
              show_online_status: $showOnlineStatus
              allow_read_receipts: $allowReadReceipts
              invisible_mode: $invisibleMode
            }
            on_conflict: {
              constraint: nchat_presence_settings_pkey
              update_columns: [
                visibility
                show_last_seen
                show_online_status
                allow_read_receipts
                invisible_mode
                updated_at
              ]
            }
          ) {
            id
            userId: user_id
            visibility
            showLastSeen: show_last_seen
            showOnlineStatus: show_online_status
            allowReadReceipts: allow_read_receipts
            invisibleMode: invisible_mode
          }
        }
      `,
        {
          userId,
          visibility: settings.visibility,
          showLastSeen: settings.showLastSeen,
          showOnlineStatus: settings.showOnlineStatus,
          allowReadReceipts: settings.allowReadReceipts,
          invisibleMode: settings.invisibleMode,
        },
      );

      const updatedSettings =
        response?.insert_nchat_presence_settings_one || null;
      if (updatedSettings) {
        this.presenceSettingsCache.set(userId, updatedSettings);
        // Update own settings if this is the current user
        if (userId === this.currentUserId) {
          this.ownPresenceSettings = updatedSettings;
          this.invisibleMode = updatedSettings.invisibleMode;
        }
      }
      return updatedSettings;
    } catch (error) {
      this.log("Failed to update presence settings:", error);
      return null;
    }
  }

  /**
   * Check if viewerId can see targetId's presence
   */
  async canViewPresence(
    viewerId: string,
    targetId: string,
  ): Promise<PresenceVisibilityResult> {
    const result: PresenceVisibilityResult = {
      canViewPresence: false,
      canViewLastSeen: false,
      canViewOnlineStatus: false,
      isContact: false,
      isInvisible: false,
    };

    // User can always see their own presence
    if (viewerId === targetId) {
      return {
        canViewPresence: true,
        canViewLastSeen: true,
        canViewOnlineStatus: true,
        isContact: false,
        isInvisible: false,
      };
    }

    try {
      // Get target's presence settings
      const targetSettings = await this.getPresenceSettings(targetId);
      if (!targetSettings) {
        // Default to allowing presence viewing if no settings exist
        return {
          canViewPresence: true,
          canViewLastSeen: true,
          canViewOnlineStatus: true,
          isContact: false,
          isInvisible: false,
        };
      }

      // Check invisible mode first
      if (targetSettings.invisibleMode) {
        result.isInvisible = true;
        return result;
      }

      // Check if viewer is a contact
      const isContact = await this.checkIsContact(viewerId, targetId);
      result.isContact = isContact;

      // Apply visibility rules
      const visibility = targetSettings.visibility as PresenceVisibility;

      switch (visibility) {
        case "everyone":
          result.canViewPresence = true;
          result.canViewOnlineStatus = targetSettings.showOnlineStatus;
          result.canViewLastSeen = targetSettings.showLastSeen;
          break;

        case "contacts":
          if (isContact) {
            result.canViewPresence = true;
            result.canViewOnlineStatus = targetSettings.showOnlineStatus;
            result.canViewLastSeen = targetSettings.showLastSeen;
          }
          break;

        case "nobody":
          // No one can see presence
          break;

        default:
          // Default to 'everyone' behavior for unknown values
          result.canViewPresence = true;
          result.canViewOnlineStatus = targetSettings.showOnlineStatus;
          result.canViewLastSeen = targetSettings.showLastSeen;
      }

      return result;
    } catch (error) {
      this.log("Failed to check presence visibility:", error);
      // Default to allowing on error
      return {
        canViewPresence: true,
        canViewLastSeen: true,
        canViewOnlineStatus: true,
        isContact: false,
        isInvisible: false,
      };
    }
  }

  /**
   * Get filtered presence for multiple users based on privacy settings
   */
  async getVisiblePresence(
    viewerId: string,
    targetIds: string[],
  ): Promise<Map<string, FilteredUserPresence>> {
    const result = new Map<string, FilteredUserPresence>();

    if (!this.config.enablePrivacyFiltering) {
      // Privacy filtering disabled, return all presence as-is
      for (const targetId of targetIds) {
        const presence = this.presenceCache.get(targetId);
        if (presence) {
          result.set(targetId, {
            ...presence,
            canViewOnlineStatus: true,
            canViewLastSeen: true,
            isContact: false,
          });
        }
      }
      return result;
    }

    // Process each target user
    for (const targetId of targetIds) {
      const visibilityResult = await this.canViewPresence(viewerId, targetId);
      const cachedPresence = this.presenceCache.get(targetId);

      if (!cachedPresence) {
        continue;
      }

      // Build filtered presence
      const filteredPresence: FilteredUserPresence = {
        userId: targetId,
        status:
          visibilityResult.isInvisible || !visibilityResult.canViewOnlineStatus
            ? "offline"
            : cachedPresence.status,
        customStatus: visibilityResult.canViewPresence
          ? cachedPresence.customStatus
          : undefined,
        lastSeenAt: visibilityResult.canViewLastSeen
          ? cachedPresence.lastSeenAt
          : undefined,
        device: visibilityResult.canViewPresence
          ? cachedPresence.device
          : undefined,
        isFiltered:
          !visibilityResult.canViewPresence || visibilityResult.isInvisible,
        canViewOnlineStatus: visibilityResult.canViewOnlineStatus,
        canViewLastSeen: visibilityResult.canViewLastSeen,
        isContact: visibilityResult.isContact,
      };

      result.set(targetId, filteredPresence);
    }

    return result;
  }

  /**
   * Set invisible mode (appear offline to others)
   */
  async setInvisibleMode(enabled: boolean): Promise<boolean> {
    if (!this.currentUserId) {
      this.log("Cannot set invisible mode: no current user");
      return false;
    }

    const updated = await this.updatePresenceSettings(this.currentUserId, {
      invisibleMode: enabled,
    });

    if (updated) {
      this.invisibleMode = enabled;
      this.log("Invisible mode:", enabled ? "enabled" : "disabled");
      return true;
    }

    return false;
  }

  /**
   * Check if invisible mode is enabled
   */
  isInvisibleModeEnabled(): boolean {
    return this.invisibleMode;
  }

  /**
   * Get own presence settings
   */
  getOwnPresenceSettings(): PresenceSettings | null {
    return this.ownPresenceSettings;
  }

  // ============================================================================
  // Contact Relationship
  // ============================================================================

  /**
   * Check if two users are contacts (have DM history or explicit contact)
   */
  private async checkIsContact(
    viewerId: string,
    targetId: string,
  ): Promise<boolean> {
    // Check local cache first
    if (this.currentUserId === viewerId && this.contactsCache.has(targetId)) {
      return true;
    }

    try {
      const response = await this.graphqlRequest<{
        dmRelationship: Array<{ id: string }>;
        contactRelationship: Array<{ id: string }>;
      }>(
        `
        query CheckContactRelationship($viewerId: uuid!, $targetId: uuid!) {
          dmRelationship: nchat_direct_messages(
            where: {
              type: { _eq: "direct" }
              status: { _eq: "active" }
              _and: [
                { participants: { user_id: { _eq: $viewerId } } }
                { participants: { user_id: { _eq: $targetId } } }
              ]
            }
            limit: 1
          ) {
            id
          }

          contactRelationship: nchat_contacts(
            where: {
              user_id: { _eq: $viewerId }
              contact_user_id: { _eq: $targetId }
            }
            limit: 1
          ) {
            id
          }
        }
      `,
        { viewerId, targetId },
      );

      const isContact =
        (response?.dmRelationship?.length || 0) > 0 ||
        (response?.contactRelationship?.length || 0) > 0;

      // Cache the result if this is for the current user
      if (viewerId === this.currentUserId && isContact) {
        this.contactsCache.add(targetId);
      }

      return isContact;
    } catch (error) {
      this.log("Failed to check contact relationship:", error);
      return false;
    }
  }

  /**
   * Load contacts for the current user
   */
  private async loadContacts(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const response = await this.graphqlRequest<{
        dmParticipants: Array<{
          dm: {
            participants: Array<{ userId: string }>;
          };
        }>;
        contacts: Array<{ contactUserId: string }>;
      }>(
        `
        query GetUserContacts($userId: uuid!) {
          dmParticipants: nchat_dm_participants(
            where: {
              user_id: { _eq: $userId }
              dm: {
                type: { _eq: "direct" }
                status: { _eq: "active" }
              }
            }
          ) {
            dm {
              participants(where: { user_id: { _neq: $userId } }) {
                userId: user_id
              }
            }
          }

          contacts: nchat_contacts(
            where: { user_id: { _eq: $userId } }
          ) {
            contactUserId: contact_user_id
          }
        }
      `,
        { userId: this.currentUserId },
      );

      // Clear and rebuild contacts cache
      this.contactsCache.clear();

      // Add DM contacts
      response?.dmParticipants?.forEach((p) => {
        p.dm?.participants?.forEach((participant) => {
          this.contactsCache.add(participant.userId);
        });
      });

      // Add explicit contacts
      response?.contacts?.forEach((c) => {
        this.contactsCache.add(c.contactUserId);
      });

      this.log("Loaded", this.contactsCache.size, "contacts");
    } catch (error) {
      this.log("Failed to load contacts:", error);
    }
  }

  /**
   * Load own presence settings
   */
  private async loadOwnPresenceSettings(): Promise<void> {
    if (!this.currentUserId) return;

    const settings = await this.getPresenceSettings(this.currentUserId);
    if (settings) {
      this.ownPresenceSettings = settings;
      this.invisibleMode = settings.invisibleMode;
    } else {
      // Use defaults if no settings exist
      this.ownPresenceSettings = {
        userId: this.currentUserId,
        ...DEFAULT_PRESENCE_SETTINGS,
      };
    }
  }

  /**
   * Refresh contacts cache
   */
  async refreshContacts(): Promise<void> {
    await this.loadContacts();
  }

  /**
   * Check if a user is in the contacts cache
   */
  isUserContact(userId: string): boolean {
    return this.contactsCache.has(userId);
  }

  /**
   * Get all cached contacts
   */
  getCachedContacts(): string[] {
    return Array.from(this.contactsCache);
  }

  // ============================================================================
  // GraphQL Helper
  // ============================================================================

  /**
   * Make a GraphQL request
   */
  private async graphqlRequest<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T | null> {
    try {
      const token = this.config.getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(this.config.graphqlEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const json = await response.json();

      if (json.errors?.length > 0) {
        throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
      }

      return json.data as T;
    } catch (error) {
      this.log("GraphQL request error:", error);
      return null;
    }
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Clear presence settings cache
   */
  clearPresenceSettingsCache(): void {
    this.presenceSettingsCache.clear();
  }

  /**
   * Clear contacts cache
   */
  clearContactsCache(): void {
    this.contactsCache.clear();
  }

  /**
   * Clear all privacy-related caches
   */
  clearPrivacyCaches(): void {
    this.presenceSettingsCache.clear();
    this.contactsCache.clear();
    this.ownPresenceSettings = null;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let presenceServiceInstance: PresenceService | null = null;

/**
 * Get the presence service instance
 */
export function getPresenceService(
  config?: PresenceServiceConfig,
): PresenceService {
  if (!presenceServiceInstance) {
    presenceServiceInstance = new PresenceService(config);
  }
  return presenceServiceInstance;
}

/**
 * Initialize the presence service
 */
export function initializePresenceService(
  config?: PresenceServiceConfig,
): PresenceService {
  const service = getPresenceService(config);
  service.initialize();
  return service;
}

/**
 * Reset the presence service
 */
export function resetPresenceService(): void {
  if (presenceServiceInstance) {
    presenceServiceInstance.destroy();
    presenceServiceInstance = null;
  }
}

export { PresenceService };
export default PresenceService;

// Re-export types from graphql module for convenience
export type {
  PresenceSettings,
  PresenceSettingsInput,
  PresenceVisibility,
  PresenceVisibilityResult,
} from "@/graphql/presence-settings";
export { DEFAULT_PRESENCE_SETTINGS } from "@/graphql/presence-settings";
