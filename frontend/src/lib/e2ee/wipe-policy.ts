/**
 * Wipe and Lockout Policy Implementation
 * Handles device wipe, remote wipe, and lockout enforcement
 */

import { getEncryptedStorage } from "./encrypted-storage";
import { getDeviceLockManager } from "./device-lock";
import { crypto } from "./crypto";

// ============================================================================
// TYPES
// ============================================================================

export interface WipePolicy {
  enabled: boolean;
  wipeOnMaxFailedAttempts: boolean;
  maxFailedAttempts: number;
  wipeOnRemoteCommand: boolean;
  wipeOnFactoryReset: boolean;
  preserveMediaOnWipe: boolean;
}

export interface LockoutPolicy {
  enabled: boolean;
  maxFailedAttempts: number;
  lockoutDuration: number; // milliseconds
  escalatingLockout: boolean; // double lockout time on each violation
}

export interface WipeEvent {
  timestamp: number;
  reason:
    | "max_attempts"
    | "remote_command"
    | "user_initiated"
    | "factory_reset";
  deviceId?: string;
  userId?: string;
}

export interface RemoteWipeRequest {
  deviceId: string;
  timestamp: number;
  signature: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WIPE_LOG_KEY = "nchat_wipe_log";
const WIPE_POLICY_KEY = "nchat_wipe_policy";
const LOCKOUT_POLICY_KEY = "nchat_lockout_policy";

const DEFAULT_WIPE_POLICY: WipePolicy = {
  enabled: true,
  wipeOnMaxFailedAttempts: false, // Disabled by default for safety
  maxFailedAttempts: 10,
  wipeOnRemoteCommand: true,
  wipeOnFactoryReset: true,
  preserveMediaOnWipe: false,
};

const DEFAULT_LOCKOUT_POLICY: LockoutPolicy = {
  enabled: true,
  maxFailedAttempts: 5,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes
  escalatingLockout: true,
};

// ============================================================================
// WIPE MANAGER
// ============================================================================

export class WipeManager {
  private wipePolicy: WipePolicy;
  private lockoutPolicy: LockoutPolicy;
  private failedAttempts: number = 0;
  private lockoutCount: number = 0;

  constructor() {
    this.wipePolicy = this.loadWipePolicy();
    this.lockoutPolicy = this.loadLockoutPolicy();
    this.loadFailedAttempts();
  }

  // ==========================================================================
  // POLICY MANAGEMENT
  // ==========================================================================

  /**
   * Update wipe policy
   */
  updateWipePolicy(policy: Partial<WipePolicy>): void {
    this.wipePolicy = { ...this.wipePolicy, ...policy };
    this.saveWipePolicy();
  }

  /**
   * Get wipe policy
   */
  getWipePolicy(): WipePolicy {
    return { ...this.wipePolicy };
  }

  /**
   * Update lockout policy
   */
  updateLockoutPolicy(policy: Partial<LockoutPolicy>): void {
    this.lockoutPolicy = { ...this.lockoutPolicy, ...policy };
    this.saveLockoutPolicy();
  }

  /**
   * Get lockout policy
   */
  getLockoutPolicy(): LockoutPolicy {
    return { ...this.lockoutPolicy };
  }

  /**
   * Save wipe policy
   */
  private saveWipePolicy(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(WIPE_POLICY_KEY, JSON.stringify(this.wipePolicy));
    }
  }

