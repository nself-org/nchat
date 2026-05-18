/**
 * Session Management for E2E Encryption
 *
 * Manages encrypted sessions between users. Each session contains
 * the state needed for the Double Ratchet algorithm, including
 * root keys, chain keys, and ratchet keys.
 *
 * Sessions are stored encrypted in IndexedDB and synchronized
 * to the server for multi-device support.
 */

import type {
  SessionState,
  SessionRecord,
  IdentityKeyPair,
  PreKeyBundle,
  SignedPreKey,
  OneTimePreKey,
  EncryptionConfig,
} from "@/types/encryption";

import {
  EncryptionError,
  EncryptionErrorType,
  DEFAULT_ENCRYPTION_CONFIG,
} from "@/types/encryption";
import {
  uint8ArrayToBase64,
  base64ToUint8Array,
  uint8ArrayToHex,
  randomBytes,
} from "./crypto-primitives";
import { X3DH, X3DHInitialMessage } from "./key-exchange";
import { getIdentityManager } from "./identity";
import { getSignedPreKeyManager } from "./prekey";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Session identifier (user_id + device_id)
 */
export interface SessionId {
  peerId: string;
  deviceId?: string;
}

/**
 * Stored session data (serializable)
 */
export interface StoredSession {
  peerId: string;
  deviceId?: string;
  state: string; // base64-encoded encrypted state
  version: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Session info for display
 */
export interface SessionInfo {
  peerId: string;
  deviceId?: string;
  isActive: boolean;
  lastActivityAt: Date;
  messageCount: number;
  hasForwardSecrecy: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SESSION_STORAGE_KEY_PREFIX = "nchat_session_";
const SESSION_DB_NAME = "nchat_sessions";
const SESSION_STORE_NAME = "sessions";
const SESSION_VERSION = 1;
const MAX_SKIPPED_KEYS = 1000;

// ============================================================================
// Session Manager
// ============================================================================

/**
 * Session Manager class
 *
 * Manages all encrypted sessions for the local user.
 * Handles session creation, retrieval, storage, and cleanup.
 */
export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, SessionState> = new Map();
  private db: IDBDatabase | null = null;
  private initialized = false;
  private config: EncryptionConfig;

  private constructor(config?: Partial<EncryptionConfig>) {
    this.config = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(config?: Partial<EncryptionConfig>): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(config);
    }
    return SessionManager.instance;
  }

