/**
 * Wipe Service
 *
 * Coordinates secure session wipe and emergency lockout operations.
 * Provides a unified API for:
 * - Remote wipe from other devices
 * - Session kill from current device
 * - Panic mode activation
 * - Emergency lockout
 * - Wipe verification and confirmation
 *
 * @example
 * ```typescript
 * import { WipeService } from '@/services/security/wipe.service'
 *
 * const wipeService = new WipeService()
 * await wipeService.initialize()
 *
 * // Kill a specific session
 * await wipeService.killSession({
 *   sessionId: 'session_123',
 *   reason: 'User requested logout',
 * })
 *
 * // Remote wipe a device
 * const token = await wipeService.generateRemoteWipeToken('device_456')
 * await wipeService.executeRemoteWipe('device_456', token)
 *
 * // Emergency lockout
 * await wipeService.emergencyLockout('border_crossing')
 * ```
 */

import { logger } from "@/lib/logger";
import { getSecureStorage, type ISecureStorage } from "@/lib/secure-storage";
import {
  SessionWipeManager,
  getSessionWipeManager,
  type WipeResult,
  type WipeConfig,
  type WipeToken,
  type WipeEvidence,
  type KeyDestructionProof,
  type WipeEventType,
  type WipeEventListener,
  DEFAULT_WIPE_CONFIG,
} from "@/lib/security/session-wipe";
import {
  PanicModeManager,
  getPanicModeManager,
  type PanicModeConfig,
  type PanicActivation,
  type PanicStatus,
  type PanicEventType,
  type PanicEventListener,
  type PanicActivationMethod,
  DEFAULT_PANIC_CONFIG,
} from "@/lib/security/panic-mode";

// ============================================================================
// Constants
// ============================================================================

const LOG_PREFIX = "[WipeService]";
const WIPE_SERVICE_STATE_KEY = "nchat_wipe_service_state";

// ============================================================================
// Types
// ============================================================================

/**
 * Wipe service state
 */
export interface WipeServiceState {
  initialized: boolean;
  lastWipeResult: WipeResult | null;
  lastPanicActivation: PanicActivation | null;
  pendingWipes: PendingWipe[];
  remoteWipeEnabled: boolean;
  panicModeEnabled: boolean;
}

/**
 * Pending wipe request
 */
export interface PendingWipe {
  id: string;
  type: "session" | "device" | "remote";
  targetId: string;
  requestedAt: string;
  expiresAt: string;
  token: string;
  status: "pending" | "executing" | "completed" | "failed" | "expired";
}

/**
 * Session kill request
 */
export interface SessionKillRequest {
  sessionId: string;
  reason: string;
  preserveEvidence?: boolean;
  notifyUser?: boolean;
}

/**
 * Device wipe request
 */
export interface DeviceWipeRequest {
  deviceId: string;
  reason: string;
  config?: Partial<WipeConfig>;
}

/**
 * Remote wipe authorization
 */
export interface RemoteWipeAuth {
  userId: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  token: string;
  expiresAt: string;
}

/**
 * Emergency lockout options
 */
export interface EmergencyLockoutOptions {
  reason: string;
  activationMethod?: PanicActivationMethod;
  notifyContacts?: boolean;
  preserveEvidence?: boolean;
}

/**
 * Wipe verification result
 */
export interface WipeVerification {
  success: boolean;
  wipeId: string;
  verifiedAt: string;
  keysDestroyed: number;
  keysRemaining: number;
  dataWiped: number;
  verificationHash: string | null;
  proofs: KeyDestructionProof[];
}

/**
 * Combined event listener for both wipe and panic events
 */
export type WipeServiceEventType = WipeEventType | PanicEventType;

export interface WipeServiceEvent {
  type: WipeServiceEventType;
  timestamp: string;
  source: "wipe" | "panic";
  data: Record<string, unknown>;
}

export type WipeServiceEventListener = (event: WipeServiceEvent) => void;

// ============================================================================
// Wipe Service Class
// ============================================================================

/**
 * Wipe Service
 *
 * High-level service for managing secure wipe operations.
 */
