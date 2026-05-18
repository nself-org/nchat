/**
 * Group Key Distribution for Group E2EE
 *
 * Handles secure distribution of sender keys to group members using
 * existing pairwise E2EE sessions. Sender keys are encrypted with
 * each recipient's session key before distribution.
 *
 * Key properties:
 * - Sender keys distributed via secure 1:1 channels
 * - Automatic retry on distribution failure
 * - Batch distribution for efficiency
 * - Tracking of distribution status per member
 * - Support for new member onboarding
 *
 * Uses Web Crypto API for all cryptographic operations.
 */

import { logger } from "@/lib/logger";
import type { SenderKeyDistributionMessage } from "./sender-key";
import type { GroupMember } from "./group-session";

// ============================================================================
// Constants
// ============================================================================

/** Maximum retries for distribution */
const MAX_DISTRIBUTION_RETRIES = 3;

/** Retry delay base in milliseconds */
const RETRY_DELAY_BASE_MS = 1000;

/** Distribution timeout in milliseconds */
const DISTRIBUTION_TIMEOUT_MS = 30000;

/** Batch size for distribution */
const DISTRIBUTION_BATCH_SIZE = 10;

// ============================================================================
// Types
// ============================================================================

/**
 * Distribution target - a member who needs to receive a sender key
 */
export interface DistributionTarget {
  /** User ID */
  userId: string;
  /** Device ID */
  deviceId: string;
  /** Whether a pairwise session exists */
  hasSession: boolean;
  /** Pre-key bundle if no session exists */
  preKeyBundle?: unknown;
}

/**
 * Distribution request
 */
export interface DistributionRequest {
  /** Request ID */
  requestId: string;
  /** Group ID */
  groupId: string;
  /** Distribution message */
  distributionMessage: SenderKeyDistributionMessage;
  /** Target members */
  targets: DistributionTarget[];
  /** Created timestamp */
  createdAt: number;
  /** Whether this is a rekey distribution */
  isRekey: boolean;
  /** Epoch number */
  epoch: number;
}

/**
 * Distribution result for a single target
 */
export interface DistributionResult {
  /** Target user ID */
  userId: string;
  /** Target device ID */
  deviceId: string;
  /** Whether distribution succeeded */
  success: boolean;
  /** Error if failed */
  error?: string;
  /** Timestamp */
  timestamp: number;
  /** Retry count */
  retryCount: number;
}

/**
 * Batch distribution result
 */
export interface BatchDistributionResult {
  /** Request ID */
  requestId: string;
  /** Group ID */
  groupId: string;
  /** Total targets */
  totalTargets: number;
  /** Successful distributions */
  successCount: number;
  /** Failed distributions */
  failedCount: number;
  /** Individual results */
  results: DistributionResult[];
  /** Completed timestamp */
  completedAt: number;
  /** Total duration in ms */
  durationMs: number;
}

/**
 * Encrypted distribution message (for transmission)
 */
