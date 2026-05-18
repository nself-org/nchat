/**
 * Key Rotation System
 *
 * Provides comprehensive key rotation policies, automated scheduling,
 * and secure key lifecycle management. Supports both time-based and
 * event-based rotation triggers.
 *
 * Features:
 * - Configurable rotation policies (time-based, usage-based, on-demand)
 * - Automated rotation scheduling with graceful key transitions
 * - Key versioning and history tracking
 * - Post-rotation key distribution coordination
 * - Audit logging for all rotation events
 */

import { logger } from "@/lib/logger";
import {
  KeyManager,
  KeyPair,
  KeyMetadata,
  generateKeyPair,
  exportKeyPair,
  importKeyPair,
  storeKeyPair,
  retrieveKeyMetadata,
  openKeyDatabase,
  ExportedKeyPair,
} from "./key-manager";

// ============================================================================
// Types
// ============================================================================

/**
 * Rotation trigger types
 */
export type RotationTrigger =
  | "scheduled" // Regular time-based rotation
  | "usage_threshold" // Exceeded usage count
  | "compromise" // Key compromise detected
  | "manual" // User-initiated rotation
  | "policy_change" // Security policy updated
  | "device_added" // New device linked
  | "device_removed"; // Device unlinked

/**
 * Rotation status
 */
export type RotationStatus =
  | "pending" // Rotation scheduled but not started
  | "in_progress" // Currently rotating
  | "completed" // Successfully completed
  | "failed" // Rotation failed
  | "rolled_back"; // Reverted to previous key

/**
 * Key rotation policy configuration
 */
export interface RotationPolicy {
  /** Unique policy identifier */
  id: string;
  /** Human-readable policy name */
  name: string;
  /** Whether this policy is active */
  enabled: boolean;
  /** Maximum key age in days before mandatory rotation */
  maxAgeDays: number;
  /** Maximum key usages before mandatory rotation (0 = unlimited) */
  maxUsageCount: number;
  /** Minimum time between rotations in hours */
  minRotationIntervalHours: number;
  /** Grace period in hours after scheduled rotation before forced rotation */
  gracePeriodHours: number;
  /** Whether to allow manual rotation override */
  allowManualRotation: boolean;
  /** Whether to require approval for rotation */
  requireApproval: boolean;
  /** Number of previous keys to retain for decryption */
  retainedKeyVersions: number;
  /** Key type this policy applies to */
  keyType: "identity" | "signing" | "prekey" | "session";
  /** Priority (higher = more important) */
  priority: number;
}

/**
 * Rotation event record
 */
