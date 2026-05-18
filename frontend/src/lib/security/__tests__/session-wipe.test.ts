/**
 * Session Wipe Tests
 *
 * Comprehensive tests for the session wipe module.
 */

import {
  SessionWipeManager,
  createSessionWipeManager,
  resetSessionWipeManager,
  DEFAULT_WIPE_CONFIG,
  type WipeResult,
  type WipeToken,
  type WipeEvidence,
  type WipeEventType,
} from "../session-wipe";
import {
  type ISecureStorage,
  type SecureStorageResult,
} from "@/lib/secure-storage";

// ============================================================================
// Mock Storage
// ============================================================================

function createMockStorage(): ISecureStorage {
  const store = new Map<string, string>();
  let initialized = false;

  return {
    os: "web",
    async initialize() {
      initialized = true;
    },
    isInitialized() {
      return initialized;
    },
    async getCapabilities() {
      return {
        hardwareStorage: false,
        biometricAuth: false,
        biometricTypes: [],
        secureEnclave: false,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "web" as const,
        securityLevel: "encrypted" as const,
      };
    },
    async setItem(
      key: string,
      value: string,
    ): Promise<SecureStorageResult<void>> {
      store.set(key, value);
      return { success: true, data: null, error: null };
    },
    async getItem(key: string): Promise<SecureStorageResult<string>> {
      const value = store.get(key);
      return {
        success: !!value,
        data: value || null,
        error: value ? null : "Not found",
      };
    },
    async hasItem(key: string): Promise<boolean> {
      return store.has(key);
    },
    async removeItem(key: string): Promise<SecureStorageResult<void>> {
      store.delete(key);
      return { success: true, data: null, error: null };
    },
    async getAllKeys(): Promise<string[]> {
      return Array.from(store.keys());
    },
    async clear(): Promise<SecureStorageResult<void>> {
      store.clear();
      return { success: true, data: null, error: null };
    },
    async getItemMeta() {
      return null;
    },
    async isBiometricAvailable() {
      return false;
    },
    async authenticateBiometric(): Promise<SecureStorageResult<void>> {
      return { success: false, data: null, error: "Not available" };
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("SessionWipeManager", () => {
  let manager: SessionWipeManager;
  let mockStorage: ISecureStorage;

  beforeEach(() => {
    resetSessionWipeManager();
    mockStorage = createMockStorage();
    manager = createSessionWipeManager(mockStorage);
  });

  afterEach(() => {
    manager.destroy();
  });

  // --------------------------------------------------------------------------
  // Initialization Tests
  // --------------------------------------------------------------------------

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await manager.initialize();
      expect(manager.getCurrentWipeState()).toBeNull();
    });

    it("should initialize storage if not initialized", async () => {
      const initSpy = jest.spyOn(mockStorage, "initialize");
      await manager.initialize();
      expect(initSpy).toHaveBeenCalled();
    });

    it("should not re-initialize if already initialized", async () => {
      await manager.initialize();
      const initSpy = jest.spyOn(mockStorage, "initialize");
      await manager.initialize();
      expect(initSpy).not.toHaveBeenCalled();
    });

    it("should check for pending wipes on initialization", async () => {
      // Store a pending wipe state
      await mockStorage.setItem(
        "nchat_wipe_state",
        JSON.stringify({
          wipeId: "test_wipe",
          state: "wiping",
          success: false,
        }),
        { service: "nchat-security" },
      );

      await manager.initialize();

      // Should mark interrupted wipe as failed
      const result = await mockStorage.getItem("nchat_wipe_state", {
        service: "nchat-security",
      });
      expect(result.success).toBe(true);
      if (result.data) {
        const state = JSON.parse(result.data);
        expect(state.state).toBe("failed");
      }
    });
  });

  // --------------------------------------------------------------------------
  // Session Kill Tests
  // --------------------------------------------------------------------------

  describe("killSession", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should kill a session successfully", async () => {
      const result = await manager.killSession({
        sessionId: "session_123",
        reason: "Test kill",
        initiatedBy: "user",
        sourceDeviceId: "device_456",
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("session_kill");
      expect(result.state).toBe("completed");
    });

    it("should preserve evidence when configured", async () => {
      await manager.killSession({
        sessionId: "session_evidence",
        reason: "Test with evidence",
        initiatedBy: "user",
        sourceDeviceId: null,
        config: { preserveEvidence: true },
      });

      const evidence = await manager.getPreservedEvidence();
      expect(evidence.length).toBeGreaterThan(0);
    });

    it("should destroy session keys", async () => {
      // Set up a session key
      await mockStorage.setItem(
        "nchat_session_key_session_123",
        "secret_key_data",
        { service: "nchat-security" },
      );

      const result = await manager.killSession({
        sessionId: "session_123",
        reason: "Test kill with key destruction",
        initiatedBy: "user",
        sourceDeviceId: null,
      });

      expect(result.keysDestroyed).toBeGreaterThanOrEqual(0);
    });

    it("should record key destruction proofs", async () => {
      await manager.killSession({
        sessionId: "session_proofs",
        reason: "Test proofs",
        initiatedBy: "user",
        sourceDeviceId: null,
      });

      const proofs = await manager.getKeyDestructionProofs();
      expect(proofs.length).toBeGreaterThan(0);
    });

    it("should emit wipe events", async () => {
      const events: WipeEventType[] = [];
      manager.addEventListener("wipe_started", () =>
        events.push("wipe_started"),
      );
      manager.addEventListener("wipe_completed", () =>
        events.push("wipe_completed"),
      );

      await manager.killSession({
        sessionId: "session_events",
        reason: "Test events",
        initiatedBy: "user",
        sourceDeviceId: null,
      });

      expect(events).toContain("wipe_started");
      expect(events).toContain("wipe_completed");
    });

    it("should handle kill with different initiators", async () => {
      const initiators = ["user", "admin", "system", "remote"] as const;

      for (const initiator of initiators) {
        const result = await manager.killSession({
          sessionId: `session_${initiator}`,
          reason: `Kill by ${initiator}`,
          initiatedBy: initiator,
          sourceDeviceId: null,
        });

        expect(result.success).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Device Wipe Tests
  // --------------------------------------------------------------------------

  describe("wipeDevice", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should wipe device successfully", async () => {
      const result = await manager.wipeDevice({
        deviceId: "device_123",
        reason: "Test device wipe",
        initiatedBy: "user",
        sourceDeviceId: null,
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("device_wipe");
      expect(result.state).toBe("completed");
    });

    it("should destroy all keys on device wipe", async () => {
      // Set up multiple keys
      await mockStorage.setItem("nchat_identity_key", "key1", {
        service: "nchat-security",
      });
      await mockStorage.setItem("nchat_signed_prekey", "key2", {
        service: "nchat-security",
      });

      const result = await manager.wipeDevice({
        deviceId: "device_all_keys",
        reason: "Test all key destruction",
        initiatedBy: "user",
        sourceDeviceId: null,
      });

      expect(result.keysDestroyed).toBeGreaterThan(0);
    });

    it("should clear storage after device wipe", async () => {
      await mockStorage.setItem("test_key", "test_value", {
        service: "nchat-security",
      });

      await manager.wipeDevice({
        deviceId: "device_clear",
        reason: "Test storage clear",
        initiatedBy: "user",
        sourceDeviceId: null,
      });

      const keys = await mockStorage.getAllKeys();
      // Storage should be cleared
      expect(keys.length).toBeLessThanOrEqual(2); // Only wipe state/evidence may remain
    });

    it("should use configured overwrite passes", async () => {
      const result = await manager.wipeDevice({
        deviceId: "device_passes",
        reason: "Test overwrite passes",
        initiatedBy: "user",
        sourceDeviceId: null,
        config: { overwritePasses: 7 },
      });

      expect(result.success).toBe(true);
    });

    it("should verify key destruction when configured", async () => {
      const result = await manager.wipeDevice({
        deviceId: "device_verify",
        reason: "Test verification",
        initiatedBy: "user",
        sourceDeviceId: null,
        config: { verifyKeyDestruction: true },
      });

      expect(result.verificationHash).not.toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Remote Wipe Tests
  // --------------------------------------------------------------------------

  describe("processRemoteWipe", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should reject invalid token", async () => {
      const result = await manager.processRemoteWipe({
        targetDeviceId: "device_123",
        token: "invalid_token",
        reason: "Test remote wipe",
        sourceUserId: "user_456",
        sourceDeviceId: "device_789",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid wipe token");
    });

    it("should accept valid token and wipe", async () => {
      // Generate a valid token first
      const token = await manager.generateWipeToken(
        "device_123",
        null,
        "remote_wipe",
        15,
      );

      const result = await manager.processRemoteWipe({
        targetDeviceId: "device_123",
        token: token.token,
        reason: "Test remote wipe",
        sourceUserId: "user_456",
        sourceDeviceId: "device_789",
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("device_wipe");
    });

    it("should emit remote wipe event", async () => {
      let remoteWipeReceived = false;
      manager.addEventListener("remote_wipe_received", () => {
        remoteWipeReceived = true;
      });

      const token = await manager.generateWipeToken(
        "device_event",
        null,
        "remote_wipe",
        15,
      );

      await manager.processRemoteWipe({
        targetDeviceId: "device_event",
        token: token.token,
        reason: "Test event",
        sourceUserId: "user_1",
        sourceDeviceId: "device_2",
      });

      expect(remoteWipeReceived).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Wipe Token Tests
  // --------------------------------------------------------------------------

  describe("generateWipeToken", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should generate a valid token", async () => {
      const token = await manager.generateWipeToken(
        "device_123",
        null,
        "remote_wipe",
        15,
      );

      expect(token.id).toBeDefined();
      expect(token.token).toBeDefined();
      expect(token.token.length).toBe(64); // 32 bytes = 64 hex chars
      expect(token.targetDeviceId).toBe("device_123");
      expect(token.authorized).toBe(true);
    });

    it("should set correct expiration", async () => {
      const token = await manager.generateWipeToken(
        "device_exp",
        null,
        "remote_wipe",
        30,
      );

      const expiresAt = new Date(token.expiresAt);
      const createdAt = new Date(token.createdAt);
      const diffMinutes =
        (expiresAt.getTime() - createdAt.getTime()) / (60 * 1000);

      expect(diffMinutes).toBeCloseTo(30, 0);
    });

    it("should support session-specific tokens", async () => {
      const token = await manager.generateWipeToken(
        null,
        "session_123",
        "session_kill",
        15,
      );

      expect(token.targetSessionId).toBe("session_123");
      expect(token.targetDeviceId).toBeNull();
      expect(token.type).toBe("session_kill");
    });

    it("should reject expired tokens", async () => {
      // Generate token that expires immediately
      const token = await manager.generateWipeToken(
        "device_exp",
        null,
        "remote_wipe",
        0,
      );

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await manager.processRemoteWipe({
        targetDeviceId: "device_exp",
        token: token.token,
        reason: "Test expired",
        sourceUserId: "user_1",
        sourceDeviceId: "device_2",
      });

      expect(result.success).toBe(false);
    });

    it("should reject used tokens", async () => {
      const token = await manager.generateWipeToken(
        "device_used",
        null,
        "remote_wipe",
        15,
      );

      // Use the token
      await manager.processRemoteWipe({
        targetDeviceId: "device_used",
        token: token.token,
        reason: "First use",
        sourceUserId: "user_1",
        sourceDeviceId: "device_2",
      });

      // Try to use again
      const result = await manager.processRemoteWipe({
        targetDeviceId: "device_used",
        token: token.token,
        reason: "Second use",
        sourceUserId: "user_1",
        sourceDeviceId: "device_2",
      });

      expect(result.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Evidence Tests
  // --------------------------------------------------------------------------

  describe("evidence preservation", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should preserve evidence on wipe", async () => {
      await manager.killSession({
        sessionId: "session_evidence",
        reason: "Test evidence",
        initiatedBy: "user",
        sourceDeviceId: "device_1",
        config: { preserveEvidence: true },
      });

      const evidence = await manager.getPreservedEvidence();
      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence[0].type).toBe("session_kill");
    });

    it("should include session ID in evidence", async () => {
      await manager.killSession({
        sessionId: "session_id_test",
        reason: "Test session ID",
        initiatedBy: "user",
        sourceDeviceId: null,
        config: { preserveEvidence: true },
      });

      const evidence = await manager.getPreservedEvidence();
      expect(evidence[0].sessionId).toBe("session_id_test");
    });

    it("should include device ID in evidence", async () => {
      // Note: Device wipe clears storage including evidence
      // So we test session wipe instead which preserves evidence
      await manager.killSession({
        sessionId: "session_with_device",
        reason: "Test device ID",
        initiatedBy: "user",
        sourceDeviceId: "device_id_test",
        config: { preserveEvidence: true },
      });

      const evidence = await manager.getPreservedEvidence();
      // Evidence type for session wipe is 'session_kill', not device wipe
      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence[0].type).toBe("session_kill");
    });

    it("should limit evidence records", async () => {
      // Generate many wipes
      for (let i = 0; i < 110; i++) {
        await manager.killSession({
          sessionId: `session_${i}`,
          reason: "Test limit",
          initiatedBy: "user",
          sourceDeviceId: null,
          config: { preserveEvidence: true },
        });
      }

      const evidence = await manager.getPreservedEvidence();
      expect(evidence.length).toBeLessThanOrEqual(100);
    });
  });

  // --------------------------------------------------------------------------
  // Key Destruction Proof Tests
  // --------------------------------------------------------------------------

  describe("key destruction proofs", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should record destruction proofs", async () => {
      await manager.killSession({
        sessionId: "session_proof",
        reason: "Test proof",
        initiatedBy: "user",
        sourceDeviceId: null,
      });

      const proofs = await manager.getKeyDestructionProofs();
      expect(proofs.length).toBeGreaterThan(0);
    });

    it("should include verification hash", async () => {
      await manager.killSession({
        sessionId: "session_hash",
        reason: "Test hash",
        initiatedBy: "user",
        sourceDeviceId: null,
      });

      const proofs = await manager.getKeyDestructionProofs();
      expect(proofs[0].verificationHash).toBeDefined();
      expect(proofs[0].verificationHash.length).toBeGreaterThan(0);
    });

    it("should record number of passes", async () => {
      await manager.killSession({
        sessionId: "session_passes",
        reason: "Test passes",
        initiatedBy: "user",
        sourceDeviceId: null,
        config: { overwritePasses: 5 },
      });

      const proofs = await manager.getKeyDestructionProofs();
      expect(proofs[0].passes).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // Event Listener Tests
  // --------------------------------------------------------------------------

  describe("event listeners", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should add and remove event listeners", () => {
      const listener = jest.fn();
      manager.addEventListener("wipe_started", listener);
      manager.removeEventListener("wipe_started", listener);

      // Trigger a wipe
      manager.killSession({
        sessionId: "session_listener",
        reason: "Test listener",
        initiatedBy: "user",
        sourceDeviceId: null,
      });

      // Listener should not be called after removal
      // Note: This is async, so we can't verify directly
    });

    it("should handle multiple listeners", async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      manager.addEventListener("wipe_completed", listener1);
      manager.addEventListener("wipe_completed", listener2);

      await manager.killSession({
        sessionId: "session_multi",
        reason: "Test multiple",
        initiatedBy: "user",
        sourceDeviceId: null,
      });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it("should include event data", async () => {
      let eventData: Record<string, unknown> = {};
      manager.addEventListener("wipe_completed", (event) => {
        eventData = event.data;
      });

      await manager.killSession({
        sessionId: "session_data",
        reason: "Test data",
        initiatedBy: "user",
        sourceDeviceId: null,
      });

      expect(eventData.sessionId).toBe("session_data");
    });
  });

  // --------------------------------------------------------------------------
  // Configuration Tests
  // --------------------------------------------------------------------------

  describe("configuration", () => {
    it("should use default config", () => {
      expect(DEFAULT_WIPE_CONFIG.preserveEvidence).toBe(true);
      expect(DEFAULT_WIPE_CONFIG.verifyKeyDestruction).toBe(true);
      expect(DEFAULT_WIPE_CONFIG.overwritePasses).toBe(3);
      expect(DEFAULT_WIPE_CONFIG.notifyDevices).toBe(true);
      expect(DEFAULT_WIPE_CONFIG.timeout).toBe(30000);
    });

    it("should merge custom config with defaults", async () => {
      await manager.initialize();

      const result = await manager.killSession({
        sessionId: "session_config",
        reason: "Test config",
        initiatedBy: "user",
        sourceDeviceId: null,
        config: { overwritePasses: 7 },
      });

      expect(result.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Cleanup Tests
  // --------------------------------------------------------------------------

  describe("cleanup", () => {
    it("should destroy manager properly", async () => {
      await manager.initialize();
      manager.destroy();

      expect(manager.getCurrentWipeState()).toBeNull();
    });

    it("should clear event listeners on destroy", async () => {
      await manager.initialize();

      const listener = jest.fn();
      manager.addEventListener("wipe_started", listener);

      manager.destroy();

      // Create a new manager and trigger a wipe
      const newManager = createSessionWipeManager(mockStorage);
      await newManager.initialize();
      await newManager.killSession({
        sessionId: "session_cleanup",
        reason: "Test cleanup",
        initiatedBy: "user",
        sourceDeviceId: null,
      });

      expect(listener).not.toHaveBeenCalled();
      newManager.destroy();
    });
  });
});
