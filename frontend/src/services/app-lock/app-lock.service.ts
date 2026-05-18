/**
 * App Lock Service
 *
 * High-level service for managing application lock state.
 * Provides a simple API for components to interact with the
 * app lock system.
 */

import {
  initializeAppLockManager,
  getAppLockManager,
  resetAppLockManager,
  type AppLockManager,
  type AppLockState,
  type LockSettings,
  type LockResult,
  type LockEventType,
  type LockEventListener,
  type PlatformCapabilities,
  type LockPolicyMode,
} from "@/lib/app-lock";
import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

const LOG_PREFIX = "[AppLockService]";

// ============================================================================
// Types
// ============================================================================

/**
 * Lock screen mode for UI display
 */
export type LockScreenMode = "pin" | "biometric" | "both" | "either" | "none";

/**
 * Lock service options
 */
export interface AppLockServiceOptions {
  /** Auto-initialize on first access */
  autoInitialize?: boolean;
  /** Default lock settings */
  defaultSettings?: Partial<LockSettings>;
}

/**
 * Setup lock result
 */
export interface SetupLockResult {
  success: boolean;
  error?: string;
  requiresPinSetup?: boolean;
  biometricAvailable?: boolean;
}

// ============================================================================
// App Lock Service
// ============================================================================

/**
 * App Lock Service
 *
 * Provides high-level operations for app locking:
 * - Easy initialization and configuration
 * - Simplified lock/unlock APIs
 * - UI-friendly state and mode detection
 * - Event subscription
 */
export class AppLockService {
  private manager: AppLockManager | null = null;
  private initialized = false;
  private options: AppLockServiceOptions;
  private eventSubscriptions: Map<
    string,
    { type: LockEventType; listener: LockEventListener }
  > = new Map();

  constructor(options: AppLockServiceOptions = {}) {
    this.options = {
      autoInitialize: true,
      ...options,
    };
  }

  /**
   * Initialize the lock service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.manager = await initializeAppLockManager();

      // Apply default settings if provided
      if (this.options.defaultSettings) {
        await this.manager.updateSettings(this.options.defaultSettings);
      }

      this.initialized = true;
      logger.info(`${LOG_PREFIX} Initialized`);
    } catch (error) {
      logger.error(
        `${LOG_PREFIX} Initialization failed`,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.manager !== null;
  }

  /**
   * Get the current lock state
   */
  async getState(): Promise<AppLockState> {
    await this.ensureInitialized();
    return this.manager!.getStateAsync();
  }

  /**
   * Get platform capabilities
   */
  async getCapabilities(): Promise<PlatformCapabilities> {
    await this.ensureInitialized();
    return this.manager!.getCapabilities();
  }

  /**
   * Check if the app is currently locked
   */
  async isLocked(): Promise<boolean> {
    await this.ensureInitialized();
    return this.manager!.isLocked();
  }

  /**
   * Check if the user is locked out
   */
  async isLockedOut(): Promise<boolean> {
    await this.ensureInitialized();
    return this.manager!.isLockedOut();
  }

  /**
   * Get remaining lockout time
   */
  async getLockoutRemaining(): Promise<number> {
    await this.ensureInitialized();
    return this.manager!.getRemainingLockoutTime();
  }

  /**
   * Determine the lock screen mode based on settings
   */
  async getLockScreenMode(): Promise<LockScreenMode> {
    await this.ensureInitialized();
    const state = await this.manager!.getStateAsync();
    const settings = state.settings;

    switch (settings.mode) {
      case "none":
        return "none";
      case "pin":
        return "pin";
      case "biometric":
        return state.biometric.available ? "biometric" : "none";
      case "pin_or_biometric":
        return state.biometric.available ? "either" : "pin";
      case "pin_and_biometric":
        return state.biometric.available ? "both" : "pin";
      default:
        return "none";
    }
  }