export class WipeService {
  private storage: ISecureStorage;
  private wipeManager: SessionWipeManager;
  private panicManager: PanicModeManager;
  private initialized = false;
  private state: WipeServiceState = {
    initialized: false,
    lastWipeResult: null,
    lastPanicActivation: null,
    pendingWipes: [],
    remoteWipeEnabled: true,
    panicModeEnabled: false,
  };
  private eventListeners: Map<
    WipeServiceEventType,
    Set<WipeServiceEventListener>
  > = new Map();

  constructor(storage?: ISecureStorage) {
    this.storage = storage || getSecureStorage();
    this.wipeManager = getSessionWipeManager(this.storage);
    this.panicManager = getPanicModeManager(this.storage);
  }

  /**
   * Initialize the wipe service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.storage.isInitialized()) {
      await this.storage.initialize();
    }

    // Initialize managers
    await this.wipeManager.initialize();
    await this.panicManager.initialize();

    // Load state
    await this.loadState();

    // Setup event forwarding from managers
    this.setupEventForwarding();

    // Clean up expired pending wipes
    await this.cleanupExpiredWipes();

    this.initialized = true;
    this.state.initialized = true;
    await this.saveState();

    logger.info(`${LOG_PREFIX} Initialized`);
  }

  /**
   * Get service state
   */
  getState(): WipeServiceState {
    return { ...this.state };
  }

  /**
   * Get panic mode status
   */
  async getPanicStatus(): Promise<PanicStatus> {
    await this.ensureInitialized();
    return this.panicManager.getStatus();
  }

  // ============================================================================
  // Session Operations
  // ============================================================================

  /**
   * Kill a specific session
   */
  async killSession(request: SessionKillRequest): Promise<WipeResult> {
    await this.ensureInitialized();

    logger.security(`${LOG_PREFIX} Session kill requested`, {
      sessionId: request.sessionId,
      reason: request.reason,
    });

    const result = await this.wipeManager.killSession({
      sessionId: request.sessionId,
      reason: request.reason,
      initiatedBy: "user",
      sourceDeviceId: await this.getCurrentDeviceId(),
      config: {
        preserveEvidence: request.preserveEvidence ?? true,
      },
    });

    this.state.lastWipeResult = result;
    await this.saveState();

    return result;
  }

  /**
   * Kill all sessions except current
   */
  async killAllOtherSessions(reason: string): Promise<WipeResult[]> {
    await this.ensureInitialized();

    logger.security(`${LOG_PREFIX} Kill all other sessions requested`, {
      reason,
    });

    // In a real implementation, this would get the list of sessions
    // from the session store and kill each one
    const results: WipeResult[] = [];

    // Placeholder: Would iterate through sessions and kill each
    // const sessions = await getOtherSessions()
    // for (const session of sessions) {
    //   const result = await this.killSession({ sessionId: session.id, reason })
    //   results.push(result)
    // }

    return results;
  }

  // ============================================================================
  // Device Wipe Operations
  // ============================================================================

  /**
   * Wipe current device
   */
  async wipeDevice(request: DeviceWipeRequest): Promise<WipeResult> {
    await this.ensureInitialized();

    logger.security(`${LOG_PREFIX} Device wipe requested`, {
      deviceId: request.deviceId,
      reason: request.reason,
    });

    const result = await this.wipeManager.wipeDevice({
      deviceId: request.deviceId,
      reason: request.reason,
      initiatedBy: "user",
      sourceDeviceId: await this.getCurrentDeviceId(),
      config: request.config,
    });

    this.state.lastWipeResult = result;
    await this.saveState();

    return result;
  }

  // ============================================================================
  // Remote Wipe Operations
  // ============================================================================

  /**
   * Enable remote wipe capability
   */
  async enableRemoteWipe(): Promise<void> {
    await this.ensureInitialized();

    this.state.remoteWipeEnabled = true;
    await this.saveState();

    logger.info(`${LOG_PREFIX} Remote wipe enabled`);
  }

  /**
   * Disable remote wipe capability
   */
  async disableRemoteWipe(): Promise<void> {
    await this.ensureInitialized();

    this.state.remoteWipeEnabled = false;
    await this.saveState();

    logger.info(`${LOG_PREFIX} Remote wipe disabled`);
  }