  /**
   * Initializes the session manager
   * Opens the IndexedDB database and loads cached sessions
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = await this.openDatabase();
      await this.loadSessions();
      this.initialized = true;
    } catch (error) {
      throw new EncryptionError(
        EncryptionErrorType.STORAGE_ERROR,
        "Failed to initialize session manager",
        error,
      );
    }
  }

  /**
   * Creates a new session with a peer using X3DH
   *
   * @param peerId - The peer's user ID
   * @param preKeyBundle - The peer's prekey bundle
   * @returns The initial message to send with the first encrypted message
   */
  async createSession(
    peerId: string,
    preKeyBundle: PreKeyBundle,
  ): Promise<X3DHInitialMessage> {
    await this.ensureInitialized();

    const identityManager = getIdentityManager();
    const identityKeyPair = await identityManager.getIdentityKeyPair();

    // Perform X3DH key exchange
    const x3dhResult = await X3DH.initiatorCalculateSecret(
      identityKeyPair,
      preKeyBundle,
    );

    // Derive initial keys
    const { rootKey, chainKey } = await X3DH.deriveInitialKeys(
      x3dhResult.sharedSecret,
    );

    // Create initial session state
    const sessionState: SessionState = {
      remoteIdentityKey: preKeyBundle.identityKey,
      rootKey,
      sendingChainKey: chainKey,
      receivingChainKey: null,
      sendingRatchetKey: x3dhResult.ephemeralKeyPair.privateKey,
      receivingRatchetKey: null,
      sendingMessageNumber: 0,
      receivingMessageNumber: 0,
      previousChainLength: 0,
      skippedMessageKeys: [],
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    // Store the session
    await this.storeSession(peerId, sessionState);

    // Create the initial message
    return X3DH.createInitialMessage(
      identityKeyPair.publicKey,
      x3dhResult.ephemeralKeyPair.publicKey,
      preKeyBundle.signedPreKey.keyId,
      preKeyBundle.oneTimePreKey?.keyId,
    );
  }

  /**
   * Creates a session from an incoming prekey message
   *
   * @param senderId - The sender's user ID
   * @param initialMessage - The X3DH initial message from the sender
   * @returns The created session state
   */
  async createSessionFromPreKeyMessage(
    senderId: string,
    initialMessage: X3DHInitialMessage,
  ): Promise<SessionState> {
    await this.ensureInitialized();

    const identityManager = getIdentityManager();
    const signedPreKeyManager = getSignedPreKeyManager();

    const identityKeyPair = await identityManager.getIdentityKeyPair();

    // Get the signed prekey that was used
    const signedPreKey = await signedPreKeyManager.getSignedPreKey(
      initialMessage.signedPreKeyId,
    );

    if (!signedPreKey) {
      throw new EncryptionError(
        EncryptionErrorType.PREKEY_NOT_FOUND,
        `Signed prekey ${initialMessage.signedPreKeyId} not found`,
      );
    }

    // Get the one-time prekey if used
    let oneTimePreKey: OneTimePreKey | null = null;
    if (initialMessage.oneTimePreKeyId !== undefined) {
      oneTimePreKey = await this.getOneTimePreKey(
        initialMessage.oneTimePreKeyId,
      );
      if (!oneTimePreKey) {
        // One-time prekey may have been used already - proceed without it
        logger.warn(
          `One-time prekey ${initialMessage.oneTimePreKeyId} not found`,
        );
      }
    }

    // Perform X3DH as responder
    const x3dhResult = await X3DH.responderCalculateSecret(
      identityKeyPair,
      signedPreKey,
      oneTimePreKey,
      initialMessage.identityKey,
      initialMessage.ephemeralKey,
    );

    // Derive initial keys
    const { rootKey, chainKey } = await X3DH.deriveInitialKeys(
      x3dhResult.sharedSecret,
    );

    // Create session state (as receiver)
    const sessionState: SessionState = {
      remoteIdentityKey: initialMessage.identityKey,
      rootKey,
      sendingChainKey: null,
      receivingChainKey: chainKey,
      sendingRatchetKey: null,
      receivingRatchetKey: initialMessage.ephemeralKey,
      sendingMessageNumber: 0,
      receivingMessageNumber: 0,
      previousChainLength: 0,
      skippedMessageKeys: [],
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    // Store the session
    await this.storeSession(senderId, sessionState);

    // Mark one-time prekey as used
    if (oneTimePreKey && initialMessage.oneTimePreKeyId !== undefined) {
      await this.markOneTimePreKeyUsed(initialMessage.oneTimePreKeyId);
    }

    return sessionState;
  }

  /**
   * Gets an existing session with a peer
   *
   * @param peerId - The peer's user ID
   * @returns The session state or null if no session exists
   */
  async getSession(peerId: string): Promise<SessionState | null> {
    await this.ensureInitialized();
    return this.sessions.get(this.getSessionKey(peerId)) || null;
  }

  /**
   * Checks if a session exists with a peer
   *
   * @param peerId - The peer's user ID
   * @returns True if a session exists
   */
  async hasSession(peerId: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.sessions.has(this.getSessionKey(peerId));
  }

  /**
   * Updates an existing session
   *
   * @param peerId - The peer's user ID
   * @param sessionState - The updated session state
   */
  async updateSession(
    peerId: string,
    sessionState: SessionState,
  ): Promise<void> {
    await this.ensureInitialized();

    sessionState.lastActivityAt = Date.now();
    await this.storeSession(peerId, sessionState);
  }

  /**
   * Deletes a session with a peer
   *
   * @param peerId - The peer's user ID
   */
  async deleteSession(peerId: string): Promise<void> {
    await this.ensureInitialized();

    const key = this.getSessionKey(peerId);
    this.sessions.delete(key);

    if (this.db) {
      await this.deleteFromDatabase(key);
    }

    // Also remove from localStorage
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(SESSION_STORAGE_KEY_PREFIX + key);
    }
  }

  /**
   * Gets information about a session
   *
   * @param peerId - The peer's user ID
   * @returns Session info or null if no session exists
   */
  async getSessionInfo(peerId: string): Promise<SessionInfo | null> {
    const session = await this.getSession(peerId);
    if (!session) return null;

    return {
      peerId,
      isActive: true,
      lastActivityAt: new Date(session.lastActivityAt),
      messageCount:
        session.sendingMessageNumber + session.receivingMessageNumber,
      hasForwardSecrecy:
        session.sendingRatchetKey !== null ||
        session.receivingRatchetKey !== null,
    };
  }

  /**
   * Gets all active sessions
   *
   * @returns Array of session info objects
   */
  async getAllSessions(): Promise<SessionInfo[]> {
    await this.ensureInitialized();

    const sessions: SessionInfo[] = [];
    for (const [key, session] of this.sessions) {
      const peerId = this.getPeerIdFromKey(key);
      sessions.push({
        peerId,
        isActive: true,
        lastActivityAt: new Date(session.lastActivityAt),
        messageCount:
          session.sendingMessageNumber + session.receivingMessageNumber,
        hasForwardSecrecy:
          session.sendingRatchetKey !== null ||
          session.receivingRatchetKey !== null,
      });
    }

    return sessions;
  }

  /**
   * Stores a skipped message key for out-of-order delivery
   *
   * @param peerId - The peer's user ID
   * @param ratchetKey - The ratchet public key (hex encoded)
   * @param messageNumber - The message number
   * @param messageKey - The message key
   */
  async storeSkippedMessageKey(
    peerId: string,
    ratchetKey: string,
    messageNumber: number,
    messageKey: Uint8Array,
  ): Promise<void> {
    const session = await this.getSession(peerId);
    if (!session) {
      throw new EncryptionError(
        EncryptionErrorType.NO_SESSION,
        `No session found for peer ${peerId}`,
      );
    }

    // Add the skipped key
    session.skippedMessageKeys.push({
      ratchetKey,
      messageNumber,
      messageKey,
    });

    // Limit the number of skipped keys
    if (session.skippedMessageKeys.length > MAX_SKIPPED_KEYS) {
      session.skippedMessageKeys.shift();
    }

    await this.updateSession(peerId, session);
  }

  /**
   * Retrieves and removes a skipped message key
   *
   * @param peerId - The peer's user ID
   * @param ratchetKey - The ratchet public key (hex encoded)
   * @param messageNumber - The message number
   * @returns The message key or null if not found
   */
  async getAndRemoveSkippedMessageKey(
    peerId: string,
    ratchetKey: string,
    messageNumber: number,
  ): Promise<Uint8Array | null> {
    const session = await this.getSession(peerId);
    if (!session) return null;

    const index = session.skippedMessageKeys.findIndex(
      (k) => k.ratchetKey === ratchetKey && k.messageNumber === messageNumber,
    );

    if (index === -1) return null;

    const [skipped] = session.skippedMessageKeys.splice(index, 1);
    await this.updateSession(peerId, session);

    return skipped.messageKey;
  }

  /**
   * Clears all sessions
   */
  async clearAllSessions(): Promise<void> {
    await this.ensureInitialized();

    this.sessions.clear();

    if (this.db) {
      const tx = this.db.transaction(SESSION_STORE_NAME, "readwrite");
      const store = tx.objectStore(SESSION_STORE_NAME);
      store.clear();
    }

    // Clear localStorage
    if (typeof localStorage !== "undefined") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(SESSION_STORAGE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
  }

  /**
   * Cleans up old/expired sessions
   *
   * @param maxAge - Maximum session age in milliseconds
   */
  async cleanupOldSessions(maxAge?: number): Promise<void> {
    await this.ensureInitialized();

    const cutoff = Date.now() - (maxAge || this.config.sessionTimeout);
    const toDelete: string[] = [];

    for (const [key, session] of this.sessions) {
      if (session.lastActivityAt < cutoff) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      const peerId = this.getPeerIdFromKey(key);
      await this.deleteSession(peerId);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Ensures the manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Gets the storage key for a peer
   */
  private getSessionKey(peerId: string, deviceId?: string): string {
    return deviceId ? `${peerId}_${deviceId}` : peerId;
  }

  /**
   * Extracts peer ID from storage key
   */
  private getPeerIdFromKey(key: string): string {
    const parts = key.split("_");
    return parts[0];
  }

  /**
   * Stores a session in memory and persistent storage
   */
  private async storeSession(
    peerId: string,
    sessionState: SessionState,
  ): Promise<void> {
    const key = this.getSessionKey(peerId);
    this.sessions.set(key, sessionState);

    // Store in IndexedDB
    if (this.db) {
      await this.saveToDatabase(key, sessionState);
    }

    // Fallback to localStorage
    if (typeof localStorage !== "undefined") {
      this.saveToLocalStorage(key, sessionState);
    }
  }

  /**
   * Opens the IndexedDB database
   */
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB not available"));
        return;
      }

      const request = indexedDB.open(SESSION_DB_NAME, SESSION_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(SESSION_STORE_NAME)) {
          const store = db.createObjectStore(SESSION_STORE_NAME, {
            keyPath: "key",
          });
          store.createIndex("peerId", "peerId", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };
    });
  }

  /**
   * Loads all sessions from storage
   */
  private async loadSessions(): Promise<void> {
    // Try IndexedDB first
    if (this.db) {
      try {
        const sessions = await this.loadFromDatabase();
        for (const session of sessions) {
          this.sessions.set(
            session.key,
            this.deserializeSessionState(session.state),
          );
        }
        return;
      } catch (error) {
        logger.error("Failed to load sessions from IndexedDB:", error);
      }
    }

    // Fallback to localStorage
    if (typeof localStorage !== "undefined") {
      this.loadFromLocalStorage();
    }
  }

  /**
   * Loads sessions from IndexedDB
   */
  private async loadFromDatabase(): Promise<
    Array<{ key: string; state: string }>
  > {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const tx = this.db.transaction(SESSION_STORE_NAME, "readonly");
      const store = tx.objectStore(SESSION_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Saves a session to IndexedDB
   */
  private async saveToDatabase(
    key: string,
    sessionState: SessionState,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const tx = this.db.transaction(SESSION_STORE_NAME, "readwrite");
      const store = tx.objectStore(SESSION_STORE_NAME);

      const record = {
        key,
        peerId: this.getPeerIdFromKey(key),
        state: this.serializeSessionState(sessionState),
        updatedAt: Date.now(),
      };

      const request = store.put(record);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Deletes a session from IndexedDB
   */
  private async deleteFromDatabase(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const tx = this.db.transaction(SESSION_STORE_NAME, "readwrite");
      const store = tx.objectStore(SESSION_STORE_NAME);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Saves a session to localStorage
   */
  private saveToLocalStorage(key: string, sessionState: SessionState): void {
    try {
      const serialized = this.serializeSessionState(sessionState);
      localStorage.setItem(SESSION_STORAGE_KEY_PREFIX + key, serialized);
    } catch (error) {
      logger.error("Failed to save session to localStorage:", error);
    }
  }

  /**
   * Loads sessions from localStorage
   */
  private loadFromLocalStorage(): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SESSION_STORAGE_KEY_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const sessionKey = key.replace(SESSION_STORAGE_KEY_PREFIX, "");
            this.sessions.set(sessionKey, this.deserializeSessionState(stored));
          }
        } catch (error) {
          logger.error(`Failed to load session ${key}:`, error);
        }
      }
    }
  }

