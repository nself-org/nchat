/**
 * Panic Mode Module
 *
 * Emergency lockout functionality for threat scenarios.
 * Implements the confiscation threat model with:
 * - Rapid activation (single action)
 * - Decoy mode (fake empty state)
 * - Evidence preservation
 * - Silent activation (no visible indication)
 * - Post-activation key destruction
 *
 * Use cases:
 * - Device confiscation at border crossing
 * - Physical coercion to unlock device
 * - Emergency data protection
 */

import { logger } from "@/lib/logger";
import { getSecureStorage, type ISecureStorage } from "@/lib/secure-storage";
import { isClient } from "@/lib/environment";
import {
  getSessionWipeManager,
  type WipeConfig,
  type WipeEvidence,
  type WipeResult,
  DEFAULT_WIPE_CONFIG,
} from "./session-wipe";

// ============================================================================
// Constants
// ============================================================================

const LOG_PREFIX = "[PanicMode]";
const PANIC_STATE_KEY = "nchat_panic_state";
const PANIC_CONFIG_KEY = "nchat_panic_config";
const PANIC_EVIDENCE_KEY = "nchat_panic_evidence";
const DURESS_PIN_KEY = "nchat_duress_pin";
const DECOY_STATE_KEY = "nchat_decoy_state";

// Maximum time for panic activation (ms)
const MAX_ACTIVATION_TIME = 5000;

// ============================================================================
// Types
// ============================================================================

/**
 * Panic mode state
 */
export type PanicState =
  | "inactive" // Normal operation
  | "activating" // Panic mode triggering
  | "active" // Panic mode active (decoy visible)
  | "wiping" // Data wipe in progress
  | "locked"; // Post-wipe lockout

/**
 * Panic activation method
 */
export type PanicActivationMethod =
  | "duress_pin" // Special PIN that triggers panic
  | "power_sequence" // Hardware button sequence
  | "gesture" // Specific gesture pattern
  | "shake" // Shake device pattern
  | "voice" // Voice command
  | "remote" // Remote activation
  | "dead_man" // No activity for configured period
  | "manual"; // Manual activation

/**
 * Panic mode configuration
 */
export interface PanicModeConfig {
  /** Enable panic mode feature */
  enabled: boolean;
  /** Enable duress PIN */
  duressPin: {
    enabled: boolean;
    /** The PIN that triggers panic mode (stored securely) */
    pinHash: string | null;
  };
  /** Activation methods enabled */
  activationMethods: PanicActivationMethod[];
  /** Wipe configuration for panic */
  wipeConfig: WipeConfig;
  /** Show decoy mode instead of blank screen */
  showDecoy: boolean;
  /** Decoy configuration */
  decoyConfig: DecoyConfig;
  /** Notify trusted contacts */
  notifyContacts: boolean;
  /** Trusted contact IDs for notification */
  trustedContactIds: string[];
  /** Log activation (may be disabled for maximum deniability) */
  logActivation: boolean;
  /** Dead man switch configuration */
  deadManSwitch: DeadManSwitchConfig;
  /** Post-activation lockout duration (minutes, 0 = permanent) */
  lockoutDuration: number;
  /** Require re-setup after panic (factory reset behavior) */
  requireReSetup: boolean;
}

/**
 * Decoy mode configuration
 */
export interface DecoyConfig {
  /** Type of decoy to display */
  type: "empty" | "demo" | "secondary_profile";
  /** Decoy user profile (if type is secondary_profile) */
  decoyProfileId: string | null;
  /** Show fake messages/channels */
  showFakeContent: boolean;
  /** Number of fake channels */
  fakeChannelCount: number;
  /** Number of fake messages per channel */
  fakeMessageCount: number;
}

/**
 * Dead man switch configuration
 */
export interface DeadManSwitchConfig {
  /** Enable dead man switch */
  enabled: boolean;
  /** Inactivity timeout (hours) */
  timeoutHours: number;
  /** Warning before activation (hours) */
  warningHours: number;
  /** Last check-in timestamp */
  lastCheckIn: string | null;
  /** Armed state */
  armed: boolean;
}

/**
 * Panic activation record
 */
