/**
 * Device Lock Policy Implementation
 * Manages PIN/biometric authentication and device lock schedules
 */

import { crypto } from "./crypto";

// ============================================================================
// TYPES
// ============================================================================

export interface DeviceLockConfig {
  enabled: boolean;
  method: "pin" | "biometric" | "both";
  lockTimeout: number; // milliseconds until auto-lock
  maxAttempts: number; // max failed attempts before lockout
  lockoutDuration: number; // lockout duration in milliseconds
  requireOnStartup: boolean;
  requireAfterInactivity: boolean;
  inactivityTimeout: number; // milliseconds of inactivity before requiring unlock
}

export interface DeviceLockState {
  isLocked: boolean;
  isConfigured: boolean;
  failedAttempts: number;
  lockedUntil: number | null; // timestamp when lockout ends
  lastActivityAt: number;
  lastUnlockedAt: number | null;
}

export interface PINValidation {
  isValid: boolean;
  hash: Uint8Array;
  salt: Uint8Array;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: DeviceLockConfig = {
  enabled: true,
  method: "both",
  lockTimeout: 5 * 60 * 1000, // 5 minutes
  maxAttempts: 3,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes
  requireOnStartup: true,
  requireAfterInactivity: true,
  inactivityTimeout: 15 * 60 * 1000, // 15 minutes
};

const STORAGE_KEY = "nchat_device_lock";
const PIN_STORAGE_KEY = "nchat_device_pin";

// ============================================================================
// DEVICE LOCK MANAGER
// ============================================================================

export class DeviceLockManager {
  private config: DeviceLockConfig;
  private state: DeviceLockState;
  private activityTimer: NodeJS.Timeout | null = null;
  private lockTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<DeviceLockConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.loadState();

    // Start monitoring activity
    this.startActivityMonitoring();
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Update device lock configuration
   */
  updateConfig(config: Partial<DeviceLockConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();

    // Restart monitoring with new config
    this.stopActivityMonitoring();
    this.startActivityMonitoring();
  }

  /**
   * Get current configuration
   */
  getConfig(): DeviceLockConfig {
    return { ...this.config };
  }

