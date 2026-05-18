/**
 * Group End-to-End Encryption Service
 *
 * High-level service for E2EE group messaging operations.
 * Integrates sender keys, group sessions, and key distribution
 * for scalable group encryption.
 *
 * Features:
 * - Efficient O(1) encryption per message using sender keys
 * - Automatic key distribution to group members
 * - Join/leave rekey operations for forward/backward secrecy
 * - Integration with pairwise E2EE for key distribution
 * - Comprehensive event handling
 * - Persistence support
 *
 * Security guarantees:
 * - New members cannot decrypt past messages (backward secrecy)
 * - Leaving members cannot decrypt future messages (forward secrecy)
 * - Sender authentication via signatures
 * - Key rotation on membership changes
 */

import { logger } from "@/lib/logger";
import {
  GroupSession,
  GroupSessionManager,
  createGroupSessionManager,
  type GroupMember,
  type GroupSessionEvent,
  type GroupSessionEventType,
  type RekeyResult,
  type SerializedGroupSession,
} from "@/lib/e2ee/group-session";
import {
  GroupKeyDistributor,
  GroupKeyCollector,
  createGroupKeyDistributor,
  createGroupKeyCollector,
  type DistributionResult,
  type BatchDistributionResult,
  type EncryptedDistributionMessage,
  type PairwiseEncryptor,
  type PreKeyBundleFetcher,
  type DistributionMessageSender,
} from "@/lib/e2ee/group-key-distribution";
import type {
  SenderKeyDistributionMessage,
  SenderKeyEncryptedMessage,
} from "@/lib/e2ee/sender-key";

// ============================================================================
// Types
// ============================================================================

/**
 * Group E2EE service configuration
 */
export interface GroupE2EEConfig {
  /** Local user ID */
  userId: string;
  /** Local device ID */
  deviceId: string;
  /** Pairwise E2EE encryptor for key distribution */
  pairwiseEncryptor: PairwiseEncryptor;
  /** Storage provider for persistence */
  storage?: Storage;
  /** Pre-key bundle fetcher for creating pairwise sessions */
  bundleFetcher?: PreKeyBundleFetcher;
  /** Message sender for distribution messages */
  messageSender?: DistributionMessageSender;
  /** Auto-distribute keys on member join */
  autoDistributeOnJoin?: boolean;
  /** Auto-rekey on member leave */
  autoRekeyOnLeave?: boolean;
  /** Callback for rekey events */
  onRekeyRequired?: (groupId: string, reason: string) => Promise<void>;
  /** Callback for key distribution events */
  onDistributionComplete?: (
    groupId: string,
    result: BatchDistributionResult,
  ) => void;
}

/**
 * Group message for transmission
 */
export interface GroupTransmittableMessage {
  /** Message type identifier */
  type: "group_message";
  /** Group ID */
  groupId: string;
  /** Sender user ID */
  senderUserId: string;
  /** Sender device ID */
  senderDeviceId: string;
  /** Encrypted content */
  encryptedMessage: SenderKeyEncryptedMessage;
  /** Message ID */
  messageId: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Decrypted group message result
 */
export interface DecryptedGroupMessage {
  /** Plaintext content */
  content: string;
  /** Group ID */
  groupId: string;
  /** Sender user ID */
  senderUserId: string;
  /** Sender device ID */
  senderDeviceId: string;
  /** Message ID */
  messageId: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Group info for display
 */
export interface GroupInfo {
  /** Group ID */
  groupId: string;
  /** Group name */
  groupName: string;
  /** Number of members */
  memberCount: number;
  /** Current epoch */
  epoch: number;
  /** Whether session is active */
  isActive: boolean;
  /** Created timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Members missing sender keys */
  membersMissingSenderKeys: number;
  /** Pending key distributions */
  pendingDistributions: number;
}

/**
 * Group E2EE service status
 */
export interface GroupE2EEStatus {
  /** Whether service is initialized */
  initialized: boolean;
  /** User ID */
  userId: string | null;
  /** Device ID */
  deviceId: string | null;
  /** Number of active groups */
  activeGroups: number;
  /** Total members across all groups */
  totalMembers: number;
  /** Groups needing rekey */
  groupsNeedingRekey: number;
}

/**
 * Service event types
 */
export type GroupE2EEEventType =
  | GroupSessionEventType
  | "distribution_started"
  | "distribution_completed"
  | "distribution_failed"
  | "key_received"
  | "message_encrypted"
  | "message_decrypted"
  | "error";

/**
 * Service event
 */
export interface GroupE2EEEvent {
  type: GroupE2EEEventType;
  groupId?: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique message ID
 */
function generateMessageId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================================
// Group E2EE Service
// ============================================================================

/**
 * Main service for group end-to-end encryption
 */
export class GroupE2EEService {
  private config: GroupE2EEConfig;
  private sessionManager: GroupSessionManager | null = null;
  private keyDistributor: GroupKeyDistributor | null = null;
  private keyCollector: GroupKeyCollector | null = null;
  private initialized = false;
  private eventListeners: Map<
    GroupE2EEEventType,
    Array<(event: GroupE2EEEvent) => void>
  > = new Map();