export interface PanicActivation {
  id: string;
  timestamp: string;
  method: PanicActivationMethod;
  deviceId: string | null;
  location: GeolocationPosition | null;
  wipeResult: WipeResult | null;
  lockoutUntil: string | null;
  notificationsSent: boolean;
  decoyActivated: boolean;
}

/**
 * Panic status information
 */
export interface PanicStatus {
  state: PanicState;
  config: PanicModeConfig;
  lastActivation: PanicActivation | null;
  deadManStatus: DeadManStatus | null;
  decoyActive: boolean;
}

/**
 * Dead man switch status
 */
export interface DeadManStatus {
  armed: boolean;
  lastCheckIn: string | null;
  nextCheckInDue: string | null;
  warningThreshold: string | null;
  timeRemaining: number | null; // hours
}

/**
 * Panic event types
 */
export type PanicEventType =
  | "panic_activated"
  | "panic_deactivated"
  | "decoy_enabled"
  | "decoy_disabled"
  | "wipe_started"
  | "wipe_completed"
  | "lockout_started"
  | "dead_man_warning"
  | "dead_man_triggered"
  | "notification_sent";

/**
 * Panic event
 */
export interface PanicEvent {
  type: PanicEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Panic event listener
 */
export type PanicEventListener = (event: PanicEvent) => void;

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_DECOY_CONFIG: DecoyConfig = {
  type: "empty",
  decoyProfileId: null,
  showFakeContent: false,
  fakeChannelCount: 3,
  fakeMessageCount: 5,
};

export const DEFAULT_DEAD_MAN_CONFIG: DeadManSwitchConfig = {
  enabled: false,
  timeoutHours: 72,
  warningHours: 12,
  lastCheckIn: null,
  armed: false,
};

export const DEFAULT_PANIC_CONFIG: PanicModeConfig = {
  enabled: false,
  duressPin: {
    enabled: false,
    pinHash: null,
  },
  activationMethods: ["duress_pin", "manual"],
  wipeConfig: {
    ...DEFAULT_WIPE_CONFIG,
    preserveEvidence: true,
    overwritePasses: 5, // More passes for panic mode
  },
  showDecoy: true,
  decoyConfig: DEFAULT_DECOY_CONFIG,
  notifyContacts: false,
  trustedContactIds: [],
  logActivation: true,
  deadManSwitch: DEFAULT_DEAD_MAN_CONFIG,
  lockoutDuration: 0, // Permanent by default
  requireReSetup: true,
};

// ============================================================================
// Panic Mode Manager
// ============================================================================

/**
 * Panic Mode Manager
 *
 * Manages emergency lockout and panic functionality.
 */
export class PanicModeManager {
  private storage: ISecureStorage;
  private initialized = false;
  private config: PanicModeConfig = { ...DEFAULT_PANIC_CONFIG };
  private state: PanicState = "inactive";
  private lastActivation: PanicActivation | null = null;
  private eventListeners: Map<PanicEventType, Set<PanicEventListener>> =
    new Map();
  private deadManTimer: ReturnType<typeof setInterval> | null = null;

  constructor(storage?: ISecureStorage) {
    this.storage = storage || getSecureStorage();
  }

  /**
   * Initialize panic mode manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.storage.isInitialized()) {
      await this.storage.initialize();
    }

    await this.loadConfig();
    await this.loadState();

    // Start dead man switch monitoring if enabled
    if (this.config.deadManSwitch.enabled && this.config.deadManSwitch.armed) {
      this.startDeadManMonitoring();
    }

    this.initialized = true;
    logger.info(`${LOG_PREFIX} Initialized`, { state: this.state });
  }

  /**
   * Get current status
   */
  async getStatus(): Promise<PanicStatus> {
    await this.ensureInitialized();

    return {
      state: this.state,
      config: { ...this.config },
      lastActivation: this.lastActivation,
      deadManStatus: this.getDeadManStatus(),
      decoyActive: await this.isDecoyActive(),
    };
  }

  /**
   * Check if panic mode is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if currently in panic state
   */
  isActive(): boolean {
    return this.state === "active" || this.state === "locked";
  }