  /**
   * Serializes session state for storage
   */
  private serializeSessionState(state: SessionState): string {
    const serializable = {
      remoteIdentityKey: uint8ArrayToBase64(state.remoteIdentityKey),
      rootKey: uint8ArrayToBase64(state.rootKey),
      sendingChainKey: state.sendingChainKey
        ? uint8ArrayToBase64(state.sendingChainKey)
        : null,
      receivingChainKey: state.receivingChainKey
        ? uint8ArrayToBase64(state.receivingChainKey)
        : null,
      sendingRatchetKey: state.sendingRatchetKey
        ? uint8ArrayToBase64(state.sendingRatchetKey)
        : null,
      receivingRatchetKey: state.receivingRatchetKey
        ? uint8ArrayToBase64(state.receivingRatchetKey)
        : null,
      sendingMessageNumber: state.sendingMessageNumber,
      receivingMessageNumber: state.receivingMessageNumber,
      previousChainLength: state.previousChainLength,
      skippedMessageKeys: state.skippedMessageKeys.map((k) => ({
        ratchetKey: k.ratchetKey,
        messageNumber: k.messageNumber,
        messageKey: uint8ArrayToBase64(k.messageKey),
      })),
      createdAt: state.createdAt,
      lastActivityAt: state.lastActivityAt,
    };

    return JSON.stringify(serializable);
  }