export interface RotationEvent {
  /** Unique event identifier */
  id: string;
  /** Key identifier that was rotated */
  keyId: string;
  /** Device ID where rotation occurred */
  deviceId: string;
  /** Previous key version */
  previousVersion: number;
  /** New key version */
  newVersion: number;
  /** What triggered the rotation */
  trigger: RotationTrigger;
  /** Current status of the rotation */
  status: RotationStatus;
  /** When rotation was initiated */
  initiatedAt: Date;
  /** When rotation completed (if applicable) */
  completedAt: Date | null;
  /** Error message if failed */
  errorMessage: string | null;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Scheduled rotation task
 */
export interface ScheduledRotation {
  /** Task identifier */
  id: string;
  /** Key to rotate */
  keyId: string;
  /** Scheduled execution time */
  scheduledAt: Date;
  /** Policy that triggered this schedule */
  policyId: string;
  /** Whether this is a forced rotation */
  isForced: boolean;
  /** Number of retry attempts */
  retryCount: number;
  /** Maximum retry attempts */
  maxRetries: number;
}

/**
 * Rotation result
 */
export interface RotationResult {
  /** Whether rotation succeeded */
  success: boolean;
  /** New key pair (if successful) */
  newKeyPair: KeyPair | null;
  /** New key version */
  newVersion: number;
  /** Error message (if failed) */
  error: string | null;
  /** Rotation event record */
  event: RotationEvent;
  /** Keys that need distribution to other devices */
  pendingDistribution: string[];
}

/**
 * Key history entry
 */
export interface KeyHistoryEntry {
  /** Key version */
  version: number;
  /** Key fingerprint */
  fingerprint: string;
  /** When key was created */
  createdAt: Date;
  /** When key was rotated out */
  rotatedAt: Date | null;
  /** What triggered the rotation */
  rotationTrigger: RotationTrigger | null;
  /** Whether key is still valid for decryption */
  validForDecryption: boolean;
  /** Expiry date for decryption validity */
  decryptionExpiresAt: Date | null;
}

/**
 * Rotation manager configuration
 */
export interface RotationManagerConfig {
  /** Default rotation policy */
  defaultPolicy: Partial<RotationPolicy>;
  /** Check interval for scheduled rotations (ms) */
  checkIntervalMs: number;
  /** Whether to auto-start rotation scheduler */
  autoStart: boolean;
  /** Database name for storing rotation data */
  dbName: string;
  /** Object store name */
  storeName: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_POLICY: RotationPolicy = {
  id: "default",
  name: "Default Rotation Policy",
  enabled: true,
  maxAgeDays: 30,
  maxUsageCount: 0, // Unlimited
  minRotationIntervalHours: 24,
  gracePeriodHours: 48,
  allowManualRotation: true,
  requireApproval: false,
  retainedKeyVersions: 3,
  keyType: "identity",
  priority: 1,
};

const HIGH_SECURITY_POLICY: RotationPolicy = {
  id: "high-security",
  name: "High Security Rotation Policy",
  enabled: true,
  maxAgeDays: 7,
  maxUsageCount: 10000,
  minRotationIntervalHours: 1,
  gracePeriodHours: 24,
  allowManualRotation: true,
  requireApproval: true,
  retainedKeyVersions: 5,
  keyType: "identity",
  priority: 10,
};

const SIGNING_KEY_POLICY: RotationPolicy = {
  id: "signing-key",
  name: "Signing Key Policy",
  enabled: true,
  maxAgeDays: 90,
  maxUsageCount: 0,
  minRotationIntervalHours: 24,
  gracePeriodHours: 168, // 1 week
  allowManualRotation: true,
  requireApproval: false,
  retainedKeyVersions: 2,
  keyType: "signing",
  priority: 5,
};

const PREKEY_POLICY: RotationPolicy = {
  id: "prekey",
  name: "Pre-Key Policy",
  enabled: true,
  maxAgeDays: 7,
  maxUsageCount: 100,
  minRotationIntervalHours: 1,
  gracePeriodHours: 24,
  allowManualRotation: true,
  requireApproval: false,
  retainedKeyVersions: 1,
  keyType: "prekey",
  priority: 5,
};

const DEFAULT_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const ROTATION_DB_NAME = "nchat-key-rotation";
const ROTATION_STORE_NAME = "rotation-events";
const POLICY_STORE_NAME = "rotation-policies";
const SCHEDULE_STORE_NAME = "scheduled-rotations";
const HISTORY_STORE_NAME = "key-history";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique rotation event ID
 */
function generateRotationId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `rot_${timestamp}_${randomPart}`;
}

/**
 * Generates a unique schedule ID
 */
function generateScheduleId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `sch_${timestamp}_${randomPart}`;
}

/**
 * Calculates next rotation time based on policy
 */
export function calculateNextRotation(
  keyCreatedAt: Date,
  policy: RotationPolicy,
): Date {
  const maxAgeMs = policy.maxAgeDays * 24 * 60 * 60 * 1000;
  return new Date(keyCreatedAt.getTime() + maxAgeMs);
}

/**
 * Checks if a key needs rotation based on policy
 */
export function shouldRotateKey(
  metadata: KeyMetadata,
  policy: RotationPolicy,
  usageCount: number = 0,
): { shouldRotate: boolean; reason: RotationTrigger | null } {
  if (!policy.enabled) {
    return { shouldRotate: false, reason: null };
  }

  const now = Date.now();
  const keyAgeMs = now - metadata.createdAt.getTime();
  const maxAgeMs = policy.maxAgeDays * 24 * 60 * 60 * 1000;

  // Check age-based rotation
  if (keyAgeMs >= maxAgeMs) {
    return { shouldRotate: true, reason: "scheduled" };
  }

  // Check usage-based rotation
  if (policy.maxUsageCount > 0 && usageCount >= policy.maxUsageCount) {
    return { shouldRotate: true, reason: "usage_threshold" };
  }

  return { shouldRotate: false, reason: null };
}

/**
 * Checks if rotation is allowed based on minimum interval
 */