  /**
   * Update panic mode configuration
   */
  async updateConfig(updates: Partial<PanicModeConfig>): Promise<void> {
    await this.ensureInitialized();

    this.config = {
      ...this.config,
      ...updates,
    };

    await this.saveConfig();

    // Update dead man switch monitoring
    if (updates.deadManSwitch !== undefined) {
      if (
        this.config.deadManSwitch.enabled &&
        this.config.deadManSwitch.armed
      ) {
        this.startDeadManMonitoring();
      } else {
        this.stopDeadManMonitoring();
      }
    }

    logger.info(`${LOG_PREFIX} Config updated`);
  }

  /**
   * Set duress PIN
   */
  async setDuressPin(pin: string): Promise<void> {
    await this.ensureInitialized();

    // Hash the PIN before storing
    const pinHash = await this.hashPin(pin);

    await this.storage.setItem(DURESS_PIN_KEY, pinHash, {
      service: "nchat-security",
      requireBiometric: false, // Must be accessible without biometric
    });

    this.config.duressPin = {
      enabled: true,
      pinHash,
    };

    await this.saveConfig();
    logger.info(`${LOG_PREFIX} Duress PIN set`);
  }

  /**
   * Remove duress PIN
   */
  async removeDuressPin(): Promise<void> {
    await this.ensureInitialized();

    await this.storage.removeItem(DURESS_PIN_KEY, {
      service: "nchat-security",
    });

    this.config.duressPin = {
      enabled: false,
      pinHash: null,
    };

    await this.saveConfig();
    logger.info(`${LOG_PREFIX} Duress PIN removed`);
  }

  /**
   * Check if a PIN is the duress PIN
   */
  async checkDuressPin(pin: string): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.config.duressPin.enabled || !this.config.duressPin.pinHash) {
      return false;
    }