  /**
   * Check if biometrics can be used as fallback
   */
  async canUseBiometricFallback(): Promise<boolean> {
    await this.ensureInitialized();
    const state = await this.manager!.getStateAsync();
    return (
      state.biometric.available &&
      (state.settings.mode === "pin_or_biometric" ||
        state.settings.mode === "biometric")
    );
  }

  /**
   * Check if PIN can be used as fallback
   */
  async canUsePinFallback(): Promise<boolean> {
    await this.ensureInitialized();
    const state = await this.manager!.getStateAsync();
    return (
      state.hasPinSet &&
      (state.settings.mode === "pin_or_biometric" ||
        state.settings.mode === "pin")
    );
  }

  // ============================================================================
  // Lock Operations
  // ============================================================================

  /**
   * Lock the app
   */
  async lock(): Promise<LockResult> {
    await this.ensureInitialized();
    return this.manager!.lock();
  }

  /**
   * Unlock with PIN
   */
  async unlockWithPin(pin: string): Promise<LockResult> {
    await this.ensureInitialized();
    return this.manager!.unlockWithPin(pin);
  }

  /**
   * Unlock with biometric
   */
  async unlockWithBiometric(reason?: string): Promise<LockResult> {
    await this.ensureInitialized();
    return this.manager!.unlockWithBiometric(reason);
  }

  /**
   * Attempt unlock with biometric, falling back to PIN if available
   */
  async unlockWithBiometricOrPin(pin?: string): Promise<LockResult> {
    await this.ensureInitialized();

    // Try biometric first
    const biometricResult = await this.manager!.unlockWithBiometric();
    if (biometricResult.success) {
      return biometricResult;
    }

    // If biometric failed and we have a PIN, try that
    if (pin && biometricResult.errorCode === "BIOMETRIC_CANCELLED") {
      return this.manager!.unlockWithPin(pin);
    }

    return biometricResult;
  }

  /**
   * Quick unlock - uses the most appropriate method
   */
  async quickUnlock(): Promise<LockResult> {
    await this.ensureInitialized();
    const state = await this.manager!.getStateAsync();

    // If biometric is available and mode supports it, try biometric
    if (
      state.biometric.available &&
      state.biometric.enrolled &&
      (state.settings.mode === "biometric" ||
        state.settings.mode === "pin_or_biometric")
    ) {
      return this.manager!.unlockWithBiometric();
    }

    // Otherwise, need PIN
    return {
      success: false,
      data: null,
      error: "PIN required for unlock",
      errorCode: "PIN_NOT_SET",
    };
  }

  // ============================================================================
  // Settings Management
  // ============================================================================

  /**
   * Get current settings
   */
  async getSettings(): Promise<LockSettings> {
    await this.ensureInitialized();
    return this.manager!.getSettings();
  }

  /**
   * Update lock settings
   */
  async updateSettings(settings: Partial<LockSettings>): Promise<LockResult> {
    await this.ensureInitialized();
    return this.manager!.updateSettings(settings);
  }

  /**
   * Enable lock with a specific mode
   */
  async enableLock(mode: LockPolicyMode): Promise<SetupLockResult> {
    await this.ensureInitialized();
    const state = await this.manager!.getStateAsync();

    // Check if PIN is required but not set
    if (
      (mode === "pin" ||
        mode === "pin_or_biometric" ||
        mode === "pin_and_biometric") &&
      !state.hasPinSet
    ) {
      return {
        success: false,
        error: "PIN must be set first",
        requiresPinSetup: true,
        biometricAvailable: state.biometric.available,
      };
    }

    // Check if biometric is required but not available
    if (
      (mode === "biometric" || mode === "pin_and_biometric") &&
      !state.biometric.available
    ) {
      return {
        success: false,
        error: "Biometric authentication is not available",
        requiresPinSetup: false,
        biometricAvailable: false,
      };
    }

    const result = await this.manager!.updateSettings({ mode });
    return {
      success: result.success,
      error: result.error ?? undefined,
      biometricAvailable: state.biometric.available,
    };
  }

  /**
   * Disable lock
   */
  async disableLock(): Promise<LockResult> {
    await this.ensureInitialized();
    return this.manager!.updateSettings({ mode: "none" });
  }