export interface EncryptedDistributionMessage {
  /** Message type identifier */
  type: "sender_key_distribution";
  /** Source group ID */
  groupId: string;
  /** Sender user ID */
  senderUserId: string;
  /** Sender device ID */
  senderDeviceId: string;
  /** Target user ID */
  targetUserId: string;
  /** Target device ID */
  targetDeviceId: string;
  /** Encrypted distribution data (Base64) */
  encryptedData: string;
  /** Epoch number */
  epoch: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Distribution status for tracking
 */
export interface DistributionStatus {
  /** Group ID */
  groupId: string;
  /** Total members needing distribution */
  totalMembers: number;
  /** Members with successful distribution */
  distributedCount: number;
  /** Members with pending distribution */
  pendingCount: number;
  /** Members with failed distribution */
  failedCount: number;
  /** Last update timestamp */
  lastUpdatedAt: number;
  /** Whether distribution is complete */
  isComplete: boolean;
}

/**
 * Pairwise encryptor interface (provided by E2EE service)
 */
export interface PairwiseEncryptor {
  /** Checks if a session exists with a user/device */
  hasSession(userId: string, deviceId: string): Promise<boolean>;
  /** Creates a session with a user/device using their pre-key bundle */
  createSession(
    userId: string,
    deviceId: string,
    preKeyBundle: unknown,
  ): Promise<void>;
  /** Encrypts data for a specific user/device */
  encrypt(
    userId: string,
    deviceId: string,
    plaintext: Uint8Array,
  ): Promise<Uint8Array>;
  /** Decrypts data from a specific user/device */
  decrypt(
    userId: string,
    deviceId: string,
    ciphertext: Uint8Array,
  ): Promise<Uint8Array>;
}

/**
 * Pre-key bundle fetcher interface
 */
export interface PreKeyBundleFetcher {
  /** Fetches pre-key bundle for a user/device */
  fetchBundle(userId: string, deviceId: string): Promise<unknown>;
}

/**
 * Distribution message sender interface
 */
export interface DistributionMessageSender {
  /** Sends an encrypted distribution message */
  send(message: EncryptedDistributionMessage): Promise<boolean>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique request ID
 */
function generateRequestId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Bytes to Base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64 to bytes
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Serializes a distribution message to bytes
 */
function serializeDistributionMessage(
  message: SenderKeyDistributionMessage,
): Uint8Array {
  const json = JSON.stringify({
    keyId: message.keyId,
    chainKey: bytesToBase64(message.chainKey),
    chainIteration: message.chainIteration,
    signingPublicKey: bytesToBase64(message.signingPublicKey),
    groupId: message.groupId,
    senderUserId: message.senderUserId,
    senderDeviceId: message.senderDeviceId,
    timestamp: message.timestamp,
    version: message.version,
  });
  return new TextEncoder().encode(json);
}

/**
 * Deserializes a distribution message from bytes
 */
function deserializeDistributionMessage(
  bytes: Uint8Array,
): SenderKeyDistributionMessage {
  const json = new TextDecoder().decode(bytes);
  const parsed = JSON.parse(json);
  return {
    keyId: parsed.keyId,
    chainKey: base64ToBytes(parsed.chainKey),
    chainIteration: parsed.chainIteration,
    signingPublicKey: base64ToBytes(parsed.signingPublicKey),
    groupId: parsed.groupId,
    senderUserId: parsed.senderUserId,
    senderDeviceId: parsed.senderDeviceId,
    timestamp: parsed.timestamp,
    version: parsed.version,
  };
}

/**
 * Delays for exponential backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Key Distribution Manager
// ============================================================================

/**
 * Manages distribution of sender keys to group members
 */
export class GroupKeyDistributor {
  private pairwiseEncryptor: PairwiseEncryptor;
  private bundleFetcher?: PreKeyBundleFetcher;
  private messageSender?: DistributionMessageSender;
  private localUserId: string;
  private localDeviceId: string;
  private pendingRequests: Map<string, DistributionRequest> = new Map();
  private distributionStatus: Map<string, DistributionStatus> = new Map();

  constructor(
    pairwiseEncryptor: PairwiseEncryptor,
    localUserId: string,
    localDeviceId: string,
    options?: {
      bundleFetcher?: PreKeyBundleFetcher;
      messageSender?: DistributionMessageSender;
    },
  ) {
    this.pairwiseEncryptor = pairwiseEncryptor;
    this.localUserId = localUserId;
    this.localDeviceId = localDeviceId;
    this.bundleFetcher = options?.bundleFetcher;
    this.messageSender = options?.messageSender;
  }

  // ==========================================================================
  // Distribution Operations
  // ==========================================================================

  /**
   * Distributes a sender key to multiple group members
   */
  async distribute(
    groupId: string,
    distributionMessage: SenderKeyDistributionMessage,
    targets: GroupMember[],
    isRekey: boolean = false,
  ): Promise<BatchDistributionResult> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    // Filter out self
    const filteredTargets = targets.filter(
      (t) =>
        !(t.userId === this.localUserId && t.deviceId === this.localDeviceId),
    );

