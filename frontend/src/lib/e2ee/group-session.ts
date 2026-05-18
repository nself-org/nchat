/**
 * Group Session Management for Group E2EE
 *
 * Manages encrypted group sessions including:
 * - Group membership tracking
 * - Sender key lifecycle management
 * - Join/leave rekey operations
 * - Group state persistence
 *
 * Security properties:
 * - New members cannot decrypt past messages (no backward access)
 * - Leaving members cannot decrypt future messages (no forward access)
 * - Group key rotation on membership changes
 * - Sender key distribution tracking
 *
 * Uses Web Crypto API for all cryptographic operations.
 */

import { logger } from "@/lib/logger";
import {
  SenderKey,
  SenderKeyReceiver,
  createSenderKey,
  createSenderKeyReceiver,
  type SenderKeyDistributionMessage,
  type SenderKeyEncryptedMessage,
  type SerializedSenderKeyState,
  type SerializedStoredSenderKey,
} from "./sender-key";

// ============================================================================
// Constants
// ============================================================================

/** Maximum group members */
const MAX_GROUP_MEMBERS = 1000;

/** Session expiry time (30 days) */
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

/** Rekey interval (7 days) */
const REKEY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================================================
// Types
// ============================================================================

/**
 * Group member information
 */
export interface GroupMember {
  /** User ID */
  userId: string;
  /** Device ID */
  deviceId: string;
  /** Member role */
  role: "admin" | "member";
  /** When the member joined */
  joinedAt: number;
  /** Whether we have distributed our sender key to them */
  hasSenderKey: boolean;
  /** Whether we have received their sender key */
  hasReceivedSenderKey: boolean;
  /** Last activity timestamp */
  lastActiveAt: number;
}

/**
 * Group session state
 */
export interface GroupSessionState {
  /** Group ID */
  groupId: string;
  /** Group name */
  groupName: string;
  /** Group members */
  members: Map<string, GroupMember>;
  /** Our sender key for this group */
  senderKey: SenderKey | null;
  /** Receiver for other members' sender keys */
  senderKeyReceiver: SenderKeyReceiver;
  /** Current epoch (incremented on rekey) */
  epoch: number;
  /** Local user ID */
  localUserId: string;
  /** Local device ID */
  localDeviceId: string;
  /** Session creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Last rekey timestamp */
  lastRekeyAt: number;
  /** Whether the session is active */
  isActive: boolean;
}

/**
 * Group session events
 */
export type GroupSessionEventType =
  | "member_joined"
  | "member_left"
  | "member_removed"
  | "rekey_started"
  | "rekey_completed"
  | "sender_key_received"
  | "sender_key_distributed"
  | "session_expired"
  | "session_closed";

/**
 * Group session event
 */
export interface GroupSessionEvent {
  type: GroupSessionEventType;
  groupId: string;
  timestamp: number;
  data?: {
    userId?: string;
    deviceId?: string;
    epoch?: number;
    reason?: string;
  };
}

/**
 * Pending sender key distribution
 */
export interface PendingSenderKeyDistribution {
  /** Target user ID */
  targetUserId: string;
  /** Target device ID */
  targetDeviceId: string;
  /** Distribution message */
  distributionMessage: SenderKeyDistributionMessage;
  /** Created timestamp */
  createdAt: number;
  /** Retry count */
  retryCount: number;
}

/**
 * Serialized group session for storage
 */
export interface SerializedGroupSession {
  groupId: string;
  groupName: string;
  members: Array<{
    key: string;
    value: GroupMember;
  }>;
  senderKey: SerializedSenderKeyState | null;
  senderKeyReceiver: SerializedStoredSenderKey[];
  epoch: number;
  localUserId: string;
  localDeviceId: string;
  createdAt: number;
  lastActivityAt: number;
  lastRekeyAt: number;
  isActive: boolean;
}

/**
 * Rekey result
 */
export interface RekeyResult {
  /** New epoch number */
  epoch: number;
  /** Members who need the new sender key */
  membersToDistribute: GroupMember[];
  /** New distribution message */
  distributionMessage: SenderKeyDistributionMessage;
}