  constructor(config: GroupE2EEConfig) {
    this.config = {
      ...config,
      autoDistributeOnJoin: config.autoDistributeOnJoin ?? true,
      autoRekeyOnLeave: config.autoRekeyOnLeave ?? true,
    };
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initializes the group E2EE service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn("Group E2EE service already initialized");
      return;
    }

    try {
      // Initialize session manager
      this.sessionManager = createGroupSessionManager(
        this.config.userId,
        this.config.deviceId,
        this.config.storage,
      );

      // Initialize key distributor
      this.keyDistributor = createGroupKeyDistributor(
        this.config.pairwiseEncryptor,
        this.config.userId,
        this.config.deviceId,
        {
          bundleFetcher: this.config.bundleFetcher,
          messageSender: this.config.messageSender,
        },
      );

      // Initialize key collector
      this.keyCollector = createGroupKeyCollector(
        this.config.userId,
        this.config.deviceId,
      );

      // Load persisted sessions
      if (this.config.storage) {
        await this.sessionManager.loadFromStorage();
      }

      this.initialized = true;

      logger.info("Group E2EE service initialized", {
        userId: this.config.userId,
        deviceId: this.config.deviceId,
      });
    } catch (error) {
      logger.error("Failed to initialize group E2EE service", { error });
      throw error;
    }
  }

  /**
   * Checks if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets service status
   */
  getStatus(): GroupE2EEStatus {
    if (!this.initialized || !this.sessionManager) {
      return {
        initialized: false,
        userId: null,
        deviceId: null,
        activeGroups: 0,
        totalMembers: 0,
        groupsNeedingRekey: 0,
      };
    }

    const sessions = this.sessionManager.getAllSessions();
    let totalMembers = 0;
    let groupsNeedingRekey = 0;

    for (const session of sessions) {
      totalMembers += session.getMembers().length;
      if (session.needsRekey()) {
        groupsNeedingRekey++;
      }
    }

    return {
      initialized: true,
      userId: this.config.userId,
      deviceId: this.config.deviceId,
      activeGroups: sessions.length,
      totalMembers,
      groupsNeedingRekey,
    };
  }

  // ==========================================================================
  // Group Management
  // ==========================================================================

  /**
   * Creates a new encrypted group
   */
  async createGroup(
    groupId: string,
    groupName: string,
    initialMembers?: Array<{
      userId: string;
      deviceId: string;
      role?: "admin" | "member";
    }>,
  ): Promise<GroupInfo> {
    this.ensureInitialized();

    const session = await this.sessionManager!.createSession(
      groupId,
      groupName,
      initialMembers,
    );

    // Initialize key collection
    this.keyCollector!.initializeGroup(groupId, session.getMembers());

    // Distribute sender key to initial members
    if (
      this.config.autoDistributeOnJoin &&
      initialMembers &&
      initialMembers.length > 0
    ) {
      const distributionMessage = session.getDistributionMessage();
      if (distributionMessage) {
        const membersToDistribute = session.getMembersNeedingSenderKey();
        this.emitEvent("distribution_started", {
          groupId,
          memberCount: membersToDistribute.length,
        });

        this.distributeKeys(
          groupId,
          distributionMessage,
          membersToDistribute,
        ).catch((error) => {
          logger.error("Auto-distribution failed", { groupId, error });
          this.emitEvent("distribution_failed", {
            groupId,
            error: String(error),
          });
        });
      }
    }

    logger.info("Group created", {
      groupId,
      groupName,
      memberCount: session.getMembers().length,
    });

    return this.getGroupInfo(groupId)!;
  }