  /**
   * Load wipe policy
   */
  private loadWipePolicy(): WipePolicy {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(WIPE_POLICY_KEY);
      if (stored) {
        return { ...DEFAULT_WIPE_POLICY, ...JSON.parse(stored) };
      }
    }
    return DEFAULT_WIPE_POLICY;
  }

  /**
   * Save lockout policy
   */
  private saveLockoutPolicy(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        LOCKOUT_POLICY_KEY,
        JSON.stringify(this.lockoutPolicy),
      );
    }
  }

  /**
   * Load lockout policy
   */
  private loadLockoutPolicy(): LockoutPolicy {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCKOUT_POLICY_KEY);
      if (stored) {
        return { ...DEFAULT_LOCKOUT_POLICY, ...JSON.parse(stored) };
      }
    }
    return DEFAULT_LOCKOUT_POLICY;
  }

  // ==========================================================================
  // FAILED ATTEMPTS TRACKING
  // ==========================================================================

  /**
   * Record failed authentication attempt
   */
  recordFailedAttempt(): void {
    this.failedAttempts++;
    this.saveFailedAttempts();

    // Check if wipe threshold reached
    if (
      this.wipePolicy.enabled &&
      this.wipePolicy.wipeOnMaxFailedAttempts &&
      this.failedAttempts >= this.wipePolicy.maxFailedAttempts
    ) {
      this.executeWipe("max_attempts");
      return;
    }

    // Check if lockout threshold reached
    if (
      this.lockoutPolicy.enabled &&
      this.failedAttempts >= this.lockoutPolicy.maxFailedAttempts
    ) {
      this.lockoutCount++;
      const lockoutDuration = this.calculateLockoutDuration();
      this.enforceLockout(lockoutDuration);
    }
  }

  /**
   * Reset failed attempts counter
   */
  resetFailedAttempts(): void {
    this.failedAttempts = 0;
    this.saveFailedAttempts();
  }

  /**
   * Get current failed attempts count
   */
  getFailedAttempts(): number {
    return this.failedAttempts;
  }

  /**
   * Save failed attempts
   */
  private saveFailedAttempts(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "nchat_failed_attempts",
        this.failedAttempts.toString(),
      );
      localStorage.setItem("nchat_lockout_count", this.lockoutCount.toString());
    }
  }

  /**
   * Load failed attempts
   */
  private loadFailedAttempts(): void {
    if (typeof window !== "undefined") {
      const attempts = localStorage.getItem("nchat_failed_attempts");
      const lockouts = localStorage.getItem("nchat_lockout_count");

      this.failedAttempts = attempts ? parseInt(attempts, 10) : 0;
      this.lockoutCount = lockouts ? parseInt(lockouts, 10) : 0;
    }
  }

  /**
   * Calculate lockout duration with escalation
   */
  private calculateLockoutDuration(): number {
    if (!this.lockoutPolicy.escalatingLockout) {
      return this.lockoutPolicy.lockoutDuration;
    }

    // Double the lockout duration for each violation
    return (
      this.lockoutPolicy.lockoutDuration * Math.pow(2, this.lockoutCount - 1)
    );
  }

  /**
   * Enforce lockout
   */
  private enforceLockout(duration: number): void {
    const deviceLockManager = getDeviceLockManager();
    deviceLockManager.lock();

    // Schedule unlock
    setTimeout(() => {
      this.resetFailedAttempts();
    }, duration);
  }

  // ==========================================================================
  // DEVICE WIPE
  // ==========================================================================

  /**
   * Execute device wipe
   */
  async executeWipe(
    reason: WipeEvent["reason"],
    deviceId?: string,
    userId?: string,
  ): Promise<void> {
    // Log wipe event
    const wipeEvent: WipeEvent = {
      timestamp: Date.now(),
      reason,
      deviceId,
      userId,
    };
    this.logWipeEvent(wipeEvent);

    try {
      // 1. Clear encrypted storage
      const encryptedStorage = getEncryptedStorage();
      await encryptedStorage.wipeAll();

      // 2. Clear device lock data
      if (typeof window !== "undefined") {
        localStorage.removeItem("nchat_device_lock");
        localStorage.removeItem("nchat_device_lock_config");
        localStorage.removeItem("nchat_device_pin");
        localStorage.removeItem("nchat_device_lock_biometric");
      }

      // 3. Clear E2EE keys
      if (typeof window !== "undefined") {
        localStorage.removeItem("e2ee_device_id");
        sessionStorage.removeItem("e2ee_recovery_code");
      }

      // 4. Clear authentication tokens
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");
        sessionStorage.clear();
      }

      // 5. Clear app configuration (optional)
      if (
        typeof window !== "undefined" &&
        !this.wipePolicy.preserveMediaOnWipe
      ) {
        localStorage.removeItem("app-config");

        // Clear IndexedDB databases
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }

        // Clear cache storage
        if ("caches" in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
          }
        }
      }

      // 6. Redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/auth/signin?wiped=true";
      }
    } catch (error) {
      console.error("Wipe failed:", error);
      throw error;
    }
  }

  /**
   * Execute partial wipe (E2EE data only)
   */
  async executePartialWipe(): Promise<void> {
    const encryptedStorage = getEncryptedStorage();
    await encryptedStorage.wipeAll();

    if (typeof window !== "undefined") {
      localStorage.removeItem("e2ee_device_id");
      sessionStorage.removeItem("e2ee_recovery_code");
    }
  }

  /**
   * Check if wipe was executed
   */
  wasDeviceWiped(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    const wipeLog = localStorage.getItem(WIPE_LOG_KEY);
    if (!wipeLog) {
      return false;
    }

    const events: WipeEvent[] = JSON.parse(wipeLog);
    return events.length > 0;
  }

  /**
   * Log wipe event
   */
  private logWipeEvent(event: WipeEvent): void {
    if (typeof window === "undefined") {
      return;
    }

    const existing = localStorage.getItem(WIPE_LOG_KEY);
    const events: WipeEvent[] = existing ? JSON.parse(existing) : [];

    events.push(event);

    // Keep last 10 wipe events
    if (events.length > 10) {
      events.shift();
    }

    localStorage.setItem(WIPE_LOG_KEY, JSON.stringify(events));
  }

  /**
   * Get wipe event log
   */
  getWipeLog(): WipeEvent[] {
    if (typeof window === "undefined") {
      return [];
    }

    const stored = localStorage.getItem(WIPE_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // ==========================================================================
  // REMOTE WIPE
  // ==========================================================================

  /**
   * Request remote wipe from server
   */
  async requestRemoteWipe(deviceId: string, userId: string): Promise<void> {
    try {
      const response = await fetch("/api/e2ee/device-lock/wipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          deviceId,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to request remote wipe");
      }
    } catch (error) {
      console.error("Remote wipe request failed:", error);
      throw error;
    }
  }

  /**
   * Check for pending remote wipe
   */
  async checkRemoteWipe(deviceId: string): Promise<boolean> {
    try {
      const response = await fetch("/api/e2ee/device-lock/wipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          deviceId,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      if (data.wipeRequested) {
        // Execute wipe
        await this.executeWipe("remote_command", deviceId);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Remote wipe check failed:", error);
      return false;
    }
  }

  /**
   * Verify remote wipe signature
   * Note: Signature verification requires fetching the user's public key from the server
   * and verifying the request signature using Web Crypto API's crypto.subtle.verify()
   */
  private async verifyRemoteWipeSignature(
    _request: RemoteWipeRequest,
  ): Promise<boolean> {
    // Signature verification is bypassed until public key distribution is implemented
    // For production, implement ECDSA signature verification
    return true;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let wipeManagerInstance: WipeManager | null = null;

/**
 * Get or create wipe manager instance
 */
export function getWipeManager(): WipeManager {
  if (!wipeManagerInstance) {
    wipeManagerInstance = new WipeManager();
  }
  return wipeManagerInstance;
}

/**
 * Reset wipe manager instance
 */
export function resetWipeManager(): void {
  wipeManagerInstance = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default WipeManager;