    if (filteredTargets.length === 0) {
      return {
        requestId,
        groupId,
        totalTargets: 0,
        successCount: 0,
        failedCount: 0,
        results: [],
        completedAt: Date.now(),
        durationMs: Date.now() - startTime,
      };
    }

    // Build distribution targets
    const distributionTargets: DistributionTarget[] = await Promise.all(
      filteredTargets.map(async (member) => {
        const hasSession = await this.pairwiseEncryptor.hasSession(
          member.userId,
          member.deviceId,
        );
        return {
          userId: member.userId,
          deviceId: member.deviceId,
          hasSession,
        };
      }),
    );

    // Create request
    const request: DistributionRequest = {
      requestId,
      groupId,
      distributionMessage,
      targets: distributionTargets,
      createdAt: Date.now(),
      isRekey,
      epoch: distributionMessage.chainIteration,
    };

    this.pendingRequests.set(requestId, request);

    // Process in batches
    const results: DistributionResult[] = [];

    for (
      let i = 0;
      i < distributionTargets.length;
      i += DISTRIBUTION_BATCH_SIZE
    ) {
      const batch = distributionTargets.slice(i, i + DISTRIBUTION_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((target) => this.distributeToTarget(request, target)),
      );
      results.push(...batchResults);
    }

    // Calculate results
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // Update status
    this.updateDistributionStatus(groupId, {
      totalMembers: filteredTargets.length,
      distributedCount: successCount,
      pendingCount: 0,
      failedCount,
    });

    // Clean up request
    this.pendingRequests.delete(requestId);

    const result: BatchDistributionResult = {
      requestId,
      groupId,
      totalTargets: filteredTargets.length,
      successCount,
      failedCount,
      results,
      completedAt: Date.now(),
      durationMs: Date.now() - startTime,
    };

    logger.info("Sender key distribution completed", {
      requestId,
      groupId,
      totalTargets: filteredTargets.length,
      successCount,
      failedCount,
      durationMs: result.durationMs,
    });

    return result;
  }