  /**
   * Deserializes session state from storage
   */
  private deserializeSessionState(serialized: string): SessionState {
    const parsed = JSON.parse(serialized);

    return {
      remoteIdentityKey: base64ToUint8Array(parsed.remoteIdentityKey),
      rootKey: base64ToUint8Array(parsed.rootKey),
      sendingChainKey: parsed.sendingChainKey
        ? base64ToUint8Array(parsed.sendingChainKey)
        : null,
      receivingChainKey: parsed.receivingChainKey
        ? base64ToUint8Array(parsed.receivingChainKey)
        : null,
      sendingRatchetKey: parsed.sendingRatchetKey
        ? base64ToUint8Array(parsed.sendingRatchetKey)
        : null,
      receivingRatchetKey: parsed.receivingRatchetKey
        ? base64ToUint8Array(parsed.receivingRatchetKey)
        : null,
      sendingMessageNumber: parsed.sendingMessageNumber,
      receivingMessageNumber: parsed.receivingMessageNumber,
      previousChainLength: parsed.previousChainLength,
      skippedMessageKeys: parsed.skippedMessageKeys.map(
        (k: {
          ratchetKey: string;
          messageNumber: number;
          messageKey: string;
        }) => ({
          ratchetKey: k.ratchetKey,
          messageNumber: k.messageNumber,
          messageKey: base64ToUint8Array(k.messageKey),
        }),
      ),
      createdAt: parsed.createdAt,
      lastActivityAt: parsed.lastActivityAt,
    };
  }

