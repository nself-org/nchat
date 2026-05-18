/**
 * App Lock Manager
 *
 * Central manager for application lock functionality.
 * Coordinates PIN and biometric authentication, idle timeout,
 * lock on launch, and daily biometric verification.
 */

import { getSecureStorage, type ISecureStorage } from "@/lib/secure-storage";
import { logger } from "@/lib/logger";
import { isClient } from "@/lib/environment";
import { PinAuth, createPinAuth } from "./pin-auth";
import {
  BiometricAuth,
  createBiometricAuth,
  detectPlatform,
} from "./biometric-auth";
import {
  type AppLockState,
  type LockSettings,
  type LockStateInfo,
  type LockResult,
  type LockEventType,
  type LockEvent,
  type LockEventListener,
  type PlatformCapabilities,
  type Platform,
  type DailyBiometricConfig,
  DEFAULT_LOCK_SETTINGS,
  DEFAULT_LOCK_STATE_INFO,
  DEFAULT_BIOMETRIC_INFO,
  STORAGE_KEYS,
  SECURE_STORAGE_SERVICE,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

const LOG_PREFIX = "[AppLockManager]";
const IDLE_CHECK_INTERVAL = 1000; // 1 second
const BACKGROUND_CHECK_INTERVAL = 1000; // 1 second

// ============================================================================
// App Lock Manager Class
// ============================================================================

/**
 * App Lock Manager
 *
 * Manages all aspects of application locking:
 * - Lock state management
 * - PIN and biometric authentication
 * - Idle timeout detection
 * - Lock on app launch/resume
 * - Daily biometric verification
 * - Event notification
 */
export class AppLockManager {
  private storage: ISecureStorage;
  private pinAuth: PinAuth;
  private biometricAuth: BiometricAuth;
  private platform: Platform;
  private settings: LockSettings = { ...DEFAULT_LOCK_SETTINGS };
  private lockState: LockStateInfo = { ...DEFAULT_LOCK_STATE_INFO };
  private initialized = false;
  private eventListeners: Map<LockEventType, Set<LockEventListener>> =
    new Map();

  // Idle timeout tracking
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private idleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private lastActivityTime: number = Date.now();
  private warningShown = false;

  // Background detection
  private backgroundTime: number | null = null;
  private visibilityHandler: (() => void) | null = null;
  private backgroundCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(storage?: ISecureStorage) {
    this.storage = storage || getSecureStorage();
    this.pinAuth = createPinAuth(this.storage);
    this.biometricAuth = createBiometricAuth(this.storage);
    this.platform = detectPlatform();
  }

  /**
   * Initialize the app lock manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize dependencies
    if (!this.storage.isInitialized()) {
      await this.storage.initialize();
    }
    await this.pinAuth.initialize();
    await this.biometricAuth.initialize();

    // Load settings
    await this.loadSettings();
    await this.loadLockState();

    // Update PIN length in pinAuth
    this.pinAuth.setPinLength(this.settings.pinLength);

    // Setup idle tracking and visibility detection
    if (isClient()) {
      this.setupIdleTracking();
      this.setupVisibilityDetection();
    }

    this.initialized = true;
    logger.info(`${LOG_PREFIX} Initialized`, {
      platform: this.platform,
      mode: this.settings.mode,
      lockState: this.lockState.state,
    });

    // Check if we need to lock on initialization
    await this.checkInitialLockState();
  }

  /**
   * Get current lock state
   */
  getState(): AppLockState {
    return {
      initialized: this.initialized,
      platform: this.platform,
      settings: { ...this.settings },
      lockState: { ...this.lockState },
      biometric: this.biometricAuth.getBiometricInfo(),
      hasPinSet: false, // Will be updated in async call
    };
  }

  /**
   * Get current lock state (async version with PIN check)
   */
  async getStateAsync(): Promise<AppLockState> {
    const hasPinSet = await this.pinAuth.hasPinSet();
    return {
      initialized: this.initialized,
      platform: this.platform,
      settings: { ...this.settings },
      lockState: { ...this.lockState },
      biometric: this.biometricAuth.getBiometricInfo(),
      hasPinSet,
    };
  }

  /**
   * Get platform capabilities
   */
  async getCapabilities(): Promise<PlatformCapabilities> {
    const biometricInfo = this.biometricAuth.getBiometricInfo();
    const storageCapabilities = await this.storage.getCapabilities();

    return {
      platform: this.platform,
      supportsPin: true, // PIN is always supported
      supportsBiometric: biometricInfo.available,
      biometricTypes: biometricInfo.available ? [biometricInfo.type] : [],
      supportsSecureStorage: storageCapabilities.securityLevel !== "plaintext",
      supportsBackgroundDetection:
        isClient() && typeof document !== "undefined",
      supportsIdleDetection: isClient() && typeof document !== "undefined",
    };
  }

  /**
   * Check if the app is currently locked
   */
  isLocked(): boolean {
    return this.lockState.state === "locked";
  }

  /**
   * Check if the user is locked out (too many failed attempts)
   */
  isLockedOut(): boolean {
    if (!this.lockState.isLockedOut || !this.lockState.lockoutEndTime) {
      return false;
    }

    const now = new Date();
    const lockoutEnd = new Date(this.lockState.lockoutEndTime);

    if (now >= lockoutEnd) {
      // Lockout expired
      this.lockState.isLockedOut = false;
      this.lockState.lockoutEndTime = null;
      this.lockState.failedAttempts = 0;
      this.saveLockState();
      this.emitEvent("lockout_ended", {});
      return false;
    }

    return true;
  }

  /**
   * Get remaining lockout time in seconds
   */
  getRemainingLockoutTime(): number {
    if (!this.lockState.lockoutEndTime) return 0;

    const now = new Date();
    const lockoutEnd = new Date(this.lockState.lockoutEndTime);
    const remaining = Math.max(
      0,
      (lockoutEnd.getTime() - now.getTime()) / 1000,
    );

    return Math.ceil(remaining);
  }

  // ============================================================================
  // Lock Operations
  // ============================================================================

  /**
   * Lock the application
   */
  async lock(): Promise<LockResult> {
    await this.ensureInitialized();

    if (this.settings.mode === "none") {
      return {
        success: false,
        data: null,
        error: "Lock is disabled",
        errorCode: "NOT_INITIALIZED",
      };
    }

    if (this.lockState.state === "locked") {
      return {
        success: true,
        data: null,
        error: null,
        errorCode: null,
      };
    }

    this.lockState.state = "locked";
    this.lockState.lockedAt = new Date().toISOString();
    await this.saveLockState();

    this.emitEvent("locked", {});
    logger.info(`${LOG_PREFIX} App locked`);

    return {
      success: true,
      data: null,
      error: null,
      errorCode: null,
    };
  }

  /**
   * Unlock the application with PIN
   */
  async unlockWithPin(pin: string): Promise<LockResult> {
    await this.ensureInitialized();

    // Check lockout
    if (this.isLockedOut()) {
      return {
        success: false,
        data: null,
        error: `Locked out. Try again in ${this.getRemainingLockoutTime()} seconds`,
        errorCode: "LOCKED_OUT",
      };
    }

    // Check if PIN mode is allowed
    if (
      this.settings.mode !== "pin" &&
      this.settings.mode !== "pin_or_biometric" &&
      this.settings.mode !== "pin_and_biometric"
    ) {
      return {
        success: false,
        data: null,
        error: "PIN authentication is not enabled",
        errorCode: "NOT_INITIALIZED",
      };
    }

    // Verify PIN
    const result = await this.pinAuth.verifyPin(pin);

    if (!result.success || !result.data) {
      this.handleFailedAttempt();
      return {
        success: false,
        data: null,
        error: result.error || "Invalid PIN",
        errorCode: result.errorCode || "INVALID_PIN",
      };
    }

    // For pin_and_biometric mode, check if biometric is still needed
    if (
      this.settings.mode === "pin_and_biometric" &&
      !this.isDailyBiometricVerified()
    ) {
      return {
        success: false,
        data: null,
        error: "Daily biometric verification required",
        errorCode: "BIOMETRIC_FAILED",
      };
    }

    return this.completeUnlock("pin");
  }

  /**
   * Unlock the application with biometric
   */
  async unlockWithBiometric(reason?: string): Promise<LockResult> {
    await this.ensureInitialized();

    // Check lockout
    if (this.isLockedOut()) {
      return {
        success: false,
        data: null,
        error: `Locked out. Try again in ${this.getRemainingLockoutTime()} seconds`,
        errorCode: "LOCKED_OUT",
      };
    }

    // Check if biometric mode is allowed
    if (
      this.settings.mode !== "biometric" &&
      this.settings.mode !== "pin_or_biometric" &&
      this.settings.mode !== "pin_and_biometric"
    ) {
      return {
        success: false,
        data: null,
        error: "Biometric authentication is not enabled",
        errorCode: "NOT_INITIALIZED",
      };
    }

    // Authenticate
    const result = await this.biometricAuth.authenticate(
      reason || "Authenticate to unlock the app",
    );

    if (!result.success) {
      if (result.errorCode !== "BIOMETRIC_CANCELLED") {
        this.handleFailedAttempt();
      }
      return result;
    }

    // For pin_and_biometric mode, update daily verification
    if (this.settings.mode === "pin_and_biometric") {
      await this.updateDailyBiometric();
    }

    return this.completeUnlock("biometric");
  }

  /**
   * Unlock using any available method (for fallback scenarios)
   */
  async unlockWithAny(
    pin?: string,
    biometricReason?: string,
  ): Promise<LockResult> {
    await this.ensureInitialized();

    // Try biometric first if available
    if (
      (this.settings.mode === "biometric" ||
        this.settings.mode === "pin_or_biometric") &&
      this.biometricAuth.getBiometricInfo().available
    ) {
      const biometricResult = await this.unlockWithBiometric(biometricReason);
      if (biometricResult.success) {
        return biometricResult;
      }
    }

    // Try PIN if provided
    if (pin) {
      return this.unlockWithPin(pin);
    }

    return {
      success: false,
      data: null,
      error: "No authentication method succeeded",
      errorCode: "UNKNOWN_ERROR",
    };
  }

  // ============================================================================
  // Settings Management
  // ============================================================================

  /**
   * Get current settings
   */
  getSettings(): LockSettings {
    return { ...this.settings };
  }

  /**
   * Update lock settings
   */
  async updateSettings(settings: Partial<LockSettings>): Promise<LockResult> {
    await this.ensureInitialized();

    const previousMode = this.settings.mode;
    this.settings = {
      ...this.settings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    // Update PIN length in pinAuth
    if (settings.pinLength) {
      this.pinAuth.setPinLength(settings.pinLength);
    }

    // Reset idle tracking if timeout settings changed
    if (settings.idleTimeout) {
      this.resetIdleTimer();
    }

    await this.saveSettings();
    this.emitEvent("settings_changed", {
      previousMode,
      newMode: this.settings.mode,
    });

    logger.info(`${LOG_PREFIX} Settings updated`, {
      mode: this.settings.mode,
      idleTimeout: this.settings.idleTimeout.enabled,
    });

    return {
      success: true,
      data: null,
      error: null,
      errorCode: null,
    };
  }

  // ============================================================================
  // PIN Management
  // ============================================================================

  /**
   * Check if a PIN is set
   */
  async hasPinSet(): Promise<boolean> {
    await this.ensureInitialized();
    return this.pinAuth.hasPinSet();
  }

  /**
   * Set or update the PIN
   */
  async setPin(pin: string): Promise<LockResult> {
    await this.ensureInitialized();

    const result = await this.pinAuth.setPin(pin);
    if (result.success) {
      this.emitEvent("pin_changed", {});
    }
    return result;
  }

  /**
   * Change the PIN
   */
  async changePin(currentPin: string, newPin: string): Promise<LockResult> {
    await this.ensureInitialized();

    const result = await this.pinAuth.changePin(currentPin, newPin);
    if (result.success) {
      this.emitEvent("pin_changed", {});
    }
    return result;
  }

  /**
   * Remove the PIN
   */
  async removePin(currentPin: string): Promise<LockResult> {
    await this.ensureInitialized();

    // If mode requires PIN, don't allow removal
    if (
      this.settings.mode === "pin" ||
      this.settings.mode === "pin_and_biometric"
    ) {
      return {
        success: false,
        data: null,
        error: "Cannot remove PIN while PIN mode is enabled",
        errorCode: "NOT_INITIALIZED",
      };
    }

    return this.pinAuth.removePin(currentPin);
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Add an event listener
   */
  addEventListener(type: LockEventType, listener: LockEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  /**
   * Remove an event listener
   */
  removeEventListener(type: LockEventType, listener: LockEventListener): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  /**
   * Reset activity timer (call on user activity)
   */
  resetActivityTimer(): void {
    this.lastActivityTime = Date.now();
    this.warningShown = false;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopIdleTracking();
    this.stopVisibilityDetection();
    this.eventListeners.clear();
    this.initialized = false;
    logger.info(`${LOG_PREFIX} Destroyed`);
  }

  // ============================================================================
  // Private Methods - State Management
  // ============================================================================

  /**
   * Ensure the manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Load settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const result = await this.storage.getItem(STORAGE_KEYS.SETTINGS, {
        service: SECURE_STORAGE_SERVICE,
      });

      if (result.success && result.data) {
        this.settings = {
          ...DEFAULT_LOCK_SETTINGS,
          ...JSON.parse(result.data),
        };
      }
    } catch (error) {
      logger.warn(`${LOG_PREFIX} Failed to load settings`, { error });
    }
  }

  /**
   * Save settings to storage
   */
  private async saveSettings(): Promise<void> {
    try {
      await this.storage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(this.settings),
        { service: SECURE_STORAGE_SERVICE },
      );
    } catch (error) {
      logger.error(
        `${LOG_PREFIX} Failed to save settings`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Load lock state from storage
   */
  private async loadLockState(): Promise<void> {
    try {
      const result = await this.storage.getItem(STORAGE_KEYS.LOCK_STATE, {
        service: SECURE_STORAGE_SERVICE,
      });

      if (result.success && result.data) {
        this.lockState = {
          ...DEFAULT_LOCK_STATE_INFO,
          ...JSON.parse(result.data),
        };
      }
    } catch (error) {
      logger.warn(`${LOG_PREFIX} Failed to load lock state`, { error });
    }
  }

  /**
   * Save lock state to storage
   */
  private async saveLockState(): Promise<void> {
    try {
      await this.storage.setItem(
        STORAGE_KEYS.LOCK_STATE,
        JSON.stringify(this.lockState),
        { service: SECURE_STORAGE_SERVICE },
      );
    } catch (error) {
      logger.error(
        `${LOG_PREFIX} Failed to save lock state`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Check initial lock state on initialization
   */
  private async checkInitialLockState(): Promise<void> {
    if (this.settings.mode === "none") {
      this.lockState.state = "unlocked";
      return;
    }

    // If lock on launch is enabled and app was in background
    if (this.settings.lockOnLaunch.enabled) {
      this.lockState.state = "locked";
      await this.saveLockState();
    }
  }

  // ============================================================================
  // Private Methods - Unlock
  // ============================================================================

  /**
   * Complete the unlock process
   */
  private async completeUnlock(
    method: "pin" | "biometric",
  ): Promise<LockResult> {
    this.lockState.state = "unlocked";
    this.lockState.unlockedAt = new Date().toISOString();
    this.lockState.lastAuthMethod = method;
    this.lockState.failedAttempts = 0;
    this.lockState.isLockedOut = false;
    this.lockState.lockoutEndTime = null;

    await this.saveLockState();
    this.resetActivityTimer();
    this.resetIdleTimer();

    this.emitEvent("unlocked", { method });
    logger.info(`${LOG_PREFIX} App unlocked`, { method });

    return {
      success: true,
      data: null,
      error: null,
      errorCode: null,
    };
  }

  /**
   * Handle a failed authentication attempt
   */
  private handleFailedAttempt(): void {
    this.lockState.failedAttempts++;

    if (this.lockState.failedAttempts >= this.settings.maxPinAttempts) {
      this.lockState.isLockedOut = true;
      const lockoutEnd = new Date();
      lockoutEnd.setMinutes(
        lockoutEnd.getMinutes() + this.settings.lockoutMinutes,
      );
      this.lockState.lockoutEndTime = lockoutEnd.toISOString();

      this.emitEvent("lockout_started", {
        duration: this.settings.lockoutMinutes * 60,
        attempts: this.lockState.failedAttempts,
      });

      logger.warn(`${LOG_PREFIX} Lockout triggered`, {
        attempts: this.lockState.failedAttempts,
        duration: this.settings.lockoutMinutes,
      });
    }

    this.saveLockState();
    this.emitEvent("unlock_failed", {
      attempts: this.lockState.failedAttempts,
    });
  }

  // ============================================================================
  // Private Methods - Daily Biometric
  // ============================================================================

  /**
   * Check if daily biometric has been verified
   */
  private isDailyBiometricVerified(): boolean {
    const config = this.settings.dailyBiometric;
    if (!config.verifiedToday || !config.lastVerifiedDate) {
      return false;
    }

    const now = new Date();
    const lastVerified = new Date(config.lastVerifiedDate);

    // Check if it's the same day
    if (
      now.getFullYear() !== lastVerified.getFullYear() ||
      now.getMonth() !== lastVerified.getMonth() ||
      now.getDate() !== lastVerified.getDate()
    ) {
      return false;
    }

    // Check if reset hour has passed
    if (
      now.getHours() >= config.resetHour &&
      lastVerified.getHours() < config.resetHour
    ) {
      return false;
    }

    return true;
  }

  /**
   * Update daily biometric verification
   */
  private async updateDailyBiometric(): Promise<void> {
    const config: DailyBiometricConfig = {
      ...this.settings.dailyBiometric,
      verifiedToday: true,
      lastVerifiedDate: new Date().toISOString(),
    };

    this.settings.dailyBiometric = config;
    await this.saveSettings();
    this.emitEvent("biometric_enrolled", {});
  }

  // ============================================================================
  // Private Methods - Idle Tracking
  // ============================================================================

  /**
   * Setup idle activity tracking
   */
  private setupIdleTracking(): void {
    if (!isClient()) return;

    // Add activity listeners
    const resetEvents = this.settings.idleTimeout.resetEvents;
    const handler = () => this.resetActivityTimer();

    resetEvents.forEach((event) => {
      if (event === "visibilitychange") {
        document.addEventListener(event, handler);
      } else {
        window.addEventListener(event, handler, { passive: true });
      }
    });

    // Start idle check timer
    this.startIdleCheck();
  }

  /**
   * Start the idle check timer
   */
  private startIdleCheck(): void {
    if (!this.settings.idleTimeout.enabled) return;

    this.idleCheckTimer = setInterval(() => {
      this.checkIdleState();
    }, IDLE_CHECK_INTERVAL);
  }

  /**
   * Check if app should be locked due to idle
   */
  private checkIdleState(): void {
    if (this.lockState.state === "locked") return;
    if (!this.settings.idleTimeout.enabled) return;

    const now = Date.now();
    const idleMs = this.settings.idleTimeout.timeoutMinutes * 60 * 1000;
    const warningMs = idleMs - this.settings.idleTimeout.warningSeconds * 1000;
    const elapsed = now - this.lastActivityTime;

    // Show warning
    if (elapsed >= warningMs && !this.warningShown) {
      this.warningShown = true;
      this.emitEvent("idle_warning", {
        remainingSeconds: this.settings.idleTimeout.warningSeconds,
      });
    }

    // Lock
    if (elapsed >= idleMs) {
      this.lock();
    }
  }

  /**
   * Reset the idle timer
   */
  private resetIdleTimer(): void {
    this.lastActivityTime = Date.now();
    this.warningShown = false;
  }

  /**
   * Stop idle tracking
   */
  private stopIdleTracking(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = null;
    }
  }

  // ============================================================================
  // Private Methods - Visibility Detection
  // ============================================================================

  /**
   * Setup visibility change detection
   */
  private setupVisibilityDetection(): void {
    if (!isClient() || typeof document === "undefined") return;

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.backgroundTime = Date.now();
      } else if (this.backgroundTime !== null) {
        this.checkBackgroundLock();
      }
    };

    document.addEventListener("visibilitychange", this.visibilityHandler);

    // Also start a background check timer for more accurate detection
    this.backgroundCheckTimer = setInterval(() => {
      if (!document.hidden && this.backgroundTime !== null) {
        this.checkBackgroundLock();
      }
    }, BACKGROUND_CHECK_INTERVAL);
  }

  /**
   * Check if app should be locked after returning from background
   */
  private checkBackgroundLock(): void {
    if (!this.settings.lockOnLaunch.enabled || this.backgroundTime === null)
      return;

    const now = Date.now();
    const backgroundDuration = now - this.backgroundTime;
    const thresholdMs =
      this.settings.lockOnLaunch.backgroundThresholdSeconds * 1000;

    if (
      backgroundDuration >= thresholdMs &&
      this.lockState.state !== "locked"
    ) {
      this.lock();
    }

    this.backgroundTime = null;
  }

  /**
   * Stop visibility detection
   */
  private stopVisibilityDetection(): void {
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.backgroundCheckTimer) {
      clearInterval(this.backgroundCheckTimer);
      this.backgroundCheckTimer = null;
    }
  }

  // ============================================================================
  // Private Methods - Events
  // ============================================================================

  /**
   * Emit a lock event
   */
  private emitEvent(type: LockEventType, data: Record<string, unknown>): void {
    const event: LockEvent = {
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
          logger.error(
            `${LOG_PREFIX} Event listener error`,
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      });
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let appLockManagerInstance: AppLockManager | null = null;

/**
 * Get the singleton AppLockManager instance
 */
export function getAppLockManager(storage?: ISecureStorage): AppLockManager {
  if (!appLockManagerInstance) {
    appLockManagerInstance = new AppLockManager(storage);
  }
  return appLockManagerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetAppLockManager(): void {
  if (appLockManagerInstance) {
    appLockManagerInstance.destroy();
    appLockManagerInstance = null;
  }
}

/**
 * Initialize the app lock manager singleton
 */
export async function initializeAppLockManager(
  storage?: ISecureStorage,
): Promise<AppLockManager> {
  const manager = getAppLockManager(storage);
  await manager.initialize();
  return manager;
}

/**
 * Create a new AppLockManager instance
 */
export function createAppLockManager(storage?: ISecureStorage): AppLockManager {
  return new AppLockManager(storage);
}
