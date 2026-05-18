/**
 * End-to-End Encryption Service
 *
 * High-level service for E2EE message operations in 1:1 conversations.
 * Integrates X3DH key agreement, Double Ratchet algorithm, and session management.
 *
 * Features:
 * - Seamless message encryption/decryption
 * - Automatic session establishment
 * - Pre-key bundle management
 * - Server synchronization
 * - Identity verification
 * - Forward secrecy guarantees
 *
 * Security guarantees:
 * - Plaintext never reaches the server
 * - Forward secrecy: past messages safe if key compromised
 * - Break-in recovery: future messages safe after compromise
 * - Deniability: cannot prove message authorship to third party
 */

import { logger } from "@/lib/logger";
import {
  E2EESessionManager,
  createSessionManager,
  type SessionId,
  type SessionMetadata,
  type E2EEMessage,
  type SessionEventType,
  type SessionEvent,
} from "@/lib/e2ee/session-manager-v2";
import {
  PreKeyBundleManager,
  createPreKeyBundleManager,
  type PreKeySyncRequest,
  type ValidationResult,
} from "@/lib/e2ee/prekey-bundle";
import { type PreKeyBundle, type OneTimePreKey } from "@/lib/e2ee/x3dh";

// ============================================================================
// Types
// ============================================================================

/**
 * E2EE service configuration
 */
export interface E2EEServiceConfig {
  /** Local user ID */
  userId: string;
  /** Local device ID */
  deviceId: string;
  /** Storage provider for persistence */
  storage?: Storage;
  /** Minimum one-time pre-keys to maintain */
  minOneTimePreKeys?: number;
  /** Auto-replenish pre-keys when low */
  autoReplenishPreKeys?: boolean;
  /** Callback for pre-key replenishment */
  onPreKeyReplenishNeeded?: (keys: OneTimePreKey[]) => Promise<void>;
  /** Callback for bundle sync */
  onBundleSyncNeeded?: (request: PreKeySyncRequest) => Promise<void>;
}

/**
 * Encrypted message for transmission
 */
export interface TransmittableMessage {
  /** Message type: 'prekey' for first message, 'message' for subsequent */
  type: "prekey" | "message";
  /** Sender user ID */
  senderUserId: string;
  /** Sender device ID */
  senderDeviceId: string;
  /** Recipient user ID */
  recipientUserId: string;
  /** Recipient device ID */
  recipientDeviceId: string;
  /** Encrypted content (Base64) */
  ciphertext: string;
  /** For prekey messages: sender's identity key (Base64) */
  identityKey?: string;
  /** For prekey messages: sender's ephemeral key (Base64) */
  ephemeralKey?: string;
  /** For prekey messages: one-time pre-key ID used */
  oneTimePreKeyId?: number;
  /** Registration ID */
  registrationId?: number;
  /** Timestamp */
  timestamp: number;
  /** Message ID for deduplication */
  messageId: string;
}

/**
 * Decrypted message result
 */
export interface DecryptedMessage {
  /** Plaintext content */
  content: string;
  /** Sender user ID */
  senderUserId: string;
  /** Sender device ID */
  senderDeviceId: string;
  /** Timestamp of encryption */
  timestamp: number;
  /** Whether this was a new session */
  newSession: boolean;
  /** Message ID */
  messageId: string;
}

/**
 * Session info for UI display
 */
export interface SessionInfo {
  /** Session ID */
  sessionId: SessionId;
  /** Session state */
  state: string;
  /** Safety number for verification */
  safetyNumber: string;
  /** Formatted safety number */
  formattedSafetyNumber: string;
  /** Message counts */
  messagesSent: number;
  messagesReceived: number;
  /** Timestamps */
  createdAt: Date;
  lastActivity: Date | null;
}

/**
 * E2EE service status
 */