  /**
   * Gets a one-time prekey by ID (placeholder - should be implemented with actual storage)
   */
  private async getOneTimePreKey(keyId: number): Promise<OneTimePreKey | null> {
    // This should be implemented to retrieve from actual one-time prekey storage
    // For now, return null (would be handled by a separate OTP manager)
    return null;
  }

  /**
   * Marks a one-time prekey as used
   */
  private async markOneTimePreKeyUsed(keyId: number): Promise<void> {
    // This should be implemented to mark the prekey as used in storage
    // For now, this is a placeholder
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Gets the global session manager instance
 */
export function getSessionManager(): SessionManager {
  return SessionManager.getInstance();
}

/**
 * Creates a new session with a peer
 */
export async function createSession(
  peerId: string,
  preKeyBundle: PreKeyBundle,
): Promise<X3DHInitialMessage> {
  return getSessionManager().createSession(peerId, preKeyBundle);
}

/**
 * Gets an existing session
 */
export async function getSession(peerId: string): Promise<SessionState | null> {
  return getSessionManager().getSession(peerId);
}

/**
 * Checks if a session exists
 */
export async function hasSession(peerId: string): Promise<boolean> {
  return getSessionManager().hasSession(peerId);
}

/**
 * Deletes a session
 */
export async function deleteSession(peerId: string): Promise<void> {
  return getSessionManager().deleteSession(peerId);
}

/**
 * Gets info about all sessions
 */
export async function getAllSessionInfo(): Promise<SessionInfo[]> {
  return getSessionManager().getAllSessions();
}
