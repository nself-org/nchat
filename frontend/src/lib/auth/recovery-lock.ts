/**
 * Recovery Lock - Account recovery mechanisms for registration lock bypass
 *
 * Provides multiple recovery mechanisms when a user cannot access their
 * registration lock PIN, including recovery keys, trusted contacts,
 * identity verification, and time-delayed recovery.
 *
 * Features:
 * - Recovery key (primary bypass method)
 * - Trusted contact recovery (social recovery)
 * - Time-delayed recovery (waiting period)
 * - Identity verification recovery
 * - Recovery audit trail
 * - Recovery rate limiting
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Recovery method types
 */
export type RecoveryMethod =
  | "recovery_key" // Pre-generated recovery key
  | "trusted_contacts" // Social recovery through trusted contacts
  | "time_delayed" // Wait a period then recover
  | "identity_verification" // Verify identity through ID.me or similar
  | "support_ticket"; // Manual recovery through support

/**
 * Recovery request status
 */
export type RecoveryRequestStatus =
  | "pending" // Request submitted, waiting
  | "in_progress" // Recovery in progress
  | "waiting_contacts" // Waiting for trusted contacts to respond
  | "waiting_period" // In time-delayed waiting period
  | "verification_required" // Identity verification needed
  | "approved" // Request approved
  | "completed" // Recovery completed
  | "rejected" // Request rejected
  | "expired" // Request expired
  | "cancelled"; // Request cancelled by user

/**
 * Trusted contact for social recovery
 */
export interface TrustedContact {
  /** Contact ID */
  id: string;
  /** Display name */
  name: string;
  /** Contact method (email or phone) */
  contactMethod: "email" | "phone";
  /** Contact value */
  contactValue: string;
  /** Hashed verification code */
  verificationCodeHash: string | null;
  /** Whether contact has been verified */
  verified: boolean;
  /** When contact was added */
  addedAt: Date;
  /** When contact last responded */
  lastRespondedAt: Date | null;
}

/**
 * Recovery request
 */
export interface RecoveryRequest {
  /** Request ID */
  id: string;
  /** Recovery method */
  method: RecoveryMethod;
  /** Current status */
  status: RecoveryRequestStatus;
  /** When request was created */
  createdAt: Date;
  /** When request expires */
  expiresAt: Date;
  /** When status was last updated */
  updatedAt: Date;
  /** When recovery can be completed (for time-delayed) */
  canCompleteAt: Date | null;
  /** Number of contacts who approved (for social recovery) */
  contactsApproved: number;
  /** Required approvals */
  requiredApprovals: number;
  /** Identity verification status */
  identityVerified: boolean;
  /** Reason for rejection (if rejected) */
  rejectionReason: string | null;
  /** IP address that initiated request */
  ipAddress: string | null;
  /** Device ID that initiated request */
  deviceId: string | null;
  /** Verification token for completing recovery */
  completionToken: string | null;
}

/**
 * Contact response to recovery request
 */
export interface ContactResponse {
  /** Contact ID */
  contactId: string;
  /** Whether they approved */
  approved: boolean;
  /** When they responded */
  respondedAt: Date;
  /** Optional message */
  message: string | null;
}

/**
 * Recovery configuration
 */
export interface RecoveryLockConfig {
  /** Whether recovery key is required */
  requireRecoveryKey: boolean;
  /** Whether trusted contacts recovery is enabled */
  enableTrustedContacts: boolean;
  /** Minimum trusted contacts required */
  minTrustedContacts: number;
  /** Approval threshold (e.g., 2 of 3 contacts) */
  approvalThreshold: number;
  /** Whether time-delayed recovery is enabled */
  enableTimeDelayedRecovery: boolean;
  /** Time delay in hours */
  timeDelayHours: number;
  /** Whether identity verification is available */
  enableIdentityVerification: boolean;
  /** Recovery request expiration in hours */
  requestExpirationHours: number;
  /** Maximum active recovery requests */
  maxActiveRequests: number;
  /** Cooldown between requests in hours */
  requestCooldownHours: number;
  /** Whether to notify on recovery attempts */
  notifyOnRecoveryAttempt: boolean;
}

/**
 * Recovery state
 */