  /**
   * Joins an existing group (processes initial sender keys)
   */
  async joinGroup(
    groupId: string,
    groupName: string,
    existingMembers: Array<{
      userId: string;
      deviceId: string;
      role?: "admin" | "member";
    }>,
  ): Promise<GroupInfo> {
    this.ensureInitialized();

    // Create session for the group
    const session = await this.sessionManager!.createSession(
      groupId,
      groupName,
      existingMembers,
    );

    // Initialize key collection
    this.keyCollector!.initializeGroup(groupId, session.getMembers());

    // Our sender key distribution will be handled when we receive member's keys
    // or when we send our first message

    logger.info("Joined group", {
      groupId,
      memberCount: session.getMembers().length,
    });

    return this.getGroupInfo(groupId)!;
  }

  /**
   * Leaves a group
   */
  async leaveGroup(groupId: string): Promise<void> {
    this.ensureInitialized();

    const session = this.sessionManager!.getSession(groupId);
    if (!session) {
      return;
    }

    session.close();
    this.keyCollector!.removeGroup(groupId);
    this.keyDistributor!.clearStatus(groupId);

    logger.info("Left group", { groupId });
  }

  /**
   * Gets group info
   */
  getGroupInfo(groupId: string): GroupInfo | null {
    this.ensureInitialized();

    const session = this.sessionManager!.getSession(groupId);
    if (!session) {
      return null;
    }

    const state = session.serializeState();

    return {
      groupId: state.groupId,
      groupName: state.groupName,
      memberCount: state.members.length,
      epoch: state.epoch,
      isActive: state.isActive,
      createdAt: state.createdAt,
      lastActivityAt: state.lastActivityAt,
      membersMissingSenderKeys: session.getMembersMissingSenderKey().length,
      pendingDistributions: this.keyDistributor!.getPendingRequests().filter(
        (r) => r.groupId === groupId,
      ).length,
    };
  }

  /**
   * Gets all groups
   */
  getAllGroups(): GroupInfo[] {
    this.ensureInitialized();

    const sessions = this.sessionManager!.getAllSessions();
    const groups: GroupInfo[] = [];

    for (const session of sessions) {
      const info = this.getGroupInfo(session.getGroupId());
      if (info) {
        groups.push(info);
      }
    }

    return groups;
  }

  // ==========================================================================
  // Member Management
  // ==========================================================================

  /**
   * Adds a member to a group
   */
  async addMember(
    groupId: string,
    userId: string,
    deviceId: string,
    role: "admin" | "member" = "member",
  ): Promise<void> {
    this.ensureInitialized();

    const session = this.sessionManager!.getSession(groupId);
    if (!session) {
      throw new Error(`Group ${groupId} not found`);
    }

    const result = session.addMember(userId, deviceId, role);
    this.keyCollector!.addMember(groupId, userId, deviceId);

    // Distribute our sender key to the new member
    if (this.config.autoDistributeOnJoin) {
      const distributionMessage = session.getDistributionMessage();
      if (distributionMessage) {
        const member = session.getMember(userId, deviceId);
        if (member) {
          this.distributeKeys(groupId, distributionMessage, [member]).catch(
            (error) => {
              logger.error("Failed to distribute key to new member", {
                groupId,
                userId,
                error,
              });
            },
          );
        }
      }
    }

    logger.info("Member added to group", { groupId, userId, deviceId, role });
  }

