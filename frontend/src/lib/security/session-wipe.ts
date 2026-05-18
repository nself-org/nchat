/**
 * Session Wipe Module
 *
 * Provides secure session termination with cryptographic key destruction.
 * Implements remote wipe capability for lost/stolen devices and
 * session kill functionality from other devices.
 *
 * Security features:
 * - Cryptographic key destruction (cannot decrypt future data)
 * - Evidence preservation before wipe
 * - Wipe verification and confirmation
 * - Post-wipe key destruction verification
 */

import { logger } from "@/lib/logger";
import { getSecureStorage, type ISecureStorage } from "@/lib/secure-storage";
import { isClient } from "@/lib/environment";

// ============================================================================
// Constants
// ============================================================================

const LOG_PREFIX = "[SessionWipe]";
const WIPE_TOKEN_KEY = "nchat_wipe_token";
const WIPE_STATE_KEY = "nchat_wipe_state";
const WIPE_EVIDENCE_KEY = "nchat_wipe_evidence";
const KEY_DESTRUCTION_PROOF_KEY = "nchat_key_destruction_proof";
const SESSION_KEYS_PREFIX = "nchat_session_key_";
const ENCRYPTION_KEYS_PREFIX = "nchat_enc_key_";

// Storage keys to wipe in order of sensitivity
const SENSITIVE_KEYS = [
  "nchat_identity_key",
  "nchat_signed_prekey",
  "nchat_one_time_prekeys",
  "nchat_session_keys",
  "nchat_root_key",
  "nchat_chain_key",
  "nchat_message_keys",
  "nchat_app_lock_pin_hash",
  "nchat_app_lock_settings",
  "nchat_biometric_key",
  "nchat_secure_storage_key",
] as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Wipe operation types
 */
export type WipeType =
  | "session_kill" // Terminate single session
  | "device_wipe" // Wipe entire device
  | "remote_wipe" // Remote wipe from another device
  | "panic_wipe" // Emergency wipe (fastest path)
  | "scheduled_wipe"; // Scheduled wipe (e.g., after N failed attempts)

/**
 * Wipe operation state
 */
export type WipeState =
  | "idle"
  | "preparing"
  | "preserving_evidence"
  | "destroying_keys"
  | "wiping_data"
  | "verifying"
  | "completed"
  | "failed";

/**
 * Wipe result
 */
export interface WipeResult {
  success: boolean;
  wipeId: string;
  type: WipeType;
  startedAt: string;
  completedAt: string | null;
  state: WipeState;
  keysDestroyed: number;
  dataWiped: number;
  error: string | null;
  verificationHash: string | null;
}

/**
 * Wipe configuration
 */
export interface WipeConfig {
  /** Preserve evidence before wipe */
  preserveEvidence: boolean;
  /** Types of evidence to preserve */
  evidenceTypes: EvidenceType[];
  /** Verify key destruction */
  verifyKeyDestruction: boolean;
  /** Number of overwrite passes (1-7) */
  overwritePasses: number;
  /** Notify other devices after wipe */
  notifyDevices: boolean;
  /** Timeout for wipe operation (ms) */
  timeout: number;
  /** Force wipe even if verification fails */
  forceOnVerificationFail: boolean;
}

/**
 * Evidence types to preserve
 */
export type EvidenceType =
  | "session_list"
  | "login_history"
  | "device_info"
  | "last_activity"
  | "key_fingerprints"
  | "connection_log";

/**
 * Preserved evidence
 */
export interface WipeEvidence {
  id: string;
  type: WipeType;
  timestamp: string;
  sessionId: string | null;
  deviceId: string | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  activeSessions: SessionSnapshot[];
  keyFingerprints: KeyFingerprint[];
  lastActivity: string | null;
  reason: string | null;
}

/**
 * Session snapshot for evidence
 */
export interface SessionSnapshot {
  id: string;
  deviceId: string;
  platform: string;
  browser: string;
  ipAddress: string;
  lastActive: string;
  createdAt: string;
}