  /**
   * Enable idle timeout
   */
  async enableIdleTimeout(minutes: number = 5): Promise<LockResult> {
    await this.ensureInitialized();
    return this.manager!.updateSettings({
      idleTimeout: {
        enabled: true,
        timeoutMinutes: minutes,
        warningSeconds: 30,
        resetEvents: [
          "keypress",
          "mousemove",
          "mousedown",
          "scroll",
          "touchstart",
        ],
      },
    });
  }

  /**
   * Disable idle timeout
   */
  async disableIdleTimeout(): Promise<LockResult> {
    await this.ensureInitialized();
    const settings = this.manager!.getSettings();
    return this.manager!.updateSettings({
      idleTimeout: {
        ...settings.idleTimeout,
        enabled: false,
      },
    });
  }

  // ============================================================================
  // PIN Management
  // ============================================================================

  /**
   * Check if PIN is set
   */
  async hasPinSet(): Promise<boolean> {
    await this.ensureInitialized();
    return this.manager!.hasPinSet();
  }

  /**
   * Set up a new PIN
   */
  async setupPin(pin: string): Promise<LockResult> {
    await this.ensureInitialized();
    return this.manager!.setPin(pin);
  }

  /**
   * Change the current PIN
   */
  async changePin(currentPin: string, newPin: string): Promise<LockResult> {
    await this.ensureInitialized();
    return this.manager!.changePin(currentPin, newPin);
  }

  /**
   * Remove the PIN (requires verification)
   */
  async removePin(currentPin: string): Promise<LockResult> {
    await this.ensureInitialized();
    return this.manager!.removePin(currentPin);
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Subscribe to lock events
   * @returns Unsubscribe function
   */
  subscribe(type: LockEventType, listener: LockEventListener): () => void {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    if (this.manager) {
      this.manager.addEventListener(type, listener);
    }

    this.eventSubscriptions.set(id, { type, listener });

    return () => {
      if (this.manager) {
        this.manager.removeEventListener(type, listener);
      }
      this.eventSubscriptions.delete(id);
    };
  }

  /**
   * Subscribe to all lock/unlock events
   */
  onLockStateChange(callback: (locked: boolean) => void): () => void {
    const lockUnsub = this.subscribe("locked", () => callback(true));
    const unlockUnsub = this.subscribe("unlocked", () => callback(false));

    return () => {
      lockUnsub();
      unlockUnsub();
    };
  }

  /**
   * Reset activity timer (call on user interaction)
   */
  resetActivity(): void {
    if (this.manager) {
      this.manager.resetActivityTimer();
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up resources
   */
  destroy(): void {
    // Unsubscribe all listeners
    if (this.manager) {
      this.eventSubscriptions.forEach(({ type, listener }) => {
        this.manager!.removeEventListener(type, listener);
      });
    }
    this.eventSubscriptions.clear();

    resetAppLockManager();
    this.manager = null;
    this.initialized = false;

    logger.info(`${LOG_PREFIX} Destroyed`);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Ensure the service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      if (this.options.autoInitialize) {
        await this.initialize();
      } else {
        throw new Error("App lock service not initialized");
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let appLockServiceInstance: AppLockService | null = null;

/**
 * Get the singleton AppLockService instance
 */
export function getAppLockService(
  options?: AppLockServiceOptions,
): AppLockService {
  if (!appLockServiceInstance) {
    appLockServiceInstance = new AppLockService(options);
  }
  return appLockServiceInstance;
}

/**
 * Reset the singleton instance
 */
export function resetAppLockService(): void {
  if (appLockServiceInstance) {
    appLockServiceInstance.destroy();
    appLockServiceInstance = null;
  }
}

/**
 * Initialize the app lock service singleton
 */
export async function initializeAppLockService(
  options?: AppLockServiceOptions,
): Promise<AppLockService> {
  const service = getAppLockService(options);
  await service.initialize();
  return service;
}