  /**
   * Removes a member from a group
   */
  async removeMember(
    groupId: string,
    userId: string,
    deviceId: string,
  ): Promise<void> {
    this.ensureInitialized();

    const session = this.sessionManager!.getSession(groupId);
    if (!session) {
      throw new Error(`Group ${groupId} not found`);
    }

    const result = await session.removeMember(userId, deviceId);
    this.keyCollector!.removeMember(groupId, userId, deviceId);

    // Rekey if required (to prevent removed member from decrypting future messages)
    if (result.requiresRekey && this.config.autoRekeyOnLeave) {
      await this.rekey(groupId, "member_removed");
    }

    logger.info("Member removed from group", { groupId, userId, deviceId });
  }

  /**
   * Gets members of a group
   */
  getMembers(groupId: string): GroupMember[] {
    this.ensureInitialized();

    const session = this.sessionManager!.getSession(groupId);
    if (!session) {
      return [];
    }

    return session.getMembers();
  }

  // ==========================================================================
  // Key Distribution
  // ==========================================================================

  /**
   * Distributes sender key to members
   */
  async distributeKeys(
    groupId: string,
    distributionMessage: SenderKeyDistributionMessage,
    members: GroupMember[],
  ): Promise<BatchDistributionResult> {
    this.ensureInitialized();

    const result = await this.keyDistributor!.distribute(
      groupId,
      distributionMessage,
      members,
      false,
    );

    // Update session with distribution results
    const session = this.sessionManager!.getSession(groupId);
    if (session) {
      for (const r of result.results) {
        if (r.success) {
          session.markSenderKeyDistributed(r.userId, r.deviceId);
        }
      }
    }

    if (this.config.onDistributionComplete) {
      this.config.onDistributionComplete(groupId, result);
    }

    this.emitEvent("distribution_completed", {
      groupId,
      successCount: result.successCount,
      failedCount: result.failedCount,
    });

    return result;
  }

  /**
   * Processes a received sender key distribution
   */
  async processReceivedDistribution(
    message: EncryptedDistributionMessage,
  ): Promise<void> {
    this.ensureInitialized();

    // Decrypt the distribution message
    const distributionMessage =
      await this.keyDistributor!.processReceivedDistribution(message);

    // Get the session
    const session = this.sessionManager!.getSession(message.groupId);
    if (!session) {
      logger.warn("Received sender key for unknown group", {
        groupId: message.groupId,
      });
      return;
    }

    // Process the sender key
    await session.processSenderKeyDistribution(distributionMessage);

    // Update key collector
    this.keyCollector!.markCollected(
      message.groupId,
      message.senderUserId,
      message.senderDeviceId,
    );

    this.emitEvent("key_received", {
      groupId: message.groupId,
      senderUserId: message.senderUserId,
    });

    logger.debug("Processed received sender key", {
      groupId: message.groupId,
      senderUserId: message.senderUserId,
      keyId: distributionMessage.keyId,
    });
  }

  /**
   * Gets the current distribution message for a group
   */
  getDistributionMessage(groupId: string): SenderKeyDistributionMessage | null {
    this.ensureInitialized();

    const session = this.sessionManager!.getSession(groupId);
    if (!session) {
      return null;
    }

    return session.getDistributionMessage();
  }

  // ==========================================================================
  // Rekey Operations
  // ==========================================================================

  /**
   * Performs a rekey operation for a group
   */
  async rekey(groupId: string, reason?: string): Promise<RekeyResult> {
    this.ensureInitialized();

    const session = this.sessionManager!.getSession(groupId);
    if (!session) {
      throw new Error(`Group ${groupId} not found`);
    }

    if (this.config.onRekeyRequired) {
      await this.config.onRekeyRequired(groupId, reason ?? "manual");
    }

    const result = await session.rekey(reason);

    // Reset key collector for rekey
    this.keyCollector!.resetForRekey(groupId);

    // Distribute new sender key to all members
    if (result.membersToDistribute.length > 0) {
      this.emitEvent("distribution_started", {
        groupId,
        memberCount: result.membersToDistribute.length,
        reason: "rekey",
      });

      this.distributeKeys(
        groupId,
        result.distributionMessage,
        result.membersToDistribute,
      ).catch((error) => {
        logger.error("Failed to distribute rekey", { groupId, error });
        this.emitEvent("distribution_failed", {
          groupId,
          error: String(error),
        });
      });
    }

    logger.info("Group rekeyed", {
      groupId,
      epoch: result.epoch,
      reason,
      membersToDistribute: result.membersToDistribute.length,
    });

    return result;
  }

