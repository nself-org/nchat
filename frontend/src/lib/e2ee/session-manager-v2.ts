/**
 * E2EE Session Manager (V2)
 *
 * Manages end-to-end encrypted sessions using X3DH key agreement
 * and Double Ratchet algorithm. Provides session lifecycle management,
 * persistence, and recovery.
 *
 * Features:
 * - Session creation and destruction
 * - Message encryption and decryption
 * - Session state persistence
 * - Session recovery after interruption
 * - Multi-device session management
 */

import { logger } from "@/lib/logger";
import {
  X3DH,
  createX3DH,
  type PreKeyBundle,
  type X3DHResult,
  type IdentityKeyPair,
  type SignedPreKey,
  type OneTimePreKey,
} from "./x3dh";
import {
  DoubleRatchet,
  createInitiatorRatchet,
  createResponderRatchet,
  generateRatchetKey,
  encodeEncryptedMessage,
  decodeEncryptedMessage,
  type EncryptedMessage,
  type SerializedRatchetState,
  type RatchetKeyPair,
} from "./double-ratchet";

// ============================================================================
// Constants
// ============================================================================

/** Storage key prefix for sessions */
const SESSION_STORAGE_PREFIX = "nchat_e2ee_session_";

/** Storage key for X3DH state (shared with PreKeyBundleManager) */
const X3DH_STORAGE_KEY = "nchat_e2ee_key_state";

/** Maximum sessions per user */
const MAX_SESSIONS_PER_USER = 10;

/** Session expiry time (30 days) */
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// ============================================================================
// Types
// ============================================================================

/**
 * Session identifier
 */
export interface SessionId {
  /** Remote user ID */
  userId: string;
  /** Remote device ID */
  deviceId: string;
}

/**
 * Session state
 */
export type SessionState =
  | "pending" // Waiting for response
  | "established" // Active session
  | "closed" // Manually closed
  | "expired"; // Auto-expired

/**
 * Session metadata
 */
export interface SessionMetadata {
  /** Session identifier */
  id: SessionId;
  /** Session state */
  state: SessionState;
  /** When session was created */
  createdAt: Date;
  /** When last message was sent */
  lastMessageSentAt: Date | null;
  /** When last message was received */
  lastMessageReceivedAt: Date | null;
  /** Number of messages sent */
  messagesSent: number;
  /** Number of messages received */
  messagesReceived: number;
  /** Remote identity key fingerprint */
  remoteIdentityFingerprint: string;
  /** Local identity key fingerprint */
  localIdentityFingerprint: string;
  /** Whether we initiated the session */
  initiator: boolean;
}

/**
 * Stored session data
 */
export interface StoredSession {
  /** Session metadata */
  metadata: SessionMetadata;
  /** Serialized ratchet state */
  ratchetState: SerializedRatchetState;
  /** Remote identity key */
  remoteIdentityKey: string; // Base64
  /** Local identity key */
  localIdentityKey: string; // Base64
  /** Associated data */
  associatedData: string; // Base64
}

/**
 * Pre-key message (first message establishing session)
 */
export interface PreKeyMessage {
  /** Message type identifier */
  type: "prekey";
  /** Sender's registration ID */
  registrationId: number;
  /** Sender's identity key */
  identityKey: Uint8Array;
  /** Ephemeral key used for X3DH */
  ephemeralKey: Uint8Array;
  /** ID of one-time pre-key used (if any) */
  oneTimePreKeyId?: number;
  /** Encrypted message */
  encryptedMessage: Uint8Array;
}

/**
 * Regular encrypted message
 */
export interface RegularMessage {
  /** Message type identifier */
  type: "message";
  /** Encrypted message */
  encryptedMessage: Uint8Array;
}

/**
 * Union type for all message types
 */
export type E2EEMessage = PreKeyMessage | RegularMessage;

/**
 * Session event types
 */
export type SessionEventType =
  | "session_created"
  | "session_established"
  | "session_closed"
  | "session_expired"
  | "message_sent"
  | "message_received"
  | "identity_changed";

/**
 * Session event
 */
