/**
 * Wipe Service Tests
 *
 * Comprehensive tests for the wipe service.
 */

import {
  WipeService,
  createWipeService,
  resetWipeService,
  type WipeServiceState,
  type SessionKillRequest,
  type DeviceWipeRequest,
  type EmergencyLockoutOptions,
} from "../wipe.service";
import { resetSessionWipeManager } from "@/lib/security/session-wipe";
import { resetPanicModeManager } from "@/lib/security/panic-mode";
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

describe("WipeService", () => {
  let service: WipeService;
  let mockStorage: ISecureStorage;

  beforeEach(() => {
    resetWipeService();
    resetSessionWipeManager();
    resetPanicModeManager();
    mockStorage = createMockStorage();
    service = createWipeService(mockStorage);
  });

  afterEach(() => {
    service.destroy();
  });

  // --------------------------------------------------------------------------
  // Initialization Tests
  // --------------------------------------------------------------------------

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await service.initialize();
      const state = service.getState();
      expect(state.initialized).toBe(true);
    });

    it("should load saved state", async () => {
      await mockStorage.setItem(
        "nchat_wipe_service_state",
        JSON.stringify({
          remoteWipeEnabled: false,
          panicModeEnabled: true,
        }),
        { service: "nchat-security" },
      );

      await service.initialize();
      const state = service.getState();

      expect(state.remoteWipeEnabled).toBe(false);
      expect(state.panicModeEnabled).toBe(true);
    });

    it("should cleanup expired wipes on initialization", async () => {
      const expiredWipe = {
        id: "expired_wipe",
        type: "remote",
        targetId: "device_1",
        requestedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        token: "token",
        status: "pending",
      };

      await mockStorage.setItem(
        "nchat_wipe_service_state",
        JSON.stringify({ pendingWipes: [expiredWipe] }),
        { service: "nchat-security" },
      );

      await service.initialize();
      const pendingWipes = service.getPendingWipes();

      expect(pendingWipes.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // State Tests
  // --------------------------------------------------------------------------

  describe("getState", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should return current state", () => {
      const state = service.getState();

      expect(state).toBeDefined();
      expect(state.initialized).toBe(true);
      expect(state.remoteWipeEnabled).toBe(true);
      expect(state.pendingWipes).toBeDefined();
    });

    it("should include last wipe result", async () => {
      await service.killSession({
        sessionId: "session_1",
        reason: "Test",
      });

      const state = service.getState();
      expect(state.lastWipeResult).not.toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Session Kill Tests
  // --------------------------------------------------------------------------

  describe("killSession", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should kill a session", async () => {
      const result = await service.killSession({
        sessionId: "session_123",
        reason: "User requested logout",
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("session_kill");
    });

    it("should preserve evidence when requested", async () => {
      await service.killSession({
        sessionId: "session_evidence",
        reason: "Test",
        preserveEvidence: true,
      });

      const evidence = await service.getWipeEvidence();
      expect(evidence.length).toBeGreaterThan(0);
    });

    it("should update last wipe result", async () => {
      await service.killSession({
        sessionId: "session_result",
        reason: "Test",
      });

      const state = service.getState();
      expect(state.lastWipeResult?.type).toBe("session_kill");
    });
  });

  // --------------------------------------------------------------------------
  // Device Wipe Tests
  // --------------------------------------------------------------------------

  describe("wipeDevice", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should wipe a device", async () => {
      const result = await service.wipeDevice({
        deviceId: "device_123",
        reason: "Device lost",
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("device_wipe");
    });

    it("should use custom config", async () => {
      const result = await service.wipeDevice({
        deviceId: "device_config",
        reason: "Test",
        config: { overwritePasses: 7 },
      });

      expect(result.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Remote Wipe Tests
  // --------------------------------------------------------------------------

  describe("remote wipe", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should enable remote wipe", async () => {
      await service.disableRemoteWipe();
      await service.enableRemoteWipe();

      const state = service.getState();
      expect(state.remoteWipeEnabled).toBe(true);
    });

    it("should disable remote wipe", async () => {
      await service.disableRemoteWipe();

      const state = service.getState();
      expect(state.remoteWipeEnabled).toBe(false);
    });

    it("should generate remote wipe token", async () => {
      const token = await service.generateRemoteWipeToken("device_123", 15);

      expect(token.token).toBeDefined();
      expect(token.targetDeviceId).toBe("device_123");
    });

    it("should throw when remote wipe disabled", async () => {
      await service.disableRemoteWipe();

      await expect(
        service.generateRemoteWipeToken("device_123"),
      ).rejects.toThrow("Remote wipe is not enabled");
    });

    it("should track pending wipes", async () => {
      await service.generateRemoteWipeToken("device_1");
      await service.generateRemoteWipeToken("device_2");

      const pendingWipes = service.getPendingWipes();
      expect(pendingWipes.length).toBe(2);
    });

    it("should cancel pending wipe", async () => {
      const token = await service.generateRemoteWipeToken("device_cancel");
      const wipeId = token.id;

      const cancelled = await service.cancelRemoteWipe(wipeId);
      expect(cancelled).toBe(true);

      const pendingWipes = service.getPendingWipes();
      expect(pendingWipes.find((w) => w.id === wipeId)).toBeUndefined();
    });

    it("should execute remote wipe", async () => {
      const token = await service.generateRemoteWipeToken("device_exec");

      const result = await service.executeRemoteWipe(
        "device_exec",
        token.token,
      );

      expect(result.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Emergency Lockout Tests
  // --------------------------------------------------------------------------

  describe("emergencyLockout", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.updatePanicConfig({ enabled: true });
    });

    it("should activate emergency lockout", async () => {
      const activation = await service.emergencyLockout({
        reason: "Border crossing",
      });

      expect(activation.id).toBeDefined();
      expect(activation.method).toBe("manual");
    });

    it("should use specified activation method", async () => {
      const activation = await service.emergencyLockout({
        reason: "Test",
        activationMethod: "gesture",
      });

      expect(activation.method).toBe("gesture");
    });

    it("should update last panic activation", async () => {
      await service.emergencyLockout({
        reason: "Test",
      });

      const state = service.getState();
      expect(state.lastPanicActivation).not.toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Duress PIN Tests
  // --------------------------------------------------------------------------

  describe("duress PIN", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should set duress PIN", async () => {
      await service.setDuressPin("1234");

      const status = await service.getPanicStatus();
      expect(status.config.duressPin.enabled).toBe(true);
    });

    it("should check duress PIN", async () => {
      await service.setDuressPin("5678");

      expect(await service.checkDuressPin("5678")).toBe(true);
      expect(await service.checkDuressPin("0000")).toBe(false);
    });

    it("should remove duress PIN", async () => {
      await service.setDuressPin("9999");
      await service.removeDuressPin();

      const status = await service.getPanicStatus();
      expect(status.config.duressPin.enabled).toBe(false);
    });

    it("should enable panic mode when setting PIN", async () => {
      await service.setDuressPin("1111");

      const state = service.getState();
      expect(state.panicModeEnabled).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Panic Config Tests
  // --------------------------------------------------------------------------

  describe("updatePanicConfig", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should update panic configuration", async () => {
      await service.updatePanicConfig({
        enabled: true,
        showDecoy: false,
        lockoutDuration: 60,
      });

      const status = await service.getPanicStatus();
      expect(status.config.enabled).toBe(true);
      expect(status.config.showDecoy).toBe(false);
      expect(status.config.lockoutDuration).toBe(60);
    });
  });

  // --------------------------------------------------------------------------
  // Dead Man Switch Tests
  // --------------------------------------------------------------------------

  describe("dead man switch", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.updatePanicConfig({
        deadManSwitch: {
          enabled: true,
          timeoutHours: 72,
          warningHours: 12,
          lastCheckIn: null,
          armed: false,
        },
      });
    });

    it("should check in", async () => {
      await service.deadManCheckIn();

      const status = await service.getPanicStatus();
      expect(status.deadManStatus?.lastCheckIn).not.toBeNull();
    });

    it("should arm dead man switch", async () => {
      await service.armDeadManSwitch();

      const status = await service.getPanicStatus();
      expect(status.deadManStatus?.armed).toBe(true);
    });

    it("should disarm dead man switch", async () => {
      await service.armDeadManSwitch();
      await service.disarmDeadManSwitch();

      const status = await service.getPanicStatus();
      expect(status.deadManStatus?.armed).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Verification Tests
  // --------------------------------------------------------------------------

  describe("verification", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should verify wipe operation", async () => {
      const wipeResult = await service.killSession({
        sessionId: "session_verify",
        reason: "Test",
      });

      const verification = await service.verifyWipe(wipeResult.wipeId);

      expect(verification.wipeId).toBe(wipeResult.wipeId);
      expect(verification.verifiedAt).toBeDefined();
    });

    it("should return key destruction proofs", async () => {
      await service.killSession({
        sessionId: "session_proofs",
        reason: "Test",
      });

      const proofs = await service.getKeyDestructionProofs();
      expect(proofs.length).toBeGreaterThan(0);
    });

    it("should return wipe evidence", async () => {
      await service.killSession({
        sessionId: "session_evidence",
        reason: "Test",
        preserveEvidence: true,
      });

      const evidence = await service.getWipeEvidence();
      expect(evidence.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // Panic Deactivation Tests
  // --------------------------------------------------------------------------

  describe("deactivatePanicMode", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.updatePanicConfig({ enabled: true, lockoutDuration: 0 });
    });

    it("should deactivate with valid password", async () => {
      await service.emergencyLockout({ reason: "Test" });

      const result = await service.deactivatePanicMode("password");

      expect(result).toBe(true);
    });

    it("should reject empty password", async () => {
      await service.emergencyLockout({ reason: "Test" });

      const result = await service.deactivatePanicMode("");

      expect(result).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Event Listener Tests
  // --------------------------------------------------------------------------

  describe("event listeners", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should add and remove event listeners", () => {
      const listener = jest.fn();

      service.addEventListener("wipe_completed", listener);
      service.removeEventListener("wipe_completed", listener);
    });

    it("should forward wipe events", async () => {
      const events: string[] = [];
      service.addEventListener("wipe_started", () =>
        events.push("wipe_started"),
      );
      service.addEventListener("wipe_completed", () =>
        events.push("wipe_completed"),
      );

      await service.killSession({
        sessionId: "session_events",
        reason: "Test",
      });

      expect(events).toContain("wipe_started");
      expect(events).toContain("wipe_completed");
    });

    it("should forward panic events", async () => {
      await service.updatePanicConfig({ enabled: true });

      let activated = false;
      service.addEventListener("panic_activated", () => {
        activated = true;
      });

      await service.emergencyLockout({ reason: "Test" });

      expect(activated).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Cleanup Tests
  // --------------------------------------------------------------------------

  describe("cleanup", () => {
    it("should destroy service properly", async () => {
      await service.initialize();
      service.destroy();

      // Should not throw
    });

    it("should clear event listeners on destroy", async () => {
      await service.initialize();

      const listener = jest.fn();
      service.addEventListener("wipe_started", listener);

      service.destroy();

      // Listener should be cleared
    });
  });
});