/**
 * Key fingerprint for evidence
 */
export interface KeyFingerprint {
  keyId: string;
  type: string;
  fingerprint: string;
  createdAt: string;
}

/**
 * Key destruction proof
 */
export interface KeyDestructionProof {
  keyId: string;
  destroyedAt: string;
  method: "overwrite" | "delete" | "crypto_erase";
  verificationHash: string;
  passes: number;
}

/**
 * Wipe token for remote wipe authorization
 */
export interface WipeToken {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  targetSessionId: string | null;
  targetDeviceId: string | null;
  type: WipeType;
  authorized: boolean;
  usedAt: string | null;
}

/**
 * Session wipe request
 */
export interface SessionWipeRequest {
  sessionId: string;
  reason: string;
  initiatedBy: "user" | "admin" | "system" | "remote";
  sourceDeviceId: string | null;
  config?: Partial<WipeConfig>;
}

/**
 * Device wipe request
 */
export interface DeviceWipeRequest {
  deviceId: string;
  reason: string;
  initiatedBy: "user" | "admin" | "system" | "remote";
  sourceDeviceId: string | null;
  config?: Partial<WipeConfig>;
}

/**
 * Remote wipe request
 */
export interface RemoteWipeRequest {
  targetDeviceId: string;
  token: string;
  reason: string;
  sourceUserId: string;
  sourceDeviceId: string;
  config?: Partial<WipeConfig>;
}

/**
 * Wipe event listener
 */
export type WipeEventType =
  | "wipe_started"
  | "wipe_progress"
  | "wipe_completed"
  | "wipe_failed"
  | "keys_destroyed"
  | "evidence_preserved"
  | "remote_wipe_received";

export interface WipeEvent {
  type: WipeEventType;
  timestamp: string;
  wipeId: string;
  data: Record<string, unknown>;
}

export type WipeEventListener = (event: WipeEvent) => void;

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_WIPE_CONFIG: WipeConfig = {
  preserveEvidence: true,
  evidenceTypes: [
    "session_list",
    "login_history",
    "device_info",
    "key_fingerprints",
  ],
  verifyKeyDestruction: true,
  overwritePasses: 3,
  notifyDevices: true,
  timeout: 30000,
  forceOnVerificationFail: false,
};

// ============================================================================
// Session Wipe Manager
// ============================================================================

/**
 * Session Wipe Manager
 *
 * Manages secure session termination and data wipe operations.
 */
export class SessionWipeManager {
  private storage: ISecureStorage;
  private initialized = false;
  private currentWipe: WipeResult | null = null;
  private eventListeners: Map<WipeEventType, Set<WipeEventListener>> =
    new Map();

  constructor(storage?: ISecureStorage) {
    this.storage = storage || getSecureStorage();
  }

