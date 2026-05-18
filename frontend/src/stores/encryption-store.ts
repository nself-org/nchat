/**
 * Encryption Store - Zustand store for E2E encryption state management
 *
 * Manages encryption enabled/disabled states per channel, key status tracking,
 * device trust levels, and encryption session management.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type EncryptionStatus =
  | "disabled"
  | "initializing"
  | "enabled"
  | "error";

export type KeyStatus = "none" | "generating" | "ready" | "rotating" | "error";

export type DeviceTrustLevel = "untrusted" | "tofu" | "verified" | "blocked";

export interface EncryptedChannel {
  /** Channel ID */
  channelId: string;
  /** Whether encryption is enabled */
  enabled: boolean;
  /** Current encryption status */
  status: EncryptionStatus;
  /** Error message if any */
  error: string | null;
  /** When encryption was enabled */
  enabledAt: string | null;
  /** Number of encrypted messages sent */
  messagesSent: number;
  /** Number of encrypted messages received */
  messagesReceived: number;
}

export interface DeviceKey {
  /** Device ID */
  deviceId: string;
  /** User ID who owns this device */
  userId: string;
  /** Public key fingerprint */
  fingerprint: string;
  /** Trust level */
  trustLevel: DeviceTrustLevel;
  /** When first seen */
  firstSeenAt: string;
  /** When last active */
  lastActiveAt: string;
  /** When verified (if applicable) */
  verifiedAt: string | null;
  /** Who verified this device */
  verifiedBy: string | null;
}

export interface EncryptionSession {
  /** Session ID (usually peerId or channelId) */
  sessionId: string;
  /** The peer's user ID */
  peerId: string;
  /** Session creation time */
  createdAt: string;
  /** Message count in this session */
  messageCount: number;
  /** Whether session key needs rotation */
  needsRotation: boolean;
}

export interface EncryptionState {
  // Global state
  isInitialized: boolean;
  globalStatus: EncryptionStatus;
  globalError: string | null;

  // Key status
  keyStatus: KeyStatus;
  keyFingerprint: string | null;
  keyVersion: number;
  keyCreatedAt: string | null;

  // Device ID
  ownDeviceId: string | null;

  // Encrypted channels
  encryptedChannels: Map<string, EncryptedChannel>;

  // Device keys (other users' devices)
  deviceKeys: Map<string, DeviceKey>;

  // Active encryption sessions
  sessions: Map<string, EncryptionSession>;

  // Statistics
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalEncryptionErrors: number;
}

export interface EncryptionActions {
  // Initialization
  initialize: () => void;
  setInitialized: (initialized: boolean) => void;
  setGlobalStatus: (status: EncryptionStatus) => void;
  setGlobalError: (error: string | null) => void;

  // Key management
  setKeyStatus: (status: KeyStatus) => void;
  setKeyFingerprint: (fingerprint: string | null) => void;
  setKeyVersion: (version: number) => void;
  setKeyCreatedAt: (date: string | null) => void;
  setOwnDeviceId: (deviceId: string | null) => void;

  // Channel encryption
  enableChannelEncryption: (channelId: string) => void;
  disableChannelEncryption: (channelId: string) => void;
  setChannelEncryptionStatus: (
    channelId: string,
    status: EncryptionStatus,
  ) => void;
  setChannelEncryptionError: (channelId: string, error: string | null) => void;
  getChannelEncryption: (channelId: string) => EncryptedChannel | undefined;
  isChannelEncrypted: (channelId: string) => boolean;

  // Message tracking
  incrementChannelMessagesSent: (channelId: string) => void;
  incrementChannelMessagesReceived: (channelId: string) => void;
  incrementTotalMessagesSent: () => void;
  incrementTotalMessagesReceived: () => void;
  incrementEncryptionErrors: () => void;

  // Device key management
  addDeviceKey: (device: DeviceKey) => void;
  updateDeviceKey: (deviceId: string, updates: Partial<DeviceKey>) => void;
  removeDeviceKey: (deviceId: string) => void;
  getDeviceKey: (deviceId: string) => DeviceKey | undefined;
  getDeviceKeysForUser: (userId: string) => DeviceKey[];
  setDeviceTrustLevel: (deviceId: string, trustLevel: DeviceTrustLevel) => void;
  verifyDevice: (deviceId: string, verifiedBy: string) => void;
  blockDevice: (deviceId: string) => void;
  unblockDevice: (deviceId: string) => void;