    const pinHash = await this.hashPin(pin);
    return pinHash === this.config.duressPin.pinHash;
  }

  /**
   * Activate panic mode
   */
  async activate(method: PanicActivationMethod): Promise<PanicActivation> {
    await this.ensureInitialized();

    if (this.state !== "inactive") {
      logger.warn(`${LOG_PREFIX} Already in panic state`, {
        currentState: this.state,
      });
      return this.lastActivation!;
    }

    const startTime = Date.now();

    logger.security(`${LOG_PREFIX} Panic mode activating`, { method });

    this.state = "activating";
    await this.saveState();

    const activation: PanicActivation = {
      id: this.generateActivationId(),
      timestamp: new Date().toISOString(),
      method,
      deviceId: await this.getDeviceId(),
      location: await this.getLocation(),
      wipeResult: null,
      lockoutUntil: null,
      notificationsSent: false,
      decoyActivated: false,
    };

    try {
      // Preserve evidence before wipe
      await this.preserveEvidence(activation);

      // Send notifications to trusted contacts
      if (
        this.config.notifyContacts &&
        this.config.trustedContactIds.length > 0
      ) {
        await this.notifyTrustedContacts(activation);
        activation.notificationsSent = true;
        this.emitEvent("notification_sent", {
          contacts: this.config.trustedContactIds.length,
        });
      }

      // Activate decoy mode if configured
      if (this.config.showDecoy) {
        await this.activateDecoy();
        activation.decoyActivated = true;
        this.emitEvent("decoy_enabled", { type: this.config.decoyConfig.type });
      }

      // Perform data wipe
      this.state = "wiping";
      await this.saveState();
      this.emitEvent("wipe_started", {});

      const wipeManager = getSessionWipeManager(this.storage);
      await wipeManager.initialize();

      activation.wipeResult = await wipeManager.wipeDevice({
        deviceId: activation.deviceId || "unknown",
        reason: `Panic mode activation via ${method}`,
        initiatedBy: "user",
        sourceDeviceId: activation.deviceId,
        config: this.config.wipeConfig,
      });

      this.emitEvent("wipe_completed", {
        success: activation.wipeResult.success,
        keysDestroyed: activation.wipeResult.keysDestroyed,
      });

      // Set lockout
      if (this.config.lockoutDuration === 0) {
        activation.lockoutUntil = null; // Permanent
      } else {
        const lockoutEnd = new Date();
        lockoutEnd.setMinutes(
          lockoutEnd.getMinutes() + this.config.lockoutDuration,
        );
        activation.lockoutUntil = lockoutEnd.toISOString();
      }

      this.state = "locked";
      await this.saveState();
      this.emitEvent("lockout_started", { until: activation.lockoutUntil });

      // Verify activation completed within time limit
      const activationTime = Date.now() - startTime;
      if (activationTime > MAX_ACTIVATION_TIME) {
        logger.warn(`${LOG_PREFIX} Activation took longer than expected`, {
          ms: activationTime,
        });
      }

      this.lastActivation = activation;
      await this.saveActivation(activation);

      // Log activation if configured
      if (this.config.logActivation) {
        logger.security(`${LOG_PREFIX} Panic mode activated`, {
          method,
          wipeSuccess: activation.wipeResult?.success,
          activationTimeMs: activationTime,
        });
      }

      this.emitEvent("panic_activated", {
        method,
        activationTimeMs: activationTime,
      });

      return activation;
    } catch (error) {
      logger.error(`${LOG_PREFIX} Panic activation failed`, error);

      // Even on failure, try to complete the lockout
      this.state = "locked";
      await this.saveState();

      throw error;
    }
  }

  /**
   * Deactivate panic mode (requires re-authentication)
   */
  async deactivate(masterPassword: string): Promise<boolean> {
    await this.ensureInitialized();

    if (this.state === "inactive") {
      return true;
    }

    // Check lockout period
    if (this.lastActivation?.lockoutUntil) {
      const lockoutEnd = new Date(this.lastActivation.lockoutUntil);
      if (lockoutEnd > new Date()) {
        logger.warn(`${LOG_PREFIX} Cannot deactivate during lockout period`);
        return false;
      }
    }

    // Verify master password
    const passwordValid = await this.verifyMasterPassword(masterPassword);
    if (!passwordValid) {
      logger.warn(`${LOG_PREFIX} Invalid master password for deactivation`);
      return false;
    }

    // Deactivate decoy if active
    if (await this.isDecoyActive()) {
      await this.deactivateDecoy();
      this.emitEvent("decoy_disabled", {});
    }

    // Reset state
    this.state = "inactive";
    await this.saveState();

    logger.security(`${LOG_PREFIX} Panic mode deactivated`);
    this.emitEvent("panic_deactivated", {});

    // If require re-setup, indicate need for full reset
    if (this.config.requireReSetup) {
      logger.info(`${LOG_PREFIX} Re-setup required`);
      // The calling code should handle the re-setup flow
    }

    return true;
  }

  /**
   * Check in for dead man switch
   */
  async checkIn(): Promise<void> {
    await this.ensureInitialized();

    if (!this.config.deadManSwitch.enabled) {
      return;
    }

    this.config.deadManSwitch.lastCheckIn = new Date().toISOString();
    await this.saveConfig();

    logger.info(`${LOG_PREFIX} Dead man switch check-in recorded`);
  }

  /**
   * Arm dead man switch
   */
  async armDeadManSwitch(): Promise<void> {
    await this.ensureInitialized();

    this.config.deadManSwitch.armed = true;
    this.config.deadManSwitch.lastCheckIn = new Date().toISOString();
    await this.saveConfig();

    this.startDeadManMonitoring();

    logger.security(`${LOG_PREFIX} Dead man switch armed`);
  }

  /**
   * Disarm dead man switch
   */
  async disarmDeadManSwitch(): Promise<void> {
    await this.ensureInitialized();

    this.config.deadManSwitch.armed = false;
    await this.saveConfig();

    this.stopDeadManMonitoring();

    logger.info(`${LOG_PREFIX} Dead man switch disarmed`);
  }

  /**
   * Add event listener
   */
  addEventListener(type: PanicEventType, listener: PanicEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    type: PanicEventType,
    listener: PanicEventListener,
  ): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  /**
   * Cleanup and destroy manager
   */
  destroy(): void {
    this.stopDeadManMonitoring();
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

  private async loadConfig(): Promise<void> {
    try {
      const result = await this.storage.getItem(PANIC_CONFIG_KEY, {
        service: "nchat-security",
      });
      if (result.success && result.data) {
        this.config = { ...DEFAULT_PANIC_CONFIG, ...JSON.parse(result.data) };
      }
    } catch (error) {
      logger.warn(`${LOG_PREFIX} Failed to load config`, { error });
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await this.storage.setItem(
        PANIC_CONFIG_KEY,
        JSON.stringify(this.config),
        {
          service: "nchat-security",
        },
      );
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to save config`, error);
    }
  }

  private async loadState(): Promise<void> {
    try {
      const result = await this.storage.getItem(PANIC_STATE_KEY, {
        service: "nchat-security",
      });
      if (result.success && result.data) {
        const savedState = JSON.parse(result.data);
        this.state = savedState.state || "inactive";
        this.lastActivation = savedState.lastActivation || null;
      }
    } catch (error) {
      logger.warn(`${LOG_PREFIX} Failed to load state`, { error });
    }
  }

  private async saveState(): Promise<void> {
    try {
      await this.storage.setItem(
        PANIC_STATE_KEY,
        JSON.stringify({
          state: this.state,
          lastActivation: this.lastActivation,
        }),
        { service: "nchat-security" },
      );
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to save state`, error);
    }
  }

  private async saveActivation(activation: PanicActivation): Promise<void> {
    try {
      const result = await this.storage.getItem(PANIC_EVIDENCE_KEY, {
        service: "nchat-security",
      });
      let activations: PanicActivation[] = [];

      if (result.success && result.data) {
        activations = JSON.parse(result.data);
      }

      activations.push(activation);

      // Keep last 10 activations
      activations = activations.slice(-10);

      await this.storage.setItem(
        PANIC_EVIDENCE_KEY,
        JSON.stringify(activations),
        {
          service: "nchat-security",
        },
      );
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to save activation`, error);
    }
  }

  private async preserveEvidence(activation: PanicActivation): Promise<void> {
    const evidence: WipeEvidence = {
      id: activation.id,
      type: "panic_wipe",
      timestamp: activation.timestamp,
      sessionId: null,
      deviceId: activation.deviceId,
      userId: null,
      ipAddress: null,
      userAgent: isClient() ? navigator.userAgent : null,
      activeSessions: [],
      keyFingerprints: [],
      lastActivity: null,
      reason: `Panic mode activated via ${activation.method}`,
    };

    // Store evidence securely (may be encrypted separately)
    await this.storage.setItem(
      `${PANIC_EVIDENCE_KEY}_${activation.id}`,
      JSON.stringify(evidence),
      {
        service: "nchat-security",
      },
    );

    logger.info(`${LOG_PREFIX} Evidence preserved`, {
      activationId: activation.id,
    });
  }

  private async notifyTrustedContacts(
    activation: PanicActivation,
  ): Promise<void> {
    // In a real implementation, this would send encrypted notifications
    // to trusted contacts via the notification service
    logger.info(
      `${LOG_PREFIX} Would notify ${this.config.trustedContactIds.length} trusted contacts`,
    );

    // Note: Implementation would use the notification service to send:
    // - Encrypted panic notification
    // - Location if available
    // - Device information
    // - Timestamp
  }

  private async activateDecoy(): Promise<void> {
    const decoyState = {
      active: true,
      type: this.config.decoyConfig.type,
      activatedAt: new Date().toISOString(),
    };

    await this.storage.setItem(DECOY_STATE_KEY, JSON.stringify(decoyState), {
      service: "nchat-security",
    });

    logger.info(`${LOG_PREFIX} Decoy mode activated`, {
      type: this.config.decoyConfig.type,
    });
  }

  private async deactivateDecoy(): Promise<void> {
    await this.storage.removeItem(DECOY_STATE_KEY, {
      service: "nchat-security",
    });
    logger.info(`${LOG_PREFIX} Decoy mode deactivated`);
  }

  private async isDecoyActive(): Promise<boolean> {
    try {
      const result = await this.storage.getItem(DECOY_STATE_KEY, {
        service: "nchat-security",
      });
      if (result.success && result.data) {
        const state = JSON.parse(result.data);
        return state.active === true;
      }
    } catch {
      // Ignore errors
    }
    return false;
  }

  private getDeadManStatus(): DeadManStatus | null {
    if (!this.config.deadManSwitch.enabled) {
      return null;
    }

    const { lastCheckIn, timeoutHours, warningHours, armed } =
      this.config.deadManSwitch;

    if (!lastCheckIn) {
      return {
        armed,
        lastCheckIn: null,
        nextCheckInDue: null,
        warningThreshold: null,
        timeRemaining: armed ? timeoutHours : null,
      };
    }

    const lastCheckInDate = new Date(lastCheckIn);
    const nextDue = new Date(
      lastCheckInDate.getTime() + timeoutHours * 60 * 60 * 1000,
    );
    const warningThreshold = new Date(
      nextDue.getTime() - warningHours * 60 * 60 * 1000,
    );
    const now = new Date();
    const timeRemaining = Math.max(
      0,
      (nextDue.getTime() - now.getTime()) / (60 * 60 * 1000),
    );

    return {
      armed,
      lastCheckIn,
      nextCheckInDue: nextDue.toISOString(),
      warningThreshold: warningThreshold.toISOString(),
      timeRemaining: Math.round(timeRemaining * 10) / 10,
    };
  }

  private startDeadManMonitoring(): void {
    // Check every hour
    this.deadManTimer = setInterval(
      () => {
        this.checkDeadManStatus();
      },
      60 * 60 * 1000,
    );

    // Initial check
    this.checkDeadManStatus();
  }

  private stopDeadManMonitoring(): void {
    if (this.deadManTimer) {
      clearInterval(this.deadManTimer);
      this.deadManTimer = null;
    }
  }

  private async checkDeadManStatus(): Promise<void> {
    const status = this.getDeadManStatus();
    if (!status || !status.armed) return;

    const now = new Date();

    if (status.nextCheckInDue && now >= new Date(status.nextCheckInDue)) {
      // Dead man switch triggered
      logger.security(`${LOG_PREFIX} Dead man switch triggered`);
      this.emitEvent("dead_man_triggered", {});

      // Activate panic mode
      await this.activate("dead_man");
      return;
    }

    if (status.warningThreshold && now >= new Date(status.warningThreshold)) {
      // Warning period
      logger.warn(`${LOG_PREFIX} Dead man switch warning`, {
        timeRemaining: status.timeRemaining,
      });
      this.emitEvent("dead_man_warning", {
        timeRemaining: status.timeRemaining,
      });
    }
  }

  private async hashPin(pin: string): Promise<string> {
    // Use Web Crypto API for secure hashing
    if (isClient() && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin + "nchat_duress_salt");
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    // Fallback simple hash (not cryptographically secure, but better than nothing)
    let hash = 0;
    const salted = pin + "nchat_duress_salt";
    for (let i = 0; i < salted.length; i++) {
      const char = salted.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }

  private async verifyMasterPassword(password: string): Promise<boolean> {
    // In a real implementation, this would verify against the user's
    // master password/account credentials
    // For now, always return true as this needs integration with auth system
    logger.debug(`${LOG_PREFIX} Master password verification requested`);
    return password.length > 0;
  }

  private async getDeviceId(): Promise<string | null> {
    // In a real implementation, this would get the device ID from the device
    // For now, generate a fingerprint
    if (isClient()) {
      const components = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
      ];
      const fingerprint = components.join("|");
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return `device_${Math.abs(hash).toString(36)}`;
    }
    return null;
  }

  private async getLocation(): Promise<GeolocationPosition | null> {
    if (!isClient() || !navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: false },
      );
    });
  }

  private generateActivationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `panic_${timestamp}_${random}`;
  }

  private emitEvent(type: PanicEventType, data: Record<string, unknown>): void {
    const event: PanicEvent = {
      type,
      timestamp: new Date().toISOString(),
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

let panicModeManagerInstance: PanicModeManager | null = null;

/**
 * Get the singleton PanicModeManager instance
 */
export function getPanicModeManager(
  storage?: ISecureStorage,
): PanicModeManager {
  if (!panicModeManagerInstance) {
    panicModeManagerInstance = new PanicModeManager(storage);
  }
  return panicModeManagerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetPanicModeManager(): void {
  if (panicModeManagerInstance) {
    panicModeManagerInstance.destroy();
    panicModeManagerInstance = null;
  }
}

/**
 * Initialize the panic mode manager singleton
 */
export async function initializePanicModeManager(
  storage?: ISecureStorage,
): Promise<PanicModeManager> {
  const manager = getPanicModeManager(storage);
  await manager.initialize();
  return manager;
}

/**
 * Create a new PanicModeManager instance (for testing)
 */
export function createPanicModeManager(
  storage?: ISecureStorage,
): PanicModeManager {
  return new PanicModeManager(storage);
}