export interface SessionEvent {
  type: SessionEventType;
  sessionId: SessionId;
  timestamp: Date;
  data?: Record<string, unknown>;
}

/**
 * Session manager configuration
 */
export interface SessionManagerConfig {
  /** Local user ID */
  userId: string;
  /** Local device ID */
  deviceId: string;
  /** Registration ID */
  registrationId: number;
  /** Storage provider */
  storage?: Storage;
  /** Auto-persist sessions */
  autoPersist?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a session storage key
 */
function getSessionStorageKey(id: SessionId): string {
  return `${SESSION_STORAGE_PREFIX}${id.userId}_${id.deviceId}`;
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

/**
 * Generates a key fingerprint
 */
async function generateFingerprint(publicKey: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    publicKey as unknown as ArrayBuffer,
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .slice(0, 8)
    .join("")
    .toUpperCase();
}

// ============================================================================
// Session Manager Class
// ============================================================================

/**
 * Manages E2EE sessions for 1:1 conversations
 */
export class E2EESessionManager {
  private config: SessionManagerConfig;
  private x3dh: X3DH | null = null;
  private sessions: Map<string, DoubleRatchet> = new Map();
  private sessionMetadata: Map<string, SessionMetadata> = new Map();
  private pendingSessions: Map<string, X3DHResult> = new Map();
  private eventListeners: Map<
    SessionEventType,
    Array<(event: SessionEvent) => void>
  > = new Map();
  private initialized = false;
  private storage: Storage | null = null;

  constructor(config: SessionManagerConfig) {
    this.config = {
      ...config,
      autoPersist: config.autoPersist ?? true,
    };
    this.storage =
      config.storage ??
      (typeof localStorage !== "undefined" ? localStorage : null);
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initializes the session manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Try to load X3DH state from storage
    const savedX3DHState = this.loadX3DHState();
    if (savedX3DHState) {
      this.x3dh = new X3DH();
      await this.x3dh.importState(savedX3DHState);
    } else {
      // Create new X3DH instance
      this.x3dh = await createX3DH();
      if (this.config.autoPersist) {
        await this.saveX3DHState();
      }
    }

    // Load saved sessions
    await this.loadSessions();

    this.initialized = true;

    logger.info("E2EE Session Manager initialized", {
      userId: this.config.userId,
      deviceId: this.config.deviceId,
    });
  }

  /**
   * Checks if manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ==========================================================================
  // Pre-key Bundle
  // ==========================================================================

  /**
   * Gets the pre-key bundle for publishing
   */
  getPreKeyBundle(): PreKeyBundle {
    if (!this.x3dh) {
      throw new Error("Session manager not initialized");
    }

    return this.x3dh.createPreKeyBundle(
      this.config.userId,
      this.config.deviceId,
      this.config.registrationId,
    );
  }

  /**
   * Gets the local identity key
   */
  getIdentityKey(): Uint8Array | null {
    return this.x3dh?.getIdentityKeyPair()?.publicKey ?? null;
  }

  /**
   * Gets available one-time pre-key count
   */
  getAvailableOneTimePreKeyCount(): number {
    return this.x3dh?.getAvailableOneTimePreKeyCount() ?? 0;
  }

  /**
   * Replenishes one-time pre-keys
   */
  async replenishOneTimePreKeys(count: number): Promise<OneTimePreKey[]> {
    if (!this.x3dh) {
      throw new Error("Session manager not initialized");
    }

    const existingKeys = this.x3dh.getOneTimePreKeys();
    const maxKeyId = existingKeys.reduce((max, k) => Math.max(max, k.keyId), 0);

    // Import generateOneTimePreKeys
    const { generateOneTimePreKeys } = await import("./x3dh");
    const newKeys = await generateOneTimePreKeys(maxKeyId + 1, count);

    this.x3dh.addOneTimePreKeys(newKeys);

    if (this.config.autoPersist) {
      await this.saveX3DHState();
    }

    return newKeys;
  }

  /**
   * Rotates the signed pre-key
   */
  async rotateSignedPreKey(): Promise<SignedPreKey> {
    if (!this.x3dh) {
      throw new Error("Session manager not initialized");
    }

    const newSignedPreKey = await this.x3dh.rotateSignedPreKey();

    if (this.config.autoPersist) {
      await this.saveX3DHState();
    }

    return newSignedPreKey;
  }

  // ==========================================================================
  // Session Creation
  // ==========================================================================

  /**
   * Creates a new session with a remote user (initiator)
   */
  async createSession(remoteBundle: PreKeyBundle): Promise<SessionId> {
    if (!this.x3dh) {
      throw new Error("Session manager not initialized");
    }

    const sessionId: SessionId = {
      userId: remoteBundle.userId,
      deviceId: remoteBundle.deviceId,
    };
    const sessionKey = getSessionStorageKey(sessionId);

    // Check if session already exists
    if (this.sessions.has(sessionKey)) {
      logger.warn("Session already exists", { sessionId });
      return sessionId;
    }

    // Perform X3DH key agreement
    const x3dhResult = await this.x3dh.initiateKeyAgreement(remoteBundle);

    // Store pending session until first message
    this.pendingSessions.set(sessionKey, x3dhResult);

    // Create session metadata
    const localIdentityKey = this.x3dh.getIdentityKeyPair()!.publicKey;
    const metadata: SessionMetadata = {
      id: sessionId,
      state: "pending",
      createdAt: new Date(),
      lastMessageSentAt: null,
      lastMessageReceivedAt: null,
      messagesSent: 0,
      messagesReceived: 0,
      remoteIdentityFingerprint: await generateFingerprint(
        remoteBundle.identityKey,
      ),
      localIdentityFingerprint: await generateFingerprint(localIdentityKey),
      initiator: true,
    };
    this.sessionMetadata.set(sessionKey, metadata);

    // Emit event
    this.emitEvent({
      type: "session_created",
      sessionId,
      timestamp: new Date(),
    });

    logger.info("Session created", {
      sessionId,
      usedOneTimePreKey: x3dhResult.usedOneTimePreKey,
    });

    return sessionId;
  }

  /**
   * Accepts a session from a remote user (responder)
   */
  async acceptSession(
    senderUserId: string,
    senderDeviceId: string,
    senderIdentityKey: Uint8Array,
    senderEphemeralKey: Uint8Array,
    oneTimePreKeyId?: number,
  ): Promise<SessionId> {
    if (!this.x3dh) {
      throw new Error("Session manager not initialized");
    }

    const sessionId: SessionId = {
      userId: senderUserId,
      deviceId: senderDeviceId,
    };
    const sessionKey = getSessionStorageKey(sessionId);

    // Check if session already exists
    if (this.sessions.has(sessionKey)) {
      logger.warn("Session already exists for responder", { sessionId });
      return sessionId;
    }

    // Perform X3DH key agreement
    const x3dhResult = await this.x3dh.completeKeyAgreement(
      senderIdentityKey,
      senderEphemeralKey,
      oneTimePreKeyId,
    );

    // Get our ratchet key pair (signed pre-key acts as initial ratchet key)
    const signedPreKey = this.x3dh.getSignedPreKey();
    if (!signedPreKey) {
      throw new Error("No signed pre-key available");
    }

    const ratchetKeyPair: RatchetKeyPair = {
      publicKey: signedPreKey.publicKey,
      privateKey: signedPreKey.privateKey,
    };

    // Create Double Ratchet session
    const ratchet = await createResponderRatchet(
      x3dhResult.sharedSecret,
      ratchetKeyPair,
      {
        associatedData: x3dhResult.associatedData,
      },
    );

    this.sessions.set(sessionKey, ratchet);

    // Create session metadata
    const localIdentityKey = this.x3dh.getIdentityKeyPair()!.publicKey;
    const metadata: SessionMetadata = {
      id: sessionId,
      state: "established",
      createdAt: new Date(),
      lastMessageSentAt: null,
      lastMessageReceivedAt: null,
      messagesSent: 0,
      messagesReceived: 0,
      remoteIdentityFingerprint: await generateFingerprint(senderIdentityKey),
      localIdentityFingerprint: await generateFingerprint(localIdentityKey),
      initiator: false,
    };
    this.sessionMetadata.set(sessionKey, metadata);

    // Persist session
    if (this.config.autoPersist) {
      await this.saveSession(
        sessionId,
        senderIdentityKey,
        localIdentityKey,
        x3dhResult.associatedData,
      );
    }

    // Emit event
    this.emitEvent({
      type: "session_established",
      sessionId,
      timestamp: new Date(),
    });

    logger.info("Session accepted", { sessionId });

    return sessionId;
  }

  /**
   * Checks if a session exists
   */
  hasSession(sessionId: SessionId): boolean {
    const sessionKey = getSessionStorageKey(sessionId);
    return (
      this.sessions.has(sessionKey) || this.pendingSessions.has(sessionKey)
    );
  }

  /**
   * Gets session metadata
   */
  getSessionMetadata(sessionId: SessionId): SessionMetadata | null {
    const sessionKey = getSessionStorageKey(sessionId);
    return this.sessionMetadata.get(sessionKey) ?? null;
  }

  /**
   * Gets all active sessions
   */
  getAllSessions(): SessionMetadata[] {
    return Array.from(this.sessionMetadata.values());
  }

  // ==========================================================================
  // Message Encryption/Decryption
  // ==========================================================================

  /**
   * Encrypts a message for a session
   */
  async encryptMessage(
    sessionId: SessionId,
    plaintext: string,
  ): Promise<E2EEMessage> {
    if (!this.x3dh) {
      throw new Error("Session manager not initialized");
    }

    const sessionKey = getSessionStorageKey(sessionId);
    const plaintextBytes = new TextEncoder().encode(plaintext);

    // Check if this is a pending session (first message)
    const pendingX3DH = this.pendingSessions.get(sessionKey);
    if (pendingX3DH) {
      // Get the remote signed pre-key (used as initial ratchet key)
      // We need to create the ratchet now
      const ratchet = await createInitiatorRatchet(
        pendingX3DH.sharedSecret,
        pendingX3DH.remoteSignedPreKey, // Remote's signed pre-key as initial ratchet key
        {
          associatedData: pendingX3DH.associatedData,
        },
      );

      this.sessions.set(sessionKey, ratchet);
      this.pendingSessions.delete(sessionKey);

      // Update session state
      const metadata = this.sessionMetadata.get(sessionKey);
      if (metadata) {
        metadata.state = "established";
      }

      // Encrypt the message
      const encrypted = await ratchet.encrypt(plaintextBytes);
      const encodedMessage = encodeEncryptedMessage(encrypted);

      // Update metadata
      if (metadata) {
        metadata.lastMessageSentAt = new Date();
        metadata.messagesSent++;
      }

      // Persist session
      const localIdentityKey = this.x3dh.getIdentityKeyPair()!.publicKey;
      if (this.config.autoPersist) {
        // Get remote identity key from somewhere (store it when session is created)
        const remoteIdentityKey = pendingX3DH.associatedData.slice(
          localIdentityKey.length,
        );
        await this.saveSession(
          sessionId,
          remoteIdentityKey,
          localIdentityKey,
          pendingX3DH.associatedData,
        );
      }

      // Create pre-key message
      const preKeyMessage: PreKeyMessage = {
        type: "prekey",
        registrationId: this.config.registrationId,
        identityKey: localIdentityKey,
        ephemeralKey: pendingX3DH.ephemeralPublicKey,
        oneTimePreKeyId: pendingX3DH.usedOneTimePreKeyId,
        encryptedMessage: encodedMessage,
      };

      // Emit events
      this.emitEvent({
        type: "session_established",
        sessionId,
        timestamp: new Date(),
      });

      this.emitEvent({
        type: "message_sent",
        sessionId,
        timestamp: new Date(),
      });

      logger.debug("Pre-key message encrypted", { sessionId });

      return preKeyMessage;
    }

    // Regular message encryption
    const ratchet = this.sessions.get(sessionKey);
    if (!ratchet) {
      throw new Error(
        `No session found for ${sessionId.userId}:${sessionId.deviceId}`,
      );
    }

    const encrypted = await ratchet.encrypt(plaintextBytes);
    const encodedMessage = encodeEncryptedMessage(encrypted);

    // Update metadata
    const metadata = this.sessionMetadata.get(sessionKey);
    if (metadata) {
      metadata.lastMessageSentAt = new Date();
      metadata.messagesSent++;
    }

    // Persist updated session state
    if (this.config.autoPersist) {
      await this.persistSessionRatchet(sessionId);
    }

    // Emit event
    this.emitEvent({
      type: "message_sent",
      sessionId,
      timestamp: new Date(),
    });

    logger.debug("Message encrypted", { sessionId });

    return {
      type: "message",
      encryptedMessage: encodedMessage,
    };
  }

  /**
   * Decrypts a message from a session
   */
  async decryptMessage(
    sessionId: SessionId,
    message: E2EEMessage,
  ): Promise<string> {
    if (!this.x3dh) {
      throw new Error("Session manager not initialized");
    }

    const sessionKey = getSessionStorageKey(sessionId);

    if (message.type === "prekey") {
      // First message - accept session and decrypt
      await this.acceptSession(
        sessionId.userId,
        sessionId.deviceId,
        message.identityKey,
        message.ephemeralKey,
        message.oneTimePreKeyId,
      );
    }

    const ratchet = this.sessions.get(sessionKey);
    if (!ratchet) {
      throw new Error(
        `No session found for ${sessionId.userId}:${sessionId.deviceId}`,
      );
    }

    // Decode and decrypt message
    const encrypted = decodeEncryptedMessage(message.encryptedMessage);
    const plaintextBytes = await ratchet.decrypt(encrypted);
    const plaintext = new TextDecoder().decode(plaintextBytes);

    // Update metadata
    const metadata = this.sessionMetadata.get(sessionKey);
    if (metadata) {
      metadata.lastMessageReceivedAt = new Date();
      metadata.messagesReceived++;
    }

    // Persist updated session state
    if (this.config.autoPersist) {
      await this.persistSessionRatchet(sessionId);
    }

    // Emit event
    this.emitEvent({
      type: "message_received",
      sessionId,
      timestamp: new Date(),
    });

    logger.debug("Message decrypted", { sessionId });

    return plaintext;
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  /**
   * Closes a session
   */
  async closeSession(sessionId: SessionId): Promise<void> {
    const sessionKey = getSessionStorageKey(sessionId);

    const ratchet = this.sessions.get(sessionKey);
    if (ratchet) {
      ratchet.destroy();
      this.sessions.delete(sessionKey);
    }

    this.pendingSessions.delete(sessionKey);

    const metadata = this.sessionMetadata.get(sessionKey);
    if (metadata) {
      metadata.state = "closed";
    }

    // Remove from storage
    this.removeSessionFromStorage(sessionId);

    // Emit event
    this.emitEvent({
      type: "session_closed",
      sessionId,
      timestamp: new Date(),
    });

    logger.info("Session closed", { sessionId });
  }

  /**
   * Cleans up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, metadata] of this.sessionMetadata) {
      const lastActivity = Math.max(
        metadata.lastMessageSentAt?.getTime() ?? 0,
        metadata.lastMessageReceivedAt?.getTime() ?? 0,
        metadata.createdAt.getTime(),
      );

      if (now - lastActivity > SESSION_EXPIRY_MS) {
        await this.closeSession(metadata.id);
        this.sessionMetadata.delete(key);
        cleaned++;

        // Emit event
        this.emitEvent({
          type: "session_expired",
          sessionId: metadata.id,
          timestamp: new Date(),
        });
      }
    }

    logger.info("Cleaned up expired sessions", { count: cleaned });
    return cleaned;
  }

  // ==========================================================================
  // Identity Verification
  // ==========================================================================

  /**
   * Gets safety number for session verification
   */
  async getSafetyNumber(sessionId: SessionId): Promise<string> {
    if (!this.x3dh) {
      throw new Error("Session manager not initialized");
    }

    const sessionKey = getSessionStorageKey(sessionId);
    const metadata = this.sessionMetadata.get(sessionKey);
    if (!metadata) {
      throw new Error("Session not found");
    }

    // Generate a safety number from both identity fingerprints
    const combined =
      metadata.localIdentityFingerprint + metadata.remoteIdentityFingerprint;
    const sorted = [
      metadata.localIdentityFingerprint,
      metadata.remoteIdentityFingerprint,
    ]
      .sort()
      .join("");

    const data = new TextEncoder().encode(sorted);
    const hash = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hash));

    // Convert to 60 digit number
    let safetyNumber = "";
    for (let i = 0; i < 60; i++) {
      safetyNumber += hashArray[i % hashArray.length] % 10;
    }

    return safetyNumber;
  }

  /**
   * Formats safety number for display
   */
  formatSafetyNumber(safetyNumber: string): string {
    const chunks: string[] = [];
    for (let i = 0; i < safetyNumber.length; i += 5) {
      chunks.push(safetyNumber.slice(i, i + 5));
    }
    return chunks.join(" ");
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * Subscribes to session events
   */
  on(
    eventType: SessionEventType,
    callback: (event: SessionEvent) => void,
  ): () => void {
    const listeners = this.eventListeners.get(eventType) ?? [];
    listeners.push(callback);
    this.eventListeners.set(eventType, listeners);

    // Return unsubscribe function
    return () => {
      const current = this.eventListeners.get(eventType) ?? [];
      this.eventListeners.set(
        eventType,
        current.filter((l) => l !== callback),
      );
    };
  }

  /**
   * Emits a session event
   */
  private emitEvent(event: SessionEvent): void {
    const listeners = this.eventListeners.get(event.type) ?? [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error("Event listener error", { error, eventType: event.type });
      }
    }
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  /**
   * Saves X3DH state to storage
   */
  private async saveX3DHState(): Promise<void> {
    if (!this.storage || !this.x3dh) {
      return;
    }

    try {
      const state = await this.x3dh.exportState();
      this.storage.setItem(X3DH_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      logger.error("Failed to save X3DH state", { error });
    }
  }

  /**
   * Loads X3DH state from storage (compatible with PreKeyBundleManager format)
   */
  private loadX3DHState(): {
    identityKeyPair: { publicKey: string; privateKey: string };
    signedPreKey: {
      keyId: number;
      publicKey: string;
      privateKey: string;
      signature: string;
      timestamp: number;
    };
    oneTimePreKeys: Array<{
      keyId: number;
      publicKey: string;
      privateKey: string;
      used: boolean;
    }>;
  } | null {
    if (!this.storage) {
      return null;
    }

    try {
      const data = this.storage.getItem(X3DH_STORAGE_KEY);
      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);

      // Check if this is PreKeyBundleState format (has keyPair in signedPreKey)
      if (parsed.signedPreKey?.keyPair) {
        // Convert from PreKeyBundleState format to X3DH format
        return {
          identityKeyPair: parsed.identityKeyPair,
          signedPreKey: {
            keyId: parsed.signedPreKey.keyId,
            publicKey: parsed.signedPreKey.keyPair.publicKey,
            privateKey: parsed.signedPreKey.keyPair.privateKey,
            signature: parsed.signedPreKey.signature,
            timestamp: parsed.signedPreKey.timestamp,
          },
          oneTimePreKeys: parsed.oneTimePreKeys.map(
            (key: {
              keyId: number;
              publicKey: string;
              privateKey: string;
              used?: boolean;
            }) => ({
              keyId: key.keyId,
              publicKey: key.publicKey,
              privateKey: key.privateKey,
              used: key.used ?? false,
            }),
          ),
        };
      }

      // Already in X3DH format
      return parsed;
    } catch (error) {
      logger.error("Failed to load X3DH state", { error });
    }

    return null;
  }

  /**
   * Saves a session to storage
   */
  private async saveSession(
    sessionId: SessionId,
    remoteIdentityKey: Uint8Array,
    localIdentityKey: Uint8Array,
    associatedData: Uint8Array,
  ): Promise<void> {
    if (!this.storage) {
      return;
    }

    const sessionKey = getSessionStorageKey(sessionId);
    const ratchet = this.sessions.get(sessionKey);
    const metadata = this.sessionMetadata.get(sessionKey);

    if (!ratchet || !metadata) {
      return;
    }

    try {
      const stored: StoredSession = {
        metadata: {
          ...metadata,
          createdAt: metadata.createdAt,
          lastMessageSentAt: metadata.lastMessageSentAt,
          lastMessageReceivedAt: metadata.lastMessageReceivedAt,
        },
        ratchetState: ratchet.serializeState(),
        remoteIdentityKey: bytesToBase64(remoteIdentityKey),
        localIdentityKey: bytesToBase64(localIdentityKey),
        associatedData: bytesToBase64(associatedData),
      };

      this.storage.setItem(sessionKey, JSON.stringify(stored));
    } catch (error) {
      logger.error("Failed to save session", { error, sessionId });
    }
  }

  /**
   * Persists only the ratchet state (for efficiency)
   */
  private async persistSessionRatchet(sessionId: SessionId): Promise<void> {
    if (!this.storage) {
      return;
    }

    const sessionKey = getSessionStorageKey(sessionId);
    const ratchet = this.sessions.get(sessionKey);

    if (!ratchet) {
      return;
    }

    try {
      const existingData = this.storage.getItem(sessionKey);
      if (existingData) {
        const stored: StoredSession = JSON.parse(existingData);
        stored.ratchetState = ratchet.serializeState();
        stored.metadata =
          this.sessionMetadata.get(sessionKey) ?? stored.metadata;
        this.storage.setItem(sessionKey, JSON.stringify(stored));
      }
    } catch (error) {
      logger.error("Failed to persist session ratchet", { error, sessionId });
    }
  }

  /**
   * Loads sessions from storage
   */
  private async loadSessions(): Promise<void> {
    if (!this.storage) {
      return;
    }

    const keysToLoad: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(SESSION_STORAGE_PREFIX)) {
        keysToLoad.push(key);
      }
    }

    for (const key of keysToLoad) {
      try {
        const data = this.storage.getItem(key);
        if (data) {
          const stored: StoredSession = JSON.parse(data);

          // Recreate ratchet
          const ratchet = new DoubleRatchet({
            associatedData: base64ToBytes(stored.associatedData),
          });
          await ratchet.deserializeState(stored.ratchetState);

          this.sessions.set(key, ratchet);

          // Restore metadata
          const metadata: SessionMetadata = {
            ...stored.metadata,
            createdAt: new Date(stored.metadata.createdAt),
            lastMessageSentAt: stored.metadata.lastMessageSentAt
              ? new Date(stored.metadata.lastMessageSentAt)
              : null,
            lastMessageReceivedAt: stored.metadata.lastMessageReceivedAt
              ? new Date(stored.metadata.lastMessageReceivedAt)
              : null,
          };
          this.sessionMetadata.set(key, metadata);
        }
      } catch (error) {
        logger.error("Failed to load session", { error, key });
        // Remove corrupted session
        this.storage.removeItem(key);
      }
    }

    logger.debug("Loaded sessions from storage", { count: this.sessions.size });
  }

  /**
   * Removes a session from storage
   */
  private removeSessionFromStorage(sessionId: SessionId): void {
    if (!this.storage) {
      return;
    }

    const sessionKey = getSessionStorageKey(sessionId);
    this.storage.removeItem(sessionKey);
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroys the session manager and wipes all key material
   */
  destroy(): void {
    // Destroy all sessions
    for (const ratchet of this.sessions.values()) {
      ratchet.destroy();
    }
    this.sessions.clear();
    this.sessionMetadata.clear();
    this.pendingSessions.clear();

    // Destroy X3DH
    if (this.x3dh) {
      this.x3dh.destroy();
      this.x3dh = null;
    }

    // Clear event listeners
    this.eventListeners.clear();

    this.initialized = false;

    logger.info("E2EE Session Manager destroyed");
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates and initializes a session manager
 */
export async function createSessionManager(
  config: SessionManagerConfig,
): Promise<E2EESessionManager> {
  const manager = new E2EESessionManager(config);
  await manager.initialize();
  return manager;
}

// ============================================================================
// Exports
// ============================================================================

export default E2EESessionManager;