  // Session management
  createSession: (sessionId: string, peerId: string) => void;
  updateSession: (
    sessionId: string,
    updates: Partial<EncryptionSession>,
  ) => void;
  removeSession: (sessionId: string) => void;
  getSession: (sessionId: string) => EncryptionSession | undefined;
  incrementSessionMessageCount: (sessionId: string) => void;
  markSessionForRotation: (sessionId: string) => void;

  // Statistics
  getStatistics: () => {
    totalMessagesSent: number;
    totalMessagesReceived: number;
    totalEncryptionErrors: number;
    encryptedChannelsCount: number;
    trustedDevicesCount: number;
    activeSessions: number;
  };

  // Reset
  reset: () => void;
}

export type EncryptionStore = EncryptionState & EncryptionActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: EncryptionState = {
  isInitialized: false,
  globalStatus: "disabled",
  globalError: null,

  keyStatus: "none",
  keyFingerprint: null,
  keyVersion: 0,
  keyCreatedAt: null,

  ownDeviceId: null,

  encryptedChannels: new Map(),
  deviceKeys: new Map(),
  sessions: new Map(),

  totalMessagesSent: 0,
  totalMessagesReceived: 0,
  totalEncryptionErrors: 0,
};

// ============================================================================
// Store
// ============================================================================