export interface E2EEServiceStatus {
  /** Whether service is initialized */
  initialized: boolean;
  /** User ID */
  userId: string | null;
  /** Device ID */
  deviceId: string | null;
  /** Number of active sessions */
  activeSessions: number;
  /** Available one-time pre-keys */
  availableOneTimePreKeys: number;
  /** Whether pre-keys need replenishment */
  preKeysNeedReplenishment: boolean;
  /** Whether signed pre-key needs rotation */
  signedPreKeyNeedsRotation: boolean;
  /** Last sync timestamp */
  lastSyncAt: Date | null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a random message ID
 */
function generateMessageId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts bytes to Base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts Base64 to bytes
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ============================================================================
// E2EE Service Class
// ============================================================================

/**
 * Main E2EE service for encrypted messaging
 */
export class E2EEService {
  private config: E2EEServiceConfig;
  private sessionManager: E2EESessionManager | null = null;
  private preKeyManager: PreKeyBundleManager | null = null;
  private initialized = false;
  private lastSyncAt: Date | null = null;
  private eventListeners: Map<string, Array<(event: any) => void>> = new Map();

  constructor(config: E2EEServiceConfig) {
    this.config = {
      ...config,
      minOneTimePreKeys: config.minOneTimePreKeys ?? 10,
      autoReplenishPreKeys: config.autoReplenishPreKeys ?? true,
    };
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initializes the E2EE service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn("E2EE service already initialized");
      return;
    }

    try {
      // Initialize pre-key bundle manager
      this.preKeyManager = await createPreKeyBundleManager(
        this.config.userId,
        this.config.deviceId,
        this.config.storage,
      );

      // Get registration ID from pre-key manager
      const registrationId = this.preKeyManager.getRegistrationId();

      // Initialize session manager
      this.sessionManager = await createSessionManager({
        userId: this.config.userId,
        deviceId: this.config.deviceId,
        registrationId,
        storage: this.config.storage,
        autoPersist: true,
      });

      // Set up event forwarding
      this.setupEventForwarding();

      // Mark as initialized before pre-key replenishment
      this.initialized = true;

      // Check if pre-keys need replenishment
      if (this.config.autoReplenishPreKeys) {
        await this.checkAndReplenishPreKeys();
      }

      logger.info("E2EE service initialized", {
        userId: this.config.userId,
        deviceId: this.config.deviceId,
      });
    } catch (error) {
      logger.error("Failed to initialize E2EE service", { error });
      throw error;
    }
  }

  /**
   * Checks if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets service status
   */
  getStatus(): E2EEServiceStatus {
    return {
      initialized: this.initialized,
      userId: this.initialized ? this.config.userId : null,
      deviceId: this.initialized ? this.config.deviceId : null,
      activeSessions: this.sessionManager?.getAllSessions().length ?? 0,
      availableOneTimePreKeys:
        this.preKeyManager?.getUnusedOneTimePreKeyCount() ?? 0,
      preKeysNeedReplenishment:
        (this.preKeyManager?.getUnusedOneTimePreKeyCount() ?? 0) <
        (this.config.minOneTimePreKeys ?? 10),
      signedPreKeyNeedsRotation:
        this.preKeyManager?.needsSignedPreKeyRotation() ?? false,
      lastSyncAt: this.lastSyncAt,
    };
  }

  // ==========================================================================
  // Pre-Key Bundle
  // ==========================================================================

  /**
   * Gets the pre-key bundle for publishing to server
   */
  getPreKeyBundle(): PreKeyBundle {
    this.ensureInitialized();
    return this.preKeyManager!.getPreKeyBundle();
  }

  /**
   * Creates a sync request for server
   */
  createSyncRequest(): PreKeySyncRequest {
    this.ensureInitialized();
    return this.preKeyManager!.createSyncRequest();
  }

  /**
   * Validates the current bundle
   */
  validateBundle(): ValidationResult {
    this.ensureInitialized();
    return this.preKeyManager!.validateBundle();
  }

  /**
   * Checks and replenishes pre-keys if needed
   */
  async checkAndReplenishPreKeys(): Promise<OneTimePreKey[]> {
    this.ensureInitialized();

    const unusedCount = this.preKeyManager!.getUnusedOneTimePreKeyCount();
    if (unusedCount >= (this.config.minOneTimePreKeys ?? 10)) {
      return [];
    }

    const newKeys = await this.preKeyManager!.replenishOneTimePreKeysIfNeeded();

    if (newKeys.length > 0 && this.config.onPreKeyReplenishNeeded) {
      try {
        await this.config.onPreKeyReplenishNeeded(newKeys);
        logger.info("Pre-keys replenished and synced", {
          count: newKeys.length,
        });
      } catch (error) {
        logger.error("Failed to sync replenished pre-keys", { error });
      }
    }

    return newKeys;
  }