export interface RecoveryLockState {
  /** Whether recovery is set up */
  isSetUp: boolean;
  /** Available recovery methods */
  availableMethods: RecoveryMethod[];
  /** Trusted contacts */
  trustedContacts: TrustedContact[];
  /** Active recovery requests */
  activeRequests: RecoveryRequest[];
  /** Recovery request history */
  requestHistory: RecoveryRequest[];
  /** Contact responses */
  contactResponses: Map<string, ContactResponse[]>;
  /** Last recovery attempt */
  lastRecoveryAttempt: Date | null;
  /** Successful recoveries count */
  successfulRecoveries: number;
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  /** Whether recovery succeeded */
  success: boolean;
  /** New status if changed */
  newStatus: RecoveryRequestStatus | null;
  /** Error message if failed */
  error: string | null;
  /** When recovery can be completed */
  canCompleteAt: Date | null;
  /** Completion token if approved */
  completionToken: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: RecoveryLockConfig = {
  requireRecoveryKey: true,
  enableTrustedContacts: true,
  minTrustedContacts: 2,
  approvalThreshold: 2,
  enableTimeDelayedRecovery: true,
  timeDelayHours: 72, // 3 days
  enableIdentityVerification: false,
  requestExpirationHours: 168, // 7 days
  maxActiveRequests: 3,
  requestCooldownHours: 24,
  notifyOnRecoveryAttempt: true,
};

const STORAGE_PREFIX = "nchat_recovery_lock_";
const STATE_STORAGE_KEY = `${STORAGE_PREFIX}state`;
const CONTACTS_STORAGE_KEY = `${STORAGE_PREFIX}contacts`;
const REQUESTS_STORAGE_KEY = `${STORAGE_PREFIX}requests`;
const RESPONSES_STORAGE_KEY = `${STORAGE_PREFIX}responses`;

const VERIFICATION_CODE_LENGTH = 6;
const COMPLETION_TOKEN_LENGTH = 32;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

/**
 * Converts bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a random ID
 */
function generateId(): string {
  return bytesToHex(generateRandomBytes(16));
}

/**
 * Generates a verification code
 */
export function generateVerificationCode(): string {
  const bytes = generateRandomBytes(VERIFICATION_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < VERIFICATION_CODE_LENGTH; i++) {
    code += (bytes[i] % 10).toString();
  }
  return code;
}

/**
 * Generates a completion token
 */
export function generateCompletionToken(): string {
  return bytesToHex(generateRandomBytes(COMPLETION_TOKEN_LENGTH));
}

/**
 * Hashes a verification code
 */
export async function hashVerificationCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifies a code against its hash
 */
export async function verifyCode(code: string, hash: string): Promise<boolean> {
  const computedHash = await hashVerificationCode(code);
  return computedHash === hash;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates phone format (E.164)
 */
export function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/**
 * Masks an email for display
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Masks a phone number for display
 */
export function maskPhone(phone: string): string {
  if (phone.length < 4) return "***";
  return `***${phone.slice(-4)}`;
}

// ============================================================================
// Recovery Lock Manager
// ============================================================================

/**
 * Manages recovery lock operations
 */
export class RecoveryLockManager {
  private static instance: RecoveryLockManager;
  private config: RecoveryLockConfig;
  private trustedContacts: TrustedContact[] = [];
  private activeRequests: RecoveryRequest[] = [];
  private requestHistory: RecoveryRequest[] = [];
  private contactResponses: Map<string, ContactResponse[]> = new Map();
  private lastRecoveryAttempt: Date | null = null;
  private successfulRecoveries = 0;
  private initialized = false;

  private constructor(config: Partial<RecoveryLockConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(
    config?: Partial<RecoveryLockConfig>,
  ): RecoveryLockManager {
    if (!RecoveryLockManager.instance) {
      RecoveryLockManager.instance = new RecoveryLockManager(config);
    }
    return RecoveryLockManager.instance;
  }

  /**
   * Resets the singleton (for testing)
   */
  static resetInstance(): void {
    RecoveryLockManager.instance = undefined as unknown as RecoveryLockManager;
  }

  /**
   * Initializes the manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadFromStorage();
    this.cleanupExpiredRequests();
    this.initialized = true;

    logger.info("Recovery lock manager initialized", {
      trustedContacts: this.trustedContacts.length,
      activeRequests: this.activeRequests.length,
    });
  }

  /**
   * Gets the current state
   */
  getState(): RecoveryLockState {
    this.cleanupExpiredRequests();

    const availableMethods: RecoveryMethod[] = [];

    if (this.config.requireRecoveryKey) {
      availableMethods.push("recovery_key");
    }

    if (
      this.config.enableTrustedContacts &&
      this.getVerifiedContacts().length >= this.config.minTrustedContacts
    ) {
      availableMethods.push("trusted_contacts");
    }

    if (this.config.enableTimeDelayedRecovery) {
      availableMethods.push("time_delayed");
    }

    if (this.config.enableIdentityVerification) {
      availableMethods.push("identity_verification");
    }

    return {
      isSetUp: availableMethods.length > 0,
      availableMethods,
      trustedContacts: [...this.trustedContacts],
      activeRequests: [...this.activeRequests],
      requestHistory: [...this.requestHistory],
      contactResponses: new Map(this.contactResponses),
      lastRecoveryAttempt: this.lastRecoveryAttempt,
      successfulRecoveries: this.successfulRecoveries,
    };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): RecoveryLockConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration
   */
  updateConfig(updates: Partial<RecoveryLockConfig>): void {
    this.config = { ...this.config, ...updates };
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
    // Validate contact
    if (contactMethod === "email" && !isValidEmail(contactValue)) {
      return {
        success: false,
        contact: null,
        verificationCode: null,
        error: "Invalid email address",
      };
    }

    if (contactMethod === "phone" && !isValidPhone(contactValue)) {
      return {
        success: false,
        contact: null,
        verificationCode: null,
        error: "Invalid phone number",
      };
    }

    // Check for duplicates
    const exists = this.trustedContacts.some(
      (c) =>
        c.contactValue === contactValue && c.contactMethod === contactMethod,
    );
    if (exists) {
      return {
        success: false,
        contact: null,
        verificationCode: null,
        error: "Contact already exists",
      };
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationCodeHash = await hashVerificationCode(verificationCode);

    const contact: TrustedContact = {
      id: generateId(),
      name,
      contactMethod,
      contactValue,
      verificationCodeHash,
      verified: false,
      addedAt: new Date(),
      lastRespondedAt: null,
    };

    this.trustedContacts.push(contact);
    await this.saveToStorage();

    logger.info("Trusted contact added", {
      contactId: contact.id,
      contactMethod,
      maskedValue:
        contactMethod === "email"
          ? maskEmail(contactValue)
          : maskPhone(contactValue),
    });

    return {
      success: true,
      contact,
      verificationCode, // Only returned once, user must send to contact
      error: null,
    };
  }

  /**
   * Verifies a trusted contact
   */
  async verifyTrustedContact(
    contactId: string,
    verificationCode: string,
  ): Promise<{ success: boolean; error: string | null }> {
    const contact = this.trustedContacts.find((c) => c.id === contactId);

    if (!contact) {
      return { success: false, error: "Contact not found" };
    }

    if (contact.verified) {
      return { success: false, error: "Contact already verified" };
    }

    if (!contact.verificationCodeHash) {
      return { success: false, error: "No verification code set" };
    }

    const isValid = await verifyCode(
      verificationCode,
      contact.verificationCodeHash,
    );

    if (!isValid) {
      return { success: false, error: "Invalid verification code" };
    }

    contact.verified = true;
    contact.verificationCodeHash = null;
    await this.saveToStorage();

    logger.info("Trusted contact verified", { contactId });

    return { success: true, error: null };
  }

  /**
   * Removes a trusted contact
   */
  async removeTrustedContact(
    contactId: string,
  ): Promise<{ success: boolean; error: string | null }> {
    const index = this.trustedContacts.findIndex((c) => c.id === contactId);

    if (index === -1) {
      return { success: false, error: "Contact not found" };
    }

    this.trustedContacts.splice(index, 1);
    await this.saveToStorage();

    logger.info("Trusted contact removed", { contactId });

    return { success: true, error: null };
  }

  /**
   * Gets verified contacts
   */
  getVerifiedContacts(): TrustedContact[] {
    return this.trustedContacts.filter((c) => c.verified);
  }

  /**
   * Regenerates verification code for a contact
   */
  async regenerateVerificationCode(contactId: string): Promise<{
    success: boolean;
    verificationCode: string | null;
    error: string | null;
  }> {
    const contact = this.trustedContacts.find((c) => c.id === contactId);

    if (!contact) {
      return {
        success: false,
        verificationCode: null,
        error: "Contact not found",
      };
    }

    if (contact.verified) {
      return {
        success: false,
        verificationCode: null,
        error: "Contact already verified",
      };
    }

    const verificationCode = generateVerificationCode();
    contact.verificationCodeHash = await hashVerificationCode(verificationCode);
    await this.saveToStorage();

    return { success: true, verificationCode, error: null };
  }

  // ============================================================================
  // Recovery Requests
  // ============================================================================

  /**
   * Initiates a recovery request
   */
  async initiateRecoveryRequest(
    method: RecoveryMethod,
    deviceId?: string,
    ipAddress?: string,
  ): Promise<RecoveryResult> {
    // Check cooldown
    if (this.lastRecoveryAttempt) {
      const hoursSinceLastAttempt =
        (Date.now() - this.lastRecoveryAttempt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastAttempt < this.config.requestCooldownHours) {
        const waitHours = Math.ceil(
          this.config.requestCooldownHours - hoursSinceLastAttempt,
        );
        return {
          success: false,
          newStatus: null,
          error: `Please wait ${waitHours} hour(s) before trying again`,
          canCompleteAt: null,
          completionToken: null,
        };
      }
    }

    // Check max active requests
    if (this.activeRequests.length >= this.config.maxActiveRequests) {
      return {
        success: false,
        newStatus: null,
        error: "Maximum active recovery requests reached",
        canCompleteAt: null,
        completionToken: null,
      };
    }

    // Validate method is available
    const state = this.getState();
    if (!state.availableMethods.includes(method)) {
      return {
        success: false,
        newStatus: null,
        error: `Recovery method '${method}' is not available`,
        canCompleteAt: null,
        completionToken: null,
      };
    }

    // Create request
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.config.requestExpirationHours * 60 * 60 * 1000,
    );

    let canCompleteAt: Date | null = null;
    let status: RecoveryRequestStatus = "pending";

    if (method === "time_delayed") {
      canCompleteAt = new Date(
        now.getTime() + this.config.timeDelayHours * 60 * 60 * 1000,
      );
      status = "waiting_period";
    } else if (method === "trusted_contacts") {
      status = "waiting_contacts";
    } else if (method === "identity_verification") {
      status = "verification_required";
    }

    const request: RecoveryRequest = {
      id: generateId(),
      method,
      status,
      createdAt: now,
      expiresAt,
      updatedAt: now,
      canCompleteAt,
      contactsApproved: 0,
      requiredApprovals: this.config.approvalThreshold,
      identityVerified: false,
      rejectionReason: null,
      ipAddress: ipAddress ?? null,
      deviceId: deviceId ?? null,
      completionToken: null,
    };

    this.activeRequests.push(request);
    this.lastRecoveryAttempt = now;
    this.contactResponses.set(request.id, []);
    await this.saveToStorage();

    logger.info("Recovery request initiated", {
      requestId: request.id,
      method,
      status,
      canCompleteAt: canCompleteAt?.toISOString() ?? null,
    });

    return {
      success: true,
      newStatus: status,
      error: null,
      canCompleteAt,
      completionToken: null,
    };
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
    const request = this.activeRequests.find((r) => r.id === requestId);

    if (!request) {
      return {
        success: false,
        newStatus: null,
        error: "Recovery request not found",
        canCompleteAt: null,
        completionToken: null,
      };
    }

    if (request.status !== "waiting_contacts") {
      return {
        success: false,
        newStatus: null,
        error: "Request is not waiting for contact responses",
        canCompleteAt: null,
        completionToken: null,
      };
    }

    const contact = this.trustedContacts.find((c) => c.id === contactId);
    if (!contact || !contact.verified) {
      return {
        success: false,
        newStatus: null,
        error: "Contact not found or not verified",
        canCompleteAt: null,
        completionToken: null,
      };
    }

    // Record response
    const responses = this.contactResponses.get(requestId) || [];
    const existingResponse = responses.find((r) => r.contactId === contactId);
    if (existingResponse) {
      return {
        success: false,
        newStatus: null,
        error: "Contact has already responded",
        canCompleteAt: null,
        completionToken: null,
      };
    }

    const response: ContactResponse = {
      contactId,
      approved,
      respondedAt: new Date(),
      message: message ?? null,
    };

    responses.push(response);
    this.contactResponses.set(requestId, responses);

    contact.lastRespondedAt = new Date();

    // Update approval count
    if (approved) {
      request.contactsApproved++;
    }

    // Check if we have enough approvals
    if (request.contactsApproved >= request.requiredApprovals) {
      request.status = "approved";
      request.completionToken = generateCompletionToken();
      request.updatedAt = new Date();

      logger.info("Recovery request approved", {
        requestId,
        contactsApproved: request.contactsApproved,
      });

      await this.saveToStorage();

      return {
        success: true,
        newStatus: "approved",
        error: null,
        canCompleteAt: null,
        completionToken: request.completionToken,
      };
    }

    // Check if rejected (not enough remaining contacts to reach threshold)
    const remainingContacts =
      this.getVerifiedContacts().length - responses.length;
    const possibleApprovals = request.contactsApproved + remainingContacts;
    if (possibleApprovals < request.requiredApprovals) {
      request.status = "rejected";
      request.rejectionReason = "Not enough contacts approved";
      request.updatedAt = new Date();

      // Move to history
      this.moveRequestToHistory(request);

      logger.info("Recovery request rejected", {
        requestId,
        reason: request.rejectionReason,
      });

      await this.saveToStorage();

      return {
        success: false,
        newStatus: "rejected",
        error: "Recovery request was rejected",
        canCompleteAt: null,
        completionToken: null,
      };
    }

    request.updatedAt = new Date();
    await this.saveToStorage();

    return {
      success: true,
      newStatus: "waiting_contacts",
      error: null,
      canCompleteAt: null,
      completionToken: null,
    };
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
    const request = this.activeRequests.find((r) => r.id === requestId);

    if (!request) {
      return {
        success: false,
        newStatus: null,
        error: "Recovery request not found",
        canCompleteAt: null,
        completionToken: null,
      };
    }

    if (request.status !== "verification_required") {
      return {
        success: false,
        newStatus: null,
        error: "Request is not waiting for identity verification",
        canCompleteAt: null,
        completionToken: null,
      };
    }

    if (!verificationData.verified) {
      request.status = "rejected";
      request.rejectionReason = "Identity verification failed";
      request.updatedAt = new Date();
      this.moveRequestToHistory(request);
      await this.saveToStorage();

      return {
        success: false,
        newStatus: "rejected",
        error: "Identity verification failed",
        canCompleteAt: null,
        completionToken: null,
      };
    }

    request.identityVerified = true;
    request.status = "approved";
    request.completionToken = generateCompletionToken();
    request.updatedAt = new Date();

    logger.info("Identity verified for recovery", {
      requestId,
      provider: verificationData.provider,
    });

    await this.saveToStorage();

    return {
      success: true,
      newStatus: "approved",
      error: null,
      canCompleteAt: null,
      completionToken: request.completionToken,
    };
  }

  /**
   * Checks if a time-delayed recovery can be completed
   */
  async checkTimeDelayedRecovery(requestId: string): Promise<RecoveryResult> {
    const request = this.activeRequests.find((r) => r.id === requestId);

    if (!request) {
      return {
        success: false,
        newStatus: null,
        error: "Recovery request not found",
        canCompleteAt: null,
        completionToken: null,
      };
    }

    if (request.method !== "time_delayed") {
      return {
        success: false,
        newStatus: null,
        error: "This is not a time-delayed recovery request",
        canCompleteAt: null,
        completionToken: null,
      };
    }

    if (request.status !== "waiting_period") {
      return {
        success: false,
        newStatus: null,
        error: "Request is not in waiting period",
        canCompleteAt: null,
        completionToken: null,
      };
    }

    if (!request.canCompleteAt || request.canCompleteAt > new Date()) {
      return {
        success: false,
        newStatus: "waiting_period",
        error: "Waiting period has not elapsed",
        canCompleteAt: request.canCompleteAt,
        completionToken: null,
      };
    }

    // Time has elapsed
    request.status = "approved";
    request.completionToken = generateCompletionToken();
    request.updatedAt = new Date();

    logger.info("Time-delayed recovery ready", { requestId });

    await this.saveToStorage();

    return {
      success: true,
      newStatus: "approved",
      error: null,
      canCompleteAt: null,
      completionToken: request.completionToken,
    };
  }

  /**
   * Completes a recovery request
   */
  async completeRecovery(
    requestId: string,
    completionToken: string,
  ): Promise<{ success: boolean; error: string | null }> {
    const request = this.activeRequests.find((r) => r.id === requestId);

    if (!request) {
      return { success: false, error: "Recovery request not found" };
    }

    if (request.status !== "approved") {
      return { success: false, error: "Recovery request is not approved" };
    }

    if (request.completionToken !== completionToken) {
      return { success: false, error: "Invalid completion token" };
    }

    // Mark as completed
    request.status = "completed";
    request.updatedAt = new Date();
    this.successfulRecoveries++;

    // Move to history
    this.moveRequestToHistory(request);

    logger.info("Recovery completed", {
      requestId,
      method: request.method,
      totalSuccessful: this.successfulRecoveries,
    });

    await this.saveToStorage();

    return { success: true, error: null };
  }

  /**
   * Cancels a recovery request
   */
  async cancelRecoveryRequest(
    requestId: string,
  ): Promise<{ success: boolean; error: string | null }> {
    const request = this.activeRequests.find((r) => r.id === requestId);

    if (!request) {
      return { success: false, error: "Recovery request not found" };
    }

    if (
      ["completed", "rejected", "expired", "cancelled"].includes(request.status)
    ) {
      return { success: false, error: "Request cannot be cancelled" };
    }

    request.status = "cancelled";
    request.updatedAt = new Date();
    this.moveRequestToHistory(request);

    logger.info("Recovery request cancelled", { requestId });

    await this.saveToStorage();

    return { success: true, error: null };
  }

  /**
   * Gets a recovery request by ID
   */
  getRequest(requestId: string): RecoveryRequest | null {
    return (
      this.activeRequests.find((r) => r.id === requestId) ||
      this.requestHistory.find((r) => r.id === requestId) ||
      null
    );
  }

  /**
   * Gets contact responses for a request
   */
  getContactResponses(requestId: string): ContactResponse[] {
    return this.contactResponses.get(requestId) || [];
  }

  /**
   * Clears all recovery data
   */
  async clearAll(): Promise<void> {
    this.trustedContacts = [];
    this.activeRequests = [];
    this.requestHistory = [];
    this.contactResponses.clear();
    this.lastRecoveryAttempt = null;
    this.successfulRecoveries = 0;

    await this.clearStorage();

    logger.warn("Recovery lock data cleared");
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Cleans up expired requests
   */
  private cleanupExpiredRequests(): void {
    const now = new Date();

    for (const request of this.activeRequests) {
      if (
        request.expiresAt < now &&
        !["completed", "rejected", "expired"].includes(request.status)
      ) {
        request.status = "expired";
        request.updatedAt = now;
      }
    }

    // Move expired to history
    const expiredRequests = this.activeRequests.filter(
      (r) =>
        r.status === "expired" ||
        r.status === "completed" ||
        r.status === "rejected",
    );

    for (const request of expiredRequests) {
      this.moveRequestToHistory(request);
    }
  }

  /**
   * Moves a request to history
   */
  private moveRequestToHistory(request: RecoveryRequest): void {
    const index = this.activeRequests.indexOf(request);
    if (index !== -1) {
      this.activeRequests.splice(index, 1);
    }

    if (!this.requestHistory.some((r) => r.id === request.id)) {
      this.requestHistory.push(request);
    }

    // Keep only last 50 in history
    if (this.requestHistory.length > 50) {
      this.requestHistory = this.requestHistory.slice(-50);
    }
  }

  /**
   * Loads state from storage
   */
  private async loadFromStorage(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    try {
      const contactsJson = localStorage.getItem(CONTACTS_STORAGE_KEY);
      if (contactsJson) {
        const contacts = JSON.parse(contactsJson);
        this.trustedContacts = contacts.map(
          (
            c: TrustedContact & {
              addedAt: string;
              lastRespondedAt: string | null;
            },
          ) => ({
            ...c,
            addedAt: new Date(c.addedAt),
            lastRespondedAt: c.lastRespondedAt
              ? new Date(c.lastRespondedAt)
              : null,
          }),
        );
      }

      const requestsJson = localStorage.getItem(REQUESTS_STORAGE_KEY);
      if (requestsJson) {
        const data = JSON.parse(requestsJson);
        this.activeRequests = data.active.map(this.parseRequest);
        this.requestHistory = data.history.map(this.parseRequest);
      }

      const responsesJson = localStorage.getItem(RESPONSES_STORAGE_KEY);
      if (responsesJson) {
        const responses = JSON.parse(responsesJson);
        this.contactResponses = new Map(
          Object.entries(responses).map(([key, value]) => [
            key,
            (value as (ContactResponse & { respondedAt: string })[]).map(
              (r) => ({
                ...r,
                respondedAt: new Date(r.respondedAt),
              }),
            ),
          ]),
        );
      }

      const stateJson = localStorage.getItem(STATE_STORAGE_KEY);
      if (stateJson) {
        const state = JSON.parse(stateJson);
        this.lastRecoveryAttempt = state.lastRecoveryAttempt
          ? new Date(state.lastRecoveryAttempt)
          : null;
        this.successfulRecoveries = state.successfulRecoveries ?? 0;
      }
    } catch (error) {
      logger.warn("Failed to load recovery lock state", { error });
    }
  }

  /**
   * Parses a request from storage
   */
  private parseRequest = (
    r: RecoveryRequest & {
      createdAt: string;
      expiresAt: string;
      updatedAt: string;
      canCompleteAt: string | null;
    },
  ): RecoveryRequest => ({
    ...r,
    createdAt: new Date(r.createdAt),
    expiresAt: new Date(r.expiresAt),
    updatedAt: new Date(r.updatedAt),
    canCompleteAt: r.canCompleteAt ? new Date(r.canCompleteAt) : null,
  });

  /**
   * Saves state to storage
   */
  private async saveToStorage(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    try {
      localStorage.setItem(
        CONTACTS_STORAGE_KEY,
        JSON.stringify(this.trustedContacts),
      );
      localStorage.setItem(
        REQUESTS_STORAGE_KEY,
        JSON.stringify({
          active: this.activeRequests,
          history: this.requestHistory,
        }),
      );
      localStorage.setItem(
        RESPONSES_STORAGE_KEY,
        JSON.stringify(Object.fromEntries(this.contactResponses)),
      );
      localStorage.setItem(
        STATE_STORAGE_KEY,
        JSON.stringify({
          lastRecoveryAttempt: this.lastRecoveryAttempt,
          successfulRecoveries: this.successfulRecoveries,
        }),
      );
    } catch (error) {
      logger.warn("Failed to save recovery lock state", { error });
    }
  }

  /**
   * Clears storage
   */
  private async clearStorage(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    localStorage.removeItem(CONTACTS_STORAGE_KEY);
    localStorage.removeItem(REQUESTS_STORAGE_KEY);
    localStorage.removeItem(RESPONSES_STORAGE_KEY);
    localStorage.removeItem(STATE_STORAGE_KEY);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Gets the global recovery lock manager instance
 */
export function getRecoveryLockManager(
  config?: Partial<RecoveryLockConfig>,
): RecoveryLockManager {
  return RecoveryLockManager.getInstance(config);
}

/**
 * Initializes the recovery lock manager
 */
export async function initializeRecoveryLock(): Promise<void> {
  const manager = getRecoveryLockManager();
  await manager.initialize();
}

/**
 * Gets available recovery methods
 */
export function getAvailableRecoveryMethods(): RecoveryMethod[] {
  const manager = getRecoveryLockManager();
  return manager.getState().availableMethods;
}

/**
 * Checks if social recovery is available
 */
export function isSocialRecoveryAvailable(): boolean {
  const manager = getRecoveryLockManager();
  return manager.getState().availableMethods.includes("trusted_contacts");
}

/**
 * Checks if time-delayed recovery is available
 */
export function isTimeDelayedRecoveryAvailable(): boolean {
  const manager = getRecoveryLockManager();
  return manager.getState().availableMethods.includes("time_delayed");
}