  /**
   * Checks if a group needs rekey
   */
  needsRekey(groupId: string): boolean {
    this.ensureInitialized();

    const session = this.sessionManager!.getSession(groupId);
    return session?.needsRekey() ?? false;
  }

  // ==========================================================================
  // Message Encryption/Decryption
  // ==========================================================================

  /**
   * Encrypts a message for a group
   */
  async encryptMessage(
    groupId: string,
    plaintext: string,
  ): Promise<GroupTransmittableMessage> {
    this.ensureInitialized();

    const session = this.sessionManager!.getSession(groupId);
    if (!session) {
      throw new Error(`Group ${groupId} not found`);
    }

    if (!session.isInitialized()) {
      throw new Error(`Group ${groupId} session not initialized`);
    }

    // Check if rekey is needed
    if (session.needsRekey()) {
      await this.rekey(groupId, "chain_exhausted");
    }

    const plaintextBytes = new TextEncoder().encode(plaintext);
    const encryptedMessage = await session.encrypt(plaintextBytes);

    const messageId = generateMessageId();

    const transmittable: GroupTransmittableMessage = {
      type: "group_message",
      groupId,
      senderUserId: this.config.userId,
      senderDeviceId: this.config.deviceId,
      encryptedMessage,
      messageId,
      timestamp: Date.now(),
    };

    this.emitEvent("message_encrypted", { groupId, messageId });

    logger.debug("Group message encrypted", { groupId, messageId });

    return transmittable;
  }

  /**
   * Decrypts a group message
   */
  async decryptMessage(
    message: GroupTransmittableMessage,
  ): Promise<DecryptedGroupMessage> {
    this.ensureInitialized();

    const session = this.sessionManager!.getSession(message.groupId);
    if (!session) {
      throw new Error(`Group ${message.groupId} not found`);
    }

    // Check if we have the sender's key
    if (
      !session.canDecryptFrom(
        message.senderUserId,
        message.senderDeviceId,
        message.encryptedMessage.keyId,
      )
    ) {
      throw new Error(
        `Missing sender key for ${message.senderUserId}:${message.senderDeviceId} key ${message.encryptedMessage.keyId}`,
      );
    }

    const plaintextBytes = await session.decrypt(message.encryptedMessage);
    const plaintext = new TextDecoder().decode(plaintextBytes);

    const decrypted: DecryptedGroupMessage = {
      content: plaintext,
      groupId: message.groupId,
      senderUserId: message.senderUserId,
      senderDeviceId: message.senderDeviceId,
      messageId: message.messageId,
      timestamp: message.timestamp,
    };

    this.emitEvent("message_decrypted", {
      groupId: message.groupId,
      messageId: message.messageId,
      senderUserId: message.senderUserId,
    });

    logger.debug("Group message decrypted", {
      groupId: message.groupId,
      messageId: message.messageId,
    });

    return decrypted;
  }

  /**
   * Checks if we can decrypt messages from a sender
   */
  canDecryptFrom(
    groupId: string,
    userId: string,
    deviceId: string,
    keyId: number,
  ): boolean {
    this.ensureInitialized();

    const session = this.sessionManager!.getSession(groupId);
    return session?.canDecryptFrom(userId, deviceId, keyId) ?? false;
  }

  // ==========================================================================
  // Key Collection Status
  // ==========================================================================

  /**
   * Gets key collection progress for a group
   */
  getKeyCollectionProgress(groupId: string): {
    collected: number;
    total: number;
    percentage: number;
    missingMembers: Array<{ userId: string; deviceId: string }>;
  } {
    this.ensureInitialized();

    const progress = this.keyCollector!.getProgress(groupId);
    const missingMembers = this.keyCollector!.getMissingKeys(groupId);

    return {
      ...progress,
      missingMembers,
    };
  }