  /**
   * Generate a remote wipe token for a target device
   */
  async generateRemoteWipeToken(
    targetDeviceId: string,
    expiresInMinutes: number = 15,
  ): Promise<WipeToken> {
    await this.ensureInitialized();

    if (!this.state.remoteWipeEnabled) {
      throw new Error("Remote wipe is not enabled");
    }

    const token = await this.wipeManager.generateWipeToken(
      targetDeviceId,
      null,
      "remote_wipe",
      expiresInMinutes,
    );

    // Track as pending wipe
    const pendingWipe: PendingWipe = {
      id: token.id,
      type: "remote",
      targetId: targetDeviceId,
      requestedAt: token.createdAt,
      expiresAt: token.expiresAt,
      token: token.token,
      status: "pending",
    };

    this.state.pendingWipes.push(pendingWipe);
    await this.saveState();

    logger.security(`${LOG_PREFIX} Remote wipe token generated`, {
      tokenId: token.id,
      targetDeviceId,
    });

    return token;
  }

  /**
   * Execute remote wipe on target device
   */
  async executeRemoteWipe(
    targetDeviceId: string,
    token: string,
    config?: Partial<WipeConfig>,
  ): Promise<WipeResult> {
    await this.ensureInitialized();

    if (!this.state.remoteWipeEnabled) {
      throw new Error("Remote wipe is not enabled");
    }

    logger.security(`${LOG_PREFIX} Remote wipe executing`, { targetDeviceId });

    // Update pending wipe status
    const pendingWipe = this.state.pendingWipes.find(
      (w) => w.targetId === targetDeviceId && w.status === "pending",
    );
    if (pendingWipe) {
      pendingWipe.status = "executing";
      await this.saveState();
    }

    const result = await this.wipeManager.processRemoteWipe({
      targetDeviceId,
      token,
      reason: "Remote wipe requested by user",
      sourceUserId: await this.getCurrentUserId(),
      sourceDeviceId: (await this.getCurrentDeviceId()) || "unknown",
      config,
    });

    // Update pending wipe status
    if (pendingWipe) {
      pendingWipe.status = result.success ? "completed" : "failed";
      await this.saveState();
    }

    this.state.lastWipeResult = result;
    await this.saveState();

    return result;
  }

  /**
   * Cancel a pending remote wipe
   */
  async cancelRemoteWipe(wipeId: string): Promise<boolean> {
    await this.ensureInitialized();

    const index = this.state.pendingWipes.findIndex(
      (w) => w.id === wipeId && w.status === "pending",
    );

    if (index === -1) {
      return false;
    }

    this.state.pendingWipes.splice(index, 1);
    await this.saveState();

    logger.info(`${LOG_PREFIX} Remote wipe cancelled`, { wipeId });
    return true;
  }

  /**
   * Get pending remote wipes
   */
  getPendingWipes(): PendingWipe[] {
    return [...this.state.pendingWipes.filter((w) => w.status === "pending")];
  }

  // ============================================================================
  // Emergency Lockout Operations
  // ============================================================================

  /**
   * Activate emergency lockout (panic mode)
   */
  async emergencyLockout(
    options: EmergencyLockoutOptions,
  ): Promise<PanicActivation> {
    await this.ensureInitialized();

    logger.security(`${LOG_PREFIX} Emergency lockout activated`, {
      reason: options.reason,
      method: options.activationMethod,
    });

    // Update panic mode config if needed
    if (
      options.notifyContacts !== undefined ||
      options.preserveEvidence !== undefined
    ) {
      await this.panicManager.updateConfig({
        notifyContacts: options.notifyContacts,
        wipeConfig: {
          ...DEFAULT_WIPE_CONFIG,
          preserveEvidence: options.preserveEvidence ?? true,
        },
      });
    }

    const activation = await this.panicManager.activate(
      options.activationMethod || "manual",
    );

    this.state.lastPanicActivation = activation;
    await this.saveState();

    return activation;
  }

  /**
   * Check if entered PIN is a duress PIN
   */
  async checkDuressPin(pin: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.panicManager.checkDuressPin(pin);
  }