  /**
   * Distributes sender key to a single target with retries
   */
  private async distributeToTarget(
    request: DistributionRequest,
    target: DistributionTarget,
  ): Promise<DistributionResult> {
    let lastError: string | undefined;
    let retryCount = 0;

    while (retryCount <= MAX_DISTRIBUTION_RETRIES) {
      try {
        // Ensure we have a session
        if (!target.hasSession) {
          if (this.bundleFetcher) {
            const bundle = await this.bundleFetcher.fetchBundle(
              target.userId,
              target.deviceId,
            );
            await this.pairwiseEncryptor.createSession(
              target.userId,
              target.deviceId,
              bundle,
            );
            target.hasSession = true;
          } else {
            throw new Error(
              "No pairwise session and no bundle fetcher available",
            );
          }
        }

        // Serialize and encrypt the distribution message
        const serialized = serializeDistributionMessage(
          request.distributionMessage,
        );
        const encrypted = await this.pairwiseEncryptor.encrypt(
          target.userId,
          target.deviceId,
          serialized,
        );

        // Send if we have a message sender
        if (this.messageSender) {
          const message: EncryptedDistributionMessage = {
            type: "sender_key_distribution",
            groupId: request.groupId,
            senderUserId: this.localUserId,
            senderDeviceId: this.localDeviceId,
            targetUserId: target.userId,
            targetDeviceId: target.deviceId,
            encryptedData: bytesToBase64(encrypted),
            epoch: request.epoch,
            timestamp: Date.now(),
          };

          const sent = await this.messageSender.send(message);
          if (!sent) {
            throw new Error("Message sender returned false");
          }
        }

        return {
          userId: target.userId,
          deviceId: target.deviceId,
          success: true,
          timestamp: Date.now(),
          retryCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        retryCount++;

        if (retryCount <= MAX_DISTRIBUTION_RETRIES) {
          // Exponential backoff
          const delayMs = RETRY_DELAY_BASE_MS * Math.pow(2, retryCount - 1);
          await delay(delayMs);
        }
      }
    }

    logger.warn("Sender key distribution failed for target", {
      groupId: request.groupId,
      targetUserId: target.userId,
      targetDeviceId: target.deviceId,
      error: lastError,
      retryCount,
    });

    return {
      userId: target.userId,
      deviceId: target.deviceId,
      success: false,
      error: lastError,
      timestamp: Date.now(),
      retryCount,
    };
  }

  /**
   * Processes a received encrypted distribution message
   */
  async processReceivedDistribution(
    message: EncryptedDistributionMessage,
  ): Promise<SenderKeyDistributionMessage> {
    // Decrypt the distribution message
    const encryptedData = base64ToBytes(message.encryptedData);
    const decrypted = await this.pairwiseEncryptor.decrypt(
      message.senderUserId,
      message.senderDeviceId,
      encryptedData,
    );

    // Deserialize
    const distributionMessage = deserializeDistributionMessage(decrypted);

    // Validate
    if (distributionMessage.groupId !== message.groupId) {
      throw new Error("Group ID mismatch in distribution message");
    }

    if (
      distributionMessage.senderUserId !== message.senderUserId ||
      distributionMessage.senderDeviceId !== message.senderDeviceId
    ) {
      throw new Error("Sender mismatch in distribution message");
    }

    logger.debug("Processed received sender key distribution", {
      groupId: message.groupId,
      senderUserId: message.senderUserId,
      keyId: distributionMessage.keyId,
    });

    return distributionMessage;
  }

  // ==========================================================================
  // Status Tracking
  // ==========================================================================

  /**
   * Updates distribution status for a group
   */
  private updateDistributionStatus(
    groupId: string,
    update: Partial<DistributionStatus>,
  ): void {
    const existing = this.distributionStatus.get(groupId) ?? {
      groupId,
      totalMembers: 0,
      distributedCount: 0,
      pendingCount: 0,
      failedCount: 0,
      lastUpdatedAt: Date.now(),
      isComplete: false,
    };

    const updated: DistributionStatus = {
      ...existing,
      ...update,
      lastUpdatedAt: Date.now(),
      isComplete:
        (update.distributedCount ?? existing.distributedCount) >=
        (update.totalMembers ?? existing.totalMembers),
    };

    this.distributionStatus.set(groupId, updated);
  }

  /**
   * Gets distribution status for a group
   */
  getDistributionStatus(groupId: string): DistributionStatus | undefined {
    return this.distributionStatus.get(groupId);
  }

  /**
   * Gets all pending requests
   */
  getPendingRequests(): DistributionRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  /**
   * Cancels a pending request
   */
  cancelRequest(requestId: string): boolean {
    return this.pendingRequests.delete(requestId);
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Clears distribution status for a group
   */
  clearStatus(groupId: string): void {
    this.distributionStatus.delete(groupId);
  }

  /**
   * Clears all state
   */
  clear(): void {
    this.pendingRequests.clear();
    this.distributionStatus.clear();
  }
}

// ============================================================================
// Key Collection Manager
// ============================================================================

/**
 * Manages collection of sender keys from group members
 */
export class GroupKeyCollector {
  private localUserId: string;
  private localDeviceId: string;
  private collectionStatus: Map<string, Map<string, boolean>> = new Map();

  constructor(localUserId: string, localDeviceId: string) {
    this.localUserId = localUserId;
    this.localDeviceId = localDeviceId;
  }

  /**
   * Initializes collection tracking for a group
   */
  initializeGroup(groupId: string, members: GroupMember[]): void {
    const memberStatus = new Map<string, boolean>();

    for (const member of members) {
      if (
        member.userId === this.localUserId &&
        member.deviceId === this.localDeviceId
      ) {
        continue;
      }
      memberStatus.set(`${member.userId}:${member.deviceId}`, false);
    }

    this.collectionStatus.set(groupId, memberStatus);

    logger.debug("Key collection initialized for group", {
      groupId,
      memberCount: memberStatus.size,
    });
  }

  /**
   * Marks a member's key as collected
   */
  markCollected(groupId: string, userId: string, deviceId: string): void {
    const memberStatus = this.collectionStatus.get(groupId);
    if (!memberStatus) return;

    memberStatus.set(`${userId}:${deviceId}`, true);

    logger.debug("Key marked as collected", { groupId, userId, deviceId });
  }

  /**
   * Adds a new member to track
   */
  addMember(groupId: string, userId: string, deviceId: string): void {
    let memberStatus = this.collectionStatus.get(groupId);
    if (!memberStatus) {
      memberStatus = new Map();
      this.collectionStatus.set(groupId, memberStatus);
    }

    if (userId === this.localUserId && deviceId === this.localDeviceId) {
      return;
    }

    memberStatus.set(`${userId}:${deviceId}`, false);
  }

  /**
   * Removes a member from tracking
   */
  removeMember(groupId: string, userId: string, deviceId: string): void {
    const memberStatus = this.collectionStatus.get(groupId);
    if (!memberStatus) return;

    memberStatus.delete(`${userId}:${deviceId}`);
  }

  /**
   * Gets members whose keys are missing
   */
  getMissingKeys(groupId: string): Array<{ userId: string; deviceId: string }> {
    const memberStatus = this.collectionStatus.get(groupId);
    if (!memberStatus) return [];

    const missing: Array<{ userId: string; deviceId: string }> = [];

    for (const [memberKey, collected] of memberStatus) {
      if (!collected) {
        const [userId, deviceId] = memberKey.split(":");
        missing.push({ userId, deviceId });
      }
    }

    return missing;
  }

  /**
   * Checks if all keys are collected
   */
  isComplete(groupId: string): boolean {
    const memberStatus = this.collectionStatus.get(groupId);
    if (!memberStatus) return true;

    for (const collected of memberStatus.values()) {
      if (!collected) return false;
    }

    return true;
  }

  /**
   * Gets collection progress
   */
  getProgress(groupId: string): {
    collected: number;
    total: number;
    percentage: number;
  } {
    const memberStatus = this.collectionStatus.get(groupId);
    if (!memberStatus) {
      return { collected: 0, total: 0, percentage: 100 };
    }

    let collected = 0;
    for (const status of memberStatus.values()) {
      if (status) collected++;
    }

    const total = memberStatus.size;
    const percentage = total > 0 ? Math.round((collected / total) * 100) : 100;

    return { collected, total, percentage };
  }

  /**
   * Resets collection for rekey
   */
  resetForRekey(groupId: string): void {
    const memberStatus = this.collectionStatus.get(groupId);
    if (!memberStatus) return;

    for (const memberKey of memberStatus.keys()) {
      memberStatus.set(memberKey, false);
    }

    logger.debug("Key collection reset for rekey", { groupId });
  }

  /**
   * Removes group tracking
   */
  removeGroup(groupId: string): void {
    this.collectionStatus.delete(groupId);
  }

  /**
   * Clears all state
   */
  clear(): void {
    this.collectionStatus.clear();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a group key distributor
 */
export function createGroupKeyDistributor(
  pairwiseEncryptor: PairwiseEncryptor,
  localUserId: string,
  localDeviceId: string,
  options?: {
    bundleFetcher?: PreKeyBundleFetcher;
    messageSender?: DistributionMessageSender;
  },
): GroupKeyDistributor {
  return new GroupKeyDistributor(
    pairwiseEncryptor,
    localUserId,
    localDeviceId,
    options,
  );
}

/**
 * Creates a group key collector
 */
export function createGroupKeyCollector(
  localUserId: string,
  localDeviceId: string,
): GroupKeyCollector {
  return new GroupKeyCollector(localUserId, localDeviceId);
}

// ============================================================================
// Exports
// ============================================================================

export default GroupKeyDistributor;