  /**
   * Checks if all keys are collected for a group
   */
  isKeyCollectionComplete(groupId: string): boolean {
    this.ensureInitialized();
    return this.keyCollector!.isComplete(groupId);
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * Subscribes to service events
   */
  on(
    eventType: GroupE2EEEventType,
    callback: (event: GroupE2EEEvent) => void,
  ): () => void {
    const listeners = this.eventListeners.get(eventType) ?? [];
    listeners.push(callback);
    this.eventListeners.set(eventType, listeners);

    return () => {
      const current = this.eventListeners.get(eventType) ?? [];
      this.eventListeners.set(
        eventType,
        current.filter((l) => l !== callback),
      );
    };
  }

  /**
   * Emits an event
   */
  private emitEvent(
    type: GroupE2EEEventType,
    data?: Record<string, unknown>,
  ): void {
    const event: GroupE2EEEvent = {
      type,
      groupId: data?.groupId as string | undefined,
      timestamp: Date.now(),
      data,
    };

    const listeners = this.eventListeners.get(type) ?? [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error("Event listener error", { type, error });
      }
    }
  }

  // ==========================================================================
  // Maintenance
  // ==========================================================================

  /**
   * Performs maintenance tasks
   */
  async performMaintenance(): Promise<void> {
    this.ensureInitialized();

    // Cleanup expired sessions
    const expiredGroups = await this.sessionManager!.cleanupExpiredSessions();

    // Clean up collector and distributor state for expired groups
    for (const groupId of expiredGroups) {
      this.keyCollector!.removeGroup(groupId);
      this.keyDistributor!.clearStatus(groupId);
    }

    // Check for groups needing rekey
    const sessions = this.sessionManager!.getAllSessions();
    for (const session of sessions) {
      if (session.needsRekey()) {
        logger.warn("Group needs rekey during maintenance", {
          groupId: session.getGroupId(),
        });
      }
    }

    logger.info("Group E2EE maintenance completed", {
      expiredGroups: expiredGroups.length,
    });
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroys the service
   */
  destroy(): void {
    if (this.sessionManager) {
      this.sessionManager.destroy();
      this.sessionManager = null;
    }

    if (this.keyDistributor) {
      this.keyDistributor.clear();
      this.keyDistributor = null;
    }

    if (this.keyCollector) {
      this.keyCollector.clear();
      this.keyCollector = null;
    }

    this.eventListeners.clear();
    this.initialized = false;

    logger.info("Group E2EE service destroyed");
  }

  /**
   * Clears all data
   */
  clearAllData(): void {
    this.destroy();

    // Clear storage
    if (this.config.storage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < this.config.storage.length; i++) {
        const key = this.config.storage.key(i);
        if (key?.startsWith("nchat_group_session_")) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        this.config.storage.removeItem(key);
      }
    }

    logger.info("Group E2EE data cleared");
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Ensures service is initialized
   */
  private ensureInitialized(): void {
    if (
      !this.initialized ||
      !this.sessionManager ||
      !this.keyDistributor ||
      !this.keyCollector
    ) {
      throw new Error(
        "Group E2EE service not initialized. Call initialize() first.",
      );
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates and initializes a group E2EE service
 */
export async function createGroupE2EEService(
  config: GroupE2EEConfig,
): Promise<GroupE2EEService> {
  const service = new GroupE2EEService(config);
  await service.initialize();
  return service;
}

// ============================================================================
// Singleton Management
// ============================================================================

let groupE2EEServiceInstance: GroupE2EEService | null = null;

/**
 * Gets or creates the group E2EE service singleton
 */
export async function getGroupE2EEService(
  config?: GroupE2EEConfig,
): Promise<GroupE2EEService> {
  if (!groupE2EEServiceInstance && config) {
    groupE2EEServiceInstance = await createGroupE2EEService(config);
  }

  if (!groupE2EEServiceInstance) {
    throw new Error(
      "Group E2EE service not configured. Provide config on first call.",
    );
  }

  return groupE2EEServiceInstance;
}

/**
 * Resets the group E2EE service singleton
 */
export function resetGroupE2EEService(): void {
  if (groupE2EEServiceInstance) {
    groupE2EEServiceInstance.destroy();
    groupE2EEServiceInstance = null;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default GroupE2EEService;