  /**
   * Set duress PIN for panic mode activation
   */
  async setDuressPin(pin: string): Promise<void> {
    await this.ensureInitialized();
    await this.panicManager.setDuressPin(pin);

    this.state.panicModeEnabled = true;
    await this.saveState();
  }

  /**
   * Remove duress PIN
   */
  async removeDuressPin(): Promise<void> {
    await this.ensureInitialized();
    await this.panicManager.removeDuressPin();
  }

  /**
   * Update panic mode configuration
   */
  async updatePanicConfig(config: Partial<PanicModeConfig>): Promise<void> {
    await this.ensureInitialized();
    await this.panicManager.updateConfig(config);

    this.state.panicModeEnabled = config.enabled ?? this.state.panicModeEnabled;
    await this.saveState();
  }

  /**
   * Deactivate panic mode
   */
  async deactivatePanicMode(masterPassword: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.panicManager.deactivate(masterPassword);
  }

  // ============================================================================
  // Dead Man Switch Operations
  // ============================================================================

  /**
   * Check in for dead man switch
   */
  async deadManCheckIn(): Promise<void> {
    await this.ensureInitialized();
    await this.panicManager.checkIn();
  }

  /**
   * Arm dead man switch
   */
  async armDeadManSwitch(): Promise<void> {
    await this.ensureInitialized();
    await this.panicManager.armDeadManSwitch();
  }

  /**
   * Disarm dead man switch
   */
  async disarmDeadManSwitch(): Promise<void> {
    await this.ensureInitialized();
    await this.panicManager.disarmDeadManSwitch();
  }

  // ============================================================================
  // Verification Operations
  // ============================================================================

  /**
   * Verify a wipe operation completed successfully
   */
  async verifyWipe(wipeId: string): Promise<WipeVerification> {
    await this.ensureInitialized();

    const evidence = await this.wipeManager.getPreservedEvidence();
    const proofs = await this.wipeManager.getKeyDestructionProofs();

    const wipeEvidence = evidence.find((e) => e.id === wipeId);

    // Verify keys are actually destroyed
    const verificationResult = await this.verifyKeyDestruction();

    const verification: WipeVerification = {
      success: verificationResult.keysRemaining === 0,
      wipeId,
      verifiedAt: new Date().toISOString(),
      keysDestroyed: verificationResult.keysDestroyed,
      keysRemaining: verificationResult.keysRemaining,
      dataWiped: wipeEvidence ? 1 : 0,
      verificationHash: this.generateVerificationHash(wipeId),
      proofs: proofs.filter(
        (p) => p.keyId.includes(wipeId) || p.keyId === "all_keys",
      ),
    };

    logger.info(`${LOG_PREFIX} Wipe verified`, {
      wipeId,
      success: verification.success,
      keysRemaining: verification.keysRemaining,
    });

    return verification;
  }

  /**
   * Get wipe evidence
   */
  async getWipeEvidence(): Promise<WipeEvidence[]> {
    await this.ensureInitialized();
    return this.wipeManager.getPreservedEvidence();
  }