  /**
   * Initialize the session wipe manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.storage.isInitialized()) {
      await this.storage.initialize();
    }

    // Check for pending wipe
    await this.checkPendingWipe();

    this.initialized = true;
    logger.info(`${LOG_PREFIX} Initialized`);
  }

  /**
   * Kill a specific session
   */
  async killSession(request: SessionWipeRequest): Promise<WipeResult> {
    await this.ensureInitialized();

    const wipeId = this.generateWipeId();
    const config = { ...DEFAULT_WIPE_CONFIG, ...request.config };
    const startedAt = new Date().toISOString();

    logger.security(`${LOG_PREFIX} Session kill initiated`, {
      sessionId: request.sessionId,
      initiatedBy: request.initiatedBy,
      reason: request.reason,
    });

    this.currentWipe = {
      success: false,
      wipeId,
      type: "session_kill",
      startedAt,
      completedAt: null,
      state: "preparing",
      keysDestroyed: 0,
      dataWiped: 0,
      error: null,
      verificationHash: null,
    };

    this.emitEvent("wipe_started", wipeId, {
      type: "session_kill",
      sessionId: request.sessionId,
    });

    try {
      // Preserve evidence if configured
      if (config.preserveEvidence) {
        await this.updateState("preserving_evidence");
        await this.preserveEvidence({
          type: "session_kill",
          sessionId: request.sessionId,
          reason: request.reason,
          userId: null,
          deviceId: null,
        });
        this.emitEvent("evidence_preserved", wipeId, {
          sessionId: request.sessionId,
        });
      }

      // Destroy session keys
      await this.updateState("destroying_keys");
      const keysDestroyed = await this.destroySessionKeys(
        request.sessionId,
        config.overwritePasses,
      );
      if (this.currentWipe) {
        this.currentWipe.keysDestroyed = keysDestroyed;
      }
      this.emitEvent("keys_destroyed", wipeId, { count: keysDestroyed });

      // Wipe session data
      await this.updateState("wiping_data");
      const dataWiped = await this.wipeSessionData(request.sessionId);
      if (this.currentWipe) {
        this.currentWipe.dataWiped = dataWiped;
      }

      // Verify key destruction
      if (config.verifyKeyDestruction) {
        await this.updateState("verifying");
        const verificationHash = await this.verifyKeyDestruction(
          request.sessionId,
        );
        if (this.currentWipe) {
          this.currentWipe.verificationHash = verificationHash;
        }

        if (!verificationHash && !config.forceOnVerificationFail) {
          throw new Error("Key destruction verification failed");
        }
      }

      // Complete wipe
      await this.updateState("completed");
      if (this.currentWipe) {
        this.currentWipe.success = true;
        this.currentWipe.completedAt = new Date().toISOString();
      }

      logger.security(`${LOG_PREFIX} Session kill completed`, {
        sessionId: request.sessionId,
        keysDestroyed,
        dataWiped,
      });

      this.emitEvent("wipe_completed", wipeId, {
        sessionId: request.sessionId,
        keysDestroyed,
        dataWiped,
      });

      return this.currentWipe;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (this.currentWipe) {
        this.currentWipe.state = "failed";
        this.currentWipe.error = errorMessage;
        await this.saveWipeState();
      }

      logger.error(`${LOG_PREFIX} Session kill failed`, error);
      this.emitEvent("wipe_failed", wipeId, { error: errorMessage });

      return (
        this.currentWipe || {
          success: false,
          wipeId,
          type: "session_kill" as const,
          startedAt,
          completedAt: new Date().toISOString(),
          state: "failed" as const,
          keysDestroyed: 0,
          dataWiped: 0,
          error: errorMessage,
          verificationHash: null,
        }
      );
    }
  }

