/**
 * Registration Lock Service
 *
 * Provides a high-level service for managing registration locks, combining
 * the registration lock and recovery lock functionality into a unified
 * interface for use by API routes and components.
 *
 * Features:
 * - Unified lock management interface
 * - Server-side lock enforcement
 * - Database synchronization
 * - Notification integration
 * - Audit logging
 */

import { logger } from "@/lib/logger";
import {
  RegistrationLockManager,
  RegistrationLockConfig,
  RegistrationLockState,
  RegistrationLockStatus,
  PinValidationResult,
  LockAttempt,
  LockChangeEvent,
  getRegistrationLockManager,
  isValidPinFormat,
  checkPinStrength,
  generateRecoveryKey,
  isValidRecoveryKeyFormat,
} from "@/lib/auth/registration-lock";
import {
  RecoveryLockManager,
  RecoveryLockConfig,
  RecoveryLockState,
  RecoveryMethod,
  RecoveryRequest,
  RecoveryResult,
  TrustedContact,
  ContactResponse,
  getRecoveryLockManager,
} from "@/lib/auth/recovery-lock";

// ============================================================================
// Types
// ============================================================================

/**
 * Combined lock state
 */
export interface CombinedLockState {
  /** Registration lock state */
  registrationLock: RegistrationLockState;
  /** Recovery lock state */
  recoveryLock: RecoveryLockState;
  /** Whether re-registration is blocked */
  isBlocked: boolean;
  /** Block reason if blocked */
  blockReason: string | null;
  /** Recovery options available */
  recoveryOptionsAvailable: boolean;
}

/**
 * Lock setup options
 */
export interface LockSetupOptions {
  /** PIN to set */
  pin: string;
  /** Device ID */
  deviceId?: string;
  /** Enable device binding */
  enableDeviceBinding?: boolean;
  /** Set up trusted contacts */
  trustedContacts?: Array<{
    name: string;
    contactMethod: "email" | "phone";
    contactValue: string;
  }>;
  /** Enable time-delayed recovery */
  enableTimeDelayedRecovery?: boolean;
  /** Time delay in hours */
  timeDelayHours?: number;
}

/**
 * Lock setup result
 */
export interface LockSetupResult {
  /** Whether setup succeeded */
  success: boolean;
  /** Recovery key (only returned once) */
  recoveryKey: string | null;
  /** Trusted contact verification codes */
  trustedContactCodes: Array<{
    contactId: string;
    name: string;
    verificationCode: string;
  }>;
  /** Error message if failed */
  error: string | null;
}

/**
 * Lock verification options
 */
export interface LockVerificationOptions {
  /** PIN to verify */
  pin?: string;
  /** Recovery key to use */
  recoveryKey?: string;
  /** Device ID */
  deviceId?: string;
  /** IP address */
  ipAddress?: string;
}

/**
 * Lock verification result
 */
export interface LockVerificationResult {
  /** Whether verification succeeded */
  success: boolean;
  /** Method used for verification */
  method: "pin" | "recovery_key" | null;
  /** Error message if failed */
  error: string | null;
  /** Remaining PIN attempts */
  remainingAttempts: number;
  /** If locked out, when lockout expires */
  lockoutExpiresAt: Date | null;
  /** Available recovery methods if PIN fails */
  availableRecoveryMethods: RecoveryMethod[];
}

/**
 * Service configuration
 */
export interface RegistrationLockServiceConfig {
  /** Registration lock config */
  registrationLock?: Partial<RegistrationLockConfig>;
  /** Recovery lock config */
  recoveryLock?: Partial<RecoveryLockConfig>;
  /** Whether to sync with database */
  syncWithDatabase?: boolean;
  /** Whether to send notifications */
  sendNotifications?: boolean;
  /** Notification callback */
  onNotification?: (notification: LockNotification) => Promise<void>;
  /** Audit callback */
  onAuditEvent?: (event: AuditEvent) => Promise<void>;
}

/**
 * Lock notification
 */