  /**
   * Get key destruction proofs
   */
  async getKeyDestructionProofs(): Promise<KeyDestructionProof[]> {
    await this.ensureInitialized();
    return this.wipeManager.getKeyDestructionProofs();
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Add event listener
   */
  addEventListener(
    type: WipeServiceEventType,
    listener: WipeServiceEventListener,
  ): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    type: WipeServiceEventType,
    listener: WipeServiceEventListener,
  ): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Destroy the service
   */
  destroy(): void {
    this.wipeManager.destroy();
    this.panicManager.destroy();
    this.eventListeners.clear();
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

  private async loadState(): Promise<void> {
    try {
      const result = await this.storage.getItem(WIPE_SERVICE_STATE_KEY, {
        service: "nchat-security",
      });
      if (result.success && result.data) {
        const savedState = JSON.parse(result.data);
        this.state = { ...this.state, ...savedState };
      }
    } catch (error) {
      logger.warn(`${LOG_PREFIX} Failed to load state`, { error });
    }
  }

  private async saveState(): Promise<void> {
    try {
      await this.storage.setItem(
        WIPE_SERVICE_STATE_KEY,
        JSON.stringify(this.state),
        {
          service: "nchat-security",
        },
      );
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to save state`, error);
    }
  }

  private async cleanupExpiredWipes(): Promise<void> {
    const now = new Date();
    const expiredIndexes: number[] = [];

    this.state.pendingWipes.forEach((wipe, index) => {
      if (wipe.status === "pending" && new Date(wipe.expiresAt) < now) {
        wipe.status = "expired";
        expiredIndexes.push(index);
      }
    });

    // Remove expired wipes older than 24 hours
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    this.state.pendingWipes = this.state.pendingWipes.filter(
      (wipe) =>
        wipe.status !== "expired" || new Date(wipe.expiresAt) > oneDayAgo,
    );

    if (expiredIndexes.length > 0) {
      await this.saveState();
      logger.info(
        `${LOG_PREFIX} Cleaned up ${expiredIndexes.length} expired wipes`,
      );
    }
  }

  private setupEventForwarding(): void {
    // Forward wipe events
    const wipeEventTypes: WipeEventType[] = [
      "wipe_started",
      "wipe_progress",
      "wipe_completed",
      "wipe_failed",
      "keys_destroyed",
      "evidence_preserved",
      "remote_wipe_received",
    ];

    for (const type of wipeEventTypes) {
      this.wipeManager.addEventListener(type, (event) => {
        this.emitEvent(type, "wipe", event.data);
      });
    }

    // Forward panic events
    const panicEventTypes: PanicEventType[] = [
      "panic_activated",
      "panic_deactivated",
      "decoy_enabled",
      "decoy_disabled",
      "wipe_started",
      "wipe_completed",
      "lockout_started",
      "dead_man_warning",
      "dead_man_triggered",
      "notification_sent",
    ];

    for (const type of panicEventTypes) {
      this.panicManager.addEventListener(type, (event) => {
        this.emitEvent(type, "panic", event.data);
      });
    }
  }

  private emitEvent(
    type: WipeServiceEventType,
    source: "wipe" | "panic",
    data: Record<string, unknown>,
  ): void {
    const event: WipeServiceEvent = {
      type,
      timestamp: new Date().toISOString(),
      source,
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

  private async verifyKeyDestruction(): Promise<{
    keysDestroyed: number;
    keysRemaining: number;
  }> {
    const sensitiveKeys = [
      "nchat_identity_key",
      "nchat_signed_prekey",
      "nchat_one_time_prekeys",
      "nchat_session_keys",
      "nchat_root_key",
      "nchat_chain_key",
      "nchat_message_keys",
    ];

    let keysRemaining = 0;
    let keysDestroyed = 0;

    for (const key of sensitiveKeys) {
      const exists = await this.storage.hasItem(key, {
        service: "nchat-security",
      });
      if (exists) {
        keysRemaining++;
      } else {
        keysDestroyed++;
      }
    }

    return { keysDestroyed, keysRemaining };
  }

  private generateVerificationHash(input: string): string {
    const timestamp = Date.now();
    let hash = 0;
    const data = `${input}_${timestamp}_verified`;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  private async getCurrentDeviceId(): Promise<string | null> {
    // In a real implementation, would get from device/session store
    return null;
  }

  private async getCurrentUserId(): Promise<string> {
    // In a real implementation, would get from auth context
    return "unknown";
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let wipeServiceInstance: WipeService | null = null;

/**
 * Get the singleton WipeService instance
 */
export function getWipeService(storage?: ISecureStorage): WipeService {
  if (!wipeServiceInstance) {
    wipeServiceInstance = new WipeService(storage);
  }
  return wipeServiceInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetWipeService(): void {
  if (wipeServiceInstance) {
    wipeServiceInstance.destroy();
    wipeServiceInstance = null;
  }
}

/**
 * Initialize the wipe service singleton
 */
export async function initializeWipeService(
  storage?: ISecureStorage,
): Promise<WipeService> {
  const service = getWipeService(storage);
  await service.initialize();
  return service;
}

/**
 * Create a new WipeService instance (for testing)
 */
export function createWipeService(storage?: ISecureStorage): WipeService {
  return new WipeService(storage);
}

// ============================================================================
// Exports
// ============================================================================

export { DEFAULT_WIPE_CONFIG, DEFAULT_PANIC_CONFIG };