export const useEncryptionStore = create<EncryptionStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Initialization
        initialize: () =>
          set(
            (state) => {
              state.globalStatus = "initializing";
            },
            false,
            "encryption/initialize",
          ),

        setInitialized: (initialized) =>
          set(
            (state) => {
              state.isInitialized = initialized;
              if (initialized) {
                state.globalStatus = "enabled";
              }
            },
            false,
            "encryption/setInitialized",
          ),

        setGlobalStatus: (status) =>
          set(
            (state) => {
              state.globalStatus = status;
            },
            false,
            "encryption/setGlobalStatus",
          ),

        setGlobalError: (error) =>
          set(
            (state) => {
              state.globalError = error;
              if (error) {
                state.globalStatus = "error";
              }
            },
            false,
            "encryption/setGlobalError",
          ),

        // Key management
        setKeyStatus: (status) =>
          set(
            (state) => {
              state.keyStatus = status;
            },
            false,
            "encryption/setKeyStatus",
          ),

        setKeyFingerprint: (fingerprint) =>
          set(
            (state) => {
              state.keyFingerprint = fingerprint;
            },
            false,
            "encryption/setKeyFingerprint",
          ),

        setKeyVersion: (version) =>
          set(
            (state) => {
              state.keyVersion = version;
            },
            false,
            "encryption/setKeyVersion",
          ),

        setKeyCreatedAt: (date) =>
          set(
            (state) => {
              state.keyCreatedAt = date;
            },
            false,
            "encryption/setKeyCreatedAt",
          ),

        setOwnDeviceId: (deviceId) =>
          set(
            (state) => {
              state.ownDeviceId = deviceId;
            },
            false,
            "encryption/setOwnDeviceId",
          ),

        // Channel encryption
        enableChannelEncryption: (channelId) =>
          set(
            (state) => {
              const existing = state.encryptedChannels.get(channelId);
              state.encryptedChannels.set(channelId, {
                channelId,
                enabled: true,
                status: "initializing",
                error: null,
                enabledAt: new Date().toISOString(),
                messagesSent: existing?.messagesSent ?? 0,
                messagesReceived: existing?.messagesReceived ?? 0,
              });
            },
            false,
            "encryption/enableChannelEncryption",
          ),

        disableChannelEncryption: (channelId) =>
          set(
            (state) => {
              const existing = state.encryptedChannels.get(channelId);
              if (existing) {
                existing.enabled = false;
                existing.status = "disabled";
                existing.enabledAt = null;
              }
            },
            false,
            "encryption/disableChannelEncryption",
          ),

        setChannelEncryptionStatus: (channelId, status) =>
          set(
            (state) => {
              const channel = state.encryptedChannels.get(channelId);
              if (channel) {
                channel.status = status;
                if (status === "enabled") {
                  channel.error = null;
                }
              }
            },
            false,
            "encryption/setChannelEncryptionStatus",
          ),

        setChannelEncryptionError: (channelId, error) =>
          set(
            (state) => {
              const channel = state.encryptedChannels.get(channelId);
              if (channel) {
                channel.error = error;
                if (error) {
                  channel.status = "error";
                }
              }
            },
            false,
            "encryption/setChannelEncryptionError",
          ),

        getChannelEncryption: (channelId) =>
          get().encryptedChannels.get(channelId),

        isChannelEncrypted: (channelId) => {
          const channel = get().encryptedChannels.get(channelId);
          return channel?.enabled === true && channel?.status === "enabled";
        },

        // Message tracking
        incrementChannelMessagesSent: (channelId) =>
          set(
            (state) => {
              const channel = state.encryptedChannels.get(channelId);
              if (channel) {
                channel.messagesSent++;
              }
            },
            false,
            "encryption/incrementChannelMessagesSent",
          ),

        incrementChannelMessagesReceived: (channelId) =>
          set(
            (state) => {
              const channel = state.encryptedChannels.get(channelId);
              if (channel) {
                channel.messagesReceived++;
              }
            },
            false,
            "encryption/incrementChannelMessagesReceived",
          ),

        incrementTotalMessagesSent: () =>
          set(
            (state) => {
              state.totalMessagesSent++;
            },
            false,
            "encryption/incrementTotalMessagesSent",
          ),

        incrementTotalMessagesReceived: () =>
          set(
            (state) => {
              state.totalMessagesReceived++;
            },
            false,
            "encryption/incrementTotalMessagesReceived",
          ),

        incrementEncryptionErrors: () =>
          set(
            (state) => {
              state.totalEncryptionErrors++;
            },
            false,
            "encryption/incrementEncryptionErrors",
          ),

        // Device key management
        addDeviceKey: (device) =>
          set(
            (state) => {
              state.deviceKeys.set(device.deviceId, device);
            },
            false,
            "encryption/addDeviceKey",
          ),

        updateDeviceKey: (deviceId, updates) =>
          set(
            (state) => {
              const device = state.deviceKeys.get(deviceId);
              if (device) {
                Object.assign(device, updates);
              }
            },
            false,
            "encryption/updateDeviceKey",
          ),

        removeDeviceKey: (deviceId) =>
          set(
            (state) => {
              state.deviceKeys.delete(deviceId);
            },
            false,
            "encryption/removeDeviceKey",
          ),

        getDeviceKey: (deviceId) => get().deviceKeys.get(deviceId),

        getDeviceKeysForUser: (userId) =>
          Array.from(get().deviceKeys.values()).filter(
            (d) => d.userId === userId,
          ),

        setDeviceTrustLevel: (deviceId, trustLevel) =>
          set(
            (state) => {
              const device = state.deviceKeys.get(deviceId);
              if (device) {
                device.trustLevel = trustLevel;
              }
            },
            false,
            "encryption/setDeviceTrustLevel",
          ),

        verifyDevice: (deviceId, verifiedBy) =>
          set(
            (state) => {
              const device = state.deviceKeys.get(deviceId);
              if (device) {
                device.trustLevel = "verified";
                device.verifiedAt = new Date().toISOString();
                device.verifiedBy = verifiedBy;
              }
            },
            false,
            "encryption/verifyDevice",
          ),

        blockDevice: (deviceId) =>
          set(
            (state) => {
              const device = state.deviceKeys.get(deviceId);
              if (device) {
                device.trustLevel = "blocked";
              }
            },
            false,
            "encryption/blockDevice",
          ),

        unblockDevice: (deviceId) =>
          set(
            (state) => {
              const device = state.deviceKeys.get(deviceId);
              if (device && device.trustLevel === "blocked") {
                device.trustLevel = "tofu";
              }
            },
            false,
            "encryption/unblockDevice",
          ),

        // Session management
        createSession: (sessionId, peerId) =>
          set(
            (state) => {
              state.sessions.set(sessionId, {
                sessionId,
                peerId,
                createdAt: new Date().toISOString(),
                messageCount: 0,
                needsRotation: false,
              });
            },
            false,
            "encryption/createSession",
          ),

        updateSession: (sessionId, updates) =>
          set(
            (state) => {
              const session = state.sessions.get(sessionId);
              if (session) {
                Object.assign(session, updates);
              }
            },
            false,
            "encryption/updateSession",
          ),

        removeSession: (sessionId) =>
          set(
            (state) => {
              state.sessions.delete(sessionId);
            },
            false,
            "encryption/removeSession",
          ),

        getSession: (sessionId) => get().sessions.get(sessionId),

        incrementSessionMessageCount: (sessionId) =>
          set(
            (state) => {
              const session = state.sessions.get(sessionId);
              if (session) {
                session.messageCount++;
                // Check if rotation is needed (e.g., after 100 messages)
                if (session.messageCount >= 100) {
                  session.needsRotation = true;
                }
              }
            },
            false,
            "encryption/incrementSessionMessageCount",
          ),

        markSessionForRotation: (sessionId) =>
          set(
            (state) => {
              const session = state.sessions.get(sessionId);
              if (session) {
                session.needsRotation = true;
              }
            },
            false,
            "encryption/markSessionForRotation",
          ),

        // Statistics
        getStatistics: () => {
          const state = get();
          const trustedDevices = Array.from(state.deviceKeys.values()).filter(
            (d) => d.trustLevel === "verified" || d.trustLevel === "tofu",
          );

          return {
            totalMessagesSent: state.totalMessagesSent,
            totalMessagesReceived: state.totalMessagesReceived,
            totalEncryptionErrors: state.totalEncryptionErrors,
            encryptedChannelsCount: Array.from(
              state.encryptedChannels.values(),
            ).filter((c) => c.enabled).length,
            trustedDevicesCount: trustedDevices.length,
            activeSessions: state.sessions.size,
          };
        },

        // Reset
        reset: () =>
          set(
            () => ({
              ...initialState,
              encryptedChannels: new Map(),
              deviceKeys: new Map(),
              sessions: new Map(),
            }),
            false,
            "encryption/reset",
          ),
      })),
    ),
    { name: "encryption-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIsEncryptionEnabled = (state: EncryptionStore) =>
  state.isInitialized && state.globalStatus === "enabled";

export const selectEncryptedChannels = (state: EncryptionStore) =>
  Array.from(state.encryptedChannels.values()).filter((c) => c.enabled);

export const selectTrustedDevices = (state: EncryptionStore) =>
  Array.from(state.deviceKeys.values()).filter(
    (d) => d.trustLevel === "verified" || d.trustLevel === "tofu",
  );

export const selectVerifiedDevices = (state: EncryptionStore) =>
  Array.from(state.deviceKeys.values()).filter(
    (d) => d.trustLevel === "verified",
  );

export const selectBlockedDevices = (state: EncryptionStore) =>
  Array.from(state.deviceKeys.values()).filter(
    (d) => d.trustLevel === "blocked",
  );

export const selectActiveSessions = (state: EncryptionStore) =>
  Array.from(state.sessions.values());

export const selectSessionsNeedingRotation = (state: EncryptionStore) =>
  Array.from(state.sessions.values()).filter((s) => s.needsRotation);

export const selectKeyIsReady = (state: EncryptionStore) =>
  state.keyStatus === "ready";

export const selectHasEncryptionError = (state: EncryptionStore) =>
  state.globalStatus === "error" || state.globalError !== null;

export const selectChannelEncryptionStatus =
  (channelId: string) => (state: EncryptionStore) =>
    state.encryptedChannels.get(channelId)?.status ?? "disabled";

export const selectDeviceTrustLevel =
  (deviceId: string) => (state: EncryptionStore) =>
    state.deviceKeys.get(deviceId)?.trustLevel ?? "untrusted";