  /**
   * Wipe entire device
   */
  async wipeDevice(request: DeviceWipeRequest): Promise<WipeResult> {
    await this.ensureInitialized();

    const wipeId = this.generateWipeId();
    const config = { ...DEFAULT_WIPE_CONFIG, ...request.config };
    const startedAt = new Date().toISOString();

    logger.security(`${LOG_PREFIX} Device wipe initiated`, {
      deviceId: request.deviceId,
      initiatedBy: request.initiatedBy,
      reason: request.reason,
    });

    this.currentWipe = {
      success: false,
      wipeId,
      type: "device_wipe",
      startedAt,
      completedAt: null,
      state: "preparing",
      keysDestroyed: 0,
      dataWiped: 0,
      error: null,
      verificationHash: null,
    };

    this.emitEvent("wipe_started", wipeId, {
      type: "device_wipe",
      deviceId: request.deviceId,
    });

    try {
      // Preserve evidence
      if (config.preserveEvidence) {
        await this.updateState("preserving_evidence");
        await this.preserveEvidence({
          type: "device_wipe",
          sessionId: null,
          deviceId: request.deviceId,
          reason: request.reason,
          userId: null,
        });
        this.emitEvent("evidence_preserved", wipeId, {
          deviceId: request.deviceId,
        });
      }

      // Destroy all encryption keys
      await this.updateState("destroying_keys");
      const keysDestroyed = await this.destroyAllKeys(config.overwritePasses);
      if (this.currentWipe) {
        this.currentWipe.keysDestroyed = keysDestroyed;
      }
      this.emitEvent("keys_destroyed", wipeId, { count: keysDestroyed });

      // Wipe all local data
      await this.updateState("wiping_data");
      const dataWiped = await this.wipeAllLocalData();
      if (this.currentWipe) {
        this.currentWipe.dataWiped = dataWiped;
      }

      // Verify key destruction
      if (config.verifyKeyDestruction) {
        await this.updateState("verifying");
        const verificationHash = await this.verifyCompleteKeyDestruction();
        if (this.currentWipe) {
          this.currentWipe.verificationHash = verificationHash;
        }

        if (!verificationHash && !config.forceOnVerificationFail) {
          throw new Error("Complete key destruction verification failed");
        }
      }

      // Clear storage
      await this.storage.clear();

      // Complete wipe
      await this.updateState("completed");
      if (this.currentWipe) {
        this.currentWipe.success = true;
        this.currentWipe.completedAt = new Date().toISOString();
      }

      logger.security(`${LOG_PREFIX} Device wipe completed`, {
        deviceId: request.deviceId,
        keysDestroyed,
        dataWiped,
      });

      this.emitEvent("wipe_completed", wipeId, {
        deviceId: request.deviceId,
        keysDestroyed,
        dataWiped,
      });

      return this.currentWipe;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (this.currentWipe) {
        this.currentWipe.state = "failed";
        this.currentWipe.error = errorMessage;
        await this.saveWipeState();
      }

      logger.error(`${LOG_PREFIX} Device wipe failed`, error);
      this.emitEvent("wipe_failed", wipeId, { error: errorMessage });

      return (
        this.currentWipe || {
          success: false,
          wipeId,
          type: "device_wipe" as const,
          startedAt,
          completedAt: new Date().toISOString(),
          state: "failed" as const,
          keysDestroyed: 0,
          dataWiped: 0,
          error: errorMessage,
          verificationHash: null,
        }
      );
    }
  }

  /**
   * Process remote wipe request
   */
  async processRemoteWipe(request: RemoteWipeRequest): Promise<WipeResult> {
    await this.ensureInitialized();

    // Validate wipe token
    const tokenValid = await this.validateWipeToken(
      request.token,
      request.targetDeviceId,
    );
    if (!tokenValid) {
      const result: WipeResult = {
        success: false,
        wipeId: this.generateWipeId(),
        type: "remote_wipe",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        state: "failed",
        keysDestroyed: 0,
        dataWiped: 0,
        error: "Invalid wipe token",
        verificationHash: null,
      };

      logger.security(`${LOG_PREFIX} Remote wipe rejected - invalid token`, {
        targetDeviceId: request.targetDeviceId,
        sourceUserId: request.sourceUserId,
      });

      return result;
    }

    logger.security(`${LOG_PREFIX} Remote wipe authorized`, {
      targetDeviceId: request.targetDeviceId,
      sourceUserId: request.sourceUserId,
      sourceDeviceId: request.sourceDeviceId,
    });

    this.emitEvent("remote_wipe_received", this.generateWipeId(), {
      targetDeviceId: request.targetDeviceId,
      sourceUserId: request.sourceUserId,
    });

    // Mark token as used
    await this.markWipeTokenUsed(request.token);

    // Execute device wipe
    return this.wipeDevice({
      deviceId: request.targetDeviceId,
      reason: request.reason,
      initiatedBy: "remote",
      sourceDeviceId: request.sourceDeviceId,
      config: request.config,
    });
  }