/**
 * Member change result
 */
export interface MemberChangeResult {
  /** Whether rekey is required */
  requiresRekey: boolean;
  /** Reason for rekey */
  rekeyReason?: string;
  /** Members affected */
  affectedMembers: string[];
}

// ============================================================================
// Group Session Class
// ============================================================================

/**
 * Manages an encrypted group session
 */
export class GroupSession {
  private state: GroupSessionState;
  private eventListeners: Map<
    GroupSessionEventType,
    Array<(event: GroupSessionEvent) => void>
  > = new Map();
  private pendingDistributions: Map<string, PendingSenderKeyDistribution> =
    new Map();

  constructor(
    groupId: string,
    groupName: string,
    localUserId: string,
    localDeviceId: string,
  ) {
    this.state = {
      groupId,
      groupName,
      members: new Map(),
      senderKey: null,
      senderKeyReceiver: createSenderKeyReceiver(),
      epoch: 0,
      localUserId,
      localDeviceId,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      lastRekeyAt: 0,
      isActive: true,
    };
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initializes the group session with sender key
   */
  async initialize(): Promise<SenderKeyDistributionMessage> {
    if (this.state.senderKey) {
      throw new Error("Group session already initialized");
    }

    this.state.senderKey = await createSenderKey(
      this.state.groupId,
      this.state.localUserId,
      this.state.localDeviceId,
    );
    this.state.lastRekeyAt = Date.now();

    logger.info("Group session initialized", {
      groupId: this.state.groupId,
      epoch: this.state.epoch,
    });

    return this.state.senderKey.createDistributionMessage();
  }

  /**
   * Gets whether the session is initialized
   */
  isInitialized(): boolean {
    return (
      this.state.senderKey !== null && this.state.senderKey.isInitialized()
    );
  }

  /**
   * Gets the group ID
   */
  getGroupId(): string {
    return this.state.groupId;
  }

  /**
   * Gets the current epoch
   */
  getEpoch(): number {
    return this.state.epoch;
  }

  /**
   * Gets whether the session is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  // ==========================================================================
  // Member Management
  // ==========================================================================

  /**
   * Adds a new member to the group
   */
  addMember(
    userId: string,
    deviceId: string,
    role: "admin" | "member" = "member",
  ): MemberChangeResult {
    if (this.state.members.size >= MAX_GROUP_MEMBERS) {
      throw new Error(`Group member limit reached (${MAX_GROUP_MEMBERS})`);
    }

    const memberKey = `${userId}:${deviceId}`;

    if (this.state.members.has(memberKey)) {
      return {
        requiresRekey: false,
        affectedMembers: [],
      };
    }

    const member: GroupMember = {
      userId,
      deviceId,
      role,
      joinedAt: Date.now(),
      hasSenderKey: false,
      hasReceivedSenderKey: false,
      lastActiveAt: Date.now(),
    };

    this.state.members.set(memberKey, member);
    this.state.lastActivityAt = Date.now();

    this.emitEvent("member_joined", { userId, deviceId });

    logger.debug("Member added to group", {
      groupId: this.state.groupId,
      userId,
      deviceId,
    });

    // New member needs our sender key
    return {
      requiresRekey: false, // No rekey for adding members
      affectedMembers: [memberKey],
    };
  }

  /**
   * Removes a member from the group
   */
  async removeMember(
    userId: string,
    deviceId: string,
  ): Promise<MemberChangeResult> {
    const memberKey = `${userId}:${deviceId}`;

    if (!this.state.members.has(memberKey)) {
      return {
        requiresRekey: false,
        affectedMembers: [],
      };
    }

    this.state.members.delete(memberKey);
    this.state.lastActivityAt = Date.now();

    // Remove their sender keys
    this.state.senderKeyReceiver.removeSenderKeys(
      this.state.groupId,
      userId,
      deviceId,
    );

    // Remove pending distributions to them
    this.pendingDistributions.delete(memberKey);

    this.emitEvent("member_removed", { userId, deviceId, reason: "removed" });

    logger.debug("Member removed from group", {
      groupId: this.state.groupId,
      userId,
      deviceId,
    });

    // Rekey is required when a member leaves to prevent them from decrypting future messages
    return {
      requiresRekey: true,
      rekeyReason: "member_removed",
      affectedMembers: [memberKey],
    };
  }

  /**
   * Handles a member leaving the group voluntarily
   */
  async memberLeft(
    userId: string,
    deviceId: string,
  ): Promise<MemberChangeResult> {
    const result = await this.removeMember(userId, deviceId);

    if (result.requiresRekey) {
      this.emitEvent("member_left", { userId, deviceId });
    }

    return result;
  }

  /**
   * Gets a member by user ID and device ID
   */
  getMember(userId: string, deviceId: string): GroupMember | undefined {
    return this.state.members.get(`${userId}:${deviceId}`);
  }

  /**
   * Gets all members
   */
  getMembers(): GroupMember[] {
    return Array.from(this.state.members.values());
  }

  /**
   * Gets members who need our sender key
   */
  getMembersNeedingSenderKey(): GroupMember[] {
    return Array.from(this.state.members.values()).filter(
      (m) =>
        !m.hasSenderKey &&
        !(
          m.userId === this.state.localUserId &&
          m.deviceId === this.state.localDeviceId
        ),
    );
  }

  /**
   * Gets members whose sender key we haven't received
   */
  getMembersMissingSenderKey(): GroupMember[] {
    return Array.from(this.state.members.values()).filter(
      (m) =>
        !m.hasReceivedSenderKey &&
        !(
          m.userId === this.state.localUserId &&
          m.deviceId === this.state.localDeviceId
        ),
    );
  }

  /**
   * Marks a member as having received our sender key
   */
  markSenderKeyDistributed(userId: string, deviceId: string): void {
    const memberKey = `${userId}:${deviceId}`;
    const member = this.state.members.get(memberKey);

    if (member) {
      member.hasSenderKey = true;
      this.pendingDistributions.delete(memberKey);

      this.emitEvent("sender_key_distributed", { userId, deviceId });

      logger.debug("Sender key distributed to member", {
        groupId: this.state.groupId,
        userId,
        deviceId,
      });
    }
  }

  /**
   * Marks a member as having their sender key received
   */
  markSenderKeyReceived(userId: string, deviceId: string): void {
    const memberKey = `${userId}:${deviceId}`;
    const member = this.state.members.get(memberKey);

    if (member) {
      member.hasReceivedSenderKey = true;

      this.emitEvent("sender_key_received", { userId, deviceId });

      logger.debug("Sender key received from member", {
        groupId: this.state.groupId,
        userId,
        deviceId,
      });
    }
  }

  // ==========================================================================
  // Rekey Operations
  // ==========================================================================

  /**
   * Performs a rekey operation (generates new sender key)
   */
  async rekey(reason?: string): Promise<RekeyResult> {
    this.emitEvent("rekey_started", { epoch: this.state.epoch, reason });

    // Destroy old sender key
    if (this.state.senderKey) {
      this.state.senderKey.destroy();
    }

    // Generate new sender key
    this.state.senderKey = await createSenderKey(
      this.state.groupId,
      this.state.localUserId,
      this.state.localDeviceId,
    );

    // Increment epoch
    this.state.epoch++;
    this.state.lastRekeyAt = Date.now();
    this.state.lastActivityAt = Date.now();

    // Reset distribution status for all members
    for (const member of this.state.members.values()) {
      if (
        member.userId !== this.state.localUserId ||
        member.deviceId !== this.state.localDeviceId
      ) {
        member.hasSenderKey = false;
      }
    }

    // Clear pending distributions
    this.pendingDistributions.clear();

    const distributionMessage =
      this.state.senderKey.createDistributionMessage();
    const membersToDistribute = this.getMembersNeedingSenderKey();

    this.emitEvent("rekey_completed", { epoch: this.state.epoch });

    logger.info("Group session rekeyed", {
      groupId: this.state.groupId,
      epoch: this.state.epoch,
      reason,
      membersToDistribute: membersToDistribute.length,
    });

    return {
      epoch: this.state.epoch,
      membersToDistribute,
      distributionMessage,
    };
  }

  /**
   * Checks if rekey is needed
   */
  needsRekey(): boolean {
    if (!this.state.senderKey) return true;
    if (this.state.senderKey.needsRekey()) return true;

    // Check if rekey interval has passed
    const timeSinceRekey = Date.now() - this.state.lastRekeyAt;
    if (timeSinceRekey > REKEY_INTERVAL_MS) return true;

    return false;
  }

  /**
   * Gets the sender key distribution message for the current key
   */
  getDistributionMessage(): SenderKeyDistributionMessage | null {
    if (!this.state.senderKey || !this.state.senderKey.isInitialized()) {
      return null;
    }
    return this.state.senderKey.createDistributionMessage();
  }

  // ==========================================================================
  // Sender Key Distribution
  // ==========================================================================

  /**
   * Queues a sender key distribution for a member
   */
  queueDistribution(
    targetUserId: string,
    targetDeviceId: string,
  ): PendingSenderKeyDistribution | null {
    if (!this.state.senderKey) {
      return null;
    }

    const memberKey = `${targetUserId}:${targetDeviceId}`;
    const existingDistribution = this.pendingDistributions.get(memberKey);

    if (existingDistribution) {
      return existingDistribution;
    }

    const distribution: PendingSenderKeyDistribution = {
      targetUserId,
      targetDeviceId,
      distributionMessage: this.state.senderKey.createDistributionMessage(),
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.pendingDistributions.set(memberKey, distribution);

    return distribution;
  }

  /**
   * Gets all pending distributions
   */
  getPendingDistributions(): PendingSenderKeyDistribution[] {
    return Array.from(this.pendingDistributions.values());
  }

  /**
   * Processes a received sender key distribution
   */
  async processSenderKeyDistribution(
    message: SenderKeyDistributionMessage,
  ): Promise<void> {
    if (message.groupId !== this.state.groupId) {
      throw new Error("Sender key distribution group ID mismatch");
    }

    await this.state.senderKeyReceiver.processSenderKeyDistribution(message);

    // Mark member as having their key received
    this.markSenderKeyReceived(message.senderUserId, message.senderDeviceId);
  }

  // ==========================================================================
  // Encryption/Decryption
  // ==========================================================================

  /**
   * Encrypts a message for the group
   */
  async encrypt(plaintext: Uint8Array): Promise<SenderKeyEncryptedMessage> {
    if (!this.state.senderKey || !this.state.senderKey.isInitialized()) {
      throw new Error("Group session not initialized");
    }

    if (!this.state.isActive) {
      throw new Error("Group session is not active");
    }

    this.state.lastActivityAt = Date.now();

    return this.state.senderKey.encrypt(plaintext);
  }

  /**
   * Decrypts a message from the group
   */
  async decrypt(message: SenderKeyEncryptedMessage): Promise<Uint8Array> {
    if (message.groupId !== this.state.groupId) {
      throw new Error("Message group ID mismatch");
    }

    if (!this.state.isActive) {
      throw new Error("Group session is not active");
    }

    this.state.lastActivityAt = Date.now();

    // Update member activity
    const memberKey = `${message.senderUserId}:${message.senderDeviceId}`;
    const member = this.state.members.get(memberKey);
    if (member) {
      member.lastActiveAt = Date.now();
    }

    return this.state.senderKeyReceiver.decrypt(message);
  }

  /**
   * Checks if we can decrypt messages from a specific sender
   */
  canDecryptFrom(userId: string, deviceId: string, keyId: number): boolean {
    return this.state.senderKeyReceiver.hasSenderKey(
      this.state.groupId,
      userId,
      deviceId,
      keyId,
    );
  }

  // ==========================================================================
  // Session Lifecycle
  // ==========================================================================

  /**
   * Checks if the session has expired
   */
  isExpired(): boolean {
    const timeSinceActivity = Date.now() - this.state.lastActivityAt;
    return timeSinceActivity > SESSION_EXPIRY_MS;
  }

  /**
   * Closes the session
   */
  close(): void {
    if (!this.state.isActive) return;

    this.state.isActive = false;

    this.emitEvent("session_closed", {});

    logger.info("Group session closed", {
      groupId: this.state.groupId,
      epoch: this.state.epoch,
    });
  }

  /**
   * Destroys the session and wipes all key material
   */
  destroy(): void {
    this.close();

    if (this.state.senderKey) {
      this.state.senderKey.destroy();
      this.state.senderKey = null;
    }

    this.state.senderKeyReceiver.destroy();
    this.state.members.clear();
    this.pendingDistributions.clear();
    this.eventListeners.clear();

    logger.debug("Group session destroyed", { groupId: this.state.groupId });
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Serializes the session state for storage
   */
  serializeState(): SerializedGroupSession {
    const members: Array<{ key: string; value: GroupMember }> = [];
    for (const [key, value] of this.state.members) {
      members.push({ key, value });
    }

    return {
      groupId: this.state.groupId,
      groupName: this.state.groupName,
      members,
      senderKey: this.state.senderKey?.serializeState() ?? null,
      senderKeyReceiver: this.state.senderKeyReceiver.serializeState(),
      epoch: this.state.epoch,
      localUserId: this.state.localUserId,
      localDeviceId: this.state.localDeviceId,
      createdAt: this.state.createdAt,
      lastActivityAt: this.state.lastActivityAt,
      lastRekeyAt: this.state.lastRekeyAt,
      isActive: this.state.isActive,
    };
  }

  /**
   * Deserializes the session state from storage
   */
  async deserializeState(serialized: SerializedGroupSession): Promise<void> {
    // Restore members
    this.state.members.clear();
    for (const { key, value } of serialized.members) {
      this.state.members.set(key, value);
    }

    // Restore sender key
    if (serialized.senderKey) {
      this.state.senderKey = new SenderKey();
      await this.state.senderKey.deserializeState(serialized.senderKey);
    }

    // Restore sender key receiver
    this.state.senderKeyReceiver.deserializeState(serialized.senderKeyReceiver);

    // Restore other state
    this.state.groupId = serialized.groupId;
    this.state.groupName = serialized.groupName;
    this.state.epoch = serialized.epoch;
    this.state.localUserId = serialized.localUserId;
    this.state.localDeviceId = serialized.localDeviceId;
    this.state.createdAt = serialized.createdAt;
    this.state.lastActivityAt = serialized.lastActivityAt;
    this.state.lastRekeyAt = serialized.lastRekeyAt;
    this.state.isActive = serialized.isActive;

    logger.debug("Group session state deserialized", {
      groupId: this.state.groupId,
      epoch: this.state.epoch,
      memberCount: this.state.members.size,
    });
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  /**
   * Subscribes to session events
   */
  on(
    eventType: GroupSessionEventType,
    callback: (event: GroupSessionEvent) => void,
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
    type: GroupSessionEventType,
    data?: GroupSessionEvent["data"],
  ): void {
    const event: GroupSessionEvent = {
      type,
      groupId: this.state.groupId,
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
}

// ============================================================================
// Group Session Manager
// ============================================================================

/**
 * Manages multiple group sessions
 */
export class GroupSessionManager {
  private sessions: Map<string, GroupSession> = new Map();
  private localUserId: string;
  private localDeviceId: string;
  private storage?: Storage;

  constructor(localUserId: string, localDeviceId: string, storage?: Storage) {
    this.localUserId = localUserId;
    this.localDeviceId = localDeviceId;
    this.storage = storage;
  }

  /**
   * Creates a new group session
   */
  async createSession(
    groupId: string,
    groupName: string,
    initialMembers?: Array<{
      userId: string;
      deviceId: string;
      role?: "admin" | "member";
    }>,
  ): Promise<GroupSession> {
    if (this.sessions.has(groupId)) {
      throw new Error(`Group session already exists for ${groupId}`);
    }

    const session = new GroupSession(
      groupId,
      groupName,
      this.localUserId,
      this.localDeviceId,
    );

    // Add self as a member
    session.addMember(this.localUserId, this.localDeviceId, "admin");

    // Add initial members
    if (initialMembers) {
      for (const member of initialMembers) {
        session.addMember(
          member.userId,
          member.deviceId,
          member.role ?? "member",
        );
      }
    }

    // Initialize sender key
    await session.initialize();

    this.sessions.set(groupId, session);

    // Persist if storage available
    await this.persistSession(session);

    logger.info("Group session created", {
      groupId,
      memberCount: session.getMembers().length,
    });

    return session;
  }

  /**
   * Gets an existing group session
   */
  getSession(groupId: string): GroupSession | undefined {
    return this.sessions.get(groupId);
  }

  /**
   * Gets all active sessions
   */
  getAllSessions(): GroupSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.isActive());
  }

  /**
   * Closes a group session
   */
  async closeSession(groupId: string): Promise<void> {
    const session = this.sessions.get(groupId);
    if (!session) return;

    session.close();
    await this.persistSession(session);

    logger.info("Group session closed via manager", { groupId });
  }

  /**
   * Removes a group session completely
   */
  removeSession(groupId: string): void {
    const session = this.sessions.get(groupId);
    if (session) {
      session.destroy();
      this.sessions.delete(groupId);

      // Remove from storage
      if (this.storage) {
        this.storage.removeItem(`nchat_group_session_${groupId}`);
      }

      logger.info("Group session removed", { groupId });
    }
  }

  /**
   * Cleans up expired sessions
   */
  async cleanupExpiredSessions(): Promise<string[]> {
    const expiredIds: string[] = [];

    for (const [groupId, session] of this.sessions) {
      if (session.isExpired()) {
        session.destroy();
        this.sessions.delete(groupId);
        expiredIds.push(groupId);

        if (this.storage) {
          this.storage.removeItem(`nchat_group_session_${groupId}`);
        }
      }
    }

    if (expiredIds.length > 0) {
      logger.info("Cleaned up expired group sessions", {
        count: expiredIds.length,
      });
    }

    return expiredIds;
  }

  /**
   * Persists a session to storage
   */
  private async persistSession(session: GroupSession): Promise<void> {
    if (!this.storage) return;

    const serialized = session.serializeState();
    this.storage.setItem(
      `nchat_group_session_${session.getGroupId()}`,
      JSON.stringify(serialized),
    );
  }

  /**
   * Loads sessions from storage
   */
  async loadFromStorage(): Promise<number> {
    if (!this.storage) return 0;

    let loadedCount = 0;
    const prefix = "nchat_group_session_";

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (!key?.startsWith(prefix)) continue;

      try {
        const data = this.storage.getItem(key);
        if (!data) continue;

        const serialized: SerializedGroupSession = JSON.parse(data);

        const session = new GroupSession(
          serialized.groupId,
          serialized.groupName,
          this.localUserId,
          this.localDeviceId,
        );
        await session.deserializeState(serialized);

        this.sessions.set(serialized.groupId, session);
        loadedCount++;
      } catch (error) {
        logger.error("Failed to load group session from storage", {
          key,
          error,
        });
      }
    }

    logger.info("Loaded group sessions from storage", { count: loadedCount });

    return loadedCount;
  }

  /**
   * Destroys all sessions
   */
  destroy(): void {
    for (const session of this.sessions.values()) {
      session.destroy();
    }
    this.sessions.clear();
    logger.debug("Group session manager destroyed");
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a group session
 */
export async function createGroupSession(
  groupId: string,
  groupName: string,
  localUserId: string,
  localDeviceId: string,
): Promise<GroupSession> {
  const session = new GroupSession(
    groupId,
    groupName,
    localUserId,
    localDeviceId,
  );
  await session.initialize();
  return session;
}

/**
 * Creates a group session manager
 */
export function createGroupSessionManager(
  localUserId: string,
  localDeviceId: string,
  storage?: Storage,
): GroupSessionManager {
  return new GroupSessionManager(localUserId, localDeviceId, storage);
}

// ============================================================================
// Exports
// ============================================================================

export default GroupSession;
