/**
 * Encryption Store Unit Tests
 *
 * Tests for the encryption store including initialization, key management,
 * channel encryption, device keys, sessions, and statistics.
 */

import { act } from "@testing-library/react";
import {
  useEncryptionStore,
  EncryptionStatus,
  KeyStatus,
  DeviceTrustLevel,
  EncryptedChannel,
  DeviceKey,
  EncryptionSession,
  selectIsEncryptionEnabled,
  selectEncryptedChannels,
  selectTrustedDevices,
  selectVerifiedDevices,
  selectBlockedDevices,
  selectActiveSessions,
  selectSessionsNeedingRotation,
  selectKeyIsReady,
  selectHasEncryptionError,
  selectChannelEncryptionStatus,
  selectDeviceTrustLevel,
} from "../encryption-store";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestDeviceKey = (overrides?: Partial<DeviceKey>): DeviceKey => ({
  deviceId: `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  userId: "user-1",
  fingerprint: "0102 0304 0506 0708",
  trustLevel: "tofu",
  firstSeenAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  verifiedAt: null,
  verifiedBy: null,
  ...overrides,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Encryption Store", () => {
  beforeEach(() => {
    act(() => {
      useEncryptionStore.getState().reset();
    });
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe("Initialization", () => {
    describe("initialize", () => {
      it("should set global status to initializing", () => {
        act(() => {
          useEncryptionStore.getState().initialize();
        });

        const state = useEncryptionStore.getState();
        expect(state.globalStatus).toBe("initializing");
      });
    });

    describe("setInitialized", () => {
      it("should set initialized to true and status to enabled", () => {
        act(() => {
          useEncryptionStore.getState().setInitialized(true);
        });

        const state = useEncryptionStore.getState();
        expect(state.isInitialized).toBe(true);
        expect(state.globalStatus).toBe("enabled");
      });

      it("should set initialized to false without changing status", () => {
        act(() => {
          useEncryptionStore.getState().setInitialized(true);
          useEncryptionStore.getState().setInitialized(false);
        });

        const state = useEncryptionStore.getState();
        expect(state.isInitialized).toBe(false);
      });
    });

    describe("setGlobalStatus", () => {
      it("should set global status", () => {
        const statuses: EncryptionStatus[] = [
          "disabled",
          "initializing",
          "enabled",
          "error",
        ];

        statuses.forEach((status) => {
          act(() => {
            useEncryptionStore.getState().setGlobalStatus(status);
          });

          expect(useEncryptionStore.getState().globalStatus).toBe(status);
        });
      });
    });

    describe("setGlobalError", () => {
      it("should set global error", () => {
        act(() => {
          useEncryptionStore.getState().setGlobalError("Test error");
        });

        const state = useEncryptionStore.getState();
        expect(state.globalError).toBe("Test error");
        expect(state.globalStatus).toBe("error");
      });

      it("should clear global error", () => {
        act(() => {
          useEncryptionStore.getState().setGlobalError("Test error");
          useEncryptionStore.getState().setGlobalError(null);
        });

        const state = useEncryptionStore.getState();
        expect(state.globalError).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Key Management Tests
  // ==========================================================================

  describe("Key Management", () => {
    describe("setKeyStatus", () => {
      it("should set key status", () => {
        const statuses: KeyStatus[] = [
          "none",
          "generating",
          "ready",
          "rotating",
          "error",
        ];

        statuses.forEach((status) => {
          act(() => {
            useEncryptionStore.getState().setKeyStatus(status);
          });

          expect(useEncryptionStore.getState().keyStatus).toBe(status);
        });
      });
    });

    describe("setKeyFingerprint", () => {
      it("should set key fingerprint", () => {
        act(() => {
          useEncryptionStore.getState().setKeyFingerprint("0102 0304 0506");
        });

        expect(useEncryptionStore.getState().keyFingerprint).toBe(
          "0102 0304 0506",
        );
      });

      it("should clear key fingerprint", () => {
        act(() => {
          useEncryptionStore.getState().setKeyFingerprint("0102");
          useEncryptionStore.getState().setKeyFingerprint(null);
        });

        expect(useEncryptionStore.getState().keyFingerprint).toBeNull();
      });
    });

    describe("setKeyVersion", () => {
      it("should set key version", () => {
        act(() => {
          useEncryptionStore.getState().setKeyVersion(5);
        });

        expect(useEncryptionStore.getState().keyVersion).toBe(5);
      });
    });

    describe("setKeyCreatedAt", () => {
      it("should set key created date", () => {
        const date = new Date().toISOString();

        act(() => {
          useEncryptionStore.getState().setKeyCreatedAt(date);
        });

        expect(useEncryptionStore.getState().keyCreatedAt).toBe(date);
      });
    });

    describe("setOwnDeviceId", () => {
      it("should set own device ID", () => {
        act(() => {
          useEncryptionStore.getState().setOwnDeviceId("device-123");
        });

        expect(useEncryptionStore.getState().ownDeviceId).toBe("device-123");
      });
    });
  });

  // ==========================================================================
  // Channel Encryption Tests
  // ==========================================================================

  describe("Channel Encryption", () => {
    describe("enableChannelEncryption", () => {
      it("should enable encryption for a channel", () => {
        act(() => {
          useEncryptionStore.getState().enableChannelEncryption("channel-1");
        });

        const channel = useEncryptionStore
          .getState()
          .getChannelEncryption("channel-1");
        expect(channel).toBeDefined();
        expect(channel?.enabled).toBe(true);
        expect(channel?.status).toBe("initializing");
        expect(channel?.enabledAt).not.toBeNull();
      });

      it("should preserve message counts when re-enabling", () => {
        act(() => {
          useEncryptionStore.getState().enableChannelEncryption("channel-1");
          useEncryptionStore
            .getState()
            .setChannelEncryptionStatus("channel-1", "enabled");
          useEncryptionStore
            .getState()
            .incrementChannelMessagesSent("channel-1");
          useEncryptionStore
            .getState()
            .incrementChannelMessagesSent("channel-1");
          useEncryptionStore.getState().disableChannelEncryption("channel-1");
          useEncryptionStore.getState().enableChannelEncryption("channel-1");
        });

        const channel = useEncryptionStore
          .getState()
          .getChannelEncryption("channel-1");
        expect(channel?.messagesSent).toBe(2);
      });
    });

    describe("disableChannelEncryption", () => {
      it("should disable encryption for a channel", () => {
        act(() => {
          useEncryptionStore.getState().enableChannelEncryption("channel-1");
          useEncryptionStore
            .getState()
            .setChannelEncryptionStatus("channel-1", "enabled");
          useEncryptionStore.getState().disableChannelEncryption("channel-1");
        });

        const channel = useEncryptionStore
          .getState()
          .getChannelEncryption("channel-1");
        expect(channel?.enabled).toBe(false);
        expect(channel?.status).toBe("disabled");
        expect(channel?.enabledAt).toBeNull();
      });

      it("should do nothing for non-existent channel", () => {
        act(() => {
          useEncryptionStore.getState().disableChannelEncryption("nonexistent");
        });

        const channel = useEncryptionStore
          .getState()
          .getChannelEncryption("nonexistent");
        expect(channel).toBeUndefined();
      });
    });

    describe("setChannelEncryptionStatus", () => {
      it("should set channel encryption status", () => {
        act(() => {
          useEncryptionStore.getState().enableChannelEncryption("channel-1");
          useEncryptionStore
            .getState()
            .setChannelEncryptionStatus("channel-1", "enabled");
        });

        const channel = useEncryptionStore
          .getState()
          .getChannelEncryption("channel-1");
        expect(channel?.status).toBe("enabled");
      });

      it("should clear error when status becomes enabled", () => {
        act(() => {
          useEncryptionStore.getState().enableChannelEncryption("channel-1");
          useEncryptionStore
            .getState()
            .setChannelEncryptionError("channel-1", "Test error");
          useEncryptionStore
            .getState()
            .setChannelEncryptionStatus("channel-1", "enabled");
        });

        const channel = useEncryptionStore
          .getState()
          .getChannelEncryption("channel-1");
        expect(channel?.error).toBeNull();
      });
    });

    describe("setChannelEncryptionError", () => {
      it("should set channel error", () => {
        act(() => {
          useEncryptionStore.getState().enableChannelEncryption("channel-1");
          useEncryptionStore
            .getState()
            .setChannelEncryptionError("channel-1", "Test error");
        });

        const channel = useEncryptionStore
          .getState()
          .getChannelEncryption("channel-1");
        expect(channel?.error).toBe("Test error");
        expect(channel?.status).toBe("error");
      });
    });

    describe("isChannelEncrypted", () => {
      it("should return true for enabled and ready channel", () => {
        act(() => {
          useEncryptionStore.getState().enableChannelEncryption("channel-1");
          useEncryptionStore
            .getState()
            .setChannelEncryptionStatus("channel-1", "enabled");
        });

        expect(
          useEncryptionStore.getState().isChannelEncrypted("channel-1"),
        ).toBe(true);
      });

      it("should return false for disabled channel", () => {
        act(() => {
          useEncryptionStore.getState().enableChannelEncryption("channel-1");
          useEncryptionStore.getState().disableChannelEncryption("channel-1");
        });

        expect(
          useEncryptionStore.getState().isChannelEncrypted("channel-1"),
        ).toBe(false);
      });

      it("should return false for initializing channel", () => {
        act(() => {
          useEncryptionStore.getState().enableChannelEncryption("channel-1");
        });

        expect(
          useEncryptionStore.getState().isChannelEncrypted("channel-1"),
        ).toBe(false);
      });

      it("should return false for non-existent channel", () => {
        expect(
          useEncryptionStore.getState().isChannelEncrypted("nonexistent"),
        ).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Message Tracking Tests
  // ==========================================================================

  describe("Message Tracking", () => {
    beforeEach(() => {
      act(() => {
        useEncryptionStore.getState().enableChannelEncryption("channel-1");
      });
    });

    describe("incrementChannelMessagesSent", () => {
      it("should increment channel messages sent", () => {
        act(() => {
          useEncryptionStore
            .getState()
            .incrementChannelMessagesSent("channel-1");
          useEncryptionStore
            .getState()
            .incrementChannelMessagesSent("channel-1");
        });

        const channel = useEncryptionStore
          .getState()
          .getChannelEncryption("channel-1");
        expect(channel?.messagesSent).toBe(2);
      });
    });

    describe("incrementChannelMessagesReceived", () => {
      it("should increment channel messages received", () => {
        act(() => {
          useEncryptionStore
            .getState()
            .incrementChannelMessagesReceived("channel-1");
          useEncryptionStore
            .getState()
            .incrementChannelMessagesReceived("channel-1");
          useEncryptionStore
            .getState()
            .incrementChannelMessagesReceived("channel-1");
        });

        const channel = useEncryptionStore
          .getState()
          .getChannelEncryption("channel-1");
        expect(channel?.messagesReceived).toBe(3);
      });
    });

    describe("incrementTotalMessagesSent", () => {
      it("should increment total messages sent", () => {
        act(() => {
          useEncryptionStore.getState().incrementTotalMessagesSent();
          useEncryptionStore.getState().incrementTotalMessagesSent();
        });

        expect(useEncryptionStore.getState().totalMessagesSent).toBe(2);
      });
    });

    describe("incrementTotalMessagesReceived", () => {
      it("should increment total messages received", () => {
        act(() => {
          useEncryptionStore.getState().incrementTotalMessagesReceived();
        });

        expect(useEncryptionStore.getState().totalMessagesReceived).toBe(1);
      });
    });

    describe("incrementEncryptionErrors", () => {
      it("should increment encryption errors", () => {
        act(() => {
          useEncryptionStore.getState().incrementEncryptionErrors();
          useEncryptionStore.getState().incrementEncryptionErrors();
        });

        expect(useEncryptionStore.getState().totalEncryptionErrors).toBe(2);
      });
    });
  });

  // ==========================================================================
  // Device Key Management Tests
  // ==========================================================================

  describe("Device Key Management", () => {
    describe("addDeviceKey", () => {
      it("should add a device key", () => {
        const device = createTestDeviceKey({ deviceId: "device-1" });

        act(() => {
          useEncryptionStore.getState().addDeviceKey(device);
        });

        const stored = useEncryptionStore.getState().getDeviceKey("device-1");
        expect(stored).toEqual(device);
      });
    });

    describe("updateDeviceKey", () => {
      it("should update device key fields", () => {
        const device = createTestDeviceKey({ deviceId: "device-1" });

        act(() => {
          useEncryptionStore.getState().addDeviceKey(device);
          useEncryptionStore.getState().updateDeviceKey("device-1", {
            fingerprint: "new-fingerprint",
          });
        });

        const stored = useEncryptionStore.getState().getDeviceKey("device-1");
        expect(stored?.fingerprint).toBe("new-fingerprint");
      });
    });

    describe("removeDeviceKey", () => {
      it("should remove a device key", () => {
        const device = createTestDeviceKey({ deviceId: "device-1" });

        act(() => {
          useEncryptionStore.getState().addDeviceKey(device);
          useEncryptionStore.getState().removeDeviceKey("device-1");
        });

        expect(
          useEncryptionStore.getState().getDeviceKey("device-1"),
        ).toBeUndefined();
      });
    });

    describe("getDeviceKeysForUser", () => {
      it("should return all devices for a user", () => {
        const device1 = createTestDeviceKey({
          deviceId: "device-1",
          userId: "user-1",
        });
        const device2 = createTestDeviceKey({
          deviceId: "device-2",
          userId: "user-1",
        });
        const device3 = createTestDeviceKey({
          deviceId: "device-3",
          userId: "user-2",
        });

        act(() => {
          useEncryptionStore.getState().addDeviceKey(device1);
          useEncryptionStore.getState().addDeviceKey(device2);
          useEncryptionStore.getState().addDeviceKey(device3);
        });

        const user1Devices = useEncryptionStore
          .getState()
          .getDeviceKeysForUser("user-1");
        expect(user1Devices).toHaveLength(2);
        expect(user1Devices.map((d) => d.deviceId)).toContain("device-1");
        expect(user1Devices.map((d) => d.deviceId)).toContain("device-2");
      });
    });

    describe("setDeviceTrustLevel", () => {
      it("should set device trust level", () => {
        const device = createTestDeviceKey({
          deviceId: "device-1",
          trustLevel: "tofu",
        });

        act(() => {
          useEncryptionStore.getState().addDeviceKey(device);
          useEncryptionStore
            .getState()
            .setDeviceTrustLevel("device-1", "verified");
        });

        const stored = useEncryptionStore.getState().getDeviceKey("device-1");
        expect(stored?.trustLevel).toBe("verified");
      });
    });

    describe("verifyDevice", () => {
      it("should verify a device", () => {
        const device = createTestDeviceKey({
          deviceId: "device-1",
          trustLevel: "tofu",
        });

        act(() => {
          useEncryptionStore.getState().addDeviceKey(device);
          useEncryptionStore
            .getState()
            .verifyDevice("device-1", "verifier-user");
        });

        const stored = useEncryptionStore.getState().getDeviceKey("device-1");
        expect(stored?.trustLevel).toBe("verified");
        expect(stored?.verifiedBy).toBe("verifier-user");
        expect(stored?.verifiedAt).not.toBeNull();
      });
    });

    describe("blockDevice", () => {
      it("should block a device", () => {
        const device = createTestDeviceKey({
          deviceId: "device-1",
          trustLevel: "tofu",
        });

        act(() => {
          useEncryptionStore.getState().addDeviceKey(device);
          useEncryptionStore.getState().blockDevice("device-1");
        });

        const stored = useEncryptionStore.getState().getDeviceKey("device-1");
        expect(stored?.trustLevel).toBe("blocked");
      });
    });

    describe("unblockDevice", () => {
      it("should unblock a blocked device", () => {
        const device = createTestDeviceKey({
          deviceId: "device-1",
          trustLevel: "blocked",
        });

        act(() => {
          useEncryptionStore.getState().addDeviceKey(device);
          useEncryptionStore.getState().unblockDevice("device-1");
        });

        const stored = useEncryptionStore.getState().getDeviceKey("device-1");
        expect(stored?.trustLevel).toBe("tofu");
      });

      it("should not change non-blocked devices", () => {
        const device = createTestDeviceKey({
          deviceId: "device-1",
          trustLevel: "verified",
        });

        act(() => {
          useEncryptionStore.getState().addDeviceKey(device);
          useEncryptionStore.getState().unblockDevice("device-1");
        });

        const stored = useEncryptionStore.getState().getDeviceKey("device-1");
        expect(stored?.trustLevel).toBe("verified");
      });
    });
  });

  // ==========================================================================
  // Session Management Tests
  // ==========================================================================

  describe("Session Management", () => {
    describe("createSession", () => {
      it("should create a session", () => {
        act(() => {
          useEncryptionStore.getState().createSession("session-1", "peer-1");
        });

        const session = useEncryptionStore.getState().getSession("session-1");
        expect(session).toBeDefined();
        expect(session?.peerId).toBe("peer-1");
        expect(session?.messageCount).toBe(0);
        expect(session?.needsRotation).toBe(false);
      });
    });

    describe("updateSession", () => {
      it("should update session fields", () => {
        act(() => {
          useEncryptionStore.getState().createSession("session-1", "peer-1");
          useEncryptionStore
            .getState()
            .updateSession("session-1", { messageCount: 50 });
        });

        const session = useEncryptionStore.getState().getSession("session-1");
        expect(session?.messageCount).toBe(50);
      });
    });

    describe("removeSession", () => {
      it("should remove a session", () => {
        act(() => {
          useEncryptionStore.getState().createSession("session-1", "peer-1");
          useEncryptionStore.getState().removeSession("session-1");
        });

        expect(
          useEncryptionStore.getState().getSession("session-1"),
        ).toBeUndefined();
      });
    });

    describe("incrementSessionMessageCount", () => {
      it("should increment session message count", () => {
        act(() => {
          useEncryptionStore.getState().createSession("session-1", "peer-1");
          useEncryptionStore
            .getState()
            .incrementSessionMessageCount("session-1");
          useEncryptionStore
            .getState()
            .incrementSessionMessageCount("session-1");
        });

        const session = useEncryptionStore.getState().getSession("session-1");
        expect(session?.messageCount).toBe(2);
      });

      it("should mark for rotation after 100 messages", () => {
        act(() => {
          useEncryptionStore.getState().createSession("session-1", "peer-1");
          for (let i = 0; i < 100; i++) {
            useEncryptionStore
              .getState()
              .incrementSessionMessageCount("session-1");
          }
        });

        const session = useEncryptionStore.getState().getSession("session-1");
        expect(session?.needsRotation).toBe(true);
      });
    });

    describe("markSessionForRotation", () => {
      it("should mark session for rotation", () => {
        act(() => {
          useEncryptionStore.getState().createSession("session-1", "peer-1");
          useEncryptionStore.getState().markSessionForRotation("session-1");
        });

        const session = useEncryptionStore.getState().getSession("session-1");
        expect(session?.needsRotation).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Statistics Tests
  // ==========================================================================

  describe("Statistics", () => {
    describe("getStatistics", () => {
      it("should return correct statistics", () => {
        act(() => {
          // Enable some channels
          useEncryptionStore.getState().enableChannelEncryption("channel-1");
          useEncryptionStore
            .getState()
            .setChannelEncryptionStatus("channel-1", "enabled");
          useEncryptionStore.getState().enableChannelEncryption("channel-2");
          useEncryptionStore
            .getState()
            .setChannelEncryptionStatus("channel-2", "enabled");

          // Add some devices
          useEncryptionStore.getState().addDeviceKey(
            createTestDeviceKey({
              deviceId: "device-1",
              trustLevel: "verified",
            }),
          );
          useEncryptionStore
            .getState()
            .addDeviceKey(
              createTestDeviceKey({ deviceId: "device-2", trustLevel: "tofu" }),
            );
          useEncryptionStore.getState().addDeviceKey(
            createTestDeviceKey({
              deviceId: "device-3",
              trustLevel: "blocked",
            }),
          );

          // Create sessions
          useEncryptionStore.getState().createSession("session-1", "peer-1");
          useEncryptionStore.getState().createSession("session-2", "peer-2");

          // Increment counters
          useEncryptionStore.getState().incrementTotalMessagesSent();
          useEncryptionStore.getState().incrementTotalMessagesSent();
          useEncryptionStore.getState().incrementTotalMessagesReceived();
          useEncryptionStore.getState().incrementEncryptionErrors();
        });

        const stats = useEncryptionStore.getState().getStatistics();

        expect(stats.totalMessagesSent).toBe(2);
        expect(stats.totalMessagesReceived).toBe(1);
        expect(stats.totalEncryptionErrors).toBe(1);
        expect(stats.encryptedChannelsCount).toBe(2);
        expect(stats.trustedDevicesCount).toBe(2); // verified + tofu
        expect(stats.activeSessions).toBe(2);
      });
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("Reset", () => {
    describe("reset", () => {
      it("should reset store to initial state", () => {
        act(() => {
          useEncryptionStore.getState().setInitialized(true);
          useEncryptionStore.getState().setKeyStatus("ready");
          useEncryptionStore.getState().setKeyFingerprint("0102");
          useEncryptionStore.getState().enableChannelEncryption("channel-1");
          useEncryptionStore
            .getState()
            .addDeviceKey(createTestDeviceKey({ deviceId: "device-1" }));
          useEncryptionStore.getState().createSession("session-1", "peer-1");
          useEncryptionStore.getState().reset();
        });

        const state = useEncryptionStore.getState();
        expect(state.isInitialized).toBe(false);
        expect(state.globalStatus).toBe("disabled");
        expect(state.keyStatus).toBe("none");
        expect(state.keyFingerprint).toBeNull();
        expect(state.encryptedChannels.size).toBe(0);
        expect(state.deviceKeys.size).toBe(0);
        expect(state.sessions.size).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Selector Tests
  // ==========================================================================

  describe("Selectors", () => {
    beforeEach(() => {
      act(() => {
        useEncryptionStore.getState().setInitialized(true);
        useEncryptionStore.getState().setGlobalStatus("enabled");
        useEncryptionStore.getState().setKeyStatus("ready");

        // Add channels
        useEncryptionStore.getState().enableChannelEncryption("channel-1");
        useEncryptionStore
          .getState()
          .setChannelEncryptionStatus("channel-1", "enabled");
        useEncryptionStore.getState().enableChannelEncryption("channel-2");
        useEncryptionStore.getState().disableChannelEncryption("channel-2");

        // Add devices
        useEncryptionStore.getState().addDeviceKey(
          createTestDeviceKey({
            deviceId: "device-1",
            trustLevel: "verified",
          }),
        );
        useEncryptionStore
          .getState()
          .addDeviceKey(
            createTestDeviceKey({ deviceId: "device-2", trustLevel: "tofu" }),
          );
        useEncryptionStore.getState().addDeviceKey(
          createTestDeviceKey({
            deviceId: "device-3",
            trustLevel: "blocked",
          }),
        );

        // Add sessions
        useEncryptionStore.getState().createSession("session-1", "peer-1");
        useEncryptionStore.getState().createSession("session-2", "peer-2");
        useEncryptionStore.getState().markSessionForRotation("session-2");
      });
    });

    it("selectIsEncryptionEnabled should return correct value", () => {
      const state = useEncryptionStore.getState();
      expect(selectIsEncryptionEnabled(state)).toBe(true);
    });

    it("selectEncryptedChannels should return only enabled channels", () => {
      const state = useEncryptionStore.getState();
      const channels = selectEncryptedChannels(state);
      expect(channels).toHaveLength(1);
      expect(channels[0].channelId).toBe("channel-1");
    });

    it("selectTrustedDevices should return verified and tofu devices", () => {
      const state = useEncryptionStore.getState();
      const devices = selectTrustedDevices(state);
      expect(devices).toHaveLength(2);
    });

    it("selectVerifiedDevices should return only verified devices", () => {
      const state = useEncryptionStore.getState();
      const devices = selectVerifiedDevices(state);
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe("device-1");
    });

    it("selectBlockedDevices should return only blocked devices", () => {
      const state = useEncryptionStore.getState();
      const devices = selectBlockedDevices(state);
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe("device-3");
    });

    it("selectActiveSessions should return all sessions", () => {
      const state = useEncryptionStore.getState();
      const sessions = selectActiveSessions(state);
      expect(sessions).toHaveLength(2);
    });

    it("selectSessionsNeedingRotation should return sessions needing rotation", () => {
      const state = useEncryptionStore.getState();
      const sessions = selectSessionsNeedingRotation(state);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe("session-2");
    });

    it("selectKeyIsReady should return correct value", () => {
      const state = useEncryptionStore.getState();
      expect(selectKeyIsReady(state)).toBe(true);

      act(() => {
        useEncryptionStore.getState().setKeyStatus("generating");
      });

      expect(selectKeyIsReady(useEncryptionStore.getState())).toBe(false);
    });

    it("selectHasEncryptionError should detect errors", () => {
      let state = useEncryptionStore.getState();
      expect(selectHasEncryptionError(state)).toBe(false);

      act(() => {
        useEncryptionStore.getState().setGlobalError("Test error");
      });

      state = useEncryptionStore.getState();
      expect(selectHasEncryptionError(state)).toBe(true);
    });

    it("selectChannelEncryptionStatus should return channel status", () => {
      const state = useEncryptionStore.getState();
      expect(selectChannelEncryptionStatus("channel-1")(state)).toBe("enabled");
      expect(selectChannelEncryptionStatus("channel-2")(state)).toBe(
        "disabled",
      );
      expect(selectChannelEncryptionStatus("nonexistent")(state)).toBe(
        "disabled",
      );
    });

    it("selectDeviceTrustLevel should return device trust level", () => {
      const state = useEncryptionStore.getState();
      expect(selectDeviceTrustLevel("device-1")(state)).toBe("verified");
      expect(selectDeviceTrustLevel("device-3")(state)).toBe("blocked");
      expect(selectDeviceTrustLevel("nonexistent")(state)).toBe("untrusted");
    });
  });
});