  /**
   * Rotates signed pre-key if needed
   */
  async rotateSignedPreKeyIfNeeded(): Promise<boolean> {
    this.ensureInitialized();

    const newKey = await this.preKeyManager!.rotateSignedPreKeyIfNeeded();
    if (newKey && this.config.onBundleSyncNeeded) {
      try {
        await this.config.onBundleSyncNeeded(this.createSyncRequest());
        return true;
      } catch (error) {
        logger.error("Failed to sync rotated signed pre-key", { error });
      }
    }

    return newKey !== null;
  }

  /**
   * Marks a one-time pre-key as consumed (called when server notifies)
   */
  markOneTimePreKeyConsumed(keyId: number): void {
    this.ensureInitialized();
    this.preKeyManager!.markOneTimePreKeyUsed(keyId);
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  /**
   * Creates or gets a session with a remote user
   */
  async getOrCreateSession(remoteBundle: PreKeyBundle): Promise<SessionId> {
    this.ensureInitialized();

    const sessionId: SessionId = {
      userId: remoteBundle.userId,
      deviceId: remoteBundle.deviceId,
    };

    // Check if session already exists
    if (this.sessionManager!.hasSession(sessionId)) {
      return sessionId;
    }

    // Create new session
    return this.sessionManager!.createSession(remoteBundle);
  }

  /**
   * Checks if a session exists
   */
  hasSession(userId: string, deviceId: string): boolean {
    this.ensureInitialized();
    return this.sessionManager!.hasSession({ userId, deviceId });
  }

  /**
   * Gets session info
   */
  async getSessionInfo(
    userId: string,
    deviceId: string,
  ): Promise<SessionInfo | null> {
    this.ensureInitialized();

    const sessionId: SessionId = { userId, deviceId };
    const metadata = this.sessionManager!.getSessionMetadata(sessionId);
    if (!metadata) {
      return null;
    }

    const safetyNumber = await this.sessionManager!.getSafetyNumber(sessionId);

    return {
      sessionId,
      state: metadata.state,
      safetyNumber,
      formattedSafetyNumber:
        this.sessionManager!.formatSafetyNumber(safetyNumber),
      messagesSent: metadata.messagesSent,
      messagesReceived: metadata.messagesReceived,
      createdAt: metadata.createdAt,
      lastActivity:
        metadata.lastMessageSentAt || metadata.lastMessageReceivedAt
          ? new Date(
              Math.max(
                metadata.lastMessageSentAt?.getTime() ?? 0,
                metadata.lastMessageReceivedAt?.getTime() ?? 0,
              ),
            )
          : null,
    };
  }

  /**
   * Gets all active sessions
   */
  getAllSessions(): SessionMetadata[] {
    this.ensureInitialized();
    return this.sessionManager!.getAllSessions();
  }

  /**
   * Closes a session
   */
  async closeSession(userId: string, deviceId: string): Promise<void> {
    this.ensureInitialized();
    await this.sessionManager!.closeSession({ userId, deviceId });
  }

  // ==========================================================================
  // Message Encryption/Decryption
  // ==========================================================================

  /**
   * Encrypts a message for a recipient
   */
  async encryptMessage(
    recipientUserId: string,
    recipientDeviceId: string,
    plaintext: string,
    remoteBundle?: PreKeyBundle,
  ): Promise<TransmittableMessage> {
    this.ensureInitialized();

    const sessionId: SessionId = {
      userId: recipientUserId,
      deviceId: recipientDeviceId,
    };

    // Ensure session exists
    if (!this.sessionManager!.hasSession(sessionId)) {
      if (!remoteBundle) {
        throw new Error(
          `No session exists for ${recipientUserId}:${recipientDeviceId} and no bundle provided`,
        );
      }
      await this.sessionManager!.createSession(remoteBundle);
    }

    // Encrypt the message
    const e2eeMessage = await this.sessionManager!.encryptMessage(
      sessionId,
      plaintext,
    );
    const messageId = generateMessageId();
    const timestamp = Date.now();

    // Build transmittable message
    const transmittable: TransmittableMessage = {
      type: e2eeMessage.type === "prekey" ? "prekey" : "message",
      senderUserId: this.config.userId,
      senderDeviceId: this.config.deviceId,
      recipientUserId,
      recipientDeviceId,
      ciphertext: bytesToBase64(e2eeMessage.encryptedMessage),
      timestamp,
      messageId,
    };

    // Add pre-key message fields if applicable
    if (e2eeMessage.type === "prekey") {
      transmittable.identityKey = bytesToBase64(e2eeMessage.identityKey);
      transmittable.ephemeralKey = bytesToBase64(e2eeMessage.ephemeralKey);
      transmittable.oneTimePreKeyId = e2eeMessage.oneTimePreKeyId;
      transmittable.registrationId = e2eeMessage.registrationId;
    }

    logger.debug("Message encrypted", {
      messageId,
      type: transmittable.type,
      recipientUserId,
    });

    return transmittable;
  }

  /**
   * Decrypts a received message
   */
  async decryptMessage(
    message: TransmittableMessage,
  ): Promise<DecryptedMessage> {
    this.ensureInitialized();

    const sessionId: SessionId = {
      userId: message.senderUserId,
      deviceId: message.senderDeviceId,
    };

    // Check if this is a new session
    const isNewSession = !this.sessionManager!.hasSession(sessionId);

    // Build E2EE message
    const e2eeMessage: E2EEMessage =
      message.type === "prekey"
        ? {
            type: "prekey",
            registrationId: message.registrationId!,
            identityKey: base64ToBytes(message.identityKey!),
            ephemeralKey: base64ToBytes(message.ephemeralKey!),
            oneTimePreKeyId: message.oneTimePreKeyId,
            encryptedMessage: base64ToBytes(message.ciphertext),
          }
        : {
            type: "message",
            encryptedMessage: base64ToBytes(message.ciphertext),
          };

    // Decrypt
    const plaintext = await this.sessionManager!.decryptMessage(
      sessionId,
      e2eeMessage,
    );

    // If a one-time pre-key was used, mark it as consumed
    if (message.type === "prekey" && message.oneTimePreKeyId !== undefined) {
      this.preKeyManager!.markOneTimePreKeyUsed(message.oneTimePreKeyId);

      // Check if we need to replenish pre-keys
      if (this.config.autoReplenishPreKeys) {
        // Fire and forget - don't block message decryption
        this.checkAndReplenishPreKeys().catch((error) => {
          logger.error("Failed to replenish pre-keys", { error });
        });
      }
    }

    logger.debug("Message decrypted", {
      messageId: message.messageId,
      senderUserId: message.senderUserId,
      newSession: isNewSession,
    });

    return {
      content: plaintext,
      senderUserId: message.senderUserId,
      senderDeviceId: message.senderDeviceId,
      timestamp: message.timestamp,
      newSession: isNewSession,
      messageId: message.messageId,
    };
  }

  /**
   * Batch encrypts a message for multiple devices
   */
  async encryptForMultipleDevices(
    recipientDevices: Array<{
      userId: string;
      deviceId: string;
      bundle?: PreKeyBundle;
    }>,
    plaintext: string,
  ): Promise<TransmittableMessage[]> {
    this.ensureInitialized();

    const results: TransmittableMessage[] = [];

    for (const device of recipientDevices) {
      try {
        const encrypted = await this.encryptMessage(
          device.userId,
          device.deviceId,
          plaintext,
          device.bundle,
        );
        results.push(encrypted);
      } catch (error) {
        logger.error("Failed to encrypt for device", {
          userId: device.userId,
          deviceId: device.deviceId,
          error,
        });
        // Continue with other devices
      }
    }

    return results;
  }

  // ==========================================================================
  // Identity Verification
  // ==========================================================================

  /**
   * Gets safety number for a session
   */
  async getSafetyNumber(userId: string, deviceId: string): Promise<string> {
    this.ensureInitialized();
    return this.sessionManager!.getSafetyNumber({ userId, deviceId });
  }

  /**
   * Formats safety number for display
   */
  formatSafetyNumber(safetyNumber: string): string {
    this.ensureInitialized();
    return this.sessionManager!.formatSafetyNumber(safetyNumber);
  }

  /**
   * Gets identity key fingerprint
   */
  getIdentityKeyFingerprint(): string | null {
    if (!this.preKeyManager) {
      return null;
    }

    const identityKeyPair = this.preKeyManager.getIdentityKeyPair();
    if (!identityKeyPair) {
      return null;
    }

    // Generate fingerprint from public key
    const publicKey = identityKeyPair.publicKey;
    const hex = Array.from(publicKey.slice(0, 8))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    return hex;
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * Subscribes to E2EE events
   */
  on(
    eventType: SessionEventType | "prekey_consumed" | "prekey_low",
    callback: (event: any) => void,
  ): () => void {
    const listeners = this.eventListeners.get(eventType) ?? [];
    listeners.push(callback);
    this.eventListeners.set(eventType, listeners);

    return () => {
      const current = this.eventListeners.get(eventType) ?? [];
      this.eventListeners.set(
        eventType,
        current.filter((l) => l !== callback),
      );
    };
  }

  /**
   * Sets up event forwarding from session manager
   */
  private setupEventForwarding(): void {
    if (!this.sessionManager) {
      return;
    }

    const eventTypes: SessionEventType[] = [
      "session_created",
      "session_established",
      "session_closed",
      "session_expired",
      "message_sent",
      "message_received",
      "identity_changed",
    ];

    for (const eventType of eventTypes) {
      this.sessionManager.on(eventType, (event) => {
        this.emitEvent(eventType, event);
      });
    }
  }

  /**
   * Emits an event to listeners
   */
  private emitEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType) ?? [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        logger.error("Event listener error", { eventType, error });
      }
    }
  }

  // ==========================================================================
  // Maintenance
  // ==========================================================================

  /**
   * Performs routine maintenance tasks
   */
  async performMaintenance(): Promise<void> {
    this.ensureInitialized();

    // Clean up expired sessions
    await this.sessionManager!.cleanupExpiredSessions();

    // Clean up used pre-keys
    this.preKeyManager!.cleanupUsedOneTimePreKeys();

    // Replenish pre-keys if needed
    await this.checkAndReplenishPreKeys();

    // Rotate signed pre-key if needed
    await this.rotateSignedPreKeyIfNeeded();

    this.lastSyncAt = new Date();

    logger.info("E2EE maintenance completed");
  }

  /**
   * Syncs with server
   */
  async syncWithServer(): Promise<void> {
    this.ensureInitialized();

    if (this.config.onBundleSyncNeeded) {
      try {
        await this.config.onBundleSyncNeeded(this.createSyncRequest());
        this.lastSyncAt = new Date();
        logger.info("E2EE synced with server");
      } catch (error) {
        logger.error("Failed to sync with server", { error });
        throw error;
      }
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroys the service and wipes all key material
   */
  destroy(): void {
    if (this.sessionManager) {
      this.sessionManager.destroy();
      this.sessionManager = null;
    }

    if (this.preKeyManager) {
      this.preKeyManager.destroy();
      this.preKeyManager = null;
    }

    this.eventListeners.clear();
    this.initialized = false;

    logger.info("E2EE service destroyed");
  }

  /**
   * Clears all stored data (for account reset)
   */
  clearAllData(): void {
    if (this.preKeyManager) {
      this.preKeyManager.clearState();
    }

    this.destroy();

    // Clear storage
    if (this.config.storage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < this.config.storage.length; i++) {
        const key = this.config.storage.key(i);
        if (
          key?.startsWith("nchat_e2ee_") ||
          key?.startsWith("nchat_prekey_")
        ) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        this.config.storage.removeItem(key);
      }
    }

    logger.info("E2EE data cleared");
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Ensures the service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.sessionManager || !this.preKeyManager) {
      throw new Error("E2EE service not initialized. Call initialize() first.");
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates and initializes an E2EE service
 */
export async function createE2EEService(
  config: E2EEServiceConfig,
): Promise<E2EEService> {
  const service = new E2EEService(config);
  await service.initialize();
  return service;
}

// ============================================================================
// Singleton Management
// ============================================================================

let e2eeServiceInstance: E2EEService | null = null;

/**
 * Gets or creates the E2EE service singleton
 */
export async function getE2EEService(
  config?: E2EEServiceConfig,
): Promise<E2EEService> {
  if (!e2eeServiceInstance && config) {
    e2eeServiceInstance = await createE2EEService(config);
  }

  if (!e2eeServiceInstance) {
    throw new Error(
      "E2EE service not configured. Provide config on first call.",
    );
  }

  return e2eeServiceInstance;
}

/**
 * Resets the E2EE service singleton
 */
export function resetE2EEService(): void {
  if (e2eeServiceInstance) {
    e2eeServiceInstance.destroy();
    e2eeServiceInstance = null;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default E2EEService;