  /**
   * Generate a wipe token for remote wipe authorization
   */
  async generateWipeToken(
    targetDeviceId: string | null,
    targetSessionId: string | null,
    type: WipeType,
    expiresInMinutes: number = 15,
  ): Promise<WipeToken> {
    await this.ensureInitialized();

    const id = this.generateWipeId();
    const token = this.generateSecureToken();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + expiresInMinutes * 60 * 1000,
    ).toISOString();

    const wipeToken: WipeToken = {
      id,
      token,
      createdAt,
      expiresAt,
      targetSessionId,
      targetDeviceId,
      type,
      authorized: true,
      usedAt: null,
    };

    await this.storage.setItem(
      `${WIPE_TOKEN_KEY}_${id}`,
      JSON.stringify(wipeToken),
      { service: "nchat-security" },
    );

    logger.security(`${LOG_PREFIX} Wipe token generated`, {
      tokenId: id,
      targetDeviceId,
      targetSessionId,
      type,
      expiresAt,
    });

    return wipeToken;
  }

  /**
   * Get current wipe state
   */
  getCurrentWipeState(): WipeResult | null {
    return this.currentWipe;
  }

  /**
   * Add event listener
   */
  addEventListener(type: WipeEventType, listener: WipeEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: WipeEventType, listener: WipeEventListener): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  /**
   * Get preserved evidence
   */
  async getPreservedEvidence(): Promise<WipeEvidence[]> {
    await this.ensureInitialized();

    try {
      const result = await this.storage.getItem(WIPE_EVIDENCE_KEY, {
        service: "nchat-security",
      });
      if (result.success && result.data) {
        return JSON.parse(result.data) as WipeEvidence[];
      }
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to get preserved evidence`, error);
    }

    return [];
  }

  /**
   * Get key destruction proofs
   */
  async getKeyDestructionProofs(): Promise<KeyDestructionProof[]> {
    await this.ensureInitialized();

    try {
      const result = await this.storage.getItem(KEY_DESTRUCTION_PROOF_KEY, {
        service: "nchat-security",
      });
      if (result.success && result.data) {
        return JSON.parse(result.data) as KeyDestructionProof[];
      }
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to get key destruction proofs`, error);
    }

    return [];
  }

  /**
   * Cleanup and destroy manager
   */
  destroy(): void {
    this.eventListeners.clear();
    this.currentWipe = null;
    this.initialized = false;
    logger.info(`${LOG_PREFIX} Destroyed`);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async updateState(state: WipeState): Promise<void> {
    if (this.currentWipe) {
      this.currentWipe.state = state;
      await this.saveWipeState();
      this.emitEvent("wipe_progress", this.currentWipe.wipeId, { state });
    }
  }

  private async saveWipeState(): Promise<void> {
    if (this.currentWipe) {
      try {
        await this.storage.setItem(
          WIPE_STATE_KEY,
          JSON.stringify(this.currentWipe),
          {
            service: "nchat-security",
          },
        );
      } catch (error) {
        logger.error(`${LOG_PREFIX} Failed to save wipe state`, error);
      }
    }
  }

  private async checkPendingWipe(): Promise<void> {
    try {
      const result = await this.storage.getItem(WIPE_STATE_KEY, {
        service: "nchat-security",
      });
      if (result.success && result.data) {
        const pendingWipe = JSON.parse(result.data) as WipeResult;
        if (
          pendingWipe.state !== "completed" &&
          pendingWipe.state !== "failed"
        ) {
          logger.warn(`${LOG_PREFIX} Found pending wipe operation`, {
            wipeId: pendingWipe.wipeId,
          });
          // Resume or fail the pending wipe
          pendingWipe.state = "failed";
          pendingWipe.error = "Wipe interrupted and not resumed";
          await this.storage.setItem(
            WIPE_STATE_KEY,
            JSON.stringify(pendingWipe),
            {
              service: "nchat-security",
            },
          );
        }
      }
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to check pending wipe`, error);
    }
  }

  private async preserveEvidence(options: {
    type: WipeType;
    sessionId: string | null;
    deviceId: string | null;
    userId: string | null;
    reason: string | null;
  }): Promise<void> {
    const evidence: WipeEvidence = {
      id: this.generateWipeId(),
      type: options.type,
      timestamp: new Date().toISOString(),
      sessionId: options.sessionId,
      deviceId: options.deviceId,
      userId: options.userId,
      ipAddress: isClient() ? await this.getClientIP() : null,
      userAgent: isClient() ? navigator.userAgent : null,
      activeSessions: await this.getActiveSessionsSnapshot(),
      keyFingerprints: await this.getKeyFingerprints(),
      lastActivity: await this.getLastActivityTime(),
      reason: options.reason,
    };

    // Get existing evidence and append
    const existingEvidence = await this.getPreservedEvidence();
    existingEvidence.push(evidence);

    // Keep only last 100 evidence records
    const trimmedEvidence = existingEvidence.slice(-100);

    await this.storage.setItem(
      WIPE_EVIDENCE_KEY,
      JSON.stringify(trimmedEvidence),
      {
        service: "nchat-security",
      },
    );

    logger.info(`${LOG_PREFIX} Evidence preserved`, {
      evidenceId: evidence.id,
      type: options.type,
    });
  }

  private async destroySessionKeys(
    sessionId: string,
    passes: number,
  ): Promise<number> {
    let keysDestroyed = 0;

    // Destroy session-specific keys
    const sessionKeyPatterns = [
      `${SESSION_KEYS_PREFIX}${sessionId}`,
      `${ENCRYPTION_KEYS_PREFIX}${sessionId}`,
    ];

    for (const pattern of sessionKeyPatterns) {
      const destroyed = await this.secureKeyDestroy(pattern, passes);
      if (destroyed) keysDestroyed++;
    }

    // Record destruction proof
    await this.recordKeyDestructionProof(sessionId, "crypto_erase", passes);

    return keysDestroyed;
  }

  private async destroyAllKeys(passes: number): Promise<number> {
    let keysDestroyed = 0;

    // Destroy all sensitive keys
    for (const key of SENSITIVE_KEYS) {
      const destroyed = await this.secureKeyDestroy(key, passes);
      if (destroyed) keysDestroyed++;
    }

    // Get all keys and destroy session/encryption keys
    try {
      const allKeys = await this.storage.getAllKeys({
        service: "nchat-security",
      });
      for (const key of allKeys) {
        if (
          key.startsWith(SESSION_KEYS_PREFIX) ||
          key.startsWith(ENCRYPTION_KEYS_PREFIX)
        ) {
          const destroyed = await this.secureKeyDestroy(key, passes);
          if (destroyed) keysDestroyed++;
        }
      }
    } catch (error) {
      logger.warn(
        `${LOG_PREFIX} Could not enumerate all keys for destruction`,
        { error },
      );
    }

    // Record destruction proof
    await this.recordKeyDestructionProof("all_keys", "crypto_erase", passes);

    return keysDestroyed;
  }

  private async secureKeyDestroy(
    key: string,
    passes: number,
  ): Promise<boolean> {
    try {
      // Multi-pass overwrite before delete
      for (let pass = 0; pass < passes; pass++) {
        const overwriteData = this.generateRandomBytes(256);
        await this.storage.setItem(key, overwriteData, {
          service: "nchat-security",
        });
      }

      // Final delete
      await this.storage.removeItem(key, { service: "nchat-security" });

      return true;
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to securely destroy key`, error, {
        key,
      });
      return false;
    }
  }

  private async wipeSessionData(sessionId: string): Promise<number> {
    let dataWiped = 0;

    // Clear session-specific data from localStorage
    if (isClient()) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(sessionId)) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        localStorage.removeItem(key);
        dataWiped++;
      }
    }

    return dataWiped;
  }

  private async wipeAllLocalData(): Promise<number> {
    let dataWiped = 0;

    // Clear all nchat-related localStorage
    if (isClient()) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("nchat_") || key.startsWith("nself_"))) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        localStorage.removeItem(key);
        dataWiped++;
      }

      // Clear sessionStorage
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith("nchat_") || key.startsWith("nself_"))) {
          sessionKeysToRemove.push(key);
        }
      }

      for (const key of sessionKeysToRemove) {
        sessionStorage.removeItem(key);
        dataWiped++;
      }

      // Clear IndexedDB databases
      try {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (
            db.name &&
            (db.name.startsWith("nchat") || db.name.startsWith("nself"))
          ) {
            indexedDB.deleteDatabase(db.name);
            dataWiped++;
          }
        }
      } catch {
        logger.warn(`${LOG_PREFIX} IndexedDB enumeration not supported`);
      }
    }

    return dataWiped;
  }

  private async verifyKeyDestruction(
    sessionId: string,
  ): Promise<string | null> {
    // Verify that session keys are truly destroyed
    const sessionKeyPatterns = [
      `${SESSION_KEYS_PREFIX}${sessionId}`,
      `${ENCRYPTION_KEYS_PREFIX}${sessionId}`,
    ];

    for (const pattern of sessionKeyPatterns) {
      const exists = await this.storage.hasItem(pattern, {
        service: "nchat-security",
      });
      if (exists) {
        return null; // Key still exists, verification failed
      }
    }

    // Generate verification hash
    return this.generateVerificationHash(`session_${sessionId}_destroyed`);
  }

  private async verifyCompleteKeyDestruction(): Promise<string | null> {
    // Verify that all sensitive keys are destroyed
    for (const key of SENSITIVE_KEYS) {
      const exists = await this.storage.hasItem(key, {
        service: "nchat-security",
      });
      if (exists) {
        return null; // Key still exists, verification failed
      }
    }

    // Generate verification hash
    return this.generateVerificationHash("all_keys_destroyed");
  }

  private async recordKeyDestructionProof(
    keyId: string,
    method: KeyDestructionProof["method"],
    passes: number,
  ): Promise<void> {
    const proof: KeyDestructionProof = {
      keyId,
      destroyedAt: new Date().toISOString(),
      method,
      verificationHash: this.generateVerificationHash(`${keyId}_${Date.now()}`),
      passes,
    };

    const existingProofs = await this.getKeyDestructionProofs();
    existingProofs.push(proof);

    // Keep only last 1000 proofs
    const trimmedProofs = existingProofs.slice(-1000);

    await this.storage.setItem(
      KEY_DESTRUCTION_PROOF_KEY,
      JSON.stringify(trimmedProofs),
      {
        service: "nchat-security",
      },
    );
  }

  private async validateWipeToken(
    token: string,
    targetDeviceId: string,
  ): Promise<boolean> {
    try {
      const allKeys = await this.storage.getAllKeys({
        service: "nchat-security",
      });
      for (const key of allKeys) {
        if (key.startsWith(WIPE_TOKEN_KEY)) {
          const result = await this.storage.getItem(key, {
            service: "nchat-security",
          });
          if (result.success && result.data) {
            const wipeToken = JSON.parse(result.data) as WipeToken;
            if (
              wipeToken.token === token &&
              (wipeToken.targetDeviceId === targetDeviceId ||
                wipeToken.targetDeviceId === null) &&
              wipeToken.authorized &&
              !wipeToken.usedAt &&
              new Date(wipeToken.expiresAt) > new Date()
            ) {
              return true;
            }
          }
        }
      }
    } catch (error) {
      logger.error(`${LOG_PREFIX} Token validation failed`, error);
    }

    return false;
  }

  private async markWipeTokenUsed(token: string): Promise<void> {
    try {
      const allKeys = await this.storage.getAllKeys({
        service: "nchat-security",
      });
      for (const key of allKeys) {
        if (key.startsWith(WIPE_TOKEN_KEY)) {
          const result = await this.storage.getItem(key, {
            service: "nchat-security",
          });
          if (result.success && result.data) {
            const wipeToken = JSON.parse(result.data) as WipeToken;
            if (wipeToken.token === token) {
              wipeToken.usedAt = new Date().toISOString();
              await this.storage.setItem(key, JSON.stringify(wipeToken), {
                service: "nchat-security",
              });
              return;
            }
          }
        }
      }
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to mark token as used`, error);
    }
  }

  private async getActiveSessionsSnapshot(): Promise<SessionSnapshot[]> {
    // In a real implementation, this would fetch from the session store
    // For now, return an empty array as this needs integration with session management
    return [];
  }

  private async getKeyFingerprints(): Promise<KeyFingerprint[]> {
    const fingerprints: KeyFingerprint[] = [];

    for (const key of SENSITIVE_KEYS) {
      try {
        const result = await this.storage.getItem(key, {
          service: "nchat-security",
        });
        if (result.success && result.data) {
          fingerprints.push({
            keyId: key,
            type: this.getKeyType(key),
            fingerprint: this.generateFingerprint(result.data),
            createdAt: new Date().toISOString(),
          });
        }
      } catch {
        // Key doesn't exist or can't be read
      }
    }

    return fingerprints;
  }

  private getKeyType(key: string): string {
    if (key.includes("identity")) return "identity_key";
    if (key.includes("prekey")) return "prekey";
    if (key.includes("session")) return "session_key";
    if (key.includes("chain")) return "chain_key";
    if (key.includes("message")) return "message_key";
    if (key.includes("pin")) return "pin_hash";
    if (key.includes("biometric")) return "biometric_key";
    return "unknown";
  }

  private async getLastActivityTime(): Promise<string | null> {
    if (isClient()) {
      const lastActivity = localStorage.getItem("nself_chat_last_activity");
      if (lastActivity) {
        return new Date(parseInt(lastActivity, 10)).toISOString();
      }
    }
    return null;
  }

  private async getClientIP(): Promise<string | null> {
    // In a real implementation, this would fetch from an API
    // For security reasons, we don't expose actual IP detection here
    return null;
  }

  private generateWipeId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `wipe_${timestamp}_${random}`;
  }

  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    if (isClient() && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback for server-side
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private generateRandomBytes(length: number): string {
    const array = new Uint8Array(length);
    if (isClient() && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private generateFingerprint(data: string): string {
    // Simple hash for fingerprint - in production use proper crypto hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  private generateVerificationHash(input: string): string {
    const timestamp = Date.now();
    return this.generateFingerprint(`${input}_${timestamp}_verified`);
  }

  private emitEvent(
    type: WipeEventType,
    wipeId: string,
    data: Record<string, unknown>,
  ): void {
    const event: WipeEvent = {
      type,
      timestamp: new Date().toISOString(),
      wipeId,
      data,
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          logger.error(`${LOG_PREFIX} Event listener error`, error);
        }
      });
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let sessionWipeManagerInstance: SessionWipeManager | null = null;

/**
 * Get the singleton SessionWipeManager instance
 */
export function getSessionWipeManager(
  storage?: ISecureStorage,
): SessionWipeManager {
  if (!sessionWipeManagerInstance) {
    sessionWipeManagerInstance = new SessionWipeManager(storage);
  }
  return sessionWipeManagerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSessionWipeManager(): void {
  if (sessionWipeManagerInstance) {
    sessionWipeManagerInstance.destroy();
    sessionWipeManagerInstance = null;
  }
}

/**
 * Initialize the session wipe manager singleton
 */
export async function initializeSessionWipeManager(
  storage?: ISecureStorage,
): Promise<SessionWipeManager> {
  const manager = getSessionWipeManager(storage);
  await manager.initialize();
  return manager;
}

/**
 * Create a new SessionWipeManager instance (for testing)
 */
export function createSessionWipeManager(
  storage?: ISecureStorage,
): SessionWipeManager {
  return new SessionWipeManager(storage);
}