export function canRotate(
  lastRotationAt: Date | null,
  policy: RotationPolicy,
): boolean {
  if (!lastRotationAt) return true;

  const minIntervalMs = policy.minRotationIntervalHours * 60 * 60 * 1000;
  const timeSinceLastRotation = Date.now() - lastRotationAt.getTime();

  return timeSinceLastRotation >= minIntervalMs;
}

// ============================================================================
// Key Rotation Manager
// ============================================================================

/**
 * Manages key rotation lifecycle including policies, scheduling, and execution
 */
export class KeyRotationManager {
  private static instance: KeyRotationManager;
  private policies: Map<string, RotationPolicy> = new Map();
  private scheduledRotations: Map<string, ScheduledRotation> = new Map();
  private keyHistory: Map<string, KeyHistoryEntry[]> = new Map();
  private usageCounts: Map<string, number> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private config: RotationManagerConfig;
  private initialized = false;
  private listeners: Map<string, ((event: RotationEvent) => void)[]> =
    new Map();

  private constructor(config: Partial<RotationManagerConfig> = {}) {
    this.config = {
      defaultPolicy: config.defaultPolicy || {},
      checkIntervalMs: config.checkIntervalMs || DEFAULT_CHECK_INTERVAL,
      autoStart: config.autoStart ?? true,
      dbName: config.dbName || ROTATION_DB_NAME,
      storeName: config.storeName || ROTATION_STORE_NAME,
    };

    // Register default policies
    this.registerPolicy(DEFAULT_POLICY);
    this.registerPolicy(HIGH_SECURITY_POLICY);
    this.registerPolicy(SIGNING_KEY_POLICY);
    this.registerPolicy(PREKEY_POLICY);
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(
    config?: Partial<RotationManagerConfig>,
  ): KeyRotationManager {
    if (!KeyRotationManager.instance) {
      KeyRotationManager.instance = new KeyRotationManager(config);
    }
    return KeyRotationManager.instance;
  }

  /**
   * Resets the singleton (for testing)
   */
  static resetInstance(): void {
    if (KeyRotationManager.instance) {
      KeyRotationManager.instance.stop();
    }
    KeyRotationManager.instance = undefined as unknown as KeyRotationManager;
  }

  /**
   * Initializes the rotation manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadFromStorage();

    if (this.config.autoStart) {
      this.start();
    }

    this.initialized = true;
    logger.info("Key rotation manager initialized");
  }

  /**
   * Starts the rotation scheduler
   */
  start(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(
      () => this.checkScheduledRotations(),
      this.config.checkIntervalMs,
    );

    logger.info("Key rotation scheduler started", {
      intervalMs: this.config.checkIntervalMs,
    });
  }

  /**
   * Stops the rotation scheduler
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info("Key rotation scheduler stopped");
  }

  /**
   * Registers a rotation policy
   */
  registerPolicy(policy: RotationPolicy): void {
    this.policies.set(policy.id, policy);
    logger.info("Rotation policy registered", { policyId: policy.id });
  }

  /**
   * Updates a rotation policy
   */
  updatePolicy(policyId: string, updates: Partial<RotationPolicy>): void {
    const existing = this.policies.get(policyId);
    if (!existing) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    this.policies.set(policyId, { ...existing, ...updates });
    logger.info("Rotation policy updated", { policyId });

    // Re-evaluate scheduled rotations
    this.rescheduleRotations(policyId);
  }

  /**
   * Gets a rotation policy by ID
   */
  getPolicy(policyId: string): RotationPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Gets all registered policies
   */
  getAllPolicies(): RotationPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Gets the policy for a specific key type
   */
  getPolicyForKeyType(
    keyType: RotationPolicy["keyType"],
  ): RotationPolicy | undefined {
    const policies = Array.from(this.policies.values())
      .filter((p) => p.keyType === keyType && p.enabled)
      .sort((a, b) => b.priority - a.priority);

    return policies[0];
  }

  /**
   * Schedules a key rotation
   */
  scheduleRotation(
    keyId: string,
    policyId: string,
    scheduledAt: Date,
    isForced = false,
  ): ScheduledRotation {
    const schedule: ScheduledRotation = {
      id: generateScheduleId(),
      keyId,
      scheduledAt,
      policyId,
      isForced,
      retryCount: 0,
      maxRetries: 3,
    };

    this.scheduledRotations.set(schedule.id, schedule);
    this.persistSchedule(schedule);

    logger.info("Key rotation scheduled", {
      scheduleId: schedule.id,
      keyId,
      scheduledAt: scheduledAt.toISOString(),
    });

    return schedule;
  }

  /**
   * Cancels a scheduled rotation
   */
  cancelScheduledRotation(scheduleId: string): boolean {
    const deleted = this.scheduledRotations.delete(scheduleId);
    if (deleted) {
      this.removeScheduleFromStorage(scheduleId);
      logger.info("Scheduled rotation cancelled", { scheduleId });
    }
    return deleted;
  }

  /**
   * Gets pending scheduled rotations for a key
   */
  getScheduledRotations(keyId?: string): ScheduledRotation[] {
    const rotations = Array.from(this.scheduledRotations.values());
    if (keyId) {
      return rotations.filter((r) => r.keyId === keyId);
    }
    return rotations;
  }

  /**
   * Executes a key rotation
   */
  async rotateKey(
    keyManager: KeyManager,
    trigger: RotationTrigger,
    policyId?: string,
  ): Promise<RotationResult> {
    const metadata = await keyManager.getKeyMetadata();
    if (!metadata) {
      return this.createFailedResult("No key metadata found", trigger);
    }

    const policy = policyId
      ? this.getPolicy(policyId)
      : this.getPolicyForKeyType("identity");

    if (!policy) {
      return this.createFailedResult("No applicable policy found", trigger);
    }

    // Check if rotation is allowed
    if (trigger !== "compromise" && !canRotate(metadata.rotatedAt, policy)) {
      return this.createFailedResult(
        "Rotation not allowed - minimum interval not met",
        trigger,
      );
    }

    // Create rotation event
    const event = this.createRotationEvent(metadata, trigger);
    this.emitEvent(event);

    try {
      // Update event status
      event.status = "in_progress";
      this.emitEvent(event);

      // Perform the rotation
      const newKeyPair = await keyManager.rotateKeys();
      const newMetadata = await keyManager.getKeyMetadata();

      // Update history
      this.addToHistory(metadata.id, {
        version: metadata.version,
        fingerprint: (await keyManager.getFingerprint()) || "",
        createdAt: metadata.createdAt,
        rotatedAt: new Date(),
        rotationTrigger: trigger,
        validForDecryption: true,
        decryptionExpiresAt: this.calculateDecryptionExpiry(policy),
      });

      // Complete event
      event.status = "completed";
      event.completedAt = new Date();
      event.newVersion = newMetadata?.version || event.previousVersion + 1;
      this.emitEvent(event);

      // Persist event
      await this.persistEvent(event);

      // Reset usage count for this key
      this.usageCounts.set(metadata.id, 0);

      logger.info("Key rotation completed", {
        keyId: metadata.id,
        previousVersion: event.previousVersion,
        newVersion: event.newVersion,
        trigger,
      });

      return {
        success: true,
        newKeyPair,
        newVersion: event.newVersion,
        error: null,
        event,
        pendingDistribution: this.getPendingDistributions(metadata.id),
      };
    } catch (error) {
      event.status = "failed";
      event.errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      event.completedAt = new Date();
      this.emitEvent(event);

      await this.persistEvent(event);

      logger.error("Key rotation failed", {
        keyId: metadata.id,
        error: event.errorMessage,
      });

      return {
        success: false,
        newKeyPair: null,
        newVersion: metadata.version,
        error: event.errorMessage,
        event,
        pendingDistribution: [],
      };
    }
  }

  /**
   * Forces immediate key rotation (for compromise scenarios)
   */
  async forceRotation(
    keyManager: KeyManager,
    reason: string,
  ): Promise<RotationResult> {
    logger.warn("Forcing key rotation", { reason });
    return this.rotateKey(keyManager, "compromise");
  }

  /**
   * Records key usage (for usage-based rotation)
   */
  recordKeyUsage(keyId: string, count: number = 1): void {
    const current = this.usageCounts.get(keyId) || 0;
    this.usageCounts.set(keyId, current + count);
  }

  /**
   * Gets key usage count
   */
  getKeyUsageCount(keyId: string): number {
    return this.usageCounts.get(keyId) || 0;
  }

  /**
   * Gets key history
   */
  getKeyHistory(keyId: string): KeyHistoryEntry[] {
    return this.keyHistory.get(keyId) || [];
  }

  /**
   * Checks if a key version is still valid for decryption
   */
  isVersionValidForDecryption(keyId: string, version: number): boolean {
    const history = this.keyHistory.get(keyId) || [];
    const entry = history.find((h) => h.version === version);

    if (!entry) return false;
    if (!entry.validForDecryption) return false;
    if (entry.decryptionExpiresAt && entry.decryptionExpiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Subscribes to rotation events
   */
  onRotation(
    eventType: "all" | RotationStatus,
    callback: (event: RotationEvent) => void,
  ): () => void {
    const key = eventType;
    const listeners = this.listeners.get(key) || [];
    listeners.push(callback);
    this.listeners.set(key, listeners);

    return () => {
      const current = this.listeners.get(key) || [];
      this.listeners.set(
        key,
        current.filter((l) => l !== callback),
      );
    };
  }

  /**
   * Gets rotation events history
   */
  async getRotationHistory(
    keyId?: string,
    limit: number = 50,
  ): Promise<RotationEvent[]> {
    const events = await this.loadEventsFromStorage();
    const filtered = keyId ? events.filter((e) => e.keyId === keyId) : events;
    return filtered.slice(-limit);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createRotationEvent(
    metadata: KeyMetadata,
    trigger: RotationTrigger,
  ): RotationEvent {
    return {
      id: generateRotationId(),
      keyId: metadata.id,
      deviceId: metadata.deviceId,
      previousVersion: metadata.version,
      newVersion: metadata.version + 1,
      trigger,
      status: "pending",
      initiatedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      metadata: {},
    };
  }

  private createFailedResult(
    error: string,
    trigger: RotationTrigger,
  ): RotationResult {
    return {
      success: false,
      newKeyPair: null,
      newVersion: 0,
      error,
      event: {
        id: generateRotationId(),
        keyId: "unknown",
        deviceId: "unknown",
        previousVersion: 0,
        newVersion: 0,
        trigger,
        status: "failed",
        initiatedAt: new Date(),
        completedAt: new Date(),
        errorMessage: error,
        metadata: {},
      },
      pendingDistribution: [],
    };
  }

  private emitEvent(event: RotationEvent): void {
    // Emit to specific status listeners
    const statusListeners = this.listeners.get(event.status) || [];
    statusListeners.forEach((l) => l(event));

    // Emit to 'all' listeners
    const allListeners = this.listeners.get("all") || [];
    allListeners.forEach((l) => l(event));
  }

  private addToHistory(keyId: string, entry: KeyHistoryEntry): void {
    const history = this.keyHistory.get(keyId) || [];
    history.push(entry);

    // Trim history based on policy
    const policy = this.getPolicyForKeyType("identity");
    const maxEntries = policy?.retainedKeyVersions || 3;
    while (history.length > maxEntries) {
      const oldest = history.shift();
      if (oldest) {
        oldest.validForDecryption = false;
      }
    }

    this.keyHistory.set(keyId, history);
    this.persistHistory(keyId, history);
  }

  private calculateDecryptionExpiry(policy: RotationPolicy): Date {
    // Keys remain valid for decryption for 2x the max age
    const expiryMs = policy.maxAgeDays * 2 * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + expiryMs);
  }

  private getPendingDistributions(_keyId: string): string[] {
    // In a real implementation, this would check linked devices
    // that need to receive the new public key
    return [];
  }

  private async checkScheduledRotations(): Promise<void> {
    const now = new Date();

    for (const schedule of this.scheduledRotations.values()) {
      if (schedule.scheduledAt <= now) {
        logger.info("Processing scheduled rotation", {
          scheduleId: schedule.id,
          keyId: schedule.keyId,
        });

        // In a real implementation, this would trigger the rotation
        // For now, we just log and remove the schedule
        this.scheduledRotations.delete(schedule.id);
        this.removeScheduleFromStorage(schedule.id);
      }
    }
  }

  private rescheduleRotations(policyId: string): void {
    for (const schedule of this.scheduledRotations.values()) {
      if (schedule.policyId === policyId) {
        const policy = this.getPolicy(policyId);
        if (policy) {
          // Recalculate scheduled time based on new policy
          logger.info("Rescheduling rotation based on policy change", {
            scheduleId: schedule.id,
            policyId,
          });
        }
      }
    }
  }

  // ============================================================================
  // Storage Methods
  // ============================================================================

  private async loadFromStorage(): Promise<void> {
    try {
      if (typeof indexedDB === "undefined") return;

      const db = await openKeyDatabase(
        this.config.dbName,
        this.config.storeName,
      );
      db.close();
    } catch (error) {
      logger.warn("Failed to load rotation data from storage", {
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }

  private async persistEvent(event: RotationEvent): Promise<void> {
    try {
      if (typeof localStorage === "undefined") return;

      const key = `nchat_rotation_event_${event.id}`;
      localStorage.setItem(key, JSON.stringify(event));
    } catch (error) {
      logger.warn("Failed to persist rotation event", {
        eventId: event.id,
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }

  private async loadEventsFromStorage(): Promise<RotationEvent[]> {
    const events: RotationEvent[] = [];

    try {
      if (typeof localStorage === "undefined") return events;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("nchat_rotation_event_")) {
          const data = localStorage.getItem(key);
          if (data) {
            const event = JSON.parse(data) as RotationEvent;
            event.initiatedAt = new Date(event.initiatedAt);
            if (event.completedAt) {
              event.completedAt = new Date(event.completedAt);
            }
            events.push(event);
          }
        }
      }
    } catch (error) {
      logger.warn("Failed to load rotation events", {
        error: error instanceof Error ? error.message : "Unknown",
      });
    }

    return events.sort(
      (a, b) => a.initiatedAt.getTime() - b.initiatedAt.getTime(),
    );
  }

  private async persistSchedule(schedule: ScheduledRotation): Promise<void> {
    try {
      if (typeof localStorage === "undefined") return;

      const key = `nchat_rotation_schedule_${schedule.id}`;
      localStorage.setItem(key, JSON.stringify(schedule));
    } catch {
      // Silent fail for storage
    }
  }

  private removeScheduleFromStorage(scheduleId: string): void {
    try {
      if (typeof localStorage === "undefined") return;

      const key = `nchat_rotation_schedule_${scheduleId}`;
      localStorage.removeItem(key);
    } catch {
      // Silent fail for storage
    }
  }

  private async persistHistory(
    keyId: string,
    history: KeyHistoryEntry[],
  ): Promise<void> {
    try {
      if (typeof localStorage === "undefined") return;

      const key = `nchat_key_history_${keyId}`;
      localStorage.setItem(key, JSON.stringify(history));
    } catch {
      // Silent fail for storage
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Gets the global rotation manager instance
 */
export function getRotationManager(
  config?: Partial<RotationManagerConfig>,
): KeyRotationManager {
  return KeyRotationManager.getInstance(config);
}

/**
 * Initializes the rotation manager
 */
export async function initializeRotationManager(): Promise<void> {
  const manager = getRotationManager();
  await manager.initialize();
}

/**
 * Checks if a key needs rotation based on its metadata
 */
export async function checkKeyRotationNeeded(
  keyManager: KeyManager,
): Promise<{ needed: boolean; reason: RotationTrigger | null }> {
  const metadata = await keyManager.getKeyMetadata();
  if (!metadata) {
    return { needed: false, reason: null };
  }

  const manager = getRotationManager();
  const policy = manager.getPolicyForKeyType("identity");

  if (!policy) {
    return { needed: false, reason: null };
  }

  const usageCount = manager.getKeyUsageCount(metadata.id);
  const result = shouldRotateKey(metadata, policy, usageCount);
  return { needed: result.shouldRotate, reason: result.reason };
}

/**
 * Schedules automatic key rotation based on policy
 */
export function scheduleKeyRotation(
  keyId: string,
  createdAt: Date,
  policyId: string = "default",
): ScheduledRotation | null {
  const manager = getRotationManager();
  const policy = manager.getPolicy(policyId);

  if (!policy || !policy.enabled) {
    return null;
  }

  const scheduledAt = calculateNextRotation(createdAt, policy);
  return manager.scheduleRotation(keyId, policyId, scheduledAt);
}

// ============================================================================
// Policy Presets
// ============================================================================

export const PolicyPresets = {
  DEFAULT: DEFAULT_POLICY,
  HIGH_SECURITY: HIGH_SECURITY_POLICY,
  SIGNING_KEY: SIGNING_KEY_POLICY,
  PREKEY: PREKEY_POLICY,
};