export interface LockNotification {
  /** Notification type */
  type:
    | "lock_enabled"
    | "lock_disabled"
    | "pin_changed"
    | "lockout"
    | "recovery_initiated"
    | "recovery_completed";
  /** User ID */
  userId: string;
  /** Title */
  title: string;
  /** Message */
  message: string;
  /** Severity */
  severity: "info" | "warning" | "critical";
  /** Additional data */
  data: Record<string, unknown>;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Audit event
 */
export interface AuditEvent {
  /** Event type */
  type: string;
  /** User ID */
  userId: string;
  /** IP address */
  ipAddress: string | null;
  /** Device ID */
  deviceId: string | null;
  /** Success */
  success: boolean;
  /** Details */
  details: Record<string, unknown>;
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Registration Lock Service
// ============================================================================

/**
 * Service for managing registration locks
 */
export class RegistrationLockService {
  private static instance: RegistrationLockService;
  private registrationLockManager: RegistrationLockManager;
  private recoveryLockManager: RecoveryLockManager;
  private config: RegistrationLockServiceConfig;
  private userId: string | null = null;
  private initialized = false;

  private constructor(config: RegistrationLockServiceConfig = {}) {
    this.config = {
      syncWithDatabase: false,
      sendNotifications: true,
      ...config,
    };

    this.registrationLockManager = getRegistrationLockManager(
      config.registrationLock,
    );
    this.recoveryLockManager = getRecoveryLockManager(config.recoveryLock);
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(
    config?: RegistrationLockServiceConfig,
  ): RegistrationLockService {
    if (!RegistrationLockService.instance) {
      RegistrationLockService.instance = new RegistrationLockService(config);
    }
    return RegistrationLockService.instance;
  }

  /**
   * Resets the singleton (for testing)
   */
  static resetInstance(): void {
    RegistrationLockService.instance =
      undefined as unknown as RegistrationLockService;
    RegistrationLockManager.resetInstance();
    RecoveryLockManager.resetInstance();
  }

  /**
   * Initializes the service
   */
  async initialize(userId: string): Promise<void> {
    if (this.initialized && this.userId === userId) return;

    this.userId = userId;

    await this.registrationLockManager.initialize();
    await this.recoveryLockManager.initialize();

    this.initialized = true;

    logger.info("Registration lock service initialized", { userId });
  }

  /**
   * Gets the combined lock state
   */
  getCombinedState(): CombinedLockState {
    const regState = this.registrationLockManager.getState();
    const recState = this.recoveryLockManager.getState();

    const isBlocked = regState.enabled && regState.status === "active";
    let blockReason: string | null = null;

    if (isBlocked) {
      blockReason =
        "Registration lock is enabled. Please enter your PIN to continue.";
    } else if (regState.status === "locked_out") {
      blockReason = "Too many failed attempts. Account is temporarily locked.";
    } else if (regState.status === "expired") {
      blockReason = "Registration lock PIN has expired. Please set a new PIN.";
    }

    return {
      registrationLock: regState,
      recoveryLock: recState,
      isBlocked,
      blockReason,
      recoveryOptionsAvailable: recState.availableMethods.length > 0,
    };
  }

  /**
   * Sets up a registration lock
   */
  async setupLock(options: LockSetupOptions): Promise<LockSetupResult> {
    const trustedContactCodes: Array<{
      contactId: string;
      name: string;
      verificationCode: string;
    }> = [];

    // Enable the registration lock
    const result = await this.registrationLockManager.enableLock(
      options.pin,
      options.deviceId,
    );

    if (!result.success) {
      return {
        success: false,
        recoveryKey: null,
        trustedContactCodes: [],
        error: result.error,
      };
    }

    // Update config if needed
    if (options.enableDeviceBinding !== undefined) {
      this.registrationLockManager.updateConfig({
        deviceBinding: options.enableDeviceBinding,
      });
    }

    // Set up trusted contacts if provided
    if (options.trustedContacts && options.trustedContacts.length > 0) {
      for (const contact of options.trustedContacts) {
        const contactResult = await this.recoveryLockManager.addTrustedContact(
          contact.name,
          contact.contactMethod,
          contact.contactValue,
        );

        if (
          contactResult.success &&
          contactResult.contact &&
          contactResult.verificationCode
        ) {
          trustedContactCodes.push({
            contactId: contactResult.contact.id,
            name: contact.name,
            verificationCode: contactResult.verificationCode,
          });
        }
      }
    }

    // Update recovery config
    if (options.enableTimeDelayedRecovery !== undefined) {
      this.recoveryLockManager.updateConfig({
        enableTimeDelayedRecovery: options.enableTimeDelayedRecovery,
        timeDelayHours: options.timeDelayHours ?? 72,
      });
    }

    // Send notification
    await this.sendNotification({
      type: "lock_enabled",
      userId: this.userId ?? "unknown",
      title: "Registration Lock Enabled",
      message: "Your account is now protected with a registration lock.",
      severity: "info",
      data: {
        hasTrustedContacts: trustedContactCodes.length > 0,
        deviceBinding: options.enableDeviceBinding ?? false,
      },
      timestamp: new Date(),
    });

    // Audit event
    await this.auditEvent({
      type: "lock_enabled",
      userId: this.userId ?? "unknown",
      ipAddress: null,
      deviceId: options.deviceId ?? null,
      success: true,
      details: {
        hasTrustedContacts: trustedContactCodes.length > 0,
        deviceBinding: options.enableDeviceBinding ?? false,
      },
      timestamp: new Date(),
    });

    logger.info("Registration lock set up", {
      userId: this.userId,
      trustedContactCount: trustedContactCodes.length,
    });

    return {
      success: true,
      recoveryKey: result.recoveryKey,
      trustedContactCodes,
      error: null,
    };
  }

  /**
   * Verifies lock access (during re-registration)
   */
  async verifyLock(
    options: LockVerificationOptions,
  ): Promise<LockVerificationResult> {
    const state = this.registrationLockManager.getState();

    // If lock is not enabled, no verification needed
    if (!state.enabled) {
      return {
        success: true,
        method: null,
        error: null,
        remainingAttempts: 0,
        lockoutExpiresAt: null,
        availableRecoveryMethods: [],
      };
    }

    // Try recovery key first if provided
    if (options.recoveryKey) {
      if (!isValidRecoveryKeyFormat(options.recoveryKey)) {
        return {
          success: false,
          method: null,
          error: "Invalid recovery key format",
          remainingAttempts: state.failedAttempts,
          lockoutExpiresAt: state.lockedUntil,
          availableRecoveryMethods:
            this.recoveryLockManager.getState().availableMethods,
        };
      }

      const bypassResult =
        await this.registrationLockManager.bypassWithRecoveryKey(
          options.recoveryKey,
          options.deviceId,
        );

      if (bypassResult.success) {
        await this.auditEvent({
          type: "lock_bypassed",
          userId: this.userId ?? "unknown",
          ipAddress: options.ipAddress ?? null,
          deviceId: options.deviceId ?? null,
          success: true,
          details: { method: "recovery_key" },
          timestamp: new Date(),
        });

        return {
          success: true,
          method: "recovery_key",
          error: null,
          remainingAttempts: 0,
          lockoutExpiresAt: null,
          availableRecoveryMethods: [],
        };
      }

      return {
        success: false,
        method: null,
        error: bypassResult.error,
        remainingAttempts: 0,
        lockoutExpiresAt: null,
        availableRecoveryMethods:
          this.recoveryLockManager.getState().availableMethods,
      };
    }

    // Try PIN verification
    if (options.pin) {
      const pinResult = await this.registrationLockManager.verifyPin(
        options.pin,
        options.deviceId,
        options.ipAddress,
      );

      if (pinResult.valid) {
        await this.auditEvent({
          type: "lock_verified",
          userId: this.userId ?? "unknown",
          ipAddress: options.ipAddress ?? null,
          deviceId: options.deviceId ?? null,
          success: true,
          details: { method: "pin" },
          timestamp: new Date(),
        });

        return {
          success: true,
          method: "pin",
          error: null,
          remainingAttempts: pinResult.remainingAttempts,
          lockoutExpiresAt: null,
          availableRecoveryMethods: [],
        };
      }

      // Check for lockout
      if (pinResult.remainingAttempts === 0) {
        await this.sendNotification({
          type: "lockout",
          userId: this.userId ?? "unknown",
          title: "Account Locked",
          message:
            "Too many failed PIN attempts. Your account is temporarily locked.",
          severity: "critical",
          data: {
            lockoutExpiresAt: pinResult.lockoutExpiresAt?.toISOString(),
          },
          timestamp: new Date(),
        });
      }

      await this.auditEvent({
        type: "lock_verification_failed",
        userId: this.userId ?? "unknown",
        ipAddress: options.ipAddress ?? null,
        deviceId: options.deviceId ?? null,
        success: false,
        details: {
          remainingAttempts: pinResult.remainingAttempts,
          lockedOut: pinResult.remainingAttempts === 0,
        },
        timestamp: new Date(),
      });

      return {
        success: false,
        method: null,
        error: pinResult.error,
        remainingAttempts: pinResult.remainingAttempts,
        lockoutExpiresAt: pinResult.lockoutExpiresAt,
        availableRecoveryMethods:
          this.recoveryLockManager.getState().availableMethods,
      };
    }

    // No credentials provided
    return {
      success: false,
      method: null,
      error: "PIN or recovery key required",
      remainingAttempts:
        this.registrationLockManager.getConfig().maxFailedAttempts -
        state.failedAttempts,
      lockoutExpiresAt: state.lockedUntil,
      availableRecoveryMethods:
        this.recoveryLockManager.getState().availableMethods,
    };
  }

  /**
   * Changes the PIN
   */
  async changePin(
    currentPin: string,
    newPin: string,
    deviceId?: string,
  ): Promise<{ success: boolean; error: string | null }> {
    const result = await this.registrationLockManager.changePin(
      currentPin,
      newPin,
      deviceId,
    );

    if (result.success) {
      await this.sendNotification({
        type: "pin_changed",
        userId: this.userId ?? "unknown",
        title: "PIN Changed",
        message: "Your registration lock PIN has been changed.",
        severity: "info",
        data: {},
        timestamp: new Date(),
      });

      await this.auditEvent({
        type: "pin_changed",
        userId: this.userId ?? "unknown",
        ipAddress: null,
        deviceId: deviceId ?? null,
        success: true,
        details: {},
        timestamp: new Date(),
      });
    }

    return result;
  }

  /**
   * Disables the lock
   */
  async disableLock(
    pin: string,
    deviceId?: string,
  ): Promise<{ success: boolean; error: string | null }> {
    const result = await this.registrationLockManager.disableLock(
      pin,
      deviceId,
    );

    if (result.success) {
      await this.sendNotification({
        type: "lock_disabled",
        userId: this.userId ?? "unknown",
        title: "Registration Lock Disabled",
        message: "Your registration lock has been disabled.",
        severity: "warning",
        data: {},
        timestamp: new Date(),
      });

      await this.auditEvent({
        type: "lock_disabled",
        userId: this.userId ?? "unknown",
        ipAddress: null,
        deviceId: deviceId ?? null,
        success: true,
        details: {},
        timestamp: new Date(),
      });
    }

    return result;
  }

  /**
   * Initiates a recovery request
   */
  async initiateRecovery(
    method: RecoveryMethod,
    deviceId?: string,
    ipAddress?: string,
  ): Promise<RecoveryResult> {
    const result = await this.recoveryLockManager.initiateRecoveryRequest(
      method,
      deviceId,
      ipAddress,
    );

    if (result.success) {
      await this.sendNotification({
        type: "recovery_initiated",
        userId: this.userId ?? "unknown",
        title: "Recovery Request Initiated",
        message: `A recovery request has been started using ${method.replace("_", " ")}.`,
        severity: "warning",
        data: {
          method,
          canCompleteAt: result.canCompleteAt?.toISOString(),
        },
        timestamp: new Date(),
      });

      await this.auditEvent({
        type: "recovery_initiated",
        userId: this.userId ?? "unknown",
        ipAddress: ipAddress ?? null,
        deviceId: deviceId ?? null,
        success: true,
        details: { method },
        timestamp: new Date(),
      });
    }

    return result;
  }

  /**
   * Completes a recovery request
   */
  async completeRecovery(
    requestId: string,
    completionToken: string,
  ): Promise<{ success: boolean; error: string | null }> {
    const result = await this.recoveryLockManager.completeRecovery(
      requestId,
      completionToken,
    );

    if (result.success) {
      // Disable the registration lock
      const regState = this.registrationLockManager.getState();
      if (regState.enabled) {
        // Clear the lock state
        await this.registrationLockManager.clearAll();
      }

      await this.sendNotification({
        type: "recovery_completed",
        userId: this.userId ?? "unknown",
        title: "Recovery Completed",
        message:
          "Your account has been recovered. Please set up a new registration lock.",
        severity: "info",
        data: { requestId },
        timestamp: new Date(),
      });

      await this.auditEvent({
        type: "recovery_completed",
        userId: this.userId ?? "unknown",
        ipAddress: null,
        deviceId: null,
        success: true,
        details: { requestId },
        timestamp: new Date(),
      });
    }

    return result;
  }

  // ============================================================================
  // Trusted Contacts
  // ============================================================================

  /**
   * Adds a trusted contact
   */
  async addTrustedContact(
    name: string,
    contactMethod: "email" | "phone",
    contactValue: string,
  ): Promise<{
    success: boolean;
    contact: TrustedContact | null;
    verificationCode: string | null;
    error: string | null;
  }> {
    return this.recoveryLockManager.addTrustedContact(
      name,
      contactMethod,
      contactValue,
    );
  }

  /**
   * Verifies a trusted contact
   */
  async verifyTrustedContact(
    contactId: string,
    verificationCode: string,
  ): Promise<{ success: boolean; error: string | null }> {
    return this.recoveryLockManager.verifyTrustedContact(
      contactId,
      verificationCode,
    );
  }

  /**
   * Removes a trusted contact
   */
  async removeTrustedContact(
    contactId: string,
  ): Promise<{ success: boolean; error: string | null }> {
    return this.recoveryLockManager.removeTrustedContact(contactId);
  }

  /**
   * Gets all trusted contacts
   */
  getTrustedContacts(): TrustedContact[] {
    return this.recoveryLockManager.getState().trustedContacts;
  }

  /**
   * Records a contact's response to a recovery request
   */
  async recordContactResponse(
    requestId: string,
    contactId: string,
    approved: boolean,
    message?: string,
  ): Promise<RecoveryResult> {
    return this.recoveryLockManager.recordContactResponse(
      requestId,
      contactId,
      approved,
      message,
    );
  }

  // ============================================================================
  // Device Management
  // ============================================================================

  /**
   * Adds a bound device
   */
  async addBoundDevice(
    deviceId: string,
    pin: string,
  ): Promise<{ success: boolean; error: string | null }> {
    return this.registrationLockManager.addBoundDevice(deviceId, pin);
  }

  /**
   * Removes a bound device
   */
  async removeBoundDevice(
    deviceId: string,
    pin: string,
  ): Promise<{ success: boolean; error: string | null }> {
    return this.registrationLockManager.removeBoundDevice(deviceId, pin);
  }

  /**
   * Gets bound devices
   */
  getBoundDevices(): string[] {
    return this.registrationLockManager.getState().boundDevices;
  }

  // ============================================================================
  // Recovery Requests
  // ============================================================================

  /**
   * Gets a recovery request
   */
  getRecoveryRequest(requestId: string): RecoveryRequest | null {
    return this.recoveryLockManager.getRequest(requestId);
  }

  /**
   * Gets active recovery requests
   */
  getActiveRecoveryRequests(): RecoveryRequest[] {
    return this.recoveryLockManager.getState().activeRequests;
  }

  /**
   * Checks if time-delayed recovery is ready
   */
  async checkTimeDelayedRecovery(requestId: string): Promise<RecoveryResult> {
    return this.recoveryLockManager.checkTimeDelayedRecovery(requestId);
  }

  /**
   * Cancels a recovery request
   */
  async cancelRecoveryRequest(
    requestId: string,
  ): Promise<{ success: boolean; error: string | null }> {
    return this.recoveryLockManager.cancelRecoveryRequest(requestId);
  }

  /**
   * Verifies identity for a recovery request
   */
  async verifyIdentity(
    requestId: string,
    verificationData: {
      provider: string;
      verified: boolean;
      userId?: string;
      verifiedAt?: Date;
    },
  ): Promise<RecoveryResult> {
    return this.recoveryLockManager.verifyIdentity(requestId, verificationData);
  }

  // ============================================================================
  // History and Auditing
  // ============================================================================

  /**
   * Gets lock attempts
   */
  getLockAttempts(limit?: number): LockAttempt[] {
    return this.registrationLockManager.getAttempts(limit);
  }

  /**
   * Gets lock events
   */
  getLockEvents(limit?: number): LockChangeEvent[] {
    return this.registrationLockManager.getEvents(limit);
  }

  /**
   * Gets recovery request history
   */
  getRecoveryHistory(): RecoveryRequest[] {
    return this.recoveryLockManager.getState().requestHistory;
  }

  /**
   * Gets contact responses for a request
   */
  getContactResponses(requestId: string): ContactResponse[] {
    return this.recoveryLockManager.getContactResponses(requestId);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Checks if registration should be blocked
   */
  shouldBlockRegistration(): boolean {
    const state = this.registrationLockManager.getState();
    return state.enabled && state.status === "active";
  }

  /**
   * Checks if re-verification is needed
   */
  needsReverification(): boolean {
    return this.registrationLockManager.needsReverification();
  }

  /**
   * Validates a PIN format
   */
  validatePinFormat(pin: string): { valid: boolean; error: string | null } {
    const config = this.registrationLockManager.getConfig();
    if (!isValidPinFormat(pin, config)) {
      return {
        valid: false,
        error: `PIN must be ${config.minPinLength}-${config.maxPinLength} digits`,
      };
    }
    return { valid: true, error: null };
  }

  /**
   * Checks PIN strength
   */
  checkPinStrength(pin: string): { score: number; feedback: string[] } {
    return checkPinStrength(pin);
  }

  /**
   * Generates a new recovery key
   */
  generateNewRecoveryKey(): string {
    return generateRecoveryKey();
  }

  /**
   * Clears all lock data
   */
  async clearAllData(): Promise<void> {
    await this.registrationLockManager.clearAll();
    await this.recoveryLockManager.clearAll();

    logger.warn("All registration lock data cleared", { userId: this.userId });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Sends a notification
   */
  private async sendNotification(
    notification: LockNotification,
  ): Promise<void> {
    if (!this.config.sendNotifications) return;

    if (this.config.onNotification) {
      try {
        await this.config.onNotification(notification);
      } catch (error) {
        logger.error("Failed to send lock notification", {
          error,
          notification,
        });
      }
    }

    logger.info("Lock notification", {
      type: notification.type,
      userId: notification.userId,
      severity: notification.severity,
    });
  }

  /**
   * Records an audit event
   */
  private async auditEvent(event: AuditEvent): Promise<void> {
    if (this.config.onAuditEvent) {
      try {
        await this.config.onAuditEvent(event);
      } catch (error) {
        logger.error("Failed to record audit event", { error, event });
      }
    }

    logger.info("Lock audit event", {
      type: event.type,
      userId: event.userId,
      success: event.success,
    });
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Gets the global registration lock service instance
 */
export function getRegistrationLockService(
  config?: RegistrationLockServiceConfig,
): RegistrationLockService {
  return RegistrationLockService.getInstance(config);
}

/**
 * Initializes the registration lock service
 */
export async function initializeRegistrationLockService(
  userId: string,
): Promise<void> {
  const service = getRegistrationLockService();
  await service.initialize(userId);
}

/**
 * Checks if a user's registration should be blocked
 */
export function shouldBlockUserRegistration(): boolean {
  const service = getRegistrationLockService();
  return service.shouldBlockRegistration();
}

/**
 * Verifies lock access for re-registration
 */
export async function verifyRegistrationLock(
  options: LockVerificationOptions,
): Promise<LockVerificationResult> {
  const service = getRegistrationLockService();
  return service.verifyLock(options);
}