  /**
   * Save configuration to storage
   */
  private saveConfig(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `${STORAGE_KEY}_config`,
        JSON.stringify(this.config),
      );
    }
  }

  /**
   * Load configuration from storage
   */
  private loadConfig(): DeviceLockConfig {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_KEY}_config`);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    }
    return DEFAULT_CONFIG;
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  /**
   * Get current device lock state
   */
  getState(): DeviceLockState {
    return { ...this.state };
  }

  /**
   * Save state to storage
   */
  private saveState(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }
  }

  /**
   * Load state from storage
   */
  private loadState(): DeviceLockState {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }

    return {
      isLocked: this.config.requireOnStartup,
      isConfigured: false,
      failedAttempts: 0,
      lockedUntil: null,
      lastActivityAt: Date.now(),
      lastUnlockedAt: null,
    };
  }

  // ==========================================================================
  // PIN MANAGEMENT
  // ==========================================================================

  /**
   * Set up PIN lock
   */
  async setupPIN(pin: string): Promise<void> {
    if (pin.length < 4) {
      throw new Error("PIN must be at least 4 digits");
    }

    // Generate salt and hash
    const salt = crypto.generateSalt();
    const hash = await crypto.deriveMasterKey(pin, salt, 10000);

    // Store PIN hash
    const pinData = {
      hash: Array.from(hash),
      salt: Array.from(salt),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinData));
    }

    this.state.isConfigured = true;
    this.saveState();
  }

  /**
   * Verify PIN
   */
  async verifyPIN(pin: string): Promise<boolean> {
    if (typeof window === "undefined") {
      return false;
    }

    // Check if locked out
    if (this.isLockedOut()) {
      throw new Error(`Device is locked. Try again later.`);
    }

    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (!stored) {
      throw new Error("PIN not configured");
    }

    const pinData = JSON.parse(stored);
    const salt = new Uint8Array(pinData.salt);
    const expectedHash = new Uint8Array(pinData.hash);

    // Derive hash from entered PIN
    const actualHash = await crypto.deriveMasterKey(pin, salt, 10000);

    // Compare hashes
    const isValid = crypto.constantTimeEqual(actualHash, expectedHash);

    if (isValid) {
      // Reset failed attempts
      this.state.failedAttempts = 0;
      this.state.lockedUntil = null;
      this.state.lastUnlockedAt = Date.now();
      this.unlock();
      return true;
    } else {
      // Increment failed attempts
      this.state.failedAttempts++;

      // Check if lockout threshold reached
      if (this.state.failedAttempts >= this.config.maxAttempts) {
        this.state.lockedUntil = Date.now() + this.config.lockoutDuration;
      }

      this.saveState();
      return false;
    }
  }

  /**
   * Check if device is locked out
   */
  isLockedOut(): boolean {
    if (!this.state.lockedUntil) {
      return false;
    }

    if (Date.now() < this.state.lockedUntil) {
      return true;
    }

    // Lockout period expired
    this.state.lockedUntil = null;
    this.state.failedAttempts = 0;
    this.saveState();
    return false;
  }

  /**
   * Get remaining lockout time
   */
  getLockoutRemaining(): number {
    if (!this.state.lockedUntil) {
      return 0;
    }

    const remaining = this.state.lockedUntil - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Clear PIN configuration
   */
  async clearPIN(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem(PIN_STORAGE_KEY);
    }

    this.state.isConfigured = false;
    this.saveState();
  }

  // ==========================================================================
  // BIOMETRIC AUTHENTICATION
  // ==========================================================================

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      return false;
    }

    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Setup biometric authentication
   */
  async setupBiometric(userId: string): Promise<void> {
    if (!(await this.isBiometricAvailable())) {
      throw new Error("Biometric authentication not available");
    }

    try {
      // Generate challenge
      const challenge = crypto.generateRandomBytes(32);

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge as BufferSource,
          rp: {
            name: "nself-chat",
            id: window.location.hostname,
          },
          user: {
            id: crypto.stringToBytes(userId) as BufferSource,
            name: userId,
            displayName: userId,
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      });

      if (!credential) {
        throw new Error("Failed to create biometric credential");
      }

      // Store credential ID
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `${STORAGE_KEY}_biometric`,
          JSON.stringify({
            credentialId: Array.from(new Uint8Array((credential as any).rawId)),
          }),
        );
      }

      this.state.isConfigured = true;
      this.saveState();
    } catch (error: any) {
      throw new Error(`Biometric setup failed: ${error.message}`);
    }
  }

  /**
   * Verify biometric authentication
   */
  async verifyBiometric(): Promise<boolean> {
    if (typeof window === "undefined") {
      return false;
    }

    // Check if locked out
    if (this.isLockedOut()) {
      throw new Error("Device is locked. Try again later.");
    }

    const stored = localStorage.getItem(`${STORAGE_KEY}_biometric`);
    if (!stored) {
      throw new Error("Biometric not configured");
    }

    try {
      const { credentialId } = JSON.parse(stored);
      const challenge = crypto.generateRandomBytes(32);

      // Request authentication
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge as BufferSource,
          allowCredentials: [
            {
              type: "public-key",
              id: new Uint8Array(credentialId),
            },
          ],
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (!assertion) {
        this.state.failedAttempts++;
        if (this.state.failedAttempts >= this.config.maxAttempts) {
          this.state.lockedUntil = Date.now() + this.config.lockoutDuration;
        }
        this.saveState();
        return false;
      }

      // Reset failed attempts
      this.state.failedAttempts = 0;
      this.state.lockedUntil = null;
      this.state.lastUnlockedAt = Date.now();
      this.unlock();
      return true;
    } catch (error: any) {
      this.state.failedAttempts++;
      if (this.state.failedAttempts >= this.config.maxAttempts) {
        this.state.lockedUntil = Date.now() + this.config.lockoutDuration;
      }
      this.saveState();
      return false;
    }
  }

  // ==========================================================================
  // LOCK/UNLOCK
  // ==========================================================================

  /**
   * Lock device
   */
  lock(): void {
    this.state.isLocked = true;
    this.saveState();

    // Clear activity timer
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
  }

  /**
   * Unlock device
   */
  unlock(): void {
    this.state.isLocked = false;
    this.state.lastUnlockedAt = Date.now();
    this.state.lastActivityAt = Date.now();
    this.saveState();

    // Restart activity monitoring
    this.startActivityMonitoring();
  }

  /**
   * Check if device is locked
   */
  isLocked(): boolean {
    // Check lockout
    if (this.isLockedOut()) {
      return true;
    }

    // Check if locked
    if (this.state.isLocked) {
      return true;
    }

    // Check inactivity timeout
    if (
      this.config.requireAfterInactivity &&
      Date.now() - this.state.lastActivityAt > this.config.inactivityTimeout
    ) {
      this.lock();
      return true;
    }

    return false;
  }

  // ==========================================================================
  // ACTIVITY MONITORING
  // ==========================================================================

  /**
   * Start monitoring user activity
   */
  private startActivityMonitoring(): void {
    if (typeof window === "undefined" || !this.config.enabled) {
      return;
    }

    // Set up activity listeners
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => {
      this.recordActivity();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Set up inactivity timer
    this.resetActivityTimer();
  }

  /**
   * Stop monitoring user activity
   */
  private stopActivityMonitoring(): void {
    if (typeof window === "undefined") {
      return;
    }

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => {
      this.recordActivity();
    };

    events.forEach((event) => {
      window.removeEventListener(event, handleActivity);
    });

    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }

    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  }

  /**
   * Record user activity
   */
  private recordActivity(): void {
    if (!this.config.enabled || this.state.isLocked) {
      return;
    }

    this.state.lastActivityAt = Date.now();
    this.saveState();
    this.resetActivityTimer();
  }

  /**
   * Reset activity timer
   */
  private resetActivityTimer(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
    }

    // Set up inactivity lock timer
    if (this.config.requireAfterInactivity) {
      this.activityTimer = setTimeout(() => {
        this.lock();
      }, this.config.inactivityTimeout);
    }

    // Set up auto-lock timer
    if (this.config.lockTimeout > 0) {
      this.lockTimer = setTimeout(() => {
        this.lock();
      }, this.config.lockTimeout);
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Destroy device lock manager
   */
  destroy(): void {
    this.stopActivityMonitoring();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let deviceLockManagerInstance: DeviceLockManager | null = null;

/**
 * Get or create device lock manager instance
 */
export function getDeviceLockManager(
  config?: Partial<DeviceLockConfig>,
): DeviceLockManager {
  if (!deviceLockManagerInstance) {
    deviceLockManagerInstance = new DeviceLockManager(config);
  }
  return deviceLockManagerInstance;
}

/**
 * Reset device lock manager instance
 */
export function resetDeviceLockManager(): void {
  if (deviceLockManagerInstance) {
    deviceLockManagerInstance.destroy();
  }
  deviceLockManagerInstance = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DeviceLockManager;
